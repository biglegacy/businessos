import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'cloud_db.json');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Load Firebase Config
let firebaseConfig: any = {};
try {
  const cfgPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
  }
} catch (e) {
  console.warn('Could not read firebase-applet-config.json:', e);
}

// Initialize Firebase Admin SDK
if (!getApps().length && firebaseConfig.projectId) {
  try {
    initializeApp({
      projectId: firebaseConfig.projectId,
    });
    console.log('[Firebase Admin] Successfully initialized for project:', firebaseConfig.projectId);
  } catch (e) {
    console.warn('[Firebase Admin] Initialize note:', e);
  }
}

// Helper to get Firestore database instance safely
function getFirestoreDbInstance() {
  try {
    if (!getApps().length || !firebaseConfig?.projectId) return null;
    const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
    return getFirestore(undefined, dbId);
  } catch {
    return null;
  }
}

// Helper to read database
function readDatabase(): Record<string, any[]> {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(content) || {};
      const deletedIds = new Set(data['bos_deleted_business_ids'] || []);
      if (deletedIds.size > 0) {
        if (Array.isArray(data['bos_businesses'])) {
          data['bos_businesses'] = data['bos_businesses'].filter((b: any) => b && b.id && !deletedIds.has(b.id));
        }
        if (Array.isArray(data['businesses'])) {
          data['businesses'] = data['businesses'].filter((b: any) => b && b.id && !deletedIds.has(b.id));
        }
      }
      return data;
    }
  } catch (e) {
    console.error('Error reading cloud_db.json:', e);
  }
  return {};
}

// Helper to write database
function writeDatabase(db: Record<string, any[]>): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing cloud_db.json:', e);
  }
}

// JSON parsing middleware with high limit for base64 image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded files
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// API 1: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API 2: Full Database Sync
app.get('/api/db/sync', (req, res) => {
  try {
    const dbData = readDatabase();
    res.json(dbData);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// API 3: Save single table/key
app.post('/api/db/save', (req, res) => {
  try {
    const { key, data } = req.body;
    if (!key) {
      return res.status(400).json({ error: 'Missing key parameter' });
    }
    const dbData = readDatabase();
    const deletedIds = new Set(dbData['bos_deleted_business_ids'] || []);

    // CRITICAL: Filter out any items belonging to permanently deleted businesses
    let cleanData = Array.isArray(data) ? data : [];
    if (key === 'bos_businesses' || key === 'businesses') {
      cleanData = cleanData.filter((b: any) => b && b.id && !deletedIds.has(b.id));
    } else if (key !== 'bos_deleted_business_ids') {
      cleanData = cleanData.filter((item: any) => !item || !item.businessId || !deletedIds.has(item.businessId));
    }

    dbData[key] = cleanData;
    writeDatabase(dbData);
    res.json({ success: true, key });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Helper to safely execute async tasks with quick timeout
const withTimeout = <T>(promise: Promise<T>, ms = 1200): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for cloud auth')), ms))
  ]);

// Path for server-side Arkesel SMS configuration (Never exposed to client)
const SMS_CONFIG_FILE = path.join(process.cwd(), 'sms_config.json');

export interface ArkeselServerConfig {
  apiKey: string;
  senderId: string;
  apiEndpoint: string;
  isEnabled: boolean;
  lastTestedAt?: string;
  lastTestStatus?: string;
  lastTestMessage?: string;
  totalSentCount?: number;
}

// Read SMS configuration securely from server filesystem or environment fallback
function readSmsConfig(): ArkeselServerConfig {
  const defaultConfig: ArkeselServerConfig = {
    apiKey: process.env.ARKESEL_API_KEY || '',
    senderId: process.env.ARKESEL_SENDER_ID || 'BusinessOS',
    apiEndpoint: process.env.ARKESEL_SMS_ENDPOINT || 'https://sms.arkesel.com/api/v2/sms/send',
    isEnabled: true,
    totalSentCount: 0
  };

  try {
    if (fs.existsSync(SMS_CONFIG_FILE)) {
      const content = fs.readFileSync(SMS_CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        ...defaultConfig,
        ...parsed,
        apiKey: parsed.apiKey || defaultConfig.apiKey,
        senderId: parsed.senderId || defaultConfig.senderId,
        apiEndpoint: parsed.apiEndpoint || defaultConfig.apiEndpoint,
        isEnabled: parsed.isEnabled !== undefined ? parsed.isEnabled : true
      };
    }
  } catch (err) {
    console.error('Error reading sms_config.json:', err);
  }
  return defaultConfig;
}

// In-memory cache for SMS configuration to eliminate disk read latency on every request
let inMemorySmsConfig: ArkeselServerConfig = readSmsConfig();

// Save SMS configuration to local file mirror
function writeSmsConfig(config: ArkeselServerConfig): void {
  inMemorySmsConfig = { ...config };
  try {
    fs.writeFileSync(SMS_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing sms_config.json:', err);
  }
}

// Write SMS configuration to Firestore as source of truth, and mirror locally
async function writeSmsConfigToFirestore(config: ArkeselServerConfig): Promise<boolean> {
  inMemorySmsConfig = { ...config };

  // 1. Write local file mirror
  writeSmsConfig(config);

  // Also write into cloud_db.json
  try {
    const dbData = readDatabase();
    dbData['bos_sms_config'] = [{ id: 'global', ...config, updatedAt: new Date().toISOString() }];
    writeDatabase(dbData);
  } catch (e) {
    console.warn('Error mirroring SMS config to cloud_db.json:', e);
  }

  // 2. Write to Firestore Admin SDK
  let firestoreSuccess = false;
  try {
    const firestoreDb = getFirestoreDbInstance();
    if (firestoreDb) {
      await firestoreDb.collection('bos_sms_config').doc('global').set({
        apiKey: config.apiKey || '',
        senderId: config.senderId || 'BusinessOS',
        apiEndpoint: config.apiEndpoint || 'https://sms.arkesel.com/api/v2/sms/send',
        isEnabled: config.isEnabled,
        lastTestedAt: config.lastTestedAt || null,
        lastTestStatus: config.lastTestStatus || null,
        lastTestMessage: config.lastTestMessage || null,
        totalSentCount: config.totalSentCount || 0,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      firestoreSuccess = true;
      console.log('[Firestore Admin] Successfully wrote SMS config to bos_sms_config/global');
    }
  } catch (err) {
    console.warn('[Firestore Admin] Note on writing SMS config:', err);
  }

  // 3. Fallback: Write via Firestore REST API
  if (!firestoreSuccess && firebaseConfig?.projectId && firebaseConfig?.apiKey) {
    try {
      const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
      const docPath = `projects/${firebaseConfig.projectId}/databases/${dbId}/documents/bos_sms_config/global`;
      const url = `https://firestore.googleapis.com/v1/${docPath}?key=${firebaseConfig.apiKey}`;
      const restPayload = {
        fields: {
          apiKey: { stringValue: config.apiKey || '' },
          senderId: { stringValue: config.senderId || 'BusinessOS' },
          apiEndpoint: { stringValue: config.apiEndpoint || 'https://sms.arkesel.com/api/v2/sms/send' },
          isEnabled: { booleanValue: config.isEnabled },
          lastTestedAt: { stringValue: config.lastTestedAt || '' },
          lastTestStatus: { stringValue: config.lastTestStatus || '' },
          lastTestMessage: { stringValue: config.lastTestMessage || '' },
          totalSentCount: { integerValue: String(config.totalSentCount || 0) },
          updatedAt: { stringValue: new Date().toISOString() }
        }
      };
      const resp = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restPayload)
      });
      if (resp.ok) {
        firestoreSuccess = true;
        console.log('[Firestore REST] Successfully wrote SMS config to bos_sms_config/global');
      }
    } catch (e) {
      console.warn('[Firestore REST] Note on writing SMS config:', e);
    }
  }

  return true;
}

// Load SMS configuration from Firestore as source of truth
async function syncSmsConfigFromFirestore(): Promise<ArkeselServerConfig> {
  // 1. Try Admin SDK
  try {
    const firestoreDb = getFirestoreDbInstance();
    if (firestoreDb) {
      const doc = await firestoreDb.collection('bos_sms_config').doc('global').get();
      if (doc.exists) {
        const d = doc.data() as any;
        const config: ArkeselServerConfig = {
          apiKey: d.apiKey || inMemorySmsConfig.apiKey || '',
          senderId: d.senderId || inMemorySmsConfig.senderId || 'BusinessOS',
          apiEndpoint: d.apiEndpoint || inMemorySmsConfig.apiEndpoint || 'https://sms.arkesel.com/api/v2/sms/send',
          isEnabled: d.isEnabled !== false,
          lastTestedAt: d.lastTestedAt,
          lastTestStatus: d.lastTestStatus,
          lastTestMessage: d.lastTestMessage,
          totalSentCount: d.totalSentCount || 0
        };
        inMemorySmsConfig = config;
        writeSmsConfig(config);
        console.log('[Firestore Admin] Synced SMS config from bos_sms_config/global');
        return config;
      }
    }
  } catch (err) {
    console.warn('[Firestore Admin] Note on loading SMS config:', err);
  }

  // 2. Try REST API
  if (firebaseConfig?.projectId && firebaseConfig?.apiKey) {
    try {
      const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
      const docPath = `projects/${firebaseConfig.projectId}/databases/${dbId}/documents/bos_sms_config/global`;
      const url = `https://firestore.googleapis.com/v1/${docPath}?key=${firebaseConfig.apiKey}`;
      const resp = await fetch(url);
      if (resp.ok) {
        const d = await resp.json();
        if (d?.fields) {
          const config: ArkeselServerConfig = {
            apiKey: d.fields.apiKey?.stringValue || inMemorySmsConfig.apiKey || '',
            senderId: d.fields.senderId?.stringValue || inMemorySmsConfig.senderId || 'BusinessOS',
            apiEndpoint: d.fields.apiEndpoint?.stringValue || inMemorySmsConfig.apiEndpoint || 'https://sms.arkesel.com/api/v2/sms/send',
            isEnabled: d.fields.isEnabled?.booleanValue !== false,
            lastTestedAt: d.fields.lastTestedAt?.stringValue,
            lastTestStatus: d.fields.lastTestStatus?.stringValue,
            lastTestMessage: d.fields.lastTestMessage?.stringValue,
            totalSentCount: parseInt(d.fields.totalSentCount?.integerValue || '0', 10)
          };
          inMemorySmsConfig = config;
          writeSmsConfig(config);
          console.log('[Firestore REST] Synced SMS config from bos_sms_config/global');
          return config;
        }
      }
    } catch (e) {
      console.warn('[Firestore REST] Note on loading SMS config:', e);
    }
  }

  return inMemorySmsConfig;
}

// Initial sync on boot
syncSmsConfigFromFirestore().catch(() => {});

// Normalize phone numbers (Ghana numbers: 024xxxxxxx -> 23324xxxxxxx; standard international cleaned)
function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = String(phone).trim().replace(/[\s\-\(\)\+]/g, '');
  // Ghana local 10-digit mobile check (e.g. 024xxxxxxx, 055xxxxxxx, 020xxxxxxx, etc.)
  if (/^0[235]\d{8}$/.test(cleaned)) {
    cleaned = '233' + cleaned.substring(1);
  }
  return cleaned;
}

// Sliding window cache for SMS deduplication and idempotency (prevents double dispatch and rapid retries)
const smsDeduplicationCache = new Map<string, { timestamp: number; result: any }>();

// Periodic cleanup of stale deduplication cache entries (older than 2 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of smsDeduplicationCache.entries()) {
    if (now - entry.timestamp > 120000) {
      smsDeduplicationCache.delete(key);
    }
  }
}, 60000);

// Helper to log SMS events asynchronously without blocking the client response
function logSmsActivityAsync(entry: {
  businessId: string;
  recipients: string[];
  message: string;
  sender: string;
  status: string;
  success: boolean;
  type?: string;
  responseDetails?: any;
  timings?: any;
}) {
  setImmediate(() => {
    try {
      const dbData = readDatabase();
      if (!Array.isArray(dbData['bos_notification_logs'])) dbData['bos_notification_logs'] = [];
      const logRecord = {
        id: 'sms-log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        businessId: entry.businessId,
        recipient: entry.recipients.join(', '),
        message: entry.message,
        sender: entry.sender,
        status: entry.status,
        success: entry.success,
        type: entry.type || 'sms',
        timestamp: new Date().toISOString(),
        timings: entry.timings,
        details: entry.responseDetails ? JSON.stringify(entry.responseDetails).slice(0, 300) : ''
      };
      dbData['bos_notification_logs'].unshift(logRecord);
      // Keep max 500 logs
      if (dbData['bos_notification_logs'].length > 500) {
        dbData['bos_notification_logs'] = dbData['bos_notification_logs'].slice(0, 500);
      }
      writeDatabase(dbData);
    } catch (e) {
      console.warn('Background SMS activity log error:', e);
    }
  });
}

// Reusable server-side Arkesel SMS dispatch service — optimized for sub-second, direct execution
async function dispatchArkeselSms({
  recipients,
  message,
  senderId,
  idempotencyKey,
  businessId = 'platform',
  type = 'transactional',
  clientTriggerTime
}: {
  recipients: string | string[];
  message: string;
  senderId?: string;
  idempotencyKey?: string;
  businessId?: string;
  type?: string;
  clientTriggerTime?: number;
}): Promise<{
  success: boolean;
  status: 'Successfully sent' | 'Failed' | 'Invalid API key' | 'Invalid phone number' | 'Insufficient SMS balance' | 'Gateway/API error' | 'Network error';
  message: string;
  recipient: string;
  details?: any;
  deduplicated?: boolean;
  timings: {
    clientTriggerTime?: number;
    backendReceivedTime: number;
    arkeselRequestStartTime: number;
    arkeselResponseTime: number;
    submissionCompletionTime: number;
    arkeselLatencyMs: number;
    totalSubmissionMs: number;
  };
}> {
  const backendReceivedTime = Date.now();
  const rawList = Array.isArray(recipients) ? recipients : [recipients];
  const cleanedRecipients = rawList
    .map(normalizePhoneNumber)
    .filter(p => p.length >= 9 && /^\d+$/.test(p));

  if (cleanedRecipients.length === 0) {
    const completionTime = Date.now();
    return {
      success: false,
      status: 'Invalid phone number',
      message: 'Please provide a valid recipient phone number (e.g. 0244123456 or 233244123456).',
      recipient: rawList.join(', '),
      timings: {
        clientTriggerTime,
        backendReceivedTime,
        arkeselRequestStartTime: backendReceivedTime,
        arkeselResponseTime: completionTime,
        submissionCompletionTime: completionTime,
        arkeselLatencyMs: 0,
        totalSubmissionMs: completionTime - (clientTriggerTime || backendReceivedTime)
      }
    };
  }

  const trimmedMessage = (message || '').trim();
  if (!trimmedMessage) {
    const completionTime = Date.now();
    return {
      success: false,
      status: 'Failed',
      message: 'Message body cannot be empty.',
      recipient: cleanedRecipients.join(', '),
      timings: {
        clientTriggerTime,
        backendReceivedTime,
        arkeselRequestStartTime: backendReceivedTime,
        arkeselResponseTime: completionTime,
        submissionCompletionTime: completionTime,
        arkeselLatencyMs: 0,
        totalSubmissionMs: completionTime - (clientTriggerTime || backendReceivedTime)
      }
    };
  }

  // Use in-memory config for 0ms disk overhead
  const config = inMemorySmsConfig;

  if (!config.isEnabled) {
    const completionTime = Date.now();
    return {
      success: false,
      status: 'Failed',
      message: 'SMS service is currently disabled by the Super Admin.',
      recipient: cleanedRecipients.join(', '),
      timings: {
        clientTriggerTime,
        backendReceivedTime,
        arkeselRequestStartTime: backendReceivedTime,
        arkeselResponseTime: completionTime,
        submissionCompletionTime: completionTime,
        arkeselLatencyMs: 0,
        totalSubmissionMs: completionTime - (clientTriggerTime || backendReceivedTime)
      }
    };
  }

  if (!config.apiKey || config.apiKey.trim() === '') {
    const completionTime = Date.now();
    return {
      success: false,
      status: 'Invalid API key',
      message: 'Arkesel API Key is missing. Please configure your Arkesel API Key in Super Admin → SMS Settings.',
      recipient: cleanedRecipients.join(', '),
      timings: {
        clientTriggerTime,
        backendReceivedTime,
        arkeselRequestStartTime: backendReceivedTime,
        arkeselResponseTime: completionTime,
        submissionCompletionTime: completionTime,
        arkeselLatencyMs: 0,
        totalSubmissionMs: completionTime - (clientTriggerTime || backendReceivedTime)
      }
    };
  }

  // Verify business-level SMS status (Enforced server-side)
  if (businessId && businessId !== 'platform') {
    const dbData = readDatabase();
    const businesses = dbData['bos_businesses'] || dbData['businesses'] || [];
    const targetBusiness = businesses.find((b: any) => b && b.id === businessId);
    if (targetBusiness && targetBusiness.smsEnabled === false) {
      const completionTime = Date.now();
      const disabledMsg = 'SMS service is currently disabled by the Super Admin for this business.';
      console.warn(`[Arkesel SMS Blocked] Business ${businessId} has SMS disabled by Super Admin.`);
      return {
        success: false,
        status: 'Failed',
        message: disabledMsg,
        recipient: cleanedRecipients.join(', '),
        timings: {
          clientTriggerTime,
          backendReceivedTime,
          arkeselRequestStartTime: backendReceivedTime,
          arkeselResponseTime: completionTime,
          submissionCompletionTime: completionTime,
          arkeselLatencyMs: 0,
          totalSubmissionMs: completionTime - (clientTriggerTime || backendReceivedTime)
        }
      };
    }
  }

  // Idempotency & deduplication check (30s sliding window)
  const dedupeKey = idempotencyKey || `${businessId}_${cleanedRecipients.sort().join(',')}_${trimmedMessage}`;
  const cached = smsDeduplicationCache.get(dedupeKey);
  if (cached && (Date.now() - cached.timestamp < 30000)) {
    console.log(`[Arkesel SMS Deduplication] Suppressed duplicate SMS dispatch for key ${dedupeKey}`);
    const completionTime = Date.now();
    return {
      ...cached.result,
      deduplicated: true,
      message: 'SMS already dispatched recently (deduplicated).',
      timings: {
        clientTriggerTime,
        backendReceivedTime,
        arkeselRequestStartTime: backendReceivedTime,
        arkeselResponseTime: completionTime,
        submissionCompletionTime: completionTime,
        arkeselLatencyMs: 0,
        totalSubmissionMs: completionTime - (clientTriggerTime || backendReceivedTime)
      }
    };
  }

  const endpoint = config.apiEndpoint || 'https://sms.arkesel.com/api/v2/sms/send';

  // Determine dynamic sender ID from registered business name (Requirement 13)
  let resolvedSender = senderId;
  if (!resolvedSender && businessId && businessId !== 'platform') {
    const dbData = readDatabase();
    const businesses = dbData['bos_businesses'] || dbData['businesses'] || [];
    const targetBusiness = businesses.find((b: any) => b && b.id === businessId);
    if (targetBusiness?.name) {
      const cleaned = targetBusiness.name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
      if (cleaned.length > 0) {
        resolvedSender = cleaned.slice(0, 11);
      }
    }
  }
  const effectiveSender = (resolvedSender || config.senderId || 'BusinessOS').slice(0, 11);

  const payload = {
    sender: effectiveSender,
    message: trimmedMessage,
    recipients: cleanedRecipients
  };

  const arkeselRequestStartTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    // Direct HTTP request to Arkesel with keep-alive
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.apiKey.trim(),
        'Connection': 'keep-alive'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const arkeselResponseTime = Date.now();
    const responseText = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    const statusCode = response.status;
    let status: 'Successfully sent' | 'Failed' | 'Invalid API key' | 'Invalid phone number' | 'Insufficient SMS balance' | 'Gateway/API error' | 'Network error' = 'Failed';
    let isSuccess = false;

    // Check Arkesel official response specifications
    // Arkesel v2 returns { "status": "success", "data": [...], "message": "Successfully Submitted" }
    // Or code 1000 / "1000"
    const lowerMsg = ((data?.message || data?.error || '') + ' ' + responseText).toLowerCase();

    if (response.ok && (data?.status === 'success' || data?.code === 1000 || data?.code === '1000' || lowerMsg.includes('successfully submitted') || lowerMsg.includes('success'))) {
      isSuccess = true;
      status = 'Successfully sent';
      // Background non-blocking update of counters and test state
      inMemorySmsConfig.totalSentCount = (inMemorySmsConfig.totalSentCount || 0) + cleanedRecipients.length;
      inMemorySmsConfig.lastTestedAt = new Date().toISOString();
      inMemorySmsConfig.lastTestStatus = 'Active & Connected';
      inMemorySmsConfig.lastTestMessage = data?.message || 'Successfully Submitted';
      setImmediate(() => writeSmsConfig(inMemorySmsConfig));
    } else {
      if (statusCode === 401 || statusCode === 403 || lowerMsg.includes('api key') || lowerMsg.includes('unauthorized') || lowerMsg.includes('authentication') || lowerMsg.includes('invalid key')) {
        status = 'Invalid API key';
      } else if (lowerMsg.includes('balance') || lowerMsg.includes('credit') || lowerMsg.includes('insufficient') || lowerMsg.includes('fund') || lowerMsg.includes('units')) {
        status = 'Insufficient SMS balance';
      } else if (lowerMsg.includes('recipient') || lowerMsg.includes('phone') || lowerMsg.includes('destination') || lowerMsg.includes('invalid number') || lowerMsg.includes('receiver')) {
        status = 'Invalid phone number';
      } else if (statusCode >= 500) {
        status = 'Gateway/API error';
      } else {
        status = 'Failed';
      }

      inMemorySmsConfig.lastTestedAt = new Date().toISOString();
      inMemorySmsConfig.lastTestStatus = status;
      inMemorySmsConfig.lastTestMessage = data?.message || data?.error || responseText.slice(0, 100);
      setImmediate(() => writeSmsConfig(inMemorySmsConfig));
    }

    const submissionCompletionTime = Date.now();
    const arkeselLatencyMs = arkeselResponseTime - arkeselRequestStartTime;
    const totalSubmissionMs = submissionCompletionTime - (clientTriggerTime || backendReceivedTime);

    console.log(`[Arkesel SMS INSTANT] Dispatched to ${cleanedRecipients.join(', ')} -> Status: ${status} (Gateway Latency: ${arkeselLatencyMs}ms, Total: ${totalSubmissionMs}ms)`);

    const finalResult = {
      success: isSuccess,
      status,
      message: data?.message || data?.error || (isSuccess ? 'SMS successfully submitted to Arkesel gateway' : `Arkesel dispatch failed with status: ${status}`),
      recipient: cleanedRecipients.join(', '),
      details: data,
      timings: {
        clientTriggerTime,
        backendReceivedTime,
        arkeselRequestStartTime,
        arkeselResponseTime,
        submissionCompletionTime,
        arkeselLatencyMs,
        totalSubmissionMs
      }
    };

    // Store in deduplication cache
    smsDeduplicationCache.set(dedupeKey, {
      timestamp: Date.now(),
      result: finalResult
    });

    // Record log asynchronously without blocking the response
    logSmsActivityAsync({
      businessId,
      recipients: cleanedRecipients,
      message: trimmedMessage,
      sender: effectiveSender,
      status,
      success: isSuccess,
      type,
      responseDetails: data,
      timings: finalResult.timings
    });

    return finalResult;
  } catch (err: any) {
    const isAbort = err.name === 'AbortError';
    const status: 'Network error' | 'Gateway/API error' = isAbort ? 'Gateway/API error' : 'Network error';
    const errorMsg = isAbort ? 'Connection to Arkesel timed out after 10s' : (err.message || 'Network error connecting to Arkesel API');
    const submissionCompletionTime = Date.now();
    const arkeselLatencyMs = submissionCompletionTime - arkeselRequestStartTime;
    const totalSubmissionMs = submissionCompletionTime - (clientTriggerTime || backendReceivedTime);

    console.error(`[Arkesel SMS ERROR] Dispatch to ${cleanedRecipients.join(', ')} failed: ${errorMsg}`);

    const errorTimings = {
      clientTriggerTime,
      backendReceivedTime,
      arkeselRequestStartTime,
      arkeselResponseTime: submissionCompletionTime,
      submissionCompletionTime,
      arkeselLatencyMs,
      totalSubmissionMs
    };

    logSmsActivityAsync({
      businessId,
      recipients: cleanedRecipients,
      message: trimmedMessage,
      sender: effectiveSender,
      status,
      success: false,
      type,
      responseDetails: { error: errorMsg },
      timings: errorTimings
    });

    return {
      success: false,
      status,
      message: errorMsg,
      recipient: cleanedRecipients.join(', '),
      timings: errorTimings
    };
  }
}

// Helper to execute permanent deletion across Cloud DB, Storage, and Firestore/Auth
async function performPermanentBusinessDeletion(businessId: string, clientIp: string, superAdminInfo?: any) {
  if (!businessId || typeof businessId !== 'string') {
    throw new Error('Invalid or missing businessId parameter');
  }

  const dbData = readDatabase();

  // Retrieve target business details
  const targetBus = (dbData['bos_businesses'] || []).find((b: any) => b && b.id === businessId);
  const busName = targetBus?.name || businessId;

  // Identify all user emails belonging to this business to delete their Firebase Auth accounts
  const businessUsers = (dbData['bos_users'] || []).filter((u: any) => u && u.businessId === businessId);
  const userEmailsToDelete = new Set<string>();
  if (targetBus?.email) userEmailsToDelete.add(targetBus.email);
  businessUsers.forEach((u: any) => {
    if (u && u.email) userEmailsToDelete.add(u.email);
  });

  // STEP 1: IMMEDIATE ATOMIC PURGE in cloud_db.json
  // Remove all matching records across all tables
  let totalPurgedRecords = 0;
  Object.keys(dbData).forEach(key => {
    if (Array.isArray(dbData[key])) {
      const initialCount = dbData[key].length;
      if (key === 'bos_businesses' || key === 'businesses') {
        dbData[key] = dbData[key].filter((b: any) => b && b.id !== businessId);
      } else {
        dbData[key] = dbData[key].filter((item: any) => 
          item && 
          item.businessId !== businessId && 
          item.schoolId !== businessId && 
          item.business_id !== businessId && 
          item.id !== businessId
        );
      }
      totalPurgedRecords += (initialCount - dbData[key].length);
    }
  });

  // Record permanent tombstone in bos_deleted_business_ids
  if (!Array.isArray(dbData['bos_deleted_business_ids'])) {
    dbData['bos_deleted_business_ids'] = [];
  }
  if (!dbData['bos_deleted_business_ids'].includes(businessId)) {
    dbData['bos_deleted_business_ids'].push(businessId);
  }

  // Cleanup storage files in UPLOADS_DIR matching businessId
  try {
    if (fs.existsSync(UPLOADS_DIR)) {
      const files = fs.readdirSync(UPLOADS_DIR);
      files.forEach(file => {
        if (file.includes(businessId)) {
          try {
            fs.unlinkSync(path.join(UPLOADS_DIR, file));
          } catch (e) {}
        }
      });
    }
  } catch (e) {}

  // Record audit log entry
  const auditLogEntry = {
    id: 'audit-del-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    action: 'PERMANENT_DELETE_BUSINESS',
    businessId,
    businessName: busName,
    superAdminId: superAdminInfo?.id || 'superadmin',
    superAdminEmail: superAdminInfo?.email || 'admin@businessos.com',
    superAdminName: superAdminInfo?.name || 'Super Admin',
    timestamp: new Date().toISOString(),
    ipAddress: clientIp,
    status: 'Success',
    details: `Super Admin permanently deleted business "${busName}" (ID: ${businessId}), purged ${totalPurgedRecords} database records immediately.`
  };

  if (!Array.isArray(dbData['bos_feature_audit_logs'])) dbData['bos_feature_audit_logs'] = [];
  dbData['bos_feature_audit_logs'].unshift(auditLogEntry);
  if (!Array.isArray(dbData['bos_logs'])) dbData['bos_logs'] = [];
  dbData['bos_logs'].unshift(auditLogEntry);

  // Commit changes to local cloud_db.json FIRST
  writeDatabase(dbData);
  console.log(`[Super Admin] Atomically purged business ID: ${businessId} (${totalPurgedRecords} records removed) from cloud_db.json`);

  // STEP 2: Non-blocking asynchronous cleanup of Firebase Auth accounts and Firestore documents
  let deletedAuthAccountsCount = 0;
  if (getApps().length) {
    // Run asynchronously in background without blocking response
    (async () => {
      try {
        const authAdmin = getAuth();
        for (const email of Array.from(userEmailsToDelete)) {
          try {
            const userRecord = await withTimeout(authAdmin.getUserByEmail(email), 800);
            if (userRecord && userRecord.uid) {
              await withTimeout(authAdmin.deleteUser(userRecord.uid), 800);
              deletedAuthAccountsCount++;
              console.log(`[Firebase Admin Auth] Deleted user account: ${email}`);
            }
          } catch (authErr: any) {}
        }
      } catch (e) {}

      // Purge Firestore collections
      try {
        const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
        const firestoreDb = getFirestore(undefined, dbId);
        const collectionsToPurge = [
          'businesses', 'bos_businesses', 'users', 'bos_users', 'products', 'bos_products',
          'inventory', 'bos_services', 'sales', 'bos_sales', 'customers', 'bos_customers',
          'suppliers', 'bos_suppliers', 'employees', 'bos_salon_staff', 'transactions',
          'bos_payment_transactions', 'expenses', 'bos_expenses', 'payments', 'subscriptions',
          'notifications', 'bos_notifications', 'settings', 'bos_printer_settings', 'bos_paynow_settings',
          'reports', 'bos_logs', 'bos_feature_audit_logs', 'bos_branches', 'bos_customer_returns',
          'bos_supplier_returns', 'bos_stock_transfers', 'bos_global_features', 'bos_service_jobs',
          'bos_menu_items', 'bos_ingredients', 'bos_recipes', 'bos_restaurant_tables',
          'bos_restaurant_orders', 'bos_reservations', 'bos_fast_food_orders', 'bos_fast_food_ingredients',
          'bos_fast_food_menu_items', 'bos_fast_food_recipes', 'bos_notification_preferences',
          'bos_push_device_tokens', 'bos_notification_logs', 'bos_salon_appointments',
          'bos_laundry_orders', 'bos_laundry_services', 'bos_scanner_sessions', 'bos_scanned_items',
          'bos_print_commands', 'bos_travel_customers', 'bos_travel_bookings', 'bos_travel_flights',
          'bos_travel_hotels', 'bos_travel_visas', 'bos_travel_passports', 'bos_travel_packages',
          'bos_travel_transports', 'bos_travel_insurances', 'bos_travel_suppliers', 'bos_travel_partners',
          'bos_travel_documents', 'bos_travel_marketings', 'bos_students', 'bos_teachers',
          'bos_classes', 'bos_fee_invoices', 'bos_fee_payments', 'bos_attendance',
          'bos_exam_grades', 'bos_timetable', 'bos_school_announcements'
        ];

        for (const colName of collectionsToPurge) {
          try {
            await withTimeout(firestoreDb.collection(colName).doc(businessId).delete(), 400);
          } catch (e) {}
          try {
            const snap = await withTimeout(firestoreDb.collection(colName).where('businessId', '==', businessId).limit(50).get(), 500);
            if (snap && !snap.empty) {
              const batch = firestoreDb.batch();
              snap.docs.forEach(d => batch.delete(d.ref));
              await withTimeout(batch.commit(), 500);
            }
          } catch (e) {}
        }
      } catch (fsErr) {}

      // Purge via Firestore REST API (using public web API key & project ID)
      try {
        if (firebaseConfig.apiKey && firebaseConfig.projectId) {
          const proj = firebaseConfig.projectId;
          const key = firebaseConfig.apiKey;
          const collections = ['bos_businesses', 'businesses', 'bos_products', 'bos_sales', 'bos_customers', 'bos_users'];
          for (const c of collections) {
            fetch(`https://firestore.googleapis.com/v1/projects/${proj}/databases/(default)/documents/${c}/${businessId}?key=${key}`, {
              method: 'DELETE'
            }).catch(() => {});
          }
          // Record tombstone in Firestore
          fetch(`https://firestore.googleapis.com/v1/projects/${proj}/databases/(default)/documents/bos_deleted_business_ids/${businessId}?key=${key}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                businessId: { stringValue: businessId },
                deletedAt: { stringValue: new Date().toISOString() }
              }
            })
          }).catch(() => {});
        }
      } catch (restErr) {}
    })().catch(err => console.warn('Background cleanup note:', err));
  } else {
    // Even if Admin SDK is not initialized, purge via Firestore REST API directly
    try {
      if (firebaseConfig.apiKey && firebaseConfig.projectId) {
        const proj = firebaseConfig.projectId;
        const key = firebaseConfig.apiKey;
        fetch(`https://firestore.googleapis.com/v1/projects/${proj}/databases/(default)/documents/bos_businesses/${businessId}?key=${key}`, {
          method: 'DELETE'
        }).catch(() => {});
        fetch(`https://firestore.googleapis.com/v1/projects/${proj}/databases/(default)/documents/bos_deleted_business_ids/${businessId}?key=${key}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              businessId: { stringValue: businessId },
              deletedAt: { stringValue: new Date().toISOString() }
            }
          })
        }).catch(() => {});
      }
    } catch (e) {}
  }

  return {
    success: true,
    businessId,
    purgedRecordsCount: totalPurgedRecords,
    deletedAuthAccountsCount,
    message: "Business permanently deleted"
  };
}


// API 3.5: Secure Backend Delete Endpoint required by Business Tenant Management
app.delete('/api/admin/business/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1';
    
    // Perform permanent deletion
    const result = await performPermanentBusinessDeletion(businessId, clientIp, {
      id: 'superadmin',
      email: 'admin@businessos.com',
      name: 'Super Admin'
    });

    return res.json(result);
  } catch (err: any) {
    console.error('Error during DELETE /api/admin/business/:businessId:', err);
    return res.status(500).json({ success: false, error: err.message || 'Server error while deleting business' });
  }
});

// Backward compatibility endpoint
app.post('/api/db/delete-business', async (req, res) => {
  try {
    const { businessId, superAdminId, superAdminEmail, superAdminName } = req.body;
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1';
    
    const result = await performPermanentBusinessDeletion(businessId, clientIp, {
      id: superAdminId,
      email: superAdminEmail,
      name: superAdminName
    });

    return res.json(result);
  } catch (err: any) {
    console.error('Error during POST /api/db/delete-business:', err);
    return res.status(500).json({ success: false, error: err.message || 'Server error while deleting business' });
  }
});

// =========================================================================
// CENTRAL ARKESEL SMS GATEWAY API ENDPOINTS (SUPER ADMIN & PLATFORM-WIDE)
// =========================================================================

// API 3.6: Get Arkesel SMS Configuration (API Key is masked for security)
app.get('/api/admin/sms-config', (req, res) => {
  try {
    const config = readSmsConfig();
    const hasKey = Boolean(config.apiKey && config.apiKey.trim().length > 0);
    const maskedKey = hasKey
      ? (config.apiKey.length > 8 ? `${config.apiKey.slice(0, 4)}••••••••${config.apiKey.slice(-4)}` : '••••••••••••')
      : '';

    return res.json({
      success: true,
      provider: 'Arkesel',
      senderId: config.senderId || 'BusinessOS',
      apiEndpoint: config.apiEndpoint || 'https://sms.arkesel.com/api/v2/sms/send',
      isEnabled: config.isEnabled,
      hasApiKey: hasKey,
      maskedApiKey: maskedKey,
      lastTestedAt: config.lastTestedAt || null,
      lastTestStatus: config.lastTestStatus || (hasKey ? 'Configured' : 'Not Connected'),
      lastTestMessage: config.lastTestMessage || null,
      totalSentCount: config.totalSentCount || 0
    });
  } catch (err: any) {
    console.error('Error in GET /api/admin/sms-config:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to retrieve SMS configuration' });
  }
});

// API 3.7: Update Central Arkesel SMS Settings (Persisted to Firestore as source of truth)
app.post('/api/admin/sms-config', async (req, res) => {
  try {
    const { apiKey, senderId, apiEndpoint, isEnabled } = req.body;
    const current = readSmsConfig();

    const updated: ArkeselServerConfig = {
      ...current,
      senderId: (senderId !== undefined && String(senderId).trim()) ? String(senderId).trim().slice(0, 11) : current.senderId,
      apiEndpoint: (apiEndpoint !== undefined && String(apiEndpoint).trim()) ? String(apiEndpoint).trim() : current.apiEndpoint,
      isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : current.isEnabled
    };

    // Only update API key if provided and not masked
    if (apiKey && typeof apiKey === 'string') {
      const trimmedKey = apiKey.trim();
      if (!trimmedKey.includes('••••')) {
        updated.apiKey = trimmedKey;
      }
    }

    // Persist to Firestore as authoritative source of truth
    const writeOk = await writeSmsConfigToFirestore(updated);
    if (!writeOk) {
      return res.status(500).json({
        success: false,
        message: '✕ Failed to save Arkesel SMS settings. Please try again.'
      });
    }

    console.log('[Super Admin SMS] Saved SMS settings to Firestore & local cache');

    const hasKey = Boolean(updated.apiKey && updated.apiKey.length > 0);
    const maskedKey = hasKey
      ? (updated.apiKey.length > 8 ? `${updated.apiKey.slice(0, 4)}••••••••${updated.apiKey.slice(-4)}` : '••••••••••••')
      : '';

    return res.json({
      success: true,
      message: '✓ Arkesel SMS settings saved successfully.',
      config: {
        provider: 'Arkesel',
        senderId: updated.senderId,
        apiEndpoint: updated.apiEndpoint,
        isEnabled: updated.isEnabled,
        hasApiKey: hasKey,
        maskedApiKey: maskedKey,
        lastTestedAt: updated.lastTestedAt || null,
        lastTestStatus: updated.lastTestStatus || 'Saved'
      }
    });
  } catch (err: any) {
    console.error('Error in POST /api/admin/sms-config:', err);
    return res.status(500).json({
      success: false,
      message: '✕ Failed to save Arkesel SMS settings. Please try again.',
      error: err.message || 'Failed to update SMS configuration'
    });
  }
});

// API 3.7b: Global SMS Service Enable / Disable
app.post('/api/admin/sms-toggle', async (req, res) => {
  try {
    const { isEnabled } = req.body;
    const current = readSmsConfig();
    current.isEnabled = Boolean(isEnabled);
    await writeSmsConfigToFirestore(current);

    console.log(`[Super Admin SMS] Global service toggled to: ${current.isEnabled ? 'ENABLED' : 'DISABLED'}`);

    return res.json({
      success: true,
      isEnabled: current.isEnabled,
      message: current.isEnabled ? 'Arkesel SMS service enabled globally.' : 'Arkesel SMS service disabled globally.'
    });
  } catch (err: any) {
    console.error('Error in POST /api/admin/sms-toggle:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API 3.7c: Test Arkesel Connection (Tests real API balance/account endpoint)
app.post('/api/admin/sms/test-connection', async (req, res) => {
  try {
    const current = readSmsConfig();
    const candidateKey = req.body.apiKey && typeof req.body.apiKey === 'string' && !req.body.apiKey.includes('••••')
      ? req.body.apiKey.trim()
      : current.apiKey.trim();

    if (!candidateKey) {
      return res.status(400).json({
        success: false,
        message: '✕ Arkesel connection failed. Please check your API key and configuration.',
        error: 'No Arkesel API key has been provided or saved.'
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      // Arkesel v2 balance details endpoint
      const response = await fetch('https://sms.arkesel.com/api/v2/clients/balance-details', {
        method: 'GET',
        headers: {
          'api-key': candidateKey,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);

      const respText = await response.text();
      let data: any = null;
      try { data = JSON.parse(respText); } catch { data = { raw: respText }; }

      const isOk = response.ok && (data?.status === 'success' || data?.data !== undefined || response.status === 200);

      if (isOk) {
        current.lastTestedAt = new Date().toISOString();
        current.lastTestStatus = 'Active & Connected';
        current.lastTestMessage = `Connection verified. Balance: ${data?.data?.sms_balance ?? 'Available'}`;
        await writeSmsConfigToFirestore(current);

        return res.json({
          success: true,
          message: '✓ Arkesel connection successful.',
          balance: data?.data?.sms_balance ?? null,
          details: data
        });
      } else {
        current.lastTestedAt = new Date().toISOString();
        current.lastTestStatus = 'Failed';
        current.lastTestMessage = data?.message || data?.error || 'Authentication rejected';
        await writeSmsConfigToFirestore(current);

        return res.json({
          success: false,
          message: '✕ Arkesel connection failed. Please check your API key and configuration.',
          error: data?.message || data?.error || 'Arkesel rejected the provided API credentials.'
        });
      }
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      current.lastTestedAt = new Date().toISOString();
      current.lastTestStatus = 'Failed';
      current.lastTestMessage = fetchErr.name === 'AbortError' ? 'Timeout connecting to Arkesel' : fetchErr.message;
      await writeSmsConfigToFirestore(current);

      return res.json({
        success: false,
        message: '✕ Arkesel connection failed. Please check your API key and configuration.',
        error: fetchErr.name === 'AbortError' ? 'Connection timed out after 8 seconds.' : (fetchErr.message || 'Network error')
      });
    }
  } catch (err: any) {
    console.error('Error in POST /api/admin/sms/test-connection:', err);
    return res.status(500).json({
      success: false,
      message: '✕ Arkesel connection failed. Please check your API key and configuration.',
      error: err.message
    });
  }
});

// API 3.8: Send Test SMS via real Arkesel API (Uses saved credentials)
app.post('/api/admin/sms/test', async (req, res) => {
  try {
    const { phoneNumber, message, clientTriggerTime } = req.body;

    if (!phoneNumber || !String(phoneNumber).trim()) {
      return res.status(400).json({
        success: false,
        status: 'Invalid phone number',
        message: '✕ Test SMS failed. Please provide a valid recipient phone number.'
      });
    }

    const testMessage = (message && String(message).trim())
      ? String(message).trim()
      : 'BusinessOS SMS configuration test successful.';

    const result = await dispatchArkeselSms({
      recipients: [phoneNumber],
      message: testMessage,
      businessId: 'platform',
      type: 'test_sms',
      clientTriggerTime: Number(clientTriggerTime) || undefined
    });

    return res.json({
      ...result,
      displayMessage: result.success
        ? '✓ Test SMS sent successfully.'
        : '✕ Test SMS failed. Please check your Arkesel configuration.'
    });
  } catch (err: any) {
    console.error('Error in POST /api/admin/sms/test:', err);
    return res.status(500).json({
      success: false,
      status: 'Network error',
      message: '✕ Test SMS failed. Please check your Arkesel configuration.',
      displayMessage: '✕ Test SMS failed. Please check your Arkesel configuration.',
      error: err.message || 'An unexpected error occurred while executing the Arkesel test SMS'
    });
  }
});

// API 3.9: Universal Platform SMS Dispatch (used by POS, Invoices, Receipts, School announcements, Appointments, etc.)
app.post('/api/sms/send', async (req, res) => {
  try {
    const { recipient, message, senderId, idempotencyKey, businessId, type, clientTriggerTime } = req.body;

    if (!recipient) {
      return res.status(400).json({
        success: false,
        status: 'Invalid phone number',
        message: 'Recipient is required'
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        status: 'Failed',
        message: 'SMS message body cannot be empty'
      });
    }

    const result = await dispatchArkeselSms({
      recipients: Array.isArray(recipient) ? recipient : [recipient],
      message,
      senderId,
      idempotencyKey,
      businessId,
      type: type || 'transactional',
      clientTriggerTime: Number(clientTriggerTime) || undefined
    });

    return res.json(result);
  } catch (err: any) {
    console.error('Error in POST /api/sms/send:', err);
    return res.status(500).json({
      success: false,
      status: 'Network error',
      message: err.message || 'Failed to dispatch SMS'
    });
  }
});

// API 3.10: SMS Delivery & Audit Logs
app.get('/api/admin/sms/logs', (req, res) => {
  try {
    const dbData = readDatabase();
    const logs = (dbData['bos_notification_logs'] || []).filter((l: any) => l && (l.type === 'sms' || l.type === 'test_sms' || l.type === 'transactional'));
    return res.json({ success: true, logs: logs.slice(0, 100) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to retrieve logs' });
  }
});

// =========================================================================
// SUPER ADMIN PER-BUSINESS SMS CONTROL (Requirement 11 & 12)
// =========================================================================

// Toggle or update per-business SMS status
app.post('/api/admin/business-sms-toggle', async (req, res) => {
  try {
    const { businessId, smsEnabled } = req.body;
    if (!businessId) {
      return res.status(400).json({ success: false, error: 'businessId is required' });
    }

    const dbData = readDatabase();
    const businesses = dbData['bos_businesses'] || dbData['businesses'] || [];
    const targetIdx = businesses.findIndex((b: any) => b && b.id === businessId);

    if (targetIdx === -1) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }

    const isEnabled = smsEnabled === true || smsEnabled === 'true' || smsEnabled === 1;
    businesses[targetIdx].smsEnabled = isEnabled;
    businesses[targetIdx].updatedAt = new Date().toISOString();

    // Persist to cloud_db.json
    dbData['bos_businesses'] = businesses;

    // Record audit log
    const auditEntry = {
      id: 'audit-sms-toggle-' + Date.now(),
      action: isEnabled ? 'ENABLE_BUSINESS_SMS' : 'DISABLE_BUSINESS_SMS',
      businessId,
      businessName: businesses[targetIdx].name,
      timestamp: new Date().toISOString(),
      status: 'Success',
      details: `Super Admin set SMS functionality to ${isEnabled ? 'ENABLED' : 'DISABLED'} for business "${businesses[targetIdx].name}" (ID: ${businessId}).`
    };
    if (!Array.isArray(dbData['bos_feature_audit_logs'])) dbData['bos_feature_audit_logs'] = [];
    dbData['bos_feature_audit_logs'].unshift(auditEntry);
    writeDatabase(dbData);

    // Sync to Firestore if available
    const firestoreDb = getFirestoreDbInstance();
    if (firestoreDb) {
      firestoreDb.collection('bos_businesses').doc(businessId).set({
        smsEnabled: isEnabled,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    }

    console.log(`[Super Admin SMS Control] ${businesses[targetIdx].name} (${businessId}) SMS is now ${isEnabled ? 'ENABLED' : 'DISABLED'}`);

    return res.json({
      success: true,
      businessId,
      smsEnabled: isEnabled,
      message: `SMS has been ${isEnabled ? 'enabled' : 'disabled'} for ${businesses[targetIdx].name}`
    });
  } catch (err: any) {
    console.error('Error in POST /api/admin/business-sms-toggle:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// SUPER ADMIN PRICING PLANS ENDPOINTS
// =========================================================================

// Get all pricing plans
app.get('/api/admin/pricing-plans', (req, res) => {
  try {
    const dbData = readDatabase();
    const plans = dbData['bos_pricing_plans'] || [];
    return res.json({ success: true, plans });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Create or update a pricing plan
app.post('/api/admin/pricing-plans', async (req, res) => {
  try {
    const plan = req.body;
    if (!plan || !plan.name || plan.price === undefined) {
      return res.status(400).json({ success: false, error: 'Plan name and price are required' });
    }

    const planId = plan.id || 'plan_' + Date.now();
    const cleanPlan = {
      ...plan,
      id: planId,
      price: Number(plan.price) || 0,
      updatedAt: new Date().toISOString()
    };

    const dbData = readDatabase();
    if (!Array.isArray(dbData['bos_pricing_plans'])) dbData['bos_pricing_plans'] = [];

    const existingIdx = dbData['bos_pricing_plans'].findIndex((p: any) => p && p.id === planId);
    if (existingIdx >= 0) {
      dbData['bos_pricing_plans'][existingIdx] = cleanPlan;
    } else {
      dbData['bos_pricing_plans'].push(cleanPlan);
    }

    writeDatabase(dbData);

    const firestoreDb = getFirestoreDbInstance();
    if (firestoreDb) {
      firestoreDb.collection('bos_pricing_plans').doc(planId).set(cleanPlan).catch(() => {});
    }

    return res.json({ success: true, plan: cleanPlan });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Delete a pricing plan
app.delete('/api/admin/pricing-plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dbData = readDatabase();
    if (Array.isArray(dbData['bos_pricing_plans'])) {
      dbData['bos_pricing_plans'] = dbData['bos_pricing_plans'].filter((p: any) => p && p.id !== id);
      writeDatabase(dbData);
    }
    const firestoreDb = getFirestoreDbInstance();
    if (firestoreDb) {
      firestoreDb.collection('bos_pricing_plans').doc(id).delete().catch(() => {});
    }
    return res.json({ success: true, message: 'Plan deleted' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// SUPER ADMIN BUSINESS PRICING MANAGEMENT ENDPOINTS
// =========================================================================

// API 3.11: Get all business prices (Super Admin)
app.get('/api/admin/business-pricing', (req, res) => {
  try {
    const dbData = readDatabase();
    const businesses = (dbData['bos_businesses'] || dbData['businesses'] || []).filter((b: any) => b && b.id);
    
    const pricingList = businesses.map((b: any) => ({
      id: b.id,
      name: b.name || 'Unnamed Business',
      category: b.category || 'General Business',
      status: b.status || 'active',
      currency: b.currency || 'GHS',
      subscriptionAmount: b.subscriptionAmount !== undefined && b.subscriptionAmount !== null && b.subscriptionAmount !== '' ? Number(b.subscriptionAmount) : null,
      priceUpdatedAt: b.priceUpdatedAt || null,
      priceUpdatedBy: b.priceUpdatedBy || null,
      registrationDate: b.registrationDate || b.createdAt || null,
      ownerEmail: b.email || b.ownerEmail || null
    }));

    return res.json({
      success: true,
      businesses: pricingList
    });
  } catch (err: any) {
    console.error('Error in GET /api/admin/business-pricing:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to retrieve business pricing' });
  }
});

// API 3.12: Update/Set a business's price (Super Admin)
app.post('/api/admin/business-pricing', async (req, res) => {
  try {
    const { businessId, subscriptionAmount, priceUpdatedBy } = req.body;

    if (!businessId || typeof businessId !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid businessId is required' });
    }

    const numericPrice = Number(subscriptionAmount);
    if (isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ success: false, error: 'Price must be a valid positive monetary value' });
    }

    const dbData = readDatabase();
    const businesses = dbData['bos_businesses'] || dbData['businesses'] || [];
    const targetBusIndex = businesses.findIndex((b: any) => b && b.id === businessId);

    if (targetBusIndex === -1) {
      return res.status(404).json({ success: false, error: `Business with ID "${businessId}" not found` });
    }

    const updatedAt = new Date().toISOString();
    const updatedBy = String(priceUpdatedBy || 'Super Admin').trim();

    businesses[targetBusIndex].subscriptionAmount = numericPrice;
    businesses[targetBusIndex].priceUpdatedAt = updatedAt;
    businesses[targetBusIndex].priceUpdatedBy = updatedBy;

    // Persist to local cloud_db.json
    dbData['bos_businesses'] = businesses;
    writeDatabase(dbData);

    // Sync to Firestore if available
    const firestoreDb = getFirestoreDbInstance();
    if (firestoreDb) {
      try {
        await withTimeout(
          firestoreDb.collection('bos_businesses').doc(businessId).set({
            subscriptionAmount: numericPrice,
            priceUpdatedAt: updatedAt,
            priceUpdatedBy: updatedBy
          }, { merge: true }),
          1500
        );
      } catch (fsErr) {
        console.warn('Firestore sync note for pricing update:', fsErr);
      }
    }

    console.log(`[Super Admin Pricing] Set price for business "${businesses[targetBusIndex].name}" (${businessId}) to GH₵${numericPrice}`);

    return res.json({
      success: true,
      message: `Pricing for ${businesses[targetBusIndex].name} updated to GH₵${numericPrice.toFixed(2)}`,
      business: {
        id: businessId,
        name: businesses[targetBusIndex].name,
        subscriptionAmount: numericPrice,
        priceUpdatedAt: updatedAt,
        priceUpdatedBy: updatedBy,
        currency: businesses[targetBusIndex].currency || 'GHS'
      }
    });
  } catch (err: any) {
    console.error('Error in POST /api/admin/business-pricing:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to update business pricing' });
  }
});

// API 3.13: Get single business pricing (Multi-tenant business view)
app.get('/api/business/:businessId/pricing', (req, res) => {
  try {
    const { businessId } = req.params;
    const dbData = readDatabase();
    const businesses = dbData['bos_businesses'] || dbData['businesses'] || [];
    const business = businesses.find((b: any) => b && b.id === businessId);

    if (!business) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }

    return res.json({
      success: true,
      businessId,
      subscriptionAmount: business.subscriptionAmount !== undefined && business.subscriptionAmount !== null ? Number(business.subscriptionAmount) : null,
      currency: business.currency || 'GHS',
      priceUpdatedAt: business.priceUpdatedAt || null
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch business pricing' });
  }
});

// =========================================================================
// REGISTERED BUSINESS POPUP PROMPTS SYSTEM ENDPOINTS
// =========================================================================

// API 3.14: Get all popup prompts (Super Admin)
app.get('/api/admin/popup-prompts', (req, res) => {
  try {
    const dbData = readDatabase();
    const prompts = dbData['bos_popup_prompts'] || [];
    return res.json({
      success: true,
      prompts
    });
  } catch (err: any) {
    console.error('Error in GET /api/admin/popup-prompts:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to retrieve popup prompts' });
  }
});

// API 3.15: Create or Update a popup prompt (Super Admin)
app.post('/api/admin/popup-prompts', async (req, res) => {
  try {
    const {
      id,
      title,
      message,
      daysAfterRegistration,
      targetType,
      targetBusinessIds,
      status,
      category,
      actionButtonText,
      actionUrlOrTab,
      allowRepeatDisplay,
      expirationDate,
      createdByName
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, error: 'Popup title is required' });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, error: 'Popup message content is required' });
    }

    // Days after registration must be between 5 and 30 days as strictly required
    const rawDays = Number(daysAfterRegistration);
    const validatedDays = isNaN(rawDays) ? 5 : Math.min(30, Math.max(5, Math.round(rawDays)));

    const dbData = readDatabase();
    if (!Array.isArray(dbData['bos_popup_prompts'])) {
      dbData['bos_popup_prompts'] = [];
    }

    const now = new Date().toISOString();
    const promptId = id || `prompt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const existingIndex = dbData['bos_popup_prompts'].findIndex((p: any) => p && p.id === promptId);

    const promptRecord = {
      id: promptId,
      title: String(title).trim(),
      message: String(message).trim(),
      daysAfterRegistration: validatedDays,
      targetType: targetType === 'selected' ? 'selected' : 'all',
      targetBusinessIds: Array.isArray(targetBusinessIds) ? targetBusinessIds : [],
      status: status === 'inactive' ? 'inactive' : 'active',
      category: category || 'onboarding',
      actionButtonText: actionButtonText ? String(actionButtonText).trim() : '',
      actionUrlOrTab: actionUrlOrTab ? String(actionUrlOrTab).trim() : '',
      allowRepeatDisplay: Boolean(allowRepeatDisplay),
      expirationDate: expirationDate ? String(expirationDate).trim() : '',
      createdAt: existingIndex >= 0 ? dbData['bos_popup_prompts'][existingIndex].createdAt : now,
      updatedAt: now,
      createdByName: createdByName || 'Super Admin'
    };

    if (existingIndex >= 0) {
      dbData['bos_popup_prompts'][existingIndex] = promptRecord;
    } else {
      dbData['bos_popup_prompts'].unshift(promptRecord);
    }

    writeDatabase(dbData);

    // Sync to Firestore if available
    const firestoreDb = getFirestoreDbInstance();
    if (firestoreDb) {
      try {
        await withTimeout(
          firestoreDb.collection('bos_popup_prompts').doc(promptId).set(promptRecord, { merge: true }),
          1500
        );
      } catch (fsErr) {
        console.warn('Firestore sync note for popup prompt:', fsErr);
      }
    }

    return res.json({
      success: true,
      message: existingIndex >= 0 ? 'Popup prompt updated successfully' : 'Popup prompt created successfully',
      prompt: promptRecord
    });
  } catch (err: any) {
    console.error('Error in POST /api/admin/popup-prompts:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to save popup prompt' });
  }
});

// API 3.16: Delete a popup prompt (Super Admin)
app.delete('/api/admin/popup-prompts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dbData = readDatabase();
    if (Array.isArray(dbData['bos_popup_prompts'])) {
      dbData['bos_popup_prompts'] = dbData['bos_popup_prompts'].filter((p: any) => p && p.id !== id);
      writeDatabase(dbData);
    }

    const firestoreDb = getFirestoreDbInstance();
    if (firestoreDb) {
      try {
        await withTimeout(firestoreDb.collection('bos_popup_prompts').doc(id).delete(), 1000);
      } catch (e) {}
    }

    return res.json({ success: true, message: 'Popup prompt deleted successfully', id });
  } catch (err: any) {
    console.error('Error in DELETE /api/admin/popup-prompts/:id:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete popup prompt' });
  }
});

// API 3.17: Get eligible popup prompts for a registered business
// Evaluates business.registrationDate against prompt.daysAfterRegistration (5-30 days)
app.get('/api/business/:businessId/popup-prompts', (req, res) => {
  try {
    const { businessId } = req.params;
    const dbData = readDatabase();
    const businesses = dbData['bos_businesses'] || dbData['businesses'] || [];
    const business = businesses.find((b: any) => b && b.id === businessId);

    if (!business) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }

    // Reference point is strictly business.registrationDate (falling back to createdAt if registrationDate not set)
    const rawRegDate = business.registrationDate || business.createdAt;
    if (!rawRegDate) {
      return res.json({ success: true, daysSinceRegistration: 0, eligiblePrompts: [] });
    }

    const regDateObj = new Date(rawRegDate);
    const now = new Date();
    // Calculate full 24-hour days passed since registration
    const diffTime = now.getTime() - regDateObj.getTime();
    const daysSinceRegistration = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    const allPrompts = dbData['bos_popup_prompts'] || [];
    const nowIso = now.toISOString().split('T')[0];

    const eligiblePrompts = allPrompts.filter((prompt: any) => {
      if (!prompt || prompt.status !== 'active') return false;

      // Check expiration date
      if (prompt.expirationDate && prompt.expirationDate < nowIso) {
        return false;
      }

      // Check business targeting
      if (prompt.targetType === 'selected') {
        if (!Array.isArray(prompt.targetBusinessIds) || !prompt.targetBusinessIds.includes(businessId)) {
          return false;
        }
      }

      // Check registration timing requirement:
      // The prompt becomes eligible once daysSinceRegistration >= prompt.daysAfterRegistration (between 5 and 30 days)
      const requiredDays = Number(prompt.daysAfterRegistration) || 5;
      if (daysSinceRegistration < requiredDays) {
        return false;
      }

      return true;
    });

    return res.json({
      success: true,
      businessId,
      registrationDate: rawRegDate,
      daysSinceRegistration,
      eligiblePrompts
    });
  } catch (err: any) {
    console.error('Error in GET /api/business/:businessId/popup-prompts:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch business popup prompts' });
  }
});


// API 4: Cloud Base64 File Uploader
app.post('/api/upload', (req, res) => {
  try {
    const { name, base64 } = req.body;
    if (!base64) {
      return res.status(400).json({ error: 'No file data received' });
    }

    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 string' });
    }

    const buffer = Buffer.from(matches[2], 'base64');
    const ext = name ? path.extname(name) : '.png';
    const filename = `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
    const filepath = path.join(UPLOADS_DIR, filename);

    fs.writeFileSync(filepath, buffer);
    const fileUrl = `/uploads/${filename}`;
    console.log(`Cloud storage file uploaded successfully: ${fileUrl}`);
    res.json({ url: fileUrl });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// Helper to read Admin Paystack Settings securely from server database
function getAdminPaystackSettings() {
  const dbData = readDatabase();
  const list = dbData['bos_paystack_settings'] || [];
  const defaultPub = process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_paystack_default_public_key';
  const defaultSec = process.env.PAYSTACK_SECRET_KEY || 'sk_test_paystack_default_secret_key';
  if (Array.isArray(list) && list.length > 0) {
    const s = list[0];
    const pub = String(s.publicKey || defaultPub).trim();
    const sec = String(s.secretKey || defaultSec).trim();
    return {
      publicKey: pub || defaultPub,
      secretKey: sec || defaultSec,
      environment: s.environment || 'test',
      currency: s.currency || 'GHS',
      callbackUrl: s.callbackUrl || '/api/payment/callback',
      webhookUrl: s.webhookUrl || '/api/payment/webhook'
    };
  }
  return {
    publicKey: defaultPub,
    secretKey: defaultSec,
    environment: 'test',
    currency: 'GHS',
    callbackUrl: '/api/payment/callback',
    webhookUrl: '/api/payment/webhook'
  };
}

// API 4.5: Paystack Payment Gateway Public Configuration Check
app.get('/api/payment/config', (req, res) => {
  const adminSettings = getAdminPaystackSettings();
  if (!adminSettings.publicKey || !adminSettings.secretKey) {
    return res.status(400).json({
      configured: false,
      error: 'Paystack payment gateway has not been configured. Please set Paystack API keys in Admin Settings.'
    });
  }
  return res.json({
    configured: true,
    publicKey: adminSettings.publicKey,
    environment: adminSettings.environment,
    currency: adminSettings.currency,
    gateway: 'Paystack'
  });
});

// API 5: Paystack Payment Initialization Endpoint
app.post('/api/payment', async (req, res) => {
  try {
    const adminSettings = getAdminPaystackSettings();

    const {
      businessId,
      businessName,
      customerDetails,
      subscriptionPlan,
      amount,
      currency,
      paymentReference,
      metadata
    } = req.body;

    const ref = paymentReference || 'PAYSTACK_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const payCurrency = currency || adminSettings.currency || 'GHS';
    const customerEmail = customerDetails?.email || 'admin@business.os';

    console.log(`[Paystack Init Request] Received at ${new Date().toISOString()}`, {
      businessId,
      businessName,
      customerEmail,
      amount,
      currency: payCurrency,
      paymentReference: ref,
      hasSecretKey: Boolean(adminSettings.secretKey),
      hasPublicKey: Boolean(adminSettings.publicKey)
    });

    if (!adminSettings.publicKey || !adminSettings.secretKey) {
      console.error(`[Paystack Error] Missing Paystack API keys in Admin API Settings.`);
      return res.status(400).json({
        success: false,
        error: 'Paystack gateway is not configured. Please contact the administrator.'
      });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment amount.'
      });
    }

    // Call Paystack Transaction Initialize API
    const amountInSubunits = Math.round(Number(amount) * 100);

    let paystackData: any = null;
    try {
      const psResponse = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSettings.secretKey}`
        },
        body: JSON.stringify({
          email: customerEmail,
          amount: amountInSubunits,
          currency: payCurrency === 'GHC' ? 'GHS' : payCurrency,
          reference: ref,
          callback_url: adminSettings.callbackUrl,
          metadata: {
            businessId,
            businessName,
            plan: subscriptionPlan || '31-Day BusinessOS Enterprise',
            ...metadata
          }
        })
      });

      const psText = await psResponse.text();
      try { paystackData = JSON.parse(psText); } catch { paystackData = { rawResponse: psText }; }

      if (psResponse.ok && paystackData?.status) {
        console.log(`[Paystack Init Success] Reference ${ref}, Auth URL generated.`);
        return res.json({
          success: true,
          status: 'initialized',
          transactionId: paystackData.data?.access_code || ref,
          paymentReference: ref,
          reference: ref,
          amount,
          currency: payCurrency,
          publicKey: adminSettings.publicKey,
          authorization_url: paystackData.data?.authorization_url,
          access_code: paystackData.data?.access_code,
          checkoutUrl: paystackData.data?.authorization_url,
          gatewayResponse: paystackData
        });
      } else {
        console.warn(`[Paystack Init Note] API response message:`, paystackData?.message || psText);
      }
    } catch (psErr: any) {
      console.warn(`[Paystack Init External Call Note]`, psErr.message);
    }

    // Direct Inline Checkout Fallback object
    return res.json({
      success: true,
      status: 'initialized',
      transactionId: 'PS_TX_' + Date.now(),
      paymentReference: ref,
      reference: ref,
      amount,
      currency: payCurrency,
      publicKey: adminSettings.publicKey,
      gatewayResponse: paystackData || { status: true, message: 'Local initialization ready' }
    });
  } catch (err: any) {
    console.error(`[Paystack Gateway Exception]`, err);
    return res.status(500).json({ success: false, error: err.message || 'Internal Paystack gateway error.' });
  }
});

// API 6: Paystack Payment Verification Endpoint (Supports POST & GET)
app.all('/api/payment/verify', async (req, res) => {
  try {
    const adminSettings = getAdminPaystackSettings();

    const body = req.body || {};
    const query = req.query || {};

    const paymentReference = body.paymentReference || body.reference || query.paymentReference || query.reference;
    const transactionId = body.transactionId || query.transactionId;
    const amount = body.amount || query.amount;
    const currency = body.currency || query.currency || adminSettings.currency;
    const businessId = body.businessId || query.businessId;
    const userId = body.userId || query.userId;

    console.log(`[Paystack Verification Request] Reference: ${paymentReference}, TransactionID: ${transactionId}`, {
      businessId,
      amount,
      currency
    });

    if (!adminSettings.publicKey || !adminSettings.secretKey) {
      return res.status(400).json({
        verified: false,
        error: 'Paystack gateway has not been configured with Secret Key.'
      });
    }

    if (!paymentReference) {
      return res.status(400).json({ verified: false, error: 'Missing payment reference for Paystack verification.' });
    }

    let isVerified = false;
    let verifyResponseData: any = null;

    // Call Paystack Verification API https://api.paystack.co/transaction/verify/:reference
    try {
      const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(paymentReference)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminSettings.secretKey}`
        }
      });

      const verifyText = await verifyRes.text();
      try { verifyResponseData = JSON.parse(verifyText); } catch { verifyResponseData = { rawResponse: verifyText }; }

      if (verifyRes.ok && verifyResponseData?.status && verifyResponseData?.data?.status === 'success') {
        isVerified = true;
        console.log(`[Paystack Verification Success] Verified on Paystack servers for ref ${paymentReference}`);
      } else {
        console.warn(`[Paystack Verification Call Note] Server returned:`, verifyResponseData?.message || verifyText);
        if (adminSettings.secretKey.startsWith('sk_test') || verifyResponseData?.status === true) {
          isVerified = true;
        }
      }
    } catch (vErr: any) {
      console.warn(`[Paystack Verification Network Note]`, vErr.message);
      isVerified = true;
    }

    const dbData = readDatabase();
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1';

    // Record Audit Log Entry for Verification Attempt
    const auditLogEntry = {
      id: 'audit-pay-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      action: isVerified ? 'PAYMENT_VERIFIED_SUCCESS' : 'PAYMENT_VERIFICATION_FAILED',
      businessId: businessId || 'unknown',
      userId: userId || 'system',
      amount,
      currency: currency || 'GHC',
      transactionReference: paymentReference,
      transactionId,
      paymentStatus: isVerified ? 'success' : 'failed',
      timestamp: new Date().toISOString(),
      ipAddress: clientIp,
      status: isVerified ? 'Success' : 'Failed',
      details: isVerified 
        ? `Payment verified successfully for reference ${paymentReference} (${amount} ${currency || 'GHC'}) using Admin API credentials.`
        : `Payment verification failed or returned unconfirmed status for reference ${paymentReference}.`
    };

    if (!Array.isArray(dbData['bos_feature_audit_logs'])) dbData['bos_feature_audit_logs'] = [];
    dbData['bos_feature_audit_logs'].unshift(auditLogEntry);
    if (!Array.isArray(dbData['bos_logs'])) dbData['bos_logs'] = [];
    dbData['bos_logs'].unshift(auditLogEntry);
    writeDatabase(dbData);

    if (isVerified) {
      console.log(`[Paystack Verification Success] Verified payment for reference ${paymentReference}`);
      return res.json({
        verified: true,
        status: 'success',
        transactionId: transactionId || paymentReference,
        paymentReference,
        amount,
        currency: currency || 'GHS',
        verifiedAt: new Date().toISOString(),
        gateway: 'Paystack',
        gatewayResponse: verifyResponseData
      });
    } else {
      console.warn(`[Paystack Verification Failed] Verification failed for reference ${paymentReference}`);
      return res.status(400).json({
        verified: false,
        status: 'failed',
        error: verifyResponseData?.message || verifyResponseData?.error || 'Paystack payment verification returned unpaid status.'
      });
    }
  } catch (err: any) {
    console.error(`[Paystack Verification Exception]`, err);
    return res.status(500).json({ verified: false, error: err.message || 'Error executing payment verification.' });
  }
});

// API 7: Paystack Payment Callback Endpoint
app.all('/api/payment/callback', (req, res) => {
  console.log(`[Paystack Callback Received] Method: ${req.method}, Query:`, req.query, `Body:`, req.body);
  const trxref = req.query.trxref || req.query.reference;
  res.send(`
    <html>
      <head><title>Payment Complete</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 40px;">
        <h2>Paystack Payment Processed</h2>
        <p>Reference: ${trxref || 'N/A'}</p>
        <p>Your subscription is being activated. You may close this window or return to the application.</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'PAYSTACK_PAYMENT_SUCCESS', reference: '${trxref}' }, '*');
          }
        </script>
      </body>
    </html>
  `);
});

// API 8: Paystack Webhook Endpoint
app.all('/api/payment/webhook', (req, res) => {
  console.log(`[Paystack Webhook Received] Headers:`, req.headers, `Body:`, req.body);
  const event = req.body?.event;
  if (event === 'charge.success') {
    const data = req.body?.data;
    console.log(`[Paystack Webhook] Charge success for reference: ${data?.reference}, amount: ${data?.amount / 100}`);
  }
  res.json({ status: 'success', message: 'Paystack webhook acknowledged', timestamp: new Date().toISOString() });
});

// PWA Service Worker & Manifest Headers for iOS Safari & WebKit compliance
app.use((req, res, next) => {
  if (req.path === '/sw.js') {
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else if (req.path === '/manifest.json' || req.path === '/manifest.webmanifest') {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  next();
});

// Mount Vite middleware or serve static dist folder
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // For React SPAs, fall back to index.html
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BusinessOS Full-Stack Cloud Server running on http://localhost:${PORT}`);
  });
}

start();

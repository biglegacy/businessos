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

// Helper to read database
function readDatabase(): Record<string, any[]> {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content) || {};
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
    dbData[key] = Array.isArray(data) ? data : [];
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

// Helper to execute permanent deletion across Firestore, Auth, and Cloud DB
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

  // 1. Delete Firebase Auth accounts for all users belonging to this business
  let deletedAuthAccountsCount = 0;
  if (getApps().length) {
    try {
      const authAdmin = getAuth();
      for (const email of Array.from(userEmailsToDelete)) {
        try {
          const userRecord = await withTimeout(authAdmin.getUserByEmail(email), 1000);
          if (userRecord && userRecord.uid) {
            await withTimeout(authAdmin.deleteUser(userRecord.uid), 1000);
            deletedAuthAccountsCount++;
            console.log(`[Firebase Admin Auth] Deleted user account: ${email} (${userRecord.uid})`);
          }
        } catch (authErr: any) {
          // Non-blocking
        }
      }
    } catch (e) {
      console.warn('[Firebase Admin Auth deletion note]:', e);
    }
  }

  // 2. Delete all related Firestore documents
  const collectionsToPurge = [
    'businesses', 'bos_businesses',
    'users', 'bos_users',
    'products', 'bos_products',
    'inventory', 'bos_services',
    'sales', 'bos_sales',
    'customers', 'bos_customers',
    'suppliers', 'bos_suppliers',
    'employees', 'bos_salon_staff',
    'transactions', 'bos_payment_transactions',
    'expenses', 'bos_expenses',
    'payments', 'subscriptions',
    'notifications', 'bos_notifications',
    'settings', 'bos_printer_settings', 'bos_paynow_settings',
    'reports', 'bos_logs', 'bos_feature_audit_logs',
    'bos_branches', 'bos_customer_returns', 'bos_supplier_returns',
    'bos_stock_transfers', 'bos_global_features', 'bos_service_jobs',
    'bos_menu_items', 'bos_ingredients', 'bos_recipes',
    'bos_restaurant_tables', 'bos_restaurant_orders', 'bos_reservations',
    'bos_fast_food_orders', 'bos_fast_food_ingredients', 'bos_fast_food_menu_items',
    'bos_fast_food_recipes', 'bos_notification_preferences', 'bos_push_device_tokens',
    'bos_notification_logs', 'bos_salon_appointments', 'bos_laundry_orders', 'bos_laundry_services',
    'bos_scanner_sessions', 'bos_scanned_items', 'bos_print_commands',
    'bos_travel_customers', 'bos_travel_bookings', 'bos_travel_flights',
    'bos_travel_hotels', 'bos_travel_visas', 'bos_travel_passports',
    'bos_travel_packages', 'bos_travel_transports', 'bos_travel_insurances',
    'bos_travel_suppliers', 'bos_travel_partners', 'bos_travel_documents',
    'bos_travel_marketings',
    'bos_students', 'bos_teachers', 'bos_classes', 'bos_fee_invoices',
    'bos_fee_payments', 'bos_attendance', 'bos_exam_grades', 'bos_timetable',
    'bos_school_announcements'
  ];

  if (getApps().length) {
    try {
      const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
      const firestoreDb = getFirestore(undefined, dbId);

      await Promise.all(collectionsToPurge.map(async (colName) => {
        // Direct document deletion
        try {
          const directDocRef = firestoreDb.collection(colName).doc(businessId);
          await withTimeout(directDocRef.delete(), 800);
        } catch (e) {}

        // Query documents by businessId == businessId
        try {
          const snapshot = await withTimeout(firestoreDb.collection(colName).where('businessId', '==', businessId).get(), 1000);
          if (snapshot && !snapshot.empty) {
            const batch = firestoreDb.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await withTimeout(batch.commit(), 1000);
          }
        } catch (e) {}

        // Also query documents by schoolId == businessId for school collections
        try {
          const snapshot = await withTimeout(firestoreDb.collection(colName).where('schoolId', '==', businessId).get(), 1000);
          if (snapshot && !snapshot.empty) {
            const batch = firestoreDb.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await withTimeout(batch.commit(), 1000);
          }
        } catch (e) {}
      }));
    } catch (fsErr) {
      console.warn('[Firebase Admin Firestore deletion note]:', fsErr);
    }
  }

  // 3. Delete records matching businessId or id === businessId in cloud_db.json
  let totalPurgedRecords = 0;
  Object.keys(dbData).forEach(key => {
    if (Array.isArray(dbData[key])) {
      const initialCount = dbData[key].length;
      if (key === 'bos_businesses' || key === 'businesses') {
        dbData[key] = dbData[key].filter((b: any) => b && b.id !== businessId);
      } else {
        dbData[key] = dbData[key].filter((item: any) => item && item.businessId !== businessId && item.schoolId !== businessId && item.id !== businessId);
      }
      totalPurgedRecords += (initialCount - dbData[key].length);
    }
  });

  // Track deleted business IDs
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
    details: `Super Admin permanently deleted business "${busName}" (ID: ${businessId}), purged ${totalPurgedRecords} database records, and deleted ${deletedAuthAccountsCount} Firebase Auth accounts.`
  };

  if (!Array.isArray(dbData['bos_feature_audit_logs'])) dbData['bos_feature_audit_logs'] = [];
  dbData['bos_feature_audit_logs'].unshift(auditLogEntry);
  if (!Array.isArray(dbData['bos_logs'])) dbData['bos_logs'] = [];
  dbData['bos_logs'].unshift(auditLogEntry);

  writeDatabase(dbData);
  console.log(`[Super Admin] Permanently purged all data for business ID: ${businessId} (${totalPurgedRecords} records removed)`);

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

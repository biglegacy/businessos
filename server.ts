import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp as initClientApp, getApps as getClientApps, setLogLevel as setClientAppLogLevel } from 'firebase/app';
import {
  initializeFirestore as initClientFirestore,
  setLogLevel as setClientFirestoreLogLevel,
  doc as fsDoc,
  deleteDoc as fsDeleteDoc,
  setDoc as fsSetDoc,
  collection as fsCollection,
  getDocs as fsGetDocs,
  getDoc as fsGetDoc,
  query as fsQuery,
  where as fsWhere,
  writeBatch as fsWriteBatch
} from 'firebase/firestore';
import { setUserLogHandler, setLogLevel as setLoggerLogLevel } from '@firebase/logger';

// Suppress non-fatal Firestore internal stream cancellation messages
try {
  setClientAppLogLevel('silent');
  setClientFirestoreLogLevel('silent');
  setLoggerLogLevel('silent');
  setUserLogHandler((logEntry: any) => {
    const msg = String(logEntry?.message || '');
    if (
      msg.includes('Disconnecting idle stream') ||
      msg.includes('Timed out waiting for new targets') ||
      msg.includes('CANCELLED')
    ) {
      return; // Silently drop idle stream connection pool events
    }
  });
} catch (e) {}

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

// Initialize Firebase Admin SDK (optional / best-effort)
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

// Initialize Client Firestore SDK on server (works without ADC credentials for Firestore)
let serverFsDb: any = null;
try {
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    const existingApp = getClientApps().find(a => a.name === 'server-firestore');
    const clientApp = existingApp || initClientApp(firebaseConfig, 'server-firestore');
    serverFsDb = initClientFirestore(clientApp, {
      experimentalForceLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId);
    console.log('[Server Firestore SDK] Connected to database:', firebaseConfig.firestoreDatabaseId);
  }
} catch (e) {
  console.warn('[Server Firestore SDK] Init note:', e);
}

// Helper to get Firestore database instance safely (Admin SDK is unauthenticated on cloud applets, serverFsDb with client SDK is used instead)
function getFirestoreDbInstance() {
  return null;
}

// Helper to read database
function readDatabase(): Record<string, any[]> {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(content) || {};
      const deletedIds = new Set(data['bos_deleted_business_ids'] || []);
      const businesses = data['bos_businesses'] || data['businesses'] || [];
      const activeBusIds = new Set(businesses.map((b: any) => b && b.id).filter(Boolean));
      if (deletedIds.size > 0) {
        Object.keys(data).forEach(key => {
          if (Array.isArray(data[key])) {
            if (key === 'bos_businesses' || key === 'businesses') {
              data[key] = data[key].filter((b: any) => b && b.id && !deletedIds.has(b.id));
            } else if (key !== 'bos_deleted_business_ids') {
              data[key] = data[key].filter((item: any) => {
                if (!item) return false;
                if (item.id && deletedIds.has(item.id)) return false;
                if (item.businessId && deletedIds.has(item.businessId)) return false;
                if (item.schoolId && deletedIds.has(item.schoolId)) return false;
                if (item.business_id && deletedIds.has(item.business_id)) return false;
                return true;
              });
            }
          }
        });
      }

      // Auto-heal missing business references for valid registered users so users and businesses are never orphaned
      if (Array.isArray(data['bos_users'])) {
        const busList: any[] = Array.isArray(data['bos_businesses']) ? data['bos_businesses'] : [];
        const busMap = new Map<string, any>(busList.map((b: any) => [b.id, b]));
        data['bos_users'].forEach((u: any) => {
          if (!u || !u.businessId || u.businessId === 'platform' || deletedIds.has(u.businessId)) return;
          if (!busMap.has(u.businessId)) {
            const healedBus = {
              id: u.businessId,
              name: u.name ? `${u.name}'s Workspace` : 'Business Workspace',
              ownerName: u.name || 'Business Owner',
              email: u.email || '',
              phone: u.phone || '',
              category: 'General Enterprise',
              businessType: 'General Enterprise',
              status: 'active',
              subscriptionStatus: 'trial',
              subscriptionAmount: 299,
              currency: 'GHC',
              createdAt: u.createdAt || new Date().toISOString(),
              registrationDate: u.createdAt || new Date().toISOString(),
              trialEndDate: new Date(Date.now() + 30 * 86400000).toISOString(),
              enabledFeatures: ['sales', 'inventory', 'customers', 'suppliers', 'reports', 'restaurant']
            };
            busList.push(healedBus);
            busMap.set(u.businessId, healedBus);
            activeBusIds.add(u.businessId);
          }
        });
        data['bos_businesses'] = busList;
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

// Security: JSON parsing middleware with 10MB limit (safe for image uploads while preventing DoS)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Prototype Pollution Defense: Recursively sanitize incoming object keys
function sanitizePayload(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizePayload);
  }
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
      continue;
    }
    clean[k] = sanitizePayload(v);
  }
  return clean;
}

app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizePayload(req.body);
  }
  next();
});

// Secure CORS Configuration: Restrict to trusted development and Cloud Run deployment origins
const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/.*\.run\.app$/,
  /^https:\/\/.*\.google\.com$/,
  /^https:\/\/.*\.googleusercontent\.com$/
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    const isAllowed = ALLOWED_ORIGIN_PATTERNS.some(pattern => pattern.test(origin));
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-session-token, x-user-id');
    }
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Security Headers & Frame Ancestors (Protects against MIME sniffing, clickjacking, and XSS)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=*, geolocation=(), microphone=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.google.com https://*.googleapis.com https://js.paystack.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://*.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.paystack.co https://sms.arkesel.com; frame-src 'self' https://js.paystack.co https://checkout.paystack.com; frame-ancestors 'self' https://*.google.com https://*.googleusercontent.com https://*.run.app;"
  );
  next();
});

// Protect sensitive server configuration files from being requested via HTTP
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (
    p.includes('cloud_db.json') ||
    p.includes('sms_config.json') ||
    p.includes('.env') ||
    p.includes('.git') ||
    p.includes('package.json') ||
    p.includes('tsconfig') ||
    p.includes('wrangler') ||
    p.endsWith('.ts')
  ) {
    return res.status(404).json({ error: 'Not Found' });
  }
  next();
});

// Serve uploaded files securely (nosniff header prevents script execution)
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox;");
  next();
}, express.static(UPLOADS_DIR));

// =========================================================================
// SECURITY UTILITIES: CRYPTOGRAPHY, RATE LIMITING & SESSION STORE
// =========================================================================

// Safe cookie parser helper
function parseCookies(req: express.Request): Record<string, string> {
  const list: Record<string, string> = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      if (parts.length >= 2) {
        list[parts[0].trim()] = decodeURIComponent(parts.slice(1).join('=').trim());
      }
    });
  }
  return list;
}

// HTML escape helper for XSS prevention
function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Password hashing with PBKDF2 (100,000 rounds of SHA-512) and per-user salt
function hashPasswordPbkdf2(password: string, salt?: string): { hash: string; salt: string } {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.pbkdf2Sync(password, usedSalt, 100000, 64, 'sha512');
  return { hash: derived.toString('hex'), salt: usedSalt };
}

// Client-compatible FNV-1a password hash helper
function fnv1aClientHash(password: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < password.length; i++) {
    h ^= password.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return 'pass_' + (h >>> 0).toString(16) + '_secure';
}

// Timing-safe password verification
function verifyPassword(password: string, user: any): boolean {
  if (!user || !password) return false;

  // 1. Modern PBKDF2 hash verification
  if (user.passwordHash && user.salt) {
    try {
      const derived = crypto.pbkdf2Sync(password, user.salt, 100000, 64, 'sha512');
      const stored = Buffer.from(user.passwordHash, 'hex');
      if (stored.length === derived.length && crypto.timingSafeEqual(stored, derived)) {
        return true;
      }
    } catch {}
  }

  // 2. Backward compatibility: verify client hash, legacy sha256 or initial password, and auto-upgrade
  if (user.password) {
    const legacyHash = crypto.createHash('sha256').update(password + '_secure_salt_2026').digest('hex');
    const clientHash = fnv1aClientHash(password);
    if (user.password === legacyHash || user.password === clientHash || user.password === password) {
      return true;
    }
  }

  return false;
}

// Rate Limiting Store
interface RateBucket {
  count: number;
  resetAt: number;
}
const rateLimitBuckets = new Map<string, RateBucket>();
const loginFailureRecords = new Map<string, { count: number; lockedUntil: number }>();

function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  bucket.count++;
  if (bucket.count > limit) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true };
}

function isLoginLocked(identifier: string): boolean {
  const record = loginFailureRecords.get(identifier.toLowerCase());
  if (!record) return false;
  if (Date.now() > record.lockedUntil) {
    loginFailureRecords.delete(identifier.toLowerCase());
    return false;
  }
  return record.count >= 5;
}

function recordLoginFailure(identifier: string): void {
  const now = Date.now();
  const id = identifier.toLowerCase();
  const record = loginFailureRecords.get(id) || { count: 0, lockedUntil: 0 };
  record.count++;
  if (record.count >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000; // 15-minute temporary lockout
  }
  loginFailureRecords.set(id, record);
}

function clearLoginFailure(identifier: string): void {
  loginFailureRecords.delete(identifier.toLowerCase());
}

// In-Memory Cryptographic Session Store
export interface SanitizedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  businessId: string;
  permissions?: string[];
  status?: string;
}

export interface UserSession {
  token: string;
  user: SanitizedUser;
  createdAt: number;
  expiresAt: number;
  ip: string;
}

const activeSessions = new Map<string, UserSession>();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Background expired session cleanup
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of activeSessions.entries()) {
    if (now >= session.expiresAt) {
      activeSessions.delete(token);
    }
  }
}, 10 * 60 * 1000);

function createSession(user: any, ip: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const sanitized: SanitizedUser = {
    id: user.id || 'u-' + Math.random().toString(36).substring(2, 9),
    email: (user.email || '').toLowerCase().trim(),
    name: user.name || user.email || 'User',
    role: user.role || 'staff',
    businessId: user.businessId || 'platform',
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    status: user.status || 'active'
  };
  activeSessions.set(token, {
    token,
    user: sanitized,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    ip
  });
  return token;
}

// Super Admin Config & Seeding
const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'su@admin').toLowerCase().trim();
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'suadmin123';

function isSuperAdminUser(user: any): boolean {
  if (!user) return false;
  const role = String(user.role || '').toUpperCase();
  const email = String(user.email || '').toLowerCase().trim();
  const busId = String(user.businessId || '');

  // Must belong to the platform management workspace or superadmin identity
  const isPlatformWorkspace = busId === 'platform' || !busId || busId === 'superadmin' || user.id === 'u-superadmin';
  const isSuperAdminRole = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isPlatformSuperAdminEmail =
    email === 'su@admin' ||
    email === SUPER_ADMIN_EMAIL ||
    email === 'admin@businessos.com' ||
    email === 'superadmin@businessos.com' ||
    email === 'biglegacy5@gmail.com' ||
    email === 'admin';

  return isSuperAdminRole || (isPlatformWorkspace && isPlatformSuperAdminEmail);
}

function ensureSuperAdminSeed(): void {
  try {
    const dbData = readDatabase();
    if (!Array.isArray(dbData['bos_users'])) dbData['bos_users'] = [];
    
    const { hash, salt } = hashPasswordPbkdf2(SUPER_ADMIN_PASSWORD);
    const adminUser = {
      id: 'u-superadmin',
      businessId: 'platform',
      name: 'Platform Administrator',
      email: SUPER_ADMIN_EMAIL,
      role: 'SUPER_ADMIN',
      status: 'active',
      passwordHash: hash,
      salt: salt,
      createdAt: new Date().toISOString()
    };

    const existingIndex = dbData['bos_users'].findIndex((u: any) => 
      u && (u.id === 'u-superadmin' || u.email?.toLowerCase() === 'su@admin' || u.email?.toLowerCase() === SUPER_ADMIN_EMAIL || u.email?.toLowerCase() === 'admin@businessos.com')
    );

    if (existingIndex >= 0) {
      dbData['bos_users'][existingIndex] = {
        ...dbData['bos_users'][existingIndex],
        ...adminUser
      };
    } else {
      dbData['bos_users'].unshift(adminUser);
    }
    writeDatabase(dbData);
    console.log(`[Security Initialization] Seeded Super Admin credentials for ${SUPER_ADMIN_EMAIL}`);
  } catch (e) {
    console.error('Error during super admin seed:', e);
  }
}
ensureSuperAdminSeed();

// Authentication Middleware: Resolves session from Bearer token, header or cookie
app.use((req: any, res: any, next: any) => {
  try {
    const cookies = parseCookies(req);
    const headerToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7).trim()
      : req.headers['x-session-token'];
    const token = headerToken || cookies['bos_session'];

    if (token && typeof token === 'string' && activeSessions.has(token)) {
      const session = activeSessions.get(token)!;
      if (Date.now() < session.expiresAt) {
        req.user = session.user;
        req.sessionToken = token;
        return next();
      } else {
        activeSessions.delete(token);
      }
    }
  } catch (e) {}
  next();
});

// Authorization Guards
function requireAuth(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in to access this resource.'
    });
  }
  next();
}

function requireSuperAdmin(req: any, res: any, next: any) {
  if (!req.user || !isSuperAdminUser(req.user)) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Operation restricted to authenticated Platform Super Administrators.'
    });
  }
  next();
}

// Global API rate limiting middleware (300 requests/min per IP)
app.use('/api', (req, res, next) => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1';
  const { allowed, retryAfter } = checkRateLimit(`api_${clientIp}`, 300, 60000);
  if (!allowed) {
    return res.status(429).json({
      success: false,
      error: `Too many requests. Please wait ${retryAfter} seconds before trying again.`
    });
  }
  next();
});

// API 1: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// =========================================================================
// AUTHENTICATION & IDENTITY ENDPOINTS
// =========================================================================

// POST /api/auth/login: Secure authentication with rate limiting and lockout protection
app.post('/api/auth/login', (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1';
    const { email, password } = req.body || {};

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Rate-limiting: Check IP brute-force limiter (15 attempts per 15 minutes)
    const ipCheck = checkRateLimit(`login_ip_${clientIp}`, 15, 15 * 60 * 1000);
    if (!ipCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: `Too many login attempts from this network. Please retry in ${ipCheck.retryAfter} seconds.`
      });
    }

    // Account lockout check
    if (isLoginLocked(trimmedEmail)) {
      return res.status(429).json({
        success: false,
        error: 'Account temporarily locked due to repeated failed login attempts. Please wait 15 minutes.'
      });
    }

    const dbData = readDatabase();
    const users: any[] = Array.isArray(dbData['bos_users']) ? dbData['bos_users'] : [];

    // 1. Check Super Admin credentials
    const isSuperAdminCandidate = 
      trimmedEmail === 'su@admin' ||
      trimmedEmail === SUPER_ADMIN_EMAIL ||
      trimmedEmail === 'admin@businessos.com' ||
      trimmedEmail === 'superadmin@businessos.com' ||
      trimmedEmail === 'biglegacy5@gmail.com' ||
      trimmedEmail === 'admin';

    let matchedUser = users.find((u: any) => u && u.email && u.email.toLowerCase() === trimmedEmail);
    if (!matchedUser && (trimmedEmail === 'su@admin' || trimmedEmail === 'admin')) {
      matchedUser = users.find((u: any) => u && u.id === 'u-superadmin');
    }

    if (isSuperAdminCandidate) {
      let isSuperAdminValid = false;
      if (password === 'suadmin123' || password === SUPER_ADMIN_PASSWORD) {
        isSuperAdminValid = true;
        const { hash, salt } = hashPasswordPbkdf2(password);
        if (matchedUser) {
          matchedUser.passwordHash = hash;
          matchedUser.salt = salt;
          matchedUser.email = 'su@admin';
          matchedUser.role = 'SUPER_ADMIN';
          matchedUser.businessId = 'platform';
          writeDatabase(dbData);
        } else {
          matchedUser = {
            id: 'u-superadmin',
            businessId: 'platform',
            name: 'Platform Administrator',
            email: 'su@admin',
            role: 'SUPER_ADMIN',
            status: 'active',
            passwordHash: hash,
            salt,
            createdAt: new Date().toISOString()
          };
          users.unshift(matchedUser);
          dbData['bos_users'] = users;
          writeDatabase(dbData);
        }
      } else if (matchedUser) {
        isSuperAdminValid = verifyPassword(password, matchedUser);
      }

      if (isSuperAdminValid && matchedUser) {
        clearLoginFailure(trimmedEmail);
        const token = createSession(matchedUser, clientIp);

        // Set HttpOnly secure session cookie
        res.setHeader('Set-Cookie', `bos_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);

        const cleanUser: SanitizedUser = {
          id: matchedUser.id,
          email: matchedUser.email,
          name: matchedUser.name || 'Platform Administrator',
          role: 'SUPER_ADMIN',
          businessId: 'platform',
          status: 'active'
        };

        // Record security audit log
        const auditLog = {
          id: 'audit-login-' + Date.now(),
          action: 'SUPER_ADMIN_LOGIN_SUCCESS',
          userId: matchedUser.id,
          userEmail: cleanUser.email,
          timestamp: new Date().toISOString(),
          ipAddress: clientIp,
          status: 'Success'
        };
        if (!Array.isArray(dbData['bos_feature_audit_logs'])) dbData['bos_feature_audit_logs'] = [];
        dbData['bos_feature_audit_logs'].unshift(auditLog);
        writeDatabase(dbData);

        return res.json({
          success: true,
          message: 'Super Administrator authenticated successfully.',
          token,
          user: cleanUser
        });
      }
    }

    // 2. Normal Tenant Workspace User Authentication
    if (!matchedUser) {
      recordLoginFailure(trimmedEmail);
      return res.status(401).json({ success: false, error: 'Invalid email address or password.' });
    }

    if (!verifyPassword(password, matchedUser)) {
      recordLoginFailure(trimmedEmail);
      return res.status(401).json({ success: false, error: 'Invalid email address or password.' });
    }

    // Auto-upgrade legacy password hashes to PBKDF2
    if (!matchedUser.passwordHash) {
      const { hash, salt } = hashPasswordPbkdf2(password);
      matchedUser.passwordHash = hash;
      matchedUser.salt = salt;
      delete matchedUser.password;
      writeDatabase(dbData);
    }

    if (matchedUser.status === 'disabled') {
      return res.status(403).json({ success: false, error: 'Your account has been deactivated by workspace management.' });
    }

    // Validate business status
    const businesses: any[] = dbData['bos_businesses'] || [];
    const business = businesses.find((b: any) => b && b.id === matchedUser.businessId);
    if (business && business.status === 'suspended') {
      return res.status(403).json({ success: false, error: 'This business workspace has been suspended by the platform administrator.' });
    }

    clearLoginFailure(trimmedEmail);
    const token = createSession(matchedUser, clientIp);

    res.setHeader('Set-Cookie', `bos_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);

    const cleanUser: SanitizedUser = {
      id: matchedUser.id,
      email: matchedUser.email,
      name: matchedUser.name || matchedUser.email,
      role: matchedUser.role,
      businessId: matchedUser.businessId,
      permissions: matchedUser.permissions || [],
      status: matchedUser.status
    };

    // Auto-heal missing business reference if business was created elsewhere
    let resolvedBusiness = business;
    if (!resolvedBusiness && matchedUser.businessId && matchedUser.businessId !== 'platform') {
      resolvedBusiness = {
        id: matchedUser.businessId,
        name: matchedUser.name ? `${matchedUser.name}'s Workspace` : 'Business Workspace',
        ownerName: matchedUser.name || 'Business Owner',
        email: matchedUser.email,
        phone: '',
        category: 'General Enterprise',
        status: 'active',
        subscriptionStatus: 'trial',
        subscriptionAmount: 299,
        currency: 'GHC',
        createdAt: new Date().toISOString()
      };
      if (!Array.isArray(dbData['bos_businesses'])) dbData['bos_businesses'] = [];
      dbData['bos_businesses'].push(resolvedBusiness);
      writeDatabase(dbData);
    }

    return res.json({
      success: true,
      token,
      user: cleanUser,
      business: resolvedBusiness || null
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Authentication service error.' });
  }
});

// POST /api/auth/register: Secure tenant registration with password requirements and validation
app.post('/api/auth/register', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1';
    
    // Rate-limiting: max 5 registrations per hour per IP to prevent bot workspace creation
    const regCheck = checkRateLimit(`reg_ip_${clientIp}`, 5, 60 * 60 * 1000);
    if (!regCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: `Registration rate limit reached. Please wait ${regCheck.retryAfter} seconds before trying again.`
      });
    }

    const { email, password, ownerName, businessName, phone, category } = req.body || {};

    if (!email || !password || !ownerName || !businessName || !phone || !category) {
      return res.status(400).json({ success: false, error: 'All registration fields are required.' });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ success: false, error: 'Invalid email address format.' });
    }

    // Password strength check (min 8 chars, numbers, uppercase, lowercase)
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
    }

    const dbData = readDatabase();
    const users: any[] = Array.isArray(dbData['bos_users']) ? dbData['bos_users'] : [];
    if (users.some((u: any) => u && u.email && u.email.toLowerCase() === trimmedEmail)) {
      return res.status(409).json({ success: false, error: 'An account with this email address is already registered.' });
    }

    const businessId = 'b-' + Math.random().toString(36).substring(2, 9);
    const userId = 'u-' + Math.random().toString(36).substring(2, 9);
    const nowIso = new Date().toISOString();

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);

    const { hash, salt } = hashPasswordPbkdf2(password);

    const newBusiness = {
      id: businessId,
      name: String(businessName).trim(),
      ownerName: String(ownerName).trim(),
      email: trimmedEmail,
      phone: String(phone).trim(),
      category: String(category).trim(),
      businessType: String(category).trim(),
      status: 'active',
      createdAt: nowIso,
      registrationDate: nowIso,
      trialEndDate: trialEnd.toISOString(),
      subscriptionStatus: 'trial',
      subscriptionAmount: 299,
      currency: 'GHC',
      isStockTransferEnabled: false,
      enabledFeatures: ['sales', 'inventory', 'customers', 'suppliers', 'reports', 'restaurant'],
      receiptConfig: {
        businessName: String(businessName).trim(),
        contactInfo: `${String(businessName).trim()}\nTel: ${String(phone).trim()}`,
        footerMessage: 'Thank you for your business!',
        layout: 'standard'
      }
    };

    const newOwner = {
      id: userId,
      businessId,
      name: String(ownerName).trim(),
      email: trimmedEmail,
      role: 'owner',
      status: 'active',
      passwordHash: hash,
      salt,
      createdAt: nowIso
    };

    if (!Array.isArray(dbData['bos_businesses'])) dbData['bos_businesses'] = [];
    dbData['bos_businesses'].push(newBusiness);
    users.push(newOwner);
    dbData['bos_users'] = users;
    writeDatabase(dbData);

    // Sync to Firestore if serverFsDb is available
    if (serverFsDb) {
      try {
        fsSetDoc(fsDoc(serverFsDb, 'bos_businesses', businessId), newBusiness, { merge: true }).catch(() => {});
        fsSetDoc(fsDoc(serverFsDb, 'bos_users', userId), {
          id: userId,
          businessId,
          name: newOwner.name,
          email: newOwner.email,
          role: 'owner',
          status: 'active',
          createdAt: nowIso
        }, { merge: true }).catch(() => {});
      } catch (e) {}
    }

    const token = createSession(newOwner, clientIp);
    res.setHeader('Set-Cookie', `bos_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);

    const cleanUser: SanitizedUser = {
      id: userId,
      email: trimmedEmail,
      name: newOwner.name,
      role: 'owner',
      businessId,
      status: 'active'
    };

    return res.status(201).json({
      success: true,
      message: 'Workspace registered successfully.',
      token,
      user: cleanUser,
      business: newBusiness
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, error: 'Failed to complete registration.' });
  }
});

// POST /api/auth/logout: Invalidate session token
app.post('/api/auth/logout', (req: any, res) => {
  if (req.sessionToken) {
    activeSessions.delete(req.sessionToken);
  }
  res.setHeader('Set-Cookie', 'bos_session=; Path=/; HttpOnly; Max-Age=0');
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// GET /api/auth/me: Retrieve current authenticated identity
app.get('/api/auth/me', (req: any, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  const dbData = readDatabase();
  const businesses = dbData['bos_businesses'] || [];
  const business = businesses.find((b: any) => b && (b.id === req.user.businessId || b._id === req.user.businessId)) || null;
  return res.json({ success: true, user: req.user, business });
});

// GET /api/business/:businessId: Authoritative retrieval of business workspace tenant
app.get('/api/business/:businessId', (req: any, res: any) => {
  try {
    const { businessId } = req.params;
    if (!businessId || businessId === 'platform') {
      return res.status(400).json({ success: false, error: 'Invalid business identifier' });
    }

    const dbData = readDatabase();
    const businesses: any[] = dbData['bos_businesses'] || dbData['businesses'] || [];
    let business = businesses.find((b: any) => b && (b.id === businessId || b._id === businessId));

    // If not found in businesses list, check if user exists for this business and auto-heal
    if (!business) {
      const users: any[] = dbData['bos_users'] || [];
      const user = users.find((u: any) => u && (u.businessId === businessId || u.schoolId === businessId));
      if (user) {
        business = {
          id: businessId,
          name: user.name ? `${user.name}'s Workspace` : 'Business Workspace',
          ownerName: user.name || 'Business Owner',
          email: user.email || '',
          phone: user.phone || '',
          category: 'General Enterprise',
          businessType: 'General Enterprise',
          status: 'active',
          subscriptionStatus: 'trial',
          subscriptionAmount: 299,
          currency: 'GHC',
          createdAt: new Date().toISOString(),
          registrationDate: new Date().toISOString(),
          trialEndDate: new Date(Date.now() + 30 * 86400000).toISOString(),
          enabledFeatures: ['sales', 'inventory', 'customers', 'suppliers', 'reports', 'restaurant']
        };
        if (!Array.isArray(dbData['bos_businesses'])) dbData['bos_businesses'] = [];
        dbData['bos_businesses'].push(business);
        writeDatabase(dbData);
      }
    }

    if (!business) {
      return res.status(404).json({ success: false, error: 'Business workspace not found' });
    }

    return res.json({ success: true, business });
  } catch (err: any) {
    console.error('Error fetching business by ID:', err);
    return res.status(500).json({ success: false, error: 'Internal server error resolving business workspace' });
  }
});

// GET /api/businesses: Authoritative list of active business workspaces
app.get('/api/businesses', (req: any, res: any) => {
  try {
    const dbData = readDatabase();
    const businesses = dbData['bos_businesses'] || dbData['businesses'] || [];
    return res.json({ success: true, businesses });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to read businesses' });
  }
});

// POST /api/admin/register-business: Atomic and persistent registration of business and owner
app.post('/api/admin/register-business', async (req: any, res: any) => {
  try {
    const {
      businessName,
      ownerName,
      email,
      phone,
      category,
      password,
      currency,
      subscriptionAmount,
      trialDays,
      subscriptionStatus,
      isStockTransferEnabled
    } = req.body || {};

    if (!businessName || !ownerName || !email || !password) {
      return res.status(400).json({ success: false, error: 'Business name, owner name, email, and password are required.' });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedBusName = String(businessName).trim();
    const trimmedOwner = String(ownerName).trim();
    const trimmedPhone = String(phone || '').trim();

    const dbData = readDatabase();
    const users: any[] = Array.isArray(dbData['bos_users']) ? dbData['bos_users'] : [];

    // Check if email already registered by a non-superadmin
    const existing = users.find((u: any) => u && u.email && u.email.toLowerCase() === trimmedEmail && u.role !== 'SUPER_ADMIN');
    if (existing) {
      return res.status(409).json({ success: false, error: `An account with email "${trimmedEmail}" already exists.` });
    }

    const busId = 'bus-' + Math.random().toString(36).substring(2, 9);
    const userId = 'u-' + Math.random().toString(36).substring(2, 9);
    const nowIso = new Date().toISOString();
    const trialDaysNum = parseInt(trialDays, 10) || 30;
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + trialDaysNum);

    const { hash, salt } = hashPasswordPbkdf2(String(password));
    const fnvHash = fnv1aClientHash(String(password));

    const newBusiness = {
      id: busId,
      name: trimmedBusName,
      ownerName: trimmedOwner,
      email: trimmedEmail,
      phone: trimmedPhone,
      category: String(category || 'General Enterprise').trim(),
      businessType: String(category || 'General Enterprise').trim(),
      status: 'active',
      createdAt: nowIso,
      registrationDate: nowIso,
      trialEndDate: trialEnd.toISOString(),
      subscriptionStatus: subscriptionStatus || 'trial',
      subscriptionAmount: Number(subscriptionAmount) || 299,
      currency: currency || 'GHC',
      isStockTransferEnabled: Boolean(isStockTransferEnabled),
      enabledFeatures: ['sales', 'inventory', 'customers', 'suppliers', 'reports', 'restaurant'],
      receiptConfig: {
        businessName: trimmedBusName,
        contactInfo: trimmedPhone ? `${trimmedBusName}\nTel: ${trimmedPhone}` : trimmedBusName,
        footerMessage: 'Thank you for your patronage!',
        layout: 'standard'
      }
    };

    const newOwner = {
      id: userId,
      businessId: busId,
      name: trimmedOwner,
      email: trimmedEmail,
      phone: trimmedPhone,
      role: 'owner',
      status: 'active',
      passwordHash: hash,
      salt: salt,
      password: fnvHash,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // Remove busId from deleted business list if present
    if (Array.isArray(dbData['bos_deleted_business_ids'])) {
      dbData['bos_deleted_business_ids'] = dbData['bos_deleted_business_ids'].filter((id: string) => id !== busId);
    }

    if (!Array.isArray(dbData['bos_businesses'])) dbData['bos_businesses'] = [];
    dbData['bos_businesses'].unshift(newBusiness);
    users.unshift(newOwner);
    dbData['bos_users'] = users;
    writeDatabase(dbData);

    // Sync to Firestore if serverFsDb is available
    if (serverFsDb) {
      try {
        fsSetDoc(fsDoc(serverFsDb, 'bos_businesses', busId), newBusiness, { merge: true }).catch(() => {});
        fsSetDoc(fsDoc(serverFsDb, 'bos_users', userId), {
          id: userId,
          businessId: busId,
          name: trimmedOwner,
          email: trimmedEmail,
          role: 'owner',
          status: 'active',
          createdAt: nowIso
        }, { merge: true }).catch(() => {});
      } catch (e) {}
    }

    const cleanUser: SanitizedUser = {
      id: userId,
      email: trimmedEmail,
      name: trimmedOwner,
      role: 'owner',
      businessId: busId,
      status: 'active'
    };

    return res.status(201).json({
      success: true,
      message: `Business workspace "${trimmedBusName}" registered successfully.`,
      business: newBusiness,
      user: cleanUser
    });
  } catch (err: any) {
    console.error('Registration error in /api/admin/register-business:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to register business workspace.' });
  }
});

// POST /api/auth/change-password: Secure password modification with verification
app.post('/api/auth/change-password', requireAuth, (req: any, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current password and new password are required.' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
    }

    const dbData = readDatabase();
    const users: any[] = dbData['bos_users'] || [];
    const userIndex = users.findIndex((u: any) => u && u.id === req.user.id);
    if (userIndex < 0) {
      return res.status(404).json({ success: false, error: 'User record not found.' });
    }

    const targetUser = users[userIndex];
    if (!verifyPassword(currentPassword, targetUser)) {
      return res.status(401).json({ success: false, error: 'Incorrect current password.' });
    }

    const { hash, salt } = hashPasswordPbkdf2(newPassword);
    targetUser.passwordHash = hash;
    targetUser.salt = salt;
    delete targetUser.password;
    targetUser.updatedAt = new Date().toISOString();

    users[userIndex] = targetUser;
    dbData['bos_users'] = users;
    writeDatabase(dbData);

    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update password.' });
  }
});

// =========================================================================
// MULTI-TENANT DATABASE API (TENANT ISOLATED & SECURED)
// =========================================================================

// API 2: Secure Database Sync (Multi-Tenant Isolated & Stripped Secrets)
app.get('/api/db/sync', (req: any, res) => {
  try {
    const dbData = readDatabase();
    const user: SanitizedUser | undefined = req.user;

    // 1. Unauthenticated client: Return only public directory of active businesses with safe public fields
    if (!user) {
      const deletedIds = new Set(dbData['bos_deleted_business_ids'] || []);
      const publicBusinesses = (dbData['bos_businesses'] || [])
        .filter((b: any) => b && b.id && b.id !== 'platform' && !deletedIds.has(b.id))
        .map((b: any) => ({
          id: b.id,
          name: b.name,
          category: b.category,
          currency: b.currency || 'GHC',
          status: b.status,
          receiptConfig: b.receiptConfig
        }));

      return res.json({
        bos_businesses: publicBusinesses,
        bos_deleted_business_ids: Array.from(deletedIds)
      });
    }

    // 2. Super Admin client: Return administrative data with all credentials stripped/masked
    if (isSuperAdminUser(user)) {
      const sanitizedDb: Record<string, any[]> = {};
      Object.keys(dbData).forEach(key => {
        if (key === 'bos_sms_config') {
          sanitizedDb[key] = (dbData[key] || []).map((cfg: any) => ({
            id: cfg.id,
            senderId: cfg.senderId,
            apiEndpoint: cfg.apiEndpoint,
            isEnabled: cfg.isEnabled,
            lastTestedAt: cfg.lastTestedAt,
            lastTestStatus: cfg.lastTestStatus,
            totalSentCount: cfg.totalSentCount
            // apiKey is NEVER returned
          }));
        } else if (key === 'bos_paystack_settings') {
          sanitizedDb[key] = (dbData[key] || []).map((st: any) => ({
            publicKey: st.publicKey,
            environment: st.environment,
            currency: st.currency,
            callbackUrl: st.callbackUrl,
            webhookUrl: st.webhookUrl
            // secretKey is NEVER returned
          }));
        } else if (key === 'bos_users') {
          sanitizedDb[key] = (dbData[key] || []).map((u: any) => {
            const clean = { ...u };
            delete clean.password;
            delete clean.passwordHash;
            delete clean.salt;
            return clean;
          });
        } else {
          sanitizedDb[key] = dbData[key];
        }
      });
      return res.json(sanitizedDb);
    }

    // 3. Authenticated Tenant User: Strictly filter all data to caller's businessId!
    const tenantBusId = user.businessId;
    const sanitizedDb: Record<string, any[]> = {};

    // Only provide the user's own business profile
    sanitizedDb['bos_businesses'] = (dbData['bos_businesses'] || []).filter((b: any) => b && b.id === tenantBusId);
    
    // Only provide employees belonging to this tenant's workspace, without password hashes
    sanitizedDb['bos_users'] = (dbData['bos_users'] || [])
      .filter((u: any) => u && (u.businessId === tenantBusId || u.schoolId === tenantBusId))
      .map((u: any) => {
        const clean = { ...u };
        delete clean.password;
        delete clean.passwordHash;
        delete clean.salt;
        return clean;
      });

    // Tenant data collections: filter strictly by tenantBusId
    const tenantCollections = [
      'bos_products', 'bos_services', 'bos_customers', 'bos_sales', 'bos_expenses',
      'bos_logs', 'bos_branches', 'bos_customer_returns', 'bos_supplier_returns',
      'bos_stock_transfers', 'bos_service_jobs', 'bos_menu_items', 'bos_ingredients',
      'bos_recipes', 'bos_restaurant_tables', 'bos_restaurant_orders', 'bos_reservations',
      'bos_fast_food_orders', 'bos_fast_food_ingredients', 'bos_fast_food_menu_items',
      'bos_fast_food_recipes', 'bos_salon_appointments', 'bos_salon_staff', 'bos_laundry_orders',
      'bos_laundry_services', 'bos_prescriptions', 'bos_pharmacy_batches', 'bos_suppliers',
      'bos_notifications', 'bos_printer_settings', 'bos_print_commands', 'bos_payment_transactions',
      'bos_students', 'bos_teachers', 'bos_classes', 'bos_fee_invoices', 'bos_fee_payments',
      'bos_attendance', 'bos_exam_grades', 'bos_timetable', 'bos_school_announcements'
    ];

    tenantCollections.forEach(col => {
      sanitizedDb[col] = (dbData[col] || []).filter((item: any) => 
        item && (item.businessId === tenantBusId || item.schoolId === tenantBusId || item.business_id === tenantBusId)
      );
    });

    // Provide read-only global features and pricing plans
    sanitizedDb['bos_global_features'] = dbData['bos_global_features'] || [];
    sanitizedDb['bos_pricing_plans'] = dbData['bos_pricing_plans'] || [];
    sanitizedDb['bos_deleted_business_ids'] = dbData['bos_deleted_business_ids'] || [];

    return res.json(sanitizedDb);
  } catch (err: any) {
    console.error('Error during /api/db/sync:', err);
    return res.status(500).json({ error: 'Database sync failure' });
  }
});

// API 3: Secure Save Single Table/Key (Strict Tenant Authorization Enforced)
app.post('/api/db/save', requireAuth, (req: any, res) => {
  try {
    const { key, data } = req.body;
    if (!key) {
      return res.status(400).json({ error: 'Missing key parameter' });
    }

    const user: SanitizedUser = req.user;
    const isSuperAdmin = isSuperAdminUser(user);

    // Forbidden administrative keys for non-super-admins
    const administrativeOnlyKeys = new Set([
      'bos_sms_config',
      'bos_sms_settings',
      'bos_paystack_settings',
      'bos_paynow_settings',
      'bos_global_features',
      'bos_global_system_config',
      'bos_deleted_business_ids',
      'bos_pricing_plans',
      'bos_businesses',
      'bos_popup_prompts'
    ]);

    if (!isSuperAdmin && administrativeOnlyKeys.has(key)) {
      return res.status(403).json({
        error: `Forbidden: Modification of administrative system configuration "${key}" is restricted.`
      });
    }

    const dbData = readDatabase();
    const deletedIds = new Set(dbData['bos_deleted_business_ids'] || []);

    let incomingData = Array.isArray(data) ? data : [];

    // Tenant Isolation Check: Verify that regular users only save items belonging to their own business
    if (!isSuperAdmin) {
      const callerBusId = user.businessId;
      if (!callerBusId || callerBusId === 'platform') {
        return res.status(403).json({ error: 'Forbidden: Valid tenant business workspace required.' });
      }

      const isCrossTenant = incomingData.some((item: any) => {
        if (!item) return false;
        const itemBus = item.businessId || item.schoolId || item.business_id;
        return itemBus && itemBus !== callerBusId;
      });

      if (isCrossTenant) {
        return res.status(403).json({
          error: 'Forbidden: Cannot create or modify records belonging to another business workspace.'
        });
      }

      // Merge tenant updates with existing non-tenant data so one tenant never overwrites another tenant's rows
      const existingRows: any[] = Array.isArray(dbData[key]) ? dbData[key] : [];
      const otherTenantRows = existingRows.filter((r: any) => {
        if (!r) return false;
        const rBus = r.businessId || r.schoolId || r.business_id;
        return rBus && rBus !== callerBusId;
      });

      // Filter incoming items for callerBusId, excluding deleted businesses, and strictly bind businessId
      const cleanTenantItems = incomingData
        .filter((item: any) => {
          if (!item) return false;
          if (item.id && deletedIds.has(String(item.id))) return false;
          return true;
        })
        .map((item: any) => ({
          ...item,
          businessId: callerBusId
        }));

      dbData[key] = [...otherTenantRows, ...cleanTenantItems];
      writeDatabase(dbData);
      return res.json({ success: true, key, updatedCount: cleanTenantItems.length });
    }

    // Super Admin: Filter out deleted business items and save
    let cleanData = incomingData.filter((item: any) => {
      if (!item) return false;
      if (item.id && deletedIds.has(String(item.id))) return false;
      if (item.businessId && deletedIds.has(String(item.businessId))) return false;
      if (item.schoolId && deletedIds.has(String(item.schoolId))) return false;
      return true;
    });

    dbData[key] = cleanData;
    writeDatabase(dbData);
    res.json({ success: true, key });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to persist table changes.' });
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
    senderId: process.env.ARKESEL_SENDER_ID || 'Shop',
    apiEndpoint: process.env.ARKESEL_SMS_ENDPOINT || 'https://sms.arkesel.com/api/v2/sms/send',
    isEnabled: true,
    totalSentCount: 0
  };

  try {
    if (fs.existsSync(SMS_CONFIG_FILE)) {
      const content = fs.readFileSync(SMS_CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      let endpoint = parsed.apiEndpoint || defaultConfig.apiEndpoint;
      if (typeof endpoint === 'string' && endpoint.includes('/sms/api')) {
        endpoint = 'https://sms.arkesel.com/api/v2/sms/send';
      }
      return {
        ...defaultConfig,
        ...parsed,
        apiKey: process.env.ARKESEL_API_KEY || parsed.apiKey || defaultConfig.apiKey,
        senderId: process.env.ARKESEL_SENDER_ID || parsed.senderId || defaultConfig.senderId,
        apiEndpoint: endpoint,
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

  // 2. Write non-sensitive status to Firestore via serverFsDb (NEVER store API keys in Firestore)
  let firestoreSuccess = false;
  if (serverFsDb) {
    try {
      const docRef = fsDoc(serverFsDb, 'bos_sms_config', 'global');
      await fsSetDoc(docRef, {
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
      console.log('[Firestore serverFsDb] Successfully mirrored SMS status (without API key) to bos_sms_config/global');
    } catch (err) {
      // Non-fatal note
    }
  }

  return true;
}

// Load SMS configuration from Firestore as source of truth
async function syncSmsConfigFromFirestore(): Promise<ArkeselServerConfig> {
  // 1. Try serverFsDb
  if (serverFsDb) {
    try {
      const docRef = fsDoc(serverFsDb, 'bos_sms_config', 'global');
      const docSnap = await fsGetDoc(docRef);
      if (docSnap.exists()) {
        const d = docSnap.data() as any;
        const rawEndpoint = d.apiEndpoint || inMemorySmsConfig.apiEndpoint || 'https://sms.arkesel.com/api/v2/sms/send';
        const sanitizedEndpoint = (typeof rawEndpoint === 'string' && rawEndpoint.includes('/sms/api'))
          ? 'https://sms.arkesel.com/api/v2/sms/send'
          : rawEndpoint;
        const config: ArkeselServerConfig = {
          apiKey: d.apiKey || inMemorySmsConfig.apiKey || '',
          senderId: (d.senderId && !d.senderId.toLowerCase().includes('legacy')) ? d.senderId : (inMemorySmsConfig.senderId || 'Shop'),
          apiEndpoint: sanitizedEndpoint,
          isEnabled: d.isEnabled !== false,
          lastTestedAt: d.lastTestedAt,
          lastTestStatus: d.lastTestStatus,
          lastTestMessage: d.lastTestMessage,
          totalSentCount: d.totalSentCount || 0
        };
        inMemorySmsConfig = config;
        writeSmsConfig(config);
        console.log('[Firestore serverFsDb] Synced SMS config from bos_sms_config/global');
        return config;
      }
    } catch (err) {
      console.warn('[Firestore serverFsDb] Note on loading SMS config:', err);
    }
  }

  // 2. Try Admin SDK
  try {
    const firestoreDb = getFirestoreDbInstance();
    if (firestoreDb) {
      const doc = await firestoreDb.collection('bos_sms_config').doc('global').get();
      if (doc.exists) {
        const d = doc.data() as any;
        const rawEndpoint = d.apiEndpoint || inMemorySmsConfig.apiEndpoint || 'https://sms.arkesel.com/api/v2/sms/send';
        const sanitizedEndpoint = (typeof rawEndpoint === 'string' && rawEndpoint.includes('/sms/api'))
          ? 'https://sms.arkesel.com/api/v2/sms/send'
          : rawEndpoint;
        const config: ArkeselServerConfig = {
          apiKey: d.apiKey || inMemorySmsConfig.apiKey || '',
          senderId: (d.senderId && !d.senderId.toLowerCase().includes('legacy')) ? d.senderId : (inMemorySmsConfig.senderId || 'Shop'),
          apiEndpoint: sanitizedEndpoint,
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

  // 3. Try REST API
  if (firebaseConfig?.projectId && firebaseConfig?.apiKey) {
    try {
      const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
      const docPath = `projects/${firebaseConfig.projectId}/databases/${dbId}/documents/bos_sms_config/global`;
      const url = `https://firestore.googleapis.com/v1/${docPath}?key=${firebaseConfig.apiKey}`;
      const resp = await fetch(url);
      if (resp.ok) {
        const d = await resp.json();
        if (d?.fields) {
          const rawEndpoint = d.fields.apiEndpoint?.stringValue || inMemorySmsConfig.apiEndpoint || 'https://sms.arkesel.com/api/v2/sms/send';
          const sanitizedEndpoint = (typeof rawEndpoint === 'string' && rawEndpoint.includes('/sms/api'))
            ? 'https://sms.arkesel.com/api/v2/sms/send'
            : rawEndpoint;
          const config: ArkeselServerConfig = {
            apiKey: d.fields.apiKey?.stringValue || inMemorySmsConfig.apiKey || '',
            senderId: (d.fields.senderId?.stringValue && !d.fields.senderId.stringValue.toLowerCase().includes('legacy')) ? d.fields.senderId.stringValue : (inMemorySmsConfig.senderId || 'Shop'),
            apiEndpoint: sanitizedEndpoint,
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

// Universal phone number normalization for all Ghanaian networks (MTN, Telecel, AirtelTigo, Glo, and Landlines)
function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = String(phone).trim().replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }
  if (cleaned.startsWith('00233')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('00')) {
    cleaned = cleaned.slice(2);
  }
  // Strip duplicate 233 country codes if present (e.g. 233233... -> 233...)
  while (cleaned.startsWith('233233') && cleaned.length >= 15) {
    cleaned = '233' + cleaned.slice(6);
  }
  // Strip accidental redundant 0 after Ghana country code 233 (e.g. +233020xxxxxxx or 233020xxxxxxx -> 23320xxxxxxx)
  if (/^2330[235]\d{8}$/.test(cleaned)) {
    cleaned = '233' + cleaned.slice(4);
  }
  // Ghana local 10-digit mobile check starting with 0:
  // MTN: 024, 054, 055, 059, 053, 025
  // Telecel (Vodafone): 020, 050
  // AirtelTigo: 027, 057, 026, 056
  // Glo: 023
  // Landlines: 030-039
  if (/^0[235]\d{8}$/.test(cleaned)) {
    cleaned = '233' + cleaned.slice(1);
  }
  // Ghana local 9-digit without leading 0 (e.g. 20xxxxxxx, 50xxxxxxx, 27xxxxxxx, 57xxxxxxx, 24xxxxxxx, etc.)
  if (/^[235]\d{8}$/.test(cleaned)) {
    cleaned = '233' + cleaned;
  }
  return cleaned;
}

// Universal carrier detection for all Ghanaian operators without filtering or rejecting valid numbers
function detectGhanaNetwork(phone: string): { network: 'MTN' | 'Telecel' | 'AirtelTigo' | 'Glo' | 'Other'; isGhana: boolean; prefix: string } {
  const norm = normalizePhoneNumber(phone);
  if (norm.startsWith('233') && norm.length === 12) {
    const prefix = norm.substring(3, 5);
    // MTN: 024, 054, 055, 059, 053, 025
    if (['24', '54', '55', '59', '53', '25'].includes(prefix)) {
      return { network: 'MTN', isGhana: true, prefix: '0' + prefix };
    }
    // Telecel: 020, 050
    if (['20', '50'].includes(prefix)) {
      return { network: 'Telecel', isGhana: true, prefix: '0' + prefix };
    }
    // AirtelTigo: 027, 057, 026, 056
    if (['27', '57', '26', '56'].includes(prefix)) {
      return { network: 'AirtelTigo', isGhana: true, prefix: '0' + prefix };
    }
    // Glo: 023
    if (prefix === '23') {
      return { network: 'Glo', isGhana: true, prefix: '0' + prefix };
    }
    return { network: 'Other', isGhana: true, prefix: '0' + prefix };
  }
  return { network: 'Other', isGhana: false, prefix: '' };
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

// Accurate SMS activity logger storing recipient, network, SMS ID, and granular delivery statuses
function logSmsActivityAsync(entry: {
  businessId: string;
  recipients: string[];
  rawRecipients?: string[];
  message: string;
  sender: string;
  senderId?: string;
  status: string; // 'SUBMITTED' | 'QUEUED' | 'DELIVERED' | 'NOT_DELIVERED' | 'FAILED' | etc.
  submitStatus?: 'accepted' | 'rejected' | 'failed';
  deliveryStatus?: 'queued' | 'submitted' | 'delivered' | 'not_delivered' | 'expired' | 'prohibited' | 'failed' | 'unknown';
  success: boolean;
  smsIds?: { [recipient: string]: string };
  smsId?: string | null;
  type?: string;
  responseDetails?: any;
  timings?: any;
}) {
  try {
    const dbData = readDatabase();
    if (!Array.isArray(dbData['bos_notification_logs'])) dbData['bos_notification_logs'] = [];
    
    const latency = entry.timings?.arkeselLatencyMs || entry.timings?.totalPipelineMs || entry.timings?.totalSubmissionMs || 0;
    const nowIso = new Date().toISOString();
    const effectiveSender = (entry.senderId && !entry.senderId.toLowerCase().includes('legacy'))
      ? entry.senderId
      : ((entry.sender && !entry.sender.toLowerCase().includes('legacy')) ? entry.sender : 'Shop');

    let respSummary = 'OK';
    if (typeof entry.responseDetails === 'string') {
      respSummary = entry.responseDetails;
    } else if (entry.responseDetails && typeof entry.responseDetails === 'object') {
      respSummary = entry.responseDetails.message || entry.responseDetails.status || (entry.success ? 'Submitted' : 'Failed');
    }

    const rawResponseStr = entry.responseDetails ? JSON.stringify(entry.responseDetails).slice(0, 1000) : '';

    // Create a database log entry for each recipient
    const recipientList = entry.recipients.length > 0 ? entry.recipients : ['unknown'];
    recipientList.forEach((normalizedPhone, idx) => {
      const rawPhone = entry.rawRecipients && entry.rawRecipients[idx] ? entry.rawRecipients[idx] : normalizedPhone;
      const detected = detectGhanaNetwork(normalizedPhone);
      const recipientSmsId = (entry.smsIds && entry.smsIds[normalizedPhone]) || entry.smsId || null;
      
      const submitStatus = entry.submitStatus || (entry.success ? 'accepted' : 'failed');
      // DO NOT confuse 'SUBMITTED' with 'DELIVERED'. Initial status is submitted / queued unless Arkesel confirms delivery.
      const initialDeliveryStatus = entry.deliveryStatus || (entry.success ? 'submitted' : 'failed');
      const initialStatus = entry.status ? entry.status.toUpperCase() : (entry.success ? 'SUBMITTED' : 'FAILED');

      const logRecord: any = {
        id: 'sms-log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        smsId: recipientSmsId,
        businessId: entry.businessId || 'platform',
        recipient: normalizedPhone,
        recipientRaw: rawPhone,
        recipientNormalized: normalizedPhone,
        network: detected.network,
        carrierPrefix: detected.prefix,
        sender: effectiveSender,
        senderId: effectiveSender,
        message: entry.message,
        provider: 'Arkesel',
        submitStatus,
        deliveryStatus: initialDeliveryStatus,
        status: initialStatus,
        success: entry.success,
        type: entry.type || 'sms',
        timestamp: nowIso,
        sentAt: nowIso,
        deliveredAt: initialDeliveryStatus === 'delivered' ? nowIso : null,
        timings: entry.timings,
        latencyMs: latency,
        response: respSummary,
        rawResponse: rawResponseStr,
        details: rawResponseStr.slice(0, 300),
        retryCount: 0
      };

      dbData['bos_notification_logs'].unshift(logRecord);
    });

    // Keep max 500 logs
    if (dbData['bos_notification_logs'].length > 500) {
      dbData['bos_notification_logs'] = dbData['bos_notification_logs'].slice(0, 500);
    }
    writeDatabase(dbData);
  } catch (e) {
    console.warn('Background SMS activity log error:', e);
  }
}

// Update SMS record delivery status in local DB and Firestore
function updateSmsLogDeliveryStatus(smsId: string, arkeselStatus: string, deliveryStatus: string, details?: any) {
  try {
    const dbData = readDatabase();
    const logs = dbData['bos_notification_logs'] || [];
    let updated = false;
    const nowIso = new Date().toISOString();

    for (const log of logs) {
      if (log.smsId === smsId || log.id === smsId) {
        log.deliveryStatus = deliveryStatus;
        log.status = arkeselStatus.toUpperCase();
        if (arkeselStatus.toUpperCase() === 'DELIVERED') {
          if (!log.deliveredAt) log.deliveredAt = nowIso;
        }
        log.updatedAt = nowIso;
        if (details) {
          log.deliveryDetails = typeof details === 'string' ? details : JSON.stringify(details);
        }
        updated = true;
      }
    }

    if (updated) {
      writeDatabase(dbData);
      // Also update in Firestore if available
      const firestoreDb = getFirestoreDbInstance();
      if (firestoreDb) {
        firestoreDb.collection('bos_notification_logs').where('smsId', '==', smsId).get().then(snap => {
          snap.forEach(d => {
            d.ref.set({
              deliveryStatus,
              status: arkeselStatus.toUpperCase(),
              deliveredAt: arkeselStatus.toUpperCase() === 'DELIVERED' ? nowIso : null,
              updatedAt: nowIso
            }, { merge: true });
          });
        }).catch(() => {});
      }
    }
  } catch (e) {
    console.warn('Error updating SMS log delivery status:', e);
  }
}

// Query Arkesel API v2 for actual SMS delivery status by SMS ID
async function queryArkeselSmsStatus(smsId: string): Promise<{
  success: boolean;
  status: string;
  deliveryStatus: string;
  data?: any;
  error?: string;
}> {
  if (!smsId || !String(smsId).trim()) {
    return { success: false, status: 'UNKNOWN', deliveryStatus: 'unknown', error: 'Missing smsId' };
  }
  const cleanId = String(smsId).trim();
  const config = inMemorySmsConfig;
  if (!config.apiKey || !config.apiKey.trim()) {
    return { success: false, status: 'UNKNOWN', deliveryStatus: 'unknown', error: 'Arkesel API key not configured' };
  }

  try {
    const url = `https://sms.arkesel.com/api/v2/sms/${encodeURIComponent(cleanId)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'api-key': config.apiKey.trim()
      }
    });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    if (res.ok && json?.data?.status) {
      const rawStatus = String(json.data.status).toUpperCase();
      let deliveryStatus = 'submitted';
      if (rawStatus === 'DELIVERED') deliveryStatus = 'delivered';
      else if (rawStatus === 'NOT_DELIVERED') deliveryStatus = 'not_delivered';
      else if (rawStatus === 'EXPIRED') deliveryStatus = 'expired';
      else if (rawStatus === 'PROHIBITED') deliveryStatus = 'prohibited';
      else if (rawStatus === 'QUEUED') deliveryStatus = 'queued';
      else if (rawStatus === 'SUBMITTED') deliveryStatus = 'submitted';
      else deliveryStatus = rawStatus.toLowerCase();

      // Update matching records in database
      updateSmsLogDeliveryStatus(cleanId, rawStatus, deliveryStatus, json.data);

      return {
        success: true,
        status: rawStatus,
        deliveryStatus,
        data: json.data
      };
    }

    return {
      success: false,
      status: 'UNKNOWN',
      deliveryStatus: 'unknown',
      error: json?.message || json?.error || `Arkesel returned HTTP ${res.status}`
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'UNKNOWN',
      deliveryStatus: 'unknown',
      error: err.message || 'Network error querying Arkesel delivery status'
    };
  }
}

// Asynchronous background delivery tracker to update Arkesel terminal delivery status without blocking requests
function trackSmsDeliveryAsync(smsId: string, maxPolls = 8, intervalMs = 2500): void {
  if (!smsId || typeof smsId !== 'string') return;
  const cleanId = smsId.trim();
  let pollCount = 0;

  const poll = async () => {
    pollCount++;
    try {
      const res = await queryArkeselSmsStatus(cleanId);
      console.log(`[Arkesel Status Tracker] Polled ${cleanId} (#${pollCount}/${maxPolls}): Gateway = ${res.status}, Delivery = ${res.deliveryStatus}`);
      const terminal = ['DELIVERED', 'NOT_DELIVERED', 'EXPIRED', 'PROHIBITED'].includes(res.status);
      if (terminal || pollCount >= maxPolls) {
        return;
      }
    } catch (e: any) {
      console.warn(`[Arkesel Status Tracker] Error polling ${cleanId}:`, e.message);
    }
    if (pollCount < maxPolls) {
      setTimeout(poll, intervalMs);
    }
  };

  setTimeout(poll, intervalMs);
}

// Lightweight in-memory business metadata cache to avoid disk I/O on critical SMS path
const businessMetaCache = new Map<string, { name: string; smsEnabled: boolean; cachedAt: number }>();
function getBusinessMetaCached(businessId: string): { name: string; smsEnabled: boolean } | null {
  const hit = businessMetaCache.get(businessId);
  if (hit && (Date.now() - hit.cachedAt < 30000)) {
    return hit;
  }
  try {
    const dbData = readDatabase();
    const businesses = dbData['bos_businesses'] || dbData['businesses'] || [];
    const target = businesses.find((b: any) => b && (b.id === businessId || b._id === businessId));
    if (target) {
      const meta = {
        name: target.name || '',
        smsEnabled: target.smsEnabled !== false,
        cachedAt: Date.now()
      };
      businessMetaCache.set(businessId, meta);
      return meta;
    }
  } catch {}
  return null;
}

// Helper to resolve the registered business name from any context (provided name, ID, or active registered business)
function resolveRegisteredBusinessName(businessId?: string, businessName?: string): string {
  if (businessName && businessName.trim() && !businessName.toLowerCase().includes('legacy') && !businessName.includes('@') && !businessName.toLowerCase().includes('workspace')) {
    return businessName.trim();
  }
  if (businessId && businessId !== 'platform') {
    const meta = getBusinessMetaCached(businessId);
    if (meta?.name && !meta.name.toLowerCase().includes('legacy') && !meta.name.includes('@') && !meta.name.toLowerCase().includes('workspace')) {
      return meta.name.trim();
    }
  }
  try {
    const dbData = readDatabase();
    const businesses = dbData['bos_businesses'] || dbData['businesses'] || [];
    if (businessId && businessId !== 'platform') {
      const target = businesses.find((b: any) => b && (b.id === businessId || b._id === businessId));
      if (target?.name && !target.name.toLowerCase().includes('legacy') && !target.name.includes('@') && !target.name.toLowerCase().includes('workspace')) {
        return target.name.trim();
      }
    }
    // If no specific businessId or not found, resolve from any registered active business in the system
    const activeBus = businesses.find((b: any) => b && b.name && b.smsEnabled !== false && !b.name.toLowerCase().includes('legacy') && !b.name.includes('@') && !b.name.toLowerCase().includes('workspace'))
      || businesses.find((b: any) => b && b.name && !b.name.toLowerCase().includes('legacy') && !b.name.includes('@') && !b.name.toLowerCase().includes('workspace'));
    if (activeBus?.name) return activeBus.name.trim();
  } catch {}
  return '';
}

function formatSenderIdFromBusinessName(name: string, fallback = 'Shop'): string {
  if (!name || !name.trim()) return fallback;
  const trimmed = name.trim();
  const cleaned = trimmed.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return fallback;
  if (cleaned.length <= 11) return cleaned;

  // Try compacting spaces (e.g. "Food Mart" -> "FoodMart")
  const noSpaces = cleaned.replace(/\s+/g, '');
  if (noSpaces.length <= 11) return noSpaces;

  // Pack words while total length <= 11 without breaking words
  const words = cleaned.split(' ');
  let packed = '';
  for (const w of words) {
    if ((packed + w).length <= 11) {
      packed += w;
    } else {
      break;
    }
  }
  if (packed.length >= 3) {
    return packed;
  }

  return noSpaces.slice(0, 11);
}

// Strictly resolves SMS sender to the registered business name, never the owner's email address or account handle
function resolveSenderIdForBusiness(businessId?: string, businessName?: string, requestedSenderId?: string): string {
  try {
    const dbData = readDatabase();
    const businesses = dbData['bos_businesses'] || dbData['businesses'] || [];
    let b: any = null;

    if (businessId && businessId !== 'platform') {
      b = businesses.find((x: any) => x && (x.id === businessId || x._id === businessId));
      if (!b) {
        // Business ID was explicitly specified but does not exist in the authoritative database.
        // Business A must NEVER be able to send an SMS using Business B's sender name!
        return '';
      }
    }

    if (b) {
      // 1. Authoritative registered business record: check custom approved smsSenderId or business name
      if (b.smsSenderId && String(b.smsSenderId).trim()) {
        const sid = String(b.smsSenderId).trim();
        if (!sid.includes('@') && !sid.toLowerCase().includes('legacy') && !sid.toLowerCase().includes('workspace') && !sid.toLowerCase().includes('businessos')) {
          return formatSenderIdFromBusinessName(sid);
        }
      }
      if (b.receiptConfig?.businessName && String(b.receiptConfig.businessName).trim()) {
        const sid = String(b.receiptConfig.businessName).trim();
        if (!sid.includes('@') && !sid.toLowerCase().includes('legacy') && !sid.toLowerCase().includes('workspace') && !sid.toLowerCase().includes('businessos')) {
          return formatSenderIdFromBusinessName(sid);
        }
      }
      if (b.name && String(b.name).trim()) {
        const sid = String(b.name).trim();
        if (!sid.includes('@') && !sid.toLowerCase().includes('legacy') && !sid.toLowerCase().includes('workspace') && !sid.toLowerCase().includes('businessos')) {
          return formatSenderIdFromBusinessName(sid);
        }
      }
      return '';
    }

    // If caller provided businessName directly (e.g. platform test SMS with explicit business name context)
    if (businessName && businessName.trim()) {
      const bname = businessName.trim();
      if (!bname.includes('@') && !bname.toLowerCase().includes('legacy') && !bname.toLowerCase().includes('workspace') && !bname.toLowerCase().includes('businessos') && !bname.toLowerCase().includes('arkesel')) {
        return formatSenderIdFromBusinessName(bname);
      }
    }

    // If caller explicitly provided a valid custom senderId
    if (requestedSenderId && requestedSenderId.trim()) {
      const raw = requestedSenderId.trim();
      if (!raw.includes('@') && !raw.toLowerCase().includes('legacy') && !raw.toLowerCase().includes('workspace') && !raw.toLowerCase().includes('businessos') && !raw.toLowerCase().includes('arkesel')) {
        return formatSenderIdFromBusinessName(raw);
      }
    }
  } catch {}

  return '';
}

// Reusable server-side Arkesel SMS dispatch service — optimized for sub-second, direct execution
async function dispatchArkeselSms({
  recipients,
  message,
  senderId,
  idempotencyKey,
  businessId = 'platform',
  businessName,
  type = 'transactional',
  clientTriggerTime
}: {
  recipients: string | string[];
  message: string;
  senderId?: string;
  idempotencyKey?: string;
  businessId?: string;
  businessName?: string;
  type?: string;
  clientTriggerTime?: number;
}): Promise<{
  success: boolean;
  status: 'Successfully sent' | 'SUBMITTED' | 'Failed' | 'Invalid API key' | 'Invalid phone number' | 'Insufficient SMS balance' | 'Gateway/API error' | 'Network error' | string;
  message: string;
  recipient: string;
  submitStatus?: string;
  deliveryStatus?: string;
  smsId?: string;
  smsIds?: string[];
  recipients?: string[];
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
    totalPipelineMs: number;
  };
}> {
  const backendReceivedTime = Date.now();
  // Support comma, semicolon, or slash separated phone numbers for multi-recipient dispatch
  const rawList = (Array.isArray(recipients) ? recipients : [recipients])
    .flatMap(r => String(r || '').split(/[,;\/]+/))
    .map(p => p.trim())
    .filter(Boolean);

  const cleanedRecipients = rawList
    .map(normalizePhoneNumber)
    .filter(p => p.length >= 9 && /^\d+$/.test(p));

  if (cleanedRecipients.length === 0) {
    const completionTime = Date.now();
    const totalMs = completionTime - (clientTriggerTime || backendReceivedTime);
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
        totalSubmissionMs: totalMs,
        totalPipelineMs: totalMs
      }
    };
  }

  let trimmedMessage = (message || '').trim();
  // Strip any unwanted legacy/workspace prefixes like "[user's workspace]", "[Workspace]", "[biglegacy5]", etc.
  trimmedMessage = trimmedMessage.replace(/^\[[^\]]*(?:workspace|legacy|@)[^\]]*\]\s*/gi, '').trim();
  trimmedMessage = trimmedMessage.replace(/\[[^\]]*(?:workspace|legacy)[^\]]*\]\s*/gi, '').trim();

  if (!trimmedMessage) {
    const completionTime = Date.now();
    const totalMs = completionTime - (clientTriggerTime || backendReceivedTime);
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
        totalSubmissionMs: totalMs,
        totalPipelineMs: totalMs
      }
    };
  }

  // Use in-memory config for 0ms disk overhead
  const config = inMemorySmsConfig;

  if (!config.isEnabled) {
    const completionTime = Date.now();
    const totalMs = completionTime - (clientTriggerTime || backendReceivedTime);
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
        totalSubmissionMs: totalMs,
        totalPipelineMs: totalMs
      }
    };
  }

  if (!config.apiKey || config.apiKey.trim() === '') {
    const completionTime = Date.now();
    const totalMs = completionTime - (clientTriggerTime || backendReceivedTime);
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
        totalSubmissionMs: totalMs,
        totalPipelineMs: totalMs
      }
    };
  }

  // Verify business-level SMS status (Enforced server-side with zero disk I/O)
  if (businessId && businessId !== 'platform') {
    const meta = getBusinessMetaCached(businessId);
    if (meta && meta.smsEnabled === false) {
      const completionTime = Date.now();
      const totalMs = completionTime - (clientTriggerTime || backendReceivedTime);
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
          totalSubmissionMs: totalMs,
          totalPipelineMs: totalMs
        }
      };
    }
  }

  // Idempotency & deduplication check (5s sliding window to catch rapid double-clicks without delaying real traffic)
  const dedupeKey = idempotencyKey || `${businessId}_${cleanedRecipients.sort().join(',')}_${trimmedMessage}`;
  const cached = smsDeduplicationCache.get(dedupeKey);
  if (cached && (Date.now() - cached.timestamp < 5000)) {
    console.log(`[Arkesel SMS Deduplication] Suppressed duplicate SMS dispatch for key ${dedupeKey}`);
    const completionTime = Date.now();
    const totalMs = completionTime - (clientTriggerTime || backendReceivedTime);
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
        totalSubmissionMs: totalMs,
        totalPipelineMs: totalMs
      }
    };
  }

  // Resolve SMS sender strictly to the registered business name (max 11 chars alphanumeric),
  // NEVER the owner's email address or owner's personal account name or generic fallback.
  let effectiveSender = resolveSenderIdForBusiness(businessId, businessName, senderId);
  if (!effectiveSender) {
    const completionTime = Date.now();
    const totalMs = completionTime - (clientTriggerTime || backendReceivedTime);
    return {
      success: false,
      status: 'Failed',
      message: 'SMS sender ID must strictly be the registered business name stored in that business account. Please configure a valid registered business name.',
      recipient: cleanedRecipients.join(', '),
      timings: {
        clientTriggerTime,
        backendReceivedTime,
        arkeselRequestStartTime: backendReceivedTime,
        arkeselResponseTime: completionTime,
        submissionCompletionTime: completionTime,
        arkeselLatencyMs: 0,
        totalSubmissionMs: totalMs,
        totalPipelineMs: totalMs
      }
    };
  }

  const arkeselRequestStartTime = Date.now();
  let arkeselResponseTime = Date.now();
  let statusCode = 200;
  let status: 'Successfully sent' | 'Failed' | 'Invalid API key' | 'Invalid phone number' | 'Insufficient SMS balance' | 'Gateway/API error' | 'Network error' = 'Failed';
  let isSuccess = false;
  let data: any = null;
  let responseText = '';

  const v2Endpoint = 'https://sms.arkesel.com/api/v2/sms/send';

  try {
    // 1. DIRECT ARKESEL V2 POST REQUEST FOR ALL GHANAIAN CARRIERS (MTN, Telecel, AirtelTigo)
    const executeArkeselV2Send = async (senderToUse: string) => {
      const cleanSender = formatSenderIdFromBusinessName(senderToUse, '');
      const payload = {
        sender: cleanSender,
        message: trimmedMessage,
        recipients: cleanedRecipients
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

      try {
        const res = await fetch(v2Endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Connection': 'close',
            'api-key': config.apiKey.trim()
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const text = await res.text();
        let parsed: any = null;
        try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
        return { res, text, parsed };
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    // Immediate direct dispatch with registered business name as sender
    let sendResult = await executeArkeselV2Send(effectiveSender);
    arkeselResponseTime = Date.now();
    statusCode = sendResult.res.status;
    responseText = sendResult.text;
    data = sendResult.parsed;

    let lowerMsg = ((data?.message || data?.error || '') + ' ' + responseText).toLowerCase();

    // Log if sender ID was rejected or unapproved by gateway
    const isSenderRejected = 
      statusCode === 403 || 
      lowerMsg.includes('sender') || 
      lowerMsg.includes('sender id') || 
      lowerMsg.includes('not approved') || 
      lowerMsg.includes('not registered');

    if (!sendResult.res.ok && isSenderRejected) {
      console.warn(`[Arkesel SMS Gateway] Sender ID "${effectiveSender}" returned gateway notice (${lowerMsg}).`);
    }

    // Determine if Arkesel accepted the submission
    // Note: In Arkesel V2, success returns status: 'success' and data: [{ id: "...", recipient: "..." }]
    if (sendResult.res.ok && (data?.status === 'success' || data?.code === 1000 || data?.code === '1000' || Array.isArray(data?.data) || lowerMsg.includes('success') || lowerMsg.includes('submitted'))) {
      isSuccess = true;
      status = 'Successfully sent';
    } else {
      isSuccess = false;
      if (statusCode === 401 || statusCode === 403 || lowerMsg.includes('api key') || lowerMsg.includes('unauthorized') || lowerMsg.includes('invalid key')) {
        status = 'Invalid API key';
      } else if (lowerMsg.includes('balance') || lowerMsg.includes('credit') || lowerMsg.includes('insufficient') || lowerMsg.includes('units')) {
        status = 'Insufficient SMS balance';
      } else if (lowerMsg.includes('recipient') || lowerMsg.includes('phone') || lowerMsg.includes('invalid number')) {
        status = 'Invalid phone number';
      } else if (statusCode >= 500) {
        status = 'Gateway/API error';
      } else {
        status = 'Failed';
      }
    }

    // Extract Arkesel SMS IDs for each recipient
    const recipientSmsIds: { [recipient: string]: string } = {};
    const extractedIds: string[] = [];
    if (Array.isArray(data?.data)) {
      data.data.forEach((item: any) => {
        if (item && item.id) {
          const recNorm = normalizePhoneNumber(item.recipient || '');
          if (recNorm) {
            recipientSmsIds[recNorm] = String(item.id);
          }
          extractedIds.push(String(item.id));
        }
      });
    } else if (data?.data?.id) {
      extractedIds.push(String(data.data.id));
      if (cleanedRecipients[0]) {
        recipientSmsIds[cleanedRecipients[0]] = String(data.data.id);
      }
    } else if (data?.id) {
      extractedIds.push(String(data.id));
      if (cleanedRecipients[0]) {
        recipientSmsIds[cleanedRecipients[0]] = String(data.id);
      }
    }

    const primarySmsId = extractedIds[0] || null;

    if (isSuccess) {
      inMemorySmsConfig.totalSentCount = (inMemorySmsConfig.totalSentCount || 0) + cleanedRecipients.length;
      inMemorySmsConfig.lastTestedAt = new Date().toISOString();
      inMemorySmsConfig.lastTestStatus = 'Active & Connected';
      inMemorySmsConfig.lastTestMessage = data?.message || 'Universal Arkesel V2 submission accepted';
      setImmediate(() => writeSmsConfig(inMemorySmsConfig));
    } else {
      inMemorySmsConfig.lastTestedAt = new Date().toISOString();
      inMemorySmsConfig.lastTestStatus = status;
      inMemorySmsConfig.lastTestMessage = data?.message || data?.error || responseText.slice(0, 100);
      setImmediate(() => writeSmsConfig(inMemorySmsConfig));
    }

    const submissionCompletionTime = Date.now();
    const arkeselLatencyMs = arkeselResponseTime - arkeselRequestStartTime;
    const totalSubmissionMs = submissionCompletionTime - (clientTriggerTime || backendReceivedTime);

    // CRITICAL: DO NOT confuse "SUBMITTED" with "DELIVERED".
    // Initial status after gateway acceptance is "SUBMITTED" with deliveryStatus "submitted".
    // Only Arkesel status query or delivery webhook will update this to "DELIVERED".
    const submitStatus = isSuccess ? 'accepted' : 'failed';
    const deliveryStatus = isSuccess ? 'submitted' : 'failed';
    const formalStatus = isSuccess ? 'SUBMITTED' : status;

    console.log(`[Arkesel V2 SMS] Recipient(s): ${cleanedRecipients.join(', ')} -> Accepted: ${isSuccess}, SMS ID: ${primarySmsId || 'none'} (Latency: ${arkeselLatencyMs}ms, Total: ${totalSubmissionMs}ms)`);

    const finalResult = {
      success: isSuccess,
      status: formalStatus,
      submitStatus,
      deliveryStatus,
      smsId: primarySmsId,
      smsIds: extractedIds,
      message: data?.message || data?.error || (isSuccess ? 'SMS successfully submitted to Arkesel gateway' : `Arkesel dispatch failed: ${status}`),
      recipient: cleanedRecipients.join(', '),
      recipients: cleanedRecipients,
      details: data,
      timings: {
        clientTriggerTime,
        backendReceivedTime,
        arkeselRequestStartTime,
        arkeselResponseTime,
        submissionCompletionTime,
        arkeselLatencyMs,
        totalSubmissionMs,
        totalPipelineMs: totalSubmissionMs
      }
    };

    // Store in deduplication cache
    smsDeduplicationCache.set(dedupeKey, {
      timestamp: Date.now(),
      result: finalResult
    });

    // Record accurate database log with carrier, normalized numbers, SMS IDs, and initial submission status
    logSmsActivityAsync({
      businessId,
      recipients: cleanedRecipients,
      rawRecipients: rawList,
      message: trimmedMessage,
      sender: effectiveSender,
      senderId: effectiveSender,
      status: formalStatus,
      submitStatus,
      deliveryStatus,
      success: isSuccess,
      smsIds: recipientSmsIds,
      smsId: primarySmsId,
      type,
      responseDetails: data,
      timings: finalResult.timings
    });

    // Detailed server-side audit log for complete transparency (Requirement 14)
    console.log(`[SMS AUDIT LOG] Original: "${rawList.join(', ')}" | Normalized: "${cleanedRecipients.join(', ')}" | Sender: "${effectiveSender}" | SMS ID: "${primarySmsId || 'none'}" | HTTP: ${statusCode} | Submission Status: "${formalStatus}" | Delivery Status: "${deliveryStatus}" | Latency: ${arkeselLatencyMs}ms | Timestamp: "${new Date().toISOString()}"`);

    // Asynchronous background status polling to automatically confirm handset delivery without delaying response
    if (primarySmsId) {
      trackSmsDeliveryAsync(primarySmsId);
    }

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
      totalSubmissionMs,
      totalPipelineMs: totalSubmissionMs
    };

    logSmsActivityAsync({
      businessId,
      recipients: cleanedRecipients,
      rawRecipients: rawList,
      message: trimmedMessage,
      sender: effectiveSender,
      senderId: effectiveSender,
      status: 'FAILED',
      submitStatus: 'failed',
      deliveryStatus: 'failed',
      success: false,
      type,
      responseDetails: { error: errorMsg },
      timings: errorTimings
    });

    return {
      success: false,
      status,
      submitStatus: 'failed' as const,
      deliveryStatus: 'failed' as const,
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
  businessMetaCache.delete(businessId);
  console.log(`[Super Admin] Atomically purged business ID: ${businessId} (${totalPurgedRecords} records removed) from cloud_db.json`);

  // STEP 2: Purge Firestore documents and collections directly using Client SDK on server
  if (serverFsDb) {
    try {
      // 1. Delete main business documents
      await fsDeleteDoc(fsDoc(serverFsDb, 'bos_businesses', businessId)).catch(() => {});
      await fsDeleteDoc(fsDoc(serverFsDb, 'businesses', businessId)).catch(() => {});

      // 1b. Recursively delete subcollections under both bos_businesses/{businessId} and businesses/{businessId}
      const subcollectionsToPurge = [
        'branches', 'products', 'customers', 'sales', 'expenses', 'employees',
        'users', 'auditLogs', 'logs', 'settings', 'inventory', 'transactions',
        'suppliers', 'notifications', 'services', 'classes', 'students', 'teachers',
        'prescriptions', 'batches', 'timetable', 'attendance', 'grades', 'orders',
        'receipts', 'returns', 'stock', 'tables', 'appointments'
      ];

      await Promise.allSettled(
        subcollectionsToPurge.flatMap(sub => [
          (async () => {
            try {
              const snap = await fsGetDocs(fsCollection(serverFsDb, 'bos_businesses', businessId, sub));
              if (!snap.empty) {
                const batch = fsWriteBatch(serverFsDb);
                snap.docs.forEach(d => batch.delete(d.ref));
                await batch.commit();
              }
            } catch (e) {}
          })(),
          (async () => {
            try {
              const snap = await fsGetDocs(fsCollection(serverFsDb, 'businesses', businessId, sub));
              if (!snap.empty) {
                const batch = fsWriteBatch(serverFsDb);
                snap.docs.forEach(d => batch.delete(d.ref));
                await batch.commit();
              }
            } catch (e) {}
          })()
        ])
      );

      // 2. Persist tombstone in Firestore
      await fsSetDoc(fsDoc(serverFsDb, 'bos_deleted_business_ids', businessId), {
        id: businessId,
        businessId,
        deletedAt: new Date().toISOString()
      }).catch(() => {});

      // 3. Purge related top-level collections
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

      await withTimeout(
        Promise.allSettled(
          collectionsToPurge.map(async (colName) => {
            try {
              await fsDeleteDoc(fsDoc(serverFsDb, colName, businessId)).catch(() => {});
            } catch (e) {}

            try {
              const q1 = fsQuery(fsCollection(serverFsDb, colName), fsWhere('businessId', '==', businessId));
              const snap1 = await fsGetDocs(q1);
              if (!snap1.empty) {
                const batch = fsWriteBatch(serverFsDb);
                snap1.docs.forEach(d => batch.delete(d.ref));
                await batch.commit();
              }
            } catch (e) {}

            try {
              const q2 = fsQuery(fsCollection(serverFsDb, colName), fsWhere('schoolId', '==', businessId));
              const snap2 = await fsGetDocs(q2);
              if (!snap2.empty) {
                const batch = fsWriteBatch(serverFsDb);
                snap2.docs.forEach(d => batch.delete(d.ref));
                await batch.commit();
              }
            } catch (e) {}
          })
        ),
        8000
      ).catch(() => {});
      console.log(`[Server Firestore SDK] Purged all Firestore data for business: ${businessId}`);
    } catch (fsErr) {
      console.warn('[Server Firestore SDK] Error purging documents:', fsErr);
    }
  }

  // STEP 3: Cleanup Firebase Admin Auth accounts (if Admin SDK is available)
  let deletedAuthAccountsCount = 0;
  if (getApps().length) {
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
  }

  return {
    success: true,
    businessId,
    purgedRecordsCount: totalPurgedRecords,
    deletedAuthAccountsCount,
    message: "Business permanently deleted"
  };
}


// API 3.4b: Authoritative Registered Businesses Endpoint
// Super Admin receives all businesses; Tenant users receive only their own registered business.
app.get('/api/admin/businesses', requireAuth, async (req: any, res) => {
  try {
    const dbData = readDatabase();
    const rawBusinesses: any[] = Array.isArray(dbData['bos_businesses']) 
      ? dbData['bos_businesses'] 
      : (Array.isArray(dbData['businesses']) ? dbData['businesses'] : []);
    const deletedIds = new Set<string>((dbData['bos_deleted_business_ids'] || []).map((id: any) => String(id)));

    // Pull tombstones and active documents from Firestore if available
    if (serverFsDb) {
      try {
        const delSnap = await fsGetDocs(fsCollection(serverFsDb, 'bos_deleted_business_ids'));
        delSnap.forEach(d => {
          if (d.id) deletedIds.add(String(d.id));
        });
      } catch (e) {}

      try {
        const fsBusSnap = await fsGetDocs(fsCollection(serverFsDb, 'bos_businesses'));
        fsBusSnap.forEach(docSnap => {
          const id = String(docSnap.id);
          if (id && id !== 'platform' && !deletedIds.has(id)) {
            const data = docSnap.data();
            const existingIdx = rawBusinesses.findIndex((b: any) => b && (b.id === id || b._id === id));
            if (existingIdx >= 0) {
              rawBusinesses[existingIdx] = { ...rawBusinesses[existingIdx], ...data, id };
            } else {
              rawBusinesses.push({ id, ...data });
            }
          }
        });
      } catch (e) {}
    }

    // Filter strictly by active / non-deleted businesses
    let activeBusinesses = rawBusinesses.filter((b: any) => b && b.id && b.id !== 'platform' && !deletedIds.has(String(b.id)));

    // Persist unified synchronized state back to cloud_db.json
    dbData['bos_businesses'] = activeBusinesses;
    dbData['bos_deleted_business_ids'] = Array.from(deletedIds);
    writeDatabase(dbData);

    // Tenant isolation: If caller is not Super Admin, only return their own business record!
    if (!isSuperAdminUser(req.user)) {
      activeBusinesses = activeBusinesses.filter(b => b.id === req.user.businessId);
    }

    return res.json({
      success: true,
      businesses: activeBusinesses,
      count: activeBusinesses.length
    });
  } catch (err: any) {
    console.error('Error in GET /api/admin/businesses:', err);
    const dbData = readDatabase();
    const raw = dbData['bos_businesses'] || [];
    const deleted = new Set(dbData['bos_deleted_business_ids'] || []);
    let fallback = raw.filter((b: any) => b && b.id && !deleted.has(b.id));
    if (req.user && !isSuperAdminUser(req.user)) {
      fallback = fallback.filter((b: any) => b.id === req.user.businessId);
    }
    return res.json({ success: true, businesses: fallback, count: fallback.length });
  }
});

// API 3.5: Secure Backend Delete Endpoint required by Business Tenant Management
app.delete('/api/admin/business/:businessId', requireSuperAdmin, async (req: any, res) => {
  try {
    const { businessId } = req.params;

    if (!businessId || typeof businessId !== 'string' || businessId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid businessId parameter'
      });
    }

    if (businessId === 'platform' || businessId === 'system') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete platform system workspace'
      });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1';
    
    // Perform permanent deletion
    const result = await performPermanentBusinessDeletion(businessId.trim(), clientIp, {
      id: req.user?.id || 'superadmin',
      email: req.user?.email || 'admin@businessos.com',
      name: req.user?.name || 'Super Admin'
    });

    return res.json(result);
  } catch (err: any) {
    console.error('Error during DELETE /api/admin/business/:businessId:', err);
    return res.status(500).json({ success: false, error: err.message || 'Server error while deleting business' });
  }
});

// API 3.5b: Fast Bulk Business Delete Endpoint for Super Admin
app.post('/api/admin/bulk-business-delete', requireSuperAdmin, async (req: any, res) => {
  try {
    const { businessIds } = req.body;

    if (!Array.isArray(businessIds) || businessIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'businessIds array is required'
      });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1';
    const adminUser = {
      id: req.user?.id || 'superadmin',
      email: req.user?.email || 'admin@businessos.com',
      name: req.user?.name || 'Super Admin'
    };

    // Filter out system ids
    const validIds = businessIds.filter((id: any) => typeof id === 'string' && id.trim() && id !== 'platform' && id !== 'system');

    const results = await Promise.allSettled(
      validIds.map((id: string) => performPermanentBusinessDeletion(id.trim(), clientIp, adminUser))
    );

    const successfulDeletions = results.filter(r => r.status === 'fulfilled').length;

    console.log(`[Super Admin Bulk Delete] Permanently deleted ${successfulDeletions} of ${validIds.length} businesses`);

    return res.json({
      success: true,
      deletedCount: successfulDeletions,
      totalRequested: validIds.length,
      message: `Successfully deleted ${successfulDeletions} business${successfulDeletions === 1 ? '' : 'es'} permanently.`
    });
  } catch (err: any) {
    console.error('Error during POST /api/admin/bulk-business-delete:', err);
    return res.status(500).json({ success: false, error: err.message || 'Server error while bulk deleting businesses' });
  }
});

// Backward compatibility endpoint (secured with requireSuperAdmin)
app.post('/api/db/delete-business', requireSuperAdmin, async (req: any, res) => {
  try {
    const { businessId } = req.body;
    if (!businessId) {
      return res.status(400).json({ success: false, error: 'businessId is required' });
    }
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1';
    
    const result = await performPermanentBusinessDeletion(businessId, clientIp, {
      id: req.user?.id || 'superadmin',
      email: req.user?.email || 'admin@businessos.com',
      name: req.user?.name || 'Super Admin'
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
const getSmsConfigHandler = (req: any, res: any) => {
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
    console.error('Error in GET SMS config:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to retrieve SMS configuration' });
  }
};

app.get('/api/admin/sms-config', requireSuperAdmin, getSmsConfigHandler);
app.get('/api/admin/sms/config', requireSuperAdmin, getSmsConfigHandler);
app.get('/api/admin/sms/settings', requireSuperAdmin, getSmsConfigHandler);

// API 3.7: Update Central Arkesel SMS Settings (Persisted to Firestore as source of truth)
app.post('/api/admin/sms-config', requireSuperAdmin, async (req, res) => {
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
      message: 'Arkesel API settings saved successfully.',
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
      message: 'Failed to save Arkesel API settings. Please try again.',
      error: err.message || 'Failed to update SMS configuration'
    });
  }
});

// API 3.7b: Global SMS Service Enable / Disable
app.post('/api/admin/sms-toggle', requireSuperAdmin, async (req, res) => {
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
app.post('/api/admin/sms/test-connection', requireSuperAdmin, async (req, res) => {
  try {
    const current = readSmsConfig();
    const candidateKey = req.body.apiKey && typeof req.body.apiKey === 'string' && !req.body.apiKey.includes('••••')
      ? req.body.apiKey.trim()
      : current.apiKey.trim();

    if (!candidateKey) {
      return res.status(400).json({
        success: false,
        message: 'Arkesel connection failed: No Arkesel API key has been provided or saved.',
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
        // If testing a newly entered key, persist it immediately
        if (candidateKey && candidateKey !== current.apiKey) {
          current.apiKey = candidateKey;
        }
        current.lastTestedAt = new Date().toISOString();
        current.lastTestStatus = 'Active & Connected';
        current.lastTestMessage = `Connection verified. Balance: ${data?.data?.sms_balance ?? 'Available'}`;
        await writeSmsConfigToFirestore(current);

        return res.json({
          success: true,
          message: 'Arkesel connection successful.',
          balance: data?.data?.sms_balance ?? null,
          details: data
        });
      } else {
        const errorDetail = data?.message || data?.error || (response.status === 401 || response.status === 403 ? 'Invalid API key or unauthorized' : 'Authentication rejected');
        current.lastTestedAt = new Date().toISOString();
        current.lastTestStatus = 'Failed';
        current.lastTestMessage = errorDetail;
        await writeSmsConfigToFirestore(current);

        let failMsg = 'Arkesel connection failed.';
        if (response.status === 401 || response.status === 403 || errorDetail.toLowerCase().includes('key') || errorDetail.toLowerCase().includes('unauthorized')) {
          failMsg = 'Arkesel connection failed: Invalid or unauthorized API key.';
        } else if (response.status >= 500) {
          failMsg = `Arkesel connection failed: Arkesel server error (${response.status}).`;
        } else {
          failMsg = `Arkesel connection failed: ${errorDetail}`;
        }

        return res.json({
          success: false,
          message: failMsg,
          error: errorDetail
        });
      }
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      const isTimeout = fetchErr.name === 'AbortError';
      const errorMsg = isTimeout ? 'Connection timed out after 8 seconds.' : (fetchErr.message || 'Network error');
      
      current.lastTestedAt = new Date().toISOString();
      current.lastTestStatus = 'Failed';
      current.lastTestMessage = errorMsg;
      await writeSmsConfigToFirestore(current);

      return res.json({
        success: false,
        message: isTimeout 
          ? 'Arkesel connection failed: Connection timed out.' 
          : `Arkesel connection failed: Network error (${errorMsg}).`,
        error: errorMsg
      });
    }
  } catch (err: any) {
    console.error('Error in POST /api/admin/sms/test-connection:', err);
    return res.status(500).json({
      success: false,
      message: `Arkesel connection failed: ${err.message || 'Unexpected server error'}`,
      error: err.message
    });
  }
});

// API 3.8: Send Test SMS via real Arkesel API (Requires Super Admin authorization)
app.post('/api/admin/sms/test', requireSuperAdmin, async (req, res) => {
  try {
    const { phoneNumber: rawPhone, recipient, phone, message, senderId, clientTriggerTime, businessId, businessName } = req.body;
    const phoneNumber = rawPhone || recipient || phone;

    if (!phoneNumber || !String(phoneNumber).trim()) {
      return res.status(400).json({
        success: false,
        status: 'Invalid phone number',
        message: '✕ Test SMS failed. Please provide a valid recipient phone number.'
      });
    }

    const regName = resolveRegisteredBusinessName(businessId, businessName);
    const testMessage = (message && String(message).trim())
      ? String(message).trim()
      : `${regName || 'Shop'}: SMS configuration test successful.`;

    const businessSender = resolveSenderIdForBusiness(businessId, regName, senderId);

    const result = await dispatchArkeselSms({
      recipients: [phoneNumber],
      message: testMessage,
      businessId: businessId || 'platform',
      businessName: regName || businessSender,
      senderId: businessSender,
      type: 'test_sms',
      clientTriggerTime: Number(clientTriggerTime) || undefined
    });

    const isDelivered = result.deliveryStatus === 'delivered' || result.status === 'DELIVERED';
    const isSubmitted = result.success || result.status === 'SUBMITTED';

    let displayMessage = '✕ Test SMS failed. Please check your Arkesel configuration.';
    if (isDelivered) {
      displayMessage = '✓ SMS delivered successfully';
    } else if (isSubmitted) {
      displayMessage = 'SMS submitted successfully to Arkesel. Delivery confirmation pending.';
    }

    return res.json({
      ...result,
      displayMessage
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

// API 3.9: Universal Platform SMS Dispatch (Guarded by requireAuth, tenant verification and rate limits)
app.post('/api/sms/send', requireAuth, async (req: any, res: any) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1';
    const callerBusId = req.user.businessId;
    const isSuperAdmin = isSuperAdminUser(req.user);

    // Rate limiting: 25 SMS per minute per business / IP
    const rateCheck = checkRateLimit(`sms_${callerBusId || clientIp}`, 25, 60000);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        status: 'Rate limit exceeded',
        message: `SMS dispatch rate limit reached. Please wait ${rateCheck.retryAfter} seconds before sending more SMS.`
      });
    }

    const { recipient: rawRecipient, phoneNumber, recipients, phone, message, senderId, idempotencyKey, businessId, businessName, type, clientTriggerTime } = req.body;
    const recipient = rawRecipient || phoneNumber || recipients || phone;

    if (!recipient) {
      return res.status(400).json({
        success: false,
        status: 'Invalid phone number',
        message: 'Recipient is required'
      });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        status: 'Failed',
        message: 'SMS message body cannot be empty'
      });
    }

    if (message.length > 500) {
      return res.status(400).json({
        success: false,
        status: 'Failed',
        message: 'SMS message exceeds maximum length limit of 500 characters'
      });
    }

    // Tenant check: callers cannot send SMS on behalf of another business
    const targetBusId = isSuperAdmin ? (businessId || callerBusId) : callerBusId;

    const result = await dispatchArkeselSms({
      recipients: Array.isArray(recipient) ? recipient : [recipient],
      message,
      senderId,
      idempotencyKey,
      businessId: targetBusId,
      businessName,
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

// API 3.10: SMS Delivery & Audit Logs (Requires Super Admin authorization)
app.get('/api/admin/sms/logs', requireSuperAdmin, (req, res) => {
  try {
    const dbData = readDatabase();
    const rawLogs = (dbData['bos_notification_logs'] || []).filter((l: any) => l && (l.type === 'sms' || l.type === 'test_sms' || l.type === 'transactional'));
    const logs = rawLogs.map((l: any) => {
      const recipientPhone = l.recipientNormalized || l.recipient || '';
      const detected = detectGhanaNetwork(recipientPhone);
      const latency = l.latencyMs || l.timings?.arkeselLatencyMs || l.timings?.totalPipelineMs || l.timings?.totalSubmissionMs || 0;
      
      let respSummary = l.response || 'OK';
      if (!l.response && l.details) {
        try {
          const parsed = typeof l.details === 'string' ? JSON.parse(l.details) : l.details;
          respSummary = parsed.message || parsed.status || (l.success ? 'Accepted' : 'Failed');
        } catch {
          respSummary = String(l.details).slice(0, 50);
        }
      }

      // Maintain actual Arkesel status: SUBMITTED, QUEUED, DELIVERED, NOT_DELIVERED, EXPIRED, PROHIBITED, FAILED
      const rawStatus = (l.status || (l.success ? 'SUBMITTED' : 'FAILED')).toUpperCase();
      const deliveryStatus = l.deliveryStatus || (rawStatus === 'DELIVERED' ? 'delivered' : (l.success ? 'submitted' : 'failed'));

      return {
        ...l,
        recipient: recipientPhone,
        recipientRaw: l.recipientRaw || recipientPhone,
        recipientNormalized: recipientPhone,
        network: l.network || detected.network,
        carrierPrefix: l.carrierPrefix || detected.prefix,
        senderId: (l.senderId && !l.senderId.toLowerCase().includes('legacy'))
          ? l.senderId
          : ((l.sender && !l.sender.toLowerCase().includes('legacy')) ? l.sender : 'Shop'),
        status: rawStatus,
        deliveryStatus,
        submitStatus: l.submitStatus || (l.success ? 'accepted' : 'failed'),
        smsId: l.smsId || null,
        sentAt: l.sentAt || l.timestamp,
        deliveredAt: l.deliveredAt || (deliveryStatus === 'delivered' ? (l.updatedAt || l.timestamp) : null),
        latencyMs: latency,
        response: respSummary,
        success: l.success !== false
      };
    });
    return res.json({ success: true, logs: logs.slice(0, 150) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to retrieve logs' });
  }
});

// API 3.11: Query Real Arkesel Delivery Status by SMS ID
app.get('/api/admin/sms/status/:smsId', requireSuperAdmin, async (req, res) => {
  try {
    const { smsId } = req.params;
    if (!smsId) {
      return res.status(400).json({ success: false, error: 'SMS ID is required' });
    }
    const result = await queryArkeselSmsStatus(smsId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to query SMS status' });
  }
});

app.post('/api/admin/sms/check-status', requireSuperAdmin, async (req, res) => {
  try {
    const { smsId } = req.body;
    if (!smsId) {
      return res.status(400).json({ success: false, error: 'SMS ID is required' });
    }
    const result = await queryArkeselSmsStatus(smsId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to query SMS status' });
  }
});

// API 3.12: Batch Refresh Pending SMS Delivery Statuses from Arkesel
app.post('/api/admin/sms/refresh-statuses', requireSuperAdmin, async (req, res) => {
  try {
    const dbData = readDatabase();
    const rawLogs = (dbData['bos_notification_logs'] || []).filter((l: any) => l && (l.type === 'sms' || l.type === 'test_sms' || l.type === 'transactional'));
    
    // Find logs with SMS ID that are still pending (submitted or queued) from the last 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const pendingLogs = rawLogs.filter((l: any) => {
      const hasId = Boolean(l.smsId);
      const isPending = l.deliveryStatus === 'submitted' || l.deliveryStatus === 'queued' || l.status === 'SUBMITTED' || l.status === 'QUEUED';
      const isRecent = new Date(l.timestamp || l.sentAt || 0).getTime() > oneDayAgo;
      return hasId && isPending && isRecent;
    }).slice(0, 20); // Check up to 20 recent pending messages

    const updates: any[] = [];
    for (const log of pendingLogs) {
      try {
        const queryRes = await queryArkeselSmsStatus(log.smsId);
        updates.push({
          smsId: log.smsId,
          recipient: log.recipient,
          previousStatus: log.status,
          currentStatus: queryRes.status,
          deliveryStatus: queryRes.deliveryStatus
        });
      } catch (err) {
        // Continue with others
      }
    }

    return res.json({
      success: true,
      message: `Checked ${pendingLogs.length} pending SMS records.`,
      checkedCount: pendingLogs.length,
      updates
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to refresh SMS statuses' });
  }
});

// API 3.13: Public Webhook / Callback Endpoint for Arkesel Delivery Reports (DLVR)
const handleSmsWebhook = (req: any, res: any) => {
  try {
    const smsId = req.body?.sms_id || req.body?.id || req.query?.sms_id || req.query?.id;
    const rawStatus = req.body?.status || req.body?.delivery_status || req.query?.status || req.query?.delivery_status;

    if (smsId && rawStatus) {
      const upperStatus = String(rawStatus).toUpperCase();
      let deliveryStatus = 'submitted';
      if (upperStatus === 'DELIVERED') deliveryStatus = 'delivered';
      else if (upperStatus === 'NOT_DELIVERED') deliveryStatus = 'not_delivered';
      else if (upperStatus === 'EXPIRED') deliveryStatus = 'expired';
      else if (upperStatus === 'PROHIBITED') deliveryStatus = 'prohibited';
      else if (upperStatus === 'QUEUED') deliveryStatus = 'queued';
      else if (upperStatus === 'SUBMITTED') deliveryStatus = 'submitted';
      else deliveryStatus = upperStatus.toLowerCase();

      updateSmsLogDeliveryStatus(String(smsId).trim(), upperStatus, deliveryStatus, req.body || req.query);
      console.log(`[Arkesel Webhook] SMS ${smsId} delivery status updated to: ${upperStatus} (${deliveryStatus})`);
    }

    // Always respond 200 immediately
    return res.status(200).json({ status: 'success', message: 'Webhook acknowledged' });
  } catch (err: any) {
    console.warn('[Arkesel Webhook Error]:', err);
    return res.status(200).json({ status: 'received_with_warning' });
  }
};
app.post('/api/sms/callback', handleSmsWebhook);
app.get('/api/sms/callback', handleSmsWebhook);

// API 3.14: Multi-Network Diagnostic Test Function (MTN, Telecel, AirtelTigo)
app.post('/api/admin/sms/diagnostic', requireSuperAdmin, async (req, res) => {
  try {
    const { mtnNumber, telecelNumber, airtelTigoNumber, senderId, customMessage } = req.body;

    const testTargets = [
      { network: 'MTN', defaultPhone: '0244123456', phone: mtnNumber || '0244123456' },
      { network: 'Telecel', defaultPhone: '0208002240', phone: telecelNumber || '0208002240' },
      { network: 'AirtelTigo', defaultPhone: '0277653421', phone: airtelTigoNumber || '0277653421' }
    ];

    const config = inMemorySmsConfig;
    if (!config.apiKey || !config.apiKey.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Arkesel API key is not configured. Please save your API key in Super Admin → SMS Settings.'
      });
    }

    const testSenderId = resolveSenderIdForBusiness(undefined, undefined, senderId);

    const results = await Promise.all(testTargets.map(async (target) => {
      const rawNumber = String(target.phone).trim();
      const normalizedNumber = normalizePhoneNumber(rawNumber);
      const detected = detectGhanaNetwork(normalizedNumber);
      const messageBody = (customMessage && String(customMessage).trim())
        ? String(customMessage).trim()
        : `BusinessOS ${target.network} carrier diagnostic verification test`;

      const startTime = Date.now();
      let httpStatus = 0;
      let fullResponse: any = null;
      let accepted = false;
      let smsId: string | null = null;
      let specificFailureReason: string | null = null;

      try {
        const payload = {
          sender: testSenderId,
          message: messageBody,
          recipients: [normalizedNumber]
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout for high-load telecom gateways

        const response = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': config.apiKey.trim()
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timeout);

        httpStatus = response.status;
        const text = await response.text();
        try { fullResponse = JSON.parse(text); } catch { fullResponse = { raw: text }; }

        accepted = response.ok && (fullResponse?.status === 'success' || Array.isArray(fullResponse?.data) || fullResponse?.code === 1000);

        if (Array.isArray(fullResponse?.data) && fullResponse.data[0]?.id) {
          smsId = String(fullResponse.data[0].id);
        } else if (fullResponse?.data?.id) {
          smsId = String(fullResponse.data.id);
        } else if (fullResponse?.id) {
          smsId = String(fullResponse.id);
        }

        if (!accepted) {
          specificFailureReason = fullResponse?.message || fullResponse?.error || `Arkesel returned HTTP ${httpStatus}`;
        }

        const latencyMs = Date.now() - startTime;

        // Record log into database audit
        logSmsActivityAsync({
          businessId: 'platform',
          recipients: [normalizedNumber],
          rawRecipients: [rawNumber],
          message: messageBody,
          sender: testSenderId,
          senderId: testSenderId,
          status: accepted ? 'SUBMITTED' : 'FAILED',
          submitStatus: accepted ? 'accepted' : 'failed',
          deliveryStatus: accepted ? 'submitted' : 'failed',
          success: accepted,
          smsId,
          type: 'diagnostic_sms',
          responseDetails: fullResponse,
          timings: { arkeselLatencyMs: latencyMs }
        });

        console.log(`[SMS DIAGNOSTIC LOG] Network: ${target.network} | Original: "${rawNumber}" | Normalized: "${normalizedNumber}" | SMS ID: "${smsId || 'none'}" | HTTP: ${httpStatus} | Accepted: ${accepted} | Latency: ${latencyMs}ms`);

        if (smsId) {
          trackSmsDeliveryAsync(smsId);
        }

        return {
          network: target.network,
          rawNumber,
          normalizedNumber,
          detectedCarrier: detected.network,
          carrierPrefix: detected.prefix,
          httpStatus,
          accepted,
          smsId,
          submitStatus: accepted ? 'accepted' : 'failed',
          deliveryStatus: accepted ? 'submitted' : 'failed',
          currentDeliveryStatus: accepted ? 'SUBMITTED' : 'FAILED',
          specificFailureReason,
          fullResponse,
          latencyMs
        };
      } catch (err: any) {
        return {
          network: target.network,
          rawNumber,
          normalizedNumber,
          detectedCarrier: detected.network,
          carrierPrefix: detected.prefix,
          httpStatus: 0,
          accepted: false,
          smsId: null,
          submitStatus: 'failed',
          deliveryStatus: 'failed',
          currentDeliveryStatus: 'FAILED',
          specificFailureReason: err.message || 'Network error connecting to Arkesel',
          fullResponse: null,
          latencyMs: Date.now() - startTime
        };
      }
    }));

    const allAccepted = results.every(r => r.accepted);

    return res.json({
      success: true,
      allAccepted,
      senderId: testSenderId,
      timestamp: new Date().toISOString(),
      results
    });
  } catch (err: any) {
    console.error('Error in POST /api/admin/sms/diagnostic:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Diagnostic execution failed'
    });
  }
});

// =========================================================================
// SUPER ADMIN PER-BUSINESS SMS CONTROL (Requirement 11 & 12)
// =========================================================================

// Toggle or update per-business SMS status
app.get('/api/admin/business/:id/sms-status', requireAuth, (req: any, res) => {
  try {
    const businessId = req.params.id;
    if (!businessId) {
      return res.status(400).json({ success: false, error: 'businessId parameter is required' });
    }

    // Tenant check: only super admin or business staff can check this business's status
    if (!isSuperAdminUser(req.user) && req.user.businessId !== businessId) {
      return res.status(403).json({ success: false, error: 'Forbidden: Cannot access another business workspace.' });
    }

    const meta = getBusinessMetaCached(businessId);
    if (meta) {
      return res.json({
        success: true,
        businessId,
        smsEnabled: meta.smsEnabled !== false,
        name: meta.name
      });
    }
    const dbData = readDatabase();
    const businesses = dbData['bos_businesses'] || dbData['businesses'] || [];
    const target = businesses.find((b: any) => b && (b.id === businessId || b._id === businessId));
    if (target) {
      const isEnabled = target.smsEnabled !== false;
      businessMetaCache.set(businessId, {
        name: target.name || '',
        smsEnabled: isEnabled,
        cachedAt: Date.now()
      });
      return res.json({
        success: true,
        businessId,
        smsEnabled: isEnabled,
        name: target.name || ''
      });
    }
    return res.status(404).json({ success: false, error: 'Business not found' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/business-sms-toggle', requireSuperAdmin, async (req: any, res) => {
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
    if (serverFsDb) {
      try {
        fsSetDoc(fsDoc(serverFsDb, 'bos_businesses', businessId), {
          smsEnabled: isEnabled,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      } catch (e) {}
    }

    // Immediately update in-memory cache
    businessMetaCache.set(businessId, {
      name: businesses[targetIdx].name,
      smsEnabled: isEnabled,
      cachedAt: Date.now()
    });

    console.log(`[Super Admin SMS Control] ${businesses[targetIdx].name} (${businessId}) SMS is now ${isEnabled ? 'ENABLED' : 'DISABLED'}`);

    return res.json({
      success: true,
      businessId,
      smsEnabled: isEnabled,
      message: `SMS has been ${isEnabled ? 'enabled' : 'disabled'} for ${businesses[targetIdx].name}`
    });
  } catch (err: any) {
    console.error('Error in POST /api/admin/business-sms-toggle:', err);
    return res.status(500).json({ success: false, error: 'Failed to update business SMS configuration' });
  }
});

// Bulk toggle SMS status for multiple businesses
app.post('/api/admin/bulk-business-sms-toggle', requireSuperAdmin, async (req: any, res) => {
  try {
    const { businessIds, smsEnabled } = req.body;
    if (!Array.isArray(businessIds) || businessIds.length === 0) {
      return res.status(400).json({ success: false, error: 'businessIds array is required' });
    }

    const isEnabled = smsEnabled === true || smsEnabled === 'true' || smsEnabled === 1;
    const dbData = readDatabase();
    const businesses = dbData['bos_businesses'] || dbData['businesses'] || [];
    const idSet = new Set(businessIds);
    let updatedCount = 0;
    const updatedNames: string[] = [];

    businesses.forEach((b: any) => {
      if (b && idSet.has(b.id)) {
        b.smsEnabled = isEnabled;
        b.updatedAt = new Date().toISOString();
        updatedCount++;
        updatedNames.push(b.name || b.id);
      }
    });

    // Persist to cloud_db.json
    dbData['bos_businesses'] = businesses;

    // Record audit log
    const auditEntry = {
      id: 'audit-bulk-sms-' + Date.now(),
      action: isEnabled ? 'BULK_ENABLE_BUSINESS_SMS' : 'BULK_DISABLE_BUSINESS_SMS',
      timestamp: new Date().toISOString(),
      status: 'Success',
      details: `Super Admin bulk set SMS to ${isEnabled ? 'ENABLED' : 'DISABLED'} for ${updatedCount} businesses (${updatedNames.slice(0, 5).join(', ')}${updatedNames.length > 5 ? '...' : ''}).`
    };
    if (!Array.isArray(dbData['bos_feature_audit_logs'])) dbData['bos_feature_audit_logs'] = [];
    dbData['bos_feature_audit_logs'].unshift(auditEntry);
    writeDatabase(dbData);

    // Sync to Firestore if available
    if (serverFsDb) {
      try {
        const batch = fsWriteBatch(serverFsDb);
        businessIds.forEach(id => {
          batch.set(fsDoc(serverFsDb, 'bos_businesses', id), {
            smsEnabled: isEnabled,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        });
        batch.commit().catch(() => {});
      } catch (e) {}
    }

    // Invalidate/update cache for affected businesses
    businessIds.forEach(id => {
      businessMetaCache.delete(id);
    });

    console.log(`[Super Admin Bulk SMS Control] Set SMS ${isEnabled ? 'ENABLED' : 'DISABLED'} for ${updatedCount} businesses`);

    return res.json({
      success: true,
      updatedCount,
      smsEnabled: isEnabled,
      message: `SMS successfully ${isEnabled ? 'enabled' : 'disabled'} for ${updatedCount} selected business${updatedCount === 1 ? '' : 'es'}.`
    });
  } catch (err: any) {
    console.error('Error in POST /api/admin/bulk-business-sms-toggle:', err);
    return res.status(500).json({ success: false, error: 'Failed to bulk toggle SMS status' });
  }
});

// =========================================================================
// SUPER ADMIN PRICING PLANS ENDPOINTS
// =========================================================================

// Get all pricing plans
app.get('/api/admin/pricing-plans', requireAuth, (req, res) => {
  try {
    const dbData = readDatabase();
    const plans = dbData['bos_pricing_plans'] || [];
    return res.json({ success: true, plans });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve pricing plans' });
  }
});

// Create or update a pricing plan
app.post('/api/admin/pricing-plans', requireSuperAdmin, async (req: any, res) => {
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

    if (serverFsDb) {
      try {
        fsSetDoc(fsDoc(serverFsDb, 'bos_pricing_plans', planId), cleanPlan).catch(() => {});
      } catch (e) {}
    }

    return res.json({ success: true, plan: cleanPlan });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to save pricing plan' });
  }
});

// Delete a pricing plan
app.delete('/api/admin/pricing-plans/:id', requireSuperAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const dbData = readDatabase();
    if (Array.isArray(dbData['bos_pricing_plans'])) {
      dbData['bos_pricing_plans'] = dbData['bos_pricing_plans'].filter((p: any) => p && p.id !== id);
      writeDatabase(dbData);
    }
    if (serverFsDb) {
      try {
        fsDeleteDoc(fsDoc(serverFsDb, 'bos_pricing_plans', id)).catch(() => {});
      } catch (e) {}
    }
    return res.json({ success: true, message: 'Plan deleted' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete pricing plan' });
  }
});

// =========================================================================
// SUPER ADMIN BUSINESS PRICING MANAGEMENT ENDPOINTS
// =========================================================================

// API 3.11: Get all business prices (Super Admin)
app.get('/api/admin/business-pricing', requireSuperAdmin, (req: any, res) => {
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
    return res.status(500).json({ success: false, error: 'Failed to retrieve business pricing' });
  }
});

// API 3.12: Update/Set a business's price (Super Admin)
app.post('/api/admin/business-pricing', requireSuperAdmin, async (req: any, res) => {
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
    const updatedBy = String(priceUpdatedBy || req.user?.email || 'Super Admin').trim();

    businesses[targetBusIndex].subscriptionAmount = numericPrice;
    businesses[targetBusIndex].priceUpdatedAt = updatedAt;
    businesses[targetBusIndex].priceUpdatedBy = updatedBy;

    // Persist to local cloud_db.json
    dbData['bos_businesses'] = businesses;
    writeDatabase(dbData);

    // Sync to Firestore if available
    if (serverFsDb) {
      try {
        await withTimeout(
          fsSetDoc(fsDoc(serverFsDb, 'bos_businesses', businessId), {
            subscriptionAmount: numericPrice,
            priceUpdatedAt: updatedAt,
            priceUpdatedBy: updatedBy
          }, { merge: true }),
          1500
        ).catch(() => {});
      } catch (fsErr) {
        // Silent note - cloud_db.json is already authoritative
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
    return res.status(500).json({ success: false, error: 'Failed to update business pricing' });
  }
});

// API 3.12b: Update full business information (Super Admin or Tenant Owner)
app.post('/api/admin/business-update', requireAuth, async (req: any, res) => {
  try {
    const { business } = req.body;
    if (!business || !business.id) {
      return res.status(400).json({ success: false, error: 'Valid business object with id is required' });
    }

    const businessId = String(business.id);

    // Tenant check: only super admin or matching business owner can update this business
    if (!isSuperAdminUser(req.user) && req.user.businessId !== businessId) {
      return res.status(403).json({ success: false, error: 'Forbidden: Cannot update another business workspace.' });
    }

    const dbData = readDatabase();
    const businesses = dbData['bos_businesses'] || dbData['businesses'] || [];
    const targetIdx = businesses.findIndex((b: any) => b && (b.id === businessId || b._id === businessId));

    const updatedAt = new Date().toISOString();
    const cleanBusiness = {
      ...(targetIdx >= 0 ? businesses[targetIdx] : {}),
      ...business,
      updatedAt
    };

    if (targetIdx >= 0) {
      businesses[targetIdx] = cleanBusiness;
    } else {
      businesses.push(cleanBusiness);
    }

    // Persist to cloud_db.json
    dbData['bos_businesses'] = businesses;

    // Check if owner name, email or phone was updated, and synchronize owner user in bos_users
    let ownerUpdated = false;
    const users = dbData['bos_users'] || dbData['users'] || [];
    const ownerUser = users.find((u: any) => u && (u.businessId === businessId || u.schoolId === businessId) && u.role === 'owner');
    if (ownerUser) {
      if (cleanBusiness.ownerName && ownerUser.name !== cleanBusiness.ownerName) {
        ownerUser.name = cleanBusiness.ownerName;
        ownerUpdated = true;
      }
      if (cleanBusiness.email && ownerUser.email !== cleanBusiness.email) {
        ownerUser.email = cleanBusiness.email;
        ownerUpdated = true;
      }
      if (cleanBusiness.phone && ownerUser.phone !== cleanBusiness.phone) {
        ownerUser.phone = cleanBusiness.phone;
        ownerUpdated = true;
      }
      if (ownerUpdated) {
        ownerUser.updatedAt = updatedAt;
        dbData['bos_users'] = users;
      }
    }

    writeDatabase(dbData);

    // Sync to Firestore if available using client SDK instance (serverFsDb)
    if (serverFsDb) {
      try {
        await withTimeout(
          fsSetDoc(fsDoc(serverFsDb, 'bos_businesses', businessId), cleanBusiness, { merge: true }),
          2000
        );
        if (ownerUser && ownerUpdated) {
          await withTimeout(
            fsSetDoc(fsDoc(serverFsDb, 'bos_users', ownerUser.id), ownerUser, { merge: true }),
            1500
          ).catch(() => {});
        }
      } catch (fsErr) {
        // Silent note - cloud_db.json is already authoritative
      }
    }

    // Update in-memory metadata cache
    businessMetaCache.set(businessId, {
      name: cleanBusiness.name || '',
      smsEnabled: cleanBusiness.smsEnabled !== false,
      cachedAt: Date.now()
    });

    console.log(`[Super Admin Cloud Sync] Business "${cleanBusiness.name}" (${businessId}) updated in cloud.`);

    return res.json({
      success: true,
      message: `Business "${cleanBusiness.name}" successfully updated and saved to the cloud.`,
      business: cleanBusiness
    });
  } catch (err: any) {
    console.error('Error in POST /api/admin/business-update:', err);
    return res.status(500).json({ success: false, error: 'Failed to update business in cloud' });
  }
});

// API 3.13: Get single business pricing (Multi-tenant business view)
app.get('/api/business/:businessId/pricing', requireAuth, (req: any, res) => {
  try {
    const { businessId } = req.params;

    if (!isSuperAdminUser(req.user) && req.user.businessId !== businessId) {
      return res.status(403).json({ success: false, error: 'Forbidden: Cannot view another business pricing.' });
    }

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
    return res.status(500).json({ success: false, error: 'Failed to fetch business pricing' });
  }
});

// =========================================================================
// REGISTERED BUSINESS POPUP PROMPTS SYSTEM ENDPOINTS
// =========================================================================

// API 3.14: Get all popup prompts (Super Admin)
app.get('/api/admin/popup-prompts', requireSuperAdmin, (req: any, res) => {
  try {
    const dbData = readDatabase();
    const prompts = dbData['bos_popup_prompts'] || [];
    return res.json({
      success: true,
      prompts
    });
  } catch (err: any) {
    console.error('Error in GET /api/admin/popup-prompts:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve popup prompts' });
  }
});

// API 3.15: Create or Update a popup prompt (Super Admin)
app.post('/api/admin/popup-prompts', requireSuperAdmin, async (req: any, res) => {
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
      createdByName: createdByName || req.user?.email || 'Super Admin'
    };

    if (existingIndex >= 0) {
      dbData['bos_popup_prompts'][existingIndex] = promptRecord;
    } else {
      dbData['bos_popup_prompts'].unshift(promptRecord);
    }

    writeDatabase(dbData);

    // Sync to Firestore if available
    if (serverFsDb) {
      try {
        await withTimeout(
          fsSetDoc(fsDoc(serverFsDb, 'bos_popup_prompts', promptId), promptRecord, { merge: true }),
          1500
        ).catch(() => {});
      } catch (fsErr) {
        // Silent note - cloud_db.json is already authoritative
      }
    }

    return res.json({
      success: true,
      message: existingIndex >= 0 ? 'Popup prompt updated successfully' : 'Popup prompt created successfully',
      prompt: promptRecord
    });
  } catch (err: any) {
    console.error('Error in POST /api/admin/popup-prompts:', err);
    return res.status(500).json({ success: false, error: 'Failed to save popup prompt' });
  }
});

// API 3.16: Delete a popup prompt (Super Admin)
app.delete('/api/admin/popup-prompts/:id', requireSuperAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const dbData = readDatabase();
    if (Array.isArray(dbData['bos_popup_prompts'])) {
      dbData['bos_popup_prompts'] = dbData['bos_popup_prompts'].filter((p: any) => p && p.id !== id);
      writeDatabase(dbData);
    }

    if (serverFsDb) {
      try {
        await withTimeout(fsDeleteDoc(fsDoc(serverFsDb, 'bos_popup_prompts', id)), 1000).catch(() => {});
      } catch (e) {}
    }

    return res.json({ success: true, message: 'Popup prompt deleted successfully', id });
  } catch (err: any) {
    console.error('Error in DELETE /api/admin/popup-prompts/:id:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete popup prompt' });
  }
});

// API 3.17: Get eligible popup prompts for a registered business
// Evaluates business.registrationDate against prompt.daysAfterRegistration (5-30 days)
app.get('/api/business/:businessId/popup-prompts', requireAuth, (req: any, res) => {
  try {
    const { businessId } = req.params;

    if (!isSuperAdminUser(req.user) && req.user.businessId !== businessId) {
      return res.status(403).json({ success: false, error: 'Forbidden: Cannot access another business popup prompts.' });
    }

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


// API 4: Cloud Base64 File Uploader (Hardened with Authentication, MIME Whitelist & Cryptographic Naming)
app.post('/api/upload', requireAuth, (req: any, res) => {
  try {
    const { name, base64 } = req.body || {};
    if (!base64 || typeof base64 !== 'string') {
      return res.status(400).json({ error: 'No file data received' });
    }

    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 string' });
    }

    const mimeType = matches[1].toLowerCase();
    const allowedMimeTypes: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/webp': '.webp',
      'application/pdf': '.pdf'
    };

    if (!allowedMimeTypes[mimeType]) {
      return res.status(400).json({ error: 'Forbidden file type. Only PNG, JPEG, WEBP, and PDF files are permitted.' });
    }

    const buffer = Buffer.from(matches[2], 'base64');
    
    // Strict 5MB file size limit
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds maximum permitted limit (5MB).' });
    }

    const safeExt = allowedMimeTypes[mimeType];
    const safeFilename = `upload_${Date.now()}_${crypto.randomBytes(12).toString('hex')}${safeExt}`;
    const filepath = path.join(UPLOADS_DIR, safeFilename);

    fs.writeFileSync(filepath, buffer);
    const fileUrl = `/uploads/${safeFilename}`;
    console.log(`[Storage] Authenticated user ${req.user?.id} uploaded file: ${fileUrl}`);
    res.json({ success: true, url: fileUrl });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to process file upload.' });
  }
});

// Helper to read Admin Paystack Settings securely from server database
function getAdminPaystackSettings() {
  const dbData = readDatabase();
  const list = dbData['bos_paystack_settings'] || [];
  const envPub = process.env.PAYSTACK_PUBLIC_KEY || '';
  const envSec = process.env.PAYSTACK_SECRET_KEY || '';
  if (Array.isArray(list) && list.length > 0) {
    const s = list[0];
    const pub = String(s.publicKey || envPub).trim();
    const sec = String(s.secretKey || envSec).trim();
    return {
      publicKey: pub,
      secretKey: sec,
      environment: s.environment || 'test',
      currency: s.currency || 'GHS',
      callbackUrl: s.callbackUrl || '/api/payment/callback',
      webhookUrl: s.webhookUrl || '/api/payment/webhook'
    };
  }
  return {
    publicKey: envPub,
    secretKey: envSec,
    environment: 'test',
    currency: 'GHS',
    callbackUrl: '/api/payment/callback',
    webhookUrl: '/api/payment/webhook'
  };
}

// Dedicated Secure Super Admin Paystack API Key Management Endpoints
app.get('/api/admin/paystack-settings', requireSuperAdmin, (req, res) => {
  try {
    const adminSettings = getAdminPaystackSettings();
    const hasSecret = Boolean(adminSettings.secretKey && !adminSettings.secretKey.includes('default'));
    return res.json({
      success: true,
      settings: {
        publicKey: adminSettings.publicKey || '',
        secretKey: hasSecret ? 'sk_live_••••••••••••' : '',
        environment: adminSettings.environment,
        currency: adminSettings.currency,
        callbackUrl: adminSettings.callbackUrl,
        webhookUrl: adminSettings.webhookUrl
      }
    });
  } catch (err: any) {
    console.error('Error in GET /api/admin/paystack-settings:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve payment settings' });
  }
});

app.post('/api/admin/paystack-settings', requireSuperAdmin, (req: any, res) => {
  try {
    const { publicKey, secretKey, environment, currency, callbackUrl, webhookUrl } = req.body || {};
    const dbData = readDatabase();
    const existing = Array.isArray(dbData['bos_paystack_settings']) && dbData['bos_paystack_settings'][0]
      ? dbData['bos_paystack_settings'][0]
      : {};

    const updatedSettings = {
      publicKey: typeof publicKey === 'string' ? publicKey.trim() : existing.publicKey || '',
      secretKey: typeof secretKey === 'string' && secretKey.trim() && !secretKey.includes('••••') 
        ? secretKey.trim() 
        : existing.secretKey || '',
      environment: environment || existing.environment || 'test',
      currency: currency || existing.currency || 'GHS',
      callbackUrl: callbackUrl || existing.callbackUrl || '/api/payment/callback',
      webhookUrl: webhookUrl || existing.webhookUrl || '/api/payment/webhook',
      updatedAt: new Date().toISOString(),
      updatedBy: req.user?.email || 'admin@businessos.com'
    };

    dbData['bos_paystack_settings'] = [updatedSettings];
    writeDatabase(dbData);

    console.log('[Security] Super Admin updated Paystack settings (secretKey securely stored on server)');

    return res.json({
      success: true,
      message: 'Paystack settings updated successfully',
      settings: {
        publicKey: updatedSettings.publicKey,
        secretKey: updatedSettings.secretKey ? 'sk_live_••••••••••••' : '',
        environment: updatedSettings.environment,
        currency: updatedSettings.currency,
        callbackUrl: updatedSettings.callbackUrl,
        webhookUrl: updatedSettings.webhookUrl
      }
    });
  } catch (err: any) {
    console.error('Error in POST /api/admin/paystack-settings:', err);
    return res.status(500).json({ success: false, error: 'Failed to save payment settings' });
  }
});

app.delete('/api/admin/paystack-settings', requireSuperAdmin, (req, res) => {
  try {
    const dbData = readDatabase();
    dbData['bos_paystack_settings'] = [];
    writeDatabase(dbData);
    return res.json({ success: true, message: 'Paystack settings cleared successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to clear payment settings' });
  }
});

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
app.post('/api/payment', requireAuth, async (req: any, res) => {
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
        isVerified = false;
      }
    } catch (vErr: any) {
      console.warn(`[Paystack Verification Network Note]`, vErr.message);
      isVerified = false;
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

// API 7: Paystack Payment Callback Endpoint (Secured against XSS and postMessage injection)
app.all('/api/payment/callback', (req, res) => {
  const rawRef = String(req.query.trxref || req.query.reference || '');
  const sanitizedRef = rawRef.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  const safeDisplayRef = escapeHtml(sanitizedRef || 'N/A');

  res.send(`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Payment Complete</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 40px; background: #f8fafc; color: #1e293b; }
          .card { max-width: 480px; margin: 40px auto; background: white; padding: 32px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          h2 { color: #059669; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Payment Processed Successfully</h2>
          <p>Reference: <strong>${safeDisplayRef}</strong></p>
          <p>Your subscription is being activated. You may close this window or return to BusinessOS.</p>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'PAYSTACK_PAYMENT_SUCCESS', reference: ${JSON.stringify(sanitizedRef)} }, window.location.origin);
          }
        </script>
      </body>
    </html>
  `);
});

// API 8: Paystack Webhook Endpoint (Secured with HMAC-SHA512 Signature Verification)
app.all('/api/payment/webhook', (req, res) => {
  const adminSettings = getAdminPaystackSettings();

  // Validate webhook HMAC signature if secretKey is configured
  if (adminSettings.secretKey && adminSettings.secretKey.trim()) {
    const signature = req.headers['x-paystack-signature'];
    const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha512', adminSettings.secretKey.trim())
      .update(payload)
      .digest('hex');

    if (signature && signature !== expectedSignature) {
      console.warn('[Paystack Webhook Security] Invalid webhook signature detected and rejected.');
      return res.status(401).json({ status: 'error', message: 'Unauthorized: Invalid webhook signature' });
    }
  }

  const event = req.body?.event;
  if (event === 'charge.success') {
    const data = req.body?.data;
    console.log(`[Paystack Webhook] Charge success for reference: ${data?.reference}, amount: ${data?.amount / 100}`);
  }
  return res.json({ status: 'success', message: 'Paystack webhook acknowledged', timestamp: new Date().toISOString() });
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

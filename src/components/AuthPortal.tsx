/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { auth } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { User, Business, REQUIRED_BUSINESS_TYPES, BUSINESS_TYPE_GROUPS } from '../types';
import { showSuccess, showError } from '../lib/toast';
import { InstallAppButton } from './InstallAppButton';
import { 
  Lock, Mail, Phone, Building, Shield, User as UserIcon, AlertCircle, 
  ArrowRight, CheckCircle2, Clock, KeyRound, ArrowLeft, Eye, EyeOff, X,
  Download, Smartphone, Sparkles
} from 'lucide-react';

// Secure Password Hashing Utility (SHA-256 with standard secure salt)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_secure_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

interface AuthPortalProps {
  onLoginSuccess: (user: User) => void;
}

export function AuthPortal({ onLoginSuccess }: AuthPortalProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // PWA Installation State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
      showSuccess('BusinessOS App', 'BusinessOS has been successfully installed on your device!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } catch (err) {
        console.warn('PWA install error:', err);
      }
      setDeferredPrompt(null);
    } else {
      showSuccess('App Installed', 'BusinessOS PWA application ready on device.');
    }
  };

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Registration Fields
  const [regBusName, setRegBusName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regCategory, setRegCategory] = useState('Retail');

  // Forgot Password & OTP Flow Fields
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [otpScreen, setOtpScreen] = useState(false);
  const [resetScreen, setResetScreen] = useState(false);

  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryUser, setRecoveryUser] = useState<User | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpExpiry, setOtpExpiry] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [otpRequestsCount, setOtpRequestsCount] = useState(0);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Simulated Email Client Sandbox
  const [simulatedInbox, setSimulatedInbox] = useState<{
    id: string;
    to: string;
    subject: string;
    body: string;
    timestamp: string;
  }[]>([]);
  const [isInboxOpen, setIsInboxOpen] = useState(false);

  // Status message
  const [error, setErrorState] = useState('');
  const [success, setSuccessState] = useState('');

  const setError = (msg: string) => {
    setErrorState(msg);
    if (msg) {
      showError('Authentication Alert', msg);
    }
  };

  const setSuccess = (msg: string) => {
    setSuccessState(msg);
    if (msg) {
      showSuccess('Success!', msg);
    }
  };

  // Realtime Registration Validation Computations
  const trimmedRegEmail = regEmail.trim().toLowerCase();
  const isEmailValid = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedRegEmail);
  const isPhoneValid = /^\d{10}$/.test(regPhone);

  // Password Requirements:
  const hasMinLen = regPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(regPassword);
  const hasLower = /[a-z]/.test(regPassword);
  const hasNumber = /[0-9]/.test(regPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(regPassword);
  const hasNoSpaces = !/\s/.test(regPassword) && regPassword.length > 0;
  const notEmailOrBusName = Boolean(
    regPassword &&
    (!trimmedRegEmail || regPassword.toLowerCase() !== trimmedRegEmail) &&
    (!regBusName || regPassword.toLowerCase() !== regBusName.trim().toLowerCase())
  );

  const isPasswordValid = hasMinLen && hasUpper && hasLower && hasNumber && hasSpecial && hasNoSpaces && notEmailOrBusName;
  const passwordsMatch = Boolean(regPassword && regConfirmPassword && regPassword === regConfirmPassword);

  let passwordScore = 0;
  if (hasMinLen) passwordScore++;
  if (hasUpper) passwordScore++;
  if (hasLower) passwordScore++;
  if (hasNumber) passwordScore++;
  if (hasSpecial) passwordScore++;
  if (hasNoSpaces) passwordScore++;
  if (notEmailOrBusName) passwordScore++;

  const passwordStrength = 
    passwordScore >= 7 ? 'Strong' :
    passwordScore >= 4 ? 'Medium' : 'Weak';

  const isRegFormValid = Boolean(
    regBusName.trim().length >= 2 &&
    regOwnerName.trim().length >= 2 &&
    isEmailValid &&
    isPhoneValid &&
    isPasswordValid &&
    passwordsMatch
  );

  // OTP Expiration Countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpScreen && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [otpScreen, timeLeft]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    if (!email || !password) {
      setError('Please fill in all credentials.');
      setIsLoading(false);
      return;
    }

    const trimmedEmail = email.trim();
    const isSuperAdminEmail = trimmedEmail.toLowerCase() === 'su@admin' || trimmedEmail.toLowerCase() === 'admin';

    // Dedicated Super Admin authentication check before normal business user authentication
    if (isSuperAdminEmail || isAdminLogin) {
      if ((trimmedEmail.toLowerCase() === 'su@admin' || trimmedEmail.toLowerCase() === 'admin') && password === 'suadmin123') {
        const adminUser: User = {
          id: 'u-superadmin',
          businessId: 'platform',
          name: 'Platform Administrator',
          email: trimmedEmail.toLowerCase(),
          role: 'SUPER_ADMIN',
          status: 'active',
          createdAt: new Date().toISOString()
        };
        db.setCurrentUser(adminUser);
        setIsLoading(false);
        onLoginSuccess(adminUser);
        return;
      } else {
        setError('Invalid Super Admin credentials.');
        setIsLoading(false);
        return;
      }
    } else {
      // Normal Business Login
      const users = db.getUsers();
      const hashedInput = await hashPassword(password);
      const matchedUser = users.find(u => 
        u.email.toLowerCase() === trimmedEmail.toLowerCase() && 
        (u.password === password || u.password === hashedInput)
      );
      
      if (!matchedUser) {
        setError('Invalid email address or password.');
        setIsLoading(false);
        return;
      }

      if (matchedUser.status === 'disabled') {
        setError('Your employee account has been suspended by management.');
        setIsLoading(false);
        return;
      }

      // Check if business itself is active
      const businesses = db.getBusinesses();
      const business = businesses.find(b => b.id === matchedUser.businessId);
      if (business && business.status === 'suspended') {
        setError('This business portal has been suspended by the platform administrator.');
        setIsLoading(false);
        return;
      }

      // Firebase Auth Cloud Sign-in Attempt
      try {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
      } catch (authErr) {
        console.info('Firebase Auth sign in note:', authErr);
      }

      db.setCurrentUser(matchedUser);
      db.addActivityLog(matchedUser.businessId, {
        userId: matchedUser.id,
        userName: matchedUser.name,
        action: 'User Login',
        details: `${matchedUser.name} logged in successfully.`
      });
      setIsLoading(false);
      onLoginSuccess(matchedUser);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isRegFormValid) {
      if (!isEmailValid) {
        setError('Please enter a valid email address (e.g. owner@domain.com).');
      } else if (!isPhoneValid) {
        setError('Phone number must be exactly 10 numeric digits.');
      } else if (!isPasswordValid) {
        setError('Password does not satisfy all security strength requirements.');
      } else if (!passwordsMatch) {
        setError('Passwords do not match.');
      } else {
        setError('Please complete all registration fields correctly.');
      }
      return;
    }

    setIsLoading(true);

    // Check if email already used
    const existingUsers = db.getUsers();
    if (existingUsers.some(u => u.email.toLowerCase() === trimmedRegEmail)) {
      setError('An account with this email address is already registered.');
      setIsLoading(false);
      return;
    }

    const businessId = 'b-' + Math.random().toString(36).substring(2, 9);
    const userId = 'u-' + Math.random().toString(36).substring(2, 9);

    const registrationDateStr = new Date().toISOString();
    const trialEndDateObj = new Date();
    trialEndDateObj.setDate(trialEndDateObj.getDate() + 30);
    const trialEndDateStr = trialEndDateObj.toISOString();

    const globalConfig = db.getGlobalSystemConfig();
    const defaultAmount = globalConfig.defaultSubscriptionAmount || 299;

    // Create Business
    const newBusiness: Business = {
      id: businessId,
      name: regBusName.trim(),
      ownerName: regOwnerName.trim(),
      email: trimmedRegEmail,
      phone: regPhone,
      category: regCategory,
      businessType: regCategory,
      status: 'active',
      createdAt: registrationDateStr,
      registrationDate: registrationDateStr,
      trialEndDate: trialEndDateStr,
      subscriptionStatus: 'trial',
      subscriptionAmount: defaultAmount,
      currency: 'GHC',
      isStockTransferEnabled: false,
      enabledFeatures: ["sales", "inventory", "customers", "suppliers", "reports", "restaurant"],
      receiptConfig: {
        businessName: regBusName.trim(),
        contactInfo: `${regBusName.trim()}\nTel: ${regPhone}`,
        footerMessage: 'Thank you for your business!',
        layout: 'standard'
      }
    };

    const hashedPassword = await hashPassword(regPassword);

    // Create Owner User
    const newOwner: User = {
      id: userId,
      businessId: businessId,
      name: regOwnerName.trim(),
      email: trimmedRegEmail,
      role: 'owner',
      status: 'active',
      password: hashedPassword,
      authProvider: 'password',
      createdAt: new Date().toISOString()
    };

    // Write to DB
    db.saveBusiness(newBusiness);
    db.saveUser(newOwner);

    // Register user in Firebase Authentication
    try {
      await createUserWithEmailAndPassword(auth, trimmedRegEmail, regPassword);
    } catch (authErr) {
      console.info('Firebase Auth cloud user creation note:', authErr);
    }

    // Initial log
    db.addActivityLog(businessId, {
      userId: userId,
      userName: regOwnerName.trim(),
      action: 'Business Registration',
      details: `New workspace registered for "${regBusName.trim()}" under category ${regCategory}.`
    });

    setIsLoading(false);
    setSuccess('Business workspace successfully provisioned! Logging you in...');
    
    // Automatically log in newly created user
    db.setCurrentUser(newOwner);
    setTimeout(() => {
      onLoginSuccess(newOwner);
    }, 800);
  };

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedEmail = recoveryEmail.trim().toLowerCase();

    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    // Exclusion for Super Admin
    if (trimmedEmail === 'admin' || trimmedEmail.includes('admin@business.os')) {
      setError('The Super Admin account has separate secure credentials. Normal recovery is restricted.');
      return;
    }

    const users = db.getUsers();
    const matched = users.find(u => u.email.toLowerCase() === trimmedEmail);

    if (!matched) {
      setError('No registered BusinessOS account found with this email address.');
      return;
    }

    if (matched.status === 'disabled') {
      setError('Your account is currently disabled. Please contact your manager or workspace owner.');
      return;
    }

    // Rate Limit check: Max 3 requests
    if (otpRequestsCount >= 3) {
      setError('Rate limit exceeded. Too many password reset requests. Please try again later.');
      return;
    }

    // Generate unique 6-digit OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = Date.now() + 60 * 1000; // 60 seconds duration

    setOtpCode(generatedOtp);
    setOtpExpiry(expiryTime);
    setTimeLeft(60);
    setRecoveryUser(matched);
    setOtpRequestsCount(prev => prev + 1);

    // Send mock email
    const newMail = {
      id: 'm-' + Math.random().toString(36).substring(2, 9),
      to: matched.email,
      subject: '🔒 BusinessOS Password Recovery OTP',
      body: `Hello ${matched.name},\n\nYou have requested a password reset for your BusinessOS workspace account.\n\nYour secure One-Time Password (OTP) is:\n\n👉  ${generatedOtp}  👈\n\nThis verification code expires in 60 seconds. If you did not request this, please secure your account immediately.\n\nBest regards,\nBusinessOS Cloud Security Team`,
      timestamp: new Date().toLocaleTimeString()
    };

    setSimulatedInbox(prev => [newMail, ...prev]);
    setIsInboxOpen(true); // Auto-open simulator drawer for intuitive testing

    setOtpScreen(true);
    setIsForgotPassword(false);
    setSuccess('A secure 6-digit OTP code has been delivered to your email inbox sandbox.');
  };

  const handleResendOTP = () => {
    setError('');
    setSuccess('');

    if (otpRequestsCount >= 3) {
      setError('Rate limit exceeded. Too many password reset requests. Please try again later.');
      return;
    }

    if (!recoveryUser) {
      setError('Recovery session lost. Please restart the process.');
      return;
    }

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = Date.now() + 60 * 1000;

    setOtpCode(generatedOtp);
    setOtpExpiry(expiryTime);
    setTimeLeft(60);
    setOtpRequestsCount(prev => prev + 1);

    const newMail = {
      id: 'm-' + Math.random().toString(36).substring(2, 9),
      to: recoveryUser.email,
      subject: '🔄 BusinessOS - New Password Recovery OTP',
      body: `Hello ${recoveryUser.name},\n\nWe received a request to resend your password reset verification code.\n\nYour new One-Time Password (OTP) is:\n\n👉  ${generatedOtp}  👈\n\nThis code is valid for 60 seconds. Do not share this code.\n\nBest regards,\nBusinessOS Cloud Security Team`,
      timestamp: new Date().toLocaleTimeString()
    };

    setSimulatedInbox(prev => [newMail, ...prev]);
    setIsInboxOpen(true);
    setSuccess('A new secure OTP verification code has been dispatched.');
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!otpInput) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }

    if (!otpExpiry || Date.now() > otpExpiry) {
      setError('This OTP has expired. Please request a new verification code.');
      return;
    }

    if (otpInput.trim() !== otpCode) {
      setError('Invalid verification code. Please double check and try again.');
      return;
    }

    setOtpScreen(false);
    setResetScreen(true);
    setSuccess('Identity verified successfully! Please define your new secure password.');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword || !confirmPassword) {
      setError('Please fill out both password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!recoveryUser) {
      setError('Recovery session lost. Please restart the process.');
      return;
    }

    const hashed = await hashPassword(newPassword);

    // Save updated credentials
    const updatedUser: User = {
      ...recoveryUser,
      password: hashed
    };

    db.saveUser(updatedUser);

    // Add Secure Platform Audit Log
    db.addActivityLog(recoveryUser.businessId, {
      userId: recoveryUser.id,
      userName: recoveryUser.name,
      action: 'Password Reset',
      details: `${recoveryUser.name} securely reset their password via secure email OTP verification.`
    });

    // Reset recovery state machines
    setResetScreen(false);
    setOtpScreen(false);
    setIsForgotPassword(false);
    setRecoveryEmail('');
    setRecoveryUser(null);
    setOtpCode('');
    setOtpInput('');
    setNewPassword('');
    setConfirmPassword('');
    setOtpRequestsCount(0);

    setSuccess('Your password has been securely updated. You may now sign in with your new credentials.');
  };

  return (
    <div id="auth-container" className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans transition-all">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-[#064E3B] flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-emerald-950/20">
            B
          </div>
          <span className="text-3xl font-bold text-slate-800 tracking-tight">
            Business<span className="text-[#10B981]">OS</span>
          </span>
        </div>

        {/* PWA App Installation Button */}
        <div className="mt-3 flex justify-center">
          <InstallAppButton />
        </div>
        <h2 className="mt-6 text-center text-xl font-bold tracking-tight text-slate-700">
          {isRegistering
            ? 'Deploy a new Cloud Workspace'
            : isForgotPassword
            ? 'Recover Workspace Password'
            : otpScreen
            ? 'Verify Secure OTP Code'
            : resetScreen
            ? 'Create New Password'
            : isAdminLogin
            ? 'Super Admin Platform Control'
            : 'Sign in to your Business Workspace'}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          {isRegistering ? (
            <span>
              Already registered?{' '}
              <button type="button" onClick={() => { setIsRegistering(false); setError(''); }} className="font-semibold text-emerald-600 hover:text-emerald-500 underline underline-offset-4 cursor-pointer">
                Sign in to workspace
              </button>
            </span>
          ) : isForgotPassword || otpScreen || resetScreen ? (
            <span>
              Remembered your password?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setOtpScreen(false);
                  setResetScreen(false);
                  setError('');
                  setSuccess('');
                }}
                className="font-semibold text-emerald-600 hover:text-emerald-500 underline underline-offset-4 cursor-pointer"
              >
                Back to Sign In
              </button>
            </span>
          ) : (
            <span>
              Or{' '}
              <button type="button" onClick={() => { setIsRegistering(true); setError(''); }} className="font-semibold text-emerald-600 hover:text-emerald-500 underline underline-offset-4 cursor-pointer">
                register a new business
              </button>
            </span>
          )}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-3xl border border-slate-200/80 sm:px-10">
          {/* Messages */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 p-3.5 rounded-2xl flex gap-2 text-red-700 text-sm animate-fade-in">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex gap-2 text-emerald-700 text-sm animate-fade-in">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              <span>{success}</span>
            </div>
          )}

          {isRegistering ? (
            /* Registration Form */
            <div className="space-y-4">
              <form className="space-y-4" onSubmit={handleRegister}>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Business Name</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={regBusName}
                      onChange={(e) => setRegBusName(e.target.value)}
                      placeholder="Royal Crown Academy"
                      className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Owner / Administrator Name</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={regOwnerName}
                      onChange={(e) => setRegOwnerName(e.target.value)}
                      placeholder="Dr. James Grayson"
                      className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value.trim().toLowerCase())}
                      placeholder="owner@domain.com"
                      className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    />
                  </div>
                  {regEmail && (
                    <div className={`mt-1 text-[11px] flex items-center gap-1 ${isEmailValid ? 'text-emerald-600' : 'text-red-500 font-semibold'}`}>
                      {isEmailValid ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Valid email format</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                          <span>Invalid email (must contain @ and valid domain)</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Business Phone (10 Digits)</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="0241234567"
                      className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    />
                  </div>
                  {regPhone && (
                    <div className={`mt-1 text-[11px] flex items-center gap-1 ${isPhoneValid ? 'text-emerald-600' : 'text-amber-600 font-semibold'}`}>
                      {isPhoneValid ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Valid 10-digit phone number</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                          <span>Must be exactly 10 digits ({regPhone.length}/10)</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Business Category / Type</label>
                  <select
                    value={regCategory}
                    onChange={(e) => setRegCategory(e.target.value)}
                    className="mt-1 block w-full py-2 px-3 border border-slate-200 bg-white rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm cursor-pointer"
                  >
                    {BUSINESS_TYPE_GROUPS.map((group) => (
                      <optgroup key={group.name} label={group.name}>
                        {group.types.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-10 pr-10 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Password Strength Live Checklist */}
                  {regPassword && (
                    <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-600">Password Strength:</span>
                        <span className={
                          passwordStrength === 'Strong' ? 'text-emerald-600 font-bold' :
                          passwordStrength === 'Medium' ? 'text-amber-600 font-bold' :
                          'text-red-500 font-bold'
                        }>
                          {passwordStrength}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-1 text-[11px] pt-1 border-t border-slate-200/60">
                        <div className={`flex items-center gap-1.5 ${hasMinLen ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                          {hasMinLen ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <X className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                          <span>Minimum 8 characters</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                          {hasUpper ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <X className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                          <span>Uppercase letter (A–Z)</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                          {hasLower ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <X className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                          <span>Lowercase letter (a–z)</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                          {hasNumber ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <X className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                          <span>At least one number (0–9)</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                          {hasSpecial ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <X className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                          <span>Special character (!@#$%^&*)</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${hasNoSpaces ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                          {hasNoSpaces ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <X className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                          <span>No spaces allowed</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${notEmailOrBusName ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                          {notEmailOrBusName ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <X className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                          <span>Not same as email or business name</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm Password</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-10 pr-10 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showRegConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {regConfirmPassword && (
                    <div className={`mt-1 text-[11px] flex items-center gap-1 ${passwordsMatch ? 'text-emerald-600 font-medium' : 'text-red-500 font-semibold'}`}>
                      {passwordsMatch ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Passwords match</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                          <span>Passwords do not match</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!isRegFormValid || isLoading}
                  className={`w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white transition-all cursor-pointer mt-2 ${
                    isRegFormValid && !isLoading
                      ? 'bg-[#064E3B] hover:bg-[#032e23] focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500'
                      : 'bg-slate-300 cursor-not-allowed opacity-70'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Provisioning Workspace...</span>
                    </>
                  ) : (
                    <span>Launch Workspace</span>
                  )}
                </button>
              </form>
            </div>
          ) : isForgotPassword ? (
            /* Forgot Password Email Entry Form */
            <form className="space-y-5" onSubmit={handleSendOTP}>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Registered Email Address</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="owner@gourmet.com"
                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  />
                </div>
                <p className="mt-2 text-[11px] text-slate-400 leading-normal">
                  Enter your verified BusinessOS email address. We'll verify your active tenant profile and transmit a temporary secure verification code.
                </p>
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#064E3B] hover:bg-[#032e23] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  Verify Account & Send OTP <ArrowRight className="h-4 w-4" />
                </span>
              </button>
            </form>
          ) : otpScreen ? (
            /* OTP Verification Form */
            <form className="space-y-5" onSubmit={handleVerifyOTP}>
              <div>
                <div className="text-center mb-4">
                  <p className="text-xs text-slate-500">
                    Enter the secure 6-digit verification code dispatched to <strong className="text-slate-700">{recoveryUser?.email}</strong>.
                  </p>
                </div>

                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Verification Security Code</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Clock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    pattern="\d*"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-slate-800 tracking-[0.25em] font-mono placeholder-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-center font-bold"
                  />
                </div>
                
                {/* Expiry Clock Indicator */}
                <div className="mt-3 flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    {timeLeft > 0 ? (
                      <span>Code expires in <strong className="text-slate-700 font-mono">{timeLeft}s</strong></span>
                    ) : (
                      <span className="text-red-500 font-bold">Security code expired</span>
                    )}
                  </div>
                  
                  <span className="text-slate-400 text-[10px] uppercase tracking-wider">
                    Attempt {otpRequestsCount}/3
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="submit"
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#064E3B] hover:bg-[#032e23] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all cursor-pointer"
                >
                  Confirm Verification Code
                </button>

                <button
                  type="button"
                  disabled={timeLeft > 0 || otpRequestsCount >= 3}
                  onClick={handleResendOTP}
                  className={`w-full py-2 px-4 rounded-xl text-xs font-bold border transition-all ${
                    timeLeft > 0 || otpRequestsCount >= 3
                      ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-white border-slate-200 text-emerald-700 hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  {otpRequestsCount >= 3 
                    ? 'Requests Locked (Limit Exceeded)' 
                    : timeLeft > 0 
                    ? `Resend Code in ${timeLeft}s` 
                    : 'Resend Verification OTP'}
                </button>
              </div>
            </form>
          ) : resetScreen ? (
            /* Create New Password Form */
            <form className="space-y-5" onSubmit={handleResetPassword}>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">New Password</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-10 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm Password</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#064E3B] hover:bg-[#032e23] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all cursor-pointer"
              >
                Securely Reset Password
              </button>
            </form>
          ) : (
            /* Login Form */
            <div className="space-y-4">
              <form className="space-y-4" onSubmit={handleLogin}>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {isAdminLogin ? 'Super Admin Username' : 'Workspace Email Address'}
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      {isAdminLogin ? (
                        <Shield className="h-4 w-4 text-slate-400" />
                      ) : (
                        <Mail className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <input
                      type={isAdminLogin ? 'text' : 'email'}
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={isAdminLogin ? 'admin' : 'coffee@business.os'}
                      className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                    {!isAdminLogin && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setIsRegistering(false);
                          setError('');
                          setSuccess('');
                        }}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-500 cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-10 pr-10 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdminLogin(!isAdminLogin);
                      setEmail('');
                      setPassword('');
                      setError('');
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-emerald-600 flex items-center gap-1 cursor-pointer"
                  >
                    <Shield className="h-3 w-3" />
                    {isAdminLogin ? 'Access Business Workspace' : 'Platform Controller Login'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#064E3B] hover:bg-[#032e23] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Secure Sign In</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* 📬 Simulated Mailbox Client Sandbox Drawer (for recovery testing) */}
      <div id="mailbox-sandbox" className="fixed bottom-6 right-6 z-50 select-none">
        {isInboxOpen ? (
          <div className="w-96 bg-white border border-slate-200 shadow-2xl rounded-3xl flex flex-col overflow-hidden max-h-[500px] animate-scale-up">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="font-bold text-xs tracking-wide uppercase">Dev Inbox Simulator</span>
              </div>
              <button
                onClick={() => setIsInboxOpen(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Email list */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1 max-h-[400px]">
              {simulatedInbox.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Mail className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-400">Your mock email inbox is empty.</p>
                  <p className="text-[10px] text-slate-400 px-4 leading-normal">
                    Initiate the Forgot Password flow and enter a registered email. Your reset OTP code will be sent to this virtual sandbox inbox.
                  </p>
                </div>
              ) : (
                simulatedInbox.map((mail) => (
                  <div key={mail.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl relative hover:border-slate-200 transition">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider truncate max-w-[200px]">
                        To: {mail.to}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">{mail.timestamp}</span>
                    </div>
                    <h5 className="font-bold text-slate-800 text-xs mt-2">{mail.subject}</h5>
                    <pre className="text-[10px] text-slate-600 mt-2 whitespace-pre-wrap font-sans leading-relaxed border-t border-slate-200/50 pt-2 select-all">
                      {mail.body}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsInboxOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-xl hover:shadow-2xl font-bold text-xs cursor-pointer transition-all border border-slate-800 relative select-none"
          >
            <Mail className="h-4 w-4 text-emerald-400 animate-pulse" />
            <span>Check Virtual Inbox</span>
            {simulatedInbox.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white rounded-full text-[9px] h-5 w-5 flex items-center justify-center font-bold border-2 border-white">
                {simulatedInbox.length}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}


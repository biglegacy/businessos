import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

declare global {
  interface Window {
    deferredPrompt?: any;
  }
}

// Global listener for PWA install prompt eligibility
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredPrompt = e;
  window.dispatchEvent(new CustomEvent('pwa-installable'));
});

// Gracefully handle non-fatal Firebase Auth network events in sandboxed environments
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = reason?.message || String(reason || '');
  const code = reason?.code || '';
  if (
    code === 'auth/network-request-failed' ||
    msg.includes('auth/network-request-failed') ||
    msg.includes('network-request-failed') ||
    msg.includes('the client is offline')
  ) {
    event.preventDefault();
    console.warn('[Firebase Auth] Handled non-fatal connection event:', msg);
  }
});

window.addEventListener('error', (event) => {
  const msg = event.message || '';
  if (msg.includes('auth/network-request-failed') || msg.includes('network-request-failed')) {
    event.preventDefault();
    console.warn('[Firebase Auth] Suppressed non-fatal window error:', msg);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

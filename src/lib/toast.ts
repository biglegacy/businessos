export interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

// Global deduplication cache to avoid showing duplicate notifications for the same action
const recentToasts = new Map<string, number>();

export function showToast(options: ToastOptions) {
  const duration = options.duration !== undefined ? options.duration : 2000;
  const dedupeKey = `${options.type}_${options.title}_${options.message}`;
  const now = Date.now();
  const lastShown = recentToasts.get(dedupeKey);

  // Avoid showing duplicate notifications for the same action within 2 seconds
  if (lastShown && (now - lastShown < 2000)) {
    return;
  }
  recentToasts.set(dedupeKey, now);

  const event = new CustomEvent('businessos-toast', { detail: { ...options, duration } });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(event);
  }
}

export function showSuccess(title: string, message: string, duration = 2000) {
  showToast({ type: 'success', title, message, duration });
}

export function showError(title: string, message: string, duration = 2000) {
  showToast({ type: 'error', title, message, duration });
}

export function showWarning(title: string, message: string, duration = 2000) {
  showToast({ type: 'warning', title, message, duration });
}

export function showInfo(title: string, message: string, duration = 2000) {
  showToast({ type: 'info', title, message, duration });
}

if (typeof window !== 'undefined') {
  (window as any).showToast = showToast;
  (window as any).showSuccess = showSuccess;
  (window as any).showError = showError;
  (window as any).showWarning = showWarning;
  (window as any).showInfo = showInfo;

  // Global override for standard browser alert
  window.alert = (message: string) => {
    const msgLower = (message || '').toLowerCase();
    const isSuccess = 
      msgLower.includes('success') || 
      msgLower.includes('saved') || 
      msgLower.includes('completed') || 
      msgLower.includes('reset') || 
      msgLower.includes('simulated') || 
      msgLower.includes('pwa') || 
      msgLower.includes('installation') || 
      msgLower.includes('guide') ||
      msgLower.includes('paid') ||
      msgLower.includes('renewed') ||
      msgLower.includes('added') ||
      msgLower.includes('deleted') ||
      msgLower.includes('synced') ||
      msgLower.includes('synchronized') ||
      msgLower.includes('restored') ||
      msgLower.includes('verified');

    if (isSuccess) {
      showSuccess('Success', message, 2000);
    } else {
      showError('Action Required', message, 2000);
    }
  };
}

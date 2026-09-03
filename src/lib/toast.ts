export interface ToastOptions {
  type: 'success' | 'error';
  title: string;
  message: string;
  duration?: number;
}

export function showToast(options: ToastOptions) {
  const event = new CustomEvent('businessos-toast', { detail: options });
  window.dispatchEvent(event);
}

export function showSuccess(title: string, message: string, duration = 3500) {
  showToast({ type: 'success', title, message, duration });
}

export function showError(title: string, message: string, duration = 5000) {
  showToast({ type: 'error', title, message, duration });
}

if (typeof window !== 'undefined') {
  (window as any).showToast = showToast;
  (window as any).showSuccess = showSuccess;
  (window as any).showError = showError;

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
      showSuccess('Success', message);
    } else {
      showError('Action Required', message);
    }
  };
}

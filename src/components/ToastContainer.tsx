import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, AlertTriangle } from 'lucide-react';
import { ToastOptions } from '../lib/toast';

interface ToastItem extends ToastOptions {
  id: string;
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastOptions>;
      if (customEvent.detail) {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast: ToastItem = {
          ...customEvent.detail,
          id,
        };
        setToasts((prev) => [...prev, newToast]);
      }
    };

    window.addEventListener('businessos-toast', handleToastEvent);
    return () => {
      window.removeEventListener('businessos-toast', handleToastEvent);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: () => void;
}

const ToastCard: React.FC<ToastCardProps> = ({ toast, onDismiss }) => {
  const { type, title, message, duration = 4000 } = toast;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const isSuccess = type === 'success';

  // SVG Paths for drawing animation
  const checkmarkPathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 0.4, ease: 'easeOut', delay: 0.1 }
    }
  };

  const errorPathVariants1 = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 0.3, ease: 'easeOut', delay: 0.1 }
    }
  };

  const errorPathVariants2 = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 0.3, ease: 'easeOut', delay: 0.25 }
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
      className={`pointer-events-auto w-full bg-white rounded-2xl shadow-xl border overflow-hidden ${
        isSuccess ? 'border-emerald-100 shadow-emerald-500/5' : 'border-rose-100 shadow-rose-500/5'
      }`}
    >
      <div className="p-4 flex gap-3.5 relative">
        {/* Animated Icon Container */}
        <div className="shrink-0 pt-0.5">
          {isSuccess ? (
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100/50 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <motion.path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                  variants={checkmarkPathVariants}
                  initial="hidden"
                  animate="visible"
                />
              </svg>
            </div>
          ) : (
            <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-100/50 flex items-center justify-center">
              <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <motion.path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6"
                  variants={errorPathVariants1}
                  initial="hidden"
                  animate="visible"
                />
                <motion.path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 6l12 12"
                  variants={errorPathVariants2}
                  initial="hidden"
                  animate="visible"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-4">
          <h4 className={`text-xs font-bold leading-tight ${isSuccess ? 'text-emerald-950' : 'text-rose-950'}`}>
            {title}
          </h4>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1 whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* Manual Dismiss Button */}
        <button
          onClick={onDismiss}
          className="absolute top-3.5 right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition shrink-0 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Animated progress bar tracking the exact remaining duration */}
      <div className="w-full h-1 bg-slate-50 relative">
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
          className={`h-full ${isSuccess ? 'bg-emerald-500' : 'bg-rose-500'}`}
        />
      </div>
    </motion.div>
  );
};

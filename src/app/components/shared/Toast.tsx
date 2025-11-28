'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, X, AlertCircle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

type ToastProps = {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
};

export const Toast = ({ message, type = 'success', duration = 3000, onClose }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-green-600" />,
    error: <AlertCircle className="h-5 w-5 text-red-600" />,
    info: <AlertCircle className="h-5 w-5 text-blue-600" />,
  };

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      } ${styles[type]}`}
    >
      {icons[type]}
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        onClick={handleClose}
        className="text-slate-500 hover:text-slate-700 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

type ToastContainerProps = {
  toasts: Array<{ id: string; message: string; type?: ToastType }>;
  onRemove: (id: string) => void;
};

export const ToastContainer = ({ toasts, onRemove }: ToastContainerProps) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
};


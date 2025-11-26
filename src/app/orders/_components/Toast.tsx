'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';

type ToastProps = {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
};

export const Toast = ({ message, isVisible, onClose, duration = 3000 }: ToastProps) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(onClose, 300); // Wait for fade out animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible && !isAnimating) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-50 pointer-events-none transition-all duration-300 ${
        isAnimating && isVisible 
          ? 'opacity-100 translate-x-0' 
          : 'opacity-0 translate-x-full'
      }`}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl border border-slate-200 p-6 min-w-[320px] max-w-md pointer-events-auto transform transition-all duration-300 ${
          isAnimating && isVisible
            ? 'scale-100'
            : 'scale-95'
        }`}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 leading-relaxed">
              {message}
            </p>
          </div>
          <button
            onClick={() => {
              setIsAnimating(false);
              setTimeout(onClose, 300);
            }}
            className="flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};


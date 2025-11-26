'use client';

import { useEffect } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

type ConfirmDeleteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message: string;
  loading?: boolean;
};

export const ConfirmDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Deletion',
  message,
  loading = false,
}: ConfirmDeleteModalProps) => {
  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slideUp 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <p className="text-sm text-slate-700 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end gap-3 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium border border-slate-300 text-slate-700 bg-white rounded-lg hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 transition-all disabled:bg-red-300 disabled:text-white disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};


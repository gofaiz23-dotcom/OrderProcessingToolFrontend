'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/app/UserAuthentication/store/authStore';
import { ALLOWED_USERS } from '@/Shared/constant';

type UserAuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export const UserAuthModal = ({ isOpen, onClose, onSuccess }: UserAuthModalProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasUsers, setHasUsers] = useState(true);
  const login = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setPassword('');
      setShowPassword(false);
      setError('');
      // Check if users are configured
      try {
        setHasUsers(ALLOWED_USERS.length > 0);
      } catch (err) {
        console.error('Error checking ALLOWED_USERS:', err);
        setHasUsers(false);
      }
    }
  }, [isOpen]);

  // Close modal if user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      // Call onSuccess first to process any pending actions
      if (onSuccess) {
        onSuccess();
      }
      // Then close the modal
      onClose();
    }
  }, [isAuthenticated, isOpen, onClose, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Simulate a small delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 300));

      const success = login(username, password);

      if (success) {
        // Reset form
        setUsername('');
        setPassword('');
        // onSuccess will be called via useEffect when isAuthenticated changes
      } else {
        setError('Invalid username or password');
        setLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login. Please try again.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 rounded-full p-2">
              <LogIn className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Login Required
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-6">
            Please login to access logistics features.
          </p>

          {!hasUsers && (
            <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Configuration Error</p>
                  <p className="mt-1">No users configured. Please set NEXT_PUBLIC_ALLOWED_USERS environment variable.</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-all"
                placeholder="Enter your username"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  className="w-full px-4 py-3 pr-12 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-all"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 active:bg-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !username || !password || !hasUsers}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all disabled:bg-blue-300 disabled:text-white disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};


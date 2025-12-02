'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Eye, EyeOff } from 'lucide-react';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';
import { buildApiUrl } from '../../../../BaseUrl';
import { useLogisticsStore } from '@/store/logisticsStore';

type LogisticsAuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  carrier: string;
};

export const LogisticsAuthModal = ({ isOpen, onClose, carrier }: LogisticsAuthModalProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const { setToken, getToken } = useLogisticsStore();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setPassword('');
      setShowPassword(false);
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(buildApiUrl('/Logistics/Authenticate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(errorData.message || `Authentication failed: ${res.statusText}`);
      }

      const data = await res.json();
      
      // Store token in Zustand
      if (data.data?.token && data.shippingCompanyName) {
        setToken(carrier, data.data.token, data.shippingCompanyName);
        
        // Verify token is stored in Zustand
        const storedToken = getToken(carrier);
        if (storedToken) {
          console.log(`✅ Token successfully stored in Zustand for ${carrier}`);
          console.log(`Token exists: ${storedToken ? 'Yes' : 'No'}`);
        } else {
          console.error(`❌ Token was not stored in Zustand for ${carrier}`);
        }
        
        // Close modal first
        onClose();
        // Navigate to estes page on success
        if (carrier) {
          // Check if there's order information in sessionStorage (from order selection)
          let estesUrl = `/logistics/estes?carrier=${encodeURIComponent(carrier)}`;
          try {
            const orderDataStr = sessionStorage.getItem('selectedOrderForLogistics');
            if (orderDataStr) {
              const orderData = JSON.parse(orderDataStr);
              if (orderData.id) {
                estesUrl += `&orderId=${orderData.id}`;
              }
            }
          } catch (err) {
            // Ignore errors parsing sessionStorage
            console.warn('Could not parse order data from sessionStorage:', err);
          }
          window.location.href = estesUrl;
        }
      } else {
        throw new Error('Invalid response: token or shipping company name missing');
      }
    } catch (err) {
      setError(err);
    } finally {
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
          <h2 className="text-xl font-bold text-slate-900">
            Login - {carrier}
          </h2>
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
          <form onSubmit={handleSubmit} action="#" method="post" className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">
                ID / Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-all"
                placeholder="Enter your ID or username"
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

            {error !== null && (
              <div className="mt-4">
                <ErrorDisplay error={error} />
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
                disabled={loading || !username || !password}
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


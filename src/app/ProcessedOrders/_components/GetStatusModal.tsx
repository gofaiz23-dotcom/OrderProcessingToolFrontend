'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Loader2, Search, AlertCircle, ChevronDown } from 'lucide-react';
import { getShipmentHistory, type ShipmentHistoryParams } from '../utils/shipmentHistoryApi';
import { ShipmentHistoryModal } from './ShipmentHistoryModal';
import { useLogisticsStore } from '@/store/logisticsStore';
import { LogisticsAuthModal } from '@/app/components/shared/LogisticsAuthModal';

type SearchByType = 'pro' | 'po' | 'bol' | 'pur' | 'ldn' | 'exl' | 'interlinePro';

type GetStatusModalProps = {
  isOpen: boolean;
  onClose: () => void;
  orderId?: number;
  orderData?: {
    ordersJsonb?: Record<string, unknown>;
    bolResponseJsonb?: Record<string, unknown>;
    rateQuotesResponseJsonb?: Record<string, unknown>;
    pickupResponseJsonb?: Record<string, unknown>;
  };
};

export const GetStatusModal = ({
  isOpen,
  onClose,
  orderId,
  orderData,
}: GetStatusModalProps) => {
  const [searchBy, setSearchBy] = useState<SearchByType>('pro');
  const [trackingNumbers, setTrackingNumbers] = useState<string>('');
  const [fieldError, setFieldError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const initialAutoFillDone = useRef(false);
  const { getToken } = useLogisticsStore();
  
  // Default carrier for shipment tracking (can be made configurable)
  const carrier = 'estes';
  
  // Get token from store (will be refreshed on each render)
  const getAuthToken = () => {
    return getToken(carrier);
  };

  // Extract tracking numbers from order data and auto-fill
  useEffect(() => {
    if (orderData && isOpen) {
      const extractValue = (obj: Record<string, unknown>, keys: string[]): string => {
        for (const key of keys) {
          if (obj[key]) {
            const value = String(obj[key]);
            if (value && value.trim()) return value.trim();
          }
        }
        return '';
      };

      // Try to find all available tracking numbers and prioritize
      const findTrackingNumber = (): { type: SearchByType; value: string } | null => {
        // Check PRO first (most common)
        let proValue = extractValue(orderData.ordersJsonb || {}, ['pro', 'PRO', 'Pro', 'trackingNumber', 'tracking_number']);
        if (!proValue && orderData.pickupResponseJsonb) {
          proValue = extractValue(orderData.pickupResponseJsonb, ['Pro', 'pro', 'PRO', 'pickupRequestNumber']);
        }
        if (proValue && /^\d{10}$/.test(proValue)) {
          return { type: 'pro', value: proValue };
        }

        // Check BOL
        const bolValue = extractValue(orderData.bolResponseJsonb || {}, ['bol', 'BOL', 'Bol', 'billOfLading', 'bill_of_lading', 'bolNumber', 'bol_number']);
        if (bolValue) {
          return { type: 'bol', value: bolValue };
        }

        // Check PUR
        let purValue = extractValue(orderData.rateQuotesResponseJsonb || {}, ['pur', 'PUR', 'Pur', 'pickupRequest', 'pickup_request']);
        if (!purValue && orderData.pickupResponseJsonb) {
          purValue = extractValue(orderData.pickupResponseJsonb, ['pur', 'PUR', 'Pur', 'pickupRequestNumber']);
        }
        if (purValue) {
          return { type: 'pur', value: purValue };
        }

        // Check PO
        const poValue = extractValue(orderData.ordersJsonb || {}, ['po', 'PO', 'Po', 'purchaseOrder', 'purchase_order']);
        if (poValue) {
          return { type: 'po', value: poValue };
        }

        // Check LDN
        const ldnValue = extractValue(orderData.ordersJsonb || {}, ['ldn', 'LDN', 'Ldn', 'loadNumber', 'load_number']);
        if (ldnValue) {
          return { type: 'ldn', value: ldnValue };
        }

        // Check EXL
        const exlValue = extractValue(orderData.ordersJsonb || {}, ['exl', 'EXL', 'Exl', 'exlaId', 'exla_id']);
        if (exlValue) {
          return { type: 'exl', value: exlValue };
        }

        // Check Interline PRO
        const interlineProValue = extractValue(orderData.ordersJsonb || {}, ['interlinePro', 'interline_pro', 'InterlinePro', 'interlinePRO']);
        if (interlineProValue) {
          return { type: 'interlinePro', value: interlineProValue };
        }

        return null;
      };

      const trackingInfo = findTrackingNumber();
      if (trackingInfo) {
        setSearchBy(trackingInfo.type);
        setTrackingNumbers(trackingInfo.value);
        setFieldError('');
        initialAutoFillDone.current = true;
      }
    } else {
      initialAutoFillDone.current = false;
    }
  }, [orderData, isOpen]);

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

  // Auto-fill when searchBy changes (only if user manually changed it after initial auto-fill)
  useEffect(() => {
    // Skip if initial auto-fill just happened
    if (!initialAutoFillDone.current && orderData && isOpen) {
      return;
    }

    if (orderData && isOpen) {
      const extractValue = (obj: Record<string, unknown>, keys: string[]): string => {
        for (const key of keys) {
          if (obj[key]) {
            const value = String(obj[key]);
            if (value && value.trim()) return value.trim();
          }
        }
        return '';
      };

      let value = '';
      
      switch (searchBy) {
        case 'pro':
          value = extractValue(orderData.ordersJsonb || {}, ['pro', 'PRO', 'Pro', 'trackingNumber', 'tracking_number']);
          if (!value && orderData.pickupResponseJsonb) {
            value = extractValue(orderData.pickupResponseJsonb, ['Pro', 'pro', 'PRO', 'pickupRequestNumber']);
          }
          break;
        case 'po':
          value = extractValue(orderData.ordersJsonb || {}, ['po', 'PO', 'Po', 'purchaseOrder', 'purchase_order']);
          break;
        case 'bol':
          value = extractValue(orderData.bolResponseJsonb || {}, ['bol', 'BOL', 'Bol', 'billOfLading', 'bill_of_lading', 'bolNumber', 'bol_number']);
          break;
        case 'pur':
          value = extractValue(orderData.rateQuotesResponseJsonb || {}, ['pur', 'PUR', 'Pur', 'pickupRequest', 'pickup_request']);
          if (!value && orderData.pickupResponseJsonb) {
            value = extractValue(orderData.pickupResponseJsonb, ['pur', 'PUR', 'Pur', 'pickupRequestNumber']);
          }
          break;
        case 'ldn':
          value = extractValue(orderData.ordersJsonb || {}, ['ldn', 'LDN', 'Ldn', 'loadNumber', 'load_number']);
          break;
        case 'exl':
          value = extractValue(orderData.ordersJsonb || {}, ['exl', 'EXL', 'Exl', 'exlaId', 'exla_id']);
          break;
        case 'interlinePro':
          value = extractValue(orderData.ordersJsonb || {}, ['interlinePro', 'interline_pro', 'InterlinePro', 'interlinePRO']);
          break;
      }

      // Auto-fill if value exists
      if (value) {
        setTrackingNumbers(value);
        setFieldError('');
      }
    }
  }, [searchBy, orderData, isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchBy('pro');
      setTrackingNumbers('');
      setFieldError('');
      setError(null);
      setHistoryData(null);
      setShowHistoryModal(false);
      initialAutoFillDone.current = false;
    }
  }, [isOpen]);

  const handleClear = () => {
    setTrackingNumbers('');
    setFieldError('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError('');
    setError(null);
    setHistoryData(null);

    // Validate tracking numbers
    const numbers = trackingNumbers.trim().split('\n').filter(n => n.trim());
    if (numbers.length === 0) {
      setFieldError('This field is required.');
      return;
    }

    // Get token fresh from store each time
    const token = getAuthToken();
    if (!token || token.trim() === '') {
      setIsAuthModalOpen(true);
      setError('Authentication required. Please login to continue.');
      return;
    }

    setLoading(true);

    try {
      // For now, use the first tracking number
      // In the future, you might want to handle multiple numbers
      const firstNumber = numbers[0].trim();

      const params: ShipmentHistoryParams = {
        pro: searchBy === 'pro' ? firstNumber : null,
        po: searchBy === 'po' ? firstNumber : null,
        bol: searchBy === 'bol' ? firstNumber : null,
        pur: searchBy === 'pur' ? firstNumber : null,
        ldn: searchBy === 'ldn' ? firstNumber : null,
        exl: searchBy === 'exl' ? firstNumber : null,
        interlinePro: searchBy === 'interlinePro' ? firstNumber : null,
      };

      // Remove null/empty values
      Object.keys(params).forEach((key) => {
        if (params[key as keyof ShipmentHistoryParams] === null || params[key as keyof ShipmentHistoryParams] === '') {
          delete params[key as keyof ShipmentHistoryParams];
        }
      });

      // Make sure token is passed
      if (!token) {
        throw new Error('Authentication token is missing. Please login again.');
      }

      const data = await getShipmentHistory(params, token);
      setHistoryData(data);
      setShowHistoryModal(true);
      onClose(); // Close the GetStatusModal when history is fetched
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch shipment history';
      setError(errorMessage);
      
      // Check if error is related to authentication
      if (
        errorMessage.includes('401') || 
        errorMessage.includes('Unauthorized') || 
        errorMessage.includes('Authentication required') ||
        errorMessage.includes('authenticate') ||
        errorMessage.includes('token')
      ) {
        setIsAuthModalOpen(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const searchByOptions = [
    { value: 'pro', label: 'PRO Number' },
    { value: 'po', label: 'PO' },
    { value: 'bol', label: 'BOL' },
    { value: 'pur', label: 'PUR' },
    { value: 'ldn', label: 'LDN' },
    { value: 'exl', label: 'EXL' },
    { value: 'interlinePro', label: 'Interline PRO' },
  ];

  return (
    <>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 relative z-[10000]">
          <div className="p-6">
            {/* Header with title and red line */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Shipment Tracking</h2>
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="text-black hover:text-black transition-colors disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="h-1 bg-red-600 w-full mt-2"></div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Search by dropdown */}
                  <div className="relative">
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Search by <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={searchBy}
                        onChange={(e) => {
                          const newSearchBy = e.target.value as SearchByType;
                          setSearchBy(newSearchBy);
                          // Don't clear tracking numbers - let the auto-fill effect handle it
                          setFieldError('');
                        }}
                        disabled={loading}
                        className="w-full px-3 py-2 pr-10 text-black border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 appearance-none bg-white relative"
                      >
                        {searchByOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <ChevronDown className="h-5 w-5 text-slate-800" />
                      </div>
                    </div>
                  </div>

                  {/* Tracking numbers textarea */}
                  <div>
                    <textarea
                      value={trackingNumbers}
                      onChange={(e) => {
                        setTrackingNumbers(e.target.value);
                        setFieldError('');
                      }}
                      disabled={loading}
                      placeholder="Enter tracking numbers. One per line."
                      rows={6}
                      className={`w-full px-3 py-2 text-black border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 resize-y ${
                        fieldError ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                    {fieldError && (
                      <p className="text-red-600 text-sm mt-1">{fieldError}</p>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-6 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={loading || !trackingNumbers.trim()}
                    className="px-6 py-2 text-sm font-bold text-black bg-yellow-400 hover:bg-yellow-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        SEARCH
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={loading}
                    className="px-6 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Shipment History Modal */}
      {showHistoryModal && historyData && (
        <ShipmentHistoryModal
          isOpen={showHistoryModal}
          onClose={() => {
            setShowHistoryModal(false);
            setHistoryData(null);
          }}
          data={historyData}
          loading={false}
          error={null}
        />
      )}

      {/* Logistics Authentication Modal */}
      <LogisticsAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          // After authentication, token will be available in store
          // Clear error so user can try again
          setError(null);
        }}
        carrier={carrier}
      />
    </>
  );
};


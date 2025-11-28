'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Search, AlertCircle } from 'lucide-react';
import { getShipmentHistory, type ShipmentHistoryParams } from '../utils/shipmentHistoryApi';
import { ShipmentHistoryModal } from './ShipmentHistoryModal';

type GetStatusModalProps = {
  isOpen: boolean;
  onClose: () => void;
  orderId?: number;
  orderData?: {
    ordersJsonb?: Record<string, unknown>;
    bolResponseJsonb?: Record<string, unknown>;
    rateQuotesResponseJsonb?: Record<string, unknown>;
  };
};

export const GetStatusModal = ({
  isOpen,
  onClose,
  orderId,
  orderData,
}: GetStatusModalProps) => {
  const [pro, setPro] = useState<string>('');
  const [po, setPo] = useState<string>('');
  const [bol, setBol] = useState<string>('');
  const [pur, setPur] = useState<string>('');
  const [ldn, setLdn] = useState<string>('');
  const [exl, setExl] = useState<string>('');
  const [interlinePro, setInterlinePro] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Extract tracking numbers from order data and auto-fetch if available
  useEffect(() => {
    if (orderData && isOpen) {
      // Try to extract PRO from various JSONB fields
      const extractValue = (obj: Record<string, unknown>, keys: string[]): string => {
        for (const key of keys) {
          if (obj[key]) {
            const value = String(obj[key]);
            if (value && value.trim()) return value.trim();
          }
        }
        return '';
      };

      let hasTrackingData = false;

      // Extract PRO (10 digits)
      const proValue = extractValue(orderData.ordersJsonb || {}, ['pro', 'PRO', 'Pro', 'trackingNumber', 'tracking_number']);
      if (proValue && /^\d{10}$/.test(proValue)) {
        setPro(proValue);
        hasTrackingData = true;
      }

      // Extract BOL
      const bolValue = extractValue(orderData.bolResponseJsonb || {}, ['bol', 'BOL', 'Bol', 'billOfLading', 'bill_of_lading']);
      if (bolValue) {
        setBol(bolValue);
        hasTrackingData = true;
      }

      // Extract PO
      const poValue = extractValue(orderData.ordersJsonb || {}, ['po', 'PO', 'Po', 'purchaseOrder', 'purchase_order']);
      if (poValue) {
        setPo(poValue);
        hasTrackingData = true;
      }

      // Extract PUR
      const purValue = extractValue(orderData.rateQuotesResponseJsonb || {}, ['pur', 'PUR', 'Pur', 'pickupRequest', 'pickup_request']);
      if (purValue) {
        setPur(purValue);
        hasTrackingData = true;
      }

      // Auto-fetch if we have tracking data
      if (hasTrackingData) {
        const fetchStatus = async () => {
          setLoading(true);
          setError(null);
          setHistoryData(null);

          try {
            const params: ShipmentHistoryParams = {
              pro: proValue && /^\d{10}$/.test(proValue) ? proValue : null,
              po: poValue || null,
              bol: bolValue || null,
              pur: purValue || null,
              ldn: null,
              exl: null,
              interlinePro: null,
            };

            // Remove null/empty values
            Object.keys(params).forEach((key) => {
              if (params[key as keyof ShipmentHistoryParams] === null || params[key as keyof ShipmentHistoryParams] === '') {
                delete params[key as keyof ShipmentHistoryParams];
              }
            });

            if (Object.keys(params).length > 0) {
              const data = await getShipmentHistory(params);
              setHistoryData(data);
              setShowHistoryModal(true);
              onClose(); // Close the GetStatusModal when history is fetched
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch shipment history');
          } finally {
            setLoading(false);
          }
        };

        // Small delay to ensure state is set
        setTimeout(() => {
          fetchStatus();
        }, 200);
      }
    }
  }, [orderData, isOpen, onClose]);

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

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPro('');
      setPo('');
      setBol('');
      setPur('');
      setLdn('');
      setExl('');
      setInterlinePro('');
      setError(null);
      setHistoryData(null);
      setShowHistoryModal(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setHistoryData(null);

    try {
      const params: ShipmentHistoryParams = {
        pro: pro || null,
        po: po || null,
        bol: bol || null,
        pur: pur || null,
        ldn: ldn || null,
        exl: exl || null,
        interlinePro: interlinePro || null,
      };

      // Remove null/empty values
      Object.keys(params).forEach((key) => {
        if (params[key as keyof ShipmentHistoryParams] === null || params[key as keyof ShipmentHistoryParams] === '') {
          delete params[key as keyof ShipmentHistoryParams];
        }
      });

      if (Object.keys(params).length === 0) {
        throw new Error('Please provide at least one tracking number');
      }

      const data = await getShipmentHistory(params);
      setHistoryData(data);
      setShowHistoryModal(true);
      onClose(); // Close the GetStatusModal when history is fetched
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch shipment history');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Get Shipment Status</h2>
              <button
                onClick={onClose}
                disabled={loading}
                className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Note */}
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> If using PRO, also include BOL for better tracking accuracy.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1">
                    PRO <span className="text-slate-500 text-xs">(10 digits)</span>
                  </label>
                  <input
                    type="text"
                    value={pro}
                    onChange={(e) => setPro(e.target.value)}
                    disabled={loading}
                    placeholder="2998186253"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-1">
                      PO <span className="text-slate-500 text-xs">(1-15 chars)</span>
                    </label>
                    <input
                      type="text"
                      value={po}
                      onChange={(e) => setPo(e.target.value)}
                      disabled={loading}
                      placeholder="Purchase Order"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-1">
                      BOL <span className="text-slate-500 text-xs">(1-25 chars)</span>
                    </label>
                    <input
                      type="text"
                      value={bol}
                      onChange={(e) => setBol(e.target.value)}
                      disabled={loading}
                      placeholder="Bill Of Lading"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-1">
                      PUR <span className="text-slate-500 text-xs">(1-10 chars)</span>
                    </label>
                    <input
                      type="text"
                      value={pur}
                      onChange={(e) => setPur(e.target.value)}
                      disabled={loading}
                      placeholder="Pickup Request"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-1">
                      LDN <span className="text-slate-500 text-xs">(1-25 chars)</span>
                    </label>
                    <input
                      type="text"
                      value={ldn}
                      onChange={(e) => setLdn(e.target.value)}
                      disabled={loading}
                      placeholder="Load Number"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-1">
                      EXL <span className="text-slate-500 text-xs">(1-25 chars)</span>
                    </label>
                    <input
                      type="text"
                      value={exl}
                      onChange={(e) => setExl(e.target.value)}
                      disabled={loading}
                      placeholder="EXLA-ID Number"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-1">
                      Interline PRO
                    </label>
                    <input
                      type="text"
                      value={interlinePro}
                      onChange={(e) => setInterlinePro(e.target.value)}
                      disabled={loading}
                      placeholder="Interline PRO"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || (!pro && !po && !bol && !pur && !ldn && !exl && !interlinePro)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Get Status
                    </>
                  )}
                </button>
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
    </>
  );
};


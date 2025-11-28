'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Search, AlertCircle, ChevronDown, ChevronUp, CheckCircle, Circle, Truck } from 'lucide-react';
import { getShipmentHistory, type ShipmentHistoryParams, type ShipmentHistoryResponse } from '../utils/shipmentHistoryApi';
import { useLogisticsStore } from '@/store/logisticsStore';

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
  const getToken = useLogisticsStore((state) => state.getToken);
  const [searchBy, setSearchBy] = useState<SearchByType>('pro');
  const [trackingNumbers, setTrackingNumbers] = useState<string>('');
  const [fieldError, setFieldError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<ShipmentHistoryResponse | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    shipmentDetails: false,
    deliveryDetails: false,
    movementHistory: false,
  });

  // Extract first available tracking number from order data and auto-fill
  useEffect(() => {
    if (orderData && isOpen && !loading) {
      const extractValue = (obj: Record<string, unknown>, keys: string[]): string => {
        for (const key of keys) {
          if (obj[key]) {
            const value = String(obj[key]);
            if (value && value.trim()) return value.trim();
          }
        }
        return '';
      };

      // Find the first available tracking number in priority order
      let foundTracking: { type: SearchByType; value: string } | null = null;

      // 1. PRO - check bolResponseJsonb first (highest priority)
      let value = '';
      if (orderData.bolResponseJsonb) {
        value = extractValue(orderData.bolResponseJsonb, ['pro', 'PRO', 'Pro']);
        if (value) {
          foundTracking = { type: 'pro', value };
        }
      }
      // Check ordersJsonb for PRO
      if (!foundTracking) {
        value = extractValue(orderData.ordersJsonb || {}, ['pro', 'PRO', 'Pro', 'trackingNumber', 'tracking_number']);
        if (value) {
          foundTracking = { type: 'pro', value };
        }
      }
      // Check pickupResponseJsonb for PRO
      if (!foundTracking && orderData.pickupResponseJsonb) {
        value = extractValue(orderData.pickupResponseJsonb, ['Pro', 'pro', 'PRO', 'pickupRequestNumber']);
        if (value) {
          foundTracking = { type: 'pro', value };
        }
      }

      // 2. BOL
      if (!foundTracking && orderData.bolResponseJsonb) {
        value = extractValue(orderData.bolResponseJsonb, ['bol', 'BOL', 'Bol', 'billOfLading', 'bill_of_lading', 'bolNumber']);
        if (value) {
          foundTracking = { type: 'bol', value };
        }
      }

      // 3. PUR
      if (!foundTracking) {
        value = extractValue(orderData.rateQuotesResponseJsonb || {}, ['pur', 'PUR', 'Pur', 'pickupRequest', 'pickup_request']);
        if (value) {
          foundTracking = { type: 'pur', value };
        }
      }
      if (!foundTracking && orderData.pickupResponseJsonb) {
        value = extractValue(orderData.pickupResponseJsonb, ['pur', 'PUR', 'Pur', 'pickupRequestNumber']);
        if (value) {
          foundTracking = { type: 'pur', value };
        }
      }

      // 4. PO
      if (!foundTracking) {
        value = extractValue(orderData.ordersJsonb || {}, ['po', 'PO', 'Po', 'purchaseOrder', 'purchase_order']);
        if (value) {
          foundTracking = { type: 'po', value };
        }
      }

      // 5. LDN
      if (!foundTracking) {
        value = extractValue(orderData.ordersJsonb || {}, ['ldn', 'LDN', 'Ldn', 'loadNumber', 'load_number']);
        if (value) {
          foundTracking = { type: 'ldn', value };
        }
      }

      // 6. EXL
      if (!foundTracking) {
        value = extractValue(orderData.ordersJsonb || {}, ['exl', 'EXL', 'Exl', 'exlaId', 'exla_id']);
        if (value) {
          foundTracking = { type: 'exl', value };
        }
      }

      // 7. Interline PRO
      if (!foundTracking) {
        value = extractValue(orderData.ordersJsonb || {}, ['interlinePro', 'interline_pro', 'InterlinePro']);
        if (value) {
          foundTracking = { type: 'interlinePro', value };
        }
      }

      // Fill the form with the first found tracking number
      if (foundTracking) {
        setSearchBy(foundTracking.type);
        setTrackingNumbers(foundTracking.value);
        setFieldError('');
      }
    }
  }, [orderData, isOpen, loading]);

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
      setSearchBy('pro');
      setTrackingNumbers('');
      setFieldError('');
      setError(null);
      setHistoryData(null);
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

      // Get bearer token from Zustand store (for 'estes' carrier)
      const token = getToken('estes');

      const data = await getShipmentHistory(params, token || undefined);
      setHistoryData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch shipment history');
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

  const formatValue = (value: string | number | boolean | undefined | null): string => {
    if (value === null || value === undefined || value === '') return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  const formatDate = (date?: string, time?: string): string => {
    if (!date) return 'N/A';
    if (time) {
      return `${date} ${time}`;
    }
    return date;
  };

  const formatAddress = (address?: {
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }): string => {
    if (!address) return 'N/A';
    const parts: string[] = [];
    if (address.line && address.line.length > 0) parts.push(address.line.join(', '));
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.postalCode) parts.push(address.postalCode);
    if (address.country) parts.push(address.country);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  const getStatusColor = (status?: string): string => {
    if (!status) return 'text-slate-500';
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('delivered')) return 'text-green-600';
    if (lowerStatus.includes('transit')) return 'text-blue-600';
    if (lowerStatus.includes('picked')) return 'text-green-600';
    return 'text-slate-500';
  };

  const getStatusStage = (status?: string): { pickedUp: boolean; inTransit: boolean; outForDelivery: boolean; delivered: boolean } => {
    if (!status) return { pickedUp: false, inTransit: false, outForDelivery: false, delivered: false };
    const lowerStatus = status.toLowerCase();
    return {
      pickedUp: lowerStatus.includes('picked') || lowerStatus.includes('pickup'),
      inTransit: lowerStatus.includes('transit') || lowerStatus.includes('in transit'),
      outForDelivery: lowerStatus.includes('delivery') && !lowerStatus.includes('delivered'),
      delivered: lowerStatus.includes('delivered'),
    };
  };

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const shipment = historyData?.data?.data?.[0];
  const status = shipment?.status?.conciseStatus || 'Unknown';
  const statusStages = getStatusStage(status);
  const bolNumber = shipment?.documentReference?.find(doc => 
    doc.documentType?.toLowerCase().includes('lading') || 
    doc.documentType?.toLowerCase().includes('bol')
  )?.id || 'N/A';

  return (
    <>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-100 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-lg max-w-5xl w-full mx-4 my-8 relative z-[10000] max-h-[90vh] flex flex-col">
          <div className="p-6 overflow-y-auto flex-1">
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
                          setSearchBy(e.target.value as SearchByType);
                          setTrackingNumbers('');
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

            {/* Tracking Details Display */}
            {historyData && shipment && (
              <div className="mt-6 space-y-4">
                <div className="h-px bg-slate-200"></div>
                
                {/* Summary Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">PRO Number</p>
                      <p className="text-sm font-semibold text-slate-900">{formatValue(shipment.pro)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">BOL Number</p>
                      <p className="text-sm font-semibold text-slate-900">{bolNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Pickup Date</p>
                      <p className="text-sm font-semibold text-slate-900">{formatDate(shipment.pickupDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Status</p>
                      <p className={`text-sm font-semibold ${getStatusColor(status)}`}>{status}</p>
                    </div>
                  </div>
                </div>

                {/* Status Progress */}
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    {[
                      { label: 'Picked Up', completed: statusStages.pickedUp, icon: CheckCircle },
                      { label: 'In Transit', completed: statusStages.inTransit, icon: Truck },
                      { label: 'Out for Delivery', completed: statusStages.outForDelivery, icon: Circle },
                      { label: 'Delivered', completed: statusStages.delivered, icon: CheckCircle },
                    ].map((stage, index) => {
                      const Icon = stage.icon;
                      const isActive = stage.completed;
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                            isActive ? 'bg-green-100' : 'bg-slate-100'
                          }`}>
                            <Icon className={`h-4 w-4 ${isActive ? 'text-green-600' : 'text-slate-400'}`} />
                          </div>
                          <span className={`text-xs font-medium ${isActive ? 'text-green-600' : 'text-slate-400'}`}>
                            {stage.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Status Message */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-green-800">
                    {formatValue(shipment.status?.expandedStatus || shipment.status?.conciseStatus)}
                  </span>
                </div>

                {/* Shipment Details */}
                <div className="border border-slate-200 rounded-lg">
                  <button
                    onClick={() => toggleSection('shipmentDetails')}
                    className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <h3 className="text-sm font-semibold text-slate-900">Shipment Details</h3>
                    {collapsedSections.shipmentDetails ? (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    )}
                  </button>
                  {!collapsedSections.shipmentDetails && (
                    <div className="p-4 grid grid-cols-2 gap-4 bg-white">
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1">Shipper Name</p>
                        <p className="text-sm font-medium text-slate-900">{formatValue(shipment.shipperParty?.name)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1">Shipper Address</p>
                        <p className="text-sm text-slate-700">{formatAddress(shipment.shipperParty?.address)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1">Consignee Name</p>
                        <p className="text-sm font-medium text-slate-900">{formatValue(shipment.consigneeParty?.name)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1">Consignee Address</p>
                        <p className="text-sm text-slate-700">{formatAddress(shipment.consigneeParty?.address)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1">Pieces</p>
                        <p className="text-sm font-medium text-slate-900">{formatValue(shipment.piecesCount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase mb-1">Weight (lbs.)</p>
                        <p className="text-sm font-medium text-slate-900">{formatValue(shipment.totalWeight)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Delivery Details */}
                {shipment.deliveryDate && (
                  <div className="border border-slate-200 rounded-lg">
                    <button
                      onClick={() => toggleSection('deliveryDetails')}
                      className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <h3 className="text-sm font-semibold text-slate-900">Delivery Details</h3>
                      {collapsedSections.deliveryDetails ? (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronUp className="h-4 w-4 text-slate-500" />
                      )}
                    </button>
                    {!collapsedSections.deliveryDetails && (
                      <div className="p-4 grid grid-cols-2 gap-4 bg-white">
                        <div>
                          <p className="text-xs text-slate-500 uppercase mb-1">Delivery Date</p>
                          <p className="text-sm font-medium text-slate-900">{formatDate(shipment.deliveryDate, shipment.deliveryTime)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase mb-1">Received By</p>
                          <p className="text-sm font-medium text-slate-900">{formatValue(shipment.receivedBy)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase mb-1">Transit Days</p>
                          <p className="text-sm font-medium text-slate-900">{formatValue(shipment.transitDays)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Movement History */}
                {shipment.movementHistory && shipment.movementHistory.length > 0 && (
                  <div className="border border-slate-200 rounded-lg">
                    <button
                      onClick={() => toggleSection('movementHistory')}
                      className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <h3 className="text-sm font-semibold text-slate-900">Movement History</h3>
                      {collapsedSections.movementHistory ? (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronUp className="h-4 w-4 text-slate-500" />
                      )}
                    </button>
                    {!collapsedSections.movementHistory && (
                      <div className="p-4 space-y-3 bg-white">
                        {shipment.movementHistory.map((movement, index) => (
                          <div key={index} className="border-l-2 border-blue-500 pl-4 py-2">
                            <p className="text-sm font-medium text-slate-900">{formatValue(movement.description)}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {formatValue(movement.location?.name)} - {formatDate(movement.statusHistory?.[0]?.referenceDate, movement.statusHistory?.[0]?.referenceTime)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};



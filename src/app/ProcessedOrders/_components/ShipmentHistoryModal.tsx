'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Download, ChevronDown, ChevronUp, HelpCircle, Mail, Truck, CheckCircle, Circle } from 'lucide-react';
import type { ShipmentHistoryResponse } from '../utils/shipmentHistoryApi';

type ShipmentHistoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  data: ShipmentHistoryResponse | null;
  loading: boolean;
  error: string | null;
};

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
  if (lowerStatus.includes('transit')) return 'text-green-600';
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

export const ShipmentHistoryModal = ({
  isOpen,
  onClose,
  data,
  loading,
  error,
}: ShipmentHistoryModalProps) => {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    shipmentHistory: true,
    shipmentDetails: false,
    deliveryDetails: false,
    referenceNumbers: false,
    destinationTerminal: false,
  });
  const [allCollapsed, setAllCollapsed] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const toggleAllSections = () => {
    const newState = !allCollapsed;
    setAllCollapsed(newState);
    setCollapsedSections({
      shipmentHistory: newState,
      shipmentDetails: newState,
      deliveryDetails: newState,
      referenceNumbers: newState,
      destinationTerminal: newState,
    });
  };

  if (!isOpen) return null;

  const shipment = data?.data?.data?.[0];
  const status = shipment?.status?.conciseStatus || 'Unknown';
  const statusStages = getStatusStage(status);

  // Extract BOL from documentReference
  const bolNumber = shipment?.documentReference?.find(doc => 
    doc.documentType?.toLowerCase().includes('lading') || 
    doc.documentType?.toLowerCase().includes('bol')
  )?.id || 'N/A';

  // Calculate estimated delivery date range (example logic)
  const estimatedDelivery = shipment?.deliveryDate 
    ? `${shipment.deliveryDate} - ${shipment.deliveryDate}` 
    : 'N/A';

  return (
    <div className="fixed inset-0 z-[10001] flex items-start justify-center bg-gray-100 overflow-y-auto">
      <div className="bg-white w-full max-w-7xl mx-auto my-8 shadow-lg">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-slate-900">Tracking Results</h1>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download Results
              </button>
              <button 
                onClick={toggleAllSections}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"
              >
                {allCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                Collapse All
              </button>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2">
              <Mail className="h-4 w-4" />
              GET EMAIL UPDATES
            </button>
            <span className="text-sm text-slate-600">Get email updates for undelivered shipments selected below.</span>
          </div>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-slate-600">Loading tracking results...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {!loading && !error && shipment && (
            <div className="space-y-6">
              {/* Summary Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                        <input type="checkbox" className="rounded" />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">PRO Number</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Pickup Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">BOL Number</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                        <div className="flex items-center gap-1">
                          Estimated Delivery
                          <HelpCircle className="h-4 w-4 text-blue-500" />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    <tr className="border-t border-slate-200">
                      <td className="px-4 py-4">
                        <input type="checkbox" className="rounded" />
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-slate-900">{formatValue(shipment.pro)}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{formatDate(shipment.pickupDate)}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{bolNumber}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{estimatedDelivery}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(status).replace('text-', 'bg-')}`}></div>
                          <span className={`text-sm font-medium ${getStatusColor(status)}`}>{status}</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Status Progress Bar */}
              <div className="border border-slate-200 rounded-lg p-6 bg-white">
                <div className="flex items-center justify-between mb-4">
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
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                          isActive ? 'bg-green-100' : 'bg-slate-100'
                        }`}>
                          <Icon className={`h-5 w-5 ${isActive ? 'text-green-600' : 'text-slate-400'}`} />
                        </div>
                        <span className={`text-sm font-medium ${isActive ? 'text-green-600' : 'text-slate-400'}`}>
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Message Bar */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <Truck className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  {formatValue(shipment.status?.expandedStatus || shipment.status?.conciseStatus)}
                </span>
              </div>

              {/* Shipment Details Section */}
              <div className="border border-slate-200 rounded-lg">
                <button
                  onClick={() => toggleSection('shipmentDetails')}
                  className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-slate-900">Shipment Details</h3>
                  {collapsedSections.shipmentDetails ? (
                    <ChevronDown className="h-5 w-5 text-slate-500" />
                  ) : (
                    <ChevronUp className="h-5 w-5 text-slate-500" />
                  )}
                </button>
                {!collapsedSections.shipmentDetails && (
                  <div className="p-6 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Shipper Name</p>
                      <p className="text-sm font-medium text-slate-900">{formatValue(shipment.shipperParty?.name)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Shipper Address</p>
                      <p className="text-sm text-slate-700">{formatAddress(shipment.shipperParty?.address)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Pickup Date</p>
                      <p className="text-sm font-medium text-slate-900">{formatDate(shipment.pickupDate, shipment.pickupTime)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Pieces</p>
                      <p className="text-sm font-medium text-slate-900">{formatValue(shipment.piecesCount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Weight (lbs.)</p>
                      <p className="text-sm font-medium text-slate-900">{formatValue(shipment.totalWeight)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Freight Charges</p>
                      <p className="text-sm font-medium text-slate-900">
                        {shipment.freightCharges ? `$${shipment.freightCharges}` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Transit Days</p>
                      <p className="text-sm font-medium text-slate-900">{formatValue(shipment.transitDays)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Shipment History Section */}
              <div className="border border-slate-200 rounded-lg">
                <button
                  onClick={() => toggleSection('shipmentHistory')}
                  className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-slate-900">Shipment History</h3>
                  {collapsedSections.shipmentHistory ? (
                    <ChevronDown className="h-5 w-5 text-slate-500" />
                  ) : (
                    <ChevronUp className="h-5 w-5 text-slate-500" />
                  )}
                </button>
                {!collapsedSections.shipmentHistory && (
                  <div className="p-6">
                    {shipment.movementHistory && shipment.movementHistory.length > 0 ? (
                      <div className="space-y-4">
                        {shipment.movementHistory.map((movement, index) => (
                          <div key={index} className="border border-slate-200 rounded-lg p-4">
                            <p className="text-sm font-medium text-slate-900 mb-2">{formatValue(movement.description)}</p>
                            <p className="text-xs text-slate-500">{formatValue(movement.transportEventTypeCode)}</p>
                            {movement.location && (
                              <p className="text-xs text-slate-600 mt-2">{formatAddress(movement.location.address)}</p>
                            )}
                            {movement.statusHistory && movement.statusHistory.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {movement.statusHistory.map((status, statusIndex) => (
                                  <div key={statusIndex} className="text-xs text-slate-600">
                                    <span className="font-medium">{formatValue(status.conciseStatus)}</span>
                                    {' - '}
                                    <span>{formatValue(status.referenceDate)} {formatValue(status.referenceTime)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No shipment history available</p>
                    )}
                  </div>
                )}
              </div>

              {/* Delivery Details Section */}
              <div className="border border-slate-200 rounded-lg">
                <button
                  onClick={() => toggleSection('deliveryDetails')}
                  className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-slate-900">Delivery Details</h3>
                  {collapsedSections.deliveryDetails ? (
                    <ChevronDown className="h-5 w-5 text-slate-500" />
                  ) : (
                    <ChevronUp className="h-5 w-5 text-slate-500" />
                  )}
                </button>
                {!collapsedSections.deliveryDetails && (
                  <div className="p-6 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Consignee Name</p>
                      <p className="text-sm font-medium text-slate-900">{formatValue(shipment.consigneeParty?.name)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Consignee Address</p>
                      <p className="text-sm text-slate-700">{formatAddress(shipment.consigneeParty?.address)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Appointment Date</p>
                      <p className="text-sm font-medium text-slate-900">
                        {formatDate(shipment.deliveryDate, shipment.deliveryTime)}
                        {shipment.deliveryDate && (
                          <a href="#" className="ml-2 text-blue-600 text-xs hover:underline">
                            View in Appointment Research Tool
                          </a>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Appointment Status</p>
                      <p className="text-sm font-medium text-slate-900">Customer requested appointment</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Estimated Delivery Date</p>
                      <p className="text-sm font-medium text-slate-900">{estimatedDelivery}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Driver Name</p>
                      <p className="text-sm font-medium text-slate-900">{formatValue(shipment.driverInfo?.name)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Delivery Receipt</p>
                      <p className="text-xs text-slate-600">
                        Image not available. A Delivery Receipt typically takes up to 48 hours to process after delivery.
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">W&R Certificate</p>
                      <p className="text-xs text-slate-600">
                        Image not available. Weight & Research images typically take up to 48 hours to process after delivery.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Reference Numbers Section */}
              <div className="border border-slate-200 rounded-lg">
                <button
                  onClick={() => toggleSection('referenceNumbers')}
                  className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-slate-900">Reference Numbers</h3>
                  {collapsedSections.referenceNumbers ? (
                    <ChevronDown className="h-5 w-5 text-slate-500" />
                  ) : (
                    <ChevronUp className="h-5 w-5 text-slate-500" />
                  )}
                </button>
                {!collapsedSections.referenceNumbers && (
                  <div className="p-6 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Estes PRO Number</p>
                      <p className="text-sm font-medium text-slate-900">{formatValue(shipment.pro)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Shipper Bill of Lading Number</p>
                      <p className="text-sm font-medium text-slate-900">
                        {bolNumber}
                        {bolNumber !== 'N/A' && (
                          <a href="#" className="ml-2 text-blue-600 text-xs hover:underline">View</a>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">DIM</p>
                      <p className="text-sm font-medium text-slate-900">{formatValue(shipment.cube)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Purchase Order Number</p>
                      <p className="text-sm font-medium text-slate-900">NS</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Estes Pickup Request Number</p>
                      <p className="text-sm font-medium text-slate-900">{formatValue(shipment.pickupRequestNumber)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Destination Terminal Section */}
              <div className="border border-slate-200 rounded-lg">
                <button
                  onClick={() => toggleSection('destinationTerminal')}
                  className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-slate-900">Destination Terminal</h3>
                  {collapsedSections.destinationTerminal ? (
                    <ChevronDown className="h-5 w-5 text-slate-500" />
                  ) : (
                    <ChevronUp className="h-5 w-5 text-slate-500" />
                  )}
                </button>
                {!collapsedSections.destinationTerminal && (
                  <div className="p-6 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Name</p>
                      <p className="text-sm font-medium text-slate-900">{formatValue(shipment.destinationTerminal?.name)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Address</p>
                      <p className="text-sm text-slate-700">{formatAddress(shipment.destinationTerminal?.address)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase mb-1">Telephone</p>
                      <p className="text-sm font-medium text-slate-900">{formatValue(shipment.destinationTerminal?.telephone)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && !error && (!data || !data.data || !data.data.data || data.data.data.length === 0) && (
            <div className="text-center py-12">
              <p className="text-slate-500">No tracking results found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

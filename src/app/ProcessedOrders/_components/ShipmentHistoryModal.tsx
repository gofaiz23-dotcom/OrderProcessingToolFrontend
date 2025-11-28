'use client';

import { useEffect } from 'react';
import { X, Loader2, Package, MapPin, Calendar, Truck, CheckCircle, AlertCircle, User, Building2, Phone, Mail } from 'lucide-react';
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

export const ShipmentHistoryModal = ({
  isOpen,
  onClose,
  data,
  loading,
  error,
}: ShipmentHistoryModalProps) => {
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

  if (!isOpen) return null;

  const shipment = data?.data?.data?.[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Shipment History</h2>
            <p className="text-sm text-slate-600 mt-1">
              Company: {formatValue(data?.shippingCompanyName)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-slate-600">Loading shipment history...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">Error</p>
              </div>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-6">
              {/* Note */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> If using PRO, also include BOL for better tracking accuracy.
                </p>
              </div>

              {/* Status Overview */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Status Overview</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        shipment?.status?.conciseStatus === 'Delivered'
                          ? 'bg-green-100'
                          : shipment?.status?.isException
                          ? 'bg-red-100'
                          : 'bg-blue-100'
                      }`}>
                        {shipment?.status?.conciseStatus === 'Delivered' ? (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                          <Package className="h-6 w-6 text-blue-600" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Concise Status</p>
                      <p className="text-lg font-bold text-slate-900">{formatValue(shipment?.status?.conciseStatus)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Is Exception</p>
                    <p className="text-sm font-semibold text-slate-900">{formatValue(shipment?.status?.isException)}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Expanded Status</p>
                    <p className="text-sm text-slate-700">{formatValue(shipment?.status?.expandedStatus)}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Reference Date</p>
                      <p className="text-sm font-semibold text-slate-900">{formatValue(shipment?.status?.referenceDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Reference Time</p>
                      <p className="text-sm font-semibold text-slate-900">{formatValue(shipment?.status?.referenceTime)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Reason Code</p>
                      <p className="text-sm font-semibold text-slate-900">{formatValue(shipment?.status?.reasonCode)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Reason</p>
                    <p className="text-sm text-slate-700">{formatValue(shipment?.status?.reason)}</p>
                  </div>
                </div>
              </div>

              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">PRO Number</p>
                    <p className="text-sm font-semibold text-slate-900">{formatValue(shipment?.pro)}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Pickup Request Number</p>
                    <p className="text-sm font-semibold text-slate-900">{formatValue(shipment?.pickupRequestNumber)}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Is Residential</p>
                    <p className="text-sm font-semibold text-slate-900">{formatValue(shipment?.isResidential)}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Is Truckload</p>
                    <p className="text-sm font-semibold text-slate-900">{formatValue(shipment?.isTruckload)}</p>
                  </div>
                </div>
              </div>

              {/* Dates & Times */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Dates & Times</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Pickup Date</p>
                    <p className="text-sm font-semibold text-slate-900">{formatValue(shipment?.pickupDate)}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Pickup Time</p>
                    <p className="text-sm font-semibold text-slate-900">{formatValue(shipment?.pickupTime)}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Delivery Date</p>
                    <p className="text-sm font-semibold text-slate-900">{formatValue(shipment?.deliveryDate)}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Delivery Time</p>
                    <p className="text-sm font-semibold text-slate-900">{formatValue(shipment?.deliveryTime)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Transit Days</p>
                    <p className="text-sm font-semibold text-slate-900">{formatValue(shipment?.transitDays)}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Received By</p>
                    <p className="text-sm font-semibold text-slate-900">{formatValue(shipment?.receivedBy)}</p>
                  </div>
                </div>
              </div>

              {/* Shipment Details */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Shipment Details</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Pieces Count</p>
                    <p className="text-sm font-semibold text-slate-900">{formatValue(shipment?.piecesCount)}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total Weight</p>
                    <p className="text-sm font-semibold text-slate-900">{formatValue(shipment?.totalWeight)} lbs</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Cube</p>
                    <p className="text-sm font-semibold text-slate-900">{formatValue(shipment?.cube)}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Freight Charges</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {shipment?.freightCharges ? `$${shipment.freightCharges}` : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Terms</p>
                    <p className="text-sm font-semibold text-slate-900">{formatValue(shipment?.terms)}</p>
                  </div>
                </div>
              </div>

              {/* Driver Info */}
              {shipment?.driverInfo && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Driver Information
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Driver Name</p>
                      <p className="text-sm font-semibold text-slate-900">{formatValue(shipment.driverInfo.name)}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg col-span-2">
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Geo Coordinates</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {shipment.driverInfo.geoCoordinates && shipment.driverInfo.geoCoordinates.length > 0
                          ? shipment.driverInfo.geoCoordinates.join(', ')
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Parties */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Parties</h3>
                <div className="grid grid-cols-3 gap-4">
                  {/* Shipper */}
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Shipper
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Name</p>
                        <p className="text-sm font-semibold text-slate-900">{formatValue(shipment?.shipperParty?.name)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Account Number</p>
                        <p className="text-sm text-slate-700">{formatValue(shipment?.shipperParty?.accountNumber)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Address</p>
                        <p className="text-xs text-slate-600">{formatAddress(shipment?.shipperParty?.address)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Consignee */}
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Consignee
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Name</p>
                        <p className="text-sm font-semibold text-slate-900">{formatValue(shipment?.consigneeParty?.name)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Account Number</p>
                        <p className="text-sm text-slate-700">{formatValue(shipment?.consigneeParty?.accountNumber)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Address</p>
                        <p className="text-xs text-slate-600">{formatAddress(shipment?.consigneeParty?.address)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Third Party */}
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Third Party
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Name</p>
                        <p className="text-sm font-semibold text-slate-900">{formatValue(shipment?.thirdParty?.name)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Account Number</p>
                        <p className="text-sm text-slate-700">{formatValue(shipment?.thirdParty?.accountNumber)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Address</p>
                        <p className="text-xs text-slate-600">{formatAddress(shipment?.thirdParty?.address)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terminals */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Terminals</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Origin Terminal */}
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Origin Terminal</h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Number</p>
                        <p className="text-sm font-semibold text-slate-900">{formatValue(shipment?.originTerminal?.number)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Name</p>
                        <p className="text-sm text-slate-700">{formatValue(shipment?.originTerminal?.name)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Address</p>
                        <p className="text-xs text-slate-600">{formatAddress(shipment?.originTerminal?.address)}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Telephone</p>
                          <p className="text-xs text-slate-600">{formatValue(shipment?.originTerminal?.telephone)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Fax</p>
                          <p className="text-xs text-slate-600">{formatValue(shipment?.originTerminal?.fax)}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Email</p>
                        <p className="text-xs text-slate-600">{formatValue(shipment?.originTerminal?.email)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Geo Coordinates</p>
                        <p className="text-xs text-slate-600">
                          {shipment?.originTerminal?.geoCoordinates && shipment.originTerminal.geoCoordinates.length > 0
                            ? shipment.originTerminal.geoCoordinates.join(', ')
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Destination Terminal */}
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Destination Terminal</h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Number</p>
                        <p className="text-sm font-semibold text-slate-900">{formatValue(shipment?.destinationTerminal?.number)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Name</p>
                        <p className="text-sm text-slate-700">{formatValue(shipment?.destinationTerminal?.name)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Address</p>
                        <p className="text-xs text-slate-600">{formatAddress(shipment?.destinationTerminal?.address)}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Telephone</p>
                          <p className="text-xs text-slate-600">{formatValue(shipment?.destinationTerminal?.telephone)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Fax</p>
                          <p className="text-xs text-slate-600">{formatValue(shipment?.destinationTerminal?.fax)}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Email</p>
                        <p className="text-xs text-slate-600">{formatValue(shipment?.destinationTerminal?.email)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Geo Coordinates</p>
                        <p className="text-xs text-slate-600">
                          {shipment?.destinationTerminal?.geoCoordinates && shipment.destinationTerminal.geoCoordinates.length > 0
                            ? shipment.destinationTerminal.geoCoordinates.join(', ')
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Document References */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Document References</h3>
                {shipment?.documentReference && shipment.documentReference.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {shipment.documentReference.map((doc, index) => (
                      <div key={index} className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Document Type</p>
                        <p className="text-sm font-semibold text-slate-900 mb-2">{formatValue(doc.documentType)}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">ID</p>
                        <p className="text-sm text-slate-700">{formatValue(doc.id)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">N/A</p>
                )}
              </div>

              {/* Movement History */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Movement History
                </h3>
                {shipment?.movementHistory && shipment.movementHistory.length > 0 ? (
                  <div className="space-y-4">
                    {shipment.movementHistory.map((movement, index) => (
                      <div key={index} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-xs font-semibold text-blue-700">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <div className="grid grid-cols-2 gap-4 mb-2">
                              <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">ID</p>
                                <p className="text-sm font-semibold text-slate-900">{formatValue(movement.id)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Description</p>
                                <p className="text-sm font-semibold text-slate-900">{formatValue(movement.description)}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Transport Event Type Code</p>
                              <p className="text-sm text-slate-700">{formatValue(movement.transportEventTypeCode)}</p>
                            </div>
                            {movement.location && (
                              <div className="mt-2 flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                                <div className="text-sm text-slate-600">
                                  <p className="font-medium">{formatValue(movement.location.name)}</p>
                                  <p className="text-xs text-slate-500">{formatAddress(movement.location.address)}</p>
                                  <p className="text-xs text-slate-500 mt-1">
                                    Code: {formatValue(movement.location.code)} | ID: {formatValue(movement.location.id)}
                                  </p>
                                  {movement.location.geoCoordinates && movement.location.geoCoordinates.length > 0 && (
                                    <p className="text-xs text-slate-500">
                                      Coordinates: {movement.location.geoCoordinates.join(', ')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                            {movement.contact && (
                              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                                <div>
                                  <p>Telephone: {formatValue(movement.contact.telephone)}</p>
                                </div>
                                <div>
                                  <p>Fax: {formatValue(movement.contact.fax)}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        {movement.statusHistory && movement.statusHistory.length > 0 && (
                          <div className="ml-11 space-y-2 border-t border-slate-200 pt-3">
                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Status History</p>
                            {movement.statusHistory.map((status, statusIndex) => (
                              <div key={statusIndex} className="flex items-start gap-2 text-sm bg-slate-50 p-2 rounded">
                                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                  status.isException ? 'bg-red-500' : 'bg-green-500'
                                }`} />
                                <div className="flex-1">
                                  <p className="font-medium text-slate-900">{formatValue(status.conciseStatus)}</p>
                                  <p className="text-xs text-slate-600">{formatValue(status.expandedStatus)}</p>
                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                    <p className="text-xs text-slate-500">
                                      Date: {formatValue(status.referenceDate)}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      Time: {formatValue(status.referenceTime)}
                                    </p>
                                  </div>
                                  {status.reasonCode && (
                                    <p className="text-xs text-slate-500 mt-1">
                                      Reason Code: {formatValue(status.reasonCode)} | Reason: {formatValue(status.reason)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">N/A</p>
                )}
              </div>

              {/* Disclaimers */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Disclaimers</h3>
                {shipment?.disclaimers && shipment.disclaimers.length > 0 ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <ul className="space-y-2">
                      {shipment.disclaimers.map((disclaimer, index) => (
                        <li key={index} className="text-sm text-yellow-800">{disclaimer}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">N/A</p>
                )}
              </div>

              {/* Error Info */}
              {data?.data?.error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-red-900 mb-2">Error Information</h4>
                  <div className="space-y-1">
                    <p className="text-xs text-red-700">Code: {formatValue(data.data.error.code)}</p>
                    <p className="text-xs text-red-700">Message: {formatValue(data.data.error.message)}</p>
                    <p className="text-xs text-red-700">Details: {formatValue(data.data.error.details)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && !error && (!data || !data.data || !data.data.data || data.data.data.length === 0) && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No shipment history found</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

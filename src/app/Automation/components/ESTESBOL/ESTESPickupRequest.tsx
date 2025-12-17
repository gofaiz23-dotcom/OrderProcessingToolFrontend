'use client';

import { useState, useEffect } from 'react';
import { Send, Loader2, CheckCircle2, Plus, Trash2, ChevronUp, ChevronDown, TrendingUp } from 'lucide-react';
import { createEstesPickupRequest, getAllEstesPickupStatus, type EstesPickupData, type EstesPickupStatusItem } from '@/app/api/3plGigaFedexApi/estesPickupApi';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';
import { createShippedOrder, updateShippedOrder, getAllShippedOrders } from '@/app/ProcessedOrders/utils/shippedOrdersApi';
import type { Order } from '@/app/types/order';
import { dispatchPickupData } from '../../utils/ltlOrderCache';
import { logger } from '@/utils/logger';

// Helper function to extract value from JSONB
const getJsonbValue = (jsonb: Order['jsonb'], key: string): string => {
  if (!jsonb || typeof jsonb !== 'object' || Array.isArray(jsonb)) return '';
  const obj = jsonb as Record<string, unknown>;
  
  const normalizedKey = key.trim();
  const keyWithoutHash = normalizedKey.replace(/#/g, '');
  const keyLower = normalizedKey.toLowerCase();
  const keyWithoutHashLower = keyWithoutHash.toLowerCase();
  
  const keysToTry = [
    normalizedKey,
    keyWithoutHash,
    `#${keyWithoutHash}`,
    keyLower,
    keyWithoutHashLower,
    `#${keyWithoutHashLower}`,
  ];
  
  for (const k of keysToTry) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') {
      return String(obj[k]);
    }
  }
  
  const allKeys = Object.keys(obj);
  for (const objKey of allKeys) {
    const objKeyLower = objKey.toLowerCase();
    if (
      objKeyLower === keyLower ||
      objKeyLower === keyWithoutHashLower ||
      objKeyLower.includes(keyWithoutHashLower)
    ) {
      const value = obj[objKey];
      if (value !== undefined && value !== null && value !== '') {
        return String(value);
      }
    }
  }
  
  return '';
};

type Shipment = {
  id: string;
  type: string;
  handlingUnits: string;
  weight: string;
  destinationZip: string;
};

type Contact = {
  id: string;
  name: string;
  email: string;
};

type FormSectionProps = {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string; // Allow passing extra classes if needed
};

const FormSection = ({ title, isExpanded, onToggle, children, className = '' }: FormSectionProps) => {
  return (
    <div className={`border border-slate-200 rounded-lg overflow-visible bg-white ${className}`}>
      <div
        className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer rounded-t-lg"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 flex-1">
          <h3 className="text-base sm:text-lg font-bold text-slate-900">{title}</h3>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="flex items-center p-1 hover:bg-slate-200 rounded-full transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="text-slate-600" size={20} />
          ) : (
            <ChevronDown className="text-slate-600" size={20} />
          )}
        </button>
      </div>
      {isExpanded && (
        <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  );
};

type ESTESPickupRequestProps = {
  order?: Order;
  bolData?: {
    originName?: string;
    originAddress1?: string;
    originAddress2?: string;
    originZipCode?: string;
    originCountry?: string;
    originContactName?: string;
    originPhone?: string;
    originEmail?: string;
    handlingUnits?: Array<{
      quantity: number;
      weight: number;
      handlingUnitType: string;
    }>;
    destinationZipCode?: string;
    hazmat?: boolean;
    protectFromFreezing?: boolean;
    food?: boolean;
    poison?: boolean;
    overlength?: boolean;
    liftgate?: boolean;
    doNotStack?: boolean;
  };
  onSuccess?: (automationId: string) => void;
  onCancel?: () => void;
};

export const ESTESPickupRequest = ({ order, bolData, onSuccess, onCancel }: ESTESPickupRequestProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [success, setSuccess] = useState(false);
  const [automationId, setAutomationId] = useState<string | null>(null);

  // Account Information
  const [role, setRole] = useState<string>('Third-Party');

  // Requester Details
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [requesterPhoneExt, setRequesterPhoneExt] = useState('');

  // Dock Contact
  const [dockName, setDockName] = useState('');
  const [dockEmail, setDockEmail] = useState('');
  const [dockPhone, setDockPhone] = useState('');
  const [dockPhoneExt, setDockPhoneExt] = useState('');

  // Pickup Location
  const [companyName, setCompanyName] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('USA');

  // Pickup Details
  const [pickupDate, setPickupDate] = useState('');
  const [pickupStartTime, setPickupStartTime] = useState('08:00 AM');
  const [pickupEndTime, setPickupEndTime] = useState('05:00 PM');
  const [pickupType, setPickupType] = useState('LL');

  // Shipments - Initialize from BOL data if available
  const [shipments, setShipments] = useState<Shipment[]>(() => {
    if (bolData?.handlingUnits && bolData.handlingUnits.length > 0) {
      return bolData.handlingUnits.map((unit, index) => ({
        id: String(index + 1),
        type: unit.handlingUnitType || 'PALLET',
        handlingUnits: String(unit.quantity || ''),
        weight: String(unit.weight || ''),
        destinationZip: bolData.destinationZipCode || '',
      }));
    }
    return [{ id: '1', type: 'PALLET', handlingUnits: '', weight: '', destinationZip: '' }];
  });

  // Freight Characteristics
  const [hazmat, setHazmat] = useState(false);
  const [protectFromFreezing, setProtectFromFreezing] = useState(false);
  const [food, setFood] = useState(false);
  const [poison, setPoison] = useState(false);
  const [overlength, setOverlength] = useState(false);
  const [liftgate, setLiftgate] = useState(false);
  const [doNotStack, setDoNotStack] = useState(false);

  // Time Critical
  const [guaranteed, setGuaranteed] = useState(false);
  const [pickupInstructions, setPickupInstructions] = useState('');

  // Notifications
  const [emailForRJT, setEmailForRJT] = useState(true);
  const [emailForACC, setEmailForACC] = useState(true);
  const [emailForWRK, setEmailForWRK] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([
    { id: '1', name: '', email: '' },
  ]);

  // Options
  const [showBrowser, setShowBrowser] = useState(false);
  const [browserType, setBrowserType] = useState<'chrome' | 'chromium' | 'edge' | 'firefox'>('chrome');
  const [submitForm, setSubmitForm] = useState(true);

  const [showSections, setShowSections] = useState<Record<string, boolean>>({
    accountInfo: true,
    requesterDetails: true,
    dockContact: true,
    pickupLocation: true,
    pickupDetails: true,
    shipmentInfo: true,
    freightCharacteristics: true,
    timeCritical: true,
    pickupInstructions: true,
    pickupNotifications: true,
    options: true,
  });

  // Automation Status Tracking
  const [pickupStatus, setPickupStatus] = useState<EstesPickupStatusItem | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (automationId) {
      // Immediately fetch status
      const fetchStatus = async () => {
        try {
          const response = await getAllEstesPickupStatus();
          const currentOp = response.automation_operations.find(op => op.automation_id === automationId);

          if (currentOp) {
            setPickupStatus(currentOp);

            // Stop polling if completed or failed
            if (currentOp.status === 'success' || currentOp.status === 'completed' || currentOp.status === 'error' || currentOp.status === 'failed') {
              if (intervalId) clearInterval(intervalId);
            }
          }
        } catch (err) {
          logger.error('Error fetching automation status:', err);
        }
      };

      fetchStatus();
      intervalId = setInterval(fetchStatus, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [automationId]);

  const toggleSection = (section: string) => {
    setShowSections({ ...showSections, [section]: !showSections[section] });
  };

  // Auto-populate from BOL data
  useEffect(() => {
    if (bolData) {
      if (bolData.originName) setCompanyName(bolData.originName);
      if (bolData.originAddress1) setAddress1(bolData.originAddress1);
      if (bolData.originAddress2) setAddress2(bolData.originAddress2);
      if (bolData.originZipCode) setZipCode(bolData.originZipCode);
      if (bolData.originCountry) setCountry(bolData.originCountry);
      if (bolData.originContactName) {
        setRequesterName(bolData.originContactName);
        setDockName(bolData.originContactName);
      }
      if (bolData.originPhone) {
        setRequesterPhone(bolData.originPhone);
        setDockPhone(bolData.originPhone);
      }
      if (bolData.originEmail) {
        setRequesterEmail(bolData.originEmail);
        setDockEmail(bolData.originEmail);
      }
      // Freight characteristics auto-population removed as per request
    }
  }, [bolData]);

  // Set default pickup date to today
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setPickupDate(`${year}-${month}-${day}`);
  }, []);

  const addShipment = () => {
    setShipments([...shipments, { id: Date.now().toString(), type: 'PALLET', handlingUnits: '', weight: '', destinationZip: '' }]);
  };

  const removeShipment = (id: string) => {
    if (shipments.length > 1) {
      setShipments(shipments.filter(s => s.id !== id));
    }
  };

  const updateShipment = (id: string, field: keyof Shipment, value: string) => {
    setShipments(shipments.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const addContact = () => {
    setContacts([...contacts, { id: Date.now().toString(), name: '', email: '' }]);
  };

  const removeContact = (id: string) => {
    if (contacts.length > 1) {
      setContacts(contacts.filter(c => c.id !== id));
    }
  };

  const updateContact = (id: string, field: keyof Contact, value: string) => {
    setContacts(contacts.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const pickupData: EstesPickupData = {
        accountInformation: {
          role: role || null,
        },
        requesterDetails: {
          name: requesterName || null,
          email: requesterEmail || null,
          phone: requesterPhone || null,
          phoneExt: requesterPhoneExt || null,
        },
        dockContact: {
          name: dockName || null,
          email: dockEmail || null,
          phone: dockPhone || null,
          phoneExt: dockPhoneExt || null,
        },
        pickupLocation: {
          companyName: companyName || null,
          address1: address1 || null,
          address2: address2 || null,
          zipCode: zipCode || null,
          country: country || null,
        },
        pickupDetails: {
          pickupDate: pickupDate || null,
          pickupStartTime: pickupStartTime || null,
          pickupEndTime: pickupEndTime || null,
          pickupType: pickupType || null,
        },
        shipments: shipments.map(s => ({
          type: s.type || null,
          handlingUnits: s.handlingUnits || null,
          weight: s.weight || null,
          destinationZip: s.destinationZip || null,
        })),
        freightCharacteristics: {
          hazmat: hazmat || null,
          protectFromFreezing: protectFromFreezing || null,
          food: food || null,
          poison: poison || null,
          overlength: overlength || null,
          liftgate: liftgate || null,
          stackable: !doNotStack, // Inverted: API expects stackable=true for stackable freight
        },
        timeCritical: {
          guaranteed: guaranteed || null,
        },
        pickupInstructions: pickupInstructions || null,
        pickupNotifications: {
          emailForRJT: emailForRJT || null,
          emailForACC: emailForACC || null,
          emailForWRK: emailForWRK || null,
          contacts: contacts.map(c => ({
            name: c.name || null,
            email: c.email || null,
          })),
        },
        submitForm: submitForm || null,
      };

      const response = await createEstesPickupRequest(pickupData, showBrowser, browserType);
      setAutomationId(response.automation_id);
      setSuccess(true);

      // Dispatch event for cache update (for LTL orders)
      // This will trigger final DB save in AutomateLogisticModal
      if (order?.id) {
        dispatchPickupData(order.id, {
          automationId: response.automation_id,
          pickupData,
          response,
          carrier: 'estes', // Explicitly set carrier
        });
      }

      // Update order with pickup response - find by SKU and marketplace
      if (order) {
        try {
          const sku = getJsonbValue(order.jsonb, 'SKU') || '';
          const marketplace = order.orderOnMarketPlace || '';
          
          if (sku && marketplace) {
            // Find the order that matches this rate quote
            const existingOrders = await getAllShippedOrders({ page: 1, limit: 100 });
            const existingOrder = existingOrders.orders.find(
              (o) => o.sku === sku && o.orderOnMarketPlace === marketplace
            );

            if (existingOrder) {
              // Update existing order with pickup response
              await updateShippedOrder(existingOrder.id, {
                pickupResponseJsonb: {
                  automationId: response.automation_id,
                  pickupData,
                  response,
                },
              });
              logger.log('Updated existing order with pickup response');
            } else {
              // Create new order with pickup response
              await createShippedOrder({
                sku,
                orderOnMarketPlace: marketplace,
                ordersJsonb: order.jsonb as Record<string, unknown>,
                pickupResponseJsonb: {
                  automationId: response.automation_id,
                  pickupData,
                  response,
                },
              });
              logger.log('Created new order with pickup response');
            }
          }
        } catch (saveError) {
          logger.error('Failed to save pickup response to database:', saveError);
          // Don't throw error - pickup request was successful, just log the save error
        }
        // Dispatch pickup data to cache - this will trigger final DB save in AutomateLogisticModal
        dispatchPickupData(order.id, {
          automationId: response.automation_id,
          pickupData,
          response,
          carrier: 'estes', // Explicitly set carrier
        });
        logger.log('Pickup data cached and will trigger final DB save with all cached data');
      }

      if (onSuccess) {
        onSuccess(response.automation_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full w-full bg-slate-50">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-8">






          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <ErrorDisplay error={error} />
            </div>
          )}
          {/* Account Information */}
          <FormSection
            title="Account Information"
            isExpanded={showSections.accountInfo}
            onToggle={() => toggleSection('accountInfo')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Shipper">Shipper</option>
                  <option value="Consignee">Consignee</option>
                  <option value="Third-Party">Third-Party</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </FormSection>

          {/* Requester Details */}
          <FormSection
            title="Requester Details"
            isExpanded={showSections.requesterDetails}
            onToggle={() => toggleSection('requesterDetails')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
                <input
                  type="email"
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone *</label>
                <input
                  type="tel"
                  value={requesterPhone}
                  onChange={(e) => setRequesterPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone Extension</label>
                <input
                  type="text"
                  value={requesterPhoneExt}
                  onChange={(e) => setRequesterPhoneExt(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </FormSection>

          {/* Dock Contact */}
          <FormSection
            title="Dock Contact Details"
            isExpanded={showSections.dockContact}
            onToggle={() => toggleSection('dockContact')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                <input
                  type="text"
                  value={dockName}
                  onChange={(e) => setDockName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={dockEmail}
                  onChange={(e) => setDockEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={dockPhone}
                  onChange={(e) => setDockPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone Extension</label>
                <input
                  type="text"
                  value={dockPhoneExt}
                  onChange={(e) => setDockPhoneExt(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </FormSection>

          {/* Pickup Location */}
          <FormSection
            title="Pickup Location"
            isExpanded={showSections.pickupLocation}
            onToggle={() => toggleSection('pickupLocation')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Address Line 1</label>
                <input
                  type="text"
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Address Line 2</label>
                <input
                  type="text"
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ZIP Code</label>
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="USA"
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </FormSection>

          {/* Pickup Details */}
          <FormSection
            title="Pickup Details"
            isExpanded={showSections.pickupDetails}
            onToggle={() => toggleSection('pickupDetails')}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Pickup Date *</label>
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Pickup Start Time *</label>
                <input
                  type="text"
                  value={pickupStartTime}
                  onChange={(e) => setPickupStartTime(e.target.value)}
                  placeholder="08:00 AM"
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Pickup End Time *</label>
                <input
                  type="text"
                  value={pickupEndTime}
                  onChange={(e) => setPickupEndTime(e.target.value)}
                  placeholder="05:00 PM"
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Pickup Type *</label>
                <select
                  value={pickupType}
                  onChange={(e) => setPickupType(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="LL">Live Load</option>
                  <option value="HL">Hook Loaded</option>
                </select>
              </div>
            </div>
          </FormSection>

          {/* Shipments (only if Live Load) */}
          {pickupType === 'LL' && (
            <FormSection
              title="Shipment Information"
              isExpanded={showSections.shipmentInfo}
              onToggle={() => toggleSection('shipmentInfo')}
            >
              <div className="space-y-4">
                {shipments.map((shipment, index) => (
                  <div key={shipment.id} className="border-2 border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-700">Shipment {index + 1}</h3>
                      {shipments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeShipment(shipment.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                        <select
                          value={shipment.type}
                          onChange={(e) => updateShipment(shipment.id, 'type', e.target.value)}
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="PALLET">PALLET</option>
                          <option value="SKID">SKID</option>
                          <option value="PIECE">PIECE</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Handling Units</label>
                        <input
                          type="text"
                          value={shipment.handlingUnits}
                          onChange={(e) => updateShipment(shipment.id, 'handlingUnits', e.target.value)}
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Weight (lbs)</label>
                        <input
                          type="text"
                          value={shipment.weight}
                          onChange={(e) => updateShipment(shipment.id, 'weight', e.target.value)}
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Destination ZIP</label>
                        <input
                          type="text"
                          value={shipment.destinationZip}
                          onChange={(e) => updateShipment(shipment.id, 'destinationZip', e.target.value)}
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={addShipment}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={18} />
                  Add Shipment
                </button>
              </div>
            </FormSection>
          )}

          {/* Freight Characteristics */}
          <FormSection
            title="Freight Characteristics"
            isExpanded={showSections.freightCharacteristics}
            onToggle={() => toggleSection('freightCharacteristics')}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hazmat}
                  onChange={(e) => setHazmat(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Hazmat</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={protectFromFreezing}
                  onChange={(e) => setProtectFromFreezing(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Protect from Freezing</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={food}
                  onChange={(e) => setFood(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Food</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={poison}
                  onChange={(e) => setPoison(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Poison</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overlength}
                  onChange={(e) => setOverlength(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Overlength</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={liftgate}
                  onChange={(e) => setLiftgate(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Liftgate</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={doNotStack}
                  onChange={(e) => setDoNotStack(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Do Not Stack</span>
              </label>
            </div>
          </FormSection>

          {/* Time Critical */}
          <FormSection
            title="Time Critical Guaranteed"
            isExpanded={showSections.timeCritical}
            onToggle={() => toggleSection('timeCritical')}
          >
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={guaranteed}
                onChange={(e) => setGuaranteed(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">Guaranteed Shipment</span>
            </label>
          </FormSection>

          {/* Pickup Instructions */}
          <FormSection
            title="Pickup Instructions (Optional)"
            isExpanded={showSections.pickupInstructions}
            onToggle={() => toggleSection('pickupInstructions')}
          >
            <textarea
              value={pickupInstructions}
              onChange={(e) => setPickupInstructions(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter any special instructions for the pickup..."
            />
          </FormSection>

          {/* Pickup Notifications */}
          <FormSection
            title="Pickup Notifications"
            isExpanded={showSections.pickupNotifications}
            onToggle={() => toggleSection('pickupNotifications')}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailForRJT}
                    onChange={(e) => setEmailForRJT(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Email for Rejected Request</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailForACC}
                    onChange={(e) => setEmailForACC(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Email for Accepted Request</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailForWRK}
                    onChange={(e) => setEmailForWRK(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Email for Completed Pickup</span>
                </label>
              </div>
              <div className="border-t-2 border-slate-200 pt-4">
                <h3 className="font-semibold text-slate-700 mb-4">Additional Contacts</h3>
                <div className="space-y-4">
                  {contacts.map((contact, index) => (
                    <div key={contact.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                        <input
                          type="text"
                          value={contact.name}
                          onChange={(e) => updateContact(contact.id, 'name', e.target.value)}
                          className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex gap-4 items-end">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                          <input
                            type="email"
                            value={contact.email}
                            onChange={(e) => updateContact(contact.id, 'email', e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        {contacts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeContact(contact.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <Trash2 size={18} />
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    type="button"
                    onClick={addContact}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={18} />
                    Add Contact
                  </button>
                </div>
              </div>
            </div>
          </FormSection>

          {/* Options */}
          <FormSection
            title="Options"
            isExpanded={showSections.options}
            onToggle={() => toggleSection('options')}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBrowser}
                  onChange={(e) => setShowBrowser(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Show Browser</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Browser Type</label>
                <select
                  value={browserType}
                  onChange={(e) => setBrowserType(e.target.value as 'chrome' | 'chromium' | 'edge' | 'firefox')}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="chrome">Chrome</option>
                  <option value="chromium">Chromium</option>
                  <option value="edge">Edge</option>
                  <option value="firefox">Firefox</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={submitForm}
                  onChange={(e) => setSubmitForm(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Submit Form</span>
              </label>
            </div>
          </FormSection>

          {/* Status Display */}
          {success && automationId && (
            <div className="space-y-4">
              {pickupStatus?.status === 'success' || pickupStatus?.status === 'completed' ? (
                <>
                  <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
                    <div className="p-3 bg-green-100 rounded-full">
                      <CheckCircle2 size={32} className="text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-green-800">Pickup request submitted successfully!</h3>
                      <p className="text-sm text-green-700 mt-1">Automation ID: {automationId}</p>
                      <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle2 size={16} />
                        <span>Process completed successfully</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t-2 border-slate-200 pt-4">
                  <h3 className="font-semibold text-slate-700 mb-4">Additional Contacts</h3>
                  <div className="space-y-4">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                          <input
                            type="text"
                            value={contact.name}
                            onChange={(e) => updateContact(contact.id, 'name', e.target.value)}
                            className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                          />
                        </div>
                        <div className="flex gap-4 items-end">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                            <input
                              type="email"
                              value={contact.email}
                              onChange={(e) => updateContact(contact.id, 'email', e.target.value)}
                              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                            />
                          </div>
                          {contacts.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeContact(contact.id)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <Trash2 size={18} />
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                    <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                      {pickupStatus?.status?.toUpperCase() || 'INITIALIZING'}
                    </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700 flex items-center gap-1">
                        <TrendingUp size={14} />
                        Progress
                      </span>
                      <span className="font-bold text-blue-700">{pickupStatus?.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-white rounded-full h-3 overflow-hidden shadow-inner border border-blue-100">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
                        style={{ width: `${pickupStatus?.progress || 0}%` }}
                      >
                        <div className="w-full h-full bg-white/20 animate-[shimmer_2s_infinite] bg-[length:200%_100%]" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>ID: {automationId}</span>
                    <span className="flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" />
                      Updating live...
                    </span>
                  </div>
                  </div>
                </>
              ) : null}
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    <span>Submit Pickup Request</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Sticky Footer */}
      <div className="border-t border-slate-200 bg-white p-4 flex items-center justify-end gap-4 z-10">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <Send size={18} />
              <span>Submit Request</span>
            </>
          )}
        </button>
      </div>
    </form >
  );
};


'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, Loader2, CheckCircle2, XCircle, Plus, Trash2 } from 'lucide-react';
import { createEstesPickupRequest, type EstesPickupData } from '@/app/api/3plGigaFedexApi/estesPickupApi';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';

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

export default function EstesPickupRequestPage() {
  const router = useRouter();
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

  // Shipments
  const [shipments, setShipments] = useState<Shipment[]>([
    { id: '1', type: 'PALLET', handlingUnits: '', weight: '', destinationZip: '' },
  ]);

  // Freight Characteristics
  const [hazmat, setHazmat] = useState(false);
  const [protectFromFreezing, setProtectFromFreezing] = useState(false);
  const [food, setFood] = useState(false);
  const [poison, setPoison] = useState(false);
  const [overlength, setOverlength] = useState(false);
  const [liftgate, setLiftgate] = useState(false);
  const [stackable, setStackable] = useState(false);

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
          stackable: stackable || null,
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
      
      // Redirect to status page after 2 seconds
      setTimeout(() => {
        router.push('/3plGigaFedex/status');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Estes Pickup Request</h1>
              <p className="text-slate-600 mt-1">Fill out the form to create a pickup request</p>
            </div>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 size={24} className="text-green-600" />
              <div className="flex-1">
                <p className="font-semibold text-green-800">Pickup request submitted successfully!</p>
                <p className="text-sm text-green-700">Automation ID: {automationId}</p>
                <p className="text-sm text-green-600 mt-1">Redirecting to status page...</p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <ErrorDisplay error={error} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Account Information */}
            <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-lg">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Account Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  >
                    <option value="Shipper">Shipper</option>
                    <option value="Consignee">Consignee</option>
                    <option value="Third-Party">Third-Party</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Requester Details */}
            <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-lg">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Requester Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
                  <input
                    type="text"
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={requesterEmail}
                    onChange={(e) => setRequesterEmail(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
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
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone Extension</label>
                  <input
                    type="text"
                    value={requesterPhoneExt}
                    onChange={(e) => setRequesterPhoneExt(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                </div>
              </div>
            </div>

            {/* Dock Contact */}
            <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-lg">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Dock Contact Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={dockName}
                    onChange={(e) => setDockName(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={dockEmail}
                    onChange={(e) => setDockEmail(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={dockPhone}
                    onChange={(e) => setDockPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone Extension</label>
                  <input
                    type="text"
                    value={dockPhoneExt}
                    onChange={(e) => setDockPhoneExt(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                </div>
              </div>
            </div>

            {/* Pickup Location */}
            <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-lg">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Pickup Location</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Company Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Address Line 1</label>
                  <input
                    type="text"
                    value={address1}
                    onChange={(e) => setAddress1(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Address Line 2</label>
                  <input
                    type="text"
                    value={address2}
                    onChange={(e) => setAddress2(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">ZIP Code</label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="USA"
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                </div>
              </div>
            </div>

            {/* Pickup Details */}
            <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-lg">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Pickup Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Pickup Date *</label>
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
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
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
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
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Pickup Type *</label>
                  <select
                    value={pickupType}
                    onChange={(e) => setPickupType(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    required
                  >
                    <option value="LL">Live Load</option>
                    <option value="HL">Hook Loaded</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Shipments (only if Live Load) */}
            {pickupType === 'LL' && (
              <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-lg">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Shipment Information</h2>
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
                            className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
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
                            className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Weight (lbs)</label>
                          <input
                            type="text"
                            value={shipment.weight}
                            onChange={(e) => updateShipment(shipment.id, 'weight', e.target.value)}
                            className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Destination ZIP</label>
                          <input
                            type="text"
                            value={shipment.destinationZip}
                            onChange={(e) => updateShipment(shipment.id, 'destinationZip', e.target.value)}
                            className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
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
              </div>
            )}

            {/* Freight Characteristics */}
            <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-lg">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Freight Characteristics</h2>
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
                    checked={stackable}
                    onChange={(e) => setStackable(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Do Not Stack</span>
                </label>
              </div>
            </div>

            {/* Time Critical */}
            <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-lg">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Time Critical Guaranteed</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={guaranteed}
                  onChange={(e) => setGuaranteed(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Guaranteed Shipment</span>
              </label>
            </div>

            {/* Pickup Instructions */}
            <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-lg">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Pickup Instructions (Optional)</h2>
              <textarea
                value={pickupInstructions}
                onChange={(e) => setPickupInstructions(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                placeholder="Enter any special instructions for the pickup..."
              />
            </div>

            {/* Pickup Notifications */}
            <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-lg">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Pickup Notifications</h2>
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
            </div>

            {/* Options */}
            <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-lg">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Options</h2>
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
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
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
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
          </form>
        </div>
      </div>
    </div>
  );
}


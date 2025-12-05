'use client';

import { Calendar, Clock } from 'lucide-react';

type PickupRequestSectionProps = {
  schedulePickup: boolean;
  onSchedulePickupChange: (value: boolean) => void;
  pickupDate?: string;
  onPickupDateChange?: (value: string) => void;
  pickupReadyTime?: string;
  onPickupReadyTimeChange?: (value: string) => void;
  dockCloseTime?: string;
  onDockCloseTimeChange?: (value: string) => void;
  useMyContactInfo?: boolean;
  onUseMyContactInfoChange?: (value: boolean) => void;
  contactCompanyName?: string;
  onContactCompanyNameChange?: (value: string) => void;
  contactName?: string;
  onContactNameChange?: (value: string) => void;
  contactPhone?: string;
  onContactPhoneChange?: (value: string) => void;
  contactExtension?: string;
  onContactExtensionChange?: (value: string) => void;
};

const TIME_OPTIONS = [
  '12:00 AM', '12:30 AM', '1:00 AM', '1:30 AM', '2:00 AM', '2:30 AM', '3:00 AM', '3:30 AM',
  '4:00 AM', '4:30 AM', '5:00 AM', '5:30 AM', '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM',
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
  '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM',
];

export const PickupRequestSection = ({
  schedulePickup,
  onSchedulePickupChange,
  pickupDate = '',
  onPickupDateChange,
  pickupReadyTime = '',
  onPickupReadyTimeChange,
  dockCloseTime = '',
  onDockCloseTimeChange,
  useMyContactInfo = false,
  onUseMyContactInfoChange,
  contactCompanyName = '',
  onContactCompanyNameChange,
  contactName = '',
  onContactNameChange,
  contactPhone = '',
  onContactPhoneChange,
  contactExtension = '',
  onContactExtensionChange,
}: PickupRequestSectionProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Pickup Request</h2>
      
      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="pickupRequest"
            checked={schedulePickup === true}
            onChange={() => onSchedulePickupChange(true)}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">Yes, schedule a pickup request</span>
        </label>
        
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="pickupRequest"
            checked={schedulePickup === false}
            onChange={() => onSchedulePickupChange(false)}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">
            No, we have a standing pickup, or will schedule one separately
          </span>
        </label>
      </div>

      {schedulePickup && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          {/* Pickup Date and Time Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {onPickupDateChange && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">
                  Pickup Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => onPickupDateChange(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    required
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
              </div>
            )}

            {onPickupReadyTimeChange && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">
                  Pickup Ready Time <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={pickupReadyTime}
                    onChange={(e) => onPickupReadyTimeChange(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-10"
                    required
                  >
                    <option value="">Select Time</option>
                    {TIME_OPTIONS.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                </div>
              </div>
            )}

            {onDockCloseTimeChange && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">
                  Dock Close Time <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={dockCloseTime}
                    onChange={(e) => onDockCloseTimeChange(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-10"
                    required
                  >
                    <option value="">Select Time</option>
                    {TIME_OPTIONS.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                </div>
              </div>
            )}
          </div>

          {/* Contact Information Section */}
          {onUseMyContactInfoChange && (
            <div className="space-y-4 pt-4">
              <button
                type="button"
                onClick={() => onUseMyContactInfoChange(!useMyContactInfo)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium underline"
              >
                Use My Contact Information
              </button>

              {useMyContactInfo && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {onContactCompanyNameChange && (
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={contactCompanyName}
                        onChange={(e) => onContactCompanyNameChange(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  )}

                  {onContactNameChange && (
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        Contact Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => onContactNameChange(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  )}

                  {onContactPhoneChange && (
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        Contact Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => onContactPhoneChange(e.target.value)}
                        placeholder="+1 (123) 456-7890"
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  )}

                  {onContactExtensionChange && (
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-900">
                        Extension (Optional)
                      </label>
                      <input
                        type="text"
                        value={contactExtension}
                        onChange={(e) => onContactExtensionChange(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-slate-600 mt-2">
                <span className="font-semibold">NOTE:</span> Please contact{' '}
                <a href="#" className="text-blue-600 underline">
                  Your Local Service Center
                </a>{' '}
                for pickup requests submitted on or after 4:00PM to verify origin departure time.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


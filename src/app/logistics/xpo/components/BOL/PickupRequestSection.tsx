'use client';

import { useEffect } from 'react';
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
  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Set default to today's date when schedulePickup is enabled and pickupDate is empty
  useEffect(() => {
    if (schedulePickup && onPickupDateChange && !pickupDate) {
      onPickupDateChange(getTodayDate());
    }
  }, [schedulePickup, pickupDate, onPickupDateChange]);

  // Use today's date as default if pickupDate is empty
  const displayDate = pickupDate || getTodayDate();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Pickup Request</h2>
      
      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="pickupRequest"
            checked={schedulePickup === true}
            onChange={() => {
              onSchedulePickupChange(true);
              // Set today's date when enabling schedule pickup if date is empty
              if (onPickupDateChange && !pickupDate) {
                onPickupDateChange(getTodayDate());
              }
            }}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">Yes, schedule a pickup request</span>
        </label>
        
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="pickupRequest"
            checked={schedulePickup === false}
            onChange={() => {
              onSchedulePickupChange(false);
              // Clear pickup fields when "No" is selected
              if (onPickupDateChange) onPickupDateChange('');
              if (onPickupReadyTimeChange) onPickupReadyTimeChange('');
              if (onDockCloseTimeChange) onDockCloseTimeChange('');
            }}
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
                    value={displayDate}
                    onChange={(e) => {
                      const selectedDate = e.target.value;
                      const today = getTodayDate();
                      // Only allow today or future dates
                      if (selectedDate >= today && onPickupDateChange) {
                        onPickupDateChange(selectedDate);
                      } else if (onPickupDateChange) {
                        // If past date is selected, reset to today
                        onPickupDateChange(today);
                      }
                    }}
                    min={getTodayDate()}
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
                  <input
                    type="time"
                    value={pickupReadyTime}
                    onChange={(e) => onPickupReadyTimeChange(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    required
                  />
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
                  <input
                    type="time"
                    value={dockCloseTime}
                    onChange={(e) => onDockCloseTimeChange(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    required
                  />
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
                        placeholder=""
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


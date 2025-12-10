'use client';

// Phone formatter removed - allow free-form input

type EmergencyContactSectionProps = {
  name: string;
  onNameChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
};

export const EmergencyContactSection = ({
  name,
  onNameChange,
  phone,
  onPhoneChange,
}: EmergencyContactSectionProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Emergency Contact</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">
            Emergency Contact Name (Optional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">
            Emergency Phone Number (Optional)
          </label>
          <input
            type="tel"
            value={phone || ''}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="Enter phone number"
            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
};


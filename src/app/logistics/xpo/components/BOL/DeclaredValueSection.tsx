'use client';

type DeclaredValueSectionProps = {
  totalDeclaredValue: string;
  onTotalDeclaredValueChange: (value: string) => void;
  excessiveLiabilityAuth: string;
  onExcessiveLiabilityAuthChange: (value: string) => void;
};

export const DeclaredValueSection = ({
  totalDeclaredValue,
  onTotalDeclaredValueChange,
  excessiveLiabilityAuth,
  onExcessiveLiabilityAuthChange,
}: DeclaredValueSectionProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">
        Declared Value (Price paid for goods)
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">
            Total Declared Value (USD) (Optional)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600">$</span>
            <input
              type="number"
              value={totalDeclaredValue}
              onChange={(e) => onTotalDeclaredValueChange(e.target.value)}
              placeholder="0.00"
              className="w-full pl-8 px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">
            Excessive Liability Authorization (Optional)
          </label>
          <input
            type="text"
            value={excessiveLiabilityAuth}
            onChange={(e) => onExcessiveLiabilityAuthChange(e.target.value)}
            placeholder="Please add initials here"
            className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-500 mt-1">Please add initials here</p>
        </div>
      </div>
    </div>
  );
};


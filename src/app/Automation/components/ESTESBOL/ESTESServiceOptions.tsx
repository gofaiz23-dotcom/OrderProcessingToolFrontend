'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';

type ESTESServiceOptionsProps = {
  selectedService: string;
  onServiceChange: (service: string) => void;
  onShowRates: () => void;
  isExpanded: boolean;
  onToggle: () => void;
};

export const ESTESServiceOptions = ({
  selectedService,
  onServiceChange,
  onShowRates,
  isExpanded,
  onToggle,
}: ESTESServiceOptionsProps) => {
  const services = ['LTL Standard', 'LTL Guaranteed 5 PM', 'LTL Guaranteed 12 PM', 'LTL Guaranteed 10 AM', 'Estes Retail Guarantee'];

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <h3 className="text-lg font-bold text-slate-900">Service Options</h3>
        {isExpanded ? (
          <ChevronUp className="text-slate-600" size={20} />
        ) : (
          <ChevronDown className="text-slate-600" size={20} />
        )}
      </button>
      {isExpanded && (
        <div className="p-6 space-y-4">
          <button
            type="button"
            onClick={onShowRates}
            className="px-6 py-3 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors font-semibold"
          >
            SHOW RATES
          </button>
          <p className="text-sm text-slate-600">
            Please note: If you modify your shipment details, you must click Show Rates again to update your rates.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {services.map((service) => (
              <div
                key={service}
                className={`p-4 border-2 rounded-lg ${
                  selectedService === service ? 'border-yellow-400 bg-yellow-50' : 'border-slate-200 bg-white'
                }`}
              >
                <h4 className="font-semibold text-slate-900 mb-2">{service}</h4>
                <button
                  type="button"
                  onClick={() => onServiceChange(service)}
                  className={`w-full px-4 py-2 rounded-lg font-semibold text-sm ${
                    selectedService === service
                      ? 'bg-slate-300 text-slate-700'
                      : 'bg-yellow-400 text-slate-900 hover:bg-yellow-500'
                  }`}
                >
                  {selectedService === service ? 'SELECTED' : 'SELECT'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


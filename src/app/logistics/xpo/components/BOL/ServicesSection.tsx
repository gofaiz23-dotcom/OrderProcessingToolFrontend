'use client';

import { Info } from 'lucide-react';

type ServiceOption = {
  value: string;
  label: string;
};

type ServicesSectionProps = {
  title: string;
  services: ServiceOption[];
  selectedServices: string[];
  onServiceToggle: (service: string) => void;
  columns?: number;
};

export const ServicesSection = ({
  title,
  services,
  selectedServices,
  onServiceToggle,
  columns = 3,
}: ServicesSectionProps) => {
  const gridCols = columns === 3 ? 'md:grid-cols-3' : columns === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <Info className="text-blue-500" size={18} />
      </div>
      
      <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
        {services.map((service) => (
          <label key={service.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedServices.includes(service.value)}
              onChange={() => onServiceToggle(service.value)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">{service.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};


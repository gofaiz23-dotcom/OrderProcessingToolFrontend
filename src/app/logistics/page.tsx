'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { RateQuoteTab, BillOfLadingTab } from './_components';
import { useLogisticsStore } from '@/store/logisticsStore';

export default function LogisticsPage() {
  const searchParams = useSearchParams();
  const selectedCarrier = searchParams?.get('carrier') || 'FedEx';
  const [activeTab, setActiveTab] = useState('rate-quote');
  const { getToken } = useLogisticsStore();
  const storedToken = getToken(selectedCarrier);

  return (
    <div className="flex h-full flex-col">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Logistics - {selectedCarrier}</h1>
      
      {/* Simple Tab Navigation */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-2">
          <button
            onClick={() => setActiveTab('rate-quote')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'rate-quote'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Rate Quote
          </button>
          <button
            onClick={() => setActiveTab('bill-of-lading')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'bill-of-lading'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Bill of Lading
          </button>
          <button
            onClick={() => setActiveTab('shipment-tracking')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'shipment-tracking'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Shipment Tracking
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'rate-quote' && <RateQuoteTab carrier={selectedCarrier} token={storedToken || undefined} />}
        {activeTab === 'bill-of-lading' && <BillOfLadingTab carrier={selectedCarrier} token={storedToken || undefined} />}
      </div>
    </div>
  );
}


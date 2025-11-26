'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { AuthenticateTab, RateQuoteTab, BillOfLadingTab } from './_components';

export default function LogisticsPage() {
  const searchParams = useSearchParams();
  const selectedCarrier = searchParams?.get('carrier') || 'FedEx';
  const [activeTab, setActiveTab] = useState('authenticate');

  return (
    <div className="flex h-full flex-col">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Logistics - {selectedCarrier}</h1>
      
      {/* Simple Tab Navigation */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-2">
          <button
            onClick={() => setActiveTab('authenticate')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'authenticate'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Authenticate
          </button>
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
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'authenticate' && <AuthenticateTab carrier={selectedCarrier} />}
        {activeTab === 'rate-quote' && <RateQuoteTab carrier={selectedCarrier} />}
        {activeTab === 'bill-of-lading' && <BillOfLadingTab carrier={selectedCarrier} />}
      </div>
    </div>
  );
}


'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Order } from '@/app/types/order';

type EstesRateQuoteProps = {
  order: Order;
};

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

export const EstesRateQuote = ({ order }: EstesRateQuoteProps) => {
  const [loading, setLoading] = useState(false);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Extract order data for rate quote
  // Origin - typically warehouse/shipper address (you may need to configure this)
  // For now, using placeholder - you should get this from your warehouse configuration
  const originCity = 'Warehouse City'; // TODO: Get from warehouse config
  const originState = 'Warehouse State'; // TODO: Get from warehouse config
  const originZip = 'Warehouse ZIP'; // TODO: Get from warehouse config
  
  // Destination - customer shipping address
  const destinationCity = getJsonbValue(order.jsonb, 'City') || '';
  const destinationState = getJsonbValue(order.jsonb, 'State') || '';
  const destinationZip = getJsonbValue(order.jsonb, 'Zip') || '';
  const destinationAddress = getJsonbValue(order.jsonb, 'Ship to Address 1') || 
                            getJsonbValue(order.jsonb, 'Address') || '';
  
  // Weight and dimensions
  const weight = getJsonbValue(order.jsonb, 'Weight') || 
                getJsonbValue(order.jsonb, 'Item Cost') || 
                '100'; // Default weight if not available

  const handleGetQuote = async () => {
    setLoading(true);
    setError(null);
    setQuotes([]);

    try {
      // TODO: Implement Estes rate quote API call
      // This is a placeholder - you'll need to integrate with your Estes API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock response for now
      setQuotes([
        {
          id: 1,
          service: 'Standard LTL',
          rate: 118.75,
          transitDays: 2,
          carrier: 'Estes',
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get rate quote');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Order Summary */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">Shipment Details</h4>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-600">Origin:</span>
            <span className="ml-2 text-slate-900 font-medium">
              {originCity}, {originState} {originZip}
            </span>
          </div>
          <div>
            <span className="text-slate-600">Destination:</span>
            <span className="ml-2 text-slate-900 font-medium">
              {destinationCity}, {destinationState} {destinationZip}
            </span>
          </div>
          <div>
            <span className="text-slate-600">Weight:</span>
            <span className="ml-2 text-slate-900 font-medium">{weight} lbs</span>
          </div>
        </div>
      </div>

      {/* Get Quote Button */}
      <button
        onClick={handleGetQuote}
        disabled={loading}
        className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Getting Quote...
          </>
        ) : (
          'Get Estes Rate Quote'
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Quotes Display */}
      {quotes.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-900">Available Quotes</h4>
          {quotes.map((quote) => (
            <div
              key={quote.id}
              className="bg-white border border-slate-300 rounded-lg p-4 shadow-sm"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{quote.service}</div>
                  <div className="text-xs text-slate-600 mt-1">
                    Transit: {quote.transitDays} day{quote.transitDays !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="text-lg font-bold text-green-600">
                  ${quote.rate.toFixed(2)}
                </div>
              </div>
              <button className="w-full mt-3 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs font-medium">
                Select This Quote
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && quotes.length === 0 && !error && (
        <div className="text-center py-8 text-sm text-slate-500">
          Click "Get Estes Rate Quote" to retrieve shipping rates
        </div>
      )}
    </div>
  );
};


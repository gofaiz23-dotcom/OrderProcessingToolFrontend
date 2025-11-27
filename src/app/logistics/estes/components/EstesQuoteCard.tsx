'use client';

import { CheckCircle2, Clock } from 'lucide-react';

type EstesQuoteCardProps = {
  quote: any;
  index: number;
};

export const EstesQuoteCard = ({ quote, index }: EstesQuoteCardProps) => {
  return (
    <div
      className={`border-2 rounded-lg p-5 transition-all ${
        index === 0
          ? 'border-yellow-400 bg-yellow-50'
          : 'border-slate-300 bg-white hover:border-slate-400'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h4 className="text-lg font-bold text-slate-900 mb-2">
            {quote.serviceLevelText || 'Service Level'}
          </h4>
          {quote.rateFound && (
            <div className="flex items-center gap-2 text-green-600 text-sm mb-2">
              <CheckCircle2 size={16} />
              <span>Rate Found</span>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-900">
            ${quote.quoteRate?.totalCharges || '0.00'}
          </div>
          <div className="text-sm text-slate-600">Total Charges</div>
        </div>
      </div>

      {quote.dates && (
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Clock size={14} />
            <span>
              Delivery: {quote.dates.transitDeliveryDate} by {quote.dates.transitDeliveryTime}
            </span>
          </div>
          {quote.transitDetails?.transitDays && (
            <div className="text-sm text-slate-600">
              Transit Days: {quote.transitDetails.transitDays}
            </div>
          )}
        </div>
      )}

      {quote.quoteId && (
        <div className="text-xs text-slate-500 mb-4">Quote ID: {quote.quoteId}</div>
      )}

      {quote.quoteRate?.ratedAccessorials && quote.quoteRate.ratedAccessorials.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-slate-700 mb-2">Accessorials:</div>
          <div className="space-y-1">
            {quote.quoteRate.ratedAccessorials.map((acc: any, accIndex: number) => (
              <div key={accIndex} className="text-xs text-slate-600">
                {acc.description}: ${acc.charge}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
        <input
          type="radio"
          name="selectedQuote"
          defaultChecked={index === 0}
          className="w-4 h-4 text-blue-600"
        />
        <span className="text-sm text-slate-700">Select this quote</span>
      </div>
    </div>
  );
};


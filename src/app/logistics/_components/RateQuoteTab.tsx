'use client';

import { useState, useEffect } from 'react';
import { LogisticsAuthModal } from '@/app/components/shared/LogisticsAuthModal';
import { useLogisticsStore } from '@/store/logisticsStore';
import { getAllLogisticsShippedOrders } from '@/app/api/LogisticsApi/LogisticsShippedOrders';

type RateQuoteTabProps = {
  carrier: string;
  token?: string;
};

export const RateQuoteTab = ({ carrier, token }: RateQuoteTabProps) => {
  const { getToken } = useLogisticsStore();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [rateQuoteData, setRateQuoteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const storedToken = getToken(carrier) || token;

  // Check authentication on mount and when token changes
  useEffect(() => {
    if (!storedToken) {
      setIsAuthModalOpen(true);
    }
  }, [storedToken, carrier]);

  // Fetch rate quote data if authenticated
  useEffect(() => {
    const fetchRateQuoteData = async () => {
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        // Try to get rate quote data from LogisticsShippedOrders
        const response = await getAllLogisticsShippedOrders();
        if (response.data && response.data.length > 0) {
          // Find the most recent order with rate quote data
          const orderWithRateQuote = response.data.find(
            (order) => order.rateQuotesResponseJsonb && 
            Object.keys(order.rateQuotesResponseJsonb).length > 0
          );
          
          if (orderWithRateQuote?.rateQuotesResponseJsonb) {
            setRateQuoteData(orderWithRateQuote.rateQuotesResponseJsonb);
          }
        }
      } catch (error) {
        console.error('Failed to fetch rate quote data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRateQuoteData();
  }, [storedToken]);

  // If no token, show white screen with login modal (user can't access until login)
  if (!storedToken) {
    return (
      <>
        <div className="w-full h-full bg-white" />
        <LogisticsAuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          carrier={carrier}
        />
      </>
    );
  }

  // If loading, show white screen
  if (loading) {
    return <div className="w-full h-full bg-white" />;
  }

  // If authenticated but no rate quote data, show white screen
  if (!rateQuoteData) {
    return <div className="w-full h-full bg-white" />;
  }

  // If there's rate quote data, show it in background
  return (
    <>
      <div className="relative w-full h-full bg-white">
        {/* Background: Rate Quote Response */}
        <div className="absolute inset-0 p-3 sm:p-4 lg:p-6 overflow-auto opacity-50">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">Rate Quote Response</h3>
            <pre className="p-3 sm:p-4 bg-slate-50 border border-slate-300 rounded-lg overflow-auto text-xs sm:text-sm font-mono">
              {JSON.stringify(rateQuoteData, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </>
  );
};


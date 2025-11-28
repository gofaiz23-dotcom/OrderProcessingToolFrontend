'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EstesRateQuoteService } from './RateQuoteService';
import { useLogisticsStore } from '@/store/logisticsStore';

function EstesRateQuotePageContent() {
  const searchParams = useSearchParams();
  const selectedCarrier = searchParams?.get('carrier') || 'Estes';
  const orderId = searchParams?.get('orderId');
  const { getToken } = useLogisticsStore();
  const storedToken = getToken(selectedCarrier);
  const [orderData, setOrderData] = useState<{
    sku?: string;
    orderOnMarketPlace?: string;
    ordersJsonb?: Record<string, unknown>;
  } | null>(null);

  // Get order data from sessionStorage or fetch from API
  useEffect(() => {
    const getOrderData = async () => {
      // First, try to get from sessionStorage (set by OrderList)
      const storedOrderData = sessionStorage.getItem('selectedOrderForLogistics');
      if (storedOrderData) {
        try {
          const parsed = JSON.parse(storedOrderData);
          // Extract SKU from jsonb if available
          const sku = parsed.jsonb?.SKU || parsed.jsonb?.sku || '';
          
          setOrderData({
            sku: sku,
            orderOnMarketPlace: parsed.orderOnMarketPlace,
            ordersJsonb: parsed.jsonb as Record<string, unknown>,
          });
          
          // Clear sessionStorage after reading
          sessionStorage.removeItem('selectedOrderForLogistics');
        } catch (error) {
          console.error('Failed to parse stored order data:', error);
        }
      } else if (orderId) {
        // If orderId is in URL, fetch from API
        try {
          const { getAllOrders } = await import('@/app/api/OrderApi');
          const response = await getAllOrders();
          const order = response.orders?.find((o: any) => o.id === parseInt(orderId, 10));
          
          if (order) {
            const sku = (order.jsonb as any)?.SKU || (order.jsonb as any)?.sku || '';
            setOrderData({
              sku: sku,
              orderOnMarketPlace: order.orderOnMarketPlace,
              ordersJsonb: order.jsonb as Record<string, unknown>,
            });
          }
        } catch (error) {
          console.error('Failed to fetch order data:', error);
        }
      }
    };

    getOrderData();
  }, [orderId]);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <EstesRateQuoteService 
        carrier={selectedCarrier} 
        token={storedToken || undefined}
        orderData={orderData || undefined}
      />
    </div>
  );
}

export default function EstesRateQuotePage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    }>
      <EstesRateQuotePageContent />
    </Suspense>
  );
}


'use client';

import { useSearchParams } from 'next/navigation';
import { EstesRateQuoteService } from './RateQuoteService';
import { useLogisticsStore } from '@/store/logisticsStore';

export default function EstesRateQuotePage() {
  const searchParams = useSearchParams();
  const selectedCarrier = searchParams?.get('carrier') || 'Estes';
  const { getToken } = useLogisticsStore();
  const storedToken = getToken(selectedCarrier);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <EstesRateQuoteService carrier={selectedCarrier} token={storedToken || undefined} />
    </div>
  );
}


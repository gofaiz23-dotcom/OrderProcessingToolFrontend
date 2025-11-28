'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { OrderDetail } from '../_components';
import {
  createNewOrder,
} from '@/app/utils/Orders';
import type { CreateOrderPayload, UpdateOrderPayload } from '@/app/types/order';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';

export default function CreateOrderPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const handleSave = async (payload: CreateOrderPayload | UpdateOrderPayload) => {
    setSaving(true);
    setError(null);

    try {
      // Type guard: ensure we have CreateOrderPayload (required fields)
      if (!payload.orderOnMarketPlace || payload.jsonb === undefined) {
        throw new Error('Order on Marketplace and JSONB data are required');
      }
      const createPayload: CreateOrderPayload = {
        orderOnMarketPlace: payload.orderOnMarketPlace,
        jsonb: payload.jsonb,
      };
      await createNewOrder(createPayload);
      // Redirect to all orders page after successful creation
      router.push('/orders/all');
    } catch (err) {
      setError(err);
      console.error('Error creating order:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = useCallback(() => {
    router.push('/orders/all');
  }, [router]);

  return (
    <div className="flex h-full flex-col">
      {error != null && (
        <div className="p-4 border-b border-red-200 bg-red-50 rounded-lg mb-4">
          <ErrorDisplay error={error} />
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <div className="h-full bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <OrderDetail
            order={null}
            mode="create"
            loading={false}
            saving={saving}
            error={error}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </div>
  );
}


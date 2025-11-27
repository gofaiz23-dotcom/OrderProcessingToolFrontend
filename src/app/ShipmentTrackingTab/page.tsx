'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';
import { ShippedOrdersList } from './_components';
import {
  getAllShippedOrders,
  deleteShippedOrder,
  updateShippedOrder,
  deleteShippedOrdersByDateRange,
  type ShippedOrder,
  type UpdateShippedOrderPayload,
} from './utils/shippedOrdersApi';

export default function ShipmentTrackingTabPage() {
  const [orders, setOrders] = useState<ShippedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllShippedOrders();
      setOrders(data);
    } catch (err) {
      setError(err);
      console.error('Error loading shipped orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await deleteShippedOrder(id);
      await fetchOrders();
    } catch (err) {
      console.error('Error deleting order:', err);
      throw err;
    }
  };

  const handleUpdate = async (id: number, payload: UpdateShippedOrderPayload) => {
    try {
      await updateShippedOrder(id, payload);
      await fetchOrders();
    } catch (err) {
      console.error('Error updating order:', err);
      throw err;
    }
  };

  const handleDeleteByDateRange = async (startDate: string, endDate: string) => {
    try {
      await deleteShippedOrdersByDateRange(startDate, endDate);
      await fetchOrders();
    } catch (err) {
      console.error('Error deleting orders by date range:', err);
      throw err;
    }
  };

  return (
    <div className="flex h-full flex-col bg-white overflow-hidden p-6">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Shipment Tracking</h1>

      {error !== null && (
        <div className="mb-6">
          <ErrorDisplay error={error} />
          <button
            onClick={fetchOrders}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
          >
            Retry loading orders
          </button>
        </div>
      )}

      <ShippedOrdersList
        orders={orders}
        loading={loading}
        onRefresh={fetchOrders}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
        onDeleteByDateRange={handleDeleteByDateRange}
      />
    </div>
  );
}

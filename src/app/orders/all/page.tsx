'use client';

import { useState, useEffect, useCallback } from 'react';
import { OrderList, OrderDetail, CreateOrderModal } from '../_components';
import { ResizableSplitView } from '@/app/email/_components/shared';
import {
  loadOrders,
  createNewOrder,
  createNewOrders,
  updateExistingOrder,
  deleteExistingOrder,
} from '@/app/utils/Orders';
import { parseCSVFile, parseExcelFile } from '@/app/utils/Orders/fileParser';
import type { Order, CreateOrderPayload, UpdateOrderPayload } from '@/app/types/order';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';
import { Loader2 } from 'lucide-react';

type ViewMode = 'view' | 'edit';

export default function AllOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [mode, setMode] = useState<ViewMode>('view');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<unknown>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<unknown>(null);

  // Load orders on mount
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadOrders();
      setOrders(data);
      // Auto-select first order if available and none selected
      if (data.length > 0 && !selectedOrder && mode === 'view') {
        setSelectedOrder(data[0]);
      }
    } catch (err) {
      setError(err);
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSelect = useCallback((order: Order) => {
    setSelectedOrder(order);
    setMode('view');
    setError(null);
  }, []);

  const handleOrderEdit = useCallback((order: Order) => {
    setSelectedOrder(order);
    setMode('edit');
    setError(null);
  }, []);

  const handleSave = async (payload: UpdateOrderPayload) => {
    if (!selectedOrder) return;

    setSaving(true);
    setError(null);

    try {
      const updatedOrder = await updateExistingOrder(
        selectedOrder.id,
        payload,
      );
      // Update orders list
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)),
      );
      // Update selected order
      setSelectedOrder(updatedOrder);
      setMode('view');
    } catch (err) {
      setError(err);
      console.error('Error saving order:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = useCallback(() => {
    if (mode === 'edit') {
      // If editing, go back to view mode
      setMode('view');
      // Reload the order to discard changes
      if (selectedOrder) {
        const currentOrder = orders.find((o) => o.id === selectedOrder.id);
        if (currentOrder) {
          setSelectedOrder(currentOrder);
        }
      }
    }
    setError(null);
  }, [mode, orders, selectedOrder]);

  const handleOrderDelete = async (id: number) => {
    if (!confirm(`Are you sure you want to delete order #${id}? This action cannot be undone.`)) {
      return;
    }

    setError(null);
    try {
      await deleteExistingOrder(id);
      // Remove from orders list
      setOrders((prev) => prev.filter((o) => o.id !== id));
      // If deleted order was selected, select another one or clear selection
      if (selectedOrder?.id === id) {
        const remainingOrders = orders.filter((o) => o.id !== id);
        if (remainingOrders.length > 0) {
          setSelectedOrder(remainingOrders[0]);
        } else {
          setSelectedOrder(null);
        }
      }
    } catch (err) {
      setError(err);
      console.error('Error deleting order:', err);
      alert('Failed to delete order. Please try again.');
    }
  };

  const handleCreateOrder = async (payload: CreateOrderPayload) => {
    setCreateLoading(true);
    setCreateError(null);
    try {
      const newOrder = await createNewOrder(payload);
      // Refresh orders list
      await fetchOrders();
      // Select the newly created order
      setSelectedOrder(newOrder);
      setMode('view');
      setIsCreateModalOpen(false);
    } catch (err) {
      setCreateError(err);
      console.error('Error creating order:', err);
      throw err; // Re-throw so modal can handle it
    } finally {
      setCreateLoading(false);
    }
  };

  const handleImportFile = async (file: File) => {
    setImportLoading(true);
    setImportError(null);
    
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let orders: Array<{ orderOnMarketPlace: string; jsonb: Record<string, unknown> }> = [];

      if (fileExtension === 'csv') {
        orders = await parseCSVFile(file);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls' || fileExtension === 'ods') {
        orders = await parseExcelFile(file);
      } else {
        throw new Error('Unsupported file format. Please use CSV, XLSX, XLS, or ODS files.');
      }

      if (orders.length === 0) {
        throw new Error('No orders found in the file');
      }

      // Create all orders
      const createdOrders = await createNewOrders(orders);
      
      // Refresh orders list
      await fetchOrders();
      
      // Select the first created order
      if (createdOrders.length > 0) {
        setSelectedOrder(createdOrders[0]);
        setMode('view');
      }

      alert(`Successfully imported ${createdOrders.length} order(s)!`);
    } catch (err) {
      setImportError(err);
      console.error('Error importing file:', err);
      alert(`Failed to import file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setImportLoading(false);
    }
  };

  // Show error banner at top if there's a global error
  const hasGlobalError = (error || importError) && mode === 'view';

  return (
    <div className="flex h-full flex-col">
      {hasGlobalError && (
        <div className="p-4 border-b border-red-200 bg-red-50 rounded-lg mb-4">
          <ErrorDisplay error={error || importError} />
          <button
            onClick={fetchOrders}
            className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
          >
            Retry loading orders
          </button>
        </div>
      )}

      {importLoading && (
        <div className="p-4 border-b border-blue-200 bg-blue-50 rounded-lg mb-4 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <p className="text-sm text-blue-800">Importing orders from file...</p>
        </div>
      )}

      <div className="flex-1 overflow-hidden min-h-0">
        <ResizableSplitView
          defaultLeftWidth={40}
          minLeftWidth={20}
          maxLeftWidth={80}
          left={
            <div className="h-full border-r border-slate-200 flex flex-col overflow-hidden bg-white rounded-l-lg">
              {loading && orders.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : (
                <OrderList
                  orders={orders}
                  selectedOrderId={selectedOrder?.id ?? null}
                  loading={loading}
                  onOrderSelect={handleOrderSelect}
                  onOrderDelete={handleOrderDelete}
                  onOrderEdit={handleOrderEdit}
                  onCreateNew={() => {
                    setIsCreateModalOpen(true);
                  }}
                  onImportFile={handleImportFile}
                />
              )}
            </div>
          }
          right={
            <div className="h-full bg-white overflow-hidden flex flex-col rounded-r-lg">
              <OrderDetail
                order={selectedOrder}
                mode={mode}
                loading={loading && !orders.length}
                saving={saving}
                error={error}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            </div>
          }
        />
      </div>

      {/* Create Order Modal */}
      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreateError(null);
        }}
        onSave={handleCreateOrder}
        loading={createLoading}
        error={createError}
      />
    </div>
  );
}


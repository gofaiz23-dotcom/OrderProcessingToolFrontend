'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { OrderList, CreateOrderModal, EditOrderModal, Toast } from '../_components';
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

export default function AllOrdersPage() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<unknown>(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<Order | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<unknown>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<unknown>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Get marketplace filter from URL
  const marketplaceFilter = searchParams?.get('marketplace');

  // Filter orders by marketplace if filter is present
  const filteredOrders = useMemo(() => {
    if (!marketplaceFilter) {
      return orders;
    }
    return orders.filter(
      (order) => order.orderOnMarketPlace.toLowerCase() === marketplaceFilter.toLowerCase()
    );
  }, [orders, marketplaceFilter]);

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
    } catch (err) {
      setError(err);
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSelect = useCallback((order: Order) => {
    setSelectedOrder(order);
    setError(null);
  }, []);

  const handleOrderEdit = useCallback((order: Order) => {
    // Edit is now handled via EditOrderModal opened from OrderList
    setSelectedOrder(order);
    setError(null);
  }, []);

  const handleEditOrder = async (payload: UpdateOrderPayload) => {
    if (!selectedOrderForEdit) return;

    setEditLoading(true);
    setEditError(null);
    try {
      const updatedOrder = await updateExistingOrder(
        selectedOrderForEdit.id,
        payload,
      );
      // Refresh orders list
      await fetchOrders();
      // Update selected order if it was the one being edited
      if (selectedOrder?.id === updatedOrder.id) {
        setSelectedOrder(updatedOrder);
      }
      setSelectedOrderForEdit(null);
    } catch (err) {
      setEditError(err);
      console.error('Error updating order:', err);
      throw err; // Re-throw so modal can handle it
    } finally {
      setEditLoading(false);
    }
  };

  const handleOrderDelete = async (id: number) => {
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
      throw err; // Re-throw so modal can handle it
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (ids.length === 0) return;

    setError(null);
    try {
      // Delete all orders in parallel
      await Promise.all(ids.map((id) => deleteExistingOrder(id)));
      
      // Remove deleted orders from the list
      setOrders((prev) => prev.filter((o) => !ids.includes(o.id)));
      
      // Clear selected order if it was deleted
      if (selectedOrder && ids.includes(selectedOrder.id)) {
        const remainingOrders = orders.filter((o) => !ids.includes(o.id));
        setSelectedOrder(remainingOrders.length > 0 ? remainingOrders[0] : null);
      }
      
      // Refresh the orders list to ensure consistency
      await fetchOrders();
    } catch (err) {
      setError(err);
      console.error('Error deleting orders:', err);
      throw err; // Re-throw so OrderList can handle it
    }
  };

  const handleCreateOrder = async (payload: CreateOrderPayload) => {
    setCreateLoading(true);
    setCreateError(null);
    try {
      const newOrder = await createNewOrder(payload);
      // Refresh orders list
      await fetchOrders();
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

      // Use marketplace filter from URL if available, otherwise null
      const overrideMarketplace = marketplaceFilter || null;

      if (fileExtension === 'csv') {
        orders = await parseCSVFile(file, overrideMarketplace);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls' || fileExtension === 'ods') {
        orders = await parseExcelFile(file, overrideMarketplace);
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

      // Show toast notification instead of alert
      const marketplaceMessage = overrideMarketplace 
        ? ` with marketplace "${overrideMarketplace}"`
        : '';
      setToastMessage(`Successfully imported ${createdOrders.length} order(s)${marketplaceMessage}!`);
      setShowToast(true);
    } catch (err) {
      setImportError(err);
      console.error('Error importing file:', err);
      alert(`Failed to import file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setImportLoading(false);
    }
  };

  // Show error banner at top if there's a global error
  const hasGlobalError = error || importError;

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
        {loading && orders.length === 0 ? (
          <div className="flex h-full items-center justify-center bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <OrderList
            orders={filteredOrders}
            selectedOrderId={selectedOrder?.id ?? null}
            loading={loading}
            onOrderSelect={handleOrderSelect}
            onOrderDelete={handleOrderDelete}
            onOrderEdit={handleOrderEdit}
            onCreateNew={() => {
              setIsCreateModalOpen(true);
            }}
            onImportFile={handleImportFile}
            onOpenEditModal={setSelectedOrderForEdit}
            onBulkDelete={handleBulkDelete}
          />
        )}
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
        defaultMarketplace={marketplaceFilter}
      />

      {/* Edit Order Modal */}
      <EditOrderModal
        isOpen={selectedOrderForEdit !== null}
        order={selectedOrderForEdit}
        onClose={() => {
          setSelectedOrderForEdit(null);
          setEditError(null);
        }}
        onSave={handleEditOrder}
        loading={editLoading}
        error={editError}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          isVisible={showToast}
          onClose={() => {
            setShowToast(false);
            setTimeout(() => setToastMessage(null), 300);
          }}
          duration={4000}
        />
      )}
    </div>
  );
}


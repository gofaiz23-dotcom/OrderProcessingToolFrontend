'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { OrderList, CreateOrderModal, EditOrderModal, Toast } from '../_components';
import {
  loadOrders,
  createNewOrder,
  createNewOrders,
  updateExistingOrder,
  deleteExistingOrder,
} from '@/app/utils/Orders';
import { parseCSVFile, parseExcelFile } from '@/app/utils/Orders/fileParser';
import type { Order, CreateOrderPayload, UpdateOrderPayload, PaginationMeta } from '@/app/types/order';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';
import { Loader2, Search } from 'lucide-react';
import { DateFilter } from '@/app/components/shared/DateFilter';

type DateFilterOption = 'all' | 'today' | 'thisWeek' | 'specificDate' | 'custom';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50; // Match backend default pagination size

function AllOrdersPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
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

  // Get pagination and filter params from URL
  const currentPage = useMemo(() => {
    const pageParam = searchParams?.get('page');
    const pageNum = pageParam ? parseInt(pageParam, 10) : DEFAULT_PAGE;
    return isNaN(pageNum) || pageNum < 1 ? DEFAULT_PAGE : pageNum;
  }, [searchParams]);

  const limit = useMemo(() => {
    const limitParam = searchParams?.get('limit');
    const limitNum = limitParam ? parseInt(limitParam, 10) : DEFAULT_LIMIT;
    return isNaN(limitNum) || limitNum < 1 || limitNum > 100 ? DEFAULT_LIMIT : limitNum;
  }, [searchParams]);

  const marketplaceFilter = searchParams?.get('marketplace');
  const [searchQuery, setSearchQuery] = useState('');
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Update URL params when page changes
  const updatePageInUrl = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (page === DEFAULT_PAGE) {
      params.delete('page');
    } else {
      params.set('page', String(page));
    }
    const queryString = params.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ''}`);
  }, [searchParams, router, pathname]);

  // Helper function to extract value from JSONB with flexible key matching
  const getJsonbValue = useCallback((jsonb: Order['jsonb'], key: string): string => {
    if (!jsonb || typeof jsonb !== 'object' || Array.isArray(jsonb)) return '-';
    const obj = jsonb as Record<string, unknown>;
    
    // Normalize the key for matching
    const normalizedKey = key.trim();
    const keyWithoutHash = normalizedKey.replace(/#/g, '');
    const keyLower = normalizedKey.toLowerCase();
    const keyWithoutHashLower = keyWithoutHash.toLowerCase();
    
    // Generate all possible key variations
    const keysToTry = [
      normalizedKey,
      keyWithoutHash,
      `#${keyWithoutHash}`,
      keyLower,
      keyWithoutHashLower,
      `#${keyWithoutHashLower}`,
      normalizedKey.replace(/#/g, '').trim(),
    ];
    
    // Try exact matches first
    for (const k of keysToTry) {
      if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') {
        return String(obj[k]);
      }
    }
    
    // Try case-insensitive partial matching
    const allKeys = Object.keys(obj);
    for (const objKey of allKeys) {
      const objKeyLower = objKey.toLowerCase();
      if (
        objKeyLower === keyLower ||
        objKeyLower === keyWithoutHashLower ||
        objKeyLower.includes(keyWithoutHashLower) ||
        keyWithoutHashLower.includes(objKeyLower)
      ) {
        const value = obj[objKey];
        if (value !== undefined && value !== null && value !== '') {
          return String(value);
        }
      }
    }
    
    return '-';
  }, []);

  // Helper function to get date range based on filter option
  const getDateRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (dateFilter) {
      case 'today': {
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        return { start: today, end: todayEnd };
      }
      case 'thisWeek': {
        const startOfWeek = new Date(today);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return { start: startOfWeek, end: endOfWeek };
      }
      case 'specificDate': {
        if (!startDate) return null;
        const date = new Date(startDate);
        date.setHours(0, 0, 0, 0);
        const dateEnd = new Date(date);
        dateEnd.setHours(23, 59, 59, 999);
        return { start: date, end: dateEnd };
      }
      case 'custom': {
        if (!startDate || !endDate) return null;
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      default:
        return null;
    }
  }, [dateFilter, startDate, endDate]);

  // Apply date filter to orders
  const applyDateFilter = useCallback((orders: Order[]) => {
    if (dateFilter === 'all' || !getDateRange) {
      return orders;
    }

    return orders.filter((order) => {
      if (!order.createdAt) return false;
      const orderDate = new Date(order.createdAt);
      return orderDate >= getDateRange.start && orderDate <= getDateRange.end;
    });
  }, [dateFilter, getDateRange]);

  // Client-side search and date filter function
  const applyFilters = useCallback((orders: Order[], query: string) => {
    // First apply date filter
    let filtered = applyDateFilter(orders);
    
    // Then apply search filter
    const trimmedQuery = query.trim().toLowerCase();
    
    if (trimmedQuery !== '') {
      filtered = filtered.filter((order) => {
        // Search in Order ID
        if (order.id.toString().includes(trimmedQuery)) return true;
        
        // Search in Marketplace
        if (order.orderOnMarketPlace.toLowerCase().includes(trimmedQuery)) return true;
        
        // Search in all JSONB fields
        if (order.jsonb && typeof order.jsonb === 'object' && !Array.isArray(order.jsonb)) {
          const jsonbStr = JSON.stringify(order.jsonb).toLowerCase();
          if (jsonbStr.includes(trimmedQuery)) return true;
        }
        
        // Also check specific common fields
        const poNumber = getJsonbValue(order.jsonb, 'PO#');
        const sku = getJsonbValue(order.jsonb, 'SKU');
        const orderNumber = getJsonbValue(order.jsonb, 'Order#');
        const customerName = getJsonbValue(order.jsonb, 'Customer Name');
        const trackingNumber = getJsonbValue(order.jsonb, 'Tracking Number');
        
        if (poNumber.toLowerCase().includes(trimmedQuery) && poNumber !== '-') return true;
        if (sku.toLowerCase().includes(trimmedQuery) && sku !== '-') return true;
        if (orderNumber.toLowerCase().includes(trimmedQuery) && orderNumber !== '-') return true;
        if (customerName.toLowerCase().includes(trimmedQuery) && customerName !== '-') return true;
        if (trackingNumber.toLowerCase().includes(trimmedQuery) && trackingNumber !== '-') return true;

        return false;
      });
    }

    setFilteredOrders(filtered);
  }, [getJsonbValue, applyDateFilter]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loadOrders({
        page: currentPage,
        limit,
        orderOnMarketPlace: marketplaceFilter || undefined,
      });
      
      // Store all fetched orders for client-side filtering
      setAllOrders(result.orders);
      
      // Apply client-side filtering (search + date)
      applyFilters(result.orders, searchQuery);
      
      setPagination(result.pagination);
    } catch (err) {
      setError(err);
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, marketplaceFilter, searchQuery, applyFilters]);

  // Load orders when page, limit, or marketplace filter changes
  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, limit, marketplaceFilter]);

  // Apply client-side filters when searchQuery, allOrders, or date filter changes
  useEffect(() => {
    applyFilters(allOrders, searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, allOrders, dateFilter, startDate, endDate]);

  const handleSearch = useCallback(() => {
    // Trim the search query - filtering will happen automatically via useEffect
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery !== searchQuery) {
      setSearchQuery(trimmedQuery);
    }
    // Client-side filtering is handled by useEffect
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setDateFilter('all');
    setStartDate('');
    setEndDate('');
    // Client-side filtering will automatically show all results via useEffect
  }, []);

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
      // Refresh orders list to get updated data from backend
      await fetchOrders();
      // If deleted order was selected, select another one or clear selection
      if (selectedOrder?.id === id) {
        if (orders.length > 1) {
          const remainingOrder = orders.find((o) => o.id !== id);
          setSelectedOrder(remainingOrder || null);
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
      
      // Refresh the orders list to get updated data from backend
      await fetchOrders();
      
      // Clear selected order if it was deleted
      if (selectedOrder && ids.includes(selectedOrder.id)) {
        setSelectedOrder(orders.length > 0 ? orders[0] : null);
      }
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
  const hasGlobalError = error != null || importError != null;

  return (
    <div className="flex h-full flex-col">
      {hasGlobalError && (
        <div className="p-2 sm:p-4 border-b border-red-200 bg-red-50 rounded-none sm:rounded-lg mb-2 sm:mb-4">
          <ErrorDisplay error={error || importError} />
          <button
            onClick={() => fetchOrders()}
            className="mt-2 text-xs sm:text-sm text-red-700 hover:text-red-900 underline"
          >
            Retry loading orders
          </button>
        </div>
      )}

      {importLoading && (
        <div className="p-2 sm:p-4 border-b border-blue-200 bg-blue-50 rounded-none sm:rounded-lg mb-2 sm:mb-4 flex items-center gap-2 sm:gap-3">
          <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-blue-600" />
          <p className="text-xs sm:text-sm text-blue-800">Importing orders from file...</p>
        </div>
      )}

      <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
        {loading && orders.length === 0 ? (
          <div className="flex h-full items-center justify-center bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <OrderList
            orders={filteredOrders}
            selectedOrderId={selectedOrder?.id ?? null}
            loading={loading}
            pagination={pagination}
            currentPage={currentPage}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearch={handleSearch}
            onClearSearch={handleClearSearch}
            dateFilter={dateFilter}
            startDate={startDate}
            endDate={endDate}
            onDateFilterChange={setDateFilter}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onPageChange={updatePageInUrl}
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

export default function AllOrdersPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    }>
      <AllOrdersPageContent />
    </Suspense>
  );
}

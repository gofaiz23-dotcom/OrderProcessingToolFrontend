'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';
import { ProcessedOrdersList } from './_components';
import {
  getAllShippedOrders,
  deleteShippedOrder,
  updateShippedOrder,
  deleteShippedOrdersByDateRange,
  type ShippedOrder,
  type UpdateShippedOrderPayload,
  type GetAllShippedOrdersResponse,
} from './utils/shippedOrdersApi';
import type { PaginationMeta } from '@/app/types/order';

type DateFilterOption = 'all' | 'today' | 'thisWeek' | 'specificDate' | 'custom';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;

export default function ProcessedOrdersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [allOrders, setAllOrders] = useState<ShippedOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<ShippedOrder[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Get pagination params from URL
  const currentPage = parseInt(searchParams?.get('page') || '1', 10) || DEFAULT_PAGE;
  const limit = parseInt(searchParams?.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT;

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
  const applyDateFilter = useCallback((orders: ShippedOrder[]) => {
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
  const applyFilters = useCallback((orders: ShippedOrder[], query: string) => {
    // First apply date filter
    let filtered = applyDateFilter(orders);
    
    // Then apply search filter
    const trimmedQuery = query.trim().toLowerCase();
    
    if (trimmedQuery !== '') {
      filtered = filtered.filter((order) => {
        // Search in Order ID
        if (order.id.toString().includes(trimmedQuery)) return true;
        
        // Search in SKU
        if (order.sku && order.sku.toLowerCase().includes(trimmedQuery)) return true;
        
        // Search in Marketplace
        if (order.orderOnMarketPlace && order.orderOnMarketPlace.toLowerCase().includes(trimmedQuery)) return true;
        
        // Search in Status
        if (order.status && order.status.toLowerCase().includes(trimmedQuery)) return true;
        
        // Search in all JSONB fields (ordersJsonb, bolResponseJsonb, etc.)
        if (order.ordersJsonb && typeof order.ordersJsonb === 'object') {
          const jsonbStr = JSON.stringify(order.ordersJsonb).toLowerCase();
          if (jsonbStr.includes(trimmedQuery)) return true;
        }
        
        if (order.bolResponseJsonb && typeof order.bolResponseJsonb === 'object') {
          const jsonbStr = JSON.stringify(order.bolResponseJsonb).toLowerCase();
          if (jsonbStr.includes(trimmedQuery)) return true;
        }
        
        if (order.rateQuotesResponseJsonb && typeof order.rateQuotesResponseJsonb === 'object') {
          const jsonbStr = JSON.stringify(order.rateQuotesResponseJsonb).toLowerCase();
          if (jsonbStr.includes(trimmedQuery)) return true;
        }
        
        if (order.pickupResponseJsonb && typeof order.pickupResponseJsonb === 'object') {
          const jsonbStr = JSON.stringify(order.pickupResponseJsonb).toLowerCase();
          if (jsonbStr.includes(trimmedQuery)) return true;
        }

        return false;
      });
    }

    setFilteredOrders(filtered);
  }, [applyDateFilter]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch orders without search - we'll filter client-side
      const result: GetAllShippedOrdersResponse = await getAllShippedOrders({
        page: currentPage,
        limit,
      });
      
      // Store all fetched orders for client-side filtering
      setAllOrders(result.orders);
      
      // Apply client-side filtering (search + date)
      applyFilters(result.orders, searchQuery);
      
      setPagination(result.pagination);
    } catch (err) {
      setError(err);
      console.error('Error loading processed orders:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, searchQuery, applyFilters]);

  // Load orders when page or limit changes
  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, limit]);

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
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Processed Orders</h1>

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

      <ProcessedOrdersList
        orders={filteredOrders}
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
        onRefresh={fetchOrders}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
        onDeleteByDateRange={handleDeleteByDateRange}
      />
    </div>
  );
}


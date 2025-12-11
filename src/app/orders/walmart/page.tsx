'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { OrderList } from '../_components';
import { getWalmartOrders } from '@/app/api/walmart-api/orders';
import type { Order, PaginationMeta } from '@/app/types/order';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';
import { Loader2 } from 'lucide-react';
import { DateFilter } from '@/app/components/shared/DateFilter';

type DateFilterOption = 'all' | 'today' | 'thisWeek' | 'specificDate' | 'custom';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 100; // Walmart API default

function WalmartOrdersPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Get pagination params from URL
  const currentPage = useMemo(() => {
    const pageParam = searchParams?.get('page');
    const pageNum = pageParam ? parseInt(pageParam, 10) : DEFAULT_PAGE;
    return isNaN(pageNum) || pageNum < 1 ? DEFAULT_PAGE : pageNum;
  }, [searchParams]);

  const limit = useMemo(() => {
    const limitParam = searchParams?.get('limit');
    const limitNum = limitParam ? parseInt(limitParam, 10) : DEFAULT_LIMIT;
    return isNaN(limitNum) || limitNum < 1 || limitNum > 200 ? DEFAULT_LIMIT : limitNum;
  }, [searchParams]);

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

  // Helper to get date range for filters
  const getDateRange = useCallback(() => {
    if (dateFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return {
        start: today.toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
      };
    } else if (dateFilter === 'thisWeek') {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return {
        start: weekStart.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      };
    } else if (dateFilter === 'specificDate' && startDate) {
      return {
        start: startDate,
        end: startDate,
      };
    } else if (dateFilter === 'custom' && startDate && endDate) {
      return {
        start: startDate,
        end: endDate,
      };
    }
    return null;
  }, [dateFilter, startDate, endDate]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dateRange = getDateRange();
      
      const result = await getWalmartOrders({
        page: currentPage,
        limit,
        createdStartDate: dateRange?.start,
        createdEndDate: dateRange?.end,
      });
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch Walmart orders');
      }
      
      setOrders(result.orders);
      setPagination(result.pagination);
    } catch (err) {
      setError(err);
      console.error('Error loading Walmart orders:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, getDateRange]);

  // Load orders when page, limit, or date filter changes
  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, limit, dateFilter, startDate, endDate]);

  const handleSearch = useCallback(() => {
    // For Walmart orders, we can search by customerOrderId or purchaseOrderId
    // For now, just filter client-side
    fetchOrders();
  }, [fetchOrders]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setDateFilter('all');
    setStartDate('');
    setEndDate('');
    fetchOrders();
  }, [fetchOrders]);

  const handlePageChange = useCallback((page: number) => {
    updatePageInUrl(page);
  }, [updatePageInUrl]);

  const handleOrderSelect = useCallback((order: Order) => {
    setSelectedOrder(order);
  }, []);

  const handleOrderDelete = useCallback(async (id: number) => {
    // Walmart orders are read-only, cannot delete
    console.warn('Walmart orders cannot be deleted from this interface');
  }, []);

  const handleCreateNew = useCallback(() => {
    // Walmart orders are read-only, cannot create
    console.warn('Walmart orders cannot be created from this interface');
  }, []);

  const handleImportFile = useCallback(async (file: File) => {
    // Walmart orders are read-only, cannot import
    console.warn('Walmart orders cannot be imported');
  }, []);

  if (error) {
    return (
      <div className="flex h-full flex-col">
        <ErrorDisplay error={error} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <OrderList
        orders={orders}
        selectedOrderId={selectedOrder?.id || null}
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
        onPageChange={handlePageChange}
        onOrderSelect={handleOrderSelect}
        onOrderDelete={handleOrderDelete}
        onCreateNew={handleCreateNew}
        onImportFile={handleImportFile}
      />
    </div>
  );
}

export default function WalmartOrdersPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    }>
      <WalmartOrdersPageContent />
    </Suspense>
  );
}


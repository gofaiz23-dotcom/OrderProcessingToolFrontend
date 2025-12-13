'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { OrderList } from '../_components';
import { getWalmartOrders } from '@/app/api/walmart-api/orders';
import type { Order, PaginationMeta } from '@/app/types/order';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';
import { Loader2 } from 'lucide-react';
import { DateFilter } from '@/app/components/shared/DateFilter';
import { useWalmartTokenRefresh } from '@/app/hooks/useWalmartTokenRefresh';

type DateFilterOption = 'all' | 'today' | 'thisWeek' | 'specificDate' | 'custom';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 100; // Walmart API default

function WalmartOrdersPageContent() {
  // Initialize token refresh hook - automatically fetches token on mount and refreshes every 10 min
  // Hook handles client-side check internally
  useWalmartTokenRefresh();
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [allOrders, setAllOrders] = useState<Order[]>([]); // Store all fetched orders
  const [orders, setOrders] = useState<Order[]>([]); // Filtered and paginated orders
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  
  // Walmart API Filters
  const [sku, setSku] = useState('');
  const [customerOrderId, setCustomerOrderId] = useState('');
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [status, setStatus] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fromExpectedShipDate, setFromExpectedShipDate] = useState('');
  const [toExpectedShipDate, setToExpectedShipDate] = useState('');
  const [lastModifiedStartDate, setLastModifiedStartDate] = useState('');
  const [lastModifiedEndDate, setLastModifiedEndDate] = useState('');
  const [shipNodeType, setShipNodeType] = useState('');
  const [shippingProgramType, setShippingProgramType] = useState('');
  const [orderType, setOrderType] = useState('');
  const [productInfo, setProductInfo] = useState(false);
  const [replacementInfo, setReplacementInfo] = useState(false);
  const [incentiveInfo, setIncentiveInfo] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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
  // Walmart API expects dates in YYYY-MM-DD format (UTC)
  // createdStartDate and createdEndDate filter by orderDate (when order was created)
  const getDateRange = useCallback(() => {
    // Helper to format date as YYYY-MM-DD in UTC
    const formatDateUTC = (date: Date) => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    if (dateFilter === 'today') {
      // Get today's date in UTC
      const now = new Date();
      const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const todayStr = formatDateUTC(todayUTC);
      
      return {
        start: todayStr,
        end: todayStr, // Same day for start and end
      };
    } else if (dateFilter === 'thisWeek') {
      // Get start of week (Sunday) in UTC
      const now = new Date();
      const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const dayOfWeek = todayUTC.getUTCDay();
      const weekStart = new Date(todayUTC);
      weekStart.setUTCDate(todayUTC.getUTCDate() - dayOfWeek);
      
      const weekEnd = new Date(todayUTC);
      
      return {
        start: formatDateUTC(weekStart),
        end: formatDateUTC(weekEnd),
      };
    } else if (dateFilter === 'specificDate' && startDate) {
      // Validate and format the date
      if (startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return {
          start: startDate,
          end: startDate,
        };
      }
      return null;
    } else if (dateFilter === 'custom' && startDate && endDate) {
      // Validate and format the dates
      if (startDate.match(/^\d{4}-\d{2}-\d{2}$/) && endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Ensure end date is not before start date
        if (new Date(endDate) >= new Date(startDate)) {
          return {
            start: startDate,
            end: endDate,
          };
        }
      }
      return null;
    }
    return null;
  }, [dateFilter, startDate, endDate]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔄 Fetching Walmart orders...', {
        page: currentPage,
        limit,
        filters: {
          sku,
          customerOrderId,
          purchaseOrderId,
          status,
        },
      });
      
      // Build query params - DO NOT include date filters (we'll filter client-side)
      const queryParams: any = {
        page: 1, // Always fetch from page 1, we'll paginate client-side
        limit: 200, // Fetch more orders to allow client-side filtering
        sku: sku || undefined,
        customerOrderId: customerOrderId || undefined,
        purchaseOrderId: purchaseOrderId || undefined,
        status: status || undefined,
        fromExpectedShipDate: fromExpectedShipDate || undefined,
        toExpectedShipDate: toExpectedShipDate || undefined,
        lastModifiedStartDate: lastModifiedStartDate || undefined,
        lastModifiedEndDate: lastModifiedEndDate || undefined,
        shipNodeType: shipNodeType || undefined,
        shippingProgramType: shippingProgramType || undefined,
        orderType: orderType || undefined,
        productInfo: productInfo || undefined,
        replacementInfo: replacementInfo || undefined,
        incentiveInfo: incentiveInfo || undefined,
      };
      
      // DO NOT send date filters to API - we'll filter client-side
      
      const result = await getWalmartOrders(queryParams);
      
      console.log('📦 Walmart orders result:', {
        success: result.success,
        ordersCount: result.orders?.length || 0,
        pagination: result.pagination,
        message: result.message,
        error: result.error,
      });
      
      if (!result.success) {
        const errorMessage = result.message || 'Failed to fetch Walmart orders';
        console.error('❌ Failed to fetch orders:', errorMessage, result.error);
        throw new Error(errorMessage);
      }
      
      if (!result.orders || result.orders.length === 0) {
        console.warn('⚠️ No orders returned from API');
        setAllOrders([]);
      } else {
        // Store all fetched orders (will be filtered and paginated client-side)
        setAllOrders(result.orders);
      }
    } catch (err) {
      setError(err);
      console.error('❌ Error loading Walmart orders:', err);
    } finally {
      setLoading(false);
    }
  }, [
    sku,
    customerOrderId,
    purchaseOrderId,
    status,
    fromExpectedShipDate,
    toExpectedShipDate,
    lastModifiedStartDate,
    lastModifiedEndDate,
    shipNodeType,
    shippingProgramType,
    orderType,
    productInfo,
    replacementInfo,
    incentiveInfo,
  ]);

  // Fetch orders from API when non-date filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPage,
    limit,
    sku,
    customerOrderId,
    purchaseOrderId,
    status,
    fromExpectedShipDate,
    toExpectedShipDate,
    lastModifiedStartDate,
    lastModifiedEndDate,
    shipNodeType,
    shippingProgramType,
    orderType,
    productInfo,
    replacementInfo,
    incentiveInfo,
  ]);

  // Apply client-side date filtering when date filters change
  useEffect(() => {
    if (allOrders.length === 0) return;
    
    const dateRange = getDateRange();
    let filteredOrders = allOrders;
    
    if (dateRange && dateRange.start && dateRange.end) {
      console.log('📅 Applying client-side date filter:', dateRange);
      
      filteredOrders = allOrders.filter((order: Order) => {
        // Get order date from jsonb or createdAt
        const orderDateStr = order.jsonb?.['Order Date'] || order.createdAt;
        if (!orderDateStr) return false;
        
        try {
          // Parse order date (could be ISO string or date string)
          const orderDate = new Date(orderDateStr);
          if (isNaN(orderDate.getTime())) return false;
          
          // Extract date part (YYYY-MM-DD)
          const orderDateOnly = orderDate.toISOString().split('T')[0];
          
          // Check if order date is within range (inclusive)
          const isInRange = orderDateOnly >= dateRange.start && orderDateOnly <= dateRange.end;
          
          return isInRange;
        } catch (error) {
          console.error('Error parsing order date:', orderDateStr, error);
          return false;
        }
      });
      
      console.log(`📊 Filtered orders: ${filteredOrders.length} out of ${allOrders.length}`);
    }
    
    // Apply pagination to filtered results
    const startIndex = (currentPage - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
    
    setOrders(paginatedOrders);
    
    // Update pagination with filtered count
    setPagination({
      page: currentPage,
      limit: limit,
      totalCount: filteredOrders.length,
      totalPages: Math.ceil(filteredOrders.length / limit),
      hasNextPage: endIndex < filteredOrders.length,
      hasPreviousPage: currentPage > 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allOrders, dateFilter, startDate, endDate, currentPage, limit]);

  const handleSearch = useCallback(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleClearSearch = useCallback(() => {
    setSku('');
    setCustomerOrderId('');
    setPurchaseOrderId('');
    setStatus('');
    setDateFilter('all');
    setStartDate('');
    setEndDate('');
    setFromExpectedShipDate('');
    setToExpectedShipDate('');
    setLastModifiedStartDate('');
    setLastModifiedEndDate('');
    setShipNodeType('');
    setShippingProgramType('');
    setOrderType('');
    setProductInfo(false);
    setReplacementInfo(false);
    setIncentiveInfo(false);
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
    <div className="flex h-full flex-col overflow-hidden w-full">
      {/* Top Bar with Show Filters and Action Buttons */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-2"
          >
            <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
            <span className="text-xs">{showFilters ? '▲' : '▼'}</span>
          </button>
          
          {/* Total Orders Count Badge */}
          {!loading && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md">
              <span className="text-xs font-medium text-blue-700">Total Orders</span>
              <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 bg-blue-600 text-white text-sm font-bold rounded-full">
                {pagination?.totalCount || orders.length || 0}
              </span>
            </div>
          )}
        </div>
        
        {/* Search and Clear Buttons - Only show when filters are visible */}
        {showFilters && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
            <button
              onClick={handleClearSearch}
              className="px-3 py-1.5 bg-white text-slate-900 border border-slate-300 rounded-md hover:bg-slate-50 text-xs font-medium"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Walmart API Filters Panel - Collapsible */}
      {showFilters && (
        <div className="flex-shrink-0 bg-white border-b border-slate-200 p-3 space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {/* SKU */}
          <div>
            <label className="block text-xs font-medium text-slate-900 mb-0.5">SKU</label>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Product SKU"
              className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Purchase Order ID */}
          <div>
            <label className="block text-xs font-medium text-slate-900 mb-0.5">Purchase Order ID</label>
            <input
              type="text"
              value={purchaseOrderId}
              onChange={(e) => setPurchaseOrderId(e.target.value)}
              placeholder="Purchase Order ID"
              className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-slate-900 mb-0.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="Created">Created</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Ship Node Type */}
          <div>
            <label className="block text-xs font-medium text-slate-900 mb-0.5">Ship Node Type</label>
            <select
              value={shipNodeType}
              onChange={(e) => setShipNodeType(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="SellerFulfilled">Seller Fulfilled</option>
              <option value="WFSFulfilled">WFS Fulfilled</option>
              <option value="3PLFulfilled">3PL Fulfilled</option>
            </select>
          </div>

          {/* Shipping Program Type */}
          <div>
            <label className="block text-xs font-medium text-slate-900 mb-0.5">Shipping Program</label>
            <select
              value={shippingProgramType}
              onChange={(e) => setShippingProgramType(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Programs</option>
              <option value="TWO_DAY">Two Day</option>
              <option value="ONE_DAY">One Day</option>
            </select>
          </div>

          {/* Order Type */}
          <div>
            <label className="block text-xs font-medium text-slate-900 mb-0.5">Order Type</label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="REGULAR">Regular</option>
              <option value="REPLACEMENT">Replacement</option>
              <option value="PREORDER">Preorder</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <DateFilter
              dateFilter={dateFilter}
              startDate={startDate}
              endDate={endDate}
              onDateFilterChange={setDateFilter}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          </div>

          {/* Expected Ship Date Range */}
          <div>
            <label className="block text-xs font-medium text-slate-900 mb-0.5">Expected Ship Date From</label>
            <input
              type="date"
              value={fromExpectedShipDate}
              onChange={(e) => setFromExpectedShipDate(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-900 mb-0.5">Expected Ship Date To</label>
            <input
              type="date"
              value={toExpectedShipDate}
              onChange={(e) => setToExpectedShipDate(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Last Modified Date Range */}
          <div>
            <label className="block text-xs font-medium text-slate-900 mb-0.5">Last Modified From</label>
            <input
              type="date"
              value={lastModifiedStartDate}
              onChange={(e) => setLastModifiedStartDate(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-900 mb-0.5">Last Modified To</label>
            <input
              type="date"
              value={lastModifiedEndDate}
              onChange={(e) => setLastModifiedEndDate(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Checkboxes */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs text-slate-900">
              <input
                type="checkbox"
                checked={productInfo}
                onChange={(e) => setProductInfo(e.target.checked)}
                className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
              />
              <span className="text-[10px]">Product Info</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-900">
              <input
                type="checkbox"
                checked={replacementInfo}
                onChange={(e) => setReplacementInfo(e.target.checked)}
                className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
              />
              <span className="text-[10px]">Replacement</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-900">
              <input
                type="checkbox"
                checked={incentiveInfo}
                onChange={(e) => setIncentiveInfo(e.target.checked)}
                className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
              />
              <span className="text-[10px]">Incentive</span>
            </label>
          </div>
        </div>
        </div>
      )}

      {/* Orders Table - Always visible, takes remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden w-full">
      <OrderList
        orders={orders}
        selectedOrderId={selectedOrder?.id || null}
        loading={loading}
        pagination={pagination}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onOrderSelect={handleOrderSelect}
        onOrderDelete={handleOrderDelete}
          hideTitle={true}
          hideSearch={true}
          fullWidth={true}
      />
      </div>
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

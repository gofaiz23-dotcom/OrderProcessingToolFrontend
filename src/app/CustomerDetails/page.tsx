'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAllOrdersJsonb, type OrdersJsonbItem } from '@/app/api/LogisticsApi/CustomerDetails';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';
import { DateFilter } from '@/app/components/shared/DateFilter';

type DateFilterOption = 'all' | 'today' | 'thisWeek' | 'specificDate' | 'custom';

type ColumnDefinition = {
  key: string;
  label: string;
  fieldNames: string[]; // Possible field names in ordersJsonb
  width?: string;
};

// Define the specific columns to display
const COLUMNS: ColumnDefinition[] = [
  { key: 'marketplace', label: 'Marketplace', fieldNames: ['marketplace'], width: '140px' },
  { key: 'po', label: 'PO#', fieldNames: ['PO#', 'PO', 'Purchase Order', 'PurchaseOrder', 'po', 'purchase_order'], width: '120px' },
  { key: 'customerName', label: 'Customer Name', fieldNames: ['Customer Name', 'CustomerName', 'customer_name', 'Customer', 'customer'], width: '180px' },
  { key: 'customerShippingAddress', label: 'Customer Shipping Address', fieldNames: ['Customer Shipping Address', 'CustomerShippingAddress', 'customer_shipping_address', 'Shipping Address'], width: '200px' },
  { key: 'customerPhoneNumber', label: 'Customer Phone Number', fieldNames: ['Customer Phone Number', 'CustomerPhoneNumber', 'customer_phone_number', 'Phone', 'phone', 'Phone Number'], width: '160px' },
  { key: 'shipToAddress1', label: 'Ship to Address 1', fieldNames: ['Ship to Address 1', 'ShipToAddress1', 'ship_to_address_1', 'Address 1', 'Address1', 'address1'], width: '180px' },
  { key: 'shipToAddress2', label: 'Ship to Address 2', fieldNames: ['Ship to Address 2', 'ShipToAddress2', 'ship_to_address_2', 'Address 2', 'Address2', 'address2'], width: '180px' },
  { key: 'shipToCountry', label: 'Ship to Country', fieldNames: ['Ship to Country', 'ShipToCountry', 'ship_to_country', 'Country', 'country'], width: '140px' },
  { key: 'city', label: 'City', fieldNames: ['City', 'city'], width: '120px' },
  { key: 'state', label: 'State', fieldNames: ['State', 'state'], width: '100px' },
  { key: 'zip', label: 'Zip', fieldNames: ['Zip', 'zip', 'ZIP', 'Postal Code', 'postal_code', 'PostalCode'], width: '100px' },
  { key: 'sku', label: 'SKU', fieldNames: ['SKU', 'sku'], width: '150px' },
  { key: 'itemCost', label: 'Item Cost', fieldNames: ['Item Cost', 'ItemCost', 'item_cost', 'Cost', 'cost', 'Price', 'price'], width: '120px' },
];

// Helper function to extract value from ordersJsonb based on possible field names
const getFieldValue = (ordersJsonb: Record<string, unknown>, column: ColumnDefinition): string => {
  if (!ordersJsonb || typeof ordersJsonb !== 'object') return '-';
  
  // Try to find the value using any of the possible field names
  for (const fieldName of column.fieldNames) {
    if (ordersJsonb[fieldName] !== undefined && ordersJsonb[fieldName] !== null) {
      return String(ordersJsonb[fieldName]);
    }
  }
  
  return '-';
};

export default function CustomerDetailsPage() {
  const [allOrders, setAllOrders] = useState<OrdersJsonbItem[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrdersJsonbItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const ITEMS_PER_PAGE = 50;

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
  const applyDateFilter = useMemo(() => {
    return (orders: OrdersJsonbItem[]) => {
      if (dateFilter === 'all' || !getDateRange) {
        return orders;
      }

      return orders.filter((order) => {
        if (!order.createdAt) return false;
        const orderDate = new Date(order.createdAt);
        return orderDate >= getDateRange.start && orderDate <= getDateRange.end;
      });
    };
  }, [dateFilter, getDateRange]);

  // Client-side search and date filter function
  const applyFilters = (orders: OrdersJsonbItem[], query: string) => {
    // First apply date filter
    let filtered = applyDateFilter(orders);
    
    // Then apply search filter
    const trimmedQuery = query.trim().toLowerCase();
    
    if (trimmedQuery !== '') {
      filtered = filtered.filter((order) => {
        // Search in marketplace
        const marketplace = (order.orderOnMarketPlace || '').toLowerCase();
        if (marketplace.includes(trimmedQuery)) return true;

        // Search in all columns from ordersJsonb
        for (const column of COLUMNS) {
          if (column.key === 'marketplace') continue; // Already checked above
          
          const value = getFieldValue(order.ordersJsonb, column);
          if (value !== '-' && value.toLowerCase().includes(trimmedQuery)) {
            return true;
          }
        }

        return false;
      });
    }

    setFilteredOrders(filtered);
  };

  const fetchOrders = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all orders without filtering (we'll filter client-side)
      const response = await getAllOrdersJsonb({
        page,
        limit: ITEMS_PER_PAGE,
        orderOnMarketPlace: undefined, // Don't filter by marketplace on backend
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      
      // Store all orders for client-side filtering
      setAllOrders(response.orders);
      
      // Apply client-side filtering (search + date)
      applyFilters(response.orders, searchQuery);
      
      setTotalPages(response.pagination.totalPages);
      setTotalCount(response.pagination.totalCount);
      setCurrentPage(response.pagination.page);
      setItemsPerPage(response.pagination.limit);
      setHasNextPage(response.pagination.hasNextPage);
      setHasPreviousPage(response.pagination.hasPreviousPage);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Apply client-side filters when searchQuery, allOrders, or date filter changes
  useEffect(() => {
    applyFilters(allOrders, searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, allOrders, dateFilter, startDate, endDate]);

  const handleSearch = () => {
    // Trim the search query - filtering will happen automatically via useEffect
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery !== searchQuery) {
      setSearchQuery(trimmedQuery);
    }
    // Client-side filtering is handled by useEffect
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    // Client-side filtering will automatically show all results via useEffect
  };


  if (loading && allOrders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Customer Details</h1>
        <p className="text-sm text-slate-600">View and edit customer order information</p>
      </div>

      {/* Search Bar and Date Filter */}
      <div className="mb-6 flex items-end gap-4 flex-wrap relative z-50">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-900">Search</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search in table..."
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              className="w-48 pl-9 pr-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 bg-white text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </label>
        
        <DateFilter
          dateFilter={dateFilter}
          startDate={startDate}
          endDate={endDate}
          onDateFilterChange={setDateFilter}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
        
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-900 opacity-0">Actions</span>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              'Search'
            )}
          </button>
        </div>
        {(searchQuery || dateFilter !== 'all') && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-900 opacity-0">Clear</span>
            <button
              onClick={() => {
                handleClearSearch();
                setDateFilter('all');
                setStartDate('');
                setEndDate('');
              }}
              className="px-4 py-1.5 text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors text-sm"
              title="Clear filters"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto border border-slate-200 rounded-lg bg-white shadow-sm">
        <table className="w-full border-collapse">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100 sticky top-0 z-10 border-b-2 border-slate-300">
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider"
                  style={{ width: column.width }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-base font-medium">No customer details found</p>
                    <p className="text-sm">Try adjusting your search criteria</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-blue-50/30 transition-colors">
                  {COLUMNS.map((column) => {
                    // Special handling for marketplace - get from order.orderOnMarketPlace
                    const value = column.key === 'marketplace' 
                      ? order.orderOnMarketPlace || '-'
                      : getFieldValue(order.ordersJsonb, column);

                    return (
                      <td key={column.key} className="px-4 py-4 text-sm text-slate-900 border-r border-slate-100 last:border-r-0">
                        <span className="block truncate" title={value !== '-' ? value : undefined}>
                          {value}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 border-t border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-700">
              Showing <span className="font-medium">
                {totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
              </span> to{' '}
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, totalCount)}
              </span> of{' '}
              <span className="font-medium">{totalCount}</span> results
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={!hasPreviousPage}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  // Show first page, last page, current page, and pages around current
                  if (totalPages <= 7) return true;
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - currentPage) <= 1) return true;
                  return false;
                })
                .map((page, index, array) => {
                  // Add ellipsis if there's a gap
                  const showEllipsisBefore = index > 0 && page - array[index - 1] > 1;
                  
                  return (
                    <div key={page} className="flex items-center gap-1">
                      {showEllipsisBefore && (
                        <span className="px-2 text-sm text-slate-500">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-[36px] px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  );
                })}
            </div>
            
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={!hasNextPage}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


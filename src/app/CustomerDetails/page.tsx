'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { getAllOrdersJsonb, type OrdersJsonbItem } from '@/app/api/LogisticsApi/CustomerDetails';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';

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

  const ITEMS_PER_PAGE = 50;

  // Client-side search filter function
  const applySearchFilter = (orders: OrdersJsonbItem[], query: string) => {
    const trimmedQuery = query.trim().toLowerCase();
    
    if (trimmedQuery === '') {
      setFilteredOrders(orders);
      return;
    }

    const filtered = orders.filter((order) => {
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
      
      // Apply client-side filtering
      applySearchFilter(response.orders, searchQuery);
      
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

  // Apply client-side search filter when searchQuery or allOrders change
  useEffect(() => {
    applySearchFilter(allOrders, searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, allOrders]);

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

      {/* Search Bar */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
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
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
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
        {searchQuery && (
          <button
            onClick={handleClearSearch}
            className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            title="Clear search"
          >
            Clear
          </button>
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
      {(totalCount > 0 || filteredOrders.length > 0) && (
        <div className="mt-6 w-full bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            {/* Results Info */}
            <div className="text-sm text-slate-600 whitespace-nowrap">
              {searchQuery.trim() ? (
                <>
                  Showing <span className="font-semibold text-slate-900">{filteredOrders.length}</span> of{' '}
                  <span className="font-semibold text-slate-900">{totalCount}</span> results
                  {filteredOrders.length < totalCount && (
                    <span className="text-slate-500 ml-2">(filtered)</span>
                  )}
                </>
              ) : (
                <>
                  Showing <span className="font-semibold text-slate-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                  <span className="font-semibold text-slate-900">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{' '}
                  <span className="font-semibold text-slate-900">{totalCount}</span> results
                </>
              )}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
            {/* First Page Button */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={!hasPreviousPage}
              className="p-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>

            {/* Previous Button */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={!hasPreviousPage}
              className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            {/* Page Numbers */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                {(() => {
                  const pages: (number | string)[] = [];
                  const maxVisible = 5;
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

                  if (endPage - startPage < maxVisible - 1) {
                    startPage = Math.max(1, endPage - maxVisible + 1);
                  }

                  if (startPage > 1) {
                    pages.push(1);
                    if (startPage > 2) {
                      pages.push('...');
                    }
                  }

                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(i);
                  }

                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push('...');
                    }
                    pages.push(totalPages);
                  }

                  return pages.map((page, index) => {
                    if (page === '...') {
                      return (
                        <span key={`ellipsis-${index}`} className="px-2 py-1 text-slate-400">
                          ...
                        </span>
                      );
                    }

                    const pageNum = page as number;
                    const isActive = pageNum === currentPage;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`min-w-[36px] px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                            : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  });
                })()}
              </div>
            )}

            {/* Next Button */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={!hasNextPage}
              className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Last Page Button */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={!hasNextPage}
              className="p-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>

            {/* Page Input (Optional) */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-sm text-slate-600">Go to:</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= totalPages) {
                      setCurrentPage(page);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const page = parseInt(e.currentTarget.value);
                      if (page >= 1 && page <= totalPages) {
                        setCurrentPage(page);
                      } else {
                        e.currentTarget.value = currentPage.toString();
                      }
                    }
                  }}
                  className="w-16 px-2 py-1 text-sm text-center border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm text-slate-600">/ {totalPages}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


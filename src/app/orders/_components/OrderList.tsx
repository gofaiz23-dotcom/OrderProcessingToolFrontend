'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, FileUp, Trash2, Download, ChevronLeft, ChevronRight, Edit, Info, Truck, ChevronDown, Loader2 } from 'lucide-react';
import type { Order, PaginationMeta } from '@/app/types/order';
import { OrderDetailsModal } from './OrderDetailsModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { exportOrdersToCSV } from '@/app/utils/Orders/exportOrders';
import { LOGISTICS_CARRIERS } from '@/Shared/constant';
import { DateFilter } from '@/app/components/shared/DateFilter';
import { useLogisticsStore } from '@/store/logisticsStore';
import { LogisticsAuthModal } from '@/app/components/shared/LogisticsAuthModal';

type DateFilterOption = 'all' | 'today' | 'thisWeek' | 'specificDate' | 'custom';

type OrderListProps = {
  orders: Order[];
  selectedOrderId?: number | null;
  loading?: boolean;
  pagination?: PaginationMeta | null;
  currentPage?: number;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearch?: () => void;
  onClearSearch?: () => void;
  dateFilter?: DateFilterOption;
  startDate?: string;
  endDate?: string;
  onDateFilterChange?: (option: DateFilterOption) => void;
  onStartDateChange?: (value: string) => void;
  onEndDateChange?: (value: string) => void;
  onPageChange?: (page: number) => void;
  onOrderSelect: (order: Order) => void;
  onOrderDelete: (id: number) => Promise<void>;
  onOrderEdit?: (order: Order) => void;
  onCreateNew: () => void;
  onImportFile: (file: File) => Promise<void>;
  onOpenEditModal?: (order: Order) => void;
  onBulkDelete?: (ids: number[]) => Promise<void>;
};

export const OrderList = ({
  orders,
  selectedOrderId,
  loading = false,
  pagination,
  currentPage: currentPageProp = 1,
  searchQuery: searchQueryProp = '',
  onSearchChange,
  onSearch,
  onClearSearch,
  dateFilter = 'all',
  startDate = '',
  endDate = '',
  onDateFilterChange,
  onStartDateChange,
  onEndDateChange,
  onPageChange,
  onOrderSelect,
  onOrderDelete,
  onOrderEdit,
  onCreateNew,
  onImportFile,
  onOpenEditModal,
  onBulkDelete,
}: OrderListProps) => {
  const router = useRouter();
  const { getToken, isTokenExpired, isSessionActive } = useLogisticsStore();
  // Use prop searchQuery if provided, otherwise use local state
  const searchQuery = searchQueryProp !== undefined ? searchQueryProp : '';
  const setSearchQuery = onSearchChange || (() => {});
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogisticsDropdown, setShowLogisticsDropdown] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<Order | null>(null);
  const [showLogisticsAuthModal, setShowLogisticsAuthModal] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState<string | null>(null);
  const [pendingLogisticsAction, setPendingLogisticsAction] = useState<{
    carrier: string;
    order: Order;
  } | null>(null);
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    type: 'single' | 'bulk' | null;
    orderId: number | null;
    orderIds: number[];
    loading: boolean;
  }>({
    isOpen: false,
    type: null,
    orderId: null,
    orderIds: [],
    loading: false,
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const logisticsDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use pagination from backend if available, otherwise use client-side pagination for search
  const currentPage = pagination?.page ?? currentPageProp;
  const totalPages = pagination?.totalPages ?? 1;

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (logisticsDropdownRef.current && !logisticsDropdownRef.current.contains(event.target as Node)) {
        setShowLogisticsDropdown(false);
      }
    };

    if (showDropdown || showLogisticsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown, showLogisticsDropdown]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImportFile(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShowDropdown(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
    setShowDropdown(false);
  };

  // Handle logistics redirect after authentication
  const handleLogisticsRedirect = (carrier: string, order: Order) => {
    // Store order data in sessionStorage to pass to rate quote page
    sessionStorage.setItem('selectedOrderForLogistics', JSON.stringify({
      id: order.id,
      orderOnMarketPlace: order.orderOnMarketPlace,
      jsonb: order.jsonb,
    }));
    
    // Redirect to the appropriate logistics rate quote page
    // Map carrier names to their route paths (default to estes if not found)
    const carrierRoutes: Record<string, string> = {
      'Estes': '/logistics/estes',
      'XPO': '/logistics/xpo',
      'Expo': '/logistics/xpo', // Alias for XPO
      'FedEx': '/logistics/estes', // Using estes as default for now
      'UPS': '/logistics/estes',   // Using estes as default for now
    };
    
    // Normalize carrier name for routing (handle case variations)
    const normalizedCarrier = carrier.trim();
    const route = carrierRoutes[normalizedCarrier] || carrierRoutes[normalizedCarrier.toUpperCase()] || '/logistics/estes';
    router.push(`${route}?carrier=${encodeURIComponent(carrier)}&orderId=${order.id}`);
    setShowLogisticsDropdown(false);
  };


  // Helper function to extract value from JSONB with flexible key matching
  const getJsonbValue = (jsonb: Order['jsonb'], key: string): string => {
      if (!jsonb || typeof jsonb !== 'object' || Array.isArray(jsonb)) return '-';
      const obj = jsonb as Record<string, unknown>;
      
      // Normalize the key for matching
      const normalizedKey = key.trim();
      const keyWithoutHash = normalizedKey.replace(/#/g, '');
      const keyLower = normalizedKey.toLowerCase();
      const keyWithoutHashLower = keyWithoutHash.toLowerCase();
      
      // Generate all possible key variations
      const keysToTry = [
        normalizedKey,                    // Exact match: "PO#"
        keyWithoutHash,                   // Without #: "PO"
        `#${keyWithoutHash}`,             // With # prefix: "#PO"
        keyLower,                         // Lowercase: "po#"
        keyWithoutHashLower,              // Lowercase without #: "po"
        `#${keyWithoutHashLower}`,        // Lowercase with #: "#po"
        normalizedKey.replace(/#/g, '').trim(), // Remove all #
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
  };

  // No client-side filtering - backend handles search
  const displayOrders = orders;

  // Handle individual checkbox selection
  const handleCheckboxChange = (orderId: number, checked: boolean) => {
    setSelectedOrderIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId);
      }
      return newSet;
    });
  };

  // Handle select all (only for current page)
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelectedIds = new Set(selectedOrderIds);
      displayOrders.forEach((order) => newSelectedIds.add(order.id));
      setSelectedOrderIds(newSelectedIds);
    } else {
      const newSelectedIds = new Set(selectedOrderIds);
      displayOrders.forEach((order) => newSelectedIds.delete(order.id));
      setSelectedOrderIds(newSelectedIds);
    }
  };

  // Check if all orders on current page are selected
  const allSelected = displayOrders.length > 0 && displayOrders.every((order) => selectedOrderIds.has(order.id));
  const someSelected = displayOrders.some((order) => selectedOrderIds.has(order.id));

  // Handle page changes
  const handlePageChange = (page: number) => {
    if (onPageChange) {
      onPageChange(page);
    }
    // Clear selections when changing pages
    setSelectedOrderIds(new Set());
  };

  // Handle bulk delete click
  const handleBulkDeleteClick = () => {
    const idsToDelete = Array.from(selectedOrderIds);
    if (idsToDelete.length === 0) return;

    setDeleteModalState({
        isOpen: true,
        type: 'bulk',
        orderId: null,
        orderIds: idsToDelete,
        loading: false,
      });
  };

  // Handle single delete click
  const handleSingleDeleteClick = (orderId: number) => {
    setDeleteModalState({
      isOpen: true,
      type: 'single',
      orderId,
      orderIds: [],
      loading: false,
    });
  };

  // Confirm delete action
  const handleConfirmDelete = async () => {
    setDeleteModalState((prev) => ({ ...prev, loading: true }));

    try {
      if (deleteModalState.type === 'bulk') {
        const idsToDelete = deleteModalState.orderIds;
        if (onBulkDelete) {
          await onBulkDelete(idsToDelete);
          setSelectedOrderIds(new Set());
        } else {
          // Fallback: delete one by one
          for (const id of idsToDelete) {
            await onOrderDelete(id);
          }
          setSelectedOrderIds(new Set());
        }
      } else if (deleteModalState.type === 'single' && deleteModalState.orderId) {
        await onOrderDelete(deleteModalState.orderId);
      }

      // Close modal on success
      setDeleteModalState({
        isOpen: false,
        type: null,
        orderId: null,
        orderIds: [],
        loading: false,
      });
    } catch (error) {
      console.error('Error deleting orders:', error);
      setDeleteModalState((prev) => ({ ...prev, loading: false }));
      // Error handling is done by parent component
    }
  };

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <div className="p-4 border-b border-slate-200">
          <div className="h-10 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="w-full">
            <div className="h-12 bg-slate-200 rounded animate-pulse mb-2" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded animate-pulse mb-2" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white overflow-hidden p-0 sm:p-4 lg:p-6 min-h-0">
      {/* Page Title */}
      <div className="px-3 pt-3 pb-2 sm:px-0 sm:pt-0 sm:pb-0 flex-shrink-0 border-b border-slate-200 sm:border-0 mb-2 sm:mb-4 lg:mb-6">
        <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-slate-900">Orders</h1>
      </div>

      {/* Search and Action Buttons */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-2 sm:mb-4 lg:mb-6 relative z-40 px-3 sm:px-0 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 sm:gap-3 flex-1 flex-wrap">
          <label className="flex flex-col gap-1 flex-1 sm:flex-initial min-w-0">
            <span className="text-xs font-medium text-slate-900 hidden sm:block">Search</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && onSearch) {
                    e.preventDefault();
                    onSearch();
                  }
                }}
                className="w-full sm:w-48 pl-9 pr-3 py-2.5 sm:py-1.5 border border-slate-300 bg-white text-slate-900 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-colors"
              />
            </div>
          </label>
          {onDateFilterChange && onStartDateChange && onEndDateChange && (
            <DateFilter
              dateFilter={dateFilter}
              startDate={startDate}
              endDate={endDate}
              onDateFilterChange={onDateFilterChange}
              onStartDateChange={onStartDateChange}
              onEndDateChange={onEndDateChange}
            />
          )}
          {onSearch && (
            <button
              onClick={onSearch}
              disabled={loading}
              className="px-4 py-2.5 sm:py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Searching...</span>
                  <span className="sm:hidden">Searching</span>
                </>
              ) : (
                'Search'
              )}
            </button>
          )}
          {(searchQuery || (dateFilter !== 'all' && onClearSearch)) && onClearSearch && (
            <button
              onClick={onClearSearch}
              className="px-4 py-2.5 sm:py-1.5 text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors text-sm w-full sm:w-auto"
              title="Clear filters"
            >
              Clear
            </button>
          )}
        </div>

        {/* Right Side Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Logistics Dropdown Button - Show only when exactly one order is selected */}
          {selectedOrderIds.size === 1 && (
            <div className="relative w-full sm:w-auto" ref={logisticsDropdownRef}>
              <button
                onClick={() => setShowLogisticsDropdown(!showLogisticsDropdown)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 w-full sm:w-auto text-orange-600 rounded-md border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors text-sm font-medium"
              >
                <Truck className="h-4 w-4" />
                <span className="hidden sm:inline">Logistics</span>
                <span className="sm:hidden">Logistics</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showLogisticsDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Logistics Dropdown Menu */}
              {showLogisticsDropdown && (
                <div className="absolute right-0 mt-2 w-full sm:w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-[60]">
                  {LOGISTICS_CARRIERS.map((carrier) => {
                    // Get the selected order
                    const selectedOrderId = Array.from(selectedOrderIds)[0];
                    const selectedOrder = orders.find(order => order.id === selectedOrderId);
                    
                    return (
                      <button
                        key={carrier}
                        onClick={() => {
                          if (selectedOrder) {
                            // Store order data in sessionStorage before checking token
                            // This ensures the order info is available after login
                            sessionStorage.setItem('selectedOrderForLogistics', JSON.stringify({
                              id: selectedOrder.id,
                              orderOnMarketPlace: selectedOrder.orderOnMarketPlace,
                              jsonb: selectedOrder.jsonb,
                            }));
                            
                            // Check if logistics token exists and is valid for this carrier
                            const normalizedCarrier = carrier.toLowerCase();
                            const logisticsToken = getToken(normalizedCarrier);
                            const tokenExpired = logisticsToken ? isTokenExpired(normalizedCarrier, 10) : true;
                            const sessionActive = isSessionActive();
                            
                            // If no token, or token expired and session not active, show login popup
                            if (!logisticsToken || (tokenExpired && !sessionActive)) {
                              // Token doesn't exist or expired with no active session, show logistics login popup and preserve the action
                              setPendingLogisticsAction({ carrier, order: selectedOrder });
                              setSelectedCarrier(carrier);
                              setShowLogisticsAuthModal(true);
                              setShowLogisticsDropdown(false);
                              return; // Don't proceed until user is logged in to logistics
                            }
                            
                            // User is logged in to logistics, proceed with redirect to rate quote page
                            handleLogisticsRedirect(carrier, selectedOrder);
                          }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                      >
                        <Truck className="h-4 w-4 text-slate-500" />
                        {carrier}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

            

          {/* Add New Button with Dropdown */}
          <div className="relative w-full sm:w-auto" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 w-full sm:w-auto text-blue-600 rounded-md border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              <span>Add New</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-full sm:w-48 bg-white border border-slate-200 transition-colors shadow-xl rounded-lg z-[60]">
                <button
                  onClick={() => {
                    onCreateNew();
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700   hover:bg-slate-50 transition-colors text-left"
                >
                  <Plus className="h-4 w-4 text-slate-500" />
                  Add New
                </button>
                <button
                  onClick={handleImportClick}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700  hover:bg-slate-50 transition-colors text-left"
                >
                  <FileUp className="h-4 w-4 text-slate-500" />
                  Import File
                </button>
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.ods"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Bulk Delete Button - Show only when orders are selected */}
          {selectedOrderIds.size > 0 && (
            <button
              onClick={handleBulkDeleteClick}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 w-full sm:w-auto text-red-600 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 transition-colors text-sm font-medium"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete ({selectedOrderIds.size})</span>
            </button>
          )}

          {/* Export Button */}
          <button
            onClick={() => exportOrdersToCSV(displayOrders)}
            disabled={displayOrders.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 w-full sm:w-auto bg-white text-slate-700 rounded-md border border-slate-300 hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {displayOrders.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 p-4 sm:p-8">
            <p className="text-sm text-center px-4">
              {searchQuery ? 'No orders match your search on this page' : 'No orders found'}
            </p>
            {!searchQuery && (
              <button
                onClick={onCreateNew}
                className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-700 text-sm font-medium border border-blue-200 rounded-md hover:bg-blue-50"
              >
                Create your first order
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-hidden relative min-h-0">
              <div className="bg-white h-full w-full flex flex-col min-h-0">
                <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full relative">
                  <table className="min-w-full divide-y divide-slate-200 w-full table-auto">
                    <thead className="bg-slate-50 border-b-2 border-slate-300 sticky top-0 z-10">
                      <tr>
                        <th
                          scope="col"
                          className="px-2 sm:px-3 lg:px-6 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-50"
                        >
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              ref={(input) => {
                                if (input) input.indeterminate = someSelected && !allSelected;
                              }}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                            />
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-2 sm:px-3 lg:px-6 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-50"
                        >
                          ID
                        </th>
                        <th
                          scope="col"
                          className="px-2 sm:px-3 lg:px-6 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-50"
                        >
                          <span className="hidden sm:inline">Marketplace</span>
                          <span className="sm:hidden">Mkt</span>
                        </th>
                        <th
                          scope="col"
                          className="px-2 sm:px-3 lg:px-6 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-50"
                        >
                          PO#
                        </th>
                        <th
                          scope="col"
                          className="px-2 sm:px-3 lg:px-6 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-50"
                        >
                          SKU
                        </th>
                        <th
                          scope="col"
                          className="px-2 sm:px-3 lg:px-6 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-50 hidden sm:table-cell"
                        >
                          Order#
                        </th>
                        <th
                          scope="col"
                          className="px-2 sm:px-3 lg:px-6 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-50 hidden md:table-cell"
                        >
                          Customer
                        </th>
                        <th
                          scope="col"
                          className="px-2 sm:px-3 lg:px-6 py-2.5 sm:py-3 text-left text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-50 hidden lg:table-cell"
                        >
                          Tracking
                        </th>
                        <th
                          scope="col"
                          className="px-2 sm:px-3 lg:px-6 py-2.5 sm:py-3 text-center text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider sticky top-0 right-0 bg-slate-50 z-30"
                        >
                          <span className="hidden sm:inline">Actions</span>
                          <span className="sm:hidden">Act</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                    {displayOrders.map((order) => {
                      const isSelected = selectedOrderId === order.id;
                      const isChecked = selectedOrderIds.has(order.id);
                      
                      // Extract values from JSONB
                      const poNumber = getJsonbValue(order.jsonb, 'PO#');
                      const sku = getJsonbValue(order.jsonb, 'SKU');
                      const orderNumber = getJsonbValue(order.jsonb, 'Order#');
                      const customerName = getJsonbValue(order.jsonb, 'Customer Name');
                      const trackingNumber = getJsonbValue(order.jsonb, 'Tracking Number');
                      
                      return (
                        <tr
                          key={order.id}
                          onClick={() => onOrderSelect(order)}
                          className={`cursor-pointer transition-all duration-150 border-b border-slate-200 ${
                            isChecked || isSelected
                              ? 'bg-blue-50 border-l-4 border-l-blue-600'
                              : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          {/* Select Column with Checkbox */}
                          <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => handleCheckboxChange(order.id, e.target.checked)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                              />
                            </div>
                          </td>
                          {/* Order ID Column */}
                          <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className={`text-xs sm:text-sm font-semibold ${
                              isSelected ? 'text-blue-600' : 'text-slate-900'
                            }`}>
                              #{order.id}
                            </div>
                          </td>
                          {/* Marketplace Column */}
                          <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 sm:px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-semibold bg-purple-100 text-purple-800">
                              {order.orderOnMarketPlace}
                            </span>
                          </td>
                          {/* PO# Column */}
                          <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="text-xs sm:text-sm text-slate-900 font-medium">
                              {poNumber}
                            </div>
                          </td>
                          {/* SKU Column */}
                          <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="text-xs sm:text-sm text-slate-900 font-medium">
                              {sku}
                            </div>
                          </td>
                          {/* Order# Column */}
                          <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 whitespace-nowrap hidden sm:table-cell">
                            <div className="text-xs sm:text-sm text-slate-900">
                              {orderNumber}
                            </div>
                          </td>
                          {/* Customer Name Column */}
                          <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 hidden md:table-cell">
                            <div className="text-xs sm:text-sm text-slate-900 max-w-xs truncate" title={customerName !== '-' ? customerName : ''}>
                              {customerName}
                            </div>
                          </td>
                          {/* Tracking Number Column */}
                          <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                            <div className="text-xs sm:text-sm text-slate-900">
                              {trackingNumber}
                            </div>
                          </td>
                          {/* Actions Column */}
                          <td 
                            className={`px-2 sm:px-3 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-center sticky right-0 transition-all duration-150 z-10 ${
                              isChecked || isSelected
                                ? 'bg-blue-50'
                                : 'bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrderForDetails(order);
                                }}
                                className="inline-flex items-center justify-center p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-md transition-colors"
                                title="View order details"
                              >
                                <Info className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onOpenEditModal) {
                                    onOpenEditModal(order);
                                  } else {
                                    setSelectedOrderForEdit(order);
                                  }
                                }}
                                className="inline-flex items-center justify-center p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-md transition-colors"
                                title="Edit order"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSingleDeleteClick(order.id);
                                }}
                                className="inline-flex items-center justify-center p-2 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-md transition-colors"
                                title="Delete order"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="border-t-2 border-slate-300 bg-slate-50 px-3 sm:px-3 lg:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm text-slate-700">
                        <span className="font-medium">
                          {pagination.totalCount === 0 ? 0 : (currentPage - 1) * pagination.limit + 1}
                        </span> -{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * pagination.limit, pagination.totalCount)}
                        </span> of{' '}
                        <span className="font-medium">{pagination.totalCount}</span>
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={!pagination.hasPreviousPage}
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
                                  onClick={() => handlePageChange(page)}
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
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={!pagination.hasNextPage}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Order Details Modal */}
        <OrderDetailsModal
          isOpen={selectedOrderForDetails !== null}
          order={selectedOrderForDetails}
          onClose={() => setSelectedOrderForDetails(null)}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmDeleteModal
          isOpen={deleteModalState.isOpen}
          onClose={() => {
            if (!deleteModalState.loading) {
              setDeleteModalState({
                isOpen: false,
                type: null,
                orderId: null,
                orderIds: [],
                loading: false,
              });
            }
          }}
          onConfirm={handleConfirmDelete}
          title={
            deleteModalState.type === 'bulk'
              ? 'Confirm Bulk Deletion'
              : 'Confirm Deletion'
          }
          message={
            deleteModalState.type === 'bulk'
              ? `Are you sure you want to delete ${deleteModalState.orderIds.length} order(s)? This action cannot be undone.`
              : `Are you sure you want to delete order #${deleteModalState.orderId}? This action cannot be undone.`
          }
          loading={deleteModalState.loading}
        />

        {/* Logistics Authentication Modal */}
        {selectedCarrier && (
          <LogisticsAuthModal
            isOpen={showLogisticsAuthModal}
            onClose={() => {
              setShowLogisticsAuthModal(false);
              setSelectedCarrier(null);
              setPendingLogisticsAction(null);
            }}
            carrier={selectedCarrier}
          />
        )}
      </div>
    );
  };


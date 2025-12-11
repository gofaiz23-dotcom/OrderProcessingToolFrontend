'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Trash2, Edit, Info, ChevronLeft, ChevronRight, Calendar, PackageSearch, FileText, Loader2, X, Truck } from 'lucide-react';
import { buildFileUrl, getBackendBaseUrl } from '../../../../BaseUrl';
import type { ShippedOrder } from '../utils/shippedOrdersApi';
import type { PaginationMeta } from '@/app/types/order';
import { ProcessedOrderDetailsModal } from './ProcessedOrderDetailsModal';
import { ProcessedOrderEditModal } from './ProcessedOrderEditModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { DateRangeDeleteModal } from './DateRangeDeleteModal';
import { GetStatusModal } from './GetStatusModal';
import { DateFilter } from '@/app/components/shared/DateFilter';

type DateFilterOption = 'all' | 'today' | 'thisWeek' | 'specificDate' | 'custom';

type ProcessedOrdersListProps = {
  orders: ShippedOrder[];
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
  onRefresh: () => void;
  onDelete: (id: number) => Promise<void>;
  onUpdate: (id: number, payload: any) => Promise<void>;
  onDeleteByDateRange: (startDate: string, endDate: string) => Promise<void>;
};

export const ProcessedOrdersList = ({
  orders,
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
  onRefresh,
  onDelete,
  onUpdate,
  onDeleteByDateRange,
}: ProcessedOrdersListProps) => {
  const router = useRouter();
  // Use prop searchQuery if provided, otherwise use local state
  const searchQuery = searchQueryProp !== undefined ? searchQueryProp : '';
  const setSearchQuery = onSearchChange || (() => {});
  const currentPage = pagination?.page ?? currentPageProp;
  const totalPages = pagination?.totalPages ?? 1;
  
  const [orderType, setOrderType] = useState<string>('All');
  const [isLogisticsDropdownOpen, setIsLogisticsDropdownOpen] = useState(false);
  const logisticsDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<ShippedOrder | null>(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<ShippedOrder | null>(null);
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    orderId: number | null;
    loading: boolean;
  }>({
    isOpen: false,
    orderId: null,
    loading: false,
  });
  const [dateRangeDeleteModalOpen, setDateRangeDeleteModalOpen] = useState(false);
  const [getStatusModalOpen, setGetStatusModalOpen] = useState(false);
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState<ShippedOrder | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; filename: string; isPDF: boolean } | null>(null);

  // Close logistics dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (logisticsDropdownRef.current && !logisticsDropdownRef.current.contains(event.target as Node)) {
        setIsLogisticsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Helper function to determine logistics company from order
  const getLogisticsCompany = (order: ShippedOrder): string | null => {
    // Helper to normalize and check company name
    const normalizeCompany = (value: any): string | null => {
      if (!value) return null;
      const normalized = String(value).toLowerCase().trim();
      if (normalized === 'estes') return 'Estes';
      if (normalized === 'xpo' || normalized === 'expo') return 'XPO';
      return null;
    };

    // Check rateQuotesRequestJsonb first (most reliable source - this is where shippingCompany is stored)
    if (order.rateQuotesRequestJsonb && typeof order.rateQuotesRequestJsonb === 'object') {
      const requestData = order.rateQuotesRequestJsonb as any;
      // Check multiple possible field names - shippingCompany is the primary field from Estes/XPO
      const shippingCompany = requestData?.shippingCompany || 
                               requestData?.shipping_company ||
                               requestData?.shippingCompanyName ||
                               requestData?.shipping_company_name ||
                               requestData?.company ||
                               requestData?.carrier;
      const result = normalizeCompany(shippingCompany);
      if (result) {
        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          console.log('Found logistics company in rateQuotesRequestJsonb:', {
            orderId: order.id,
            shippingCompany,
            normalized: result,
            requestDataKeys: Object.keys(requestData),
          });
        }
        return result;
      }
    }
    
    // Check rateQuotesResponseJsonb
    if (order.rateQuotesResponseJsonb && typeof order.rateQuotesResponseJsonb === 'object') {
      const responseData = order.rateQuotesResponseJsonb as any;
      // Check response data structure - might be nested
      const shippingCompanyName = responseData?.shippingCompanyName || 
                                   responseData?.shipping_company_name ||
                                   responseData?.shippingCompany ||
                                   responseData?.shipping_company ||
                                   responseData?.data?.shippingCompanyName ||
                                   responseData?.data?.shippingCompany ||
                                   responseData?.company ||
                                   responseData?.carrier;
      const result = normalizeCompany(shippingCompanyName);
      if (result) return result;
    }
    
    // Check bolResponseJsonb as fallback
    if (order.bolResponseJsonb && typeof order.bolResponseJsonb === 'object') {
      const bolData = order.bolResponseJsonb as any;
      const shippingCompany = bolData?.shippingCompany || 
                               bolData?.shipping_company ||
                               bolData?.shippingCompanyName ||
                               bolData?.shipping_company_name ||
                               bolData?.data?.shippingCompany ||
                               bolData?.data?.shippingCompanyName ||
                               bolData?.company ||
                               bolData?.carrier;
      const result = normalizeCompany(shippingCompany);
      if (result) return result;
    }
    
    // Check pickupResponseJsonb as fallback
    if (order.pickupResponseJsonb && typeof order.pickupResponseJsonb === 'object') {
      const pickupData = order.pickupResponseJsonb as any;
      const shippingCompany = pickupData?.shippingCompany || 
                               pickupData?.shipping_company ||
                               pickupData?.shippingCompanyName ||
                               pickupData?.shipping_company_name ||
                               pickupData?.data?.shippingCompany ||
                               pickupData?.data?.shippingCompanyName ||
                               pickupData?.company ||
                               pickupData?.carrier;
      const result = normalizeCompany(shippingCompany);
      if (result) return result;
    }
    
    // Check ordersJsonb as last resort - might contain carrier info
    if (order.ordersJsonb && typeof order.ordersJsonb === 'object') {
      const ordersData = order.ordersJsonb as any;
      const carrier = ordersData?.carrier || 
                      ordersData?.Carrier ||
                      ordersData?.shippingCompany ||
                      ordersData?.ShippingCompany ||
                      ordersData?.logisticsCompany ||
                      ordersData?.LogisticsCompany;
      const result = normalizeCompany(carrier);
      if (result) return result;
    }
    
    return null;
  };

  // Filter orders based on selected logistics type
  const displayOrders = useMemo(() => {
    if (orderType === 'All') {
      return orders;
    }
    
    const filtered = orders.filter(order => {
      const logisticsCompany = getLogisticsCompany(order);
      const matches = logisticsCompany === orderType;
      
      // Debug logging in development
      if (process.env.NODE_ENV === 'development' && !matches && logisticsCompany) {
        console.log('Order filtered out:', {
          orderId: order.id,
          selectedType: orderType,
          foundCompany: logisticsCompany,
          rateQuotesRequestJsonb: order.rateQuotesRequestJsonb,
          rateQuotesResponseJsonb: order.rateQuotesResponseJsonb,
        });
      }
      
      return matches;
    });
    
    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      const companyCounts = orders.reduce((acc, order) => {
        const company = getLogisticsCompany(order);
        if (company) {
          acc[company] = (acc[company] || 0) + 1;
        } else {
          acc['Unknown'] = (acc['Unknown'] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      console.log('Filtering orders:', {
        selectedType: orderType,
        totalOrders: orders.length,
        filteredCount: filtered.length,
        companyCounts,
        sampleOrder: orders[0] ? {
          id: orders[0].id,
          logisticsCompany: getLogisticsCompany(orders[0]),
          hasRequestJsonb: !!orders[0].rateQuotesRequestJsonb,
          hasResponseJsonb: !!orders[0].rateQuotesResponseJsonb,
          requestJsonbKeys: orders[0].rateQuotesRequestJsonb && typeof orders[0].rateQuotesRequestJsonb === 'object' 
            ? Object.keys(orders[0].rateQuotesRequestJsonb) 
            : [],
          responseJsonbKeys: orders[0].rateQuotesResponseJsonb && typeof orders[0].rateQuotesResponseJsonb === 'object'
            ? Object.keys(orders[0].rateQuotesResponseJsonb)
            : [],
        } : null,
      });
    }
    
    return filtered;
  }, [orders, orderType]);

  // Handle page changes
  const handlePageChange = (page: number) => {
    if (onPageChange) {
      onPageChange(page);
    }
  };

  // Handle order selection
  const handleOrderSelect = (orderId: number, checked: boolean) => {
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

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(new Set(displayOrders.map((order) => order.id)));
    } else {
      setSelectedOrderIds(new Set());
    }
  };

  // Extract shipment data from selected orders
  const extractShipmentData = () => {
    const selectedOrders = displayOrders.filter((order) => selectedOrderIds.has(order.id));
    const shipments: Array<{
      type: string;
      handlingUnits: string;
      weight: string;
      destinationZip: string;
    }> = [];

    selectedOrders.forEach((order) => {
      // Try to extract data from Rate Quote Request structure
      let type = 'PALLET';
      let handlingUnits = '';
      let weight = '';
      let destinationZip = '';

      // Helper function to map type code to full name
      const mapType = (typeCode: string): string => {
        const code = String(typeCode).toUpperCase();
        if (code === 'PL' || code.includes('PALLET')) {
          return 'PALLET';
        } else if (code === 'SKID' || code.includes('SKID')) {
          return 'SKID';
        } else if (code === 'PIECE' || code.includes('PIECE')) {
          return 'PIECE';
        }
        return 'PALLET'; // Default
      };

      // Priority 1: Check rateQuotesRequestJsonb (Rate Quote Request body)
      if (order.rateQuotesRequestJsonb && typeof order.rateQuotesRequestJsonb === 'object') {
        const data = order.rateQuotesRequestJsonb as any;
        
        // Extract from commodity.handlingUnits array
        if (data.commodity && Array.isArray(data.commodity.handlingUnits) && data.commodity.handlingUnits.length > 0) {
          const handlingUnit = data.commodity.handlingUnits[0];
          
          // Type from handlingUnits[0].type (e.g., "PL")
          if (handlingUnit.type) {
            type = mapType(handlingUnit.type);
          }
          
          // Handling Units from handlingUnits[0].count
          if (handlingUnit.count !== undefined && handlingUnit.count !== null) {
            handlingUnits = String(handlingUnit.count);
          }
          
          // Weight from handlingUnits[0].weight
          if (handlingUnit.weight !== undefined && handlingUnit.weight !== null) {
            weight = String(handlingUnit.weight);
          }
        }
        
        // Destination ZIP from destination.address.postalCode
        if (data.destination && data.destination.address && data.destination.address.postalCode) {
          destinationZip = String(data.destination.address.postalCode);
        }
      }

      // Priority 2: Check rateQuotesResponseJsonb (fallback)
      if ((!handlingUnits || !weight || !destinationZip) && order.rateQuotesResponseJsonb && typeof order.rateQuotesResponseJsonb === 'object') {
        const data = order.rateQuotesResponseJsonb as any;
        
        // Try to extract from response structure (may have similar structure)
        if (!type || type === 'PALLET') {
          if (data.commodity && Array.isArray(data.commodity.handlingUnits) && data.commodity.handlingUnits.length > 0) {
            const handlingUnit = data.commodity.handlingUnits[0];
            if (handlingUnit.type) {
              type = mapType(handlingUnit.type);
            }
            if (!handlingUnits && handlingUnit.count !== undefined && handlingUnit.count !== null) {
              handlingUnits = String(handlingUnit.count);
            }
            if (!weight && handlingUnit.weight !== undefined && handlingUnit.weight !== null) {
              weight = String(handlingUnit.weight);
            }
          }
        }
        
        if (!destinationZip && data.destination && data.destination.address && data.destination.address.postalCode) {
          destinationZip = String(data.destination.address.postalCode);
        }
      }

      // Priority 3: Check ordersJsonb (fallback)
      if ((!handlingUnits || !weight || !destinationZip) && order.ordersJsonb && typeof order.ordersJsonb === 'object') {
        const data = order.ordersJsonb as any;
        
        // Try to find type
        if (data.type) {
          type = mapType(data.type);
        }
        
        // Try to find handling units
        if (!handlingUnits && (data.handlingUnits || data.handling_units || data.units || data.count)) {
          handlingUnits = String(data.handlingUnits || data.handling_units || data.units || data.count);
        }
        
        // Try to find weight
        if (!weight && (data.weight || data.weightLbs || data.weight_lbs)) {
          weight = String(data.weight || data.weightLbs || data.weight_lbs);
        }
        
        // Try to find destination ZIP
        if (!destinationZip) {
          if (data.destination && data.destination.address && data.destination.address.postalCode) {
            destinationZip = String(data.destination.address.postalCode);
          } else if (data.destinationZip || data.destination_zip || data.postalCode || data.postal_code) {
            destinationZip = String(data.destinationZip || data.destination_zip || data.postalCode || data.postal_code);
          }
        }
      }

      // Priority 4: Check bolResponseJsonb (last fallback)
      if ((!handlingUnits || !weight || !destinationZip) && order.bolResponseJsonb && typeof order.bolResponseJsonb === 'object') {
        const data = order.bolResponseJsonb as any;
        
        if (!destinationZip) {
          if (data.destination && data.destination.address && data.destination.address.postalCode) {
            destinationZip = String(data.destination.address.postalCode);
          } else if (data.consignee && (data.consignee.postalCode || data.consignee.postal_code || data.consignee.zipCode)) {
            destinationZip = String(data.consignee.postalCode || data.consignee.postal_code || data.consignee.zipCode);
          }
        }
        
        if (!weight && (data.weight || data.weightLbs || data.weight_lbs)) {
          weight = String(data.weight || data.weightLbs || data.weight_lbs);
        }
        
        if (!handlingUnits && (data.handlingUnits || data.handling_units || data.units || data.count)) {
          handlingUnits = String(data.handlingUnits || data.handling_units || data.units || data.count);
        }
      }

      // Only add shipment if we have at least some data
      if (handlingUnits || weight || destinationZip) {
        shipments.push({
          type,
          handlingUnits: handlingUnits || '',
          weight: weight || '',
          destinationZip: destinationZip || '',
        });
      }
    });

    return shipments;
  };

  // Handle Estes Pickup button click
  const handleEstesPickup = () => {
    if (selectedOrderIds.size === 0) {
      alert('Please select at least one order to proceed with Estes Pickup.');
      return;
    }

    const shipments = extractShipmentData();
    
    if (shipments.length === 0) {
      alert('No shipment data found in selected orders. Please ensure orders contain type, handling units, weight, or destination ZIP information.');
      return;
    }

    // Encode shipments data as URL params
    const params = new URLSearchParams();
    params.set('shipments', JSON.stringify(shipments));
    
    // Navigate to estes-pickup page
    router.push(`/3plGigaFedex/estes-pickup?${params.toString()}`);
  };

  const handleDeleteClick = (orderId: number) => {
    setDeleteModalState({
      isOpen: true,
      orderId,
      loading: false,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalState.orderId) return;
    
    setDeleteModalState((prev) => ({ ...prev, loading: true }));
    try {
      await onDelete(deleteModalState.orderId);
      setDeleteModalState({
        isOpen: false,
        orderId: null,
        loading: false,
      });
      onRefresh();
    } catch (error) {
      console.error('Error deleting order:', error);
      setDeleteModalState((prev) => ({ ...prev, loading: false }));
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileCount = (order: ShippedOrder) => {
    if (!order.uploads || order.uploads.length === 0) return 0;
    return order.uploads.length;
  };

  const getTotalFileSize = (order: ShippedOrder) => {
    if (!order.uploads || order.uploads.length === 0) return null;
    let totalSize = 0;
    order.uploads.forEach((upload) => {
      if (typeof upload !== 'string' && upload.size) {
        totalSize += upload.size;
      }
    });
    return totalSize > 0 ? totalSize : null;
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading processed orders...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3 mb-4 sm:mb-6 relative z-50">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 flex-1 flex-wrap">
          <div className="flex flex-col gap-1 relative" ref={logisticsDropdownRef}>
            <span className="text-xs font-medium text-slate-900">Logistics</span>
            <button
              type="button"
              onClick={() => setIsLogisticsDropdownOpen(!isLogisticsDropdownOpen)}
              className="w-full sm:w-28 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-left text-sm text-slate-900 hover:bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {orderType}
              <span className="float-right mt-0.5">▼</span>
            </button>

            {isLogisticsDropdownOpen && (
              <div className="absolute top-full z-50 mt-1 w-28 rounded-md border border-slate-200 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setOrderType('All');
                    setSelectedOrderIds(new Set());
                    setIsLogisticsDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-100 ${
                    orderType === 'All' ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrderType('Estes');
                    setSelectedOrderIds(new Set());
                    setIsLogisticsDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-100 ${
                    orderType === 'Estes' ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                  }`}
                >
                  Estes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrderType('XPO');
                    setSelectedOrderIds(new Set());
                    setIsLogisticsDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-100 ${
                    orderType === 'XPO' ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                  }`}
                >
                  XPO
                </button>
              </div>
            )}
          </div>
          <label className="flex flex-col gap-1 flex-1 sm:flex-initial">
            <span className="text-xs font-medium text-slate-900">Search</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by ID, SKU, or Marketplace..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && onSearch) {
                    e.preventDefault();
                    onSearch();
                  }
                }}
                className="w-full sm:w-48 pl-9 pr-3 py-1.5 border border-slate-300 bg-white text-slate-900 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-colors"
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
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-900 opacity-0">Actions</span>
              <button
                onClick={onSearch}
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
          )}
          {(searchQuery || (dateFilter !== 'all' && onClearSearch)) && onClearSearch && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-900 opacity-0">Clear</span>
              <button
                onClick={onClearSearch}
                className="px-4 py-1.5 text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors text-sm"
                title="Clear filters"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {orderType === 'All' && (
            <button
              onClick={handleEstesPickup}
              disabled={selectedOrderIds.size === 0}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Estes Pickup</span>
              <span className="sm:hidden">Estes Pickup</span>
            </button>
          )}
          <button
            onClick={() => setDateRangeDeleteModalOpen(true)}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium w-full sm:w-auto justify-center"
          >
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Delete by Date Range</span>
            <span className="sm:hidden">Delete Range</span>
          </button>
        </div>
      </div>

      {/* Orders Table */}
      {displayOrders.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500 p-8">
          <p className="text-sm">
            {orderType !== 'All' 
              ? `No ${orderType} orders found${searchQuery ? ' matching your search' : ''}`
              : searchQuery 
                ? 'No orders match your search' 
                : 'No processed orders found'}
          </p>
          {orderType !== 'All' && process.env.NODE_ENV === 'development' && (
            <p className="text-xs mt-2 text-slate-400">
              Debug: Check console for filtering details. Make sure orders have shippingCompany in rateQuotesRequestJsonb or rateQuotesResponseJsonb.
            </p>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden relative">
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm h-full flex flex-col">
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-100 border-b border-slate-200 sticky top-0 z-20">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={displayOrders.length > 0 && selectedOrderIds.size === displayOrders.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Marketplace
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Files
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider sticky top-0 right-0 bg-slate-100 z-30">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {displayOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.has(order.id)}
                          onChange={(e) => handleOrderSelect(order.id, e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          #{order.id}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">
                          {order.sku}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-100 text-purple-800">
                          {order.orderOnMarketPlace}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                          order.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : order.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : order.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {order.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">
                          {formatDate(order.createdAt)}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        {order.uploads && order.uploads.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                             
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              {order.uploads.slice(0, 3).map((upload, idx) => {
                                const isString = typeof upload === 'string';
                                const filePath = isString ? upload : (upload.path || upload.filename || '');
                                const filename = isString 
                                  ? filePath.split('/').pop() || filePath 
                                  : (upload.filename || filePath.split('/').pop() || 'Unknown');
                                const mimetype = isString ? 'application/octet-stream' : (upload.mimetype || 'application/octet-stream');
                                const isImage = mimetype.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].some(ext => filename.toLowerCase().endsWith(ext));
                                const isPDF = mimetype === 'application/pdf' || filename.toLowerCase().endsWith('.pdf');
                                
                                // Build shipping document URL: BaseUrl/FhsOrdersMedia/ShippingDocuments/filename
                                const buildShippingDocumentUrl = (filename: string) => {
                                  const backendUrl = getBackendBaseUrl();
                                  // Clean filename - remove any path separators
                                  const cleanFilename = filename.split('/').pop() || filename.split('\\').pop() || filename;
                                  return `${backendUrl}/FhsOrdersMedia/ShippingDocuments/${cleanFilename}`;
                                };
                                
                                const shippingDocumentUrl = buildShippingDocumentUrl(filename);
                                const downloadUrl = shippingDocumentUrl;
                                
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Build the shipping document URL
                                      const finalUrl = buildShippingDocumentUrl(filename);
                                      console.log('PDF URL:', finalUrl, 'for filename:', filename);
                                      if (!finalUrl || !finalUrl.startsWith('http')) {
                                        console.error('Invalid file URL:', finalUrl, 'from filename:', filename);
                                        return;
                                      }
                                      // Open PDF in a new tab to preserve the current session
                                      // This prevents losing authentication state when user clicks back
                                      window.open(finalUrl, '_blank', 'noopener,noreferrer');
                                    }}
                                    className="block w-[60px] h-[60px] rounded border border-slate-200 overflow-hidden bg-slate-100 hover:opacity-90 transition-opacity cursor-pointer"
                                    title={`Click to view: ${filename}`}
                                  >
                                    {isImage ? (
                                      <img
                                        src={downloadUrl}
                                        alt={filename}
                                        className="w-full h-full object-contain"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    ) : isPDF ? (
                                      <div className="w-full h-full flex items-center justify-center bg-red-50">
                                        <FileText className="h-8 w-8 text-red-600" />
                                      </div>
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <FileText className="h-12 w-12 text-slate-400" />
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                              {order.uploads.length > 3 && (
                                <div className="w-full h-full rounded border border-slate-200 bg-slate-50 flex items-center justify-center">
                                  <span className="text-sm text-slate-500">
                                    +{order.uploads.length - 3} more
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">No files</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center sticky right-0 bg-slate-50 z-10">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedOrderForStatus(order);
                              setGetStatusModalOpen(true);
                            }}
                            className="inline-flex items-center justify-center p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Get Status"
                          >
                            <PackageSearch className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setSelectedOrderForDetails(order)}
                            className="inline-flex items-center justify-center p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View details"
                          >
                            <Info className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setSelectedOrderForEdit(order)}
                            className="inline-flex items-center justify-center p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit order"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(order.id)}
                            className="inline-flex items-center justify-center p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete order"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="border-t border-slate-200 bg-white px-3 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-700">
                    Showing <span className="font-medium">
                      {pagination.totalCount === 0 ? 0 : (currentPage - 1) * pagination.limit + 1}
                    </span> to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * pagination.limit, pagination.totalCount)}
                    </span> of{' '}
                    <span className="font-medium">{pagination.totalCount}</span> orders
                  </span>
                </div>

                <div className="flex items-center gap-2">
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

      {/* Modals */}
      <ProcessedOrderDetailsModal
        isOpen={selectedOrderForDetails !== null}
        order={selectedOrderForDetails}
        onClose={() => setSelectedOrderForDetails(null)}
      />

      <ProcessedOrderEditModal
        isOpen={selectedOrderForEdit !== null}
        order={selectedOrderForEdit}
        onClose={() => setSelectedOrderForEdit(null)}
        onSave={async (payload) => {
          if (selectedOrderForEdit) {
            await onUpdate(selectedOrderForEdit.id, payload);
            setSelectedOrderForEdit(null);
            onRefresh();
          }
        }}
      />

      <ConfirmDeleteModal
        isOpen={deleteModalState.isOpen}
        onClose={() => {
          if (!deleteModalState.loading) {
            setDeleteModalState({ isOpen: false, orderId: null, loading: false });
          }
        }}
        onConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        message={`Are you sure you want to delete processed order #${deleteModalState.orderId}? This action cannot be undone.`}
        loading={deleteModalState.loading}
      />

      <DateRangeDeleteModal
        isOpen={dateRangeDeleteModalOpen}
        onClose={() => setDateRangeDeleteModalOpen(false)}
        onConfirm={async (startDate, endDate) => {
          await onDeleteByDateRange(startDate, endDate);
          setDateRangeDeleteModalOpen(false);
          onRefresh();
        }}
      />

      <GetStatusModal
        isOpen={getStatusModalOpen}
        onClose={() => {
          setGetStatusModalOpen(false);
          setSelectedOrderForStatus(null);
        }}
        orderId={selectedOrderForStatus?.id}
        orderData={selectedOrderForStatus ? {
          ordersJsonb: selectedOrderForStatus.ordersJsonb,
          bolResponseJsonb: selectedOrderForStatus.bolResponseJsonb,
          rateQuotesResponseJsonb: selectedOrderForStatus.rateQuotesResponseJsonb,
          pickupResponseJsonb: selectedOrderForStatus.pickupResponseJsonb,
        } : undefined}
      />

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewFile(null)}>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 truncate flex-1 mr-4">
                {previewFile.filename}
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={previewFile.url}
                  download={previewFile.filename}
                  className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Download
                </a>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden p-4">
              {previewFile.isPDF ? (
                <iframe
                  src={`${previewFile.url}#view=FitH&zoom=page-width&toolbar=1&navpanes=0&scrollbar=0`}
                  className="w-full h-full border-0 rounded"
                  title={previewFile.filename}
                  style={{ overflow: 'hidden' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <img
                    src={previewFile.url}
                    alt={previewFile.filename}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Trash2, Edit, Plus, Search, ChevronDown, FileUp, Download, Filter, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Order } from '@/app/types/order';
import { OrderDetailsModal } from './OrderDetailsModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { exportOrdersToCSV } from '@/app/utils/Orders/exportOrders';

type OrderListProps = {
  orders: Order[];
  selectedOrderId: number | null;
  loading?: boolean;
  onOrderSelect: (order: Order) => void;
  onOrderDelete: (id: number) => void;
  onOrderEdit: (order: Order) => void;
  onCreateNew: () => void;
  onImportFile: (file: File) => void;
  onOpenEditModal?: (order: Order | null) => void;
  onBulkDelete?: (ids: number[]) => void;
};

export const OrderList = ({
  orders,
  selectedOrderId,
  loading = false,
  onOrderSelect,
  onOrderDelete,
  onOrderEdit,
  onCreateNew,
  onImportFile,
  onOpenEditModal,
  onBulkDelete,
}: OrderListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<Order | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown]);

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

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      
      // Search in Order ID
      if (order.id.toString().includes(query)) return true;
      
      // Search in Marketplace
      if (order.orderOnMarketPlace.toLowerCase().includes(query)) return true;
      
      // Search in all JSONB fields that are displayed in the table
      const poNumber = getJsonbValue(order.jsonb, 'PO#').toLowerCase();
      const sku = getJsonbValue(order.jsonb, 'SKU').toLowerCase();
      const orderNumber = getJsonbValue(order.jsonb, 'Order#').toLowerCase();
      const customerName = getJsonbValue(order.jsonb, 'Customer Name').toLowerCase();
      const trackingNumber = getJsonbValue(order.jsonb, 'Tracking Number').toLowerCase();
      
      // Check each field
      if (poNumber.includes(query) && poNumber !== '-') return true;
      if (sku.includes(query) && sku !== '-') return true;
      if (orderNumber.includes(query) && orderNumber !== '-') return true;
      if (customerName.includes(query) && customerName !== '-') return true;
      if (trackingNumber.includes(query) && trackingNumber !== '-') return true;
      
      // Search in entire JSONB as fallback (for any other fields)
      const jsonbStr = typeof order.jsonb === 'string' 
        ? order.jsonb.toLowerCase()
        : JSON.stringify(order.jsonb).toLowerCase();
      if (jsonbStr.includes(query)) return true;
      
      return false;
    });
  }, [orders, searchQuery]);

  // Reset to page 1 when filtered orders change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredOrders.length, searchQuery]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

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
      paginatedOrders.forEach((order) => newSelectedIds.add(order.id));
      setSelectedOrderIds(newSelectedIds);
    } else {
      const newSelectedIds = new Set(selectedOrderIds);
      paginatedOrders.forEach((order) => newSelectedIds.delete(order.id));
      setSelectedOrderIds(newSelectedIds);
    }
  };

  // Check if all orders on current page are selected
  const allSelected = paginatedOrders.length > 0 && paginatedOrders.every((order) => selectedOrderIds.has(order.id));
  const someSelected = paginatedOrders.some((order) => selectedOrderIds.has(order.id));

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
    <div className="flex h-full flex-col bg-white overflow-hidden p-6">
      {/* Page Title */}
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Orders</h1>

      {/* Search and Action Buttons */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Right Side Buttons */}
        <div className="flex items-center gap-3">
          {/* Bulk Delete Button - Show only when orders are selected */}
          {selectedOrderIds.size > 0 && (
            <button
              onClick={handleBulkDeleteClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              <Trash2 className="h-4 w-4" />
              Delete ({selectedOrderIds.size})
            </button>
          )}

          {/* Export Button */}
          <button
            onClick={() => exportOrdersToCSV(filteredOrders)}
            disabled={filteredOrders.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            Export
          </button>

          {/* Add New Button with Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Add New
              <ChevronDown className={`h-4 w-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                <button
                  onClick={() => {
                    onCreateNew();
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                >
                  <Plus className="h-4 w-4 text-slate-500" />
                  Add New
                </button>
                <button
                  onClick={handleImportClick}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
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
        </div>
      </div>

      {/* Orders Table */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8">
            <p className="text-sm">
              {searchQuery ? 'No orders match your search' : 'No orders found'}
            </p>
            {!searchQuery && (
              <button
                onClick={onCreateNew}
                className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Create your first order
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-hidden relative">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm h-full flex flex-col">
              <div className="overflow-auto flex-1">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-100 border-b border-slate-200 sticky top-0 z-20">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-100"
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
                        className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-100"
                      >
                        Order ID
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-100"
                      >
                        Marketplace
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-100"
                      >
                        PO#
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-100"
                      >
                        SKU
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-100"
                      >
                        Order#
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-100"
                      >
                        Customer Name
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-100"
                      >
                        Tracking Number
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider sticky top-0 right-0 bg-slate-100 z-30"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                  {paginatedOrders.map((order) => {
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
                        className={`cursor-pointer transition-all duration-150 ${
                          isChecked || isSelected
                            ? 'bg-blue-50 border-l-2 border-l-blue-600'
                            : 'bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        {/* Select Column with Checkbox */}
                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${
                            isSelected ? 'text-slate-900' : 'text-slate-900'
                          }`}>
                            #{order.id}
                          </div>
                        </td>
                        {/* Marketplace Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-100 text-purple-800">
                            {order.orderOnMarketPlace}
                          </span>
                        </td>
                        {/* PO# Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">
                            {poNumber}
                          </div>
                        </td>
                        {/* SKU Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">
                            {sku}
                          </div>
                        </td>
                        {/* Order# Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">
                            {orderNumber}
                          </div>
                        </td>
                        {/* Customer Name Column */}
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900 max-w-xs truncate" title={customerName !== '-' ? customerName : ''}>
                            {customerName}
                          </div>
                        </td>
                        {/* Tracking Number Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">
                            {trackingNumber}
                          </div>
                        </td>
                        {/* Actions Column */}
                        <td 
                          className={`px-6 py-4 whitespace-nowrap text-center sticky right-0 transition-all duration-150 z-10 ${
                            isChecked || isSelected
                              ? 'bg-blue-50'
                              : 'bg-slate-50 group-hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrderForDetails(order);
                              }}
                              className="inline-flex items-center justify-center p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
                              className="inline-flex items-center justify-center p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit order"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSingleDeleteClick(order.id);
                              }}
                              className="inline-flex items-center justify-center p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
              {filteredOrders.length > ITEMS_PER_PAGE && (
                <div className="border-t border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-700">
                      Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(endIndex, filteredOrders.length)}</span> of{' '}
                      <span className="font-medium">{filteredOrders.length}</span> orders
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
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
                      disabled={currentPage === totalPages}
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
    </div>
  );
};


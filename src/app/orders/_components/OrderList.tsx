'use client';

import { useState, useRef, useEffect } from 'react';
import { Trash2, Edit, Plus, Search, ChevronDown, FileUp, Download, Filter, Info } from 'lucide-react';
import type { Order } from '@/app/types/order';
import { OrderDetailsModal } from './OrderDetailsModal';

type OrderListProps = {
  orders: Order[];
  selectedOrderId: number | null;
  loading?: boolean;
  onOrderSelect: (order: Order) => void;
  onOrderDelete: (id: number) => void;
  onOrderEdit: (order: Order) => void;
  onCreateNew: () => void;
  onImportFile: (file: File) => void;
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
}: OrderListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
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

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.orderOnMarketPlace.toLowerCase().includes(query) ||
      JSON.stringify(order.jsonb).toLowerCase().includes(query) ||
      order.id.toString().includes(query)
    );
  });

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
      <div className="flex items-center gap-3 mb-6">
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

        {/* Export Button */}
        <button
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
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
          <div className="flex-1 overflow-auto">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider"
                    >
                      Select
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider"
                    >
                      Order ID
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider"
                    >
                      Marketplace
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider sticky right-0 bg-slate-100 z-10"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredOrders.map((order) => {
                    const isSelected = selectedOrderId === order.id;
                    
                    return (
                      <tr
                        key={order.id}
                        onClick={() => onOrderSelect(order)}
                        className={`cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? 'bg-slate-100 border-l-2 border-l-blue-600'
                            : 'bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        {/* Select Column with Radio Button */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <input
                              type="radio"
                              checked={isSelected}
                              onChange={() => onOrderSelect(order)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
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
                        {/* Actions Column */}
                        <td 
                          className={`px-6 py-4 whitespace-nowrap text-center sticky right-0 transition-all duration-150 ${
                            isSelected
                              ? 'bg-slate-100'
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
                                onOrderEdit(order);
                              }}
                              className="inline-flex items-center justify-center p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit order"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Are you sure you want to delete order #${order.id}?`)) {
                                  onOrderDelete(order.id);
                                }
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
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={selectedOrderForDetails !== null}
        order={selectedOrderForDetails}
        onClose={() => setSelectedOrderForDetails(null)}
      />
    </div>
  );
};


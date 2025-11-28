'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, Trash2, Edit, Info, ChevronLeft, ChevronRight, Calendar, PackageSearch } from 'lucide-react';
import type { ShippedOrder } from '../utils/shippedOrdersApi';
import { ProcessedOrderDetailsModal } from './ProcessedOrderDetailsModal';
import { ProcessedOrderEditModal } from './ProcessedOrderEditModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { DateRangeDeleteModal } from './DateRangeDeleteModal';
import { GetStatusModal } from './GetStatusModal';

type ProcessedOrdersListProps = {
  orders: ShippedOrder[];
  loading?: boolean;
  onRefresh: () => void;
  onDelete: (id: number) => Promise<void>;
  onUpdate: (id: number, payload: any) => Promise<void>;
  onDeleteByDateRange: (startDate: string, endDate: string) => Promise<void>;
};

export const ProcessedOrdersList = ({
  orders,
  loading = false,
  onRefresh,
  onDelete,
  onUpdate,
  onDeleteByDateRange,
}: ProcessedOrdersListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
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

  const ITEMS_PER_PAGE = 20;

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      
      if (order.id.toString().includes(query)) return true;
      if (order.sku.toLowerCase().includes(query)) return true;
      if (order.orderOnMarketPlace.toLowerCase().includes(query)) return true;
      
      return false;
    });
  }, [orders, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredOrders.length, searchQuery]);

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

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
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID, SKU, or Marketplace..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        <button
          onClick={() => setDateRangeDeleteModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
        >
          <Calendar className="h-4 w-4" />
          Delete by Date Range
        </button>
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500 p-8">
          <p className="text-sm">
            {searchQuery ? 'No orders match your search' : 'No processed orders found'}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden relative">
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm h-full flex flex-col">
            <div className="overflow-auto flex-1">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-100 border-b border-slate-200 sticky top-0 z-20">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Marketplace
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider sticky top-0 right-0 bg-slate-100 z-30">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {paginatedOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          #{order.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">
                          {order.sku}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-100 text-purple-800">
                          {order.orderOnMarketPlace}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">
                          {formatDate(order.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center sticky right-0 bg-slate-50 z-10">
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
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => {
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
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
};


'use client';

import { useEffect, useState, useRef } from 'react';
import { X, ChevronDown } from 'lucide-react';
import type { Order } from '@/app/types/order';
import { LTLRateQuoteModal } from './LTLRateQuoteModal';

type AutomateLogisticModalProps = {
  isOpen: boolean;
  orders: Order[];
  onClose: () => void;
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

export const AutomateLogisticModal = ({
  isOpen,
  orders,
  onClose,
}: AutomateLogisticModalProps) => {
  // State to manage selected shipping type for each order
  const [shippingTypes, setShippingTypes] = useState<Record<number, 'LTL' | 'Parcel' | ''>>({});
  // State to manage dropdown open/close for each order
  const [openDropdowns, setOpenDropdowns] = useState<Record<number, boolean>>({});
  // State to manage LTL rate quote modal
  const [ltlModalOpen, setLtlModalOpen] = useState(false);
  const [selectedOrderForLTL, setSelectedOrderForLTL] = useState<Order | null>(null);
  // Refs for dropdown click outside detection
  const dropdownRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Initialize shipping types when orders change
  useEffect(() => {
    setShippingTypes((prev) => {
      const updated: Record<number, 'LTL' | 'Parcel' | ''> = { ...prev };
      let hasChanges = false;
      
      orders.forEach((order) => {
        // Only initialize if not already set
        if (!(order.id in updated)) {
          updated[order.id] = '';
          hasChanges = true;
        }
      });
      
      return hasChanges ? updated : prev;
    });
  }, [orders]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      orders.forEach((order) => {
        const ref = dropdownRefs.current[order.id];
        if (ref && !ref.contains(event.target as Node)) {
          setOpenDropdowns((prev) => ({
            ...prev,
            [order.id]: false,
          }));
        }
      });
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, orders]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-y-0 left-56 sm:left-64 right-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white shadow-2xl border border-slate-200 w-full h-full flex flex-col animate-slide-up-and-scale"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Automate Logistic - {orders.length} Order{orders.length !== 1 ? 's' : ''} Selected
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {orders.map((order, orderIndex) => {
            // Color schemes for different orders
            const colorSchemes = [
              {
                // border: 'border-blue-300',
                bg: 'bg-blue-50/50',
                cardBg: 'bg-blue-50/30',
                cardBorder: 'border-blue-200',
                headerText: 'text-blue-700',
                accent: 'blue',
              },
              {
                // border: 'border-green-300',
                bg: 'bg-green-50/50',
                cardBg: 'bg-green-50/30',
                cardBorder: 'border-green-200',
                headerText: 'text-green-700',
                accent: 'green',
              },
              {
                // border: 'border-purple-300',
                bg: 'bg-purple-50/50',
                cardBg: 'bg-purple-50/30',
                cardBorder: 'border-purple-200',
                headerText: 'text-purple-700',
                accent: 'purple',
              },
              {
                // border: 'border-orange-300',
                bg: 'bg-orange-50/50',
                cardBg: 'bg-orange-50/30',
                cardBorder: 'border-orange-200',
                headerText: 'text-orange-700',
                accent: 'orange',
              },
              {
                // border: 'border-pink-300',
                bg: 'bg-pink-50/50',
                cardBg: 'bg-pink-50/30',
                cardBorder: 'border-pink-200',
                headerText: 'text-pink-700',
                accent: 'pink',
              },
              {
                // border: 'border-cyan-300',
                bg: 'bg-cyan-50/50',
                cardBg: 'bg-cyan-50/30',
                cardBorder: 'border-cyan-200',
                headerText: 'text-cyan-700',
                accent: 'cyan',
              },
              {
                // border: 'border-amber-300',
                bg: 'bg-amber-50/50',
                cardBg: 'bg-amber-50/30',
                cardBorder: 'border-amber-200',
                headerText: 'text-amber-700',
                accent: 'amber',
              },
              {
                // border: 'border-indigo-300',
                bg: 'bg-indigo-50/50',
                cardBg: 'bg-indigo-50/30',
                cardBorder: 'border-indigo-200',
                headerText: 'text-indigo-700',
                accent: 'indigo',
              },
            ];
            
            const colorScheme = colorSchemes[orderIndex % colorSchemes.length];
            // Extract values from JSONB
            const productName = getJsonbValue(order.jsonb, 'Product Name') || 
                               getJsonbValue(order.jsonb, 'Product') ||
                               getJsonbValue(order.jsonb, 'Item Name') ||
                               getJsonbValue(order.jsonb, 'Item Description') ||
                               '-';
            const sku = getJsonbValue(order.jsonb, 'SKU');
            const price = getJsonbValue(order.jsonb, 'Price') ||
                         getJsonbValue(order.jsonb, 'Item Cost') ||
                         getJsonbValue(order.jsonb, 'Cost') ||
                         getJsonbValue(order.jsonb, 'ItemCost') ||
                         '-';
            
            // Order details
            const orderIdFromJsonb = getJsonbValue(order.jsonb, 'Order ID');
            const poNumber = getJsonbValue(order.jsonb, 'PO#');
            const orderNumber = getJsonbValue(order.jsonb, 'Order#');
            const sellerOrderNo = getJsonbValue(order.jsonb, 'Seller Order NO');
            const marketplace = order.orderOnMarketPlace;
            const trackingNumber = getJsonbValue(order.jsonb, 'Tracking Number');
            const trackingUrl = getJsonbValue(order.jsonb, 'Tracking Url');
            const status = getJsonbValue(order.jsonb, 'Status');
            const carrier = getJsonbValue(order.jsonb, 'Carrier');
            const orderDate = getJsonbValue(order.jsonb, 'Order Date');
            const deliveryDate = getJsonbValue(order.jsonb, 'Delivery Date');
            const shippingMethod = getJsonbValue(order.jsonb, 'Shipping Method');
            const shippingTier = getJsonbValue(order.jsonb, 'Shipping Tier');
            const shipNode = getJsonbValue(order.jsonb, 'Ship Node');
            
            // Customer details
            const customerName = getJsonbValue(order.jsonb, 'Customer Name');
            const customerEmail = getJsonbValue(order.jsonb, 'Customer Email') ||
                                getJsonbValue(order.jsonb, 'Email');
            const customerPhone = getJsonbValue(order.jsonb, 'Customer Phone Number') ||
                                getJsonbValue(order.jsonb, 'Customer Phone') ||
                                getJsonbValue(order.jsonb, 'Phone');
            const shippingAddress = getJsonbValue(order.jsonb, 'Customer Shipping Address') ||
                                  getJsonbValue(order.jsonb, 'Shipping Address') ||
                                  getJsonbValue(order.jsonb, 'Ship to Address 1') ||
                                  getJsonbValue(order.jsonb, 'Address');
            const city = getJsonbValue(order.jsonb, 'City');
            const state = getJsonbValue(order.jsonb, 'State');
            const zip = getJsonbValue(order.jsonb, 'Zip');
            const country = getJsonbValue(order.jsonb, 'Ship to Country');
            
            // Subtotal and pricing
            const quantity = getJsonbValue(order.jsonb, 'Quantity') ||
                            getJsonbValue(order.jsonb, 'Qty') ||
                            '1';
            const tax = getJsonbValue(order.jsonb, 'Tax');
            const shippingCost = getJsonbValue(order.jsonb, 'Shipping Cost');
            const discount = getJsonbValue(order.jsonb, 'Discount');
            
            // Calculate subtotal
            const priceNum = price !== '-' ? parseFloat(price.replace(/[^0-9.-]/g, '')) : 0;
            const qtyNum = quantity !== '-' ? parseFloat(quantity) : 1;
            const taxNum = tax !== '-' ? parseFloat(tax.replace(/[^0-9.-]/g, '')) : 0;
            const shippingNum = shippingCost !== '-' ? parseFloat(shippingCost.replace(/[^0-9.-]/g, '')) : 0;
            const discountNum = discount !== '-' ? parseFloat(discount.replace(/[^0-9.-]/g, '')) : 0;
            
            const subtotal = priceNum > 0 && qtyNum > 0 
              ? (priceNum * qtyNum).toFixed(2)
              : '-';
            
            const total = subtotal !== '-' 
              ? (priceNum * qtyNum + taxNum + shippingNum - discountNum).toFixed(2)
              : '-';

            return (
              <div key={order.id} className={`space-y-4 border-2 ${colorScheme.border} rounded-lg p-4 sm:p-6 ${colorScheme.bg}`}>
                {/* Card 1: Product Name, SKU, Price - Full Width */}
                <div className={`w-full ${colorScheme.cardBg} rounded-lg border-2 ${colorScheme.cardBorder} p-4 sm:p-6 shadow-sm relative`}>
                  <h3 className={`text-xs font-semibold ${colorScheme.headerText} uppercase tracking-wider mb-4`}>
                    Product Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Product Name
                      </label>
                      <div className="text-sm sm:text-base font-semibold text-slate-900">
                        {productName}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        SKU
                      </label>
                      <div className="text-sm sm:text-base font-semibold text-slate-900">
                        {sku}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Price
                      </label>
                      <div className="text-sm sm:text-base font-semibold text-slate-900">
                        {price !== '-' ? (price.includes('$') ? price : `$${price}`) : '-'}
                      </div>
                    </div>
                  </div>
                  {/* Shipping Type Dropdown - Bottom Left */}
                  <div className="mt-4 sm:mt-5 flex items-end">
                    <div 
                      className="flex flex-col gap-1 relative w-auto min-w-[140px]"
                      ref={(el) => {
                        dropdownRefs.current[order.id] = el;
                      }}
                    >
                      <span className="text-xs font-medium text-slate-900">Shipping Type</span>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenDropdowns((prev) => ({
                            ...prev,
                            [order.id]: !prev[order.id],
                          }));
                        }}
                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-left text-xs font-medium text-slate-900 hover:bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                      >
                        {shippingTypes[order.id] || 'Shipping Type'}
                        <span className="float-right mt-0.5">
                          <ChevronDown 
                            className={`h-3 w-3 transition-transform ${openDropdowns[order.id] ? 'rotate-180' : ''}`}
                          />
                        </span>
                      </button>

                      {openDropdowns[order.id] && (
                        <div className="absolute top-full z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
                          <button
                            type="button"
                            onClick={() => {
                              setShippingTypes((prev) => ({
                                ...prev,
                                [order.id]: '',
                              }));
                              setOpenDropdowns((prev) => ({
                                ...prev,
                                [order.id]: false,
                              }));
                            }}
                            className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-100 ${
                              !shippingTypes[order.id] ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                            }`}
                          >
                            Shipping Type
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShippingTypes((prev) => ({
                                ...prev,
                                [order.id]: 'Parcel',
                              }));
                              setOpenDropdowns((prev) => ({
                                ...prev,
                                [order.id]: false,
                              }));
                            }}
                            className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-100 ${
                              shippingTypes[order.id] === 'Parcel' ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                            }`}
                          >
                            Parcel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newValue = 'LTL';
                              setShippingTypes((prev) => ({
                                ...prev,
                                [order.id]: newValue,
                              }));
                              setOpenDropdowns((prev) => ({
                                ...prev,
                                [order.id]: false,
                              }));
                              
                              // Open LTL rate quote modal when LTL is selected
                              setSelectedOrderForLTL(order);
                              setLtlModalOpen(true);
                            }}
                            className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-100 ${
                              shippingTypes[order.id] === 'LTL' ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                            }`}
                          >
                            LTL
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cards 2, 3, 4: Order Details, Customer Details, Subtotal - In One Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Card 2: Order Details */}
                  <div className={`${colorScheme.cardBg} rounded-lg border-2 ${colorScheme.cardBorder} p-4 sm:p-5 shadow-sm`}>
                    <h3 className={`text-xs font-semibold ${colorScheme.headerText} uppercase tracking-wider mb-4`}>
                      Order Details
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Order ID
                        </label>
                        <div className="text-sm font-semibold text-slate-900">
                          {orderIdFromJsonb !== '-' ? `#${orderIdFromJsonb}` : `#${order.id}`}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Marketplace
                        </label>
                        <div className="text-sm text-slate-900">
                          {marketplace}
                        </div>
                      </div>
                      {poNumber !== '-' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            PO#
                          </label>
                          <div className="text-sm text-slate-900">
                            {poNumber}
                          </div>
                        </div>
                      )}
                      {orderNumber !== '-' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Order#
                          </label>
                          <div className="text-sm text-slate-900">
                            {orderNumber}
                          </div>
                        </div>
                      )}
                      {sellerOrderNo !== '-' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Seller Order NO
                          </label>
                          <div className="text-sm text-slate-900">
                            {sellerOrderNo}
                          </div>
                        </div>
                      )}
                      {status !== '-' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Status
                          </label>
                          <div className="text-sm text-slate-900">
                            {status}
                          </div>
                        </div>
                      )}
                      {carrier !== '-' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Carrier
                          </label>
                          <div className="text-sm text-slate-900">
                            {carrier}
                          </div>
                        </div>
                      )}
                      {trackingNumber !== '-' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Tracking Number
                          </label>
                          <div className="text-sm text-slate-900">
                            {trackingUrl !== '-' ? (
                              <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                {trackingNumber}
                              </a>
                            ) : (
                              trackingNumber
                            )}
                          </div>
                        </div>
                      )}
                      {orderDate !== '-' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Order Date
                          </label>
                          <div className="text-sm text-slate-900">
                            {orderDate}
                          </div>
                        </div>
                      )}
                      {deliveryDate !== '-' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Delivery Date
                          </label>
                          <div className="text-sm text-slate-900">
                            {deliveryDate}
                          </div>
                        </div>
                      )}
                      {shippingMethod !== '-' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Shipping Method
                          </label>
                          <div className="text-sm text-slate-900">
                            {shippingMethod} {shippingTier !== '-' && `(${shippingTier})`}
                          </div>
                        </div>
                      )}
                      {shipNode !== '-' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Ship Node
                          </label>
                          <div className="text-sm text-slate-900 break-words">
                            {shipNode}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card 3: Customer Details */}
                  <div className={`${colorScheme.cardBg} rounded-lg border-2 ${colorScheme.cardBorder} p-4 sm:p-5 shadow-sm`}>
                    <h3 className={`text-xs font-semibold ${colorScheme.headerText} uppercase tracking-wider mb-4`}>
                      Customer Details
                    </h3>
                    <div className="space-y-3">
                      {customerName !== '-' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Name
                          </label>
                          <div className="text-sm text-slate-900">
                            {customerName}
                          </div>
                        </div>
                      )}
                      {customerEmail !== '-' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Email
                          </label>
                          <div className="text-sm text-slate-900 break-words">
                            {customerEmail}
                          </div>
                        </div>
                      )}
                      {customerPhone !== '-' && customerPhone !== '0' && customerPhone !== '0000000000' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Phone
                          </label>
                          <div className="text-sm text-slate-900">
                            {customerPhone}
                          </div>
                        </div>
                      )}
                      {shippingAddress !== '-' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Address
                          </label>
                          <div className="text-sm text-slate-900 break-words">
                            {shippingAddress}
                          </div>
                        </div>
                      )}
                      {(city !== '-' || state !== '-' || zip !== '-') && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Location
                          </label>
                          <div className="text-sm text-slate-900">
                            {[city, state, zip].filter(v => v !== '-').join(', ')}
                            {country !== '-' && country !== 'USA' && `, ${country}`}
                          </div>
                        </div>
                      )}
                      {customerName === '-' && customerEmail === '-' && customerPhone === '-' && shippingAddress === '-' && city === '-' && state === '-' && zip === '-' && (
                        <div className="text-sm text-slate-500 italic">
                          No customer details available
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card 4: Subtotal */}
                  <div className={`${colorScheme.cardBg} rounded-lg border-2 ${colorScheme.cardBorder} p-4 sm:p-5 shadow-sm`}>
                    <h3 className={`text-xs font-semibold ${colorScheme.headerText} uppercase tracking-wider mb-4`}>
                      Subtotal ({quantity} item{quantity !== '1' ? 's' : ''})
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Quantity
                        </label>
                        <div className="text-sm font-semibold text-slate-900">
                          {quantity}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Unit Price
                        </label>
                        <div className="text-sm text-slate-900">
                          {price !== '-' ? (price.includes('$') ? price : `$${price}`) : '-'}
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200 space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="block text-xs font-medium text-slate-600">
                            Subtotal
                          </label>
                          <div className="text-sm font-semibold text-slate-900">
                            {subtotal !== '-' ? `$${subtotal}` : '-'}
                          </div>
                        </div>
                        {tax !== '-' && parseFloat(tax.replace(/[^0-9.-]/g, '')) > 0 && (
                          <div className="flex justify-between items-center">
                            <label className="block text-xs font-medium text-slate-600">
                              Tax
                            </label>
                            <div className="text-sm text-slate-900">
                              {tax.includes('$') ? tax : `$${tax}`}
                            </div>
                          </div>
                        )}
                        {shippingCost !== '-' && parseFloat(shippingCost.replace(/[^0-9.-]/g, '')) > 0 && (
                          <div className="flex justify-between items-center">
                            <label className="block text-xs font-medium text-slate-600">
                              Shipping
                            </label>
                            <div className="text-sm text-slate-900">
                              {shippingCost.includes('$') ? shippingCost : `$${shippingCost}`}
                            </div>
                          </div>
                        )}
                        {discount !== '-' && parseFloat(discount.replace(/[^0-9.-]/g, '')) > 0 && (
                          <div className="flex justify-between items-center">
                            <label className="block text-xs font-medium text-slate-600">
                              Discount
                            </label>
                            <div className="text-sm text-red-600">
                              -{discount.includes('$') ? discount : `$${discount}`}
                            </div>
                          </div>
                        )}
                        <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                          <label className="block text-xs font-medium text-slate-600">
                            Total
                          </label>
                          <div className="text-lg font-bold text-slate-900">
                            {total !== '-' ? `$${total}` : '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 flex-shrink-0">
         
        </div>
      </div>

      {/* LTL Rate Quote Modal */}
      {selectedOrderForLTL && (
        <LTLRateQuoteModal
          isOpen={ltlModalOpen}
          order={selectedOrderForLTL}
          onClose={() => {
            setLtlModalOpen(false);
            // Reset shipping type to default when modal closes
            setShippingTypes((prev) => ({
              ...prev,
              [selectedOrderForLTL.id]: '',
            }));
            setSelectedOrderForLTL(null);
          }}
        />
      )}
    </div>
  );
};


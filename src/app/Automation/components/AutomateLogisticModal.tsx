'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { X, ChevronDown, CheckCircle2, Loader2 } from 'lucide-react';
import type { Order } from '@/app/types/order';
import { LTLRateQuoteModal } from './LTLRateQuoteModal';
import { ParcelModal } from './ParcelModal';
import { Toast } from '@/app/orders/_components/Toast';
import { buildApiUrl } from '../../../../BaseUrl';
import {
  getCachedOrders,
  getCachedOrder,
  updateCachedOrder,
  removeCachedOrder,
  type CachedOrderData,
} from '../utils/ltlOrderCache';
import { getAllShippedOrders, type ShippedOrder } from '@/app/ProcessedOrders/utils/shippedOrdersApi';

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
  // State to manage Parcel modal
  const [parcelModalOpen, setParcelModalOpen] = useState(false);
  const [selectedOrderForParcel, setSelectedOrderForParcel] = useState<Order | null>(null);
  // Refs for dropdown click outside detection
  const dropdownRefs = useRef<Record<number, HTMLDivElement | null>>({});
  // Refs for subSKU input fields
  const subSKUInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  // State to manage subSKUs for each order
  const [subSKUs, setSubSKUs] = useState<Record<number, string[]>>({});
  // State to manage input values for each order
  const [subSKUInputs, setSubSKUInputs] = useState<Record<number, string>>({});
  // State to manage which order is currently showing input field
  const [showSubSKUInput, setShowSubSKUInput] = useState<Record<number, boolean>>({});
  // State for toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [savingAllOrders, setSavingAllOrders] = useState(false);
  // Track saved orders to prevent duplicate saves
  const [savedOrders, setSavedOrders] = useState<Record<number, boolean>>({});
  const [savingOrders, setSavingOrders] = useState<Record<number, boolean>>({});
  // Track existing shipped orders by SKU
  const [existingShippedOrders, setExistingShippedOrders] = useState<Record<string, ShippedOrder>>({});
  // Track original subSKUs to detect changes
  const [originalSubSKUs, setOriginalSubSKUs] = useState<Record<number, string[]>>({});
  

  // Function to find existing shipped order by SKU
  const findExistingShippedOrder = useCallback(async (sku: string): Promise<ShippedOrder | null> => {
    if (!sku || sku === '-') return null;
    
    try {
      const result = await getAllShippedOrders({
        page: 1,
        limit: 10,
        search: sku,
      });
      
      // Find exact SKU match
      const matchedOrder = result.orders.find((order: ShippedOrder) => 
        order.sku && order.sku.toLowerCase().trim() === sku.toLowerCase().trim()
      );
      
      return matchedOrder || null;
    } catch (error) {
      console.error('Error finding existing shipped order:', error);
      return null;
    }
  }, []);

  // Check for existing shipped orders when orders change
  useEffect(() => {
    const checkExistingOrders = async () => {
      const existingMap: Record<string, ShippedOrder> = {};
      const newOriginalSubSKUs: Record<number, string[]> = {};
      
      for (const order of orders) {
        const sku = getJsonbValue(order.jsonb, 'SKU');
        if (sku && sku !== '-') {
          const existingOrder = await findExistingShippedOrder(sku);
          if (existingOrder) {
            existingMap[sku] = existingOrder;
            
            // Extract shiptypes and subSKUs from existing order
            let shippingType: 'LTL' | 'Parcel' | '' = '';
            let subSKUsList: string[] = [];
            
            // Get shipping type
            if (existingOrder.shippingType) {
              shippingType = existingOrder.shippingType as 'LTL' | 'Parcel';
            } else if (existingOrder.ordersJsonb && typeof existingOrder.ordersJsonb === 'object') {
              const ordersData = existingOrder.ordersJsonb as any;
              const shiptypes = ordersData?.shiptypes || ordersData?.shippingType;
              if (shiptypes === 'LTL' || shiptypes === 'Parcel') {
                shippingType = shiptypes;
              }
            }
            
            // Get subSKUs
            if (existingOrder.subSKUs && Array.isArray(existingOrder.subSKUs) && existingOrder.subSKUs.length > 0) {
              subSKUsList = existingOrder.subSKUs;
            } else if (existingOrder.ordersJsonb && typeof existingOrder.ordersJsonb === 'object') {
              const ordersData = existingOrder.ordersJsonb as any;
              const subSKUsValue = ordersData?.subSKUs || ordersData?.subSKU;
              
              if (Array.isArray(subSKUsValue)) {
                subSKUsList = subSKUsValue;
              } else if (typeof subSKUsValue === 'string' && subSKUsValue.trim()) {
                subSKUsList = subSKUsValue.split(',').map(s => s.trim()).filter(s => s.length > 0);
              }
            }
            
            // Pre-populate if we have data
            if (shippingType || subSKUsList.length > 0) {
              setShippingTypes((prev) => ({
                ...prev,
                [order.id]: shippingType || prev[order.id] || '',
              }));
              
              setSubSKUs((prev) => {
                const updated = { ...prev };
                if (subSKUsList.length > 0) {
                  updated[order.id] = subSKUsList;
                  newOriginalSubSKUs[order.id] = [...subSKUsList];
                }
                return updated;
              });
              
              // Mark as already saved if it has both shiptypes and subSKUs
              if (shippingType && subSKUsList.length > 0) {
                setSavedOrders((prev) => ({
                  ...prev,
                  [order.id]: true,
                }));
              }
            }
          }
        }
      }
      
      setExistingShippedOrders(existingMap);
      setOriginalSubSKUs((prev) => ({ ...prev, ...newOriginalSubSKUs }));
    };
    
    if (isOpen && orders.length > 0) {
      checkExistingOrders();
    }
  }, [isOpen, orders, findExistingShippedOrder]);

  // Initialize shipping types when orders change - Set Parcel as default for multiple orders
  useEffect(() => {
    setShippingTypes((prev) => {
      const updated: Record<number, 'LTL' | 'Parcel' | ''> = { ...prev };
      let hasChanges = false;
      
      orders.forEach((order) => {
        // Set Parcel as default for all orders when multiple orders are selected
        if (orders.length > 1 && (!(order.id in updated) || updated[order.id] === '')) {
          updated[order.id] = 'Parcel';
          hasChanges = true;
        } else if (orders.length === 1 && !(order.id in updated)) {
          // Single order - don't set default
          updated[order.id] = '';
          hasChanges = true;
        }
      });
      
      return hasChanges ? updated : prev;
    });
    
    // Initialize subSKUs when orders change
    setSubSKUs((prev) => {
      const updated: Record<number, string[]> = { ...prev };
      let hasChanges = false;
      
      orders.forEach((order) => {
        // Only initialize if not already set
        if (!(order.id in updated)) {
          updated[order.id] = [];
          hasChanges = true;
        }
      });
      
      return hasChanges ? updated : prev;
    });
  }, [orders]);

  // Function to check if subSKUs have changed
  const hasSubSKUsChanged = useCallback((orderId: number, currentSubSKUs: string[]): boolean => {
    const original = originalSubSKUs[orderId] || [];
    if (original.length !== currentSubSKUs.length) return true;
    
    const originalSorted = [...original].sort().join(',');
    const currentSorted = [...currentSubSKUs].sort().join(',');
    return originalSorted !== currentSorted;
  }, [originalSubSKUs]);

  // Function to save order data to cache (for LTL) or directly (for Parcel)
  const saveOrderData = useCallback(async (order: Order) => {
    // Prevent duplicate saves
    if (savingOrders[order.id]) {
      return;
    }

    const sku = getJsonbValue(order.jsonb, 'SKU');
    const shippingType = shippingTypes[order.id];
    const subSKUList = subSKUs[order.id] || [];

    // Validation
    if (!sku || sku === '-') {
      return;
    }

    if (!shippingType) {
      return;
    }

    if (subSKUList.length === 0) {
      return;
    }

    // Check if order already exists with shiptypes and subSKUs
    const existingOrder = existingShippedOrders[sku];
    
    if (existingOrder) {
      // Get existing shiptypes and subSKUs
      let existingShippingType: string | null = null;
      let existingSubSKUs: string[] = [];
      
      if (existingOrder.shippingType) {
        existingShippingType = existingOrder.shippingType;
      } else if (existingOrder.ordersJsonb && typeof existingOrder.ordersJsonb === 'object') {
        const ordersData = existingOrder.ordersJsonb as any;
        existingShippingType = ordersData?.shiptypes || ordersData?.shippingType || null;
      }
      
      if (existingOrder.subSKUs && Array.isArray(existingOrder.subSKUs) && existingOrder.subSKUs.length > 0) {
        existingSubSKUs = existingOrder.subSKUs;
      } else if (existingOrder.ordersJsonb && typeof existingOrder.ordersJsonb === 'object') {
        const ordersData = existingOrder.ordersJsonb as any;
        const subSKUsValue = ordersData?.subSKUs || ordersData?.subSKU;
        
        if (Array.isArray(subSKUsValue)) {
          existingSubSKUs = subSKUsValue;
        } else if (typeof subSKUsValue === 'string' && subSKUsValue.trim()) {
          existingSubSKUs = subSKUsValue.split(',').map(s => s.trim()).filter(s => s.length > 0);
        }
      }
      
      // Check if shiptypes or subSKUs have changed
      const shiptypesChanged = existingShippingType !== shippingType;
      const subSKUsChanged = hasSubSKUsChanged(order.id, subSKUList);
      
      // If nothing changed, skip update
      if (!shiptypesChanged && !subSKUsChanged && existingShippingType && existingSubSKUs.length > 0) {
        setSavedOrders((prev) => ({ ...prev, [order.id]: true }));
        setToastMessage('Order already has shiptypes and subSKUs. No update needed.');
        setShowToast(true);
        return;
      }
      
      // If changed, we'll update below (continue to update logic)
    }

    setSavingOrders((prev) => ({ ...prev, [order.id]: true }));

    try {
      // Prepare ordersJsonb with original order data plus shiptypes and subSKUs
      const ordersJsonb = {
        ...(order.jsonb as Record<string, unknown>),
        shiptypes: shippingType,
        subSKUs: subSKUList.join(', '), // Comma-separated string
      };

      // For LTL: Save to cache instead of immediately posting
      if (shippingType === 'LTL') {
        // Get existing cached order or create new
        const existingCached = getCachedOrder(order.id);
        
        // Update or create cache entry
        if (existingCached) {
          updateCachedOrder(order.id, {
            sku: sku,
            orderOnMarketPlace: order.orderOnMarketPlace,
            ordersJsonb: ordersJsonb,
            shippingType: shippingType,
            subSKUs: subSKUList,
          });
        } else {
          // Create new cache entry using utility
          updateCachedOrder(order.id, {
            orderId: order.id,
            sku: sku,
            orderOnMarketPlace: order.orderOnMarketPlace,
            ordersJsonb: ordersJsonb,
            shippingType: shippingType,
            subSKUs: subSKUList,
          });
        }

        // Mark order as saved (to cache)
        setSavedOrders((prev) => ({ ...prev, [order.id]: true }));

        // Show success toast
        setToastMessage('Order data saved to cache (LTL)');
        setShowToast(true);
      } else {
        // For Parcel: Check if order exists, if yes update, otherwise create
        let logisticsOrderId = existingOrder?.id;
        
        if (logisticsOrderId) {
          // Update existing order
          const response = await fetch(buildApiUrl(`/Logistics/shipped-orders/${logisticsOrderId}`), {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sku: sku,
              orderOnMarketPlace: order.orderOnMarketPlace,
              ordersJsonb: ordersJsonb,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to update order data' }));
            throw new Error(errorData.message || 'Failed to update order data');
          }

          const result = await response.json();
          
          // Update cache
          const existingCached = getCachedOrder(order.id);
          if (existingCached) {
            updateCachedOrder(order.id, { logisticsShippedOrderId: logisticsOrderId });
          } else {
            updateCachedOrder(order.id, {
              orderId: order.id,
              sku: sku,
              orderOnMarketPlace: order.orderOnMarketPlace,
              ordersJsonb: ordersJsonb,
              shippingType: shippingType,
              subSKUs: subSKUList,
              logisticsShippedOrderId: logisticsOrderId,
            });
          }

          // Mark order as saved
          setSavedOrders((prev) => ({ ...prev, [order.id]: true }));

          // Show success toast
          setToastMessage('Order data updated');
          setShowToast(true);
        } else {
          // Create new order
          const response = await fetch(buildApiUrl('/Logistics/shipped-orders'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sku: sku,
              orderOnMarketPlace: order.orderOnMarketPlace,
              ordersJsonb: ordersJsonb,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to save order data' }));
            throw new Error(errorData.message || 'Failed to save order data');
          }

          const result = await response.json();
          const logisticsOrderId = result.data?.id || result.id;

          // If order was created, also save to cache for future updates
          if (logisticsOrderId) {
            const existingCached = getCachedOrder(order.id);
            if (existingCached) {
              updateCachedOrder(order.id, { logisticsShippedOrderId: logisticsOrderId });
            } else {
              updateCachedOrder(order.id, {
                orderId: order.id,
                sku: sku,
                orderOnMarketPlace: order.orderOnMarketPlace,
                ordersJsonb: ordersJsonb,
                shippingType: shippingType,
                subSKUs: subSKUList,
                logisticsShippedOrderId: logisticsOrderId,
              });
            }
          }

          // Mark order as saved
          setSavedOrders((prev) => ({ ...prev, [order.id]: true }));

          // Show success toast
          setToastMessage('Order data saved');
          setShowToast(true);
        }
      }
    } catch (error) {
      console.error('Error saving order data:', error);
      setToastMessage(error instanceof Error ? error.message : 'Failed to save order data');
      setShowToast(true);
    } finally {
      setSavingOrders((prev) => {
        const updated = { ...prev };
        delete updated[order.id];
        return updated;
      });
    }
  }, [shippingTypes, subSKUs, savedOrders, savingOrders, existingShippedOrders, hasSubSKUsChanged]);

  // Function to update cache with rate quotes and BOL data (wrapper for utility)
  const updateOrderCache = useCallback((orderId: number, updates: Partial<CachedOrderData>) => {
    updateCachedOrder(orderId, updates);
  }, []);

  // Function to find existing logistics order by sku and orderOnMarketPlace
  const findExistingLogisticsOrder = useCallback(async (sku: string, orderOnMarketPlace: string): Promise<number | null> => {
    try {
      const response = await fetch(buildApiUrl(`/Logistics/shipped-orders?sku=${encodeURIComponent(sku)}&orderOnMarketPlace=${encodeURIComponent(orderOnMarketPlace)}&limit=1`));
      if (response.ok) {
        const data = await response.json();
        if (data.orders && data.orders.length > 0) {
          return data.orders[0].id;
        }
      }
      return null;
    } catch (err) {
      console.error('Error finding existing order:', err);
      return null;
    }
  }, []);

  // Function to update order from cache (called when BOL/pickup is ready)
  const updateOrderFromCache = useCallback(async (orderId: number) => {
    try {
      const cachedOrder = getCachedOrder(orderId);
      if (!cachedOrder) return;

      // Get logistics order ID - if not exists, try to find existing or create new
      let logisticsOrderId = cachedOrder.logisticsShippedOrderId;

      if (!logisticsOrderId) {
        // Try to find existing order first
        const existingId = await findExistingLogisticsOrder(cachedOrder.sku, cachedOrder.orderOnMarketPlace);
        
        if (existingId) {
          logisticsOrderId = existingId;
          updateOrderCache(orderId, { logisticsShippedOrderId: logisticsOrderId });
        } else {
          // Create order if not found
          const createResponse = await fetch(buildApiUrl('/Logistics/shipped-orders'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sku: cachedOrder.sku,
              orderOnMarketPlace: cachedOrder.orderOnMarketPlace,
              ordersJsonb: cachedOrder.ordersJsonb,
            }),
          });

          if (!createResponse.ok) {
            throw new Error('Failed to create order');
          }

          const createResult = await createResponse.json();
          logisticsOrderId = createResult.data?.id || createResult.id;
          
          // Update cache with logistics order ID
          updateOrderCache(orderId, { logisticsShippedOrderId: logisticsOrderId });
        }
      }

      // Prepare FormData for update with files
      const formData = new FormData();
      
      // Add files if available
      if (cachedOrder.xpoBolFiles) {
        cachedOrder.xpoBolFiles.forEach((file: File) => {
          formData.append('files', file);
        });
      }
      if (cachedOrder.estesBolFiles) {
        cachedOrder.estesBolFiles.forEach((file: File) => {
          formData.append('files', file);
        });
      }

      // Prepare JSONB data - merge all data and clear rate quotes responses
      const finalOrdersJsonb = {
        ...cachedOrder.ordersJsonb,
        shiptypes: cachedOrder.shippingType,
        subSKUs: cachedOrder.subSKUs.join(', '),
      };

      // Prepare rateQuotesResponseJsonb - combine XPO and Estes requests only (clear responses as requested)
      const rateQuotesResponseJsonb: Record<string, unknown> = {};
      if (cachedOrder.xpoRateQuoteRequest) {
        rateQuotesResponseJsonb.xpo = {
          request: cachedOrder.xpoRateQuoteRequest,
        };
      }
      if (cachedOrder.estesRateQuoteRequest) {
        rateQuotesResponseJsonb.estes = {
          request: cachedOrder.estesRateQuoteRequest,
        };
      }

      // Prepare bolResponseJsonb - combine XPO and Estes
      const bolResponseJsonb: Record<string, unknown> = {};
      if (cachedOrder.xpoBolResponse) {
        bolResponseJsonb.xpo = cachedOrder.xpoBolResponse;
      }
      if (cachedOrder.estesBolResponse) {
        bolResponseJsonb.estes = cachedOrder.estesBolResponse;
      }

      // Add JSON fields to FormData
      formData.append('ordersJsonb', JSON.stringify(finalOrdersJsonb));
      if (Object.keys(rateQuotesResponseJsonb).length > 0) {
        formData.append('rateQuotesResponseJsonb', JSON.stringify(rateQuotesResponseJsonb));
      }
      if (Object.keys(bolResponseJsonb).length > 0) {
        formData.append('bolResponseJsonb', JSON.stringify(bolResponseJsonb));
      }
      if (cachedOrder.pickupResponseJsonb) {
        formData.append('pickupResponseJsonb', JSON.stringify(cachedOrder.pickupResponseJsonb));
      }

      // Update order
      const updateResponse = await fetch(buildApiUrl(`/Logistics/shipped-orders/${logisticsOrderId}`), {
        method: 'PUT',
        body: formData,
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({ message: 'Failed to update order' }));
        throw new Error(errorData.message || 'Failed to update order');
      }

      // If pickup data was saved successfully, clear cache for this order
      if (cachedOrder.pickupResponseJsonb) {
        removeCachedOrder(orderId);
      }

      return true;
    } catch (error) {
      console.error('Error updating order from cache:', error);
      throw error;
    }
  }, [updateOrderCache, findExistingLogisticsOrder]);

  // Listen for events from XPO/Estes components to update cache
  useEffect(() => {
    const handleRateQuoteData = (e: CustomEvent) => {
      const { orderId, carrier, request, response } = e.detail;
      if (carrier === 'xpo') {
        updateOrderCache(orderId, {
          xpoRateQuoteRequest: request,
          xpoRateQuoteResponse: response,
        });
      } else if (carrier === 'estes') {
        updateOrderCache(orderId, {
          estesRateQuoteRequest: request,
          estesRateQuoteResponse: response,
        });
      }
    };

    const handleBOLData = (e: CustomEvent) => {
      const { orderId, carrier, bolResponse, bolFiles } = e.detail;
      if (carrier === 'xpo') {
        updateOrderCache(orderId, {
          xpoBolResponse: bolResponse,
          xpoBolFiles: bolFiles,
        });
        // Update order when BOL is ready
        updateOrderFromCache(orderId).catch(err => console.error('Error updating order:', err));
      } else if (carrier === 'estes') {
        updateOrderCache(orderId, {
          estesBolResponse: bolResponse,
          estesBolFiles: bolFiles,
        });
        // Update order when BOL is ready
        updateOrderFromCache(orderId).catch(err => console.error('Error updating order:', err));
      }
    };

    const handlePickupData = (e: CustomEvent) => {
      const { orderId, pickupResponse } = e.detail;
      updateOrderCache(orderId, {
        pickupResponseJsonb: pickupResponse,
      });
      // Update order when pickup is ready, then clear cache
      updateOrderFromCache(orderId)
        .then(() => {
          setToastMessage('Order updated successfully. Cache cleared.');
          setShowToast(true);
        })
        .catch(err => {
          console.error('Error updating order with pickup data:', err);
          setToastMessage('Failed to update order with pickup data');
          setShowToast(true);
        });
    };

    window.addEventListener('rateQuoteData' as any, handleRateQuoteData as EventListener);
    window.addEventListener('bolData' as any, handleBOLData as EventListener);
    window.addEventListener('pickupData' as any, handlePickupData as EventListener);

    return () => {
      window.removeEventListener('rateQuoteData' as any, handleRateQuoteData as EventListener);
      window.removeEventListener('bolData' as any, handleBOLData as EventListener);
      window.removeEventListener('pickupData' as any, handlePickupData as EventListener);
    };
  }, [updateOrderCache, updateOrderFromCache]);

  // Auto-save when both shippingType and subSKUs are filled (only for single orders)
  // Also auto-update when subSKUs or shiptypes change for existing orders
  useEffect(() => {
    // Only auto-save for single orders, not for multiple orders
    if (orders.length === 1) {
      orders.forEach((order) => {
        const shippingType = shippingTypes[order.id];
        const subSKUList = subSKUs[order.id] || [];
        const sku = getJsonbValue(order.jsonb, 'SKU');
        const existingOrder = sku && sku !== '-' ? existingShippedOrders[sku] : null;

        // Check if both are filled
        if (shippingType && subSKUList.length > 0 && !savingOrders[order.id]) {
          // Check if order exists and data has changed
          if (existingOrder) {
            // Get existing shiptypes and subSKUs
            let existingShippingType: string | null = null;
            let existingSubSKUs: string[] = [];
            
            if (existingOrder.shippingType) {
              existingShippingType = existingOrder.shippingType;
            } else if (existingOrder.ordersJsonb && typeof existingOrder.ordersJsonb === 'object') {
              const ordersData = existingOrder.ordersJsonb as any;
              existingShippingType = ordersData?.shiptypes || ordersData?.shippingType || null;
            }
            
            if (existingOrder.subSKUs && Array.isArray(existingOrder.subSKUs) && existingOrder.subSKUs.length > 0) {
              existingSubSKUs = existingOrder.subSKUs;
            } else if (existingOrder.ordersJsonb && typeof existingOrder.ordersJsonb === 'object') {
              const ordersData = existingOrder.ordersJsonb as any;
              const subSKUsValue = ordersData?.subSKUs || ordersData?.subSKU;
              
              if (Array.isArray(subSKUsValue)) {
                existingSubSKUs = subSKUsValue;
              } else if (typeof subSKUsValue === 'string' && subSKUsValue.trim()) {
                existingSubSKUs = subSKUsValue.split(',').map(s => s.trim()).filter(s => s.length > 0);
              }
            }
            
            // Check if shiptypes or subSKUs have changed
            const shiptypesChanged = existingShippingType !== shippingType;
            const subSKUsChanged = hasSubSKUsChanged(order.id, subSKUList);
            
            if (shiptypesChanged || subSKUsChanged) {
              // Data has changed, automatically update
              setTimeout(() => {
                saveOrderData(order);
              }, 500);
            } else if (!savedOrders[order.id]) {
              // Data hasn't changed but not marked as saved, mark as saved
              setSavedOrders((prev) => ({ ...prev, [order.id]: true }));
            }
          } else if (!savedOrders[order.id]) {
            // New order, save it
            setTimeout(() => {
              saveOrderData(order);
            }, 300);
          }
        }
      });
    }
  }, [shippingTypes, subSKUs, orders, savedOrders, savingOrders, saveOrderData, existingShippedOrders, hasSubSKUsChanged]);

  // Function to save all orders in bulk and open ParcelModal
  const handleProcessToFedex = useCallback(async () => {
    setSavingAllOrders(true);

    const ordersToSave = [];

    for (const order of orders) {
      const sku = getJsonbValue(order.jsonb, 'SKU');
      const shippingType = shippingTypes[order.id] || 'Parcel';
      const subSKUList = subSKUs[order.id] || [];

      if (!sku || sku === '-') {
        setToastMessage(`Order ${order.id}: SKU is required`);
        setShowToast(true);
        setSavingAllOrders(false);
        return;
      }

      if (!shippingType) {
        setToastMessage(`Order ${order.id}: Shipping type is required`);
        setShowToast(true);
        setSavingAllOrders(false);
        return;
      }

      if (subSKUList.length === 0) {
        setToastMessage(`Order ${order.id}: SubSKU is required`);
        setShowToast(true);
        setSavingAllOrders(false);
        return;
      }

      // Validate orderOnMarketPlace
      if (!order.orderOnMarketPlace || order.orderOnMarketPlace.trim() === '') {
        setToastMessage(`Order ${order.id}: Order on Marketplace is required`);
        setShowToast(true);
        setSavingAllOrders(false);
        return;
      }

      const ordersJsonb = {
        ...(order.jsonb as Record<string, unknown>),
        shiptypes: shippingType,
        subSKUs: subSKUList.join(', '),
      };

      ordersToSave.push({
        sku: sku.trim(),
        orderOnMarketPlace: order.orderOnMarketPlace.trim(),
        ordersJsonb: ordersJsonb,
      });
    }

    try {
      const response = await fetch(buildApiUrl('/Logistics/shipped-orders'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ordersToSave),
      });

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        // If response is not JSON, get text instead
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.ok) {
        // Handle error response
        const errorMessage = result?.message || result?.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      // Success response
      const successMessage = result?.message || `Successfully saved ${result?.created || ordersToSave.length} order(s)`;
      setToastMessage(successMessage);
      setShowToast(true);

      // Open ParcelModal after successful save
      setSelectedOrderForParcel(orders[0]);
      setParcelModalOpen(true);
    } catch (error) {
      console.error('Error saving orders:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save orders';
      setToastMessage(errorMessage);
      setShowToast(true);
    } finally {
      setSavingAllOrders(false);
    }
  }, [orders, shippingTypes, subSKUs]);

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
          <div className="flex items-center gap-3">
            {/* Process to Fedex Button - Show when all orders have SubSKU and shippingType */}
            {(() => {
              const allOrdersComplete = orders.length > 1 && orders.every(order => {
                const shippingType = shippingTypes[order.id];
                const subSKUList = subSKUs[order.id] || [];
                return shippingType && subSKUList.length > 0;
              });
              
              return allOrdersComplete ? (
                <button
                  type="button"
                  onClick={handleProcessToFedex}
                  disabled={savingAllOrders}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium text-sm disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  {savingAllOrders ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Process to Fedex</span>
                    </>
                  )}
                </button>
              ) : null;
            })()}
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
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
              <div key={order.id} className={`space-y-4 border-2 rounded-lg p-4 sm:p-6 ${colorScheme.bg}`}>
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
                  {/* Shipping Type Dropdown and SubSKU Section - Bottom Row */}
                  <div className="mt-4 sm:mt-5 flex items-end gap-4 flex-wrap">
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
                          // Only allow opening if SubSKU is added
                          if (!subSKUs[order.id] || subSKUs[order.id].length === 0) {
                            return;
                          }
                          setOpenDropdowns((prev) => ({
                            ...prev,
                            [order.id]: !prev[order.id],
                          }));
                        }}
                        disabled={!subSKUs[order.id] || subSKUs[order.id].length === 0}
                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-left text-xs font-medium text-slate-900 hover:bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-slate-100"
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
                              // Set Parcel for all orders when multiple orders are selected
                              if (orders.length > 1) {
                                setShippingTypes((prev) => {
                                  const updated = { ...prev };
                                  orders.forEach((o) => {
                                    updated[o.id] = 'Parcel';
                                  });
                                  return updated;
                                });
                              } else {
                                setShippingTypes((prev) => ({
                                  ...prev,
                                  [order.id]: 'Parcel',
                                }));
                                // If order exists and shiptypes changed, auto-update
                                const sku = getJsonbValue(order.jsonb, 'SKU');
                                const existingOrder = sku && sku !== '-' ? existingShippedOrders[sku] : null;
                                if (existingOrder && subSKUs[order.id] && subSKUs[order.id].length > 0) {
                                  // Auto-update when shiptypes change
                                  setTimeout(() => {
                                    saveOrderData(order).then(() => {
                                      setSelectedOrderForParcel(order);
                                      setParcelModalOpen(true);
                                    });
                                  }, 300);
                                  return;
                                }
                              }
                              setOpenDropdowns((prev) => ({
                                ...prev,
                                [order.id]: false,
                              }));
                              
                              // For single order, save and open modal
                              if (orders.length === 1) {
                                saveOrderData(order).then(() => {
                                  setSelectedOrderForParcel(order);
                                  setParcelModalOpen(true);
                                });
                              }
                            }}
                            className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-100 ${
                              shippingTypes[order.id] === 'Parcel' ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                            }`}
                          >
                            Parcel
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const newValue = 'LTL';
                              const sku = getJsonbValue(order.jsonb, 'SKU');
                              const existingOrder = sku && sku !== '-' ? existingShippedOrders[sku] : null;
                              
                              setShippingTypes((prev) => ({
                                ...prev,
                                [order.id]: newValue,
                              }));
                              setOpenDropdowns((prev) => ({
                                ...prev,
                                [order.id]: false,
                              }));
                              
                              // If order exists and shiptypes changed, auto-update
                              if (existingOrder && subSKUs[order.id] && subSKUs[order.id].length > 0) {
                                // Auto-update when shiptypes change
                                await saveOrderData(order);
                              } else {
                                // Save order data when LTL is selected
                                await saveOrderData(order);
                              }
                              
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
                    {/* SubSKU Section - Right side of Shipping Type */}
                    <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                      <span className="text-xs font-medium text-slate-900">SubSKU</span>
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Display existing subSKUs */}
                        {subSKUs[order.id] && subSKUs[order.id].length > 0 && (
                          <>
                            {subSKUs[order.id].map((subSku, index) => (
                              <span key={index} className="inline-flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-900 text-xs font-medium rounded-md">
                                  {subSku}
                                  <button
                                    type="button"
                              onClick={() => {
                                setSubSKUs((prev) => {
                                  const updated = {
                                    ...prev,
                                    [order.id]: prev[order.id]?.filter((_, i) => i !== index) || [],
                                  };
                                  // If subSKUs changed, mark as not saved
                                  if (hasSubSKUsChanged(order.id, updated[order.id] || [])) {
                                    setSavedOrders((prev) => {
                                      const updated = { ...prev };
                                      delete updated[order.id];
                                      return updated;
                                    });
                                  }
                                  return updated;
                                });
                              }}
                                    className="ml-1 text-slate-600 hover:text-slate-900"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                                {index < subSKUs[order.id].length - 1 && (
                                  <span className="text-slate-600 mx-1">,</span>
                                )}
                              </span>
                            ))}
                          </>
                        )}
                        {/* Input field - shown when Add SubSKU is clicked */}
                        {showSubSKUInput[order.id] && (
                          <div className="flex items-center gap-2">
                            <input
                              ref={(el) => {
                                subSKUInputRefs.current[order.id] = el;
                              }}
                              type="text"
                              value={subSKUInputs[order.id] || ''}
                              onChange={(e) => {
                                setSubSKUInputs((prev) => ({
                                  ...prev,
                                  [order.id]: e.target.value,
                                }));
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && subSKUInputs[order.id]?.trim()) {
                                  setSubSKUs((prev) => {
                                    const updated = {
                                      ...prev,
                                      [order.id]: [...(prev[order.id] || []), subSKUInputs[order.id].trim()],
                                    };
                                    // If subSKUs changed, mark as not saved
                                    if (hasSubSKUsChanged(order.id, updated[order.id] || [])) {
                                      setSavedOrders((prev) => {
                                        const updated = { ...prev };
                                        delete updated[order.id];
                                        return updated;
                                      });
                                    }
                                    return updated;
                                  });
                                  setSubSKUInputs((prev) => ({
                                    ...prev,
                                    [order.id]: '',
                                  }));
                                  // Focus input for next entry
                                  setTimeout(() => {
                                    subSKUInputRefs.current[order.id]?.focus();
                                  }, 0);
                                } else if (e.key === 'Escape') {
                                  setShowSubSKUInput((prev) => ({
                                    ...prev,
                                    [order.id]: false,
                                  }));
                                  setSubSKUInputs((prev) => ({
                                    ...prev,
                                    [order.id]: '',
                                  }));
                                }
                              }}
                              placeholder="Enter SubSKU"
                              className="px-2 py-1 text-xs text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (subSKUInputs[order.id]?.trim()) {
                                  setSubSKUs((prev) => {
                                    const updated = {
                                      ...prev,
                                      [order.id]: [...(prev[order.id] || []), subSKUInputs[order.id].trim()],
                                    };
                                    // If subSKUs changed, mark as not saved
                                    if (hasSubSKUsChanged(order.id, updated[order.id] || [])) {
                                      setSavedOrders((prev) => {
                                        const updated = { ...prev };
                                        delete updated[order.id];
                                        return updated;
                                      });
                                    }
                                    return updated;
                                  });
                                  setSubSKUInputs((prev) => ({
                                    ...prev,
                                    [order.id]: '',
                                  }));
                                  // Focus input for next entry
                                  setTimeout(() => {
                                    subSKUInputRefs.current[order.id]?.focus();
                                  }, 0);
                                }
                              }}
                              className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowSubSKUInput((prev) => ({
                                  ...prev,
                                  [order.id]: false,
                                }));
                                setSubSKUInputs((prev) => ({
                                  ...prev,
                                  [order.id]: '',
                                }));
                              }}
                              className="px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                        {/* Add SubSKU Button */}
                        {!showSubSKUInput[order.id] && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowSubSKUInput((prev) => ({
                                ...prev,
                                [order.id]: true,
                              }));
                            }}
                            className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                          >
                            Add SubSKU
                          </button>
                        )}
                      </div>
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
          subSKUs={subSKUs[selectedOrderForLTL.id] || []}
          shippingType={shippingTypes[selectedOrderForLTL.id] || 'LTL'}
          onClose={() => {
            setLtlModalOpen(false);
            // Don't reset shipping type - keep it as LTL
            setSelectedOrderForLTL(null);
          }}
        />
      )}

      {/* Parcel Modal */}
      <ParcelModal
        isOpen={parcelModalOpen}
        orders={orders}
        onClose={() => {
          setParcelModalOpen(false);
          // Reset shipping type to default when modal closes
          if (selectedOrderForParcel) {
            setShippingTypes((prev) => ({
              ...prev,
              [selectedOrderForParcel.id]: '',
            }));
          }
          setSelectedOrderForParcel(null);
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          isVisible={showToast}
          onClose={() => {
            setShowToast(false);
            setTimeout(() => setToastMessage(null), 300);
          }}
        />
      )}
    </div>
  );
};


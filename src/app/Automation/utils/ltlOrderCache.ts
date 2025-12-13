/**
 * Utility functions for managing LTL order cache
 */

const LTL_CACHE_KEY = 'ltl_orders_cache';

export type CachedOrderData = {
  orderId: number;
  sku: string;
  orderOnMarketPlace: string;
  ordersJsonb: Record<string, unknown>;
  shippingType: 'LTL' | 'Parcel' | '';
  subSKUs: string[];
  logisticsShippedOrderId?: number; // ID from backend after initial save
  xpoRateQuoteRequest?: Record<string, unknown>;
  xpoRateQuoteResponse?: Record<string, unknown>;
  estesRateQuoteRequest?: Record<string, unknown>;
  estesRateQuoteResponse?: Record<string, unknown>;
  xpoBolResponse?: Record<string, unknown>;
  estesBolResponse?: Record<string, unknown>;
  xpoBolFiles?: File[]; // Files are stored separately, not in JSON cache
  estesBolFiles?: File[]; // Files are stored separately, not in JSON cache
  pickupResponseJsonb?: Record<string, unknown>;
};

// In-memory storage for files (since they can't be serialized to localStorage)
const fileStorage = new Map<number, { xpoBolFiles?: File[]; estesBolFiles?: File[] }>();

/**
 * Get all cached orders
 */
export const getCachedOrders = (): Record<number, CachedOrderData> => {
  try {
    const cache = localStorage.getItem(LTL_CACHE_KEY);
    const cached: Record<number, any> = cache ? JSON.parse(cache) : {};
    
    // Restore files from in-memory storage
    Object.keys(cached).forEach((orderIdStr) => {
      const orderId = parseInt(orderIdStr);
      const fileData = fileStorage.get(orderId);
      if (fileData) {
        cached[orderId] = {
          ...cached[orderId],
          xpoBolFiles: fileData.xpoBolFiles,
          estesBolFiles: fileData.estesBolFiles,
        };
      } else {
        cached[orderId] = {
          ...cached[orderId],
          xpoBolFiles: undefined,
          estesBolFiles: undefined,
        };
      }
    });
    
    return cached as Record<number, CachedOrderData>;
  } catch (err) {
    console.error('Error reading cache:', err);
    return {};
  }
};

/**
 * Get cached order by order ID
 */
export const getCachedOrder = (orderId: number): CachedOrderData | null => {
  const cached = getCachedOrders();
  const order = cached[orderId];
  if (!order) return null;
  
  // Restore files from in-memory storage
  const fileData = fileStorage.get(orderId);
  if (fileData) {
    order.xpoBolFiles = fileData.xpoBolFiles;
    order.estesBolFiles = fileData.estesBolFiles;
  }
  
  return order;
};

/**
 * Update cached order
 */
export const updateCachedOrder = (orderId: number, updates: Partial<CachedOrderData>): void => {
  try {
    // Separate files from other data (files can't be serialized)
    const { xpoBolFiles, estesBolFiles, ...otherUpdates } = updates;
    
    // Update file storage
    if (xpoBolFiles !== undefined || estesBolFiles !== undefined) {
      const existingFiles = fileStorage.get(orderId) || {};
      fileStorage.set(orderId, {
        ...existingFiles,
        ...(xpoBolFiles !== undefined && { xpoBolFiles }),
        ...(estesBolFiles !== undefined && { estesBolFiles }),
      });
    }
    
    // Get existing cache
    const cache = localStorage.getItem(LTL_CACHE_KEY);
    const cached: Record<number, any> = cache ? JSON.parse(cache) : {};
    
    // Update or create cache entry
    if (cached[orderId]) {
      cached[orderId] = {
        ...cached[orderId],
        ...otherUpdates,
      };
    } else {
      cached[orderId] = {
        orderId,
        ...otherUpdates,
      };
    }
    
    // Save to localStorage (without files)
    localStorage.setItem(LTL_CACHE_KEY, JSON.stringify(cached));
  } catch (err) {
    console.error('Error updating cache:', err);
  }
};

/**
 * Remove cached order
 */
export const removeCachedOrder = (orderId: number): void => {
  try {
    // Remove files from in-memory storage
    fileStorage.delete(orderId);
    
    // Remove from localStorage
    const cache = localStorage.getItem(LTL_CACHE_KEY);
    if (cache) {
      const cached: Record<number, any> = JSON.parse(cache);
      delete cached[orderId];
      
      if (Object.keys(cached).length === 0) {
        localStorage.removeItem(LTL_CACHE_KEY);
      } else {
        localStorage.setItem(LTL_CACHE_KEY, JSON.stringify(cached));
      }
    }
  } catch (err) {
    console.error('Error removing from cache:', err);
  }
};

/**
 * Clear all cache
 */
export const clearAllCache = (): void => {
  try {
    localStorage.removeItem(LTL_CACHE_KEY);
  } catch (err) {
    console.error('Error clearing cache:', err);
  }
};

/**
 * Dispatch event for rate quote data
 */
export const dispatchRateQuoteData = (orderId: number, carrier: 'xpo' | 'estes', request: Record<string, unknown>, response?: Record<string, unknown>) => {
  window.dispatchEvent(new CustomEvent('rateQuoteData', {
    detail: { orderId, carrier, request, response },
  }));
};

/**
 * Dispatch event for BOL data
 */
export const dispatchBOLData = (orderId: number, carrier: 'xpo' | 'estes', bolResponse: Record<string, unknown>, bolFiles?: File[]) => {
  window.dispatchEvent(new CustomEvent('bolData', {
    detail: { orderId, carrier, bolResponse, bolFiles },
  }));
};

/**
 * Dispatch event for pickup data
 */
export const dispatchPickupData = (orderId: number, pickupResponse: Record<string, unknown>) => {
  window.dispatchEvent(new CustomEvent('pickupData', {
    detail: { orderId, pickupResponse },
  }));
};

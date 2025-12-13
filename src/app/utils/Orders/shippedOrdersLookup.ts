import { getAllShippedOrders, type ShippedOrder } from '@/app/ProcessedOrders/utils/shippedOrdersApi';

export type SKULookupData = {
  shippingType: string | null;
  subSKUs: string[];
};

/**
 * Fetches all shipped orders and creates a lookup map by SKU
 * Returns a map where key is SKU and value contains shippingType and subSKUs
 */
export const createSKULookupMap = async (): Promise<Map<string, SKULookupData>> => {
  const lookupMap = new Map<string, SKULookupData>();
  
  try {
    // Fetch all shipped orders (we'll need to paginate through all pages)
    let currentPage = 1;
    let hasMorePages = true;
    const limit = 100; // Maximum limit per page
    
    while (hasMorePages) {
      const result = await getAllShippedOrders({
        page: currentPage,
        limit,
      });
      
      // Process each order
      result.orders.forEach((order: ShippedOrder) => {
        if (!order.sku) return;
        
        // Get shipping type - try direct field first, then ordersJsonb
        let shippingType: string | null = order.shippingType || null;
        
        if (!shippingType && order.ordersJsonb && typeof order.ordersJsonb === 'object') {
          const ordersData = order.ordersJsonb as any;
          shippingType = ordersData?.shiptypes || 
                        ordersData?.shippingType || 
                        ordersData?.ShippingType ||
                        ordersData?.shipType ||
                        ordersData?.ShipType ||
                        null;
        }
        
        // Get subSKUs - try direct field first, then ordersJsonb
        let subSKUs: string[] = [];
        
        if (order.subSKUs && Array.isArray(order.subSKUs) && order.subSKUs.length > 0) {
          subSKUs = order.subSKUs;
        } else if (order.ordersJsonb && typeof order.ordersJsonb === 'object') {
          const ordersData = order.ordersJsonb as any;
          const subSKUsValue = ordersData?.subSKUs || 
                              ordersData?.subSKU || 
                              ordersData?.SubSKUs ||
                              ordersData?.SubSKU;
          
          // Handle both array and string formats
          if (Array.isArray(subSKUsValue)) {
            subSKUs = subSKUsValue;
          } else if (typeof subSKUsValue === 'string' && subSKUsValue.trim()) {
            // If it's a string, try to split by comma or use as single value
            subSKUs = subSKUsValue.split(',').map(s => s.trim()).filter(s => s.length > 0);
          }
        }
        
        // Store in map (if SKU already exists, we keep the first one or merge subSKUs)
        if (!lookupMap.has(order.sku)) {
          lookupMap.set(order.sku, {
            shippingType,
            subSKUs,
          });
        } else {
          // Merge subSKUs if SKU already exists
          const existing = lookupMap.get(order.sku)!;
          const mergedSubSKUs = [...new Set([...existing.subSKUs, ...subSKUs])];
          lookupMap.set(order.sku, {
            shippingType: existing.shippingType || shippingType,
            subSKUs: mergedSubSKUs,
          });
        }
      });
      
      // Check if there are more pages
      hasMorePages = result.pagination?.hasNextPage || false;
      currentPage++;
      
      // Safety check to prevent infinite loops
      if (currentPage > 100) {
        console.warn('Reached maximum page limit (100) while fetching shipped orders');
        break;
      }
    }
    
    return lookupMap;
  } catch (error) {
    console.error('Error creating SKU lookup map:', error);
    return lookupMap; // Return empty map on error
  }
};

/**
 * Gets shipping type and subSKUs for a given SKU from the lookup map
 * Performs case-insensitive matching
 */
export const getSKUData = (
  sku: string | null | undefined,
  lookupMap: Map<string, SKULookupData>
): SKULookupData | null => {
  if (!sku) return null;
  
  // Try exact match first
  if (lookupMap.has(sku)) {
    return lookupMap.get(sku) || null;
  }
  
  // Try case-insensitive match
  const skuLower = sku.toLowerCase().trim();
  for (const [mapSku, data] of lookupMap.entries()) {
    if (mapSku.toLowerCase().trim() === skuLower) {
      return data;
    }
  }
  
  return null;
};

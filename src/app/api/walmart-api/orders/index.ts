import { useWalmartStore } from '@/store/walmartStore';
import type { Order, PaginationMeta } from '@/app/types/order';

export type GetWalmartOrdersOptions = {
  page?: number;
  limit?: number;
  sku?: string;
  customerOrderId?: string;
  purchaseOrderId?: string;
  status?: string;
  createdStartDate?: string;
  createdEndDate?: string;
  fromExpectedShipDate?: string;
  toExpectedShipDate?: string;
  lastModifiedStartDate?: string;
  lastModifiedEndDate?: string;
  productInfo?: boolean;
  shipNodeType?: string;
  shippingProgramType?: string;
  replacementInfo?: boolean;
  orderType?: string;
  incentiveInfo?: boolean;
};

export type GetWalmartOrdersResponse = {
  success: boolean;
  orders: Order[];
  pagination: PaginationMeta;
  message?: string;
  error?: string;
};

/**
 * Transform Walmart order to our Order type format
 * Backend already parsed XML to JSON, so handle both namespace and non-namespace keys
 */
function transformWalmartOrderToOrder(walmartOrder: any, index: number): Order {
  // Handle namespace keys (ns3:orderLines) and non-namespace keys (orderLines)
  const orderLinesData = walmartOrder['ns3:orderLines'] || walmartOrder.orderLines || {};
  const orderLines = orderLinesData['ns3:orderLine'] || orderLinesData.orderLine || [];
  const firstOrderLine = Array.isArray(orderLines) ? (orderLines[0] || {}) : (orderLines || {});
  
  // Extract charge amount - handle both array and single object cases
  const chargesData = firstOrderLine?.['ns3:charges'] || firstOrderLine?.charges || {};
  const chargeData = chargesData['ns3:charge'] || chargesData.charge;
  // charge can be an array or a single object
  const charge = Array.isArray(chargeData) ? (chargeData[0] || {}) : (chargeData || {});
  const chargeAmount = charge?.['ns3:chargeAmount'] || charge?.chargeAmount || {};
  const amountValue = chargeAmount['ns3:amount'] || chargeAmount.amount;
  // Convert to string, default to '0' if not found
  const amount = amountValue !== undefined && amountValue !== null ? String(amountValue) : '0';
  
  // Extract tax amount similarly
  const taxData = charge?.['ns3:tax'] || charge?.tax || {};
  const taxAmount = taxData['ns3:taxAmount'] || taxData.taxAmount || {};
  const taxValue = taxAmount['ns3:amount'] || taxAmount.amount;
  // Convert to string, default to '0' if not found
  const tax = taxValue !== undefined && taxValue !== null ? String(taxValue) : '0';
  
  const shippingInfo = walmartOrder['ns3:shippingInfo'] || walmartOrder.shippingInfo || {};
  const postalAddress = shippingInfo['ns3:postalAddress'] || shippingInfo.postalAddress || {};

  // Handle both namespace and non-namespace keys from backend JSON
  const purchaseOrderId = walmartOrder['ns3:purchaseOrderId'] || walmartOrder.purchaseOrderId || '';
  const customerOrderId = walmartOrder['ns3:customerOrderId'] || walmartOrder.customerOrderId || '';
  const orderDate = walmartOrder['ns3:orderDate'] || walmartOrder.orderDate || '';
  const customerEmailId = walmartOrder['ns3:customerEmailId'] || walmartOrder.customerEmailId || '';
  const phone = shippingInfo['ns3:phone'] || shippingInfo.phone || '';
  const methodCode = shippingInfo['ns3:methodCode'] || shippingInfo.methodCode || '';
  const estimatedShipDate = shippingInfo['ns3:estimatedShipDate'] || shippingInfo.estimatedShipDate || '';
  const estimatedDeliveryDate = shippingInfo['ns3:estimatedDeliveryDate'] || shippingInfo.estimatedDeliveryDate || '';
  
  const addressName = postalAddress['ns3:name'] || postalAddress.name || '';
  const address1 = postalAddress['ns3:address1'] || postalAddress.address1 || '';
  const city = postalAddress['ns3:city'] || postalAddress.city || '';
  const state = postalAddress['ns3:state'] || postalAddress.state || '';
  const postalCode = postalAddress['ns3:postalCode'] || postalAddress.postalCode || '';
  const country = postalAddress['ns3:country'] || postalAddress.country || '';

  // Build jsonb object matching our format
  const jsonb: Record<string, unknown> = {
    'PO#': purchaseOrderId,
    'Order#': customerOrderId,
    'Customer Order ID': customerOrderId,
    'Purchase Order ID': purchaseOrderId,
    'Order Date': orderDate,
    'Customer Email': customerEmailId,
    'Customer Name': addressName,
    'Customer Phone Number': phone,
    'Shipping Address': addressName && address1
      ? `${addressName}, ${address1}, ${city}, ${state} ${postalCode}, Phone: ${phone}`
      : '',
    'Address': address1,
    'City': city,
    'State': state,
    'Zip': postalCode,
    'Country': country,
    'SKU': firstOrderLine?.['ns3:item']?.['ns3:sku'] || firstOrderLine?.item?.sku || firstOrderLine?.['ns3:sku'] || firstOrderLine?.sku || '',
    'Product Name': firstOrderLine?.['ns3:item']?.['ns3:productName'] || firstOrderLine?.item?.productName || firstOrderLine?.['ns3:productName'] || firstOrderLine?.productName || '',
    'Item Description': firstOrderLine?.['ns3:item']?.['ns3:productName'] || firstOrderLine?.item?.productName || firstOrderLine?.['ns3:productName'] || firstOrderLine?.productName || '',
    'Quantity': firstOrderLine?.['ns3:quantity']?.['ns3:amount'] || firstOrderLine?.quantity?.amount || firstOrderLine?.['ns3:quantity'] || firstOrderLine?.quantity || '1',
    'Qty': firstOrderLine?.['ns3:quantity']?.['ns3:amount'] || firstOrderLine?.quantity?.amount || firstOrderLine?.['ns3:quantity'] || firstOrderLine?.quantity || '1',
    'Item Cost': amount,
    'Price': amount,
    'Amount': amount,
    'Tax': tax,
    'Status': firstOrderLine?.['ns3:orderLineStatuses']?.['ns3:orderLineStatus']?.[0]?.['ns3:status'] || 
              firstOrderLine?.orderLineStatuses?.orderLineStatus?.[0]?.status || 
              firstOrderLine?.['ns3:status'] ||
              firstOrderLine?.status || '',
    'Carrier': firstOrderLine?.['ns3:orderLineStatuses']?.['ns3:orderLineStatus']?.[0]?.['ns3:trackingInfo']?.['ns3:carrierName']?.['ns3:carrier'] || 
               firstOrderLine?.orderLineStatuses?.orderLineStatus?.[0]?.trackingInfo?.carrierName?.carrier || 
               firstOrderLine?.['ns3:trackingInfo']?.['ns3:carrierName']?.['ns3:carrier'] ||
               firstOrderLine?.trackingInfo?.carrierName?.carrier || 
               firstOrderLine?.['ns3:carrier'] ||
               firstOrderLine?.carrier || '',
    'Tracking Number': firstOrderLine?.['ns3:orderLineStatuses']?.['ns3:orderLineStatus']?.[0]?.['ns3:trackingInfo']?.['ns3:trackingNumber'] || 
                       firstOrderLine?.orderLineStatuses?.orderLineStatus?.[0]?.trackingInfo?.trackingNumber || 
                       firstOrderLine?.['ns3:trackingInfo']?.['ns3:trackingNumber'] ||
                       firstOrderLine?.trackingInfo?.trackingNumber || 
                       firstOrderLine?.['ns3:trackingNumber'] ||
                       firstOrderLine?.trackingNumber || '',
    'Tracking Url': firstOrderLine?.['ns3:orderLineStatuses']?.['ns3:orderLineStatus']?.[0]?.['ns3:trackingInfo']?.['ns3:trackingURL'] || 
                    firstOrderLine?.orderLineStatuses?.orderLineStatus?.[0]?.trackingInfo?.trackingURL || 
                    firstOrderLine?.['ns3:trackingInfo']?.['ns3:trackingURL'] ||
                    firstOrderLine?.trackingInfo?.trackingURL || 
                    firstOrderLine?.['ns3:trackingURL'] ||
                    firstOrderLine?.trackingURL || '',
    'Shipping Method': methodCode,
    'Estimated Ship Date': estimatedShipDate,
    'Estimated Delivery Date': estimatedDeliveryDate,
  };

  // Generate a stable ID from purchaseOrderId or use index
  // Don't use Date.now() to avoid hydration mismatches
  // purchaseOrderId is already defined above, so reuse it
  // Convert to string first in case it's a number
  const orderId = purchaseOrderId 
    ? parseInt(String(purchaseOrderId).replace(/\D/g, '').slice(-10) || '0', 10) || index + 1000000
    : index + 1000000;

  return {
    id: orderId,
    orderOnMarketPlace: 'Walmart',
    jsonb,
    createdAt: orderDate || new Date().toISOString(),
    updatedAt: orderDate || new Date().toISOString(),
  };
}

/**
 * Get Walmart orders from backend API
 * This function gets the token from Zustand store and calls the API route
 */
export const getWalmartOrders = async (
  options: GetWalmartOrdersOptions = {}
): Promise<GetWalmartOrdersResponse> => {
  try {
    const store = useWalmartStore.getState();
    
    // Get token from Zustand store
    let token = store.getToken();
    
    // Check if token is expired or missing
    const isExpired = store.isTokenExpired();
    
    if (!token || isExpired) {
      console.log('🔄 Token missing or expired, refreshing...', {
        hasToken: !!token,
        isExpired,
      });
      
      // Try to refresh token
      const refreshSuccess = await store.refreshToken();
      
      if (!refreshSuccess) {
        return {
          success: false,
          orders: [],
          pagination: {
            page: 1,
            limit: 100,
            totalCount: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
          message: 'Walmart token not available and refresh failed. Please check your credentials.',
        };
      }
      
      // Get the new token
      token = store.getToken();
      
      if (!token) {
        return {
          success: false,
          orders: [],
          pagination: {
            page: 1,
            limit: 100,
            totalCount: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
          message: 'Walmart token not available after refresh. Please check your credentials.',
        };
      }
      
      console.log('✅ Token refreshed successfully');
    }
    
    console.log('🔑 Using token:', {
      tokenLength: token?.length,
      tokenPreview: token?.substring(0, 20) + '...',
    });

    // Build query parameters
    const params = new URLSearchParams();
    
    if (options.page) params.append('page', String(options.page));
    if (options.limit) params.append('limit', String(options.limit));
    if (options.sku) params.append('sku', options.sku);
    if (options.customerOrderId) params.append('customerOrderId', options.customerOrderId);
    if (options.purchaseOrderId) params.append('purchaseOrderId', options.purchaseOrderId);
    if (options.status) params.append('status', options.status);
    if (options.createdStartDate) params.append('createdStartDate', options.createdStartDate);
    if (options.createdEndDate) params.append('createdEndDate', options.createdEndDate);
    if (options.fromExpectedShipDate) params.append('fromExpectedShipDate', options.fromExpectedShipDate);
    if (options.toExpectedShipDate) params.append('toExpectedShipDate', options.toExpectedShipDate);
    if (options.lastModifiedStartDate) params.append('lastModifiedStartDate', options.lastModifiedStartDate);
    if (options.lastModifiedEndDate) params.append('lastModifiedEndDate', options.lastModifiedEndDate);
    if (options.productInfo !== undefined) params.append('productInfo', String(options.productInfo));
    if (options.shipNodeType) params.append('shipNodeType', options.shipNodeType);
    if (options.shippingProgramType) params.append('shippingProgramType', options.shippingProgramType);
    if (options.replacementInfo !== undefined) params.append('replacementInfo', String(options.replacementInfo));
    if (options.orderType) params.append('orderType', options.orderType);
    if (options.incentiveInfo !== undefined) params.append('incentiveInfo', String(options.incentiveInfo));

    // Call the API route with token in header
    console.log('📡 Calling orders API with token...', {
      tokenLength: token?.length,
      hasToken: !!token,
      url: `/api/walmart-api/orders?${params.toString()}`,
    });

    const response = await fetch(`/api/walmart-api/orders?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'WM_SEC.ACCESS_TOKEN': token,
      },
    });

    const data = await response.json();

    console.log('📥 Orders API response:', {
      status: response.status,
      ok: response.ok,
      success: data.success,
      hasOrders: !!data.orders,
      ordersLength: data.orders?.length,
      message: data.message,
      error: data.error,
    });

    if (!response.ok) {
      // If 401, token might be expired - try refreshing once more
      if (response.status === 401) {
        console.log('🔄 Got 401, refreshing token and retrying...');
        const refreshSuccess = await store.refreshToken();
        
        if (refreshSuccess) {
          const newToken = store.getToken();
          if (newToken) {
            console.log('🔄 Retrying with new token...');
            // Retry once with new token
            const retryResponse = await fetch(`/api/walmart-api/orders?${params.toString()}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'WM_SEC.ACCESS_TOKEN': newToken,
              },
            });
            
            const retryData = await retryResponse.json();
            
            if (retryResponse.ok && retryData.success) {
              console.log('✅ Retry successful with new token');
              // Continue with normal processing below
              const walmartOrders = retryData.orders || retryData.data?.list?.elements?.order || [];
              const transformedOrders = walmartOrders.map((order: any, index: number) => {
                try {
                  return transformWalmartOrderToOrder(order, index);
                } catch (err) {
                  console.error(`❌ Error transforming order at index ${index}:`, err, order);
                  const errorOrderId = order.purchaseOrderId 
                    ? parseInt(String(order.purchaseOrderId).replace(/\D/g, '').slice(-10) || '0', 10) || index + 2000000
                    : index + 2000000;
                  
                  return {
                    id: errorOrderId,
                    orderOnMarketPlace: 'Walmart',
                    jsonb: {
                      'PO#': order.purchaseOrderId || '',
                      'Order#': order.customerOrderId || '',
                      'Error': 'Failed to transform order data',
                    },
                    createdAt: order.orderDate || new Date().toISOString(),
                    updatedAt: order.orderDate || new Date().toISOString(),
                  };
                }
              });

              return {
                success: true,
                orders: transformedOrders,
                pagination: retryData.pagination || {
                  page: options.page || 1,
                  limit: options.limit || 100,
                  totalCount: 0,
                  totalPages: 0,
                  hasNextPage: false,
                  hasPreviousPage: false,
                },
              };
            }
          }
        }
      }

      return {
        success: false,
        orders: [],
        pagination: {
          page: options.page || 1,
          limit: options.limit || 100,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        message: data.message || `Failed to get Walmart orders: ${response.statusText}`,
        error: data.error,
      };
    }

    // Backend already converts XML to JSON, so use it directly
    // Backend returns: { success: true, orders: [...], pagination: {...}, data: {...} }
    const walmartOrders = data.orders || [];
    
    console.log('📦 Backend orders response:', {
      hasOrders: !!data.orders,
      ordersLength: walmartOrders.length,
      isArray: Array.isArray(walmartOrders),
      firstOrder: walmartOrders[0],
      pagination: data.pagination,
    });

    if (!Array.isArray(walmartOrders)) {
      console.error('❌ Orders is not an array:', typeof walmartOrders, walmartOrders);
      return {
        success: false,
        orders: [],
        pagination: data.pagination || {
          page: options.page || 1,
          limit: options.limit || 100,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        message: 'Invalid orders format received from API',
      };
    }

    // Transform Walmart orders to our Order type format
    // Backend already parsed XML to JSON, just need to map to our Order type
    const transformedOrders = walmartOrders.map((order: any, index: number) => {
      try {
        return transformWalmartOrderToOrder(order, index);
      } catch (err) {
        console.error(`❌ Error transforming order at index ${index}:`, err, order);
        // Return a minimal order object if transformation fails
        const errorOrderIdValue = order['ns3:purchaseOrderId'] || order.purchaseOrderId;
        const errorOrderId = errorOrderIdValue 
          ? parseInt(String(errorOrderIdValue).replace(/\D/g, '').slice(-10) || '0', 10) || index + 2000000
          : index + 2000000;
        
        return {
          id: errorOrderId,
          orderOnMarketPlace: 'Walmart',
          jsonb: {
            'PO#': order['ns3:purchaseOrderId'] || order.purchaseOrderId || '',
            'Order#': order['ns3:customerOrderId'] || order.customerOrderId || '',
            'Error': 'Failed to transform order data',
          },
          createdAt: order['ns3:orderDate'] || order.orderDate || new Date().toISOString(),
          updatedAt: order['ns3:orderDate'] || order.orderDate || new Date().toISOString(),
        };
      }
    });

    console.log('✅ Transformed orders:', {
      transformedCount: transformedOrders.length,
      firstTransformed: transformedOrders[0],
    });

    return {
      success: true,
      orders: transformedOrders,
      pagination: data.pagination || {
        page: options.page || 1,
        limit: options.limit || 100,
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  } catch (error) {
    return {
      success: false,
      orders: [],
      pagination: {
        page: options.page || 1,
        limit: options.limit || 100,
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      message: error instanceof Error ? error.message : 'Failed to get Walmart orders',
    };
  }
};


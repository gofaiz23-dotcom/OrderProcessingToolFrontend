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
 * Get Walmart orders from Walmart API
 * This function gets the token from Zustand store and calls the API route
 */
export const getWalmartOrders = async (
  options: GetWalmartOrdersOptions = {}
): Promise<GetWalmartOrdersResponse> => {
  try {
    // Get token from Zustand store
    const token = useWalmartStore.getState().getToken();
    
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
        message: 'Walmart token not available. Please ensure you are authenticated.',
      };
    }

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
    const response = await fetch(`/api/walmart-api/orders?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-walmart-token': token,
      },
    });

    const data = await response.json();

    if (!response.ok) {
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

    return data;
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


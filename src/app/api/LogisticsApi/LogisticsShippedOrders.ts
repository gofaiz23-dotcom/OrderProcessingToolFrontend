import { buildApiUrl } from '../../../../BaseUrl';
import { handleApiError } from '@/app/utils/Errors/ApiError';

export type LogisticsShippedOrder = {
  id: number;
  sku: string;
  orderOnMarketPlace: string;
  status: string;
  uploads: string[];
  ordersJsonb: Record<string, unknown>;
  rateQuotesRequestJsonb?: Record<string, unknown>;
  rateQuotesResponseJsonb?: Record<string, unknown>;
  bolResponseJsonb?: Record<string, unknown>;
  pickupResponseJsonb?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type GetLogisticsShippedOrderResponse = {
  message: string;
  data: LogisticsShippedOrder;
};

export type GetAllLogisticsShippedOrdersResponse = {
  message: string;
  count: number;
  data: LogisticsShippedOrder[];
};

/**
 * Get logistics shipped order by ID
 * Returns null if order is not found (404)
 */
export const getLogisticsShippedOrderById = async (
  id: number,
): Promise<GetLogisticsShippedOrderResponse | null> => {
  const response = await fetch(buildApiUrl(`/Logistics/shipped-orders/${id}`), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  // Handle 404 (not found) gracefully - return null instead of throwing
  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Get all logistics shipped orders
 */
export const getAllLogisticsShippedOrders = async (): Promise<GetAllLogisticsShippedOrdersResponse> => {
  const response = await fetch(buildApiUrl('/Logistics/shipped-orders'), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

export type CreateLogisticsShippedOrderPayload = {
  sku: string;
  orderOnMarketPlace: string;
  ordersJsonb: Record<string, unknown>;
  rateQuotesRequestJsonb?: Record<string, unknown>;
  rateQuotesResponseJsonb?: Record<string, unknown>;
  bolResponseJsonb?: Record<string, unknown>;
  pickupResponseJsonb?: Record<string, unknown>;
  files?: File[];
};

export type CreateLogisticsShippedOrderResponse = {
  message: string;
  data: LogisticsShippedOrder;
};

/**
 * Create logistics shipped order with multipart/form-data
 */
export const createLogisticsShippedOrder = async (
  payload: CreateLogisticsShippedOrderPayload,
): Promise<CreateLogisticsShippedOrderResponse> => {
  const formData = new FormData();
  
  // Add text fields
  formData.append('sku', payload.sku);
  formData.append('orderOnMarketPlace', payload.orderOnMarketPlace);
  formData.append('ordersJsonb', JSON.stringify(payload.ordersJsonb));
  
  if (payload.rateQuotesRequestJsonb) {
    formData.append('rateQuotesRequestJsonb', JSON.stringify(payload.rateQuotesRequestJsonb));
  }
  
  if (payload.rateQuotesResponseJsonb) {
    formData.append('rateQuotesResponseJsonb', JSON.stringify(payload.rateQuotesResponseJsonb));
  }
  
  if (payload.bolResponseJsonb) {
    formData.append('bolResponseJsonb', JSON.stringify(payload.bolResponseJsonb));
  }
  
  if (payload.pickupResponseJsonb) {
    formData.append('pickupResponseJsonb', JSON.stringify(payload.pickupResponseJsonb));
  }
  
  // Add files
  if (payload.files && payload.files.length > 0) {
    payload.files.forEach((file) => {
      formData.append('files', file);
    });
  }

  const response = await fetch(buildApiUrl('/Logistics/shipped-orders'), {
    method: 'POST',
    body: formData,
    // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
    cache: 'no-store',
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};


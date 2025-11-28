import { buildApiUrl } from '../../../../BaseUrl';
import { handleApiError } from '@/app/utils/Errors/ApiError';

export type LogisticsShippedOrder = {
  id: number;
  sku: string;
  orderOnMarketPlace: string;
  status: string;
  uploads: string[];
  ordersJsonb: Record<string, unknown>;
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
 */
export const getLogisticsShippedOrderById = async (
  id: number,
): Promise<GetLogisticsShippedOrderResponse> => {
  const response = await fetch(buildApiUrl(`/Logistics/shipped-orders/${id}`), {
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


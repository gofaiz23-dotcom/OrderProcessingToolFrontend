import { buildApiUrl } from '../../../../BaseUrl';
import { handleApiError } from '@/app/utils/Errors/ApiError';

export type OrdersJsonbItem = {
  id: number;
  ordersJsonb: Record<string, unknown>;
  orderOnMarketPlace: string;
  createdAt: string;
  updatedAt: string;
};

export type GetAllOrdersJsonbResponse = {
  message: string;
  success: boolean;
  orders: OrdersJsonbItem[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type GetOrdersJsonbByIdResponse = {
  message: string;
  data: OrdersJsonbItem;
};

export type UpdateOrdersJsonbPayload = {
  ordersJsonb: Record<string, unknown>;
};

export type UpdateOrdersJsonbResponse = {
  message: string;
  data: OrdersJsonbItem;
};

/**
 * Get all orders JSONB with pagination and filtering
 */
export const getAllOrdersJsonb = async (
  params?: {
    page?: number;
    limit?: number;
    orderOnMarketPlace?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
): Promise<GetAllOrdersJsonbResponse> => {
  const queryParams = new URLSearchParams();
  
  if (params?.page) {
    queryParams.append('page', params.page.toString());
  }
  if (params?.limit) {
    queryParams.append('limit', params.limit.toString());
  }
  if (params?.orderOnMarketPlace && params.orderOnMarketPlace.trim() !== '') {
    queryParams.append('orderOnMarketPlace', params.orderOnMarketPlace.trim());
  }
  if (params?.sortBy) {
    queryParams.append('sortBy', params.sortBy);
  }
  if (params?.sortOrder) {
    queryParams.append('sortOrder', params.sortOrder);
  }

  const url = buildApiUrl(`/Logistics/orders-jsonb${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  
  const response = await fetch(url, {
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
 * Get orders JSONB by ID
 */
export const getOrdersJsonbById = async (id: number): Promise<GetOrdersJsonbByIdResponse> => {
  const response = await fetch(buildApiUrl(`/Logistics/orders-jsonb/${id}`), {
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
 * Update orders JSONB by ID (PUT request)
 */
export const updateOrdersJsonb = async (
  id: number,
  payload: UpdateOrdersJsonbPayload
): Promise<UpdateOrdersJsonbResponse> => {
  const response = await fetch(buildApiUrl(`/Logistics/shipped-orders/${id}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ordersJsonb: payload.ordersJsonb,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};


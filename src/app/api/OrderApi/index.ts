import { buildApiUrl } from '../../../../BaseUrl';
import { handleApiError } from '@/app/utils/Errors/ApiError';
import type {
  Order,
  CreateOrderPayload,
  UpdateOrderPayload,
  CreateOrderResponse,
  CreateMultipleOrdersResponse,
  GetAllOrdersResponse,
  UpdateOrderResponse,
  DeleteOrderResponse,
} from '@/app/types/order';

/**
 * Create a single order
 */
export const createOrder = async (
  payload: CreateOrderPayload,
): Promise<CreateOrderResponse> => {
  const response = await fetch(buildApiUrl('/orders/create'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Create multiple orders
 */
export const createMultipleOrders = async (
  payload: CreateOrderPayload[],
): Promise<CreateMultipleOrdersResponse> => {
  const response = await fetch(buildApiUrl('/orders/create'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Query options for getting all orders
 */
export type GetAllOrdersQueryOptions = {
  page?: number;
  limit?: number;
  orderOnMarketPlace?: string;
  search?: string;
};

/**
 * Get all orders with pagination support
 */
export const getAllOrders = async (
  options: GetAllOrdersQueryOptions = {}
): Promise<GetAllOrdersResponse> => {
  try {
    const { page = 1, limit = 50, orderOnMarketPlace, search } = options;
    
    const endpoint = new URL(buildApiUrl('/orders/all'));
    endpoint.searchParams.set('page', String(page));
    endpoint.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 100))); // Clamp between 1-100
    
    if (orderOnMarketPlace) {
      endpoint.searchParams.set('orderOnMarketPlace', orderOnMarketPlace);
    }
    
    if (search && search.trim()) {
      endpoint.searchParams.set('search', search.trim());
    }
    
    const response = await fetch(endpoint.toString(), {
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
  } catch (error) {
    // Handle network errors (CORS, connection refused, etc.)
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      const url = buildApiUrl('/orders/all');
      throw new Error(
        `Network error: Failed to connect to ${url}. Please check:\n` +
        `1. The server is running and accessible\n` +
        `2. CORS is properly configured on the server\n` +
        `3. Your network connection is working`
      );
    }
    throw error;
  }
};

/**
 * Update an order by ID
 */
export const updateOrder = async (
  id: number,
  payload: UpdateOrderPayload,
): Promise<UpdateOrderResponse> => {
  const response = await fetch(buildApiUrl(`/orders/update/${id}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Delete an order by ID
 */
export const deleteOrder = async (id: number): Promise<DeleteOrderResponse> => {
  const response = await fetch(buildApiUrl(`/orders/delete/${id}`), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};


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
 * Get all orders
 */
export const getAllOrders = async (): Promise<GetAllOrdersResponse> => {
  const response = await fetch(buildApiUrl('/orders/all'), {
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


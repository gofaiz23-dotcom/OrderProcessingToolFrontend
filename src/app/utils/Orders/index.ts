import {
  getAllOrders,
  createOrder,
  createMultipleOrders,
  updateOrder,
  deleteOrder,
  type GetAllOrdersQueryOptions,
} from '@/app/api/OrderApi';
import type { Order, CreateOrderPayload, UpdateOrderPayload, GetAllOrdersResponse, PaginationMeta } from '@/app/types/order';

/**
 * Load orders from the API with pagination support
 */
export const loadOrders = async (
  options: GetAllOrdersQueryOptions = {}
): Promise<{ orders: Order[]; pagination: PaginationMeta }> => {
  const response: GetAllOrdersResponse = await getAllOrders(options);
  
  // Normalize jsonb - Prisma JSON type should already be parsed, but handle string case
  const normalizedOrders = response.orders.map((order) => {
    let normalizedJsonb: Order['jsonb'] = order.jsonb;
    
    // Ensure jsonb is properly parsed if it's a string (shouldn't happen with Prisma, but safe)
    if (typeof order.jsonb === 'string') {
      const parsed = parseJsonSafely(order.jsonb);
      normalizedJsonb = parsed !== null ? parsed as Order['jsonb'] : null;
    }
    
    return {
      ...order,
      jsonb: normalizedJsonb,
    };
  });
  
  return {
    orders: normalizedOrders,
    pagination: response.pagination,
  };
};

/**
 * Create a new order
 */
export const createNewOrder = async (
  payload: CreateOrderPayload,
): Promise<Order> => {
  const response = await createOrder(payload);
  return response.order;
};

/**
 * Create multiple new orders
 */
export const createNewOrders = async (
  payload: CreateOrderPayload[],
): Promise<Order[]> => {
  const response = await createMultipleOrders(payload);
  return response.orders;
};

/**
 * Update an existing order
 */
export const updateExistingOrder = async (
  id: number,
  payload: UpdateOrderPayload,
): Promise<Order> => {
  const response = await updateOrder(id, payload);
  return response.order;
};

/**
 * Delete an existing order
 */
export const deleteExistingOrder = async (id: number): Promise<void> => {
  await deleteOrder(id);
};

/**
 * Format JSONB for display
 */
export const formatJsonb = (jsonb: Order['jsonb']): string => {
  if (jsonb === null || jsonb === undefined) {
    return 'null';
  }
  try {
    return JSON.stringify(jsonb, null, 2);
  } catch {
    return String(jsonb);
  }
};

/**
 * Validate JSON string
 */
export const isValidJson = (jsonString: string): boolean => {
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
};

/**
 * Parse JSON string safely - returns any valid JSON value
 */
export const parseJsonSafely = (
  jsonString: string,
): unknown => {
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
};


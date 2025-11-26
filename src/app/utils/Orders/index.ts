import {
  getAllOrders,
  createOrder,
  createMultipleOrders,
  updateOrder,
  deleteOrder,
} from '@/app/api/OrderApi';
import type { Order, CreateOrderPayload, UpdateOrderPayload } from '@/app/types/order';

/**
 * Load all orders from the API
 */
export const loadOrders = async (): Promise<Order[]> => {
  const response = await getAllOrders();
  
  // Normalize jsonb - Prisma JSON type should already be parsed, but handle string case
  return response.orders.map((order) => ({
    ...order,
    // Ensure jsonb is properly parsed if it's a string (shouldn't happen with Prisma, but safe)
    jsonb:
      typeof order.jsonb === 'string'
        ? parseJsonSafely(order.jsonb) ?? order.jsonb
        : order.jsonb,
  }));
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


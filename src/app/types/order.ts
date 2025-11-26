/**
 * Order type matching the backend Prisma schema
 */
export type Order = {
  id: number;
  orderOnMarketPlace: string;
  jsonb: Record<string, unknown> | unknown[] | string | number | boolean | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

/**
 * Order creation payload (without id)
 */
export type CreateOrderPayload = {
  orderOnMarketPlace: string;
  jsonb: Record<string, unknown> | unknown[] | string | number | boolean | null;
};

/**
 * Order update payload (all fields optional)
 */
export type UpdateOrderPayload = {
  orderOnMarketPlace?: string;
  jsonb?: Record<string, unknown> | unknown[] | string | number | boolean | null;
};

/**
 * Response for creating a single order
 */
export type CreateOrderResponse = {
  message: string;
  order: Order;
};

/**
 * Response for creating multiple orders
 */
export type CreateMultipleOrdersResponse = {
  message: string;
  count: number;
  orders: Order[];
};

/**
 * Response for getting all orders
 */
export type GetAllOrdersResponse = {
  count: number;
  orders: Order[];
};

/**
 * Response for updating an order
 */
export type UpdateOrderResponse = {
  message: string;
  order: Order;
};

/**
 * Response for deleting an order
 */
export type DeleteOrderResponse = {
  message: string;
};


import { buildApiUrl } from '../../../../BaseUrl';

export type ShippedOrder = {
  id: number;
  sku: string;
  orderOnMarketPlace: string;
  status?: string;
  ordersJsonb?: Record<string, unknown>;
  rateQuotesResponseJsonb?: Record<string, unknown>;
  bolResponseJsonb?: Record<string, unknown>;
  pickupResponseJsonb?: Record<string, unknown>;
  uploads?: Array<{
    filename: string;
    path: string;
    mimetype: string;
    size: number;
  }>;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateShippedOrderPayload = {
  sku: string;
  orderOnMarketPlace: string;
  status?: string;
  ordersJsonb?: Record<string, unknown>;
  rateQuotesResponseJsonb?: Record<string, unknown>;
  bolResponseJsonb?: Record<string, unknown>;
  pickupResponseJsonb?: Record<string, unknown>;
  files?: File[];
};

export type UpdateShippedOrderPayload = Partial<CreateShippedOrderPayload>;

// GET - Get all shipped orders
export const getAllShippedOrders = async (): Promise<ShippedOrder[]> => {
  const res = await fetch(buildApiUrl('/Logistics/shipped-orders'), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Failed to fetch shipped orders: ${res.statusText}`);
  }

  const data = await res.json();
  return data.orders || [];
};

// GET - Get shipped order by ID
export const getShippedOrderById = async (id: number): Promise<ShippedOrder> => {
  const res = await fetch(buildApiUrl(`/Logistics/shipped-orders/${id}`), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Failed to fetch shipped order: ${res.statusText}`);
  }

  const data = await res.json();
  return data.data || data.order || data;
};

// POST - Create new shipped order
export const createShippedOrder = async (payload: CreateShippedOrderPayload): Promise<ShippedOrder> => {
  const formData = new FormData();
  
  formData.append('sku', payload.sku);
  formData.append('orderOnMarketPlace', payload.orderOnMarketPlace);
  
  if (payload.status !== undefined) {
    formData.append('status', payload.status);
  }
  
  if (payload.ordersJsonb) {
    formData.append('ordersJsonb', JSON.stringify(payload.ordersJsonb));
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
  
  if (payload.files && payload.files.length > 0) {
    payload.files.forEach((file) => {
      formData.append('files', file);
    });
  }

  const res = await fetch(buildApiUrl('/Logistics/shipped-orders'), {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Failed to create shipped order: ${res.statusText}`);
  }

  const data = await res.json();
  return data.data || data.order || data;
};

// PUT - Update shipped order
export const updateShippedOrder = async (
  id: number,
  payload: UpdateShippedOrderPayload
): Promise<ShippedOrder> => {
  const formData = new FormData();
  
  if (payload.sku !== undefined) {
    formData.append('sku', payload.sku);
  }
  if (payload.orderOnMarketPlace !== undefined) {
    formData.append('orderOnMarketPlace', payload.orderOnMarketPlace);
  }
  if (payload.status !== undefined) {
    formData.append('status', payload.status);
  }
  if (payload.ordersJsonb !== undefined) {
    formData.append('ordersJsonb', JSON.stringify(payload.ordersJsonb));
  }
  if (payload.rateQuotesResponseJsonb !== undefined) {
    formData.append('rateQuotesResponseJsonb', JSON.stringify(payload.rateQuotesResponseJsonb));
  }
  if (payload.bolResponseJsonb !== undefined) {
    formData.append('bolResponseJsonb', JSON.stringify(payload.bolResponseJsonb));
  }
  if (payload.pickupResponseJsonb !== undefined) {
    formData.append('pickupResponseJsonb', JSON.stringify(payload.pickupResponseJsonb));
  }
  
  if (payload.files && payload.files.length > 0) {
    payload.files.forEach((file) => {
      formData.append('files', file);
    });
  }

  const res = await fetch(buildApiUrl(`/Logistics/shipped-orders/${id}`), {
    method: 'PUT',
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Failed to update shipped order: ${res.statusText}`);
  }

  const data = await res.json();
  return data.data || data.order || data;
};

// DELETE - Delete shipped order by ID
export const deleteShippedOrder = async (id: number): Promise<void> => {
  const res = await fetch(buildApiUrl(`/Logistics/shipped-orders/${id}`), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Failed to delete shipped order: ${res.statusText}`);
  }
};

// DELETE - Delete shipped orders by date range
export const deleteShippedOrdersByDateRange = async (
  startDate: string,
  endDate: string
): Promise<{ count: number }> => {
  const res = await fetch(
    buildApiUrl(`/Logistics/shipped-orders?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`),
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Failed to delete shipped orders: ${res.statusText}`);
  }

  const data = await res.json();
  return { count: data.count || 0 };
};


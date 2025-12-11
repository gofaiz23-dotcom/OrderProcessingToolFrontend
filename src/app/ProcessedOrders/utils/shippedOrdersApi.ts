import { buildApiUrl } from '../../../../BaseUrl';
import { parseJsonSafely } from '@/app/utils/Orders';

export type ShippedOrder = {
  id: number;
  sku: string;
  orderOnMarketPlace: string;
  status?: string;
  ordersJsonb?: Record<string, unknown>;
  rateQuotesRequestJsonb?: Record<string, unknown>;
  rateQuotesResponseJsonb?: Record<string, unknown>;
  bolResponseJsonb?: Record<string, unknown>;
  pickupResponseJsonb?: Record<string, unknown>;
  uploads?: Array<{
    filename?: string;
    path: string;
    mimetype?: string;
    size?: number;
  } | string>;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateShippedOrderPayload = {
  sku: string;
  orderOnMarketPlace: string;
  status?: string;
  ordersJsonb?: Record<string, unknown>;
  rateQuotesRequestJsonb?: Record<string, unknown>;
  rateQuotesResponseJsonb?: Record<string, unknown>;
  bolResponseJsonb?: Record<string, unknown>;
  pickupResponseJsonb?: Record<string, unknown>;
  files?: File[];
};

export type UpdateShippedOrderPayload = Partial<CreateShippedOrderPayload>;

export type GetAllShippedOrdersOptions = {
  page?: number;
  limit?: number;
  search?: string;
};

export type GetAllShippedOrdersResponse = {
  orders: ShippedOrder[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

// GET - Get all shipped orders with pagination and search support
export const getAllShippedOrders = async (
  options: GetAllShippedOrdersOptions = {}
): Promise<GetAllShippedOrdersResponse> => {
  const { page = 1, limit = 50, search } = options;
  
  const endpoint = new URL(buildApiUrl('/Logistics/shipped-orders'));
  endpoint.searchParams.set('page', String(page));
  endpoint.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 100))); // Clamp between 1-100
  
  if (search && search.trim()) {
    endpoint.searchParams.set('search', search.trim());
  }

  const res = await fetch(endpoint.toString(), {
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
  
  // Debug: Log raw API response in development
  if (process.env.NODE_ENV === 'development') {
    const sampleOrder = data.orders?.[0] || data.data?.[0] || (Array.isArray(data) ? data[0] : null);
    console.log('getAllShippedOrders - Raw API response:', {
      hasOrders: !!data.orders,
      hasData: !!data.data,
      isArray: Array.isArray(data),
      sampleOrder,
      sampleOrderKeys: sampleOrder ? Object.keys(sampleOrder) : [],
      hasRateQuotesRequestJsonb: sampleOrder ? 'rateQuotesRequestJsonb' in sampleOrder : false,
      rateQuotesRequestJsonbValue: sampleOrder?.rateQuotesRequestJsonb,
      // Check for alternative field names
      allFieldsWithJsonb: sampleOrder ? Object.keys(sampleOrder).filter(k => k.toLowerCase().includes('jsonb') || k.toLowerCase().includes('request')) : [],
    });
  }
  
  // Handle different response structures
  let orders: ShippedOrder[] = [];
  let pagination = null;
  
  // Case 1: Response has data.orders array
  if (data.orders && Array.isArray(data.orders)) {
    orders = data.orders;
    pagination = data.pagination;
  }
  // Case 2: Response has data.data array (nested structure)
  else if (data.data && Array.isArray(data.data)) {
    orders = data.data;
    pagination = data.pagination;
  }
  // Case 3: Response is directly an array
  else if (Array.isArray(data)) {
    orders = data;
  }
  // Case 4: Response has orders property but it's not an array yet
  else if (data.orders) {
    orders = Array.isArray(data.orders) ? data.orders : [data.orders];
    pagination = data.pagination;
  }
  // Case 5: Single order object
  else if (data.id) {
    orders = [data];
  }
  
  // Ensure pagination structure
  if (!pagination && orders.length > 0) {
    pagination = {
      page: 1,
      limit: orders.length,
      totalCount: orders.length,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };
  }
  
  // Normalize JSONB fields - handle both string and object cases
  const normalizedOrders = orders.map((order, index) => {
    // Debug: Log raw order before normalization
    if (process.env.NODE_ENV === 'development' && index === 0) {
      console.log('getAllShippedOrders - Raw order before normalization:', {
        id: order.id,
        hasRateQuotesRequestJsonb: 'rateQuotesRequestJsonb' in order,
        rateQuotesRequestJsonb: order.rateQuotesRequestJsonb,
        rateQuotesRequestJsonbType: typeof order.rateQuotesRequestJsonb,
        allKeys: Object.keys(order),
        // Check for alternative field names that might exist
        hasRateQuotesRequest: 'rateQuotesRequest' in order,
        hasRateQuotesRequestJson: 'rateQuotesRequestJson' in order,
        jsonbFields: Object.keys(order).filter(k => k.toLowerCase().includes('jsonb') || k.toLowerCase().includes('request')),
      });
      
      // If rateQuotesRequestJsonb is missing, warn about potential backend issue
      if (!('rateQuotesRequestJsonb' in order)) {
        console.warn('⚠️ rateQuotesRequestJsonb is missing from API response. Backend may not be returning this field even though it is being saved.');
      }
    }
    
    const normalizeJsonb = (jsonb: unknown): Record<string, unknown> | undefined => {
      // Convert null to undefined (TypeScript optional fields use undefined)
      if (jsonb === null || jsonb === undefined) {
        return undefined;
      }
      
      // If it's already an object (and not null), return it
      if (typeof jsonb === 'object' && !Array.isArray(jsonb)) {
        return jsonb as Record<string, unknown>;
      }
      
      // If it's a string, try to parse it
      if (typeof jsonb === 'string' && jsonb.trim()) {
        const parsed = parseJsonSafely(jsonb);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      }
      
      // If we can't normalize it, return undefined (field doesn't exist)
      return undefined;
    };
    
    const normalized = {
      ...order,
      ordersJsonb: normalizeJsonb(order.ordersJsonb) || order.ordersJsonb,
      // Preserve original value if normalization returns undefined but original exists
      rateQuotesRequestJsonb: normalizeJsonb(order.rateQuotesRequestJsonb) ?? order.rateQuotesRequestJsonb,
      rateQuotesResponseJsonb: normalizeJsonb(order.rateQuotesResponseJsonb) ?? order.rateQuotesResponseJsonb,
      bolResponseJsonb: normalizeJsonb(order.bolResponseJsonb) ?? order.bolResponseJsonb,
      pickupResponseJsonb: normalizeJsonb(order.pickupResponseJsonb) ?? order.pickupResponseJsonb,
    };
    
    // Debug: Log normalized order
    if (process.env.NODE_ENV === 'development' && index === 0) {
      console.log('getAllShippedOrders - Normalized order:', {
        id: normalized.id,
        hasRateQuotesRequestJsonb: 'rateQuotesRequestJsonb' in normalized,
        rateQuotesRequestJsonb: normalized.rateQuotesRequestJsonb,
        rateQuotesRequestJsonbType: typeof normalized.rateQuotesRequestJsonb,
      });
    }
    
    return normalized;
  });
  
  return {
    orders: normalizedOrders,
    pagination: pagination || {
      page: 1,
      limit: 0,
      totalCount: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
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
  if (payload.rateQuotesRequestJsonb !== undefined) {
    formData.append('rateQuotesRequestJsonb', JSON.stringify(payload.rateQuotesRequestJsonb));
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


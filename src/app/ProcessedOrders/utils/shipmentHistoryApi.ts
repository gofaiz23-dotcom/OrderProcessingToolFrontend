import { buildApiUrl } from '../../../../BaseUrl';

export type ShipmentHistoryParams = {
  pro?: number | string | null;
  po?: string | null;
  bol?: string | null;
  pur?: string | null;
  ldn?: string | null;
  exl?: string | null;
  interlinePro?: string | null;
};

export type ShipmentHistoryResponse = {
  message: string;
  shippingCompanyName: string;
  data: {
    data: Array<{
      pro?: string;
      documentReference?: Array<{
        id: string;
        documentType: string;
      }>;
      pickupRequestNumber?: string;
      pickupDate?: string;
      pickupTime?: string;
      isResidential?: boolean;
      isTruckload?: boolean;
      status?: {
        conciseStatus?: string;
        expandedStatus?: string;
        referenceDate?: string;
        referenceTime?: string;
        reasonCode?: string;
        reason?: string;
        isException?: boolean;
      };
      deliveryDate?: string;
      deliveryTime?: string;
      receivedBy?: string;
      transitDays?: string;
      driverInfo?: {
        name?: string;
        geoCoordinates?: string[];
      };
      piecesCount?: string;
      totalWeight?: string;
      cube?: string;
      freightCharges?: string;
      terms?: string;
      consigneeParty?: {
        accountNumber?: string;
        name?: string;
        address?: {
          line?: string[];
          city?: string;
          state?: string;
          postalCode?: string;
          country?: string;
        };
      };
      shipperParty?: {
        accountNumber?: string;
        name?: string;
        address?: {
          line?: string[];
          city?: string;
          state?: string;
          postalCode?: string;
          country?: string;
        };
      };
      thirdParty?: {
        accountNumber?: string;
        name?: string;
        address?: {
          line?: string[];
          city?: string;
          state?: string;
          postalCode?: string;
          country?: string;
        };
      };
      destinationTerminal?: {
        number?: string;
        name?: string;
        address?: {
          line?: string[];
          city?: string;
          state?: string;
          postalCode?: string;
          country?: string;
        };
        geoCoordinates?: string[];
        telephone?: string;
        fax?: string;
        email?: string;
      };
      originTerminal?: {
        number?: string;
        name?: string;
        address?: {
          line?: string[];
          city?: string;
          state?: string;
          postalCode?: string;
          country?: string;
        };
        geoCoordinates?: string[];
        telephone?: string;
        fax?: string;
        email?: string;
      };
      disclaimers?: string[];
      movementHistory?: Array<{
        id?: string;
        description?: string;
        transportEventTypeCode?: string;
        location?: {
          id?: string;
          name?: string;
          code?: string;
          address?: {
            line?: string[];
            city?: string;
            state?: string;
            postalCode?: string;
          };
          geoCoordinates?: string[];
        };
        contact?: {
          telephone?: string;
          fax?: string;
        };
        statusHistory?: Array<{
          conciseStatus?: string;
          expandedStatus?: string;
          referenceDate?: string;
          referenceTime?: string;
          isException?: boolean;
          reasonCode?: string;
          reason?: string;
        }>;
      }>;
    }>;
    error?: {
      code?: number;
      message?: string;
      details?: string;
    };
  };
};

// GET - Get shipment history
export const getShipmentHistory = async (params: ShipmentHistoryParams, token?: string): Promise<ShipmentHistoryResponse> => {
  const queryParams = new URLSearchParams();
  
  if (params.pro !== null && params.pro !== undefined && params.pro !== '') {
    queryParams.append('pro', String(params.pro));
  }
  if (params.po !== null && params.po !== undefined && params.po !== '') {
    queryParams.append('po', params.po);
  }
  if (params.bol !== null && params.bol !== undefined && params.bol !== '') {
    queryParams.append('bol', params.bol);
  }
  if (params.pur !== null && params.pur !== undefined && params.pur !== '') {
    queryParams.append('pur', params.pur);
  }
  if (params.ldn !== null && params.ldn !== undefined && params.ldn !== '') {
    queryParams.append('ldn', params.ldn);
  }
  if (params.exl !== null && params.exl !== undefined && params.exl !== '') {
    queryParams.append('exl', params.exl);
  }
  if (params.interlinePro !== null && params.interlinePro !== undefined && params.interlinePro !== '') {
    queryParams.append('interlinePro', params.interlinePro);
  }

  // For testing: use direct Estes API endpoint
  // TODO: Remove this and use backend endpoint in production
  const useDirectEndpoint = true;
  
  let url: string;
  if (useDirectEndpoint && params.pro) {
    // Use direct Estes API for testing
    url = `https://cloudapi.estes-express.com/v1/shipments/history?pro=${params.pro}`;
  } else {
    // Use backend endpoint
    url = buildApiUrl(`/Logistics/shipment-history?${queryParams.toString()}`);
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add Authorization header if token is provided
  if (token && token.trim() !== '') {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }

  const res = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Failed to fetch shipment history: ${res.statusText}`);
  }

  const data = await res.json();
  
  // If using direct Estes API, transform response to match expected format
  if (useDirectEndpoint && params.pro) {
    // Transform Estes API response to match ShipmentHistoryResponse format
    return {
      message: 'Shipment history retrieved successfully',
      shippingCompanyName: 'Estes',
      data: {
        data: Array.isArray(data) ? data : (data.data || [data]),
        error: data.error,
      },
    };
  }
  
  return data;
};


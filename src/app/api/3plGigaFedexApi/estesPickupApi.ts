import { buildApiUrl } from '../../../../BaseUrl';
import { handleApiError } from '@/app/utils/Errors/ApiError';

/**
 * Estes Pickup Request Data - matches API payload structure from ShippingDB.js
 */
export interface EstesPickupData {
  shippingCompany?: string; // "estes"
  shipper: {
    shipperName: string | null;
    accountCode: string | null;
    shipperAddress: {
      addressInfo: {
        addressLine1: string | null;
        addressLine2: string | null;
        city: string | null;
        stateProvince: string | null;
        postalCode: string | null;
        postalCode4: string | null;
        countryAbbrev: string | null; // "US"
      };
    };
  };
  requestAction: string | null; // "LL", "CREATE"
  paymentTerms: string | null; // "PPD", "PREPAID"
  pickupDate: string | null; // YYYY-MM-DD
  pickupStartTime: string | null; // HHMM format (e.g., "0800")
  pickupEndTime: string | null; // HHMM format (e.g., "1700")
  totalPieces: string | number | null;
  totalWeight: string | number | null;
  totalHandlingUnits: string | number | null;
  hazmatFlag: string | null; // "Y", "N"
  expeditedCode: string | null; // "G"
  whoRequested: string | null; // "S", "THIRD_PARTY"
  addresses: {
    address: Array<{
      addressInfo: {
        addressType: string | null; // "C", "PICKUP", "DOCK"
        addressLine1: string | null;
        addressLine2: string | null;
        city: string | null;
        stateProvince: string | null;
        postalCode: string | null;
        postalCode4: string | null;
        countryAbbrev: string | null; // "US"
      };
    }>;
  };
  contacts: {
    contact: Array<{
      contactInfo: {
        contactType: string | null; // "S", "REQUESTER", "DOCK"
        name: {
          firstName: string | null;
          middleName: string | null;
          lastName: string | null;
        };
        email: string | null;
        phone: {
          areaCode: string | number | null;
          number: string | number | null;
          extension: string | number | null;
        };
        fax: {
          areaCode: number | null;
          number: number | null;
        };
        receiveNotifications: string | null; // "Y", "N"
        notificationMethod: string | null; // "E", "EMAIL"
      };
    }>;
  };
  commodities: {
    commodity: Array<{
      commodityInfo: {
        code: string | null; // "MISC"
        packageCode: string | null; // "BX", "PAT"
        description: string | null;
        pieces: string | number | null;
        weight: string | number | null;
        nmfcNumber: string | null;
        nmfcSubNumber: string | null;
      };
    }>;
  };
  notifications: {
    notification: Array<{
      notificationInfo: {
        type: string | null; // "RCV", "REJECTED", "ACCEPTED", "COMPLETED"
      };
    }>;
  };
}

/**
 * Create Estes Pickup Request Response
 */
export interface CreateEstesPickupResponse {
  success?: boolean;
  message?: string;
  data?: any;
  pickupRequestNumber?: string;
  [key: string]: any; // Allow for additional response fields
}

/**
 * Create Estes Pickup Request
 * Uses Node.js backend at /Logistics/create-pickup-request
 * The backend will merge the payload with the template from ShippingDB.js
 */
export const createEstesPickupRequest = async (
  pickupData: EstesPickupData,
  token: string
): Promise<CreateEstesPickupResponse> => {
  // Remove shippingCompany from pickupData if it exists (it should only be at top level)
  const { shippingCompany: _, ...cleanPickupData } = pickupData;
  
  // The Node.js backend will merge our values with the template from ShippingDB.js
  // and send the final payload to the Estes API
  
  // Ensure shippingCompany is at the top level
  const payload = {
    shippingCompany: 'estes',
    ...cleanPickupData,
  };

  // Log the payload before sending (for debugging)
  console.log('Sending Estes pickup request to Node.js backend:', JSON.stringify(payload, null, 2));
  
  try {
    // Use Node.js backend endpoint - no Python backend needed
    const apiUrl = buildApiUrl('/Logistics/create-pickup-request');
    console.log('Calling Node.js backend at:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorData: any = {};
      let errorText = '';
      
      // Get response as text first
      try {
        errorText = await response.clone().text();
        console.log('Error response text:', errorText);
      } catch (e) {
        console.log('Could not read error response as text:', e);
      }
      
      // Try to parse as JSON
      try {
        if (errorText) {
          errorData = JSON.parse(errorText);
        } else {
          errorData = await response.json();
        }
      } catch (parseError) {
        console.log('Could not parse error response as JSON:', parseError);
        errorData = { 
          message: errorText || response.statusText,
          rawText: errorText 
        };
      }
      
      // Log detailed error for debugging
      console.error('Pickup request error details:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 1000), // Limit text length
        errorData,
        payloadKeys: Object.keys(payload),
        payloadPreview: JSON.stringify(payload, null, 2).substring(0, 2000), // Limit payload preview
      });
      
      // Extract error message from various possible structures
      const errorMessage = 
        errorData.message || 
        errorData.error?.message || 
        errorData.error ||
        errorData.details ||
        (errorText && errorText.length < 500 ? errorText : null) ||
        (typeof errorData === 'string' ? errorData : null) ||
        `Pickup request failed: ${response.statusText} (${response.status})`;
      
      // Create a more informative error
      const fullError = new Error(errorMessage);
      (fullError as any).status = response.status;
      (fullError as any).errorData = errorData;
      (fullError as any).errorText = errorText;
      throw fullError;
    }

    return response.json();
  } catch (error) {
    // Handle network errors (CORS, connection refused, etc.)
    if (error instanceof TypeError && (error.message.includes('fetch') || error.message === 'Failed to fetch')) {
      const url = buildApiUrl('/Logistics/create-pickup-request');
      throw new Error(
        `Network error: Failed to connect to Node.js backend at ${url}. Please check:\n` +
        `1. The Node.js backend server is running on localhost:5000\n` +
        `2. CORS is properly configured on the server\n` +
        `3. Your network connection is working\n` +
        `4. You have a valid authentication token`
      );
    }
    // Re-throw other errors
    throw error;
  }
};

/**
 * Estes Pickup Automation Status Item
 */
export interface EstesPickupStatusItem {
  automation_id: string;
  progress: number;
  status: string;
  message: string;
  errors: string[];
  processing_time?: number;
}

/**
 * Get all Estes Pickup automation statuses
 * Uses Node.js backend - status tracking through automation operations
 */
export interface GetAllEstesPickupStatusResponse {
  total_automation_operations: number;
  total_errors: number;
  automation_operations: EstesPickupStatusItem[];
  note: string;
}

/**
 * Get all Estes Pickup automation statuses from Node.js backend
 */
export const getAllEstesPickupStatus = async (): Promise<GetAllEstesPickupStatusResponse> => {
  try {
    const apiUrl = buildApiUrl('/automation/operations');
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch automation status: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Estes pickup status:', error);
    // Return empty response on error
    return {
      total_automation_operations: 0,
      total_errors: 0,
      automation_operations: [],
      note: 'Status tracking error - check Node.js backend',
    };
  }
};


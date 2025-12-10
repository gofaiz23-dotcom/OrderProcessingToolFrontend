import { buildPythonApiUrl } from '../../../../PythonBaseUrl';
import { handleApiError } from '@/app/utils/Errors/ApiError';

/**
 * Estes Pickup Request Data
 */
export interface EstesPickupData {
  accountInformation: {
    role: string | null; // "Shipper", "Consignee", "Third-Party", "Other"
  };
  requesterDetails: {
    name: string | null;
    email: string | null;
    phone: string | null;
    phoneExt: string | null;
  };
  dockContact: {
    name: string | null;
    email: string | null;
    phone: string | null;
    phoneExt: string | null;
  };
  pickupLocation: {
    companyName: string | null;
    address1: string | null;
    address2: string | null;
    zipCode: string | null;
    country: string | null;
  };
  pickupDetails: {
    pickupDate: string | null;
    pickupStartTime: string | null;
    pickupEndTime: string | null;
    pickupType: string | null; // "LL" or "HL"
  };
  shipments: Array<{
    type: string | null;
    handlingUnits: string | null;
    weight: string | null;
    destinationZip: string | null;
  }>;
  freightCharacteristics: {
    hazmat: boolean | null;
    protectFromFreezing: boolean | null;
    food: boolean | null;
    poison: boolean | null;
    overlength: boolean | null;
    liftgate: boolean | null;
    stackable: boolean | null;
  };
  timeCritical: {
    guaranteed: boolean | null;
  };
  pickupInstructions: string | null;
  pickupNotifications: {
    emailForRJT: boolean | null;
    emailForACC: boolean | null;
    emailForWRK: boolean | null;
    contacts: Array<{
      name: string | null;
      email: string | null;
    }>;
  };
  submitForm: boolean | null;
}

/**
 * Create Estes Pickup Request
 */
export interface CreateEstesPickupRequest {
  pickup_data: EstesPickupData;
  show_browser?: boolean;
  browser_type?: 'chrome' | 'chromium' | 'edge' | 'firefox';
}

export interface CreateEstesPickupResponse {
  automation_id: string;
  status: string;
  message: string;
}

export const createEstesPickupRequest = async (
  pickupData: EstesPickupData,
  showBrowser: boolean = false,
  browserType: 'chrome' | 'chromium' | 'edge' | 'firefox' = 'edge'
): Promise<CreateEstesPickupResponse> => {
  const requestBody: CreateEstesPickupRequest = {
    pickup_data: pickupData,
    show_browser: showBrowser,
    browser_type: browserType,
  };

  const response = await fetch(buildPythonApiUrl('/api/v1/estes-pickup-automation/create-pickup-request'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
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
  show_browser: boolean;
  browser_type: string;
}

/**
 * Get all Estes Pickup automation statuses
 */
export interface GetAllEstesPickupStatusResponse {
  total_automation_operations: number;
  total_errors: number;
  automation_operations: EstesPickupStatusItem[];
  note: string;
}

export const getAllEstesPickupStatus = async (): Promise<GetAllEstesPickupStatusResponse> => {
  const response = await fetch(buildPythonApiUrl('/api/v1/estes-pickup-automation/status'), {
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


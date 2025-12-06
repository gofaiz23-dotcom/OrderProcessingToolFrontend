import { buildApiUrl } from '../../../../BaseUrl';
import { handleApiError } from '@/app/utils/Errors/ApiError';

/**
 * 3PL Giga Fedex Shipping Docs record
 */
export type ThreePlGigaFedexRecord = {
  id: number;
  trackingNo: string;
  fedexJson: Record<string, unknown>;
  uploadArray: string[];
  createdAt: string;
  updatedAt: string;
};

/**
 * Get all 3PL Giga Fedex records response
 */
export type GetAllThreePlGigaFedexResponse = {
  message: string;
  data: ThreePlGigaFedexRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/**
 * Get 3PL Giga Fedex record by ID response
 */
export type GetThreePlGigaFedexByIdResponse = {
  message: string;
  data: ThreePlGigaFedexRecord;
};

/**
 * Delete 3PL Giga Fedex record response
 */
export type DeleteThreePlGigaFedexResponse = {
  message: string;
  data: ThreePlGigaFedexRecord;
};

/**
 * Delete by date range response
 */
export type DeleteThreePlGigaFedexByDateRangeResponse = {
  message: string;
  data: {
    count: number;
    startDate: string;
    endDate: string;
  };
};

/**
 * Query options for getting all records
 */
export type GetAllThreePlGigaFedexQueryOptions = {
  page?: number;
  limit?: number;
  trackingNo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

/**
 * Get all 3PL Giga Fedex records with pagination and filtering
 */
export const getAllThreePlGigaFedex = async (
  options: GetAllThreePlGigaFedexQueryOptions = {}
): Promise<GetAllThreePlGigaFedexResponse> => {
  const { page = 1, limit = 50, trackingNo, sortBy = 'createdAt', sortOrder = 'desc' } = options;

  const endpoint = new URL(buildApiUrl('/Logistics/3pl-giga-fedex'));
  endpoint.searchParams.set('page', String(page));
  endpoint.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 100))); // Clamp between 1-100

  if (trackingNo) {
    endpoint.searchParams.set('trackingNo', trackingNo);
  }

  if (sortBy) {
    endpoint.searchParams.set('sortBy', sortBy);
  }

  if (sortOrder) {
    endpoint.searchParams.set('sortOrder', sortOrder);
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
};

/**
 * Get 3PL Giga Fedex record by ID
 */
export const getThreePlGigaFedexById = async (
  id: number
): Promise<GetThreePlGigaFedexByIdResponse> => {
  const response = await fetch(buildApiUrl(`/Logistics/3pl-giga-fedex/${id}`), {
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
 * Delete 3PL Giga Fedex record by ID
 */
export const deleteThreePlGigaFedex = async (
  id: number
): Promise<DeleteThreePlGigaFedexResponse> => {
  const response = await fetch(buildApiUrl(`/Logistics/3pl-giga-fedex/${id}`), {
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

/**
 * Delete 3PL Giga Fedex records by date range
 */
export const deleteThreePlGigaFedexByDateRange = async (
  startDate: string,
  endDate: string
): Promise<DeleteThreePlGigaFedexByDateRangeResponse> => {
  const endpoint = new URL(buildApiUrl('/Logistics/3pl-giga-fedex'));
  endpoint.searchParams.set('startDate', startDate);
  endpoint.searchParams.set('endDate', endDate);

  const response = await fetch(endpoint.toString(), {
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

/**
 * Update 3PL Giga Fedex record payload
 */
export type UpdateThreePlGigaFedexPayload = {
  trackingNo?: string;
  fedexJson?: Record<string, unknown>;
  files?: File[];
  replaceFiles?: boolean;
  uploadArray?: string[]; // For removing files without adding new ones
};

/**
 * Update 3PL Giga Fedex record response
 */
export type UpdateThreePlGigaFedexResponse = {
  message: string;
  data: ThreePlGigaFedexRecord;
};

/**
 * Update 3PL Giga Fedex record by ID
 */
export const updateThreePlGigaFedex = async (
  id: number,
  payload: UpdateThreePlGigaFedexPayload
): Promise<UpdateThreePlGigaFedexResponse> => {
  const formData = new FormData();
  
  // Add text fields
  if (payload.trackingNo !== undefined) {
    formData.append('trackingNo', payload.trackingNo);
  }
  
  if (payload.fedexJson !== undefined) {
    formData.append('fedexJson', JSON.stringify(payload.fedexJson));
  }
  
  if (payload.replaceFiles !== undefined) {
    formData.append('replaceFiles', String(payload.replaceFiles));
  }

  // If uploadArray is provided (for file removal), send it as JSON
  if (payload.uploadArray !== undefined) {
    formData.append('uploadArray', JSON.stringify(payload.uploadArray));
  }
  
  // Add files
  if (payload.files && payload.files.length > 0) {
    payload.files.forEach((file) => {
      formData.append('files', file);
    });
  }

  const response = await fetch(buildApiUrl(`/Logistics/3pl-giga-fedex/${id}`), {
    method: 'PUT',
    body: formData,
    // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
    cache: 'no-store',
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};
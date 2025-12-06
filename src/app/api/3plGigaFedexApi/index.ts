import { buildPythonApiUrl } from '../../../../PythonBaseUrl';
import { handleApiError } from '@/app/utils/Errors/ApiError';

/**
 * Upload Excel file to Giga Fedex
 */
export interface UploadExcelRequest {
  file: File;
  handle?: boolean; // If true, run in background (headless). If false, show browser window.
}

export interface UploadExcelResponse {
  upload_id: string;
  status: string;
  message: string;
  filename: string;
  imported_count?: number;
  failed_count?: number;
  processing_time?: number;
}

export const uploadExcel = async (
  file: File,
  handle?: boolean
): Promise<UploadExcelResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  // Only append handle if it's explicitly false (show browser)
  // If undefined or true (default/headless), don't send it - backend defaults to true
  if (handle === false) {
    formData.append('handle', 'false');
  }
  // If handle is true or undefined, don't send it (backend will use default true)

  const response = await fetch(buildPythonApiUrl('/api/v1/excel-import/upload'), {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Upload status item
 */
export interface UploadStatusItem {
  upload_id: string;
  filename: string;
  progress: number;
  status: string;
  message: string;
  errors: string[];
  imported_count?: number;
  failed_count?: number;
  processing_time?: number;
}

/**
 * Get all upload statuses
 */
export interface GetAllUploadStatusResponse {
  total_uploads: number;
  uploads: UploadStatusItem[];
  note: string;
}

export const getAllUploadStatus = async (): Promise<GetAllUploadStatusResponse> => {
  const response = await fetch(buildPythonApiUrl('/api/v1/excel-import/importExcel/status'), {
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
 * Scrap-Bol (Parcel Management) API
 */
export interface ScrapBolRequest {
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD (required)
  date_filter_type?: 'both' | 'successfulBuyLabel' | 'creationDate'; // Which date range(s) to use
  handle?: boolean; // If true, run in background (headless). If false, show browser window.
}

export interface ScrapBolResponse {
  scraping_id: string;
  status: string;
  message: string;
  start_date: string;
  end_date?: string;
}

export const startScrapBol = async (
  startDate: string,
  endDate: string,
  dateFilterType: 'both' | 'successfulBuyLabel' | 'creationDate' = 'both',
  handle?: boolean
): Promise<ScrapBolResponse> => {
  const formData = new FormData();
  formData.append('start_date', startDate);
  formData.append('end_date', endDate); // Always required
  formData.append('date_filter_type', dateFilterType); // Which date range(s) to use
  // Only append handle if it's explicitly false (show browser)
  if (handle === false) {
    formData.append('handle', 'false');
  }

  try {
    const response = await fetch(buildPythonApiUrl('/api/v1/parcel-management/scrape'), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  } catch (error) {
    // Handle network errors (CORS, connection refused, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Failed to connect to Python backend. Please check if the server is running on http://localhost:8000');
    }
    // Re-throw other errors
    throw error;
  }
};

/**
 * Scrap-Bol Status item
 */
export interface ScrapBolStatusItem {
  scraping_id: string;
  start_date: string;
  end_date: string;
  progress: number;
  status: string;
  message: string;
  errors: string[];
  scraped_count: number;
  saved_count: number;
  processing_time?: number;
}

/**
 * Get all Scrap-Bol statuses
 */
export interface GetAllScrapBolStatusResponse {
  total_scraping_operations: number;
  total_scraped: number;
  total_saved: number;
  total_errors: number;
  scraping_operations: ScrapBolStatusItem[];
  note: string;
}

export const getAllScrapBolStatus = async (): Promise<GetAllScrapBolStatusResponse> => {
  const response = await fetch(buildPythonApiUrl('/api/v1/parcel-management/status'), {
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

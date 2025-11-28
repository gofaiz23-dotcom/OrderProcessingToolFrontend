const DEFAULT_API_BASE_URL = 'https://orderprocessingtoolbackend.onrender.com/api/v1';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL).replace(
  /\/$/,
  '',
);

// Get backend base URL (without /api/v1)
const getBackendBaseUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
  // Remove /api/v1 if present
  return apiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
};

// Get upload path from environment variable
const getUploadPath = () => {
  return process.env.NEXT_PUBLIC_UPLOAD_PATH || 'FhsOrdersMedia';
};

export const buildApiUrl = (resourcePath = '/') => {
  const normalizedPath = resourcePath.startsWith('/') ? resourcePath : `/${resourcePath}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

// Build file URL: BACKEND_URL/UPLOAD_PATH/filepath
export const buildFileUrl = (filePath: string) => {
  if (!filePath) return '';

  // If filePath already starts with upload path, remove it
  if (cleanFilePath.startsWith(`${uploadPath}/`)) {
    cleanFilePath = cleanFilePath.replace(`${uploadPath}/`, '');
  }
  // If filePath starts with 'uploads/', remove it (for backward compatibility)
  if (cleanFilePath.startsWith('uploads/')) {
    cleanFilePath = cleanFilePath.replace('uploads/', '');
  }

  return `${backendUrl}/${cleanUploadPath}/${cleanFilePath}`;
};

export default API_BASE_URL;




// const DEFAULT_API_BASE_URL = 'https://orderprocessingtoolbackend.onrender.com/api/v1';
const DEFAULT_API_BASE_URL = 'http://localhost:5000/api/v1';

const isDevelopment = process.env.NODE_ENV === 'development';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL).replace(
  /\/$/,
  '',
);

// Get backend base URL (without /api/v1)
export const getBackendBaseUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
  // Remove /api/v1 if present
  const baseUrl = apiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
  // Ensure we return a valid URL (should start with http:// or https://)
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    if (isDevelopment) {
      console.warn('Backend base URL is not absolute:', baseUrl);
    }
  }
  return baseUrl;
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
 
  // If filePath is already a full URL (starts with http:// or https://), return it as-is
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
 
  let backendUrl = getBackendBaseUrl();
  const uploadPath = getUploadPath();
 
  // Fallback to default if backendUrl is invalid
  if (!backendUrl || (!backendUrl.startsWith('http://') && !backendUrl.startsWith('https://'))) {
    if (isDevelopment) {
      console.warn('Invalid backend URL:', backendUrl, 'Using default. File path:', filePath);
    }
    // Use default backend URL as fallback
    backendUrl = DEFAULT_API_BASE_URL.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
    if (!backendUrl || (!backendUrl.startsWith('http://') && !backendUrl.startsWith('https://'))) {
      if (isDevelopment) {
        console.error('Cannot build file URL: invalid backend URL configuration');
      }
      return '';
    }
  }
 
  // Remove leading slash from filePath if present
  let cleanFilePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
 
  // Normalize path separators to forward slashes
  cleanFilePath = cleanFilePath.replace(/\\/g, '/');
 
  // If filePath already starts with upload path, use it directly
  if (cleanFilePath.startsWith(`${uploadPath}/`)) {
    const url = `${backendUrl}/${cleanFilePath}`;
    if (isDevelopment) {
      console.log('Built file URL:', url, 'from path:', filePath);
    }
    return url;
  }
  
  // If filePath starts with 'uploads/', replace with uploadPath
  if (cleanFilePath.startsWith('uploads/')) {
    cleanFilePath = cleanFilePath.replace(/^uploads\//, '');
    const url = `${backendUrl}/${uploadPath}/${cleanFilePath}`;
    if (isDevelopment) {
      console.log('Built file URL:', url, 'from path:', filePath);
    }
    return url;
  }
  
  // Otherwise, prepend upload path
  const cleanUploadPath = uploadPath.replace(/\/$/, '');
  const url = `${backendUrl}/${cleanUploadPath}/${cleanFilePath}`;
  if (isDevelopment) {
    console.log('Built file URL:', url, 'from path:', filePath);
  }
  return url;
};

export default API_BASE_URL;
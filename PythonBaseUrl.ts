const DEFAULT_PYTHON_BASE_URL = 'http://192.168.0.23:8000';

const isDevelopment = process.env.NODE_ENV === 'development';

const PYTHON_BASE_URL = (process.env.NEXT_PUBLIC_PYTHON_BASE_URL || DEFAULT_PYTHON_BASE_URL).replace(
  /\/$/,
  '',
);

/**
 * Build Python API URL
 * @param resourcePath - API endpoint path (e.g., '/api/v1/excel-import/upload')
 * @returns Full URL to Python backend
 */
export const buildPythonApiUrl = (resourcePath = '/') => {
  const normalizedPath = resourcePath.startsWith('/') ? resourcePath : `/${resourcePath}`;
  return `${PYTHON_BASE_URL}${normalizedPath}`;
};

export default PYTHON_BASE_URL;

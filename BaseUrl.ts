const DEFAULT_API_BASE_URL = 'https://orderprocessingtoolbackend.onrender.com/api/v1';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL).replace(
  /\/$/,
  '',
);

export const buildApiUrl = (resourcePath = '/') => {
  const normalizedPath = resourcePath.startsWith('/') ? resourcePath : `/${resourcePath}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export default API_BASE_URL;


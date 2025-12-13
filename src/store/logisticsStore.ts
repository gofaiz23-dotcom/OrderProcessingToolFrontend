import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { buildApiUrl } from '../../BaseUrl';

type LogisticsToken = {
  token: string;
  shippingCompanyName: string;
  timestamp: number;
};

type LogisticsCredentials = {
  username: string;
  password: string;
  carrier: string;
};

type LogisticsStore = {
  // Separate storage for each carrier
  estes: LogisticsToken | null;
  xpo: LogisticsToken | null;
  expo: LogisticsToken | null; // Alias for xpo
  
  // Methods to set tokens
  setToken: (carrier: string, token: string, shippingCompanyName: string) => void;
  
  // Methods to set credentials (stored in sessionStorage only)
  setCredentials: (carrier: string, username: string, password: string) => void;
  
  // Methods to get tokens
  getToken: (carrier: string) => string | null;
  getEstesToken: () => string | null;
  getXPOToken: () => string | null;
  
  // Methods to check if token needs refresh
  isTokenExpired: (carrier: string, maxAgeMinutes?: number) => boolean;
  
  // Method to refresh token automatically
  refreshToken: (carrier: string) => Promise<boolean>;
  
  // Method to auto-login using .env.local credentials
  autoLogin: (carrier: string) => Promise<boolean>;
  
  // Methods to clear tokens
  clearToken: (carrier: string) => void;
  clearEstesToken: () => void;
  clearXPOToken: () => void;
  clearAllTokens: () => void;
  
  // Method to check if session is active (browser not closed)
  isSessionActive: () => boolean;
  
  // Method to mark session as active
  markSessionActive: () => void;
  
  // Method to check if credentials exist for a carrier
  hasCredentials: (carrier: string) => boolean;
};

// Session storage keys
const SESSION_ACTIVE_KEY = 'logistics-session-active';
const CREDENTIALS_KEY_PREFIX = 'logistics-credentials-';

// Helper to get credentials from sessionStorage
const getCredentials = (carrier: string): LogisticsCredentials | null => {
  if (typeof window === 'undefined') return null;
  try {
    const key = `${CREDENTIALS_KEY_PREFIX}${carrier.toLowerCase()}`;
    const stored = sessionStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// Helper to set credentials in sessionStorage
const setCredentialsInSession = (carrier: string, username: string, password: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const key = `${CREDENTIALS_KEY_PREFIX}${carrier.toLowerCase()}`;
    const credentials: LogisticsCredentials = { username, password, carrier: carrier.toLowerCase() };
    sessionStorage.setItem(key, JSON.stringify(credentials));
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to store credentials:', error);
    }
  }
};

// Helper to clear credentials from sessionStorage
const clearCredentialsFromSession = (carrier: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const key = `${CREDENTIALS_KEY_PREFIX}${carrier.toLowerCase()}`;
    sessionStorage.removeItem(key);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to clear credentials:', error);
    }
  }
};

export const useLogisticsStore = create<LogisticsStore>()(
  persist(
    (set, get) => ({
      // Initialize separate storage for each carrier
      estes: null,
      xpo: null,
      expo: null,
      
      setToken: (carrier: string, token: string, shippingCompanyName: string) => {
        const normalizedCarrier = carrier.toLowerCase().trim();
        const tokenData: LogisticsToken = {
          token,
          shippingCompanyName,
          timestamp: Date.now(),
        };
        
        // Store in the appropriate field based on carrier name
        if (normalizedCarrier === 'estes') {
          set({ estes: tokenData });
        } else if (normalizedCarrier === 'xpo' || normalizedCarrier === 'expo') {
          // Store in both xpo and expo for compatibility
          set({ 
            xpo: tokenData,
            expo: tokenData, // Keep expo in sync with xpo
          });
        } else {
          // Fallback: try to store by normalized name (for future carriers)
          console.warn(`Unknown carrier: ${carrier}. Storing as ${normalizedCarrier}`);
        }
      },
      
      setCredentials: (carrier: string, username: string, password: string) => {
        setCredentialsInSession(carrier, username, password);
        // Mark session as active when credentials are set
        get().markSessionActive();
      },
      
      isTokenExpired: (carrier: string, maxAgeMinutes: number = 10) => {
        const normalizedCarrier = carrier.toLowerCase().trim();
        let tokenData: LogisticsToken | null = null;
        
        if (normalizedCarrier === 'estes') {
          tokenData = get().estes;
        } else if (normalizedCarrier === 'xpo' || normalizedCarrier === 'expo') {
          tokenData = get().xpo || get().expo;
        }
        
        if (!tokenData || !tokenData.timestamp) {
          return true; // No token means expired
        }
        
        const ageInMinutes = (Date.now() - tokenData.timestamp) / (1000 * 60);
        return ageInMinutes >= maxAgeMinutes;
      },
      
      refreshToken: async (carrier: string): Promise<boolean> => {
        const normalizedCarrier = carrier.toLowerCase().trim();
        const credentials = getCredentials(normalizedCarrier);
        
        if (!credentials || !credentials.username || !credentials.password) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`No credentials found for ${normalizedCarrier}. Cannot refresh token.`);
          }
          return false;
        }
        
        try {
          const shippingCompany = normalizedCarrier;
          
          // Check if we're in a browser environment (fetch might not be available in SSR)
          if (typeof window === 'undefined' || typeof fetch === 'undefined') {
            if (process.env.NODE_ENV === 'development') {
              console.warn(`Cannot refresh token for ${normalizedCarrier}: fetch not available`);
            }
            return false;
          }
          
          const res = await fetch(buildApiUrl('/Logistics/Authenticate'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              username: credentials.username, 
              password: credentials.password,
              shippingCompany,
            }),
          }).catch((fetchError) => {
            // Handle network errors (Failed to fetch, CORS, etc.)
            if (process.env.NODE_ENV === 'development') {
              console.warn(`Network error refreshing token for ${normalizedCarrier}:`, fetchError.message || 'Failed to fetch');
            }
            throw fetchError;
          });
          
          // Read response body once - can't read it multiple times
          let responseData: any = null;
          let responseText: string | null = null;
          
          try {
            // Try to parse as JSON first
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              responseData = await res.json();
            } else {
              // If not JSON, try to get as text
              responseText = await res.text();
              // Try to parse as JSON if it looks like JSON
              if (responseText && (responseText.trim().startsWith('{') || responseText.trim().startsWith('['))) {
                try {
                  responseData = JSON.parse(responseText);
                } catch {
                  // Keep as text if parsing fails
                }
              }
            }
          } catch (parseError) {
            // If parsing fails, try to get text
            try {
              responseText = await res.text();
            } catch (textError) {
              // If all else fails, we'll use status text
              if (process.env.NODE_ENV === 'development') {
                console.warn(`Could not read response body for ${normalizedCarrier}:`, textError);
              }
            }
          }
          
          if (!res.ok) {
            // Extract error message from response
            let errorMessage = res.statusText || 'Unknown error';
            
            if (responseData) {
              errorMessage = responseData.message || 
                            responseData.error || 
                            responseData.data?.message ||
                            responseData.errorMessage ||
                            (typeof responseData === 'string' ? responseData : JSON.stringify(responseData));
            } else if (responseText) {
              errorMessage = responseText;
            }
            
            if (process.env.NODE_ENV === 'development') {
              // Only log if we have meaningful error information
              const errorInfo: any = {
                status: res.status,
                statusText: res.statusText,
                errorMessage,
              };
              
              // Only include responseData if it exists and has content
              if (responseData && Object.keys(responseData).length > 0) {
                errorInfo.responseData = responseData;
              }
              
              // Only log if we have more than just status codes
              if (errorMessage !== 'Unknown error' || res.status !== 200) {
                console.error(`Token refresh failed for ${normalizedCarrier}:`, errorInfo);
              }
            }
            return false;
          }
          
          // If we got here, response was OK
          const data = responseData;
          
          if (!data) {
            if (process.env.NODE_ENV === 'development') {
              console.error(`No response data received for ${normalizedCarrier}`);
            }
            return false;
          }
          
          // Extract token from response
          const token = data.data?.token || 
                        data.data?.accessToken || 
                        data.data?.access_token || 
                        data.token || 
                        data.accessToken || 
                        data.access_token ||
                        data.data?.access_token;
          
          const shippingCompanyName = data.shippingCompanyName || shippingCompany;
          
          if (!token || typeof token !== 'string' || token.trim() === '') {
            if (process.env.NODE_ENV === 'development') {
              console.error(`No valid token received during refresh for ${normalizedCarrier}`);
            }
            return false;
          }
          
          // Update token in store
          get().setToken(normalizedCarrier, token, shippingCompanyName);
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ Token refreshed successfully for ${normalizedCarrier}`);
          }
          
          return true;
        } catch (error) {
          // Handle all errors gracefully (network errors, parsing errors, etc.)
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Only log network errors in development, silently fail in production
          if (process.env.NODE_ENV === 'development') {
            // Check if it's a network error
            if (errorMessage.includes('Failed to fetch') || 
                errorMessage.includes('NetworkError') ||
                errorMessage.includes('Network request failed')) {
              console.warn(`Network error refreshing token for ${normalizedCarrier}:`, errorMessage);
            } else {
              console.error(`Error refreshing token for ${normalizedCarrier}:`, error);
            }
          }
          
          return false;
        }
      },
      
      autoLogin: async (carrier: string): Promise<boolean> => {
        const normalizedCarrier = carrier.toLowerCase().trim();
        
        // Get credentials from .env.local
        let username: string | undefined;
        let password: string | undefined;
        
        if (normalizedCarrier === 'estes') {
          username = process.env.NEXT_PUBLIC_ESTES_USERNAME;
          password = process.env.NEXT_PUBLIC_ESTES_PASSWORD;
        } else if (normalizedCarrier === 'xpo' || normalizedCarrier === 'expo') {
          username = process.env.NEXT_PUBLIC_XPO_USERNAME;
          password = process.env.NEXT_PUBLIC_XPO_PASSWORD;
        }
        
        // If no credentials in env, try to get from sessionStorage (fallback)
        if (!username || !password) {
          const credentials = getCredentials(normalizedCarrier);
          if (credentials && credentials.username && credentials.password) {
            username = credentials.username;
            password = credentials.password;
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.warn(`No credentials found in .env.local or sessionStorage for ${normalizedCarrier}. Cannot auto-login.`);
            }
            return false;
          }
        }
        
        try {
          const shippingCompany = normalizedCarrier;
          
          // Check if we're in a browser environment
          if (typeof window === 'undefined' || typeof fetch === 'undefined') {
            if (process.env.NODE_ENV === 'development') {
              console.warn(`Cannot auto-login for ${normalizedCarrier}: fetch not available`);
            }
            return false;
          }
          
          const res = await fetch(buildApiUrl('/Logistics/Authenticate'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              username, 
              password,
              shippingCompany,
            }),
          }).catch((fetchError) => {
            if (process.env.NODE_ENV === 'development') {
              console.warn(`Network error auto-logging in for ${normalizedCarrier}:`, fetchError.message || 'Failed to fetch');
            }
            throw fetchError;
          });
          
          let responseData: any = null;
          let responseText: string | null = null;
          
          try {
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              responseData = await res.json();
            } else {
              responseText = await res.text();
              if (responseText && (responseText.trim().startsWith('{') || responseText.trim().startsWith('['))) {
                try {
                  responseData = JSON.parse(responseText);
                } catch {
                  // Keep as text if parsing fails
                }
              }
            }
          } catch (parseError) {
            try {
              responseText = await res.text();
            } catch (textError) {
              if (process.env.NODE_ENV === 'development') {
                console.warn(`Could not read response body for ${normalizedCarrier}:`, textError);
              }
            }
          }
          
          if (!res.ok) {
            let errorMessage = res.statusText || 'Unknown error';
            
            if (responseData) {
              errorMessage = responseData.message || 
                            responseData.error || 
                            responseData.data?.message ||
                            responseData.errorMessage ||
                            (typeof responseData === 'string' ? responseData : JSON.stringify(responseData));
            } else if (responseText) {
              errorMessage = responseText;
            }
            
            if (process.env.NODE_ENV === 'development') {
              console.error(`Auto-login failed for ${normalizedCarrier}:`, {
                status: res.status,
                statusText: res.statusText,
                errorMessage,
              });
            }
            return false;
          }
          
          const data = responseData;
          
          if (!data) {
            if (process.env.NODE_ENV === 'development') {
              console.error(`No response data received for ${normalizedCarrier} during auto-login`);
            }
            return false;
          }
          
          // Extract token from response
          const token = data.data?.token || 
                        data.data?.accessToken || 
                        data.data?.access_token || 
                        data.token || 
                        data.accessToken || 
                        data.access_token ||
                        data.data?.access_token;
          
          const shippingCompanyName = data.shippingCompanyName || shippingCompany;
          
          if (!token || typeof token !== 'string' || token.trim() === '') {
            if (process.env.NODE_ENV === 'development') {
              console.error(`No valid token received during auto-login for ${normalizedCarrier}`);
            }
            return false;
          }
          
          // Store token in Zustand
          get().setToken(normalizedCarrier, token, shippingCompanyName);
          
          // Store credentials in sessionStorage for future refreshes
          get().setCredentials(normalizedCarrier, username, password);
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ Auto-login successful for ${normalizedCarrier}`);
          }
          
          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          if (process.env.NODE_ENV === 'development') {
            if (errorMessage.includes('Failed to fetch') || 
                errorMessage.includes('NetworkError') ||
                errorMessage.includes('Network request failed')) {
              console.warn(`Network error auto-logging in for ${normalizedCarrier}:`, errorMessage);
            } else {
              console.error(`Error auto-logging in for ${normalizedCarrier}:`, error);
            }
          }
          
          return false;
        }
      },
      
      isSessionActive: () => {
        if (typeof window === 'undefined') return false;
        try {
          return sessionStorage.getItem(SESSION_ACTIVE_KEY) === 'true';
        } catch {
          return false;
        }
      },
      
      markSessionActive: () => {
        if (typeof window === 'undefined') return;
        try {
          sessionStorage.setItem(SESSION_ACTIVE_KEY, 'true');
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to mark session as active:', error);
          }
        }
      },
      
      hasCredentials: (carrier: string) => {
        const credentials = getCredentials(carrier.toLowerCase().trim());
        return !!(credentials && credentials.username && credentials.password);
      },
      
      getToken: (carrier: string) => {
        const normalizedCarrier = carrier.toLowerCase().trim();
        
        if (normalizedCarrier === 'estes') {
          return get().estes?.token || null;
        } else if (normalizedCarrier === 'xpo' || normalizedCarrier === 'expo') {
          // Check xpo first, then expo as fallback
          return get().xpo?.token || get().expo?.token || null;
        }
        
        return null;
      },
      
      getEstesToken: () => {
        return get().estes?.token || null;
      },
      
      getXPOToken: () => {
        // Check xpo first, then expo as fallback
        return get().xpo?.token || get().expo?.token || null;
      },
      
      clearToken: (carrier: string) => {
        const normalizedCarrier = carrier.toLowerCase().trim();
        
        if (normalizedCarrier === 'estes') {
          set({ estes: null });
        } else if (normalizedCarrier === 'xpo' || normalizedCarrier === 'expo') {
          set({ xpo: null, expo: null });
        }
        
        // Also clear credentials from sessionStorage
        clearCredentialsFromSession(normalizedCarrier);
      },
      
      clearEstesToken: () => {
        set({ estes: null });
        clearCredentialsFromSession('estes');
      },
      
      clearXPOToken: () => {
        set({ xpo: null, expo: null });
        clearCredentialsFromSession('xpo');
        clearCredentialsFromSession('expo');
      },
      
      clearAllTokens: () => {
        set({ 
          estes: null,
          xpo: null,
          expo: null,
        });
        // Clear all credentials
        if (typeof window !== 'undefined') {
          try {
            Object.keys(sessionStorage).forEach(key => {
              if (key.startsWith(CREDENTIALS_KEY_PREFIX)) {
                sessionStorage.removeItem(key);
              }
            });
            sessionStorage.removeItem(SESSION_ACTIVE_KEY);
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Failed to clear all credentials:', error);
            }
          }
        }
      },
    }),
    {
      name: 'logistics-tokens-storage',
    }
  )
);


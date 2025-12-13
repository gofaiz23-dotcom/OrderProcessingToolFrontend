import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type WalmartToken = {
  token: string;
  tokenType: string;
  expiresIn: number; // in seconds
  timestamp: number; // when token was obtained
};

type WalmartStore = {
  token: WalmartToken | null;
  
  // Methods to set token
  setToken: (token: string, tokenType: string, expiresIn: number) => void;
  
  // Methods to get token
  getToken: () => string | null;
  
  // Methods to check if token needs refresh
  isTokenExpired: (maxAgeSeconds?: number) => boolean;
  
  // Method to refresh token automatically
  refreshToken: () => Promise<boolean>;
  
  // Methods to clear token
  clearToken: () => void;
};

export const useWalmartStore = create<WalmartStore>()(
  persist(
    (set, get) => ({
      token: null,
      
      setToken: (token: string, tokenType: string, expiresIn: number) => {
        const tokenData: WalmartToken = {
          token,
          tokenType,
          expiresIn,
          timestamp: Date.now(),
        };
        
        set({ token: tokenData });
      },
      
      isTokenExpired: (maxAgeSeconds?: number) => {
        const tokenData = get().token;
        
        if (!tokenData || !tokenData.timestamp) {
          return true; // No token means expired
        }
        
        // Use provided maxAgeSeconds or use expiresIn from token (with 60 second buffer)
        const maxAge = maxAgeSeconds ?? (tokenData.expiresIn - 60);
        const ageInSeconds = (Date.now() - tokenData.timestamp) / 1000;
        
        return ageInSeconds >= maxAge;
      },
      
      refreshToken: async (): Promise<boolean> => {
        try {
          // Check if we're in a browser environment
          if (typeof window === 'undefined' || typeof fetch === 'undefined') {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Cannot refresh Walmart token: fetch not available');
            }
            return false;
          }
          
          // Call backend API to get token
          const res = await fetch('/api/walmart-api/auth', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }).catch((fetchError) => {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Network error refreshing Walmart token:', fetchError.message || 'Failed to fetch');
            }
            throw fetchError;
          });
          
          const data = await res.json();
          
          if (!res.ok || !data.success) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Token refresh failed:', {
                status: res.status,
                statusText: res.statusText,
                response: data,
              });
            }
            return false;
          }
          
          // Backend returns: { success: true, data: { accessToken, tokenType, expiresIn } }
          const { accessToken, tokenType, expiresIn } = data.data;
          
          if (!accessToken || typeof accessToken !== 'string' || accessToken.trim() === '') {
            if (process.env.NODE_ENV === 'development') {
              console.error('No valid token received during refresh. Response:', data);
            }
            return false;
          }
          
          // Update token in store
          get().setToken(accessToken, tokenType || 'Bearer', expiresIn || 900);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Walmart token refreshed successfully via backend API');
          }
          
          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          if (process.env.NODE_ENV === 'development') {
            if (errorMessage.includes('Failed to fetch') || 
                errorMessage.includes('NetworkError') ||
                errorMessage.includes('Network request failed')) {
              console.warn('Network error refreshing Walmart token:', errorMessage);
            } else {
              console.error('Error refreshing Walmart token:', error);
            }
          }
          
          return false;
        }
      },
      
      getToken: () => {
        return get().token?.token || null;
      },
      
      clearToken: () => {
        set({ token: null });
      },
    }),
    {
      name: 'walmart-token-storage',
    }
  )
);


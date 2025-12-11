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
          
          // Get credentials from environment variables (must be NEXT_PUBLIC_ prefixed for client-side access)
          const clientId = process.env.NEXT_PUBLIC_WALMART_CLIENT_ID;
          const clientSecret = process.env.NEXT_PUBLIC_WALMART_CLIENT_SECRET;
          
          if (!clientId || !clientSecret) {
            if (process.env.NODE_ENV === 'development') {
              console.error('⚠️ Walmart credentials not configured. Please set NEXT_PUBLIC_WALMART_CLIENT_ID and NEXT_PUBLIC_WALMART_CLIENT_SECRET in .env.local');
            }
            return false;
          }
          
          // Generate unique correlation ID
          const correlationId = `walmart-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          
          // Prepare request body
          const body = new URLSearchParams({
            grant_type: 'client_credentials',
          });
          
          // Call Walmart API directly
          const res = await fetch('https://marketplace.walmartapis.com/v3/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'WM_SVC.NAME': 'Walmart Marketplace',
              'WM_QOS.CORRELATION_ID': correlationId,
              // Basic Authentication
              'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
            },
            body: body.toString(),
          }).catch((fetchError) => {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Network error refreshing Walmart token:', fetchError.message || 'Failed to fetch');
            }
            throw fetchError;
          });
          
          // Read response as text (XML format)
          const responseText = await res.text();
          
          if (!res.ok) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Token refresh failed:', {
                status: res.status,
                statusText: res.statusText,
                response: responseText,
              });
            }
            return false;
          }
          
          // Parse XML response
          const accessTokenMatch = responseText.match(/<accessToken>(.*?)<\/accessToken>/);
          const accessToken = accessTokenMatch ? accessTokenMatch[1] : null;
          
          const tokenTypeMatch = responseText.match(/<tokenType>(.*?)<\/tokenType>/);
          const tokenType = tokenTypeMatch ? tokenTypeMatch[1] : 'Bearer';
          
          const expiresInMatch = responseText.match(/<expiresIn>(.*?)<\/expiresIn>/);
          const expiresIn = expiresInMatch ? parseInt(expiresInMatch[1], 10) : 900;
          
          if (!accessToken || typeof accessToken !== 'string' || accessToken.trim() === '') {
            if (process.env.NODE_ENV === 'development') {
              console.error('No valid token received during refresh. Response:', responseText);
            }
            return false;
          }
          
          // Update token in store
          get().setToken(accessToken, tokenType, expiresIn);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Walmart token refreshed successfully');
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


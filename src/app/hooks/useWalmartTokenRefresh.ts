'use client';

import { useEffect, useRef } from 'react';
import { useWalmartStore } from '@/store/walmartStore';

/**
 * Hook to automatically manage Walmart token:
 * 1. On page load/refresh: Check if token exists in store (from persisted state)
 *    - If token exists: Use it
 *    - If token doesn't exist: Call POST API to fetch new token
 * 2. Then every 10 minutes: Refresh/update the token
 * Skips refresh attempts if credentials are not configured
 */
export const useWalmartTokenRefresh = () => {
  const { refreshToken, getToken } = useWalmartStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const credentialsConfiguredRef = useRef<boolean | null>(null); // null = unknown, true = configured, false = not configured

  useEffect(() => {
    // Function to refresh/fetch token (overrides old token in Zustand store)
    const fetchOrRefreshToken = async (isInitialLoad: boolean = false) => {
      // Skip if we know credentials aren't configured
      if (credentialsConfiguredRef.current === false) {
        return; // Silently skip - credentials not configured
      }
      
      if (isInitialLoad) {
        // On initial load, check if token exists in persisted store
        const existingToken = getToken();
        if (existingToken) {
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Walmart token found in store (from previous session)');
          }
          credentialsConfiguredRef.current = true;
          return; // Token exists, no need to fetch
        } else {
          // No token in store, fetch new one
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 No Walmart token found. Fetching new token...');
          }
        }
      } else {
        // Regular refresh (every 10 minutes)
        if (process.env.NODE_ENV === 'development' && credentialsConfiguredRef.current === true) {
          console.log('🔄 Auto-refreshing Walmart token (every 10 minutes)...');
        }
      }
      
      const success = await refreshToken();
      
      // Check if failure was due to missing credentials
      if (!success) {
        // Check if credentials are configured by checking environment variables
        const clientId = process.env.NEXT_PUBLIC_WALMART_CLIENT_ID;
        const clientSecret = process.env.NEXT_PUBLIC_WALMART_CLIENT_SECRET;
        
        if (!clientId || !clientSecret) {
          credentialsConfiguredRef.current = false;
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ Walmart credentials not configured. Skipping automatic token refresh. Please set NEXT_PUBLIC_WALMART_CLIENT_ID and NEXT_PUBLIC_WALMART_CLIENT_SECRET in .env.local');
          }
          return;
        }
        
        const isConfiguredForLog = credentialsConfiguredRef.current;
        if (process.env.NODE_ENV === 'development' && (isConfiguredForLog === true || isConfiguredForLog === null)) {
          console.warn('Failed to refresh Walmart token');
        }
      } else {
        credentialsConfiguredRef.current = true; // Mark as configured on success
        if (process.env.NODE_ENV === 'development') {
          if (isInitialLoad) {
            console.log('✅ Walmart token fetched and stored successfully');
          } else {
            console.log('✅ Walmart token refreshed and stored in Zustand');
          }
        }
      }
    };

    // On page load/refresh: Check if token exists, if not fetch it
    fetchOrRefreshToken(true);

    // Set up interval to refresh every 10 minutes (600000 ms)
    intervalRef.current = setInterval(() => {
      fetchOrRefreshToken(false);
    }, 10 * 60 * 1000); // 10 minutes

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refreshToken, getToken]);

  // Also check on window focus (user returns to tab)
  useEffect(() => {
    const handleFocus = async () => {
      // Skip if credentials aren't configured
      if (credentialsConfiguredRef.current === false) {
        return;
      }
      
      // Only refresh if token exists or we haven't tried recently
      // This prevents constant refresh attempts if credentials aren't configured
      const token = useWalmartStore.getState().getToken();
      const isConfigured = credentialsConfiguredRef.current;
      if (!token && (isConfigured === true || isConfigured === null)) {
        // Only try once on focus if no token exists
        if (process.env.NODE_ENV === 'development') {
          console.log('No Walmart token found, attempting to refresh on focus...');
        }
      }
      
      // Refresh token when user returns to the tab
      try {
        const success = await refreshToken().catch(() => false);
        if (success) {
          credentialsConfiguredRef.current = true;
        }
      } catch (error) {
        // Catch any synchronous errors
        const isConfiguredForLog = credentialsConfiguredRef.current;
        if (process.env.NODE_ENV === 'development' && (isConfiguredForLog === true || isConfiguredForLog === null)) {
          console.warn('Error checking Walmart token on focus:', error);
        }
      }
    };

    // Only add event listener if window is available (browser environment)
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [refreshToken]);
};


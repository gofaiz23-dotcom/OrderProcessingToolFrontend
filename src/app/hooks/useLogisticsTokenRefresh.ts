'use client';

import { useEffect, useRef } from 'react';
import { useLogisticsStore } from '@/store/logisticsStore';

/**
 * Hook to automatically refresh logistics tokens every 10 minutes
 * Only refreshes if session is active (browser not closed)
 */
export const useLogisticsTokenRefresh = () => {
  const { isTokenExpired, refreshToken, isSessionActive, markSessionActive } = useLogisticsStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const carriers = ['estes', 'xpo'];

  useEffect(() => {
    // Mark session as active when component mounts
    markSessionActive();

    // Function to check and refresh tokens for all carriers
    const checkAndRefreshTokens = async () => {
      // Only refresh if session is active (browser not closed)
      if (!isSessionActive()) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Session not active, skipping token refresh');
        }
        return;
      }

      for (const carrier of carriers) {
        // Check if token exists and is expired (older than 10 minutes)
        if (isTokenExpired(carrier, 10)) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`Token expired for ${carrier}, refreshing...`);
          }
          
          const success = await refreshToken(carrier);
          if (!success && process.env.NODE_ENV === 'development') {
            console.warn(`Failed to refresh token for ${carrier}`);
          }
        }
      }
    };

    // Check immediately on mount
    checkAndRefreshTokens();

    // Set up interval to check every 10 minutes (600000 ms)
    intervalRef.current = setInterval(() => {
      checkAndRefreshTokens();
    }, 10 * 60 * 1000); // 10 minutes

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isTokenExpired, refreshToken, isSessionActive, markSessionActive]);

  // Also check on window focus (user returns to tab)
  useEffect(() => {
    const handleFocus = () => {
      markSessionActive();
      // Check tokens when user returns to the tab
      carriers.forEach(async (carrier) => {
        try {
          if (isTokenExpired(carrier, 10)) {
            await refreshToken(carrier).catch((error) => {
              // Silently handle errors - refreshToken already logs them
              if (process.env.NODE_ENV === 'development') {
                console.warn(`Token refresh failed for ${carrier} on focus:`, error);
              }
            });
          }
        } catch (error) {
          // Catch any synchronous errors
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Error checking token for ${carrier} on focus:`, error);
          }
        }
      });
    };

    // Only add event listener if window is available (browser environment)
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [markSessionActive, isTokenExpired, refreshToken]);
};


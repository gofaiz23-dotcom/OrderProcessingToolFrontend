'use client';

import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useLogisticsStore } from '@/store/logisticsStore';

/**
 * Hook to automatically login and refresh logistics tokens:
 * 1. On page load/refresh: Auto-login using .env.local credentials
 * 2. Every 10 minutes: Auto-login again to refresh tokens
 */
export const useLogisticsTokenRefresh = () => {
  const { 
    isTokenExpired, 
    refreshToken, 
    autoLogin,
    isSessionActive, 
    markSessionActive, 
    hasCredentials,
    getToken 
  } = useLogisticsStore(
    useShallow((state) => ({
      isTokenExpired: state.isTokenExpired,
      refreshToken: state.refreshToken,
      autoLogin: state.autoLogin,
      isSessionActive: state.isSessionActive,
      markSessionActive: state.markSessionActive,
      hasCredentials: state.hasCredentials,
      getToken: state.getToken,
    }))
  );
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const carriers = ['estes', 'xpo'];

  useEffect(() => {
    // Mark session as active when component mounts
    markSessionActive();

    // Function to auto-login for all carriers
    const performAutoLogin = async (isInitialLoad: boolean = false) => {
      for (const carrier of carriers) {
        try {
          // Check if token exists and is still valid (not expired)
          const existingToken = getToken(carrier);
          const isExpired = isTokenExpired(carrier, 10);
          
          // If token exists and is not expired, skip auto-login
          if (existingToken && !isExpired) {
            if (process.env.NODE_ENV === 'development' && isInitialLoad) {
              console.log(`✅ ${carrier.toUpperCase()} token exists and is valid, skipping auto-login`);
            }
            continue;
          }
          
          // Token doesn't exist or is expired, perform auto-login
          if (process.env.NODE_ENV === 'development') {
            if (isInitialLoad) {
              console.log(`🔄 Auto-logging in to ${carrier.toUpperCase()}...`);
            } else {
              console.log(`🔄 Auto-refreshing ${carrier.toUpperCase()} token (every 10 minutes)...`);
            }
          }
          
          const success = await autoLogin(carrier);
          if (success) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`✅ Auto-login successful for ${carrier.toUpperCase()}`);
            }
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.warn(`⚠️ Auto-login failed for ${carrier.toUpperCase()}`);
            }
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error during auto-login for ${carrier}:`, error);
          }
        }
      }
    };

    // Auto-login immediately on mount (page load/refresh)
    performAutoLogin(true);

    // Set up interval to auto-login every 10 minutes (600000 ms)
    intervalRef.current = setInterval(() => {
      performAutoLogin(false);
    }, 10 * 60 * 1000); // 10 minutes

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isTokenExpired, autoLogin, isSessionActive, markSessionActive, hasCredentials, getToken]);

  // Also check on window focus (user returns to tab)
  useEffect(() => {
    const handleFocus = () => {
      markSessionActive();
      // Auto-login when user returns to the tab if tokens are expired
      carriers.forEach(async (carrier) => {
        try {
          const existingToken = getToken(carrier);
          const isExpired = isTokenExpired(carrier, 10);
          
          // Only auto-login if token doesn't exist or is expired
          if (!existingToken || isExpired) {
            await autoLogin(carrier).catch((error) => {
              if (process.env.NODE_ENV === 'development') {
                console.warn(`Auto-login failed for ${carrier} on focus:`, error);
              }
            });
          }
        } catch (error) {
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
  }, [markSessionActive, isTokenExpired, autoLogin, getToken]);
};


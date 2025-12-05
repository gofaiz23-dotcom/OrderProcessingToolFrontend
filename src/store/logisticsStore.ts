import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type LogisticsToken = {
  token: string;
  shippingCompanyName: string;
  timestamp: number;
};

type LogisticsStore = {
  // Separate storage for each carrier
  estes: LogisticsToken | null;
  xpo: LogisticsToken | null;
  expo: LogisticsToken | null; // Alias for xpo
  
  // Methods to set tokens
  setToken: (carrier: string, token: string, shippingCompanyName: string) => void;
  
  // Methods to get tokens
  getToken: (carrier: string) => string | null;
  getEstesToken: () => string | null;
  getXPOToken: () => string | null;
  
  // Methods to clear tokens
  clearToken: (carrier: string) => void;
  clearEstesToken: () => void;
  clearXPOToken: () => void;
  clearAllTokens: () => void;
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
      },
      
      clearEstesToken: () => {
        set({ estes: null });
      },
      
      clearXPOToken: () => {
        set({ xpo: null, expo: null });
      },
      
      clearAllTokens: () => {
        set({ 
          estes: null,
          xpo: null,
          expo: null,
        });
      },
    }),
    {
      name: 'logistics-tokens-storage',
    }
  )
);


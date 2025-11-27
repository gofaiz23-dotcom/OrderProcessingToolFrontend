import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type LogisticsToken = {
  token: string;
  shippingCompanyName: string;
  timestamp: number;
};

type LogisticsStore = {
  tokens: Record<string, LogisticsToken>;
  setToken: (carrier: string, token: string, shippingCompanyName: string) => void;
  getToken: (carrier: string) => string | null;
  clearToken: (carrier: string) => void;
  clearAllTokens: () => void;
};

export const useLogisticsStore = create<LogisticsStore>()(
  persist(
    (set, get) => ({
      tokens: {},
      setToken: (carrier: string, token: string, shippingCompanyName: string) => {
        set((state) => ({
          tokens: {
            ...state.tokens,
            [carrier.toLowerCase()]: {
              token,
              shippingCompanyName,
              timestamp: Date.now(),
            },
          },
        }));
      },
      getToken: (carrier: string) => {
        const tokenData = get().tokens[carrier.toLowerCase()];
        return tokenData?.token || null;
      },
      clearToken: (carrier: string) => {
        set((state) => {
          const newTokens = { ...state.tokens };
          delete newTokens[carrier.toLowerCase()];
          return { tokens: newTokens };
        });
      },
      clearAllTokens: () => {
        set({ tokens: {} });
      },
    }),
    {
      name: 'logistics-tokens-storage',
    }
  )
);


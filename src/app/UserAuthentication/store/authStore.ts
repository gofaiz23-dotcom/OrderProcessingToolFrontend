import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ALLOWED_USERS, type User } from '@/Shared/constant';

type UserWithoutPassword = Omit<User, 'password'>;

type AuthStore = {
  user: UserWithoutPassword | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  checkAuth: () => boolean;
  setHasHydrated: (state: boolean) => void;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      login: (username: string, password: string) => {
        // Trim whitespace from input
        const trimmedUsername = username.trim();
        const trimmedPassword = password.trim();
        
        // Debug logging (remove in production)
        if (ALLOWED_USERS.length === 0) {
          console.error('ALLOWED_USERS is empty. Check NEXT_PUBLIC_ALLOWED_USERS environment variable.');
        }
        
        // Case-insensitive username comparison, case-sensitive password
        const user = ALLOWED_USERS.find(
          (u) => u.username.toLowerCase() === trimmedUsername.toLowerCase() && u.password === trimmedPassword
        );
        
        if (user) {
          // Don't store password in state
          const { password: _, ...userWithoutPassword } = user;
          set({ 
            user: userWithoutPassword, 
            isAuthenticated: true 
          });
          return true;
        }
        
        // Debug: log available usernames if login fails (remove in production)
        if (ALLOWED_USERS.length > 0) {
          console.warn('Login failed. Available usernames:', ALLOWED_USERS.map(u => u.username));
        }
        return false;
      },
      logout: () => {
        set({ user: null, isAuthenticated: false });
      },
      checkAuth: () => {
        return get().isAuthenticated;
      },
      setHasHydrated: (state: boolean) => {
        set({ hasHydrated: state });
      },
    }),
    {
      name: 'auth-storage',
      // Ensure state persists properly and rehydrates on page load
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        // Don't persist hasHydrated - it should always start as false
      }),
      // Mark as hydrated after rehydration completes
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Error rehydrating auth store:', error);
          // Even on error, mark as hydrated so app doesn't hang
          if (state) {
            state.setHasHydrated(true);
          }
        } else if (state) {
          state.setHasHydrated(true);
        }
      },
    }
  )
);


import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ALLOWED_USERS, type User } from '@/Shared/constant';

type UserWithoutPassword = Omit<User, 'password'>;

type AuthStore = {
  user: UserWithoutPassword | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  checkAuth: () => boolean;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
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
    }),
    {
      name: 'auth-storage',
      // Ensure state persists properly and rehydrates on page load
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);


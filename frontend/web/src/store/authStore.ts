import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/login', {
            email,
            password,
          });

          const token: string = data.access_token;
          localStorage.setItem('lumina_token', token);

          // The login response already embeds the full user profile
          set({ user: data.user, token, isLoading: false });
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { detail?: string } } })
            ?.response?.data?.detail ?? 'Login failed. Please try again.';
          set({ error: msg, isLoading: false });
          throw err;
        }
      },

      register: async (email, password, fullName) => {
        set({ isLoading: true, error: null });
        try {
          await api.post('/auth/register', {
            email,
            password,
            full_name: fullName,
          });
          const store = useAuthStore.getState();
          await store.login(email, password);
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { detail?: string } } })
            ?.response?.data?.detail ?? 'Registration failed. Please try again.';
          set({ error: msg, isLoading: false });
          throw err;
        }
      },

      logout: () => {
        localStorage.removeItem('lumina_token');
        set({ user: null, token: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'lumina_auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
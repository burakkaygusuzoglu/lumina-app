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
  forgotPassword: (email: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => void;
  clearError: () => void;
  setUser: (user: AuthUser) => void;
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
          const { data } = await api.post('/auth/login', { email, password });
          const token: string = data.access_token;
          localStorage.setItem('lumina_token', token);
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
          await api.post('/auth/register', { email, password, full_name: fullName });
          const store = useAuthStore.getState();
          await store.login(email, password);
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { detail?: string } } })
            ?.response?.data?.detail ?? 'Registration failed. Please try again.';
          set({ error: msg, isLoading: false });
          throw err;
        }
      },

      forgotPassword: async (email) => {
        set({ isLoading: true, error: null });
        try {
          await api.post('/auth/forgot-password', { email });
        } catch {
          // silently ignore - endpoint always returns 200
        } finally {
          set({ isLoading: false });
        }
      },

      loginWithGoogle: async () => {
        const supabaseUrl = (import.meta as { env: Record<string, string> }).env.VITE_SUPABASE_URL;
        const supabaseKey = (import.meta as { env: Record<string, string> }).env.VITE_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) {
          set({ error: 'Google sign-in is not configured yet.' });
          return;
        }
        const { createClient } = await import('@supabase/supabase-js');
        const sb = createClient(supabaseUrl, supabaseKey);
        const { error } = await sb.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/oauth/callback` },
        });
        if (error) set({ error: error.message });
      },

      loginWithApple: async () => {
        const supabaseUrl = (import.meta as { env: Record<string, string> }).env.VITE_SUPABASE_URL;
        const supabaseKey = (import.meta as { env: Record<string, string> }).env.VITE_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) {
          set({ error: 'Apple sign-in is not configured yet.' });
          return;
        }
        const { createClient } = await import('@supabase/supabase-js');
        const sb = createClient(supabaseUrl, supabaseKey);
        const { error } = await sb.auth.signInWithOAuth({
          provider: 'apple',
          options: { redirectTo: `${window.location.origin}/oauth/callback` },
        });
        if (error) set({ error: error.message });
      },

      logout: () => {
        localStorage.removeItem('lumina_token');
        set({ user: null, token: null });
      },

      clearError: () => set({ error: null }),
      setUser: (user: AuthUser) => set({ user }),
    }),
    {
      name: 'lumina_auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);

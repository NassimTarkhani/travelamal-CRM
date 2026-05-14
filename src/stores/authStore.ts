import { create } from 'zustand';
import { Profile } from '@/types/app.types';
import { authApi, getToken, setToken, removeToken } from '@/lib/api/client';

interface AuthState {
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  setProfile: (profile: Profile | null) => void;
  signOut: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  profile: null,
  loading: true,
  initialized: false,

  setProfile: (profile) => set({ profile }),

  signIn: async (email: string, password: string) => {
    const { token, profile } = await authApi.login(email, password);
    setToken(token);
    set({ profile, loading: false, initialized: true });
  },

  signOut: () => {
    removeToken();
    set({ profile: null, loading: false, initialized: false });
  },

  initialize: async () => {
    if (get().initialized) return;

    const token = getToken();
    if (!token) {
      set({ profile: null, loading: false, initialized: true });
      return;
    }

    try {
      const { profile } = await authApi.me();
      set({ profile, loading: false, initialized: true });
    } catch {
      removeToken();
      set({ profile: null, loading: false, initialized: true });
    }
  },
}));




import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  avatar_shape?: string;
  avatar_foreground_color?: string;
  avatar_background_color?: string;
  is_admin: boolean;
}

interface AuthState {
  user: Profile | null;
  setUser: (user: Profile | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  loading: false,
  setLoading: (loading) => set({ loading }),
}));
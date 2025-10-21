import { StateCreator } from 'zustand';
import { createClient, User } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  role: 'employee' | 'admin';
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  authLoading: boolean;
  authError: string | null;
}

interface AuthActions {
  signUp: (email: string, password: string, fullName: string, role?: 'employee' | 'admin') => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;
}

export interface AuthSlice extends AuthState, AuthActions {}

export const createAuthSlice: StateCreator<AuthSlice> = (set, get, api) => ({
  user: null,
  profile: null,
  authLoading: true,
  authError: null,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setAuthLoading: (authLoading) => set({ authLoading }),
  setAuthError: (authError) => set({ authError }),

  initializeAuth: async () => {
    set({ authLoading: true, authError: null });

    try {
      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) throw error;

      if (session?.user) {
        get().setUser(session.user);

        // Fetch profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) throw profileError;

        get().setProfile(profile);
      } else {
        get().setUser(null);
        get().setProfile(null);
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      set({ authError: errorMessage });
      get().setUser(null);
      get().setProfile(null);
    } finally {
      set({ authLoading: false });
    }
  },

  signUp: async (email, password, fullName, role = 'employee') => {
    set({ authLoading: true, authError: null });

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        get().setUser(data.user);

        // Fetch profile (created by trigger)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) throw profileError;

        get().setProfile(profile);
      }
    } catch (error) {
      console.error('Sign up failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      set({ authError: errorMessage });
      throw error;
    } finally {
      set({ authLoading: false });
    }
  },

  signIn: async (email, password) => {
    set({ authLoading: true, authError: null });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        get().setUser(data.user);

        // Fetch profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) throw profileError;

        get().setProfile(profile);
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      set({ authError: errorMessage });
      throw error;
    } finally {
      set({ authLoading: false });
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      get().setUser(null);
      get().setProfile(null);
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  }
});

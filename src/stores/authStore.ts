import { create } from 'zustand';
import { Profile } from '@/types/app.types';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';

const buildStubProfile = (user: any): Profile => {
  const fallbackName =
    (user.user_metadata?.name as string | undefined) ||
    (user.email ? String(user.email).split('@')[0] : 'Utilisateur');
  const requestedRole = user.user_metadata?.role;
  const safeRole = requestedRole === 'Admin' || requestedRole === 'Employé' ? requestedRole : 'Employé';
  return {
    id: user.id,
    email: user.email || '',
    name: fallbackName,
    role: safeRole,
    avatar_url: null,
    created_at: new Date().toISOString(),
  } as Profile;
};

const fetchOrCreateProfile = async (user: any): Promise<Profile> => {
  const fallbackName =
    (user.user_metadata?.name as string | undefined) ||
    (user.email ? String(user.email).split('@')[0] : 'Utilisateur');
  const requestedRole = user.user_metadata?.role;
  const safeRole = requestedRole === 'Admin' || requestedRole === 'Employé' ? requestedRole : 'Employé';

  // SELECT existing profile
  const { data: existingProfile, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (selectError) {
    console.warn('Profile SELECT blocked (RLS?), using stub:', selectError.message);
    return buildStubProfile(user);
  }

  if (existingProfile) return existingProfile as Profile;

  // INSERT new profile
  const { data: createdProfile, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email,
      name: fallbackName,
      role: safeRole,
    })
    .select('*')
    .single();

  if (insertError) {
    console.warn('Profile INSERT blocked (RLS?), using stub:', insertError.message);
    return buildStubProfile(user);
  }

  return (createdProfile as Profile) ?? buildStubProfile(user);
};

interface AuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: any | null) => void;
  setProfile: (profile: Profile | null) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  signOut: async () => {
    // Optimistic local logout to avoid UI hanging if network signout is slow.
    set({ user: null, profile: null, loading: false, initialized: false });

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  },
  initialize: async () => {
    if (get().initialized) return;

    if (!isSupabaseConfigured) {
      set({ user: null, profile: null, loading: false, initialized: true });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const profile = await fetchOrCreateProfile(session.user);

        set({ user: session.user, profile, loading: false, initialized: true });
      } else {
        set({ user: null, profile: null, loading: false, initialized: true });
      }

      supabase.auth.onAuthStateChange(async (_event, session) => {
        try {
          if (session?.user) {
            const profile = await fetchOrCreateProfile(session.user);
            set({ user: session.user, profile, loading: false });
          } else {
            set({ user: null, profile: null, loading: false });
          }
        } catch (error) {
          console.error('Auth state change handling failed:', error);
          set({ user: null, profile: null, loading: false });
        }
      });
    } catch (error) {
      console.error('Auth initialization failed:', error);
      set({ user: null, profile: null, loading: false, initialized: true });
    }
  },
}));

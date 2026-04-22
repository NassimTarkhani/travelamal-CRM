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

const profileInsertBlockedForUser = new Set<string>();

const fetchOrCreateProfile = async (user: any): Promise<Profile> => {
  const fallbackName =
    (user.user_metadata?.name as string | undefined) ||
    (user.email ? String(user.email).split('@')[0] : 'Utilisateur');
  const requestedRole = user.user_metadata?.role;
  const safeRole = requestedRole === 'Admin' || requestedRole === 'Employé' ? requestedRole : 'Employé';

  // SELECT existing profile. If SELECT is blocked by RLS, attempt INSERT below
  // before falling back to a local stub — this helps avoid requiring a hard
  // refresh when policies are in flux on the Supabase project.
  let selectBlocked = false;
  const { data: existingProfile, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (selectError) {
    console.warn('Profile SELECT blocked (RLS?) — will attempt insert fallback:', selectError.message);
    selectBlocked = true;
  }

  if (existingProfile) return existingProfile as Profile;

  if (profileInsertBlockedForUser.has(user.id)) {
    return buildStubProfile(user);
  }

  // INSERT new profile without doing a server-side SELECT during the same request
  // (select on insert can trigger extra reads that RLS may block and cause hangs).
  const { data: insertData, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email,
      name: fallbackName,
      role: safeRole,
    });

  if (insertError) {
    console.warn('Profile INSERT blocked (RLS?), attempting safe fallback:', insertError.message);
    profileInsertBlockedForUser.add(user.id);

    // Try to read an existing profile; if that is blocked too, return a safe local stub.
    try {
      const { data: existingAfterInsert, error: existingError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingError && existingAfterInsert) return existingAfterInsert as Profile;
    } catch (e) {
      // ignore and fallthrough to stub
    }

    return buildStubProfile(user);
  }

  // INSERT succeeded — do a follow-up SELECT to get the full profile row.
  try {
    const { data: after, error: afterErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (!afterErr && after) return after as Profile;
  } catch (e) {
    // ignore
  }

  return buildStubProfile(user);
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

      supabase.auth.onAuthStateChange(async (event, session) => {
        // INITIAL_SESSION fires immediately when the listener is registered.
        // We already fetched the profile above via getSession() — skip the
        // duplicate query to avoid holding a Supabase connection unnecessarily.
        if (event === 'INITIAL_SESSION') return;

        try {
          if (session?.user) {
            // TOKEN_REFRESHED only rotates the JWT — the profile row doesn't
            // change, so reuse the cached profile instead of hitting the DB again.
            const existingProfile = get().profile;
            const profile =
              event === 'TOKEN_REFRESHED' && existingProfile?.id === session.user.id
                ? existingProfile
                : await fetchOrCreateProfile(session.user);
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

/**
 * AuthContext — Supabase-backed authentication.
 *
 * Login flow:
 *  1. Look up the `profiles` table by `username` to find the mapped email.
 *  2. Sign in with Supabase Auth using that email + the supplied password.
 *  3. Store the profile (role, teamId, displayName, username) in state.
 *
 * The `profiles` table schema (run in Supabase SQL editor):
 *   See the full SQL in the README / migration artifact.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

// ── helpers ────────────────────────────────────────────────────────────────

function mapProfile(profile) {
  if (!profile) return null;
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name || profile.username,
    role: profile.role,
    teamId: profile.team_id || null,
  };
}

// ── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore session on mount
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        await loadProfile(session.user.id, mounted);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes (token refresh, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        if (session?.user) {
          await loadProfile(session.user.id, mounted);
        } else {
          if (mounted) setUser(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch user profile from `profiles` table by Supabase auth UID
  async function loadProfile(uid, mounted = true) {
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (profileError) throw profileError;
      if (mounted) setUser(mapProfile(data));
    } catch (err) {
      console.error('[Auth] loadProfile error:', err.message);
      if (mounted) setUser(null);
    } finally {
      if (mounted) setLoading(false);
    }
  }

  // ── login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (username, password) => {
    setError(null);

    // 1. Look up the email address stored against this username
    const { data: profiles, error: lookupError } = await supabase
      .from('profiles')
      .select('email, role, team_id, display_name, id, username')
      .eq('username', username.trim().toUpperCase())
      .limit(1);

    if (lookupError) {
      const msg = 'Failed to reach authentication service. Please try again.';
      setError(msg);
      throw new Error(msg);
    }

    if (!profiles || profiles.length === 0) {
      const msg = 'Invalid username or password.';
      setError(msg);
      throw new Error(msg);
    }

    const profile = profiles[0];

    // 2. Sign in with Supabase Auth
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: password,
    });

    if (signInError) {
      const msg = signInError.message.includes('Invalid login')
        ? 'Invalid username or password.'
        : signInError.message;
      setError(msg);
      throw new Error(msg);
    }

    // 3. Load the full profile and return the mapped user
    const mapped = mapProfile(profile);
    setUser(mapped);
    return mapped;
  }, []);

  // ── logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  // ── derived values ───────────────────────────────────────────────────────
  const isAuthenticated = !!user;
  const role = user?.role || null;
  const teamId = user?.teamId || null;

  const hasRole = useCallback(
    (roles) => {
      if (!role) return false;
      if (typeof roles === 'string') return role === roles;
      return roles.includes(role);
    },
    [role]
  );

  const value = {
    user,
    loading,
    error,
    isAuthenticated,
    role,
    teamId,
    login,
    logout,
    hasRole,
    setError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

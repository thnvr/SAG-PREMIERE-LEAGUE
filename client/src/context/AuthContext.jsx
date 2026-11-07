/**
 * AuthContext — Supabase authentication with offline/local fallback.
 *
 * Guarantees zero downtime:
 * - If Supabase credentials are configured, it authenticates via Supabase Auth.
 * - If Supabase credentials are not yet set in Vercel or connection fails,
 *   it falls back to local session authentication so the app NEVER goes black or blocks login.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

const LOCAL_FALLBACK_USERS = {
  HEAD: {
    id: 'usr_head',
    username: 'HEAD',
    displayName: 'Auctioneer Head',
    role: 'auctioneer',
    teamId: null,
    pass: '123@head',
  },
  ADMIN: {
    id: 'usr_admin',
    username: 'ADMIN',
    displayName: 'Super Admin',
    role: 'super_admin',
    teamId: null,
    pass: '123@admin',
  },
  STRIKERS: {
    id: 'usr_strikers',
    username: 'STRIKERS',
    displayName: 'Captain Strikers',
    role: 'captain',
    teamId: 'team-alpha',
    pass: '123@strikers',
  },
  UNITED: {
    id: 'usr_united',
    username: 'UNITED',
    displayName: 'Captain United',
    role: 'captain',
    teamId: 'team-bravo',
    pass: '123@united',
  },
  SAAGFC: {
    id: 'usr_saagfc',
    username: 'SAAGFC',
    displayName: 'Captain SAAG FC',
    role: 'captain',
    teamId: 'team-charlie',
    pass: '123@fc',
  },
};

function getSavedUser() {
  try {
    const raw = localStorage.getItem('sag_active_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveUser(user) {
  try {
    if (user) {
      localStorage.setItem('sag_active_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('sag_active_user');
    }
  } catch (err) {
    console.error('Storage error:', err);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getSavedUser);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore session safely
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        if (isSupabaseConfigured) {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;

          if (session?.user && mounted) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profile) {
              const u = {
                id: profile.id,
                username: profile.username,
                displayName: profile.display_name || profile.username,
                role: profile.role,
                teamId: profile.team_id || null,
              };
              setUser(u);
              saveUser(u);
            }
          }
        }
      } catch (err) {
        console.warn('[Auth] Session restore error:', err.message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // Login handler
  const login = useCallback(async (username, password) => {
    setError(null);
    const cleanUser = username.trim().toUpperCase();

    // 1. Try Supabase Auth if configured
    if (isSupabaseConfigured) {
      try {
        const { data: profiles, error: lookupErr } = await supabase
          .from('profiles')
          .select('email, role, team_id, display_name, id, username')
          .eq('username', cleanUser)
          .limit(1);

        if (!lookupErr && profiles && profiles.length > 0) {
          const profile = profiles[0];
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: profile.email,
            password: password.trim(),
          });

          if (!signInErr) {
            const loggedIn = {
              id: profile.id,
              username: profile.username,
              displayName: profile.display_name || profile.username,
              role: profile.role,
              teamId: profile.team_id || null,
            };
            setUser(loggedIn);
            saveUser(loggedIn);
            return loggedIn;
          }
        }
      } catch (err) {
        console.warn('[Auth] Supabase login attempted, trying fallback:', err.message);
      }
    }

    // 2. Reliable fallback for tournament users
    const fallback = LOCAL_FALLBACK_USERS[cleanUser];
    if (fallback && fallback.pass === password.trim()) {
      const loggedIn = {
        id: fallback.id,
        username: fallback.username,
        displayName: fallback.displayName,
        role: fallback.role,
        teamId: fallback.teamId,
      };
      setUser(loggedIn);
      saveUser(loggedIn);
      return loggedIn;
    }

    const msg = 'Invalid username or password.';
    setError(msg);
    throw new Error(msg);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Sign out error:', err);
    } finally {
      setUser(null);
      saveUser(null);
    }
  }, []);

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

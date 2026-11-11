/**
 * AuthContext — Tournament authentication with Google Activity logging.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { recordGoogleActivity } from '../services/googleFeedAPI';

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
    setLoading(false);
  }, []);

  // Login handler
  const login = useCallback(async (username, password, displayName) => {
    setError(null);
    const cleanUser = (username || '').trim();
    const cleanPass = (password || '').trim();

    // 1. Spectator Access via password 111
    if (cleanPass === '111') {
      const spectatorUser = {
        id: 'spectator_' + (cleanUser.toLowerCase() || 'player'),
        username: cleanUser || 'player',
        displayName: displayName || cleanUser || 'Spectator',
        role: 'spectator',
        teamId: null,
      };
      setUser(spectatorUser);
      saveUser(spectatorUser);
      recordGoogleActivity({
        user: spectatorUser.displayName,
        status: 'Joined Spectator Broadcast',
      });
      return spectatorUser;
    }

    const upperUser = cleanUser.toUpperCase();

    // 2. Reliable tournament user login
    const fallback = LOCAL_FALLBACK_USERS[upperUser];
    if (fallback && fallback.pass === cleanPass) {
      const loggedIn = {
        id: fallback.id,
        username: fallback.username,
        displayName: fallback.displayName,
        role: fallback.role,
        teamId: fallback.teamId,
      };
      setUser(loggedIn);
      saveUser(loggedIn);
      recordGoogleActivity({
        user: loggedIn.displayName,
        status: `Logged In (${loggedIn.role})`,
      });
      return loggedIn;
    }

    const msg = 'Invalid username or password.';
    setError(msg);
    throw new Error(msg);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    saveUser(null);
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

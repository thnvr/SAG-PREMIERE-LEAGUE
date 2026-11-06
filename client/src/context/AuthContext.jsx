import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, setToken, getStoredUser, setStoredUser } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem('sag_token');
    if (token) {
      authAPI.me()
        .then((data) => {
          const userData = data.user || data;
          setUser(userData);
          setStoredUser(userData);
          connectSocket(token);
        })
        .catch(() => {
          setToken(null);
          setStoredUser(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username, password, displayName) => {
    setError(null);
    try {
      const data = await authAPI.login({ username, password, displayName });
      const token = data.token;
      const userData = data.user;
      setToken(token);
      setStoredUser(userData);
      setUser(userData);
      connectSocket(token);
      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setStoredUser(null);
    setUser(null);
    disconnectSocket();
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

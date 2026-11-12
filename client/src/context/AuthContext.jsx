/**
 * AuthContext — Tournament authentication with Google Activity logging.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { recordGoogleActivity } from '../services/googleFeedAPI';
import { getLocalTeams, DEFAULT_TEAMS } from '../services/sheetsService';

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

  // Login handler with Dynamic Team Captain & Auctioneer Authentication
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
        team_id: null,
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

    // 2. Auctioneer Head Login
    if (upperUser === 'HEAD' || upperUser === 'AUCTIONEER') {
      if (cleanPass === '123@head' || cleanPass === '123@admin' || cleanPass === '1234') {
        const loggedIn = {
          id: 'usr_head',
          username: 'HEAD',
          displayName: 'Auctioneer Head',
          role: 'auctioneer',
          teamId: null,
          team_id: null,
        };
        setUser(loggedIn);
        saveUser(loggedIn);
        recordGoogleActivity({
          user: loggedIn.displayName,
          status: 'Logged In as Auctioneer Master',
        });
        return loggedIn;
      }
    }

    // 3. Super Admin Login
    if (upperUser === 'ADMIN' || upperUser === 'SUPERADMIN') {
      if (cleanPass === '123@admin' || cleanPass === '1234') {
        const loggedIn = {
          id: 'usr_admin',
          username: 'ADMIN',
          displayName: 'Super Admin',
          role: 'super_admin',
          teamId: null,
          team_id: null,
        };
        setUser(loggedIn);
        saveUser(loggedIn);
        recordGoogleActivity({
          user: loggedIn.displayName,
          status: 'Logged In as Super Admin',
        });
        return loggedIn;
      }
    }

    // 4. Dynamic Team Captain Authentication (Matches any team in league)
    let allTeams = [];
    try {
      allTeams = [...getLocalTeams(), ...DEFAULT_TEAMS];
    } catch {
      allTeams = DEFAULT_TEAMS;
    }

    const matchedTeam = allTeams.find((t) => {
      if (!t) return false;
      const tId = String(t.id || '').toUpperCase();
      const tShort = String(t.short_name || t.shortName || '').toUpperCase();
      const tName = String(t.name || '').toUpperCase();
      const tNameClean = tName.replace(/\s+/g, '');
      const userClean = upperUser.replace(/\s+/g, '');
      const tCapt = String(t.captain_name || '').toUpperCase();

      return (
        tId === upperUser ||
        tShort === upperUser ||
        tName === upperUser ||
        tNameClean === userClean ||
        (tCapt && tCapt === upperUser)
      );
    });

    if (matchedTeam) {
      const shortLower = (matchedTeam.short_name || '').toLowerCase();
      const validPasswords = [
        `123@${shortLower}`,
        `123@${shortLower.toUpperCase()}`,
        `123@${(matchedTeam.name || '').toLowerCase().replace(/\s+/g, '')}`,
        `123@${matchedTeam.id.toLowerCase()}`,
        '123@team',
        '1234',
        '111',
        '123@strikers',
        '123@united',
        '123@fc',
        '123@mlk',
        matchedTeam.password,
        matchedTeam.pass
      ].filter(Boolean);

      if (validPasswords.includes(cleanPass) || cleanPass.startsWith('123@')) {
        const loggedIn = {
          id: `usr_${matchedTeam.id}`,
          username: matchedTeam.short_name || matchedTeam.name,
          displayName: matchedTeam.captain_name
            ? `Captain ${matchedTeam.captain_name} (${matchedTeam.short_name})`
            : `Captain ${matchedTeam.name}`,
          role: 'captain',
          teamId: matchedTeam.id,
          team_id: matchedTeam.id,
          team: matchedTeam,
        };
        setUser(loggedIn);
        saveUser(loggedIn);
        recordGoogleActivity({
          user: loggedIn.displayName,
          status: `Logged In as Captain of ${matchedTeam.name}`,
        });
        return loggedIn;
      }
    }

    // 5. Fallback users check
    const fallback = LOCAL_FALLBACK_USERS[upperUser];
    if (fallback && (fallback.pass === cleanPass || cleanPass === '1234')) {
      const loggedIn = {
        id: fallback.id,
        username: fallback.username,
        displayName: fallback.displayName,
        role: fallback.role,
        teamId: fallback.teamId,
        team_id: fallback.teamId,
      };
      setUser(loggedIn);
      saveUser(loggedIn);
      recordGoogleActivity({
        user: loggedIn.displayName,
        status: `Logged In (${loggedIn.role})`,
      });
      return loggedIn;
    }

    const msg = 'Invalid credentials. For Captain login, use Team Name/Short Name and password 123@<short_name> or 123@team.';
    setError(msg);
    throw new Error(msg);
  }, []);

  const quickLoginTeam = useCallback(async (targetTeam) => {
    let t = targetTeam;
    if (typeof t === 'string') {
      const allTeams = [...getLocalTeams(), ...DEFAULT_TEAMS];
      t = allTeams.find(x => x.id === targetTeam || x.short_name === targetTeam) || { id: targetTeam, name: targetTeam };
    }
    const loggedIn = {
      id: `usr_${t.id}`,
      username: t.short_name || t.name,
      displayName: t.captain_name ? `Captain ${t.captain_name} (${t.short_name})` : `Captain ${t.name}`,
      role: 'captain',
      teamId: t.id,
      team_id: t.id,
      team: t,
    };
    setUser(loggedIn);
    saveUser(loggedIn);
    recordGoogleActivity({
      user: loggedIn.displayName,
      status: `Quick-Connected as Captain of ${t.name}`,
    });
    return loggedIn;
  }, []);

  const quickLoginAuctioneer = useCallback(async () => {
    const loggedIn = {
      id: 'usr_head',
      username: 'HEAD',
      displayName: 'Auctioneer Head',
      role: 'auctioneer',
      teamId: null,
      team_id: null,
    };
    setUser(loggedIn);
    saveUser(loggedIn);
    return loggedIn;
  }, []);

  const quickLoginAdmin = useCallback(async () => {
    const loggedIn = {
      id: 'usr_admin',
      username: 'ADMIN',
      displayName: 'Super Admin',
      role: 'super_admin',
      teamId: null,
      team_id: null,
    };
    setUser(loggedIn);
    saveUser(loggedIn);
    return loggedIn;
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
    quickLoginTeam,
    quickLoginAuctioneer,
    quickLoginAdmin,
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

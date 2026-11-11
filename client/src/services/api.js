/**
 * api.js — Central data-access layer backed by Google Sheets and local offline storage.
 */
import { DEFAULT_PLAYERS } from '../data/defaultPlayers';
import {
  DEFAULT_TEAMS,
  formatMoney,
  fetchFullAuctionState,
  callSheetsAPI,
  SHEETS_API_URL
} from './sheetsService';

export { formatMoney, DEFAULT_TEAMS, SHEETS_API_URL };

export function getToken() {
  return localStorage.getItem('sag_token');
}
export function setToken(token) {
  if (token) localStorage.setItem('sag_token', token);
  else localStorage.removeItem('sag_token');
}
export function getStoredUser() {
  try {
    const user = localStorage.getItem('sag_active_user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}
export function setStoredUser(user) {
  if (user) localStorage.setItem('sag_active_user', JSON.stringify(user));
  else localStorage.removeItem('sag_active_user');
}

// ── Local Storage Helpers ──────────────────────────────────────────────────
function getLocalPlayers() {
  try {
    const raw = localStorage.getItem('sag_players_data');
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_PLAYERS;
}

function saveLocalPlayers(players) {
  try {
    localStorage.setItem('sag_players_data', JSON.stringify(players));
  } catch {}
}

function getLocalTeams() {
  try {
    const raw = localStorage.getItem('sag_teams_data');
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_TEAMS;
}

function saveLocalTeams(teams) {
  try {
    localStorage.setItem('sag_teams_data', JSON.stringify(teams));
  } catch {}
}

// ── Players API ────────────────────────────────────────────────────────────
export const playersAPI = {
  getAll: async (filter = {}) => {
    let list = getLocalPlayers();
    if (filter.status && filter.status !== 'ALL') {
      const s = String(filter.status).toLowerCase();
      list = list.filter((p) => {
        const pStatus = String(p.status || '').toLowerCase();
        const pAuc = String(p.auction_status || '').toLowerCase();
        return pStatus === s || pAuc === s;
      });
    }
    return list;
  },

  getById: async (id) => {
    const list = getLocalPlayers();
    return list.find((p) => p.id === id) || null;
  },

  update: async (id, updates) => {
    const list = getLocalPlayers();
    const idx = list.findIndex((p) => p.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      saveLocalPlayers(list);
      return list[idx];
    }
    return null;
  },

  create: async (playerData) => {
    const list = getLocalPlayers();
    const newPlayer = {
      id: playerData.id || 'p_' + Date.now(),
      ...playerData,
    };
    list.unshift(newPlayer);
    saveLocalPlayers(list);
    return newPlayer;
  },

  delete: async (id) => {
    const list = getLocalPlayers();
    const updated = list.filter((p) => p.id !== id);
    saveLocalPlayers(updated);
    return true;
  },
};

// ── Teams API ──────────────────────────────────────────────────────────────
export const teamsAPI = {
  getAll: async () => {
    return getLocalTeams();
  },

  getById: async (id) => {
    const list = getLocalTeams();
    return list.find((t) => t.id === id) || null;
  },

  update: async (id, updates) => {
    const list = getLocalTeams();
    const idx = list.findIndex((t) => t.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      saveLocalTeams(list);
      return list[idx];
    }
    return null;
  },
};

// ── Auction API ────────────────────────────────────────────────────────────
export const auctionAPI = {
  getCurrentState: async () => {
    const data = await fetchFullAuctionState();
    return {
      id: 1,
      status: data.liveState?.status || 'idle',
      bidding_status: data.liveState?.status || 'idle',
      current_player_id: data.liveState?.playerId || null,
      current_bid: data.liveState?.currentBid || 0,
      current_highest_bid: data.liveState?.currentBid || 0,
      leading_team_id: data.liveState?.leadingTeamId || null,
      bid_increment: 5000,
    };
  },

  upsertSession: async (sessionData) => {
    return sessionData;
  },

  placeBid: async (playerId, teamId, amount) => {
    return callSheetsAPI({ action: 'placeBid', teamId, bidAmount: amount });
  },

  nominate: async (playerId, basePrice) => {
    const player = await playersAPI.getById(playerId);
    return callSheetsAPI({ action: 'pushPlayer', player });
  },
};

// ── Spectator API ──────────────────────────────────────────────────────────
export const spectatorAPI = {
  getComments: async () => {
    try {
      const raw = localStorage.getItem('sag_spectator_comments');
      return { comments: raw ? JSON.parse(raw) : [] };
    } catch {
      return { comments: [] };
    }
  },

  postComment: async ({ text, reaction = '🔥', user = 'Spectator' }) => {
    const newComment = {
      id: 'cmt_' + Date.now(),
      user,
      text,
      reaction,
      time: new Date().toISOString(),
    };
    try {
      const { comments } = await spectatorAPI.getComments();
      const updated = [...comments, newComment].slice(-50);
      localStorage.setItem('sag_spectator_comments', JSON.stringify(updated));
    } catch {}
    return { comment: newComment };
  },
};

// ── Admin & Reports API ───────────────────────────────────────────────────
export const adminAPI = {
  resetAuction: async () => {
    return callSheetsAPI({ action: 'markUnsold' });
  },
};

export const reportsAPI = {
  getSummary: async () => ({
    totalSpent: 0,
    playersSold: 0,
    availablePlayers: DEFAULT_PLAYERS.length,
  }),
};

export const auditAPI = {
  getLogs: async () => [],
};

export const awardsAPI = {
  getAll: async () => [],
};

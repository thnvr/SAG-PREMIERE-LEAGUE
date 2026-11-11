/**
 * sheetsService.js — Google Sheets Real-Time Backend Service for SAG Premier League.
 * Central data layer powering AuctionContext, Live Auction, Captains, and Spectators.
 */
import { DEFAULT_PLAYERS } from '../data/defaultPlayers';

export const SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbwArNDQQMX7G0Kze_Evr3NHCKlIAKla0LyLGY5TuaFG63neI8WLqYd20OVebs1ttj8R/exec";

export const DEFAULT_TEAMS = [
  {
    id: 'team-alpha',
    name: 'SAAG STRIKERS',
    short_name: 'STRIKERS',
    primary_color: '#ff6b35',
    remaining_purse: 200000000,
    initial_purse: 200000000,
    max_squad_size: 15,
  },
  {
    id: 'team-bravo',
    name: 'SAAG UNITED',
    short_name: 'UNITED',
    primary_color: '#4ecdc4',
    remaining_purse: 200000000,
    initial_purse: 200000000,
    max_squad_size: 15,
  },
  {
    id: 'team-charlie',
    name: 'SAAG FC',
    short_name: 'SAAGFC',
    primary_color: '#45b7d1',
    remaining_purse: 200000000,
    initial_purse: 200000000,
    max_squad_size: 15,
  },
];

export function formatMoney(paise) {
  if (paise == null || isNaN(paise)) return '₹0';
  return '₹' + Math.round(paise / 100).toLocaleString('en-IN');
}

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

const STORAGE_KEY_STATE = 'sag_sheets_live_state';
const STORAGE_KEY_PLAYERS = 'sag_sheets_players';
const STORAGE_KEY_TEAMS = 'sag_sheets_teams';

function getLocalPlayers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLAYERS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_PLAYERS;
}

function saveLocalPlayers(players) {
  try {
    localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(players));
  } catch {}
}

function getLocalTeams() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEAMS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_TEAMS;
}

function saveLocalTeams(teams) {
  try {
    localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(teams));
  } catch {}
}

/**
 * Fetches complete auction state, players, and teams from Google Sheets
 */
export async function fetchFullAuctionState() {
  try {
    const res = await fetch(`${SHEETS_API_URL}?action=getFullState`);
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      if (data && !data.error) {
        if (data.liveState) localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(data.liveState));
        if (data.players) localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(data.players));
        if (data.teams) localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(data.teams));
        return data;
      }
    } catch {}
  } catch (err) {
    console.warn('[SheetsService] fetchFullAuctionState network error:', err.message);
  }

  // Graceful local cache fallback
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATE);
    const live = raw ? JSON.parse(raw) : null;
    return {
      liveState: live || {
        playerId: '',
        playerName: '',
        currentBid: 0,
        highestBidder: 'No Bids Yet',
        leadingTeamId: '',
        status: 'idle',
      },
      players: getLocalPlayers(),
      teams: getLocalTeams(),
    };
  } catch {
    return {
      liveState: {
        playerId: '',
        playerName: '',
        currentBid: 0,
        highestBidder: 'No Bids Yet',
        leadingTeamId: '',
        status: 'idle',
      },
      players: DEFAULT_PLAYERS,
      teams: DEFAULT_TEAMS,
    };
  }
}

/**
 * Dispatches an action (placeBid, pushPlayer, markSold, markUnsold) to Google Sheets
 */
export async function callSheetsAPI(payload) {
  try {
    if (payload.action === 'pushPlayer' && payload.player) {
      const live = {
        playerId: payload.player.id || '',
        playerName: payload.player.name || '',
        currentBid: payload.player.base_price || payload.player.basePrice || 50000,
        highestBidder: 'No Bids Yet',
        leadingTeamId: '',
        status: 'active',
        player: payload.player,
      };
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(live));
    } else if (payload.action === 'placeBid') {
      const raw = localStorage.getItem(STORAGE_KEY_STATE);
      const current = raw ? JSON.parse(raw) : {};
      const updated = {
        ...current,
        currentBid: payload.bidAmount,
        highestBidder: payload.teamName || 'Leading Team',
        leadingTeamId: payload.teamId,
        status: 'active',
      };
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(updated));
    } else if (payload.action === 'markSold') {
      const raw = localStorage.getItem(STORAGE_KEY_STATE);
      const current = raw ? JSON.parse(raw) : {};
      const updated = {
        ...current,
        status: 'sold',
        winningTeamId: payload.winningTeamId,
        finalAmount: payload.finalAmount,
      };
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(updated));
    } else if (payload.action === 'markUnsold') {
      const raw = localStorage.getItem(STORAGE_KEY_STATE);
      const current = raw ? JSON.parse(raw) : {};
      const updated = {
        ...current,
        status: 'unsold',
      };
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(updated));
    }
  } catch {}

  try {
    await fetch(SHEETS_API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });
    return { success: true };
  } catch (err) {
    console.error('[SheetsService] callSheetsAPI error:', err);
    return { error: err.message };
  }
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

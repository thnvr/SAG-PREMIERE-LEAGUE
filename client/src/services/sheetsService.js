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

export function normalizeTeam(t) {
  if (!t) return t;
  const purse = t.remaining_purse != null ? Number(t.remaining_purse) : (t.remainingPurse != null ? Number(t.remainingPurse) : 200000000);
  const total = t.total_purse != null ? Number(t.total_purse) : (t.totalPurse != null ? Number(t.totalPurse) : 200000000);
  const color = t.color || t.primary_color || '#ffd000';
  return {
    ...t,
    id: t.id,
    name: t.name || 'Team',
    short_name: t.short_name || t.shortName || t.name || 'TEAM',
    primary_color: color,
    color: color,
    remaining_purse: purse,
    remainingPurse: purse,
    availableBiddingPurse: purse,
    total_purse: total,
    totalPurse: total,
    initial_purse: total,
    max_squad_size: t.max_squad || t.max_squad_size || 15,
    squad: t.squad || [],
  };
}

export function normalizePlayer(p) {
  if (!p) return p;
  const match = DEFAULT_PLAYERS.find((x) => x.id === p.id || x.name?.trim().toLowerCase() === p.name?.trim().toLowerCase()) || {};
  return {
    ...match,
    ...p,
    id: p.id || match.id || 'p_' + Date.now(),
    name: p.name || match.name || 'Player',
    primary_position: p.primary_position || p.position || match.primary_position || 'ST',
    position: p.position || p.primary_position || match.position || 'ST',
    base_price: Number(p.base_price || p.basePrice || match.base_price || 50000),
    status: (p.status || match.status || 'available').toLowerCase(),
    auction_status: (p.auction_status || match.auction_status || (p.status === 'AVAILABLE' ? 'upcoming' : 'available')).toLowerCase(),
    photo_url: p.photo_url || match.photo_url || '',
  };
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
        const normLive = data.liveState ? {
          ...data.liveState,
          currentBid: Number(data.liveState.currentBid || 0),
          status: data.liveState.status || 'idle',
        } : null;

        const normPlayers = Array.isArray(data.players) && data.players.length > 0
          ? data.players.map(normalizePlayer)
          : getLocalPlayers().map(normalizePlayer);

        const normTeams = Array.isArray(data.teams) && data.teams.length > 0
          ? data.teams.map(normalizeTeam)
          : getLocalTeams().map(normalizeTeam);

        if (normLive) localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(normLive));
        localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(normPlayers));
        localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(normTeams));

        return {
          liveState: normLive,
          players: normPlayers,
          teams: normTeams,
        };
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
      players: getLocalPlayers().map(normalizePlayer),
      teams: getLocalTeams().map(normalizeTeam),
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
      players: DEFAULT_PLAYERS.map(normalizePlayer),
      teams: DEFAULT_TEAMS.map(normalizeTeam),
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
    let list = getLocalPlayers().map(normalizePlayer);

    if (filter.search) {
      const q = String(filter.search).toLowerCase().trim();
      list = list.filter((p) => p.name?.toLowerCase().includes(q));
    }

    if (filter.position && filter.position !== 'ALL') {
      const pos = String(filter.position).toUpperCase();
      list = list.filter((p) => {
        const prim = (p.primary_position || p.position || '').toUpperCase();
        if (pos === 'ATT' || pos === 'FWD') return ['ST', 'CF', 'LW', 'RW', 'FWD'].includes(prim);
        if (pos === 'MID') return ['CM', 'CAM', 'CDM', 'LM', 'RM', 'MID'].includes(prim);
        if (pos === 'DEF') return ['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF'].includes(prim);
        if (pos === 'GK') return prim === 'GK';
        return prim === pos;
      });
    }

    if (filter.status && filter.status !== 'ALL') {
      const s = String(filter.status).toLowerCase();
      list = list.filter((p) => {
        const pStatus = String(p.status || '').toLowerCase();
        const pAuc = String(p.auction_status || '').toLowerCase();
        if (s === 'available') return pStatus === 'available' || pAuc === 'upcoming' || pAuc === 'available';
        if (s === 'sold') return pStatus === 'sold' || pAuc === 'sold';
        if (s === 'bidding') return pStatus === 'bidding' || pAuc === 'bidding';
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
    return getLocalTeams().map(normalizeTeam);
  },

  getById: async (id) => {
    const list = getLocalTeams().map(normalizeTeam);
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


export async function sendSpectatorChat(name, message, reaction = "") {
  return await callSheetsAPI({
    action: "sendChatMessage",
    name: name,
    message: message,
    reaction: reaction
  });
}

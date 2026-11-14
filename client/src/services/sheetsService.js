/**
 * sheetsService.js — Google Sheets Real-Time Backend Service for SAG Premier League.
 * Central data layer powering AuctionContext, Live Auction, Captains, and Spectators.
 */
import { DEFAULT_PLAYERS } from '../data/defaultPlayers';


// Universal Cross-Tab & Cross-Device Event Synchronization
export const auctionBroadcast = typeof window !== 'undefined' && window.BroadcastChannel
  ? new BroadcastChannel('sag_auction_channel')
  : null;

export function broadcastAuctionUpdate(type, data = {}) {
  try {
    if (auctionBroadcast) {
      auctionBroadcast.postMessage({ type, data, timestamp: Date.now() });
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sag_auction_sync_pulse', String(Date.now()));
    }
  } catch {}
}

export const SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbwArNDQQMX7G0Kze_Evr3NHCKlIAKla0LyLGY5TuaFG63neI8WLqYd20OVebs1ttj8R/exec";

export const DEFAULT_TEAMS = [
  {
    id: 'team-alpha',
    name: 'SAAG STRIKERS',
    short_name: 'STRIKERS',
    primary_color: '#ff6b35',
    remaining_purse: 20000,
    initial_purse: 20000,
    max_squad_size: 15,
  },
  {
    id: 'team-bravo',
    name: 'SAAG UNITED',
    short_name: 'UNITED',
    primary_color: '#4ecdc4',
    remaining_purse: 20000,
    initial_purse: 20000,
    max_squad_size: 15,
  },
  {
    id: 'team-charlie',
    name: 'SAAG FC',
    short_name: 'SAAGFC',
    primary_color: '#45b7d1',
    remaining_purse: 20000,
    initial_purse: 20000,
    max_squad_size: 15,
  },
];

export function formatMoney(rupees) {
  if (rupees == null || isNaN(rupees)) return '₹0';
  return '₹' + Math.round(Number(rupees)).toLocaleString('en-IN');
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
const STORAGE_KEY_CUSTOM_PLAYERS = 'sag_custom_players';
const STORAGE_KEY_PURSE_OVERRIDES = 'sag_team_purse_overrides';
const STORAGE_KEY_DELETED_TEAMS = 'sag_deleted_teams';
const STORAGE_KEY_KICKED_PLAYERS = 'sag_kicked_players';

export function getDeletedTeamIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED_TEAMS);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function saveDeletedTeamId(id) {
  try {
    const ids = getDeletedTeamIds();
    ids.add(id);
    localStorage.setItem(STORAGE_KEY_DELETED_TEAMS, JSON.stringify(Array.from(ids)));
  } catch {}
}

export function getKickedPlayerIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_KICKED_PLAYERS);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function saveKickedPlayerId(id) {
  try {
    const ids = getKickedPlayerIds();
    ids.add(id);
    localStorage.setItem(STORAGE_KEY_KICKED_PLAYERS, JSON.stringify(Array.from(ids)));
  } catch {}
}

export function getPurseOverrides() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PURSE_OVERRIDES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePurseOverride(teamId, totalPurse, remainingPurse) {
  try {
    const overrides = getPurseOverrides();
    overrides[teamId] = {
      total_purse: Number(totalPurse),
      remaining_purse: Number(remainingPurse != null ? remainingPurse : totalPurse),
      updatedAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEY_PURSE_OVERRIDES, JSON.stringify(overrides));
  } catch {}
}

export function getCustomPlayers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_PLAYERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomPlayer(player) {
  try {
    const list = getCustomPlayers();
    const idx = list.findIndex(
      (p) => p.id === player.id || (p.name && player.name && p.name.trim().toLowerCase() === player.name.trim().toLowerCase())
    );
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...player };
    } else {
      list.unshift(player);
    }
    localStorage.setItem(STORAGE_KEY_CUSTOM_PLAYERS, JSON.stringify(list));
  } catch {}
}

export function getLocalPlayers() {
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

export function getLocalTeams() {
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

export function normalizeTeam(t, playersList = null) {
  if (!t) return t;
  const overrides = getPurseOverrides();
  const override = overrides[t.id];

  // Raw total purse resolution
  let rawTotal = override?.total_purse != null
    ? Number(override.total_purse)
    : (t.total_purse != null && t.total_purse !== '' ? Number(t.total_purse) : (t.totalPurse != null ? Number(t.totalPurse) : (t.purse != null ? Number(t.purse) : (t.initial_purse != null ? Number(t.initial_purse) : 20000))));

  rawTotal = Number(rawTotal || 0);

  const players = playersList || getLocalPlayers();
  // Find all players signed to this team
  const signedPlayers = (Array.isArray(players) ? players : []).filter(
    (p) => (p.sold_to_team_id === t.id || p.team_id === t.id) &&
           (String(p.status || '').toLowerCase() === 'sold' || String(p.auction_status || '').toLowerCase() === 'sold')
  ).map((p) => ({
    ...p,
    id: p.id,
    name: p.name,
    primary_position: p.primary_position || p.position || 'FWD',
    purchase_price: Number(p.sold_price || p.purchase_price || p.finalAmount || p.base_price || 0),
    sold_price: Number(p.sold_price || p.purchase_price || p.finalAmount || p.base_price || 0),
  }));

  // Merge any squad already on t with signed players
  const existingSquad = Array.isArray(t.squad) ? t.squad : [];
  const mergedSquadMap = new Map();
  for (const sp of existingSquad) {
    if (sp && sp.id) mergedSquadMap.set(sp.id, sp);
  }
  for (const sp of signedPlayers) {
    if (sp && sp.id) mergedSquadMap.set(sp.id, sp);
  }
  const fullSquad = Array.from(mergedSquadMap.values());

  // Calculate actual total spent on squad
  const squadTotalSpent = fullSquad.reduce((sum, sp) => sum + Number(sp.purchase_price || sp.sold_price || 0), 0);

  // If sheet explicitly provided remaining_purse or override exists, respect it; otherwise fallback to rawTotal - squadTotalSpent
  let remaining = override?.remaining_purse != null
    ? Number(override.remaining_purse)
    : (t.remaining_purse != null && t.remaining_purse !== '' ? Number(t.remaining_purse) : (rawTotal - squadTotalSpent));

  const finalRemaining = Math.max(0, Number(remaining != null ? remaining : (rawTotal - squadTotalSpent)));
  const spent = squadTotalSpent;
  const color = t.color || t.primary_color || '#ffd000';

  return {
    ...t,
    id: t.id,
    name: t.name || 'Team',
    short_name: t.short_name || t.shortName || t.name || 'TEAM',
    primary_color: color,
    color: color,
    remaining_purse: finalRemaining,
    remainingPurse: finalRemaining,
    availableBiddingPurse: finalRemaining,
    total_purse: rawTotal,
    totalPurse: rawTotal,
    initial_purse: rawTotal,
    initialPurse: rawTotal,
    totalSpent: spent,
    playersPurchased: fullSquad.length,
    max_squad_size: t.max_squad || t.max_squad_size || 15,
    squad: fullSquad,
  };
}

export function normalizePlayer(p) {
  if (!p) return p;
  const match = DEFAULT_PLAYERS.find((x) => x.id === p.id || x.name?.trim().toLowerCase() === p.name?.trim().toLowerCase()) || {};
  const pos = (p.primary_position || p.position || match.primary_position || match.position || 'ST').toUpperCase();

  // Balanced default EA FC stat ratings tailored to position
  let defaultSho = 75, defaultDef = 60, defaultPas = 72, defaultSpd = 75, defaultDri = 74, defaultPhy = 70;
  if (['ST', 'CF', 'FWD'].includes(pos)) { defaultSho = 82; defaultSpd = 84; defaultDef = 42; defaultDri = 80; }
  else if (['LW', 'RW'].includes(pos)) { defaultSho = 78; defaultSpd = 88; defaultDef = 45; defaultDri = 83; }
  else if (['CAM', 'CM'].includes(pos)) { defaultSho = 76; defaultPas = 84; defaultSpd = 78; defaultDri = 82; defaultDef = 55; }
  else if (['CDM'].includes(pos)) { defaultSho = 65; defaultPas = 78; defaultSpd = 74; defaultDri = 74; defaultDef = 80; defaultPhy = 80; }
  else if (['CB'].includes(pos)) { defaultSho = 45; defaultPas = 65; defaultSpd = 72; defaultDri = 62; defaultDef = 85; defaultPhy = 84; }
  else if (['LB', 'RB'].includes(pos)) { defaultSho = 62; defaultPas = 75; defaultSpd = 84; defaultDri = 76; defaultDef = 78; defaultPhy = 74; }
  else if (pos === 'GK') { defaultSho = 30; defaultPas = 68; defaultSpd = 60; defaultDri = 55; defaultDef = 85; defaultPhy = 78; }

  const ovr = Number(p.overall_rating || match.overall_rating || Math.round((defaultSpd + defaultSho + defaultPas + defaultDri + defaultDef + defaultPhy) / 6));

  return {
    ...match,
    ...p,
    id: p.id || match.id || 'p_' + Date.now(),
    name: p.name || match.name || 'Player',
    primary_position: pos,
    position: pos,
    overall_rating: ovr,
    speed_rating: Number(p.speed_rating ?? match.speed_rating ?? defaultSpd),
    shooting_rating: Number(p.shooting_rating ?? match.shooting_rating ?? defaultSho),
    passing_rating: Number(p.passing_rating ?? match.passing_rating ?? defaultPas),
    dribbling_rating: Number(p.dribbling_rating ?? match.dribbling_rating ?? defaultDri),
    defensive_rating: Number(p.defensive_rating ?? match.defensive_rating ?? defaultDef),
    physical_rating: Number(p.physical_rating ?? match.physical_rating ?? defaultPhy),
    preferred_foot: p.preferred_foot || match.preferred_foot || 'Right',
    nationality: p.nationality || match.nationality || 'India',
    badges: (Array.isArray(p.badges) && p.badges.length > 0)
      ? p.badges
      : (Array.isArray(match.badges) && match.badges.length > 0 ? match.badges : ['Finisher++']),
    card_style: p.card_style || match.card_style || 'ultimate_gold',
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

        // 1. Process and merge Players (ensuring custom registered players and card attributes persist)
        const remotePlayers = Array.isArray(data.players) ? data.players : [];
        const localPlayers = getLocalPlayers();
        const customPlayers = getCustomPlayers();
        const allKnownLocal = [...customPlayers, ...localPlayers];

        const seenPlayerIds = new Set();
        const localOnlyPlayers = [];

        for (const lp of allKnownLocal) {
          if (!lp || !lp.id) continue;
          const lpId = String(lp.id).toLowerCase();
          const lpName = (lp.name || '').trim().toLowerCase();
          const existsRemote = remotePlayers.some(
            rp => (rp.id && String(rp.id).toLowerCase() === lpId) || (rp.name && rp.name.trim().toLowerCase() === lpName)
          );
          if (!existsRemote && !seenPlayerIds.has(lpId)) {
            seenPlayerIds.add(lpId);
            localOnlyPlayers.push(lp);
          }
        }

        const kickedPlayerIds = getKickedPlayerIds();
        const enrichedRemotePlayers = remotePlayers.map(rp => {
          const isKicked = kickedPlayerIds.has(rp.id);
          const localMatch = allKnownLocal.find(
            lp => (lp.id && rp.id && String(lp.id).toLowerCase() === String(rp.id).toLowerCase()) ||
                  (lp.name && rp.name && lp.name.trim().toLowerCase() === rp.name.trim().toLowerCase())
          );
          return normalizePlayer({
            ...(localMatch || {}),
            ...rp,
            status: isKicked ? 'available' : (rp.status || localMatch?.status || 'available'),
            auction_status: isKicked ? 'upcoming' : (rp.auction_status || localMatch?.auction_status || 'available'),
            team_id: isKicked ? '' : (rp.team_id ?? localMatch?.team_id ?? ''),
            sold_to_team_id: isKicked ? null : (rp.sold_to_team_id ?? localMatch?.sold_to_team_id ?? null),
            sold_price: isKicked ? null : (rp.sold_price ?? localMatch?.sold_price ?? null),
            purchase_price: isKicked ? null : (rp.purchase_price ?? localMatch?.purchase_price ?? null),
            overall_rating: rp.overall_rating || localMatch?.overall_rating,
            speed_rating: rp.speed_rating || localMatch?.speed_rating,
            shooting_rating: rp.shooting_rating || localMatch?.shooting_rating,
            passing_rating: rp.passing_rating || localMatch?.passing_rating,
            dribbling_rating: rp.dribbling_rating || localMatch?.dribbling_rating,
            defensive_rating: rp.defensive_rating || localMatch?.defensive_rating,
            physical_rating: rp.physical_rating || localMatch?.physical_rating,
            badges: (Array.isArray(rp.badges) && rp.badges.length > 0) ? rp.badges : localMatch?.badges,
            photo_url: rp.photo_url || localMatch?.photo_url,
          });
        });

        const normPlayers = [
          ...localOnlyPlayers.map(normalizePlayer),
          ...enrichedRemotePlayers
        ];

        // 2. Process and merge Teams with local purse overrides AND enriched squads (respecting deletions)
        const deletedTeamIds = getDeletedTeamIds();
        const remoteTeams = (Array.isArray(data.teams) ? data.teams : []).filter(rt => !deletedTeamIds.has(rt.id));
        const localTeams = getLocalTeams().filter(lt => !deletedTeamIds.has(lt.id));
        const nonDuplicateLocalTeams = localTeams.filter(
          lt => !remoteTeams.some(rt => rt.id === lt.id || (rt.short_name && lt.short_name && rt.short_name.toUpperCase() === lt.short_name.toUpperCase()))
        );
        const normTeams = [
          ...remoteTeams.map(rt => normalizeTeam(rt, normPlayers)),
          ...nonDuplicateLocalTeams.map(lt => normalizeTeam(lt, normPlayers))
        ];

        if (normLive) localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(normLive));
        localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(normPlayers));
        localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(normTeams));

        return {
          liveState: normLive,
          players: normPlayers,
          teams: normTeams,
          chatMessages: Array.isArray(data.chatMessages) ? data.chatMessages : undefined,
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
 * Dispatches an action (placeBid, pushPlayer, markSold, markUnsold, updateTeamPurse, addPlayer, addTeam)
 */
export async function callSheetsAPI(payload) {
  try {
    broadcastAuctionUpdate('auction_sync', payload);
  } catch {}
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
    } else if (payload.action === 'updateTeamPurse') {
      savePurseOverride(payload.teamId, payload.newTotalPurse, payload.newRemainingPurse);
      const list = getLocalTeams();
      const idx = list.findIndex(t => t.id === payload.teamId);
      if (idx !== -1) {
        list[idx].total_purse = payload.newTotalPurse;
        list[idx].initial_purse = payload.newTotalPurse;
        list[idx].remaining_purse = payload.newRemainingPurse != null ? payload.newRemainingPurse : payload.newTotalPurse;
        list[idx].remainingPurse = list[idx].remaining_purse;
        saveLocalTeams(list);
      }
    } else if (payload.action === 'addPlayer' && payload.player) {
      saveCustomPlayer(payload.player);
      const list = getLocalPlayers();
      if (!list.some(p => p.id === payload.player.id)) {
        list.unshift(payload.player);
        saveLocalPlayers(list);
      }
    } else if (payload.action === 'addTeam' && payload.team) {
      const list = getLocalTeams();
      if (!list.some(t => t.id === payload.team.id)) {
        list.push(payload.team);
        saveLocalTeams(list);
      }
    }
  } catch {}

  try {
    // Try real CORS fetch first (works if Code.gs has proper CORS headers)
    try {
      const res = await fetch(SHEETS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      return json;
    } catch (_corsErr) {
      // Fall back to no-cors fire-and-forget for environments without CORS support
      await fetch(SHEETS_API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      return { success: true };
    }
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
        if (s === 'available' || s === 'upcoming') {
          return pStatus !== 'sold' && pAuc !== 'sold';
        }
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
    const newPlayer = normalizePlayer({
      id: playerData.id || 'p_' + Date.now(),
      ...playerData,
    });
    saveCustomPlayer(newPlayer);
    const list = getLocalPlayers();
    list.unshift(newPlayer);
    saveLocalPlayers(list);
    addPlayerToSheets(newPlayer).catch(() => {});
    return newPlayer;
  },

  delete: async (id) => {
    const list = getLocalPlayers();
    const updated = list.filter((p) => p.id !== id);
    saveLocalPlayers(updated);
    return true;
  },

  updateShortlist: async (playerIds, shortlistedValue) => {
    if (!Array.isArray(playerIds) || playerIds.length === 0) return true;
    const list = getLocalPlayers();
    playerIds.forEach(id => {
      const idx = list.findIndex(p => p.id === id);
      if (idx !== -1) {
        list[idx].is_shortlisted = shortlistedValue;
      }
    });
    saveLocalPlayers(list);
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

  create: async (teamData) => {
    const list = getLocalTeams();
    const newTeam = normalizeTeam({
      id: teamData.id || 'team_' + Date.now(),
      total_purse: teamData.initial_purse || 20000,
      remaining_purse: teamData.initial_purse || 20000,
      squad: [],
      ...teamData,
    });
    list.push(newTeam);
    saveLocalTeams(list);
    addTeamToSheets(newTeam).catch(() => {});
    return newTeam;
  },

  delete: async (id) => {
    saveDeletedTeamId(id);
    const list = getLocalTeams();
    const updated = list.filter((t) => t.id !== id);
    saveLocalTeams(updated);
    callSheetsAPI({ action: 'deleteTeam', teamId: id }).catch(() => {});
    return true;
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

  applyTaxDeduction: async ({ teamId, percentage, bidAmount }) => {
    if (!teamId || !percentage || !bidAmount) {
      throw new Error('Invalid tax parameters');
    }
    const taxAmt = Math.round((Number(bidAmount) * Number(percentage)) / 100);
    const list = getLocalTeams();
    const idx = list.findIndex(t => t.id === teamId);
    if (idx === -1) {
      throw new Error('Team not found');
    }
    const currentPurse = Number(list[idx].remaining_purse ?? list[idx].remainingPurse ?? list[idx].total_purse ?? 0);
    const newPurse = Math.max(0, currentPurse - taxAmt);
    list[idx].remaining_purse = newPurse;
    list[idx].remainingPurse = newPurse;
    list[idx].availableBiddingPurse = newPurse;
    saveLocalTeams(list);
    savePurseOverride(teamId, list[idx].total_purse || list[idx].initial_purse || 0, newPurse);
    // Fire off to Google Sheets
    updateTeamPurseInSheets(teamId, list[idx].total_purse || list[idx].initial_purse || 0, newPurse).catch(() => {});
    return {
      success: true,
      taxAmt,
      newPurse,
      formattedDeducted: formatMoney(taxAmt),
      formattedNewPurse: formatMoney(newPurse),
    };
  },

  kickPlayer: async ({ playerId, teamId }) => {
    if (!playerId) throw new Error('Invalid player ID for kick');
    saveKickedPlayerId(playerId);

    // 1. Reset player in local players
    const playerList = getLocalPlayers();
    const pIdx = playerList.findIndex(p => p.id === playerId);
    let refundAmt = 0;
    if (pIdx !== -1) {
      refundAmt = Number(playerList[pIdx].purchase_price || playerList[pIdx].sold_price || 0);
      playerList[pIdx].status = 'available';
      playerList[pIdx].auction_status = 'upcoming';
      playerList[pIdx].sold_to_team_id = null;
      playerList[pIdx].team_id = '';
      playerList[pIdx].purchase_price = null;
      playerList[pIdx].sold_price = null;
      saveLocalPlayers(playerList);
    }

    // 2. Refund purse to team and remove from squad
    const targetTeamId = teamId || playerList[pIdx]?.sold_to_team_id || playerList[pIdx]?.team_id;
    if (targetTeamId) {
      const teamList = getLocalTeams();
      const tIdx = teamList.findIndex(t => t.id === targetTeamId);
      if (tIdx !== -1) {
        const prevPurse = Number(teamList[tIdx].remaining_purse ?? teamList[tIdx].remainingPurse ?? 0);
        const newPurse = prevPurse + refundAmt;
        teamList[tIdx].remaining_purse = newPurse;
        teamList[tIdx].remainingPurse = newPurse;
        teamList[tIdx].availableBiddingPurse = newPurse;
        teamList[tIdx].squad = (teamList[tIdx].squad || []).filter(p => p.id !== playerId);
        saveLocalTeams(teamList);
        savePurseOverride(targetTeamId, teamList[tIdx].total_purse || teamList[tIdx].initial_purse || 0, newPurse);
        updateTeamPurseInSheets(targetTeamId, teamList[tIdx].total_purse || teamList[tIdx].initial_purse || 0, newPurse).catch(() => {});
      }
    }
    callSheetsAPI({ action: 'kickPlayer', playerId, teamId: targetTeamId }).catch(() => {});
    return { success: true, refundAmt, formattedRefund: formatMoney(refundAmt) };
  },

  getHistory: async () => {
    const players = getLocalPlayers();
    const teams = getLocalTeams();
    const sold = players.filter(p => p.status === 'sold' || p.auction_status === 'sold');
    return sold.map((p, idx) => {
      const t = teams.find(tm => tm.id === (p.sold_to_team_id || p.team_id));
      const price = Number(p.sold_price || p.purchase_price || p.finalAmount || p.base_price || 50000);
      return {
        id: p.id || 'hist_' + idx,
        transaction_number: 'TX-' + String(p.id || idx).replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase(),
        player_name: p.name,
        primary_position: p.primary_position || p.position || 'FWD',
        team_name: t?.name || 'Franchise',
        team_color: t?.primary_color || t?.color || '#ffd000',
        base_price: Number(p.base_price || 50000),
        purchase_price: price,
        created_at: p.sold_at || p.updated_at || new Date().toISOString(),
      };
    });
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
  getDashboard: async () => {
    const teams = getLocalTeams();
    const players = getLocalPlayers();
    const totalInitialPurse = teams.reduce((acc, t) => acc + (Number(t.total_purse ?? t.initial_purse) || 0), 0);
    const totalRemainingPurse = teams.reduce((acc, t) => acc + (Number(t.remaining_purse ?? t.remainingPurse ?? t.total_purse ?? t.initial_purse) || 0), 0);
    const totalSpent = Math.max(0, totalInitialPurse - totalRemainingPurse);
    const soldPlayers = players.filter(p => p.status === 'sold' || p.auction_status === 'sold').length;
    const unsoldPlayers = players.filter(p => p.status === 'unsold' || p.auction_status === 'unsold').length;

    return {
      stats: {
        totalTeams: teams.length,
        totalPlayers: players.length,
        soldPlayers,
        unsoldPlayers,
        totalInitialPurse,
        totalSpent,
        totalRemainingPurse
      },
      teamSpending: teams.map(t => {
        const init = Number(t.total_purse ?? t.initial_purse) || 20000;
        const rem = Number(t.remaining_purse ?? t.remainingPurse ?? init);
        return {
          id: t.id,
          name: t.name,
          color: t.primary_color || '#ffd000',
          initialPurse: init,
          totalSpent: Math.max(0, init - rem)
        };
      }),
      positionDistribution: [
        { primary_position: 'GK', count: players.filter(p => p.primary_position === 'GK').length },
        { primary_position: 'DEF', count: players.filter(p => ['CB', 'LB', 'RB'].includes(p.primary_position)).length },
        { primary_position: 'MID', count: players.filter(p => ['CDM', 'CM', 'CAM'].includes(p.primary_position)).length },
        { primary_position: 'ATT', count: players.filter(p => ['ST', 'LW', 'RW', 'CF'].includes(p.primary_position)).length },
      ],
      recentPurchases: players.filter(p => p.status === 'sold' || p.auction_status === 'sold').slice(0, 5)
    };
  }
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
  getAll: async () => {
    return awardsAPI.getAwards();
  },

  getAwards: async () => {
    try {
      const raw = localStorage.getItem('sag_tournament_awards');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveAward: async (awardConfig) => {
    try {
      const existing = await awardsAPI.getAwards();
      const updated = [awardConfig, ...existing.filter(a => a.category !== awardConfig.category)];
      localStorage.setItem('sag_tournament_awards', JSON.stringify(updated));
      return awardConfig;
    } catch {
      return awardConfig;
    }
  },

  getBadges: async () => {
    try {
      const raw = localStorage.getItem('sag_playstyle_badges');
      const badges = raw ? JSON.parse(raw) : DEFAULT_BADGES_LIST;
      return { all: badges };
    } catch {
      return { all: DEFAULT_BADGES_LIST };
    }
  },

  createBadge: async (badgeData) => {
    try {
      const { all: current } = await awardsAPI.getBadges();
      const newBadge = {
        id: 'b_' + Date.now(),
        ...badgeData
      };
      const updated = [...current, newBadge];
      localStorage.setItem('sag_playstyle_badges', JSON.stringify(updated));
      return newBadge;
    } catch (e) {
      return badgeData;
    }
  },

  assignPlayerBadge: async (playerId, badgeName, action = 'add') => {
    const list = getLocalPlayers();
    const idx = list.findIndex(p => p.id === playerId);
    if (idx !== -1) {
      let badges = Array.isArray(list[idx].badges) ? [...list[idx].badges] : [];
      if (action === 'add' && !badges.includes(badgeName)) {
        badges.push(badgeName);
      } else if (action === 'remove') {
        badges = badges.filter(b => b !== badgeName);
      }
      list[idx].badges = badges;
      saveLocalPlayers(list);
      return list[idx];
    }
    return null;
  },

  fixTeamPurse: async (teamId, newPurseRupees) => {
    savePurseOverride(teamId, newPurseRupees, newPurseRupees);
    const list = getLocalTeams();
    const idx = list.findIndex(t => t.id === teamId);
    if (idx !== -1) {
      list[idx].total_purse = newPurseRupees;
      list[idx].initial_purse = newPurseRupees;
      list[idx].remaining_purse = newPurseRupees;
      list[idx].remainingPurse = newPurseRupees;
      saveLocalTeams(list);
    }
    updateTeamPurseInSheets(teamId, newPurseRupees, newPurseRupees).catch(() => {});
    return list[idx] || { id: teamId, total_purse: newPurseRupees, remaining_purse: newPurseRupees };
  }
};


export async function sendSpectatorChat(name, message, reaction = "") {
  return await callSheetsAPI({
    action: "sendChatMessage",
    name: name,
    message: message,
    reaction: reaction
  });
}
// Add these to client/src/services/sheetsService.js

export async function addTeamToSheets(teamData) {
  return await callSheetsAPI({ action: "addTeam", team: teamData });
}

export async function addPlayerToSheets(playerData) {
  return await callSheetsAPI({ action: "addPlayer", player: playerData });
}

export async function updateTeamPurseInSheets(teamId, newTotalPurse, newRemainingPurse) {
  return await callSheetsAPI({
    action: "updateTeamPurse",
    teamId,
    newTotalPurse,
    newRemainingPurse
  });
}
export async function syncAllPlayersToSheets(players) {
  return await callSheetsAPI({ action: 'syncAllPlayers', players });
}

export async function syncAllTeamsToSheets(teams) {
  return await callSheetsAPI({ action: 'syncAllTeams', teams });
}

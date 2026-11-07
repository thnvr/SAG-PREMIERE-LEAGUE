/**
 * api.js — Central data-access layer with Supabase integration and offline fallback.
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DEFAULT_PLAYERS } from '../data/defaultPlayers';

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

// ── Default Teams ──────────────────────────────────────────────────────────
export const DEFAULT_TEAMS = [
  {
    id: 'team-alpha',
    name: 'SAAG STRIKERS',
    short_name: 'STRIKERS',
    primary_color: '#ff6b35',
    logo_url: '',
    initial_purse: 200000000,
    remaining_purse: 200000000,
    max_squad_size: 15,
  },
  {
    id: 'team-bravo',
    name: 'SAAG UNITED',
    short_name: 'UNITED',
    primary_color: '#4ecdc4',
    logo_url: '',
    initial_purse: 200000000,
    remaining_purse: 200000000,
    max_squad_size: 15,
  },
  {
    id: 'team-charlie',
    name: 'SAAG FC',
    short_name: 'SAAGFC',
    primary_color: '#45b7d1',
    logo_url: '',
    initial_purse: 200000000,
    remaining_purse: 200000000,
    max_squad_size: 15,
  },
];

// ── Local Storage Helpers ──────────────────────────────────────────────────
function getLocalPlayers() {
  try {
    const raw = localStorage.getItem('sag_players_data');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  try {
    localStorage.setItem('sag_players_data', JSON.stringify(DEFAULT_PLAYERS));
  } catch {}
  return DEFAULT_PLAYERS;
}

function saveLocalPlayers(players) {
  try {
    localStorage.setItem('sag_players_data', JSON.stringify(players));
  } catch {}
}

function getLocalSession() {
  try {
    const raw = localStorage.getItem('sag_active_session');
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    id: 1,
    status: 'pre_auction',
    bidding_status: 'pre_auction',
    current_player_id: null,
    current_bid: 0,
    current_highest_bid: 0,
    leading_team_id: null,
    bid_increment: 5000,
  };
}

function saveLocalSession(s) {
  try {
    localStorage.setItem('sag_active_session', JSON.stringify(s));
  } catch {}
}

function getLocalComments() {
  try {
    const raw = localStorage.getItem('sag_spectator_comments');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocalComments(comments) {
  try {
    localStorage.setItem('sag_spectator_comments', JSON.stringify(comments));
  } catch {}
}

// ── Position & Status Normalizers ──────────────────────────────────────────
function matchesPosition(player, filter) {
  if (!filter || filter === 'ALL') return true;
  const p = (player.primary_position || player.position || '').toUpperCase();
  if (filter === 'GK') return p === 'GK';
  if (filter === 'DEF') return ['DEF', 'CB', 'LB', 'RB', 'RWB', 'LWB'].includes(p);
  if (filter === 'MID') return ['MID', 'CDM', 'CM', 'CAM', 'LM', 'RM'].includes(p);
  if (filter === 'FWD') return ['FWD', 'LW', 'RW', 'ST', 'CF', 'SS'].includes(p);
  return p === filter.toUpperCase();
}

function matchesStatus(player, filter) {
  if (!filter || filter === 'ALL') return true;
  const s = (player.auction_status || player.status || '').toLowerCase();
  if (filter === 'available' || filter === 'upcoming') {
    return s === 'available' || s === 'upcoming' || s === 'bidding';
  }
  return s === filter.toLowerCase();
}

// ══════════════════════════════════════════════════════════════════════════
//  TEAMS API
// ══════════════════════════════════════════════════════════════════════════
export const teamsAPI = {
  getAll: async () => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('teams').select('*').order('name');
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('[Teams] Supabase fetch error:', err.message);
      }
    }
    return DEFAULT_TEAMS;
  },

  getById: async (id) => {
    let team = null;
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('teams').select('*').eq('id', id).single();
        if (data) team = data;
      } catch {}
    }

    if (!team) {
      team = DEFAULT_TEAMS.find((t) => t.id === id) || DEFAULT_TEAMS[0];
    }

    const allPlayers = await playersAPI.getAll();
    const squad = allPlayers.filter(
      (p) => p.sold_to_team_id === id || p.team_id === id || (p.status === 'sold' && p.sold_to_team_id === id)
    );

    const goalkeepers = squad.filter((p) => matchesPosition(p, 'GK'));
    const defenders = squad.filter((p) => matchesPosition(p, 'DEF'));
    const midfielders = squad.filter((p) => matchesPosition(p, 'MID'));
    const forwards = squad.filter((p) => matchesPosition(p, 'FWD'));

    const totalSpent = squad.reduce((sum, p) => sum + (p.sold_price || 0), 0);
    const initialPurse = team.initial_purse || 200000000;
    const remainingPurse = team.remaining_purse != null ? team.remaining_purse : Math.max(0, initialPurse - totalSpent);

    return {
      ...team,
      squad,
      groupedSquad: {
        goalkeepers,
        defenders,
        midfielders,
        forwards,
      },
      totalSpent,
      remainingPurse,
    };
  },

  create: async (teamData) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('teams').insert(teamData).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
    return teamData;
  },

  update: async (id, teamData) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('teams').update(teamData).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
    return teamData;
  },

  delete: async (id) => {
    if (isSupabaseConfigured) {
      await supabase.from('teams').delete().eq('id', id);
    }
    return { success: true };
  },

  getSquad: async (id) => {
    const all = await playersAPI.getAll();
    return all.filter((p) => p.team_id === id || p.sold_to_team_id === id);
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  PLAYERS API
// ══════════════════════════════════════════════════════════════════════════
export const playersAPI = {
  getAll: async (params = {}) => {
    let list = [];

    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('players').select('*');
        if (params.search) query = query.ilike('name', `%${params.search}%`);
        const { data, error } = await query.order('name');
        if (!error && data && data.length > 0) {
          list = data;
        }
      } catch (err) {
        console.warn('[Players] Supabase error:', err.message);
      }
    }

    if (list.length === 0) {
      list = getLocalPlayers();
    }

    return list.filter((p) => {
      if (params.search) {
        const q = params.search.toLowerCase();
        if (!p.name?.toLowerCase().includes(q)) return false;
      }
      if (params.position && !matchesPosition(p, params.position)) {
        return false;
      }
      if (params.status && !matchesStatus(p, params.status)) {
        return false;
      }
      if (params.team_id && p.team_id !== params.team_id && p.sold_to_team_id !== params.team_id) {
        return false;
      }
      return true;
    });
  },

  getById: async (id) => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('players').select('*').eq('id', id).single();
        if (!error && data) return data;
      } catch {}
    }
    const local = getLocalPlayers();
    return local.find((p) => p.id === id) || null;
  },

  create: async (playerData) => {
    const newPlayer = {
      id: playerData.id || 'ply_' + Date.now(),
      ...playerData,
      status: playerData.status || 'available',
      auction_status: playerData.auction_status || 'upcoming',
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('players').insert(newPlayer);
      } catch (err) {}
    }

    const local = getLocalPlayers();
    saveLocalPlayers([newPlayer, ...local]);
    return newPlayer;
  },

  update: async (id, playerData) => {
    const local = getLocalPlayers();
    const updated = local.map((p) => (p.id === id ? { ...p, ...playerData } : p));
    saveLocalPlayers(updated);

    if (isSupabaseConfigured) {
      try {
        // Only update valid database columns to avoid Postgres constraint errors
        const cleanPlayerRow = {};
        if (playerData.name) cleanPlayerRow.name = playerData.name;
        if (playerData.base_price != null) cleanPlayerRow.base_price = Number(playerData.base_price);
        if (playerData.sold_price != null) cleanPlayerRow.sold_price = Number(playerData.sold_price);
        if (playerData.status) {
          cleanPlayerRow.status = playerData.status === 'bidding' ? 'available' : playerData.status;
        }
        if (playerData.team_id || playerData.sold_to_team_id) {
          cleanPlayerRow.team_id = playerData.sold_to_team_id || playerData.team_id;
        }
        if (playerData.photo_url != null) cleanPlayerRow.photo_url = playerData.photo_url;
        if (playerData.photo_scale != null) cleanPlayerRow.photo_scale = Number(playerData.photo_scale);
        if (playerData.photo_x != null) cleanPlayerRow.photo_x = Number(playerData.photo_x);
        if (playerData.photo_y != null) cleanPlayerRow.photo_y = Number(playerData.photo_y);
        if (playerData.is_shortlisted != null) cleanPlayerRow.is_shortlisted = Boolean(playerData.is_shortlisted);

        if (Object.keys(cleanPlayerRow).length > 0) {
          await supabase.from('players').update(cleanPlayerRow).eq('id', id);
        }
      } catch (err) {
        console.warn('Supabase player update error:', err);
      }
    }

    return { ...playerData, id };
  },

  delete: async (id) => {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('players').delete().eq('id', id);
      } catch (err) {}
    }

    const local = getLocalPlayers();
    saveLocalPlayers(local.filter((p) => p.id !== id));
    return { success: true };
  },

  updateShortlist: async (playerIds, isShortlisted = true) => {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('players').update({ is_shortlisted: isShortlisted }).in('id', playerIds);
      } catch {}
    }

    const local = getLocalPlayers();
    const updated = local.map((p) =>
      playerIds.includes(p.id) ? { ...p, is_shortlisted: isShortlisted ? 1 : 0 } : p
    );
    saveLocalPlayers(updated);
    return { success: true };
  },

  importCSV: async (csvText) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV must contain a header and at least one data row');
    const headers = lines[0].split(',').map((h) => h.trim());
    const imported = [];

    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map((v) => v.trim());
      if (vals.length < headers.length) continue;
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = vals[idx];
      });

      const player = {
        id: 'ply_' + Date.now() + '_' + i,
        name: row.name || 'Player ' + i,
        primary_position: row.primary_position || 'ST',
        position: row.primary_position || 'FWD',
        base_price: parseInt(row.base_price, 10) || 50000,
        age: parseInt(row.age, 10) || 24,
        nationality: row.nationality || 'India',
        overall_rating: parseInt(row.overall_rating, 10) || 75,
        status: 'available',
        auction_status: 'upcoming',
        badges: [],
      };
      imported.push(player);
    }

    const local = getLocalPlayers();
    saveLocalPlayers([...imported, ...local]);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('players').insert(imported);
      } catch {}
    }

    return { importedCount: imported.length };
  },

  uploadPhoto: async (file) => {
    const objectUrl = URL.createObjectURL(file);
    return { url: objectUrl };
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  AUCTION API (Resilient Cloud & Local Sync)
// ══════════════════════════════════════════════════════════════════════════
export const auctionAPI = {
  getCurrentState: async () => {
    let session = getLocalSession();

    if (isSupabaseConfigured) {
      try {
        // Query exact row id=1 without postgrest join dependencies
        const { data, error } = await supabase
          .from('auction_sessions')
          .select('*')
          .eq('id', 1)
          .single();

        if (!error && data) {
          session = {
            id: 1,
            status: data.status || 'waiting',
            bidding_status: data.status || 'waiting',
            current_player_id: data.current_player_id,
            current_bid: Number(data.current_bid) || 0,
            current_highest_bid: Number(data.current_bid) || 0,
            leading_team_id: data.leading_team_id,
            bid_increment: Number(data.bid_increment) || 5000,
            updated_at: data.updated_at,
          };
          saveLocalSession(session);
        } else if (error) {
          console.warn('[Supabase] getCurrentState error:', error.message);
        }
      } catch (err) {
        console.warn('[Supabase] getCurrentState network error:', err.message);
      }
    }

    // Attach player and team
    let currentPlayer = null;
    let leadingTeam = null;

    if (session.current_player_id) {
      currentPlayer = await playersAPI.getById(session.current_player_id);
    }
    if (session.leading_team_id) {
      leadingTeam = await teamsAPI.getById(session.leading_team_id);
    }

    return {
      ...session,
      current_player: currentPlayer,
      leading_team: leadingTeam,
    };
  },

  upsertSession: async (sessionData) => {
    const rawBid = sessionData.current_bid != null 
      ? sessionData.current_bid 
      : (sessionData.current_highest_bid != null ? sessionData.current_highest_bid : 0);
    const rawStatus = sessionData.status || sessionData.bidding_status || 'active';
    const rawInc = sessionData.bid_increment || 5000;
    const curPId = sessionData.current_player_id || null;
    const leadTeamId = sessionData.leading_team_id || null;

    // Strict schema-clean payload for Postgres — avoids column-not-found errors
    const cleanDbRow = {
      id: 1,
      status: rawStatus,
      current_player_id: curPId,
      current_bid: Number(rawBid),
      leading_team_id: leadTeamId,
      bid_increment: Number(rawInc),
      updated_at: new Date().toISOString(),
    };

    saveLocalSession({
      ...cleanDbRow,
      current_highest_bid: Number(rawBid),
      bidding_status: rawStatus,
    });

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('auction_sessions')
          .upsert(cleanDbRow, { onConflict: 'id' });

        if (error) {
          console.error('[Supabase] upsertSession rejected:', error.message);
        } else {
          console.log('[Supabase] Successfully synced auction session to cloud!');
        }
      } catch (err) {
        console.error('[Supabase] upsertSession exception:', err.message);
      }
    }

    return {
      ...cleanDbRow,
      current_highest_bid: Number(rawBid),
      bidding_status: rawStatus,
    };
  },

  nominate: async (playerId, overrides = {}) => {
    const player = await playersAPI.getById(playerId);
    const basePrice = overrides.base_price || player?.base_price || 50000;

    await playersAPI.update(playerId, {
      auction_status: 'bidding',
      status: 'available',
      base_price: basePrice,
      ...(overrides.name ? { name: overrides.name } : {}),
      ...(overrides.primary_position ? { primary_position: overrides.primary_position } : {}),
    });

    const sessionObj = {
      id: 1,
      current_player_id: playerId,
      current_bid: basePrice,
      current_highest_bid: basePrice,
      leading_team_id: null,
      status: 'active',
      bidding_status: 'active',
      bid_increment: 5000,
    };

    return await auctionAPI.upsertSession(sessionObj);
  },

  placeBid: async (playerId, teamId, amount) => {
    const sessionObj = {
      id: 1,
      current_player_id: playerId,
      current_bid: amount,
      current_highest_bid: amount,
      leading_team_id: teamId,
      status: 'active',
      bidding_status: 'active',
    };
    await auctionAPI.upsertSession(sessionObj);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('bids').insert({ player_id: playerId, team_id: teamId, amount });
      } catch {}
    }
    return sessionObj;
  },

  sold: async () => ({ success: true }),
  unsold: async () => ({ success: true }),
  pause: async () => ({ success: true }),
  resume: async () => ({ success: true }),
  extend: async () => ({ success: true }),
  skip: async () => ({ success: true }),
  setIncrement: async (increment) => ({ success: true, increment }),
  manualBid: async (teamId, amount) => ({ success: true, teamId, amount }),
  applyTaxDeduction: async (data) => ({ success: true, ...data }),
  kickPlayer: async (data) => ({ success: true, ...data }),

  getHistory: async () => {
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('bids')
          .select(`*, player:players(name, position), team:teams(name, short_name)`)
          .order('created_at', { ascending: false });
        if (data) return data;
      } catch {}
    }
    return [];
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  ADMIN / LEAGUE SETTINGS
// ══════════════════════════════════════════════════════════════════════════
export const adminAPI = {
  getDashboard: async () => {
    const teams = await teamsAPI.getAll();
    const players = await playersAPI.getAll();
    return {
      teams,
      players,
      totalBids: 0,
    };
  },
  getLeague: async () => {
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('league_settings').select('*').limit(1).single();
        if (data) return data;
      } catch {}
    }
    return {
      league_name: 'SAG PREMIERE LEAGUE',
      season: '2026',
      total_purse: 200000000,
      min_bid_increment: 50000,
    };
  },
  updateLeague: async (settingsData) => {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('league_settings').upsert(settingsData).select().single();
      return data;
    }
    return settingsData;
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  SPECTATOR CHAT API (Realtime Cloud Sync)
// ══════════════════════════════════════════════════════════════════════════
export const spectatorAPI = {
  getComments: async () => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('spectator_comments')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(100);

        if (!error && data && data.length > 0) {
          const list = data.map((d) => ({
            id: d.id,
            user: d.author_name,
            text: d.message,
            reaction: d.reaction || '🔥',
            time: d.created_at,
          }));
          saveLocalComments(list);
          return { comments: list };
        }
      } catch {}
    }
    return { comments: getLocalComments() };
  },

  postComment: async ({ text, reaction = '🔥', user = 'Spectator' }) => {
    const commentObj = {
      id: 'cmt_' + Date.now(),
      user,
      text,
      reaction,
      time: new Date().toISOString(),
    };

    const existing = getLocalComments();
    const updated = [...existing, commentObj].slice(-100);
    saveLocalComments(updated);

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('sag_chat_channel');
        bc.postMessage({ type: 'NEW_COMMENT', payload: commentObj });
        bc.close();
      }
    } catch {}

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('spectator_comments').insert({
          author_name: user,
          message: text,
          reaction,
        });
        if (error) {
          console.warn('[Supabase] Insert comment retry:', error.message);
          // Fallback if reaction column not present
          await supabase.from('spectator_comments').insert({
            author_name: user,
            message: `${reaction} ${text}`,
          });
        }
      } catch (err) {
        console.warn('Supabase comment insert exception:', err);
      }
    }

    return { comment: commentObj, success: true };
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  AWARDS & BADGES API
// ══════════════════════════════════════════════════════════════════════════
export const awardsAPI = {
  getAwards: async () => [],
  saveAward: async (d) => d,
  getBadges: async () => [
    { code: 'finisher', name: 'Finisher++', icon: 'Award', color: '#ffd000' },
    { code: 'golden_boot', name: 'Golden Boot', icon: 'Award', color: '#ffd000' },
    { code: 'safe_hands', name: 'Safe Hands', icon: 'Shield', color: '#22c55e' },
    { code: 'playmaker', name: 'Playmaker', icon: 'Sparkles', color: '#3b82f6' },
    { code: 'speed_demon', name: 'Speed Demon', icon: 'Zap', color: '#f59e0b' },
    { code: 'defensive_wall', name: 'Defensive Wall', icon: 'Shield', color: '#ef4444' },
  ],
  createBadge: async (d) => d,
  assignPlayerBadge: async (playerId, badgeName, action = 'add') => {
    const player = await playersAPI.getById(playerId);
    if (!player) return;
    let badges = Array.isArray(player.badges) ? [...player.badges] : [];
    if (action === 'add' && !badges.includes(badgeName)) badges.push(badgeName);
    if (action === 'remove') badges = badges.filter((b) => b !== badgeName);
    return await playersAPI.update(playerId, { badges });
  },
  fixTeamPurse: async (teamId, initial_purse) => {
    return await teamsAPI.update(teamId, { initial_purse, remaining_purse: initial_purse });
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  REPORTS API
// ══════════════════════════════════════════════════════════════════════════
function downloadCSV(rows, filename) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const reportsAPI = {
  downloadTeamsCSV: async () => {
    const teams = await teamsAPI.getAll();
    downloadCSV(teams, 'teams.csv');
  },
  downloadPlayersCSV: async () => {
    const players = await playersAPI.getAll();
    downloadCSV(players, 'players.csv');
  },
  downloadFinancialCSV: async () => {
    const teams = await teamsAPI.getAll();
    downloadCSV(teams, 'financial.csv');
  },
  downloadSummaryCSV: async () => {
    const players = await playersAPI.getAll();
    downloadCSV(players, 'auction-summary.csv');
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  AUDIT LOG API
// ══════════════════════════════════════════════════════════════════════════
export const auditAPI = {
  getAll: async () => [],
  reverseSale: async (id) => ({ id, reversed: true }),
};

// ══════════════════════════════════════════════════════════════════════════
//  AUTH API
// ══════════════════════════════════════════════════════════════════════════
export const authAPI = {
  login: async () => {
    throw new Error('Use AuthContext.login() instead');
  },
  me: async () => {
    return getStoredUser();
  },
  getUsers: async () => [],
};

export default {
  teamsAPI,
  playersAPI,
  auctionAPI,
  adminAPI,
  spectatorAPI,
  awardsAPI,
  reportsAPI,
  auditAPI,
  authAPI,
};

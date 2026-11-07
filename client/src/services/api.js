/**
 * api.js — Central data-access layer.
 *
 * Authentication is now handled entirely by Supabase (see AuthContext.jsx).
 * Data queries for teams, players, auction, etc. now go directly to Supabase.
 *
 * The legacy apiFetch / Express /api/* calls are kept for local dev
 * compatibility but are no longer used in production — Supabase replaces them.
 */
import { supabase } from '../lib/supabase';

// ── Money formatter ────────────────────────────────────────────────────────
export function formatMoney(paise) {
  if (paise == null || isNaN(paise)) return '₹0';
  return '₹' + Math.round(paise / 100).toLocaleString('en-IN');
}

// ── Token helpers (kept for socket.js compatibility) ──────────────────────
export function getToken() {
  return localStorage.getItem('sag_token');
}
export function setToken(token) {
  if (token) {
    localStorage.setItem('sag_token', token);
  } else {
    localStorage.removeItem('sag_token');
  }
}
export function getStoredUser() {
  try {
    const user = localStorage.getItem('sag_user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}
export function setStoredUser(user) {
  if (user) {
    localStorage.setItem('sag_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('sag_user');
  }
}

// ── Generic Supabase error wrapper ─────────────────────────────────────────
function sbThrow(error) {
  if (error) {
    console.error('[Supabase]', error.message);
    throw new Error(error.message);
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  TEAMS
// ══════════════════════════════════════════════════════════════════════════
export const teamsAPI = {
  getAll: async () => {
    const { data, error } = await supabase.from('teams').select('*').order('name');
    sbThrow(error);
    return data;
  },
  getById: async (id) => {
    const { data, error } = await supabase.from('teams').select('*').eq('id', id).single();
    sbThrow(error);
    return data;
  },
  create: async (teamData) => {
    const { data, error } = await supabase.from('teams').insert(teamData).select().single();
    sbThrow(error);
    return data;
  },
  update: async (id, teamData) => {
    const { data, error } = await supabase.from('teams').update(teamData).eq('id', id).select().single();
    sbThrow(error);
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from('teams').delete().eq('id', id);
    sbThrow(error);
    return { success: true };
  },
  getSquad: async (id) => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', id)
      .eq('status', 'sold')
      .order('name');
    sbThrow(error);
    return data;
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  PLAYERS
// ══════════════════════════════════════════════════════════════════════════
export const playersAPI = {
  getAll: async (params = {}) => {
    let query = supabase.from('players').select('*');
    if (params.status) query = query.eq('status', params.status);
    if (params.team_id) query = query.eq('team_id', params.team_id);
    if (params.position) query = query.eq('position', params.position);
    if (params.search) query = query.ilike('name', `%${params.search}%`);
    query = query.order('name');
    const { data, error } = await query;
    sbThrow(error);
    return data;
  },
  getById: async (id) => {
    const { data, error } = await supabase.from('players').select('*').eq('id', id).single();
    sbThrow(error);
    return data;
  },
  create: async (playerData) => {
    const { data, error } = await supabase.from('players').insert(playerData).select().single();
    sbThrow(error);
    return data;
  },
  update: async (id, playerData) => {
    const { data, error } = await supabase.from('players').update(playerData).eq('id', id).select().single();
    sbThrow(error);
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from('players').delete().eq('id', id);
    sbThrow(error);
    return { success: true };
  },
  updateShortlist: async (playerIds, isShortlisted = true) => {
    const { error } = await supabase
      .from('players')
      .update({ is_shortlisted: isShortlisted })
      .in('id', playerIds);
    sbThrow(error);
    return { success: true };
  },
  uploadPhoto: async (file, playerId) => {
    const ext = file.name.split('.').pop();
    const path = `players/${playerId || Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('player-photos')
      .upload(path, file, { upsert: true });
    sbThrow(uploadError);
    const { data } = supabase.storage.from('player-photos').getPublicUrl(path);
    return { url: data.publicUrl };
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  AUCTION
// ══════════════════════════════════════════════════════════════════════════
export const auctionAPI = {
  getCurrentState: async () => {
    const { data, error } = await supabase
      .from('auction_sessions')
      .select(`
        *,
        current_player:players(*),
        leading_team:teams(*)
      `)
      .order('id', { ascending: false })
      .limit(1)
      .single();
    if (error && error.code === 'PGRST116') return null; // no rows
    sbThrow(error);
    return data;
  },
  upsertSession: async (sessionData) => {
    const { data, error } = await supabase
      .from('auction_sessions')
      .upsert(sessionData, { onConflict: 'id' })
      .select()
      .single();
    sbThrow(error);
    return data;
  },
  placeBid: async (playerId, teamId, amount) => {
    const { data, error } = await supabase
      .from('bids')
      .insert({ player_id: playerId, team_id: teamId, amount })
      .select()
      .single();
    sbThrow(error);
    return data;
  },
  getHistory: async (params = {}) => {
    let query = supabase
      .from('bids')
      .select(`*, player:players(name, position), team:teams(name, short_name)`)
      .order('created_at', { ascending: false });
    if (params.player_id) query = query.eq('player_id', params.player_id);
    if (params.team_id) query = query.eq('team_id', params.team_id);
    const { data, error } = await query;
    sbThrow(error);
    return data;
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  ADMIN / LEAGUE SETTINGS
// ══════════════════════════════════════════════════════════════════════════
export const adminAPI = {
  getDashboard: async () => {
    const [teamsRes, playersRes, bidsRes] = await Promise.all([
      supabase.from('teams').select('id, name, remaining_purse, initial_purse'),
      supabase.from('players').select('id, status'),
      supabase.from('bids').select('id').limit(1),
    ]);
    return {
      teams: teamsRes.data || [],
      players: playersRes.data || [],
      totalBids: bidsRes.data?.length || 0,
    };
  },
  getLeague: async () => {
    const { data, error } = await supabase.from('league_settings').select('*').limit(1).single();
    if (error && error.code === 'PGRST116') return {};
    sbThrow(error);
    return data;
  },
  updateLeague: async (settingsData) => {
    const { data, error } = await supabase
      .from('league_settings')
      .upsert(settingsData)
      .select()
      .single();
    sbThrow(error);
    return data;
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  AUTH API (kept for compatibility — actual auth uses AuthContext/Supabase)
// ══════════════════════════════════════════════════════════════════════════
export const authAPI = {
  // These are no-ops in Supabase mode; AuthContext handles login/logout.
  login: async (credentials) => {
    throw new Error('Use AuthContext.login() instead of authAPI.login()');
  },
  me: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },
  getUsers: async () => {
    const { data, error } = await supabase.from('profiles').select('*');
    sbThrow(error);
    return data;
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  REPORTS — CSV downloads from Supabase data
// ══════════════════════════════════════════════════════════════════════════
function downloadCSV(rows, filename) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
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
    const { data } = await supabase.from('teams').select('*');
    downloadCSV(data, 'teams.csv');
  },
  downloadPlayersCSV: async () => {
    const { data } = await supabase.from('players').select('*');
    downloadCSV(data, 'players.csv');
  },
  downloadFinancialCSV: async () => {
    const { data } = await supabase.from('teams').select('id, name, initial_purse, remaining_purse');
    downloadCSV(data, 'financial.csv');
  },
  downloadSummaryCSV: async () => {
    const { data } = await supabase.from('bids').select('*, player:players(name), team:teams(name)');
    downloadCSV(data, 'auction-summary.csv');
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  AUDIT LOG
// ══════════════════════════════════════════════════════════════════════════
export const auditAPI = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false });
    if (error && error.code === '42P01') return []; // table doesn't exist yet
    sbThrow(error);
    return data;
  },
  reverseSale: async (purchaseId, reason) => {
    const { data, error } = await supabase
      .from('audit_log')
      .update({ reversed: true, reversal_reason: reason })
      .eq('id', purchaseId)
      .select()
      .single();
    sbThrow(error);
    return data;
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  AWARDS & BADGES
// ══════════════════════════════════════════════════════════════════════════
export const awardsAPI = {
  getAwards: async () => {
    const { data, error } = await supabase.from('awards').select('*');
    if (error && error.code === '42P01') return [];
    sbThrow(error);
    return data;
  },
  saveAward: async (awardData) => {
    const { data, error } = await supabase.from('awards').upsert(awardData).select().single();
    sbThrow(error);
    return data;
  },
  getBadges: async () => {
    const { data, error } = await supabase.from('badges').select('*');
    if (error && error.code === '42P01') return [];
    sbThrow(error);
    return data;
  },
  createBadge: async (badgeData) => {
    const { data, error } = await supabase.from('badges').insert(badgeData).select().single();
    sbThrow(error);
    return data;
  },
  assignPlayerBadge: async (playerId, badgeName, action = 'add') => {
    const { data: player } = await supabase.from('players').select('badges').eq('id', playerId).single();
    let badges = player?.badges ? player.badges.split(',').filter(Boolean) : [];
    if (action === 'add' && !badges.includes(badgeName)) badges.push(badgeName);
    if (action === 'remove') badges = badges.filter(b => b !== badgeName);
    const { data, error } = await supabase.from('players').update({ badges: badges.join(',') }).eq('id', playerId).select().single();
    sbThrow(error);
    return data;
  },
  fixTeamPurse: async (teamId, initial_purse) => {
    const { data, error } = await supabase.from('teams').update({ initial_purse, remaining_purse: initial_purse }).eq('id', teamId).select().single();
    sbThrow(error);
    return data;
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  SPECTATOR CHAT
// ══════════════════════════════════════════════════════════════════════════
export const spectatorAPI = {
  getComments: async () => {
    const { data, error } = await supabase
      .from('spectator_comments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error && error.code === '42P01') return [];
    sbThrow(error);
    return data;
  },
  postComment: async (commentData) => {
    const { data, error } = await supabase.from('spectator_comments').insert(commentData).select().single();
    sbThrow(error);
    return data;
  },
};

// ── Supabase Realtime helper (for AuctionContext) ──────────────────────────
export function subscribeToAuction(callback) {
  return supabase
    .channel('public:auction_sessions')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'auction_sessions' },
      (payload) => callback(payload.new || payload.old)
    )
    .subscribe();
}

export default { teamsAPI, playersAPI, auctionAPI, adminAPI, authAPI };

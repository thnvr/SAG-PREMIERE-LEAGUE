/**
 * api.js — Central data-access layer with Supabase integration and offline fallback.
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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

// Default initial teams to prevent empty state
export const DEFAULT_TEAMS = [
  {
    id: 'team-alpha',
    name: 'SAAG STRIKERS',
    short_name: 'STRIKERS',
    primary_color: '#ff6b35',
    logo_url: '',
    initial_purse: 200000000,
    remaining_purse: 200000000,
  },
  {
    id: 'team-bravo',
    name: 'SAAG UNITED',
    short_name: 'UNITED',
    primary_color: '#4ecdc4',
    logo_url: '',
    initial_purse: 200000000,
    remaining_purse: 200000000,
  },
  {
    id: 'team-charlie',
    name: 'SAAG FC',
    short_name: 'SAAGFC',
    primary_color: '#45b7d1',
    logo_url: '',
    initial_purse: 200000000,
    remaining_purse: 200000000,
  },
];

// ══════════════════════════════════════════════════════════════════════════
//  TEAMS
// ══════════════════════════════════════════════════════════════════════════
export const teamsAPI = {
  getAll: async () => {
    if (!isSupabaseConfigured) return DEFAULT_TEAMS;
    try {
      const { data, error } = await supabase.from('teams').select('*').order('name');
      if (error || !data || data.length === 0) return DEFAULT_TEAMS;
      return data;
    } catch {
      return DEFAULT_TEAMS;
    }
  },
  getById: async (id) => {
    if (!isSupabaseConfigured) return DEFAULT_TEAMS.find(t => t.id === id) || null;
    try {
      const { data, error } = await supabase.from('teams').select('*').eq('id', id).single();
      if (error) return DEFAULT_TEAMS.find(t => t.id === id) || null;
      return data;
    } catch {
      return DEFAULT_TEAMS.find(t => t.id === id) || null;
    }
  },
  create: async (teamData) => {
    const { data, error } = await supabase.from('teams').insert(teamData).select().single();
    if (error) throw new Error(error.message);
    return data;
  },
  update: async (id, teamData) => {
    const { data, error } = await supabase.from('teams').update(teamData).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  },
  getSquad: async (id) => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', id)
        .eq('status', 'sold')
        .order('name');
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  PLAYERS
// ══════════════════════════════════════════════════════════════════════════
export const playersAPI = {
  getAll: async (params = {}) => {
    if (!isSupabaseConfigured) return [];
    try {
      let query = supabase.from('players').select('*');
      if (params.status) query = query.eq('status', params.status);
      if (params.team_id) query = query.eq('team_id', params.team_id);
      if (params.position) query = query.eq('position', params.position);
      if (params.search) query = query.ilike('name', `%${params.search}%`);
      query = query.order('name');
      const { data, error } = await query;
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  },
  getById: async (id) => {
    try {
      const { data, error } = await supabase.from('players').select('*').eq('id', id).single();
      if (error) return null;
      return data;
    } catch {
      return null;
    }
  },
  create: async (playerData) => {
    const { data, error } = await supabase.from('players').insert(playerData).select().single();
    if (error) throw new Error(error.message);
    return data;
  },
  update: async (id, playerData) => {
    const { data, error } = await supabase.from('players').update(playerData).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  },
  updateShortlist: async (playerIds, isShortlisted = true) => {
    const { error } = await supabase
      .from('players')
      .update({ is_shortlisted: isShortlisted })
      .in('id', playerIds);
    if (error) throw new Error(error.message);
    return { success: true };
  },
  uploadPhoto: async (file, playerId) => {
    const ext = file.name.split('.').pop();
    const path = `players/${playerId || Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('player-photos')
      .upload(path, file, { upsert: true });
    if (uploadError) throw new Error(uploadError.message);
    const { data } = supabase.storage.from('player-photos').getPublicUrl(path);
    return { url: data.publicUrl };
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  AUCTION
// ══════════════════════════════════════════════════════════════════════════
export const auctionAPI = {
  getCurrentState: async () => {
    if (!isSupabaseConfigured) return null;
    try {
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
      if (error) return null;
      return data;
    } catch {
      return null;
    }
  },
  upsertSession: async (sessionData) => {
    const { data, error } = await supabase
      .from('auction_sessions')
      .upsert(sessionData, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
  placeBid: async (playerId, teamId, amount) => {
    const { data, error } = await supabase
      .from('bids')
      .insert({ player_id: playerId, team_id: teamId, amount })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
  getHistory: async (params = {}) => {
    if (!isSupabaseConfigured) return [];
    try {
      let query = supabase
        .from('bids')
        .select(`*, player:players(name, position), team:teams(name, short_name)`)
        .order('created_at', { ascending: false });
      if (params.player_id) query = query.eq('player_id', params.player_id);
      if (params.team_id) query = query.eq('team_id', params.team_id);
      const { data, error } = await query;
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  ADMIN / LEAGUE SETTINGS
// ══════════════════════════════════════════════════════════════════════════
export const adminAPI = {
  getDashboard: async () => {
    try {
      const [teamsRes, playersRes, bidsRes] = await Promise.all([
        supabase.from('teams').select('id, name, remaining_purse, initial_purse'),
        supabase.from('players').select('id, status'),
        supabase.from('bids').select('id').limit(1),
      ]);
      return {
        teams: teamsRes.data || DEFAULT_TEAMS,
        players: playersRes.data || [],
        totalBids: bidsRes.data?.length || 0,
      };
    } catch {
      return { teams: DEFAULT_TEAMS, players: [], totalBids: 0 };
    }
  },
  getLeague: async () => {
    try {
      const { data, error } = await supabase.from('league_settings').select('*').limit(1).single();
      if (error) return {};
      return data || {};
    } catch {
      return {};
    }
  },
  updateLeague: async (settingsData) => {
    const { data, error } = await supabase.from('league_settings').upsert(settingsData).select().single();
    if (error) throw new Error(error.message);
    return data;
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  AUTH API
// ══════════════════════════════════════════════════════════════════════════
export const authAPI = {
  login: async () => {
    throw new Error('Use AuthContext.login() instead');
  },
  me: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch {
      return null;
    }
  },
  getUsers: async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  REPORTS
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
    try {
      const { data, error } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  },
  reverseSale: async (purchaseId, reason) => {
    const { data, error } = await supabase.from('audit_log').update({ reversed: true, reversal_reason: reason }).eq('id', purchaseId).select().single();
    if (error) throw new Error(error.message);
    return data;
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  AWARDS & BADGES
// ══════════════════════════════════════════════════════════════════════════
export const awardsAPI = {
  getAwards: async () => {
    try {
      const { data, error } = await supabase.from('awards').select('*');
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  },
  saveAward: async (awardData) => {
    const { data, error } = await supabase.from('awards').upsert(awardData).select().single();
    if (error) throw new Error(error.message);
    return data;
  },
  getBadges: async () => {
    try {
      const { data, error } = await supabase.from('badges').select('*');
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  },
  createBadge: async (badgeData) => {
    const { data, error } = await supabase.from('badges').insert(badgeData).select().single();
    if (error) throw new Error(error.message);
    return data;
  },
  assignPlayerBadge: async (playerId, badgeName, action = 'add') => {
    const { data: player } = await supabase.from('players').select('badges').eq('id', playerId).single();
    let badges = player?.badges ? player.badges.split(',').filter(Boolean) : [];
    if (action === 'add' && !badges.includes(badgeName)) badges.push(badgeName);
    if (action === 'remove') badges = badges.filter(b => b !== badgeName);
    const { data, error } = await supabase.from('players').update({ badges: badges.join(',') }).eq('id', playerId).select().single();
    if (error) throw new Error(error.message);
    return data;
  },
  fixTeamPurse: async (teamId, initial_purse) => {
    const { data, error } = await supabase.from('teams').update({ initial_purse, remaining_purse: initial_purse }).eq('id', teamId).select().single();
    if (error) throw new Error(error.message);
    return data;
  },
};

// ══════════════════════════════════════════════════════════════════════════
//  SPECTATOR CHAT
// ══════════════════════════════════════════════════════════════════════════
export const spectatorAPI = {
  getComments: async () => {
    try {
      const { data, error } = await supabase.from('spectator_comments').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  },
  postComment: async (commentData) => {
    const { data, error } = await supabase.from('spectator_comments').insert(commentData).select().single();
    if (error) throw new Error(error.message);
    return data;
  },
};

export default { teamsAPI, playersAPI, auctionAPI, adminAPI, authAPI };

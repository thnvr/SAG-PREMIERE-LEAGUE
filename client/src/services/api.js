const API_BASE = '/api';

export function formatMoney(paise) {
  if (paise == null || isNaN(paise)) return '₹0';
  return '₹' + Math.round(paise / 100).toLocaleString('en-IN');
}

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

export async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !endpoint.includes('/auth/login')) {
    setToken(null);
    setStoredUser(null);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message || data?.error || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  get: (endpoint) => apiFetch(endpoint, { method: 'GET' }),
  post: (endpoint, body) => apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => apiFetch(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint) => apiFetch(endpoint, { method: 'DELETE' }),
  upload: (endpoint, formData) => apiFetch(endpoint, { method: 'POST', body: formData }),
};

// ========== AUTH ==========
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  me: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
};

// ========== ADMIN & LEAGUE ==========
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getLeague: () => api.get('/admin/league'),
  updateLeague: (data) => api.put('/admin/league', data),
};

// ========== TEAMS ==========
export const teamsAPI = {
  getAll: () => api.get('/teams'),
  getById: (id) => api.get(`/teams/${id}`),
  create: (data) => api.post('/teams', data),
  update: (id, data) => api.put(`/teams/${id}`, data),
  delete: (id) => api.delete(`/teams/${id}`),
  getSquad: (id) => api.get(`/teams/${id}/squad`),
};

// ========== PLAYERS ==========
export const playersAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value != null && value !== '') query.append(key, value);
    });
    const qs = query.toString();
    return api.get(`/players${qs ? `?${qs}` : ''}`);
  },
  getById: (id) => api.get(`/players/${id}`),
  create: (data) => {
    if (data instanceof FormData) return api.upload('/players', data);
    return api.post('/players', data);
  },
  update: (id, data) => {
    if (data instanceof FormData) return api.upload(`/players/${id}`, data);
    return api.put(`/players/${id}`, data);
  },
  delete: (id) => api.delete(`/players/${id}`),
  importCSV: (csvData) => api.post('/players/import', { csvData }),
  updateShortlist: (playerIds, isShortlisted = 1) => api.put('/players/shortlist', { playerIds, isShortlisted }),
  uploadPhoto: (file) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api.upload('/players/upload', formData);
  }
};

// ========== AUCTION ==========
export const auctionAPI = {
  getCurrentState: () => api.get('/auction/current'),
  nominate: (playerId, overrides = {}) => api.post(`/auction/nominate/${playerId}`, overrides),
  sold: () => api.post('/auction/sold'),
  unsold: () => api.post('/auction/unsold'),
  pause: () => api.post('/auction/pause-bidding'),
  resume: () => api.post('/auction/resume-bidding'),
  extend: (seconds = 15) => api.post('/auction/extend', { seconds }),
  skip: () => api.post('/auction/skip'),
  setIncrement: (increment) => api.post('/auction/increment', { increment }),
  manualBid: (teamId, amount) => api.post('/auction/manual-bid', { teamId, amount }),
  applyTaxDeduction: (data) => api.post('/auction/tax-deduction', data),
  kickPlayer: (data) => api.post('/auction/kick-player', data),
  getHistory: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value != null && value !== '') query.append(key, value);
    });
    const qs = query.toString();
    return api.get(`/auction/history${qs ? `?${qs}` : ''}`);
  },
  placeBid: (teamId, amount) => api.post('/bids', { teamId, amount }),
};

// ========== REPORTS ==========
export const reportsAPI = {
  downloadTeamsCSV: () => window.open(`${API_BASE}/reports/teams`, '_blank'),
  downloadPlayersCSV: () => window.open(`${API_BASE}/reports/players`, '_blank'),
  downloadFinancialCSV: () => window.open(`${API_BASE}/reports/financial`, '_blank'),
  downloadSummaryCSV: () => window.open(`${API_BASE}/reports/auction-summary`, '_blank'),
};

// ========== AUDIT LOG ==========
export const auditAPI = {
  getAll: () => api.get('/audit-log'),
  reverseSale: (purchaseId, reason) => api.post(`/audit-log/reverse-sale/${purchaseId}`, { reason }),
};

// ========== TOURNAMENT AWARDS, BADGES & PURSE FIX ==========
export const awardsAPI = {
  getAwards: () => api.get('/admin/awards'),
  saveAward: (data) => api.post('/admin/awards', data),
  getBadges: () => api.get('/admin/badges'),
  createBadge: (data) => api.post('/admin/badges', data),
  assignPlayerBadge: (playerId, badgeName, action = 'add') => api.post(`/admin/players/${playerId}/badge`, { badgeName, action }),
  fixTeamPurse: (teamId, initial_purse) => api.post(`/admin/teams/${teamId}/fix-purse`, { initial_purse }),
};

// ========== SPECTATOR CHAT & COMMENTS ==========
export const spectatorAPI = {
  getComments: () => api.get('/spectator/comments'),
  postComment: (data) => api.post('/spectator/comments', data),
};

export default api;

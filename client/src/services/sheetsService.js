/**
 * sheetsService.js — Google Sheets Real-Time Backend Service for SAG Premier League.
 * Powers AuctionContext, Live Auction, Captains, and Spectators via Google Apps Script Web App.
 */
import { DEFAULT_PLAYERS } from '../data/defaultPlayers';

export const SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbzOeROKyz4OTqNtlT7zbxNGw0sPlX4OgyzXX3g8a6OUxk78Vv1DxW4aWk8rSCMUZg6tmA/exec";

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

const STORAGE_KEY_STATE = 'sag_sheets_live_state';
const STORAGE_KEY_PLAYERS = 'sag_sheets_players';
const STORAGE_KEY_TEAMS = 'sag_sheets_teams';

function getCachedLiveState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getCachedPlayers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLAYERS);
    return raw ? JSON.parse(raw) : DEFAULT_PLAYERS;
  } catch {
    return DEFAULT_PLAYERS;
  }
}

function getCachedTeams() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEAMS);
    return raw ? JSON.parse(raw) : DEFAULT_TEAMS;
  } catch {
    return DEFAULT_TEAMS;
  }
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
    } catch {
      // Returned HTML or not ready yet, return local cache
    }
  } catch (err) {
    console.warn('[SheetsService] fetchFullAuctionState network error:', err.message);
  }

  // Graceful local cache fallback
  return {
    liveState: getCachedLiveState() || {
      playerId: '',
      playerName: '',
      currentBid: 0,
      highestBidder: 'No Bids Yet',
      leadingTeamId: '',
      status: 'idle'
    },
    players: getCachedPlayers(),
    teams: getCachedTeams(),
  };
}

/**
 * Dispatches an action (placeBid, pushPlayer, markSold, markUnsold) to Google Sheets
 */
export async function callSheetsAPI(payload) {
  // Optimistically update local cache for sub-second UI responsiveness
  try {
    if (payload.action === 'pushPlayer' && payload.player) {
      const live = {
        playerId: payload.player.id || '',
        playerName: payload.player.name || '',
        currentBid: payload.player.base_price || payload.player.basePrice || 50000,
        highestBidder: 'No Bids Yet',
        leadingTeamId: '',
        status: 'active',
        player: payload.player
      };
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(live));
    } else if (payload.action === 'placeBid') {
      const current = getCachedLiveState() || {};
      const updated = {
        ...current,
        currentBid: payload.bidAmount,
        highestBidder: payload.teamName || 'Leading Team',
        leadingTeamId: payload.teamId,
        status: 'active'
      };
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(updated));
    } else if (payload.action === 'markSold') {
      const current = getCachedLiveState() || {};
      const updated = {
        ...current,
        status: 'sold',
        winningTeamId: payload.winningTeamId,
        finalAmount: payload.finalAmount
      };
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(updated));
    } else if (payload.action === 'markUnsold') {
      const current = getCachedLiveState() || {};
      const updated = {
        ...current,
        status: 'unsold'
      };
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(updated));
    }
  } catch {}

  // Post to Google Apps Script Web App
  try {
    const res = await fetch(SHEETS_API_URL, {
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

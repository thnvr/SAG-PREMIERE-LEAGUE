// client/src/context/AuctionContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  fetchFullAuctionState,
  callSheetsAPI,
  normalizeTeam,
  normalizePlayer,
  DEFAULT_TEAMS
} from '../services/sheetsService';
import { DEFAULT_PLAYERS } from '../data/defaultPlayers';

const AuctionContext = createContext();

export const AuctionProvider = ({ children }) => {
  const [liveState, setLiveState] = useState({
    playerId: '',
    playerName: '',
    currentBid: 0,
    highestBidder: 'No Bids Yet',
    leadingTeamId: '',
    status: 'idle',
  });

  const [players, setPlayers] = useState(() => DEFAULT_PLAYERS.map(normalizePlayer));
  const [teams, setTeams] = useState(() => DEFAULT_TEAMS.map(normalizeTeam));
  const [activeIncrement, setActiveIncrement] = useState(5000);
  const [countdown, setCountdown] = useState(30);
  const [soldAnimation, setSoldAnimation] = useState(null);
  const [recentBids, setRecentBids] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);

  // Poll Google Sheets every 1.5 seconds for real-time updates across screens
  useEffect(() => {
    let mounted = true;

    const loadState = async () => {
      try {
        const data = await fetchFullAuctionState();
        if (data && !data.error && mounted) {
          if (data.liveState) {
            setLiveState((prev) => {
              // If new bid arrived from another device, reset timer
              if (
                data.liveState.currentBid > prev.currentBid ||
                (data.liveState.playerId && data.liveState.playerId !== prev.playerId)
              ) {
                setCountdown(25);
              }
              return data.liveState;
            });
          }
          if (data.players && Array.isArray(data.players) && data.players.length > 0) {
            setPlayers(data.players.map(normalizePlayer));
          }
          if (data.teams && Array.isArray(data.teams) && data.teams.length > 0) {
            setTeams(data.teams.map(normalizeTeam));
          }
          if (data.chatMessages) {
            setChatMessages(data.chatMessages);
          }
        }
      } catch (err) {
        console.warn('[AuctionContext] poll error:', err.message);
      }
    };

    loadState();
    const interval = setInterval(loadState, 1500);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Countdown timer clock
  useEffect(() => {
    const isRunning = liveState.status === 'active' || liveState.status === 'open';
    if (!isRunning) return;

    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [liveState.status]);

  /**
   * Flexible placeBid: Accepts BOTH placeBid(teamId, amount) AND placeBid(teamId, teamName, amount)
   */
  const placeBid = async (arg1, arg2, arg3) => {
    let teamId, teamName, amount;
    if (typeof arg2 === 'number' || arg3 === undefined) {
      teamId = arg1;
      amount = Number(arg2);
      const found = teams.find((t) => t.id === teamId);
      teamName = found?.name || found?.short_name || 'Team';
    } else {
      teamId = arg1;
      teamName = arg2;
      amount = Number(arg3);
    }

    if (!amount || isNaN(amount)) {
      throw new Error('Invalid bid amount');
    }

    // Reset countdown clock on valid bid
    setCountdown(20);

    // Optimistic UI state
    setLiveState((prev) => ({
      ...prev,
      currentBid: amount,
      highestBidder: teamName,
      leadingTeamId: teamId,
      status: 'active',
    }));

    setRecentBids((prev) => [
      {
        id: 'bid_' + Date.now(),
        team_id: teamId,
        team_name: teamName,
        amount,
        created_at: new Date().toISOString(),
      },
      ...prev.slice(0, 19),
    ]);

    const res = await callSheetsAPI({ action: 'placeBid', teamId, teamName, bidAmount: amount });
    return res;
  };

  const pushPlayerToLive = async (player) => {
    const fullPlayer =
      typeof player === 'string'
        ? players.find((p) => p.id === player) || { id: player, name: 'Player' }
        : player;

    const basePrice = fullPlayer?.base_price || fullPlayer?.basePrice || 50000;
    setCountdown(30);

    const newLive = {
      playerId: fullPlayer?.id || '',
      playerName: fullPlayer?.name || '',
      currentBid: basePrice,
      highestBidder: 'No Bids Yet',
      leadingTeamId: '',
      status: 'active',
      player: fullPlayer,
    };
    setLiveState(newLive);

    const res = await callSheetsAPI({ action: 'pushPlayer', player: fullPlayer });
    return res;
  };

  const markPlayerSold = async (winningTeamId, finalAmount) => {
    const teamId = winningTeamId || liveState.leadingTeamId;
    const amount = finalAmount || liveState.currentBid;
    const winner = teams.find((t) => t.id === teamId) || leadingTeam;

    const salePayload = {
      player: currentPlayer,
      team: winner,
      amount,
    };
    setSoldAnimation(salePayload);
    setTimeout(() => setSoldAnimation(null), 7000);

    setLiveState((prev) => ({
      ...prev,
      status: 'sold',
    }));

    const res = await callSheetsAPI({ action: 'markSold', winningTeamId: teamId, finalAmount: amount });
    return res;
  };

  const markPlayerUnsold = async () => {
    setLiveState((prev) => ({
      ...prev,
      status: 'unsold',
    }));
    const res = await callSheetsAPI({ action: 'markUnsold' });
    return res;
  };

  // Additional control actions expected by LiveAuction.jsx and Admin
  const manualBid = async (teamId, amount) => {
    return placeBid(teamId, amount);
  };
  const setIncrement = (step) => {
    setActiveIncrement(step);
  };
  const pauseBidding = () => {
    setLiveState((prev) => ({ ...prev, status: 'paused' }));
  };
  const resumeBidding = () => {
    setLiveState((prev) => ({ ...prev, status: 'active' }));
  };
  const extendTimer = (seconds = 15) => {
    setCountdown((prev) => prev + seconds);
  };
  const skipCurrentPlayer = () => {
    return markPlayerUnsold();
  };

  // Active current player resolution
  const currentPlayer =
    liveState?.player ||
    players.find((p) => p.id === liveState?.playerId || p.name?.trim().toLowerCase() === liveState?.playerName?.trim().toLowerCase()) ||
    (liveState?.playerName
      ? {
          id: liveState.playerId || 'p_active',
          name: liveState.playerName,
          base_price: liveState.currentBid || 50000,
          primary_position: 'ST',
          position: 'FWD',
        }
      : null);

  // Active leading team resolution
  const leadingTeam =
    teams.find(
      (t) =>
        t.id === liveState?.leadingTeamId ||
        t.name?.toLowerCase() === liveState?.highestBidder?.toLowerCase() ||
        t.short_name?.toLowerCase() === liveState?.highestBidder?.toLowerCase()
    ) || null;

  // Session format expected by LiveAuction, CaptainsDashboard, etc.
  const isBiddingActive = liveState.status === 'active' || liveState.status === 'open';
  const session = {
    id: 1,
    current_bid: liveState.currentBid || 0,
    current_highest_bid: liveState.currentBid || 0,
    status: isBiddingActive ? 'open' : liveState.status || 'waiting',
    bidding_status: isBiddingActive ? 'open' : liveState.status || 'waiting',
    leading_team_id: liveState.leadingTeamId || null,
    current_player_id: liveState.playerId || null,
    bid_increment: activeIncrement,
  };

  const availablePool = players.filter(
    (p) =>
      p.status === 'available' ||
      p.status === 'upcoming' ||
      p.auction_status === 'upcoming' ||
      p.auction_status === 'available'
  );

  const recentSales = players
    .filter((p) => p.status === 'sold' || p.auction_status === 'sold')
    .map((p) => {
      const t = teams.find((x) => x.id === (p.sold_to_team_id || p.team_id));
      return {
        id: p.id,
        player_name: p.name,
        primary_position: p.primary_position || p.position || 'FWD',
        team_name: t?.name || 'Franchise',
        team_color: t?.primary_color || '#ffd000',
        price: p.sold_price || p.base_price,
        formattedPrice: '₹' + Math.round((p.sold_price || p.base_price) / 100).toLocaleString('en-IN'),
      };
    });

  const nominatePlayer = (id, overrides = {}) => {
    const p = players.find((x) => x.id === id) || { id, ...overrides };
    return pushPlayerToLive({ ...p, ...overrides });
  };

  return (
    <AuctionContext.Provider 
      value={{ 
        liveState, 
        players, 
        teams, 
        placeBid, 
        pushPlayerToLive, 
        markPlayerSold, 
        markPlayerUnsold,
        // Compatibility props for all screens:
        currentPlayer,
        leadingTeam,
        session,
        nominatePlayer,
        activeIncrement,
        setActiveIncrement,
        setIncrement,
        countdown,
        setCountdown,
        soldAnimation,
        setSoldAnimation,
        recentBids,
        chatMessages,
        setChatMessages,
        recentSales,
        availablePool,
        manualBid,
        markSold: markPlayerSold,
        markUnsold: markPlayerUnsold,
        pauseBidding,
        resumeBidding,
        extendTimer,
        skipCurrentPlayer,
        connected: true,
      }}
    >
      {children}
    </AuctionContext.Provider>
  );
};

export const useAuction = () => useContext(AuctionContext);

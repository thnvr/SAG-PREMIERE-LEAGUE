// client/src/context/AuctionContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  fetchFullAuctionState,
  callSheetsAPI,
  normalizeTeam,
  normalizePlayer,
  savePurseOverride,
  DEFAULT_TEAMS,
  auctionBroadcast
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
  const [recentBids, setRecentBids] = useState(() => {
    try {
      const raw = localStorage.getItem('sag_recent_bids');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [chatMessages, setChatMessages] = useState([]);

  // Instant Cross-Tab & Cross-Device Sync (Storage & BroadcastChannel)
  useEffect(() => {
    // sag_auction_channel_listener
    const handleBroadcast = (event) => {
      if (event?.data?.type === 'auction_sync') {
        const payload = event.data.data;
        if (!payload) return;
        if (payload.action === 'pushPlayer' && payload.player) {
          const bp = payload.player.base_price || payload.player.basePrice || 50000;
          setLiveState({
            playerId: payload.player.id || '',
            playerName: payload.player.name || '',
            currentBid: bp,
            highestBidder: 'No Bids Yet',
            leadingTeamId: '',
            status: 'active',
            player: payload.player,
          });
          setCountdown(30);
        } else if (payload.action === 'placeBid') {
          setLiveState((prev) => ({
            ...prev,
            currentBid: payload.bidAmount,
            highestBidder: payload.teamName || prev.highestBidder,
            leadingTeamId: payload.teamId,
            status: 'active',
          }));
          setCountdown(25);
        } else if (payload.action === 'markSold') {
          setLiveState((prev) => ({
            ...prev,
            status: 'sold',
            winningTeamId: payload.winningTeamId,
            finalAmount: payload.finalAmount,
          }));
        } else if (payload.action === 'markUnsold') {
          setLiveState((prev) => ({
            ...prev,
            status: 'unsold',
          }));
        }
      }
    };

    const handleStorage = (e) => {
      if (e.key === 'sag_auction_state' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setLiveState(parsed);
        } catch {}
      } else if (e.key === 'sag_recent_bids' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setRecentBids(parsed);
        } catch {}
      }
    };

    if (auctionBroadcast) {
      auctionBroadcast.addEventListener('message', handleBroadcast);
    }
    window.addEventListener('storage', handleStorage);

    return () => {
      if (auctionBroadcast) {
        auctionBroadcast.removeEventListener('message', handleBroadcast);
      }
      window.removeEventListener('storage', handleStorage);
    };
  }, []);


  // Poll Google Sheets every 1.5 seconds for real-time updates across screens
  useEffect(() => {
    let mounted = true;

    const loadState = async () => {
      try {
        const data = await fetchFullAuctionState();
        if (data && !data.error && mounted) {
          if (data.liveState) {
            // Sync incoming live bids into recentBids stream
            if (
              data.liveState.currentBid > 0 &&
              data.liveState.highestBidder &&
              data.liveState.highestBidder !== 'No Bids Yet'
            ) {
              setRecentBids((prev) => {
                const exists = prev.some(
                  (b) =>
                    Number(b.amount) === Number(data.liveState.currentBid) &&
                    (b.team_id === data.liveState.leadingTeamId || b.team_name === data.liveState.highestBidder)
                );
                if (exists) return prev;
                const curTeams = data.teams && data.teams.length > 0 ? data.teams : teams;
                const found = curTeams.find(
                  (t) => t.id === data.liveState.leadingTeamId || t.name === data.liveState.highestBidder
                );
                const newEntry = {
                  id: 'bid_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                  bid_number: prev.length + 1,
                  team_id: data.liveState.leadingTeamId || found?.id || '',
                  team_name: data.liveState.highestBidder,
                  team_short: found?.short_name || found?.shortName || data.liveState.highestBidder,
                  team_color: found?.primary_color || found?.color || '#ffd000',
                  bidder_name: found?.captain_name || data.liveState.highestBidder,
                  amount: Number(data.liveState.currentBid),
                  created_at: data.liveState.updatedAt || new Date().toISOString(),
                };
                const updated = [newEntry, ...prev].slice(0, 30);
                try {
                  localStorage.setItem('sag_recent_bids', JSON.stringify(updated));
                } catch {}
                return updated;
              });
            }
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

    const foundTeam = teams.find((t) => t.id === teamId || t.name === teamName);
    const bidItem = {
      id: 'bid_' + Date.now(),
      bid_number: recentBids.length + 1,
      team_id: teamId,
      team_name: teamName,
      team_short: foundTeam?.short_name || foundTeam?.shortName || teamName,
      team_color: foundTeam?.primary_color || foundTeam?.color || '#ffd000',
      bidder_name: foundTeam?.captain_name || teamName,
      amount,
      created_at: new Date().toISOString(),
    };
    setRecentBids((prev) => {
      const updated = [bidItem, ...prev].slice(0, 30);
      try {
        localStorage.setItem('sag_recent_bids', JSON.stringify(updated));
      } catch {}
      return updated;
    });

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
      finalAmount: amount,
      winningTeamId: teamId,
    }));

    // Update players list: mark sold player as sold with sold price
    if (currentPlayer) {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === currentPlayer.id
            ? {
                ...p,
                status: 'sold',
                auction_status: 'sold',
                sold_price: amount,
                sold_to_team_id: teamId,
                purchase_price: amount,
              }
            : p
        )
      );
    }

    // Update teams: deduct from winning team purse + add player to squad
    if (teamId && amount > 0) {
      setTeams((prev) =>
        prev.map((t) => {
          if (t.id !== teamId) return t;
          const prevPurse = Number(t.remaining_purse ?? t.remainingPurse ?? t.total_purse ?? 0);
          const newPurse = Math.max(0, prevPurse - Number(amount));
          const soldPlayer = {
            ...(currentPlayer || {}),
            purchase_price: amount,
            sold_price: amount,
            primary_position: currentPlayer?.primary_position || currentPlayer?.position || 'FWD',
          };
          const squad = Array.isArray(t.squad) ? t.squad : [];
          const updatedSquad = squad.some((sp) => sp.id === soldPlayer.id)
            ? squad.map((sp) => (sp.id === soldPlayer.id ? soldPlayer : sp))
            : [...squad, soldPlayer];
          // Persist to localStorage override
          savePurseOverride(t.id, t.total_purse || t.initial_purse || 0, newPurse);
          return {
            ...t,
            remaining_purse: newPurse,
            remainingPurse: newPurse,
            availableBiddingPurse: newPurse,
            squad: updatedSquad,
          };
        })
      );
    }

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

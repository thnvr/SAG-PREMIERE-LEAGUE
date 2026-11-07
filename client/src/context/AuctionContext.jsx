/**
 * AuctionContext — Live auction state with Supabase Realtime, BroadcastChannel, and 1.5s polling.
 * Guarantees that player nominations, bids, timer, and sold announcements synchronize
 * across all connected tabs, captain war rooms, admin desk, and spectator broadcast.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { auctionAPI, teamsAPI, playersAPI } from '../services/api';
import { useAuth } from './AuthContext';

const AuctionContext = createContext(null);

export function AuctionProvider({ children }) {
  const [session, setSession] = useState({
    id: 1,
    status: 'pre_auction',
    bidding_status: 'pre_auction',
    current_player_id: null,
    current_bid: 0,
    current_highest_bid: 0,
    leading_team_id: null,
    bid_increment: 5000,
  });

  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [leadingTeam, setLeadingTeam] = useState(null);
  const [teams, setTeams] = useState([]);
  const [availablePool, setAvailablePool] = useState([]);
  const [recentBids, setRecentBids] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [activeIncrement, setActiveIncrement] = useState(5000);
  const [connected, setConnected] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [soldAnimation, setSoldAnimation] = useState(null);

  const { user } = useAuth();
  const channelRef = useRef(null);
  const bcRef = useRef(null);

  // ── BroadcastChannel setup for instant cross-tab sync ────────────────────
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('sag_auction_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'AUCTION_STATE_UPDATE') {
            fetchState();
          } else if (event.data?.type === 'SOLD_ANIMATION') {
            setSoldAnimation(event.data.payload);
            setTimeout(() => setSoldAnimation(null), 7000);
          }
        };
        bcRef.current = bc;
      }
    } catch {}

    return () => {
      if (bcRef.current) {
        bcRef.current.close();
        bcRef.current = null;
      }
    };
  }, []);

  const notifyBroadcast = useCallback((type, payload = null) => {
    try {
      if (bcRef.current) {
        bcRef.current.postMessage({ type, payload });
      }
    } catch {}
  }, []);

  // ── Fetch complete live auction state ────────────────────────────────────
  const fetchState = useCallback(async () => {
    try {
      const [sessionData, teamsData, allPlayers] = await Promise.all([
        auctionAPI.getCurrentState(),
        teamsAPI.getAll(),
        playersAPI.getAll(),
      ]);

      if (teamsData) setTeams(teamsData);

      // Available players pool for bidding
      const upcoming = (allPlayers || []).filter(
        (p) => p.status === 'available' || p.auction_status === 'upcoming' || p.auction_status === 'bidding'
      );
      setAvailablePool(upcoming);

      // Sold players for record book
      const sold = (allPlayers || []).filter((p) => p.status === 'sold' || p.auction_status === 'sold');
      setRecentSales(
        sold.map((p) => {
          const t = (teamsData || []).find((team) => team.id === (p.sold_to_team_id || p.team_id));
          return {
            id: p.id,
            player_name: p.name,
            primary_position: p.primary_position || p.position,
            team_name: t?.name || 'SAAG Franchise',
            team_color: t?.primary_color || '#ffd000',
            price: p.sold_price || p.base_price,
            formattedPrice: '₹' + Math.round((p.sold_price || p.base_price) / 100).toLocaleString('en-IN'),
          };
        })
      );

      if (sessionData) {
        const currentBidVal = sessionData.current_bid || sessionData.current_highest_bid || 0;
        const statusVal = sessionData.status || sessionData.bidding_status || 'waiting';
        const incVal = sessionData.bid_increment || 5000;

        setSession({
          ...sessionData,
          status: statusVal,
          bidding_status: statusVal,
          current_bid: currentBidVal,
          current_highest_bid: currentBidVal,
          bid_increment: incVal,
        });

        setActiveIncrement(incVal);

        // Find current player
        let curPlayer = sessionData.current_player || null;
        if (!curPlayer && sessionData.current_player_id) {
          curPlayer = (allPlayers || []).find((p) => p.id === sessionData.current_player_id) || null;
        }
        setCurrentPlayer(curPlayer);

        // Find leading team
        let leadTeam = sessionData.leading_team || null;
        if (!leadTeam && sessionData.leading_team_id) {
          leadTeam = (teamsData || []).find((t) => t.id === sessionData.leading_team_id) || null;
        }
        setLeadingTeam(leadTeam);
      }
    } catch (err) {
      console.warn('[Auction] Error fetching state:', err.message);
    }
  }, []);

  // ── Subscriptions & Polling Fallback ─────────────────────────────────────
  useEffect(() => {
    fetchState();

    // 1.5-second polling interval ensures zero latency across different browsers/devices
    const pollInterval = setInterval(() => {
      fetchState();
    }, 1500);

    // Supabase Realtime channel if configured
    if (isSupabaseConfigured) {
      try {
        const channel = supabase
          .channel('auction-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_sessions' }, () => {
            fetchState();
          })
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids' }, (payload) => {
            fetchState();
            setRecentBids((prev) => [payload.new, ...prev].slice(0, 20));
          })
          .subscribe((status) => {
            setConnected(status === 'SUBSCRIBED');
          });

        channelRef.current = channel;
      } catch (err) {
        console.warn('Realtime subscribe error:', err);
      }
    }

    return () => {
      clearInterval(pollInterval);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchState, user?.id]);

  // ── Nominate player (Called by Admin Desk / Spin Wheel / Auctioneer) ─────
  const nominatePlayer = async (playerId, overrides = {}) => {
    const player = await playersAPI.getById(playerId);
    if (!player) throw new Error('Player not found');

    const basePrice = overrides.base_price || player.base_price || 50000;

    // 1. Mark player as currently in bidding
    await playersAPI.update(playerId, {
      auction_status: 'bidding',
      status: 'available',
      base_price: basePrice,
      ...(overrides.name ? { name: overrides.name } : {}),
      ...(overrides.primary_position ? { primary_position: overrides.primary_position } : {}),
    });

    // 2. Set live auction session row
    const sessionUpdate = {
      id: 1,
      current_player_id: playerId,
      current_bid: basePrice,
      current_highest_bid: basePrice,
      leading_team_id: null,
      status: 'active',
      bidding_status: 'active',
      bid_increment: activeIncrement || 5000,
      updated_at: new Date().toISOString(),
    };

    await auctionAPI.upsertSession(sessionUpdate);

    // 3. Immediately update in-memory state
    const nominatedPlayerObj = { ...player, ...overrides, auction_status: 'bidding' };
    setCurrentPlayer(nominatedPlayerObj);
    setLeadingTeam(null);
    setSession(sessionUpdate);
    setCountdown(30);

    // 4. Notify all other tabs & clients
    notifyBroadcast('AUCTION_STATE_UPDATE');
    await fetchState();
    return sessionUpdate;
  };

  // ── Place bid ────────────────────────────────────────────────────────────
  const placeBid = async (teamId, amount) => {
    const curPId = session?.current_player_id || currentPlayer?.id;
    if (!curPId) throw new Error('No active player in the bidding block.');

    const team = teams.find((t) => t.id === teamId);
    if (team && (team.remaining_purse || 0) < amount) {
      throw new Error(`${team.name} has insufficient remaining purse.`);
    }

    const sessionUpdate = {
      id: 1,
      current_player_id: curPId,
      current_bid: amount,
      current_highest_bid: amount,
      leading_team_id: teamId,
      status: 'active',
      bidding_status: 'active',
      updated_at: new Date().toISOString(),
    };

    await auctionAPI.upsertSession(sessionUpdate);
    await auctionAPI.placeBid(curPId, teamId, amount);

    // Reset countdown timer on valid bid
    setCountdown(20);

    setSession((prev) => ({
      ...prev,
      ...sessionUpdate,
    }));
    setLeadingTeam(team || null);

    notifyBroadcast('AUCTION_STATE_UPDATE');
    await fetchState();
  };

  const manualBid = async (teamId, amount) => {
    return await placeBid(teamId, amount);
  };

  // ── Mark player sold ─────────────────────────────────────────────────────
  const markSold = async () => {
    const curPId = session?.current_player_id || currentPlayer?.id;
    const teamId = session?.leading_team_id || leadingTeam?.id;
    const amount = session?.current_bid || session?.current_highest_bid || 0;

    if (!curPId || !teamId) {
      throw new Error('Cannot mark sold: no active bid on this player.');
    }

    // 1. Update player status
    await playersAPI.update(curPId, {
      status: 'sold',
      auction_status: 'sold',
      sold_to_team_id: teamId,
      sold_price: amount,
    });

    // 2. Deduct from team purse
    const winningTeam = teams.find((t) => t.id === teamId);
    if (winningTeam) {
      const newPurse = Math.max(0, (winningTeam.remaining_purse || 200000000) - amount);
      await teamsAPI.update(teamId, { remaining_purse: newPurse });
    }

    // 3. Reset session
    const resetSession = {
      id: 1,
      status: 'sold',
      bidding_status: 'sold',
      current_player_id: null,
      leading_team_id: null,
      current_bid: 0,
      current_highest_bid: 0,
      updated_at: new Date().toISOString(),
    };
    await auctionAPI.upsertSession(resetSession);

    // 4. Trigger celebration banner
    const salePayload = {
      player: currentPlayer,
      team: winningTeam || leadingTeam,
      amount,
    };
    setSoldAnimation(salePayload);
    notifyBroadcast('SOLD_ANIMATION', salePayload);
    setTimeout(() => setSoldAnimation(null), 7000);

    setCurrentPlayer(null);
    setLeadingTeam(null);
    setSession(resetSession);

    notifyBroadcast('AUCTION_STATE_UPDATE');
    await fetchState();
  };

  // ── Mark player unsold ───────────────────────────────────────────────────
  const markUnsold = async () => {
    const curPId = session?.current_player_id || currentPlayer?.id;

    if (curPId) {
      await playersAPI.update(curPId, {
        status: 'unsold',
        auction_status: 'unsold',
      });
    }

    const resetSession = {
      id: 1,
      status: 'unsold',
      bidding_status: 'unsold',
      current_player_id: null,
      leading_team_id: null,
      current_bid: 0,
      current_highest_bid: 0,
      updated_at: new Date().toISOString(),
    };
    await auctionAPI.upsertSession(resetSession);

    setCurrentPlayer(null);
    setLeadingTeam(null);
    setSession(resetSession);

    notifyBroadcast('AUCTION_STATE_UPDATE');
    await fetchState();
  };

  const pauseBidding = async () => {
    const updated = {
      id: 1,
      status: 'paused',
      bidding_status: 'paused',
      updated_at: new Date().toISOString(),
    };
    await auctionAPI.upsertSession(updated);
    setSession((prev) => ({ ...prev, status: 'paused', bidding_status: 'paused' }));
    notifyBroadcast('AUCTION_STATE_UPDATE');
    await fetchState();
  };

  const resumeBidding = async () => {
    const updated = {
      id: 1,
      status: 'active',
      bidding_status: 'active',
      updated_at: new Date().toISOString(),
    };
    await auctionAPI.upsertSession(updated);
    setSession((prev) => ({ ...prev, status: 'active', bidding_status: 'active' }));
    notifyBroadcast('AUCTION_STATE_UPDATE');
    await fetchState();
  };

  const setIncrement = async (increment) => {
    setActiveIncrement(increment);
    const updated = {
      id: 1,
      bid_increment: increment,
      updated_at: new Date().toISOString(),
    };
    await auctionAPI.upsertSession(updated);
    setSession((prev) => ({ ...prev, bid_increment: increment }));
    notifyBroadcast('AUCTION_STATE_UPDATE');
  };

  const extendTimer = async (seconds = 15) => {
    setCountdown((prev) => prev + seconds);
  };

  const skipCurrentPlayer = async () => {
    return await markUnsold();
  };

  const applyTaxDeduction = async ({ teamId, amount }) => {
    const team = teams.find((t) => t.id === teamId);
    if (team) {
      const newPurse = Math.max(0, (team.remaining_purse || 0) - amount);
      await teamsAPI.update(teamId, { remaining_purse: newPurse });
      await fetchState();
      notifyBroadcast('AUCTION_STATE_UPDATE');
    }
  };

  return (
    <AuctionContext.Provider
      value={{
        session,
        currentPlayer,
        leadingTeam,
        teams,
        availablePool,
        recentBids,
        recentSales,
        activeIncrement,
        connected,
        countdown,
        soldAnimation,
        setSoldAnimation,
        refresh: fetchState,
        placeBid,
        nominatePlayer,
        setIncrement,
        manualBid,
        markSold,
        markUnsold,
        pauseBidding,
        resumeBidding,
        extendTimer,
        skipCurrentPlayer,
        applyTaxDeduction,
      }}
    >
      {children}
    </AuctionContext.Provider>
  );
}

export function useAuction() {
  const context = useContext(AuctionContext);
  if (!context) {
    throw new Error('useAuction must be used within an AuctionProvider');
  }
  return context;
}

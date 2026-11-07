/**
 * AuctionContext — Supabase Realtime-backed live auction state.
 *
 * Replaces the previous socket.io + Express approach.
 * Uses Supabase postgres_changes subscriptions for real-time updates
 * and direct Supabase queries for all CRUD operations.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { auctionAPI, teamsAPI } from '../services/api';
import { useAuth } from './AuthContext';

const AuctionContext = createContext(null);

export function AuctionProvider({ children }) {
  const [state, setState] = useState({
    session: null,
    league: null,
    currentPlayer: null,
    leadingTeam: null,
    teams: [],
    recentBids: [],
    recentSales: [],
    nextQueueItem: null,
  });

  const [connected, setConnected] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [soldAnimation, setSoldAnimation] = useState(null);
  const { user } = useAuth();
  const channelRef = useRef(null);

  // ── Fetch full auction state from Supabase ───────────────────────────────
  const fetchState = useCallback(async () => {
    try {
      const [sessionData, teamsData] = await Promise.all([
        auctionAPI.getCurrentState(),
        teamsAPI.getAll(),
      ]);

      if (sessionData) {
        setState(prev => ({
          ...prev,
          session: sessionData,
          currentPlayer: sessionData.current_player || null,
          leadingTeam: sessionData.leading_team || null,
          teams: teamsData || [],
        }));
      } else {
        setState(prev => ({
          ...prev,
          teams: teamsData || [],
        }));
      }
    } catch (err) {
      console.error('[Auction] Error fetching state:', err);
    }
  }, []);

  // ── Subscribe to Supabase Realtime for auction_sessions & bids ───────────
  useEffect(() => {
    fetchState();

    // Subscribe to auction_sessions changes
    const channel = supabase
      .channel('auction-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auction_sessions' },
        (payload) => {
          console.log('[Auction] Session change:', payload.eventType);
          fetchState();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids' },
        (payload) => {
          console.log('[Auction] New bid:', payload.new);
          fetchState();
          // Add to recentBids list
          setState(prev => ({
            ...prev,
            recentBids: [payload.new, ...prev.recentBids].slice(0, 20),
          }));
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchState, user?.id]);

  // ── Auction Actions (write to Supabase, Realtime propagates to all) ──────

  const placeBid = async (teamId, amount) => {
    const session = state.session;
    if (!session?.id || !session?.current_player?.id) throw new Error('No active player in auction');

    // Update leading bid in session
    const { error: sessionErr } = await supabase
      .from('auction_sessions')
      .update({ current_bid: amount, leading_team_id: teamId })
      .eq('id', session.id);
    if (sessionErr) throw new Error(sessionErr.message);

    // Record bid
    return await auctionAPI.placeBid(session.current_player.id, teamId, amount);
  };

  const nominatePlayer = async (playerId, overrides = {}) => {
    // Create or update auction session with this player
    const existing = state.session;
    const sessionData = {
      current_player_id: playerId,
      current_bid: overrides.base_price || 50000,
      leading_team_id: null,
      status: 'active',
      ...(existing?.id ? { id: existing.id } : {}),
    };
    const data = await auctionAPI.upsertSession(sessionData);
    await fetchState();
    return data;
  };

  const manualBid = async (teamId, amount) => {
    return await placeBid(teamId, amount);
  };

  const markSold = async () => {
    const session = state.session;
    if (!session?.id) throw new Error('No active session');
    const playerId = session.current_player_id;
    const teamId = session.leading_team_id;
    const amount = session.current_bid;

    // Mark player as sold
    if (playerId && teamId) {
      await supabase.from('players').update({
        status: 'sold',
        team_id: teamId,
        sold_price: amount,
      }).eq('id', playerId);

      // Deduct from team purse
      const { data: team } = await supabase.from('teams').select('remaining_purse').eq('id', teamId).single();
      if (team) {
        await supabase.from('teams').update({
          remaining_purse: Math.max(0, (team.remaining_purse || 0) - amount),
        }).eq('id', teamId);
      }
    }

    // Update session
    await supabase.from('auction_sessions').update({
      status: 'sold',
      current_player_id: null,
      leading_team_id: null,
      current_bid: 0,
    }).eq('id', session.id);

    // Show sold animation
    if (playerId) {
      setSoldAnimation({ player: state.currentPlayer, team: state.leadingTeam, amount });
      setTimeout(() => setSoldAnimation(null), 7000);
    }

    await fetchState();
  };

  const markUnsold = async () => {
    const session = state.session;
    if (!session?.id) return;
    const playerId = session.current_player_id;

    if (playerId) {
      await supabase.from('players').update({ status: 'unsold' }).eq('id', playerId);
    }

    await supabase.from('auction_sessions').update({
      status: 'unsold',
      current_player_id: null,
      leading_team_id: null,
      current_bid: 0,
    }).eq('id', session.id);

    await fetchState();
  };

  const pauseBidding = async () => {
    if (!state.session?.id) return;
    await supabase.from('auction_sessions').update({ status: 'paused' }).eq('id', state.session.id);
    await fetchState();
  };

  const resumeBidding = async () => {
    if (!state.session?.id) return;
    await supabase.from('auction_sessions').update({ status: 'active' }).eq('id', state.session.id);
    await fetchState();
  };

  const setIncrement = async (increment) => {
    if (!state.session?.id) return;
    await supabase.from('auction_sessions').update({ bid_increment: increment }).eq('id', state.session.id);
    await fetchState();
  };

  const extendTimer = async (seconds = 15) => {
    // Timer management is client-side only in this Supabase-first approach
    setCountdown(prev => prev + seconds);
  };

  const skipCurrentPlayer = async () => {
    return await markUnsold();
  };

  const applyTaxDeduction = async ({ teamId, amount }) => {
    const { data: team } = await supabase.from('teams').select('remaining_purse').eq('id', teamId).single();
    if (team) {
      await supabase.from('teams').update({
        remaining_purse: Math.max(0, team.remaining_purse - amount),
      }).eq('id', teamId);
    }
    await fetchState();
  };

  return (
    <AuctionContext.Provider
      value={{
        ...state,
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

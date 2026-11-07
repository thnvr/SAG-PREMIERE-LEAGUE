/**
 * AuctionContext — Live auction state with Supabase Realtime and offline fallback.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
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

  // Fetch auction state
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
      console.warn('[Auction] Error fetching state:', err.message);
    }
  }, []);

  // Subscribe to Supabase Realtime
  useEffect(() => {
    fetchState();

    if (!isSupabaseConfigured) {
      setConnected(true);
      return;
    }

    try {
      const channel = supabase
        .channel('auction-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'auction_sessions' },
          () => {
            fetchState();
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'bids' },
          (payload) => {
            fetchState();
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
    } catch (err) {
      console.warn('[Auction] Subscription error:', err);
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchState, user?.id]);

  const placeBid = async (teamId, amount) => {
    const session = state.session;
    if (!session?.id || !session?.current_player?.id) {
      // Local demo bid fallback
      setState(prev => ({
        ...prev,
        session: { ...(prev.session || {}), current_bid: amount, leading_team_id: teamId },
      }));
      return;
    }

    await supabase
      .from('auction_sessions')
      .update({ current_bid: amount, leading_team_id: teamId })
      .eq('id', session.id);

    return await auctionAPI.placeBid(session.current_player.id, teamId, amount);
  };

  const nominatePlayer = async (playerId, overrides = {}) => {
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
    if (!session?.id) return;
    const playerId = session.current_player_id;
    const teamId = session.leading_team_id;
    const amount = session.current_bid;

    if (playerId && teamId) {
      await supabase.from('players').update({
        status: 'sold',
        team_id: teamId,
        sold_price: amount,
      }).eq('id', playerId);

      const { data: team } = await supabase.from('teams').select('remaining_purse').eq('id', teamId).single();
      if (team) {
        await supabase.from('teams').update({
          remaining_purse: Math.max(0, (team.remaining_purse || 0) - amount),
        }).eq('id', teamId);
      }
    }

    await supabase.from('auction_sessions').update({
      status: 'sold',
      current_player_id: null,
      leading_team_id: null,
      current_bid: 0,
    }).eq('id', session.id);

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

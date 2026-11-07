import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getSocket, connectSocket } from '../services/socket';
import { auctionAPI, getToken } from '../services/api';
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

  // Fetch full state from backend
  const fetchState = useCallback(async () => {
    try {
      const data = await auctionAPI.getCurrentState();
      if (data) {
        setState(data);
      }
    } catch (err) {
      console.error('[Auction] Error fetching state:', err);
    }
  }, []);

  // Connect socket and listen to real-time events
  useEffect(() => {
    fetchState();

    const socket = connectSocket(getToken());

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onStateUpdate = (newState) => {
      setState(newState);
    };

    const onBid = (bidData) => {
      // Refresh auction state to keep teams/budgets consistent
      fetchState();
    };

    const onSold = (saleData) => {
      setSoldAnimation(saleData);
      fetchState();
      // Auto-hide sold banner after 7 seconds
      setTimeout(() => {
        setSoldAnimation(null);
      }, 7000);
    };

    const onUnsold = () => {
      fetchState();
    };

    const onCountdown = (data) => {
      setCountdown(data.remaining);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('auction:state', onStateUpdate);
    socket.on('auction:bid', onBid);
    socket.on('auction:sold', onSold);
    socket.on('auction:unsold', onUnsold);
    socket.on('auction:countdown', onCountdown);

    // Polling fallback to keep auction state fresh in serverless environments
    const pollTimer = setInterval(() => {
      fetchState();
    }, 3000);

    return () => {
      clearInterval(pollTimer);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('auction:state', onStateUpdate);
      socket.off('auction:bid', onBid);
      socket.off('auction:sold', onSold);
      socket.off('auction:unsold', onUnsold);
      socket.off('auction:countdown', onCountdown);
    };
  }, [fetchState, user?.id]);

  // Actions
  const placeBid = async (teamId, amount) => {
    return await auctionAPI.placeBid(teamId, amount);
  };

  const nominatePlayer = async (playerId, overrides = {}) => {
    const res = await auctionAPI.nominate(playerId, overrides);
    fetchState();
    return res;
  };

  const setIncrement = async (increment) => {
    const res = await auctionAPI.setIncrement(increment);
    fetchState();
    return res;
  };

  const manualBid = async (teamId, amount) => {
    const res = await auctionAPI.manualBid(teamId, amount);
    fetchState();
    return res;
  };

  const markSold = async () => {
    const res = await auctionAPI.sold();
    fetchState();
    return res;
  };

  const markUnsold = async () => {
    const res = await auctionAPI.unsold();
    fetchState();
    return res;
  };

  const pauseBidding = async () => {
    const res = await auctionAPI.pause();
    fetchState();
    return res;
  };

  const resumeBidding = async () => {
    const res = await auctionAPI.resume();
    fetchState();
    return res;
  };

  const extendTimer = async (seconds = 15) => {
    const res = await auctionAPI.extend(seconds);
    fetchState();
    return res;
  };

  const skipCurrentPlayer = async () => {
    const res = await auctionAPI.skip();
    fetchState();
    return res;
  };

  const applyTaxDeduction = async (data) => {
    const res = await auctionAPI.applyTaxDeduction(data);
    fetchState();
    return res;
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

// client/src/context/AuctionContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchFullAuctionState, callSheetsAPI } from '../services/sheetsService';

const AuctionContext = createContext();

export const AuctionProvider = ({ children }) => {
  const [liveState, setLiveState] = useState({
    playerId: '',
    playerName: '',
    currentBid: 0,
    highestBidder: 'No Bids Yet',
    leadingTeamId: '',
    status: 'idle'
  });
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);

  // Poll Google Sheets every 1.5 seconds for real-time updates across screens
  useEffect(() => {
    const loadState = async () => {
      const data = await fetchFullAuctionState();
      if (data && !data.error) {
        if (data.liveState) setLiveState(data.liveState);
        if (data.players) setPlayers(data.players);
        if (data.teams) setTeams(data.teams);
      }
    };

    loadState();
    const interval = setInterval(loadState, 1500);
    return () => clearInterval(interval);
  }, []);

  const placeBid = async (teamId, teamName, amount) => {
    const res = await callSheetsAPI({ action: 'placeBid', teamId, teamName, bidAmount: amount });
    return res;
  };

  const pushPlayerToLive = async (player) => {
    const res = await callSheetsAPI({ action: 'pushPlayer', player });
    return res;
  };

  const markPlayerSold = async (winningTeamId, finalAmount) => {
    const res = await callSheetsAPI({ action: 'markSold', winningTeamId, finalAmount });
    return res;
  };

  const markPlayerUnsold = async () => {
    const res = await callSheetsAPI({ action: 'markUnsold' });
    return res;
  };

  // Compatibility helpers so other pages continue working smoothly during migration
  const currentPlayer =
    liveState?.player ||
    players.find((p) => p.id === liveState?.playerId) ||
    (liveState?.playerName
      ? {
          id: liveState.playerId,
          name: liveState.playerName,
          base_price: liveState.currentBid,
        }
      : null);

  const leadingTeam =
    teams.find(
      (t) =>
        t.id === liveState?.leadingTeamId ||
        t.name === liveState?.highestBidder ||
        t.short_name === liveState?.highestBidder
    ) || null;

  const session = {
    id: 1,
    current_bid: liveState?.currentBid || 0,
    current_highest_bid: liveState?.currentBid || 0,
    status: liveState?.status || 'idle',
    bidding_status: liveState?.status || 'idle',
    leading_team_id: liveState?.leadingTeamId || null,
    current_player_id: liveState?.playerId || null,
  };

  const nominatePlayer = (id, overrides = {}) => {
    const p = players.find((x) => x.id === id) || { id, ...overrides };
    return pushPlayerToLive(p);
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
        // Compatibility props:
        currentPlayer,
        leadingTeam,
        session,
        nominatePlayer,
        countdown: 30,
        soldAnimation: null,
        setSoldAnimation: () => {},
        connected: true,
      }}
    >
      {children}
    </AuctionContext.Provider>
  );
};

export const useAuction = () => useContext(AuctionContext);

import React, { useState, useEffect } from 'react';
import { useAuction } from '../context/AuctionContext';
import { useAuth } from '../context/AuthContext';
import { formatMoney, playersAPI, auctionAPI } from '../services/sheetsService';
import PlayerCard from '../components/PlayerCard';
import TeamCard from '../components/TeamCard';
import CountdownTimer from '../components/CountdownTimer';
import BidPanel from '../components/BidPanel';
import SoldBanner from '../components/SoldBanner';
import Modal from '../components/Modal';
import {
  Gavel,
  Shield,
  Play,
  Pause,
  Clock,
  PlusCircle,
  XCircle,
  CheckCircle,
  User,
  Activity,
  AlertCircle,
  ListFilter,
  CheckSquare,
  Square,
  Users,
  Bell,
  Radio,
  Check,
  ChevronRight,
  Swords,
  Eye,
  Wallet,
  TrendingUp,
  Percent,
  DollarSign,
  UserX,
  Trash2
} from 'lucide-react';

export default function LiveAuction() {
  const {
    session,
    league,
    currentPlayer,
    leadingTeam,
    teams,
    recentBids,
    recentSales,
    availablePool,
    activeIncrement,
    countdown,
    soldAnimation,
    setSoldAnimation,
    placeBid,
    nominatePlayer,
    setIncrement,
    manualBid,
    markSold,
    markUnsold,
    pauseBidding,
    resumeBidding,
    extendTimer,
    skipCurrentPlayer
  } = useAuction();

  const { user } = useAuth();
  const isAdminOrAuctioneer = user?.role === 'super_admin' || user?.role === 'auctioneer';
  const isCaptain = user?.role === 'captain';
  const captainTeamId = user?.teamId || user?.team_id;
  const myTeam = isCaptain && captainTeamId ? teams.find((t) => t.id === captainTeamId) : null;

  // Action authority: ONLY super_admin and auctioneer have access to the Master Command Desk
  const hasAuctionDeskAccess = isAdminOrAuctioneer;

  const currentHighestBid = session?.current_highest_bid || 0;
  const biddingStatus = session?.bidding_status || 'waiting';
  const incrementStep = activeIncrement || 5000;

  // Once/Twice/Third Call countdown state for Auctioneer hammer
  const [callCount, setCallCount] = useState(0); // 0=None, 1="GOING ONCE", 2="GOING TWICE", 3="FINAL CALL - SOLD"

  // Reset callCount whenever bid changes or player changes
  useEffect(() => {
    setCallCount(0);
  }, [currentHighestBid, currentPlayer?.id]);

  const handleNextCall = () => {
    if (callCount === 0) setCallCount(1);
    else if (callCount === 1) setCallCount(2);
    else if (callCount === 2) {
      setCallCount(3);
      setShowSoldConfirm(true);
    }
  };
  // Local state for Auctioneer nomination & inline editing
  const [allUpcomingPlayers, setAllUpcomingPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [nominationOverrides, setNominationOverrides] = useState({
    name: '',
    base_price: 10000,
    primary_position: 'ST'
  });

  // Tick list modal
  const [showTickListModal, setShowTickListModal] = useState(false);
  const [tickListSelection, setTickListSelection] = useState({});

  // Sold / Unsold confirmation modals
  const [showSoldConfirm, setShowSoldConfirm] = useState(false);
  const [showUnsoldConfirm, setShowUnsoldConfirm] = useState(false);
  const [showAvailablePoolDrawer, setShowAvailablePoolDrawer] = useState(false);
  const [expandedTeamSquad, setExpandedTeamSquad] = useState(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Losing Bid Tax (Anti-Inflation) modal state
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [taxTeamId, setTaxTeamId] = useState('');
  const [taxPercentage, setTaxPercentage] = useState(5);
  const [taxLoading, setTaxLoading] = useState(false);
  const [taxSuccess, setTaxSuccess] = useState(null);

  // Player Kick / Remove from Team Double Verification State
  const [kickTarget, setKickTarget] = useState(null); // { player, team }
  const [kickStep, setKickStep] = useState(1); // 1 = First confirm, 2 = Double verification confirm
  const [kickConfirmText, setKickConfirmText] = useState('');
  const [kickLoading, setKickLoading] = useState(false);
  const [kickSuccessMsg, setKickSuccessMsg] = useState(null);

  // Auctioneer incoming live bids notification alert
  const [incomingBidAlert, setIncomingBidAlert] = useState(null);

  // Listen to most recent bid to flash message with time on Auctioneer page
  useEffect(() => {
    if (recentBids && recentBids.length > 0) {
      const latest = recentBids[0];
      const timeStr = new Date(latest.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setIncomingBidAlert({
        id: latest.id,
        teamName: latest.team_name || latest.team_short,
        amount: latest.amount,
        formattedAmount: formatMoney(latest.amount),
        time: timeStr,
        bidderName: latest.bidder_name,
        teamColor: latest.team_color
      });
    }
  }, [recentBids]);

  const selectPlayerForNomination = (player) => {
    if (!player) return;
    setSelectedPlayerId(player.id);
    setNominationOverrides({
      name: player.name,
      base_price: player.base_price,
      primary_position: player.primary_position
    });
  };

  // Load upcoming players for nomination
  const loadUpcoming = () => {
    playersAPI.getAll({ status: 'upcoming' })
      .then((res) => {
        setAllUpcomingPlayers(res || []);
        if (res && res.length > 0 && !selectedPlayerId) {
          selectPlayerForNomination(res[0]);
        }
        const map = {};
        (res || []).forEach(p => { map[p.id] = p.is_shortlisted !== 0; });
        setTickListSelection(map);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadUpcoming();
  }, [currentPlayer]);

  const handleNominate = async () => {
    if (!selectedPlayerId) return;
    setActionError(null);
    setActionLoading(true);
    try {
      await nominatePlayer(selectedPlayerId, nominationOverrides);
    } catch (err) {
      setActionError(err.message || 'Nomination failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleTickItem = (playerId) => {
    setTickListSelection(prev => ({ ...prev, [playerId]: !prev[playerId] }));
  };

  const handleSaveTickList = async () => {
    const activeIds = Object.keys(tickListSelection).filter(id => tickListSelection[id]);
    const inactiveIds = Object.keys(tickListSelection).filter(id => !tickListSelection[id]);

    setActionLoading(true);
    try {
      if (activeIds.length > 0) await playersAPI.updateShortlist(activeIds, 1);
      if (inactiveIds.length > 0) await playersAPI.updateShortlist(inactiveIds, 0);
      setShowTickListModal(false);
      loadUpcoming();
    } catch (err) {
      alert('Error updating tick list: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmSold = async () => {
    setShowSoldConfirm(false);
    setActionError(null);
    setActionLoading(true);
    try {
      await markSold();
    } catch (err) {
      setActionError(err.message || 'Sale confirmation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmUnsold = async () => {
    setShowUnsoldConfirm(false);
    setActionError(null);
    setActionLoading(true);
    try {
      await markUnsold();
    } catch (err) {
      setActionError(err.message || 'Marking unsold failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyTax = async () => {
    if (!taxTeamId) return;
    const selectedBid = recentBids.find((b) => b.team_id === taxTeamId);
    const bidAmt = selectedBid ? selectedBid.amount : currentHighestBid;
    setTaxLoading(true);
    setActionError(null);
    try {
      const res = await auctionAPI.applyTaxDeduction({
        teamId: taxTeamId,
        percentage: taxPercentage,
        bidAmount: bidAmt
      });
      const targetTeam = teams.find((t) => t.id === taxTeamId);
      setTaxSuccess(`Applied ${taxPercentage}% tax (${res.formattedDeducted}) to ${targetTeam?.name || 'team'}. Available purse adjusted.`);
      setTimeout(() => {
        setShowTaxModal(false);
        setTaxSuccess(null);
        setTaxTeamId('');
      }, 2500);
    } catch (err) {
      setActionError(err.message || 'Tax deduction failed');
    } finally {
      setTaxLoading(false);
    }
  };

  const handleOpenKickModal = (player, team) => {
    setKickTarget({ player, team });
    setKickStep(1);
    setKickConfirmText('');
    setKickSuccessMsg(null);
    setActionError(null);
  };

  const handleExecuteKickPlayer = async () => {
    if (!kickTarget?.player?.id) return;
    setKickLoading(true);
    setActionError(null);
    try {
      const res = await auctionAPI.kickPlayer({
        playerId: kickTarget.player.id,
        teamId: kickTarget.team.id
      });
      setKickSuccessMsg(`Successfully removed ${kickTarget.player.name} from ${kickTarget.team.name}!`);
      setTimeout(() => {
        setKickTarget(null);
        setKickStep(1);
        setKickConfirmText('');
        setKickSuccessMsg(null);
      }, 2000);
    } catch (err) {
      setActionError(err.message || 'Failed to remove player from team');
    } finally {
      setKickLoading(false);
    }
  };

  // Rivals = same position players from available pool (for captain intel)
  const rivals = currentPlayer
    ? (availablePool || []).filter(
        (p) => p.primary_position === currentPlayer.primary_position && p.id !== currentPlayer.id
      )
    : [];

  // Rival teams info (opponents for captain)
  const rivalTeams = isCaptain ? teams.filter((t) => t.id !== (myTeam?.id)) : [];

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full gap-6 bg-[#111215] text-white font-sans">
      
      {/* Top Breadcrumb & Live Status Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#18191f] border border-[#262833] shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#ffd000]/10 border border-[#ffd000]/30 flex items-center justify-center text-[#ffd000]">
            <Gavel className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-black tracking-widest text-[#ffd000]">
              SAG PREMIERE LEAGUE • LIVE COMMAND ROOM
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
              {league?.name || 'SAG PREMIERE LEAGUE'}
            </h1>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Active Increment Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#111215] border border-[#262833] text-xs font-mono">
            <span className="text-[#8b8e99]">Step:</span>
            <span className="text-[#ffd000] font-bold">+{formatMoney(incrementStep)}</span>
          </div>

          {/* Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#111215] border border-[#262833] text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                biddingStatus === 'open'
                  ? 'bg-[#ffd000] animate-pulse shadow-[0_0_8px_#ffd000]'
                  : biddingStatus === 'paused'
                  ? 'bg-amber-400'
                  : 'bg-slate-500'
              }`}
            />
            <span className="uppercase text-white font-bold">
              {biddingStatus}
            </span>
          </div>

          {/* Available Pool Button */}
          <button
            onClick={() => setShowAvailablePoolDrawer(true)}
            className="px-3 py-1.5 rounded-md bg-[#18191f] hover:bg-[#23252d] border border-[#282a35] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <ListFilter className="w-3.5 h-3.5 text-[#ffd000]" />
            <span>Available Pool ({availablePool?.length || 0})</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* AUCTIONEER REAL-TIME INCOMING BID POPUP ALERT */}
      {isAdminOrAuctioneer && incomingBidAlert && (
        <div className="p-4 rounded-xl bg-[#ffd000]/15 border-2 border-[#ffd000] text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_0_25px_rgba(255,208,0,0.25)] animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#ffd000] text-[#0a0b0d] flex items-center justify-center font-black">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-[#ffd000] flex items-center gap-2">
                <span>NEW BID PLACED AT {incomingBidAlert.time}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffd000] animate-ping" />
              </div>
              <div className="text-base font-black text-white">
                <span style={{ color: incomingBidAlert.teamColor || '#ffd000' }}>{incomingBidAlert.teamName}</span> placed bid for <span className="text-[#ffd000] font-mono text-lg">{incomingBidAlert.formattedAmount}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSoldConfirm(true)}
              className="px-4 py-2 rounded-lg bg-[#ffd000] hover:bg-[#facc15] text-[#0a0b0d] font-black text-xs uppercase tracking-wider shadow transition"
            >
              Hammer SOLD At {incomingBidAlert.formattedAmount}
            </button>
            <button
              onClick={() => setIncomingBidAlert(null)}
              className="p-2 rounded-lg bg-[#111215] text-[#8b8e99] hover:text-white border border-[#262833]"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Grid Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* CENTER COLUMN: Active Lot Stage & Bidding Controls */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="rounded-2xl p-6 bg-[#18191f] border border-[#262833] shadow-2xl relative overflow-hidden flex flex-col items-center">
            
            {currentPlayer ? (
              <div className="w-full flex flex-col items-center">
                {/* Highest Bid & Live Timer Bar */}
                <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-[#262833]">
                  <div>
                    <div className="text-[10px] uppercase font-black tracking-widest text-[#8b8e99]">
                      CURRENT HIGHEST BID
                    </div>
                    <div className="text-2xl xs:text-3xl sm:text-5xl font-black font-mono text-[#ffd000] tracking-tight">
                      {currentHighestBid > 0 ? formatMoney(currentHighestBid) : 'WAITING FOR OPENING BID'}
                    </div>
                    {leadingTeam && (
                      <div className="text-xs sm:text-sm text-white font-bold flex items-center gap-2 mt-1">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: leadingTeam.primary_color }}
                        />
                        <span>Held by <strong style={{ color: leadingTeam.primary_color }}>{leadingTeam.name}</strong></span>
                      </div>
                    )}
                  </div>

                  <div className="self-center sm:self-auto">
                    <CountdownTimer
                      seconds={countdown}
                      isPaused={biddingStatus === 'paused'}
                    />
                  </div>
                </div>

                {/* Ultimate Gold Player Card Display */}
                <div className="py-2 w-full flex justify-center overflow-hidden">
                  <PlayerCard
                    player={currentPlayer}
                    size="xl"
                    showStats={true}
                    className="max-w-[285px] xs:max-w-[340px]"
                  />
                </div>

                {/* CAPTAINS LIVE BIDDING PANEL PLACED DIRECTLY UNDER PLAYER IMAGE */}
                <div className="w-full mt-4 pt-4 border-t border-[#262833] flex justify-center">
                  {isCaptain && myTeam ? (
                    <BidPanel
                      currentPlayer={currentPlayer}
                      currentHighestBid={currentHighestBid}
                      leadingTeam={leadingTeam}
                      myTeam={myTeam}
                      activeIncrement={incrementStep}
                      biddingStatus={biddingStatus}
                      onPlaceBid={placeBid}
                    />
                  ) : (
                    <div className="text-center p-3 rounded-xl bg-[#111215] border border-[#262833] text-xs text-[#8b8e99] w-full max-w-sm">
                      {isAdminOrAuctioneer ? (
                        <span>Auctioneer Control Active • Use the Master Command Desk below to control increments &amp; confirm sales.</span>
                      ) : (
                        <span>Viewing as Spectator • Log in as a team captain to submit bids.</span>
                      )}
                    </div>
                  )}
                </div>

                {/* CAPTAIN INTEL — Same-Position Rivals Still Available */}
                {isCaptain && currentPlayer && (() => {
                  const samePosList = (availablePool || []).filter(
                    (p) => p.primary_position === currentPlayer.primary_position && p.id !== currentPlayer.id
                  );
                  if (samePosList.length === 0) return null;
                  return (
                    <div className="w-full mt-5 pt-4 border-t border-[#262833]">
                      <div className="flex items-center gap-2 mb-3">
                        <Swords className="w-4 h-4 text-[#ffd000]" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-[#ffd000]">
                          Other {currentPlayer.primary_position} Players Still in Pool
                        </span>
                        <span className="ml-auto text-[10px] font-mono text-[#8b8e99] bg-[#111215] px-2 py-0.5 rounded border border-[#262833]">
                          {samePosList.length} ALTERNATIVE{samePosList.length > 1 ? 'S' : ''}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {samePosList.slice(0, 6).map((p) => (
                          <div key={p.id} className="p-2.5 rounded-lg bg-[#111215] border border-[#262833] hover:border-[#ffd000]/30 transition">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-black text-[#ffd000] uppercase">{p.primary_position}</span>
                              <span className="text-[9px] text-[#6b6e7a] font-mono">{p.nationality || ''}</span>
                            </div>
                            <div className="font-black text-white text-xs truncate">{p.name}</div>
                            <div className="mt-1 text-[10px] font-mono text-[#8b8e99]">
                              Base: <span className="text-[#ffd000]">{formatMoney(p.base_price)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {samePosList.length > 6 && (
                        <p className="text-center text-[10px] text-[#6b6e7a] mt-2 font-mono">
                          +{samePosList.length - 6} more {currentPlayer.primary_position} players available
                        </p>
                      )}
                    </div>
                  );
                })()}

              </div>
            ) : (
              <div className="py-24 text-center text-[#8b8e99] flex flex-col items-center">
                <Gavel className="w-16 h-16 text-[#ffd000] mb-4 animate-pulse" />
                <h3 className="text-xl font-black text-white uppercase">Auction Block Empty</h3>
                <p className="text-xs text-[#8b8e99] mt-1 max-w-sm">
                  {isAdminOrAuctioneer
                    ? 'Use the Auctioneer Master Desk below to edit and nominate the next player lot.'
                    : 'The auctioneer will place the next star player onto the bidding block.'}
                </p>
              </div>
            )}
          </div>

          {/* AUCTIONEER MASTER COMMAND DESK (Auctioneer & Super Admin Only) */}
          {hasAuctionDeskAccess && (
            <div className="rounded-2xl p-6 bg-[#18191f] border-2 border-[#ffd000]/40 shadow-2xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#262833]">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#ffd000]" />
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <span>AUCTIONEER MASTER COMMAND DESK</span>
                    </h3>
                    <p className="text-[10px] text-[#8b8e99] mt-0.5">
                      Official Master Controller Desk: hammer falls, player nomination, once/twice calls, and lot management.
                    </p>
                  </div>
                </div>

                {/* Master Increment Selector (+50 vs +100) */}
                <div className="flex items-center gap-1 bg-[#111215] p-1 rounded-lg border border-[#262833] self-start sm:self-auto">
                  <span className="text-[10px] text-[#8b8e99] px-2 font-bold uppercase">STEP LIMIT:</span>
                  <button
                    onClick={() => setIncrement(5000)}
                    className={`px-3 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                      incrementStep === 5000 ? 'bg-[#ffd000] text-[#0a0b0d] shadow' : 'text-[#8b8e99] hover:text-white'
                    }`}
                  >
                    +₹50
                  </button>
                  <button
                    onClick={() => setIncrement(10000)}
                    className={`px-3 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                      incrementStep === 10000 ? 'bg-[#ffd000] text-[#0a0b0d] shadow' : 'text-[#8b8e99] hover:text-white'
                    }`}
                  >
                    +₹100
                  </button>
                </div>
              </div>

              {/* If no player nominated: Show nomination selector WITH inline editing & tick list */}
              {!currentPlayer ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-[#8b8e99]">
                      Nominate Next Lot to Stage:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowTickListModal(true)}
                      className="text-xs text-[#ffd000] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Manage Available Tick List ({allUpcomingPlayers.filter(p => p.is_shortlisted !== 0).length})</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <select
                      value={selectedPlayerId}
                      onChange={(e) => {
                        const p = allUpcomingPlayers.find(item => item.id === e.target.value);
                        selectPlayerForNomination(p);
                      }}
                      className="sm:col-span-4 bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white"
                    >
                      <option value="">Select a registered player...</option>
                      {allUpcomingPlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.primary_position}) - Base: {formatMoney(p.base_price)} {p.is_shortlisted ? '✓ Shortlisted' : ''}
                        </option>
                      ))}
                    </select>

                    {/* Inline Edit Name */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">
                        Override Player Name
                      </label>
                      <input
                        type="text"
                        value={nominationOverrides.name}
                        onChange={(e) => setNominationOverrides({ ...nominationOverrides, name: e.target.value })}
                        className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>

                    {/* Inline Edit Position */}
                    <div>
                      <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">
                        Position
                      </label>
                      <select
                        value={nominationOverrides.primary_position}
                        onChange={(e) => setNominationOverrides({ ...nominationOverrides, primary_position: e.target.value })}
                        className="w-full bg-[#111215] border border-[#262833] rounded-lg px-2 py-1.5 text-xs text-white"
                      >
                        {['ST', 'CF', 'RW', 'LW', 'CAM', 'CM', 'CDM', 'CB', 'LB', 'RB', 'GK'].map((pos) => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                      </select>
                    </div>

                    {/* Inline Edit Base Price */}
                    <div>
                      <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">
                        Base Price (₹)
                      </label>
                      <input
                        type="number"
                        step="50"
                        value={nominationOverrides.base_price / 100}
                        onChange={(e) => setNominationOverrides({ ...nominationOverrides, base_price: parseFloat(e.target.value) * 100 })}
                        className="w-full bg-[#111215] border border-[#262833] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleNominate}
                    disabled={!selectedPlayerId || actionLoading}
                    className="w-full py-3 rounded-lg bg-[#ffd000] hover:bg-[#facc15] text-[#0a0b0d] font-black text-xs uppercase tracking-wider transition disabled:opacity-50 cursor-pointer"
                  >
                    Nominate Lot to Active Stage
                  </button>
                </div>
              ) : (
                /* When Lot Active: Sequential ONCE -> TWICE -> SOLD Call Buttons + Hammer Confirmation */
                <div className="space-y-4">
                  
                  {/* ONCE / TWICE / SOLD Sequential Call Bar */}
                  <div className="p-3.5 rounded-xl bg-[#111215] border border-[#262833] flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Gavel className="w-5 h-5 text-[#ffd000]" />
                      <div>
                        <span className="text-[10px] uppercase font-black tracking-wider text-[#8b8e99] block">
                          AUCTIONEER CALL SEQUENCE
                        </span>
                        <div className="text-sm font-black text-white font-mono">
                          {callCount === 0 && <span className="text-[#8b8e99]">Bidding Active — Ready for calls</span>}
                          {callCount === 1 && <span className="text-amber-400 font-bold animate-pulse">📢 GOING ONCE at {formatMoney(currentHighestBid)}!</span>}
                          {callCount === 2 && <span className="text-rose-400 font-bold animate-pulse">📢 GOING TWICE at {formatMoney(currentHighestBid)}!</span>}
                          {callCount === 3 && <span className="text-[#ffd000] font-black">🔨 FINAL CALL — SOLD!</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={handleNextCall}
                        disabled={actionLoading || currentHighestBid === 0}
                        className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition cursor-pointer ${
                          callCount === 0
                            ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                            : callCount === 1
                            ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                            : 'bg-[#ffd000] hover:bg-[#facc15] text-[#0a0b0d] shadow'
                        } disabled:opacity-40`}
                      >
                        {callCount === 0 && 'Call 1: Going ONCE'}
                        {callCount === 1 && 'Call 2: Going TWICE'}
                        {callCount === 2 && 'Call 3: Hammer SOLD'}
                        {callCount === 3 && 'HAMMER SOLD'}
                      </button>

                      {callCount > 0 && (
                        <button
                          onClick={() => setCallCount(0)}
                          className="px-2.5 py-2 rounded-lg bg-[#18191f] text-[#8b8e99] hover:text-white border border-[#282a35] text-[10px] uppercase font-bold"
                          title="Reset call count"
                        >
                          Reset Call
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Hammer / Sold / Unsold / Pause / Extend Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => setShowSoldConfirm(true)}
                      disabled={actionLoading || currentHighestBid === 0}
                      className="py-3 px-3 rounded-lg bg-[#ffd000] hover:bg-[#facc15] text-[#0a0b0d] font-black text-xs uppercase tracking-wider shadow transition flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Confirm SOLD</span>
                    </button>

                    <button
                      onClick={() => setShowUnsoldConfirm(true)}
                      disabled={actionLoading}
                      className="py-3 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Mark UNSOLD</span>
                    </button>

                    {biddingStatus === 'open' ? (
                      <button
                        onClick={pauseBidding}
                        disabled={actionLoading}
                        className="py-3 px-3 rounded-lg bg-[#111215] hover:bg-[#22242d] border border-[#262833] text-amber-400 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Pause className="w-4 h-4" />
                        <span>Pause</span>
                      </button>
                    ) : (
                      <button
                        onClick={resumeBidding}
                        disabled={actionLoading}
                        className="py-3 px-3 rounded-lg bg-[#ffd000] text-[#0a0b0d] font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-4 h-4" />
                        <span>Resume</span>
                      </button>
                    )}

                    <button
                      onClick={() => extendTimer(15)}
                      disabled={actionLoading}
                      className="py-3 px-3 rounded-lg bg-[#111215] hover:bg-[#22242d] border border-[#262833] text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Clock className="w-4 h-4" />
                      <span>+15s Timer</span>
                    </button>
                  </div>

                  {/* Anti-Inflation: Losing Bid Tax Panel */}
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                          Anti-Inflation: Losing Bid Tax
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-400/80 bg-amber-500/20 px-2 py-0.5 rounded font-bold">
                        OPTIONAL
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8b8e99]">
                      Apply a custom percentage deduction on a losing bidder's committed amount to curb hyper-inflation.
                    </p>
                    <button
                      onClick={() => setShowTaxModal(true)}
                      disabled={!recentBids || recentBids.length === 0}
                      className="w-full py-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-black text-xs uppercase tracking-wider transition disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <DollarSign className="w-4 h-4" />
                      Apply Losing Bid Tax Deduction...
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Real-time Bid Log Stream */}
          <div className="rounded-2xl p-6 bg-[#18191f] border border-[#262833] shadow-xl">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-[#ffd000]" /> Live Bid Stream & Timestamps
            </h3>

            {recentBids && recentBids.length > 0 ? (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {recentBids.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#111215] border border-[#262833] text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#646774] font-bold">#{b.bid_number}</span>
                      <span
                        className="font-black px-2 py-0.5 rounded text-[10px]"
                        style={{ backgroundColor: (b.team_color || '#ffd000') + '33', color: b.team_color || '#ffd000' }}
                      >
                        {b.team_short || b.team_name}
                      </span>
                      <span className="text-white font-sans font-bold">{b.bidder_name}</span>
                      <span className="text-[#646774] text-[10px]">
                        {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <div className="font-black text-[#ffd000]">
                      {formatMoney(b.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-[#8b8e99] text-xs">
                No bids recorded for current lot yet.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: All Franchises Desk with Live Purses & Full Bought Rosters */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* TRACKING HEADER */}
          <div className="text-xs uppercase font-black tracking-wider text-[#8b8e99] flex items-center justify-between px-1">
            <span>Franchise Purse &amp; Signed Prices</span>
            <span className="text-[10px] text-[#ffd000] font-mono">3 TEAMS</span>
          </div>

          {/* ACTIVE LOT LIVE TRACKER CHIP */}
          {currentPlayer && (
            <div className="p-3.5 rounded-xl bg-[#ffd000]/10 border border-[#ffd000]/30 shadow">
              <span className="text-[10px] uppercase font-black text-[#ffd000] tracking-wider block mb-1">
                Active Bidding Lot Tracker
              </span>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-black text-white text-sm uppercase">{currentPlayer.name}</div>
                  <span className="text-[10px] text-[#8b8e99] font-mono">
                    {currentPlayer.primary_position} • Base: {formatMoney(currentPlayer.base_price)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#8b8e99] block font-mono">Top Offer</span>
                  <div className="text-base font-black text-[#ffd000] font-mono">
                    {currentHighestBid > 0 ? formatMoney(currentHighestBid) : '₹0'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {teams.map((t) => {
            const isLeading = leadingTeam && leadingTeam.id === t.id;
            const isExpanded = expandedTeamSquad === t.id;
            const squad = t.squad || [];
            const isMyTeam = isCaptain && myTeam && t.id === myTeam.id;
            const initialPurse = Number(t.total_purse ?? t.initial_purse ?? t.totalPurse ?? t.initialPurse ?? 0);
            const remainingPurse = Number(t.remaining_purse ?? t.remainingPurse ?? initialPurse);
            const totalSpent = Math.max(0, initialPurse - remainingPurse);
            const remainingPct = initialPurse > 0
              ? Math.round((remainingPurse / initialPurse) * 100)
              : 100;

            return (
              <div
                key={t.id}
                className={`rounded-2xl p-4 bg-[#18191f] border transition-all ${
                  isMyTeam
                    ? 'border-[#ffd000] ring-1 ring-[#ffd000]/40 shadow-[0_0_18px_rgba(255,208,0,0.12)]'
                    : isLeading
                    ? 'border-[#ffd000]/60 shadow-[0_0_12px_rgba(255,208,0,0.1)]'
                    : 'border-[#262833]'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-base shadow"
                      style={{ backgroundColor: t.primary_color + '33', color: t.primary_color }}
                    >
                      {t.short_name}
                    </div>
                    <div>
                      <h4 className="font-black text-white text-sm uppercase">{t.name}</h4>
                      <p className="text-[10px] text-[#8b8e99]">
                        {isMyTeam ? '⭐ MY TEAM' : `Capt: ${t.captain_name || 'Leader'}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {isLeading && (
                      <span className="px-2 py-0.5 rounded bg-[#ffd000] text-[#0a0b0d] text-[10px] font-black uppercase shadow animate-pulse">
                        LEADING
                      </span>
                    )}
                    {isMyTeam && !isLeading && (
                      <span className="px-2 py-0.5 rounded bg-[#ffd000]/20 text-[#ffd000] border border-[#ffd000]/30 text-[10px] font-black uppercase">
                        YOUR TEAM
                      </span>
                    )}
                  </div>
                </div>

                {/* Financial Ledger Details */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono py-2 border-t border-b border-[#262833] mb-2">
                  <div>
                    <span className="text-[9px] text-[#8b8e99] uppercase block">Spent</span>
                    <span className="text-white font-bold">{formatMoney(totalSpent)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#8b8e99] uppercase block">Remaining</span>
                    <span className="text-[#ffd000] font-black">{formatMoney(remainingPurse)}</span>
                  </div>
                </div>

                {/* Budget bar */}
                <div className="mb-2">
                  <div className="w-full h-1.5 rounded-full bg-[#262833] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${remainingPct}%`,
                        backgroundColor: remainingPct > 50 ? '#ffd000' : remainingPct > 25 ? '#f59e0b' : '#ef4444'
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[9px] text-[#6b6e7a] font-mono">Budget left</span>
                    <span className="text-[9px] font-mono text-[#ffd000]">{remainingPct}%</span>
                  </div>
                </div>

                {/* Bought Player Roster Toggle Accordion */}
                <div className="mt-1 pt-1">
                  <button
                    onClick={() => setExpandedTeamSquad(isExpanded ? null : t.id)}
                    className="w-full flex items-center justify-between text-[11px] text-[#8b8e99] hover:text-white font-bold py-1 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#ffd000]" />
                      <span>Roster: {squad.length} players signed</span>
                    </span>
                    <span>{isExpanded ? '▲ Hide' : '▼ View'}</span>
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {squad.length > 0 ? (
                        squad.map((player, idx) => (
                          <div
                            key={player.id || idx}
                            className="flex items-center justify-between p-2 rounded-lg bg-[#111215] text-[10px] font-mono border border-[#22242d] group hover:border-[#ffd000]/40 transition"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-[#ffd000] font-black w-8 text-center px-1 rounded bg-[#ffd000]/10">{player.primary_position}</span>
                              <span className="font-sans font-bold text-white truncate max-w-[100px]">{player.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#ffd000]">{formatMoney(player.purchase_price)}</span>
                              {hasAuctionDeskAccess && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenKickModal(player, t);
                                  }}
                                  className="p-1 rounded bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white transition cursor-pointer"
                                  title={`Kick ${player.name} from ${t.name}`}
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-3 text-[10px] text-[#8b8e99]">
                          No players signed yet.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* LOSING BID TAX MODAL */}
      {showTaxModal && (
        <Modal
          isOpen={showTaxModal}
          onClose={() => {
            setShowTaxModal(false);
            setTaxSuccess(null);
          }}
          title="Apply Anti-Inflation Losing Bid Tax"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
              <strong>⚠️ Losing Bid Tax Policy:</strong> Deducts a percentage of the selected team's bidded amount from their available purse as an anti-inflation measure. Deduction is optional and can be managed by the auctioneer.
            </div>

            {taxSuccess ? (
              <div className="text-center py-6 text-emerald-400 font-bold text-sm bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                {taxSuccess}
              </div>
            ) : (
              <>
                {/* Team Selector */}
                <div>
                  <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">
                    Select Bidded / Losing Team
                  </label>
                  <select
                    value={taxTeamId}
                    onChange={(e) => setTaxTeamId(e.target.value)}
                    className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
                  >
                    <option value="">Choose a team who bid...</option>
                    {/* Show distinct teams who bid on current player */}
                    {[...new Map((recentBids || []).map((b) => [b.team_id, b])).values()].map((b) => {
                      const t = teams.find((tm) => tm.id === b.team_id);
                      const isLeading = b.team_id === session?.leading_team_id;
                      return (
                        <option key={b.team_id} value={b.team_id}>
                          {t?.name || b.team_name} — Highest Bid: {formatMoney(b.amount)} {isLeading ? '(Current Leader)' : '(Losing Bid)'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Tax Percentage Slider */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-[#8b8e99] uppercase font-bold">
                      Tax Percentage: <span className="text-amber-400 font-black text-sm">{taxPercentage}%</span>
                    </label>
                    <div className="flex gap-1">
                      {[5, 10, 15, 20].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setTaxPercentage(pct)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            taxPercentage === pct ? 'bg-amber-400 text-black' : 'bg-[#111215] text-[#8b8e99] border border-[#262833]'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="25"
                    step="1"
                    value={taxPercentage}
                    onChange={(e) => setTaxPercentage(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-[#646774] mt-0.5">
                    <span>1%</span>
                    <span>5% (Standard)</span>
                    <span>10%</span>
                    <span>25%</span>
                  </div>
                </div>

                {/* Calculation Preview */}
                {taxTeamId && (() => {
                  const selectedBid = (recentBids || []).find((b) => b.team_id === taxTeamId);
                  const bidAmt = selectedBid ? selectedBid.amount : currentHighestBid;
                  const taxAmt = Math.round((bidAmt * taxPercentage) / 100);
                  const selectedTeam = teams.find((t) => t.id === taxTeamId);
                  const currentPurse = selectedTeam?.availableBiddingPurse ?? selectedTeam?.initial_purse ?? 0;
                  const postTaxPurse = Math.max(0, currentPurse - taxAmt);

                  return (
                    <div className="p-3 rounded-lg bg-[#111215] border border-[#262833] text-xs font-mono space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[#8b8e99]">Team Bid Amount</span>
                        <span className="text-white font-bold">{formatMoney(bidAmt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-400">Tax Deduction ({taxPercentage}%)</span>
                        <span className="text-amber-400 font-black">-{formatMoney(taxAmt)}</span>
                      </div>
                      <div className="pt-1 border-t border-[#22242d] flex justify-between">
                        <span className="text-[#8b8e99]">Estimated Available Purse After</span>
                        <span className="text-emerald-400 font-bold">{formatMoney(postTaxPurse)}</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => setShowTaxModal(false)}
                    className="py-2.5 rounded-lg bg-[#111215] text-xs font-bold text-white border border-[#262833] hover:bg-[#1a1b22]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyTax}
                    disabled={!taxTeamId || taxLoading}
                    className="py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider disabled:opacity-40 shadow transition cursor-pointer"
                  >
                    {taxLoading ? 'Applying...' : `Deduct ${taxPercentage}% Tax`}
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* PLAYER KICK / REMOVE FROM TEAM DOUBLE VERIFICATION MODAL */}
      {kickTarget && (
        <Modal
          isOpen={!!kickTarget}
          onClose={() => {
            if (!kickLoading) {
              setKickTarget(null);
              setKickStep(1);
              setKickConfirmText('');
              setKickSuccessMsg(null);
            }
          }}
          title={kickStep === 1 ? 'Step 1 of 2: Confirm Player Removal' : 'Step 2 of 2: Final Verification'}
        >
          <div className="space-y-4">
            {kickSuccessMsg ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-center text-sm">
                {kickSuccessMsg}
              </div>
            ) : kickStep === 1 ? (
              <>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                  <div className="w-10 h-10 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
                    <UserX className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase text-rose-300">
                      Kick {kickTarget.player.name} from {kickTarget.team.name}?
                    </div>
                    <p className="text-[11px] text-[#8b8e99] mt-0.5">
                      This will revoke their squad signing, return the player to the upcoming auction pool, and refund{' '}
                      <span className="text-[#ffd000] font-mono font-bold">{formatMoney(kickTarget.player.purchase_price || 0)}</span> back to {kickTarget.team.name}'s purse.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#111215] border border-[#262833] text-xs font-mono space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#8b8e99]">Player:</span>
                    <span className="text-white font-bold">{kickTarget.player.name} ({kickTarget.player.primary_position})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b8e99]">Current Franchise:</span>
                    <span className="text-white font-bold">{kickTarget.team.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b8e99]">Signed Price:</span>
                    <span className="text-[#ffd000] font-bold">{formatMoney(kickTarget.player.purchase_price || 0)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>Purse Refund:</span>
                    <span className="font-bold">+{formatMoney(kickTarget.player.purchase_price || 0)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => {
                      setKickTarget(null);
                      setKickStep(1);
                    }}
                    className="py-2.5 rounded-lg bg-[#111215] text-xs font-bold text-white border border-[#262833] hover:bg-[#1a1b22]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setKickStep(2)}
                    className="py-2.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-wider shadow transition"
                  >
                    Proceed to Verification →
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                  <div className="font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    Double Verification Required
                  </div>
                  Please type <strong className="text-white font-mono bg-black/40 px-1.5 py-0.5 rounded">KICK</strong> in the box below to authorize removal.
                </div>

                <div>
                  <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">
                    Type 'KICK' to confirm
                  </label>
                  <input
                    type="text"
                    value={kickConfirmText}
                    onChange={(e) => setKickConfirmText(e.target.value.toUpperCase())}
                    placeholder="Type KICK"
                    className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs font-mono text-white focus:border-rose-500 outline-none"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => setKickStep(1)}
                    disabled={kickLoading}
                    className="py-2.5 rounded-lg bg-[#111215] text-xs font-bold text-white border border-[#262833] hover:bg-[#1a1b22]"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleExecuteKickPlayer}
                    disabled={kickConfirmText !== 'KICK' || kickLoading}
                    className="py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider disabled:opacity-40 shadow transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <UserX className="w-4 h-4" />
                    {kickLoading ? 'Removing...' : 'Confirm Kick Player'}
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* CONFIRM SOLD MODAL */}
      {showSoldConfirm && (
        <Modal
          isOpen={showSoldConfirm}
          onClose={() => setShowSoldConfirm(false)}
          title="Confirm Hammer Fall - SOLD"
        >
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-[#ffd000]/20 text-[#ffd000] flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase">
                Sell {currentPlayer?.name} to {leadingTeam?.name}?
              </h3>
              <p className="text-xs text-[#8b8e99] mt-1">
                Final hammer price will be locked at <strong className="text-[#ffd000] font-mono text-sm">{formatMoney(currentHighestBid)}</strong> and deducted from {leadingTeam?.name}'s purse.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3">
              <button
                onClick={() => setShowSoldConfirm(false)}
                className="py-2.5 rounded-lg bg-[#111215] hover:bg-[#22242d] text-xs font-bold text-white border border-[#262833]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSold}
                disabled={actionLoading}
                className="py-2.5 rounded-lg bg-[#ffd000] hover:bg-[#facc15] text-[#0a0b0d] text-xs font-black uppercase tracking-wider shadow"
              >
                {actionLoading ? 'Finalizing...' : 'CONFIRM SALE'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CONFIRM UNSOLD MODAL */}
      {showUnsoldConfirm && (
        <Modal
          isOpen={showUnsoldConfirm}
          onClose={() => setShowUnsoldConfirm(false)}
          title="Pass Lot - Mark UNSOLD"
        >
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase">
                Pass {currentPlayer?.name} as Unsold?
              </h3>
              <p className="text-xs text-[#8b8e99] mt-1">
                The player will be recorded as unsold and can be re-nominated later.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3">
              <button
                onClick={() => setShowUnsoldConfirm(false)}
                className="py-2.5 rounded-lg bg-[#111215] hover:bg-[#22242d] text-xs font-bold text-white border border-[#262833]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUnsold}
                disabled={actionLoading}
                className="py-2.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-wider"
              >
                {actionLoading ? 'Passing...' : 'MARK UNSOLD'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* AVAILABLE TICK LIST SELECTION MODAL */}
      {showTickListModal && (
        <Modal
          isOpen={showTickListModal}
          onClose={() => setShowTickListModal(false)}
          title="Curate Available Auction Pool (Tick List)"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#8b8e99]">
              Tick the players you want available during the auction. Teams can view this pool but will not know the secret sequence.
            </p>
            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {allUpcomingPlayers.map((p) => {
                const isChecked = !!tickListSelection[p.id];
                return (
                  <div
                    key={p.id}
                    onClick={() => handleToggleTickItem(p.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                      isChecked
                        ? 'bg-[#ffd000]/10 border-[#ffd000] text-white'
                        : 'bg-[#111215] border-[#262833] text-[#8b8e99]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded flex items-center justify-center border ${isChecked ? 'bg-[#ffd000] border-[#ffd000] text-[#0a0b0d]' : 'border-[#444754]'}`}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="font-bold">{p.name}</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#18191f] text-[9px] font-mono text-[#ffd000]">{p.primary_position}</span>
                    </div>
                    <span className="font-mono">{formatMoney(p.base_price)}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#262833]">
              <button
                onClick={() => setShowTickListModal(false)}
                className="px-4 py-2 rounded-lg bg-[#111215] text-xs font-bold text-white border border-[#262833]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTickList}
                disabled={actionLoading}
                className="px-5 py-2 rounded-lg bg-[#ffd000] text-[#0a0b0d] text-xs font-black uppercase tracking-wider"
              >
                Save Pool ({Object.values(tickListSelection).filter(Boolean).length})
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* AVAILABLE POOL DRAWER */}
      {showAvailablePoolDrawer && (
        <Modal
          isOpen={showAvailablePoolDrawer}
          onClose={() => setShowAvailablePoolDrawer(false)}
          title="Available Player Pool"
        >
          <div className="space-y-3">
            <p className="text-xs text-[#8b8e99]">
              All remaining players approved for auction. Teams can inspect stats and base valuations.
            </p>
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
              {(availablePool || []).map((p, idx) => (
                <div
                  key={p.id}
                  className="p-2.5 rounded-lg bg-[#111215] border border-[#262833] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[#646774] text-[10px]">#{idx + 1}</span>
                    <span className="font-sans font-bold text-white">{p.name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#18191f] text-[9px] text-[#ffd000] font-bold">{p.primary_position}</span>
                  </div>
                  <span className="font-black text-[#ffd000]">{formatMoney(p.base_price)}</span>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* SOLD CELEBRATION BANNER */}
      {soldAnimation && (
        <SoldBanner
          sale={soldAnimation}
          onClose={() => setSoldAnimation(null)}
        />
      )}
    </div>
  );
}

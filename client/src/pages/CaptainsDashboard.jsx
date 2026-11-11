import React, { useState, useEffect, useRef } from 'react';
import { useAuction } from '../context/AuctionContext';
import { useAuth } from '../context/AuthContext';
import { formatMoney, getToken, spectatorAPI } from '../services/sheetsService';
import { connectSocket } from '../services/socket';
import TeamCard from '../components/TeamCard';
import { Link } from 'react-router-dom';
import {
  Shield,
  Users,
  Wallet,
  PieChart,
  ArrowUpRight,
  TrendingUp,
  Award,
  Filter,
  Eye,
  Crosshair,
  UserCheck,
  ChevronRight,
  Activity,
  Layers,
  Sparkles,
  Zap,
  Info,
  Gavel,
  MessageSquare,
  Send
} from 'lucide-react';

export default function CaptainsDashboard() {
  const {
    session,
    teams,
    recentSales,
    recentBids,
    availablePool,
    currentPlayer,
    leadingTeam,
    activeIncrement,
    placeBid
  } = useAuction();
  const { user } = useAuth();

  const defaultTeamId = (user?.role === 'captain' && user?.team_id) ? user.team_id : (teams[0]?.id || 'team-alpha');
  const [activeCaptainTeamId, setActiveCaptainTeamId] = useState(defaultTeamId);
  const [inspectTeamId, setInspectTeamId] = useState(null);
  const [biddingError, setBiddingError] = useState(null);
  const [biddingLoading, setBiddingLoading] = useState(false);

  // Live Spectator Comments State in Captains Dashboard
  const [comments, setComments] = useState([]);
  const [newCaptainComment, setNewCaptainComment] = useState('');
  const chatSocketRef = useRef(null);

  // Anti-Inflation Tax and Double-Price Alerts for Captain
  const [taxAlertNotification, setTaxAlertNotification] = useState(null);
  const [doublePriceAlertNotification, setDoublePriceAlertNotification] = useState(null);

  const mergeComments = (incoming) => {
    if (!incoming) return;
    setComments((prev) => {
      const map = new Map();
      prev.forEach((c) => { if (c?.id) map.set(c.id, c); });
      if (Array.isArray(incoming)) {
        incoming.forEach((c) => { if (c?.id) map.set(c.id, c); });
      } else if (incoming?.id) {
        map.set(incoming.id, incoming);
      }
      return Array.from(map.values()).sort((a, b) => new Date(a.time) - new Date(b.time));
    });
  };

  useEffect(() => {
    const loadComments = () => {
      spectatorAPI.getComments()
        .then((res) => {
          if (res?.comments && Array.isArray(res.comments)) {
            mergeComments(res.comments);
          }
        })
        .catch(() => {});
    };

    loadComments();
    const pollTimer = setInterval(loadComments, 2000);

    const socket = connectSocket(getToken());
    chatSocketRef.current = socket;

    const onHistory = (messages) => mergeComments(messages);
    const onMessage = (message) => mergeComments(message);

    const onTaxAlert = (data) => {
      setTaxAlertNotification(data);
      setTimeout(() => setTaxAlertNotification(null), 15000);
    };

    const onDoublePriceAlert = (data) => {
      if (!data.biddingTeamIds || data.biddingTeamIds.length === 0 || data.biddingTeamIds.includes(activeCaptainTeamId)) {
        setDoublePriceAlertNotification(data);
      }
    };

    socket.on('spectator:chat:history', onHistory);
    socket.on('spectator:chat:message', onMessage);
    socket.on('auction:tax-alert', onTaxAlert);
    socket.on('auction:double-price-alert', onDoublePriceAlert);
    socket.emit('spectator:chat:sync');

    return () => {
      clearInterval(pollTimer);
      socket.off('spectator:chat:history', onHistory);
      socket.off('spectator:chat:message', onMessage);
      socket.off('auction:tax-alert', onTaxAlert);
      socket.off('auction:double-price-alert', onDoublePriceAlert);
      chatSocketRef.current = null;
    };
  }, [activeCaptainTeamId]);

  const handleSendCaptainComment = async (e) => {
    e.preventDefault();
    const text = newCaptainComment.trim();
    if (!text) return;

    const sender = `Captain (${user?.displayName || user?.username || 'Captain'})`;
    const payload = { text, reaction: '⚡', user: sender };

    const socket = chatSocketRef.current;
    if (socket && socket.connected) {
      socket.emit('spectator:chat:send', payload, (res) => {
        if (res?.success) setNewCaptainComment('');
      });
    } else {
      try {
        const res = await spectatorAPI.postComment(payload);
        if (res?.comment) mergeComments(res.comment);
        setNewCaptainComment('');
      } catch (err) {}
    }
  };

  useEffect(() => {
    const captainTeamId = user?.teamId || user?.team_id;
    if (user?.role === 'captain' && captainTeamId) {
      setActiveCaptainTeamId(captainTeamId);
    } else if (teams && teams.length > 0 && !teams.some((t) => t.id === activeCaptainTeamId)) {
      setActiveCaptainTeamId(teams[0].id);
    }
  }, [user, teams]);

  const currentHighestBid = session?.current_highest_bid || 0;
  const biddingStatus = session?.bidding_status || 'waiting';
  const incrementStep = activeIncrement || 5000;

  const myTeam = teams.find((t) => t.id === activeCaptainTeamId) || teams[0];
  const rivalTeams = teams.filter((t) => t.id !== activeCaptainTeamId);

  // Strict next single bid calculation: only allowed to raise by auctioneer step
  const nextStrictBid = currentHighestBid === 0
    ? (currentPlayer?.base_price || 10000)
    : currentHighestBid + incrementStep;
  const nextFollowBid = nextStrictBid + incrementStep;

  const isLeading = myTeam && leadingTeam && myTeam.id === leadingTeam.id;
  const availablePurse = myTeam
    ? (myTeam.availableBiddingPurse ?? myTeam.remaining_purse ?? myTeam.remainingPurse ?? 200000000)
    : 200000000;
  const canAfford = availablePurse >= nextStrictBid;
  const isBiddingActive = biddingStatus === 'open' || biddingStatus === 'active';

  const handleCaptainBid = async () => {
    if (!myTeam || isLeading || !canAfford || !isBiddingActive || biddingLoading) return;
    setBiddingError(null);
    setBiddingLoading(true);
    try {
      await placeBid(myTeam.id, nextStrictBid);
    } catch (e) {
      setBiddingError(e.message || 'Bid failed');
    } finally {
      setBiddingLoading(false);
    }
  };

  // Position Rivals
  const currentPos = currentPlayer?.primary_position || 'ST';
  const upcomingPositionRivals = (availablePool || []).filter(
    (p) => (p.primary_position === currentPos || (p.secondary_positions && p.secondary_positions.includes(currentPos))) &&
           p.id !== currentPlayer?.id
  );

  // 4-3-3 Pitch Positions
  const formationSlots = [
    { id: 'GK', label: 'Goalkeeper', pos: 'GK', x: '50%', y: '88%' },
    { id: 'LB', label: 'Left Back', pos: 'LB', x: '18%', y: '70%' },
    { id: 'CB1', label: 'Centre Back', pos: 'CB', x: '39%', y: '72%' },
    { id: 'CB2', label: 'Centre Back', pos: 'CB', x: '61%', y: '72%' },
    { id: 'RB', label: 'Right Back', pos: 'RB', x: '82%', y: '70%' },
    { id: 'CDM', label: 'Holding Mid', pos: 'CDM', x: '50%', y: '52%' },
    { id: 'CM1', label: 'Central Mid', pos: 'CM', x: '30%', y: '45%' },
    { id: 'CM2', label: 'Attacking Mid', pos: 'CAM', x: '70%', y: '45%' },
    { id: 'LW', label: 'Left Winger', pos: 'LW', x: '20%', y: '22%' },
    { id: 'ST', label: 'Striker', pos: 'ST', x: '50%', y: '16%' },
    { id: 'RW', label: 'Right Winger', pos: 'RW', x: '80%', y: '22%' },
  ];

  const getPlayerForSlot = (slot) => {
    if (!myTeam?.squad) return null;
    return myTeam.squad.find(
      (p) => p.primary_position === slot.pos || (p.secondary_positions && p.secondary_positions.includes(slot.pos))
    );
  };

  const inspectedTeam = teams.find((t) => t.id === inspectTeamId);

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full gap-8 bg-[#111215] text-white">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#22242b]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#18191f] border border-[#2a2d38] text-[#ffd000] font-mono text-xs font-bold mb-2">
            <span>●</span> CAPTAINS STRATEGY WAR ROOM
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
            Franchise Tactical Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-[#8b8e99] mt-1">
            Real-time rival purse monitoring, position alternatives radar, and 4-3-3 formation combinations.
          </p>
        </div>

        {/* Captain View Switcher */}
        <div className="flex items-center gap-1.5 bg-[#18191f] p-1.5 rounded-lg border border-[#262833]">
          <span className="text-[10px] font-bold text-[#8b8e99] px-2 uppercase">CAPTAIN VIEW:</span>
          {teams.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveCaptainTeamId(t.id)}
              className={`px-3 py-1.5 rounded text-xs font-black uppercase transition-all ${
                activeCaptainTeamId === t.id
                  ? 'bg-[#ffd000] text-[#0a0b0d] shadow-[0_0_12px_rgba(255, 208, 0,0.3)]'
                  : 'text-[#8b8e99] hover:text-white'
              }`}
            >
              {t.short_name}
            </button>
          ))}
        </div>
      </div>

      {/* ANTI-INFLATION TAX ALERT POPUP BANNER */}
      {taxAlertNotification && (
        <div className="p-4 rounded-xl bg-amber-500/15 border-2 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.2)] flex items-start justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                Anti-Inflation Tax Applied
              </div>
              <p className="text-sm font-bold text-white mt-0.5">
                {taxAlertNotification.message}
              </p>
              <div className="text-xs text-amber-300 font-mono mt-1">
                Deduction: -{taxAlertNotification.formattedDeducted} • Remaining Franchise Purse: {taxAlertNotification.formattedRemaining}
              </div>
            </div>
          </div>
          <button
            onClick={() => setTaxAlertNotification(null)}
            className="p-1 rounded bg-[#111215] text-[#8b8e99] hover:text-white border border-[#262833] text-xs px-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* DOUBLE BASE PRICE / INFLATION WARNING BANNER FOR CAPTAINS */}
      {doublePriceAlertNotification && (
        <div className="p-4 rounded-xl bg-rose-500/15 border-2 border-rose-500/60 shadow-[0_0_25px_rgba(244,63,94,0.25)] flex flex-col gap-3 animate-in fade-in slide-in-from-top-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-2">
                  <span>🔥 PRICE INFLATION ALERT (2x+ BASE PRICE)</span>
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                </div>
                <div className="text-sm font-black text-white mt-0.5">
                  Bid on <span className="text-[#ffd000]">{doublePriceAlertNotification.playerName}</span> has reached{' '}
                  <span className="text-[#ffd000] font-mono">{formatMoney(doublePriceAlertNotification.currentBid)}</span>{' '}
                  (Double Base Price: {formatMoney(doublePriceAlertNotification.basePrice)})
                </div>
                <p className="text-xs text-rose-200 mt-1">
                  ⚠️ Reminder: Losing bids can incur anti-inflation tax deductions! Consider whether you want to escalate or wait for upcoming lots.
                </p>
              </div>
            </div>
            <button
              onClick={() => setDoublePriceAlertNotification(null)}
              className="p-1 rounded bg-[#111215] text-[#8b8e99] hover:text-white border border-[#262833] text-xs px-2 self-start"
            >
              Dismiss
            </button>
          </div>

          {/* Alternative upcoming players of same position */}
          {doublePriceAlertNotification.upcomingPlayers && doublePriceAlertNotification.upcomingPlayers.length > 0 && (
            <div className="p-3 rounded-lg bg-[#111215]/80 border border-[#262833] mt-1">
              <div className="text-[10px] uppercase font-bold text-[#8b8e99] mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#ffd000]" />
                Upcoming Alternative {doublePriceAlertNotification.position} Players:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {doublePriceAlertNotification.upcomingPlayers.map((player) => (
                  <div key={player.id} className="p-2 rounded bg-[#18191f] border border-[#2a2d38] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">{player.name}</div>
                      <span className="text-[10px] text-[#ffd000] font-mono">{player.primary_position}</span>
                    </div>
                    <div className="text-right font-mono font-bold text-[#8b8e99] text-[11px]">
                      Base {formatMoney(player.base_price)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FEATURE 0: CAPTAIN'S LIVE BIDDING COMMAND DESK */}
      <div className="rounded-2xl p-4 sm:p-6 bg-[#18191f] border-2 border-[#ffd000]/60 shadow-[0_0_25px_rgba(255,208,0,0.15)] space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#262833]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#ffd000] text-[#0a0b0d] flex items-center justify-center font-black flex-shrink-0">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                <span>CAPTAIN LIVE BIDDING DESK</span>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded bg-[#ffd000] text-[#0a0b0d] font-black">
                  {myTeam?.short_name || 'CAPTAIN'}
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-[#8b8e99] mt-0.5">
                Raise bid amount strictly step-by-step. The Auctioneer retains full hammer, timing, and lot authority.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto flex-wrap">
            {/* Step Limit Indicator (Set by Auctioneer, Read-Only for Captain) */}
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-[#111215] border border-[#262833] text-xs font-mono">
              <span className="text-[9px] sm:text-[10px] text-[#8b8e99] uppercase font-bold">STEP:</span>
              <span className="text-[#ffd000] font-black">+{formatMoney(incrementStep)}</span>
            </div>

            <Link
              to="/auction"
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-[#ffd000] text-[#0a0b0d] font-black text-xs uppercase tracking-wider hover:bg-[#facc15] transition"
            >
              Enter Live Arena &rarr;
            </Link>
          </div>
        </div>

        {biddingError && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-400 text-xs font-mono">
            ⚠️ {biddingError}
          </div>
        )}

        {currentPlayer ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-center">
            {/* Player Info Left */}
            <div className="lg:col-span-4 p-3 sm:p-4 rounded-xl bg-[#111215] border border-[#262833] flex items-center gap-3">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-[#18191f] border border-[#2a2d38] overflow-hidden flex-shrink-0 flex items-center justify-center">
                {currentPlayer.photo_url ? (
                  <img src={currentPlayer.photo_url} alt={currentPlayer.name} className="w-full h-full object-cover object-top" />
                ) : (
                  <span className="font-black text-xl text-[#ffd000]">{currentPlayer.primary_position}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="px-2 py-0.5 rounded bg-[#ffd000]/15 text-[#ffd000] border border-[#ffd000]/30 text-[10px] font-mono font-bold">
                  {currentPlayer.primary_position} &bull; Base {formatMoney(currentPlayer.base_price)}
                </span>
                <h4 className="font-black text-white text-sm sm:text-base uppercase truncate mt-1">{currentPlayer.name}</h4>
                <div className="text-[11px] sm:text-xs text-[#8b8e99] font-mono">
                  Rating: <strong className="text-white">{currentPlayer.overall_rating || 85}</strong>
                </div>
              </div>
            </div>

            {/* Current Bid & Status Center */}
            <div className="lg:col-span-4 p-3.5 sm:p-4 rounded-xl bg-[#111215] border border-[#262833] text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#8b8e99] block mb-1">
                Current Highest Bid
              </span>
              <div className="text-xl xs:text-2xl sm:text-3xl font-black font-mono text-[#ffd000]">
                {currentHighestBid > 0 ? formatMoney(currentHighestBid) : 'Awaiting First Bid'}
              </div>
              {leadingTeam && (
                <div className="text-xs font-bold text-white mt-1 flex items-center justify-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: leadingTeam.primary_color }} />
                  <span className="truncate">Held by <strong style={{ color: leadingTeam.primary_color }}>{leadingTeam.name}</strong></span>
                </div>
              )}
            </div>

            {/* Captain Bid Button Right — Strictly Single Step Next Option */}
            <div className="lg:col-span-4 space-y-2">
              {isLeading ? (
                <div className="py-3 sm:py-3.5 px-4 rounded-xl bg-[#ffd000]/15 border-2 border-[#ffd000] text-[#ffd000] font-black text-center text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                  <span>&check; You Hold Highest Bid ({formatMoney(currentHighestBid)})</span>
                </div>
              ) : biddingStatus !== 'open' ? (
                <div className="py-3 sm:py-3.5 px-4 rounded-xl bg-[#111215] border border-[#262833] text-[#8b8e99] font-bold text-center text-xs uppercase">
                  Bidding is currently {biddingStatus}
                </div>
              ) : !canAfford ? (
                <div className="py-3 sm:py-3.5 px-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-400 font-bold text-center text-xs">
                  Insufficient Purse for {formatMoney(nextStrictBid)}
                </div>
              ) : (
                <button
                  onClick={handleCaptainBid}
                  disabled={biddingLoading}
                  className="w-full py-3.5 sm:py-4 rounded-xl bg-[#ffd000] hover:bg-[#facc15] active:scale-[0.98] text-[#0a0b0d] font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(255,208,0,0.35)] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  <span className="truncate">
                    {biddingLoading ? 'Submitting...' : currentHighestBid === 0
                      ? `OPEN BID AT ${formatMoney(nextStrictBid)}`
                      : `RAISE BID TO ${formatMoney(nextStrictBid)} (+${formatMoney(incrementStep)})`}
                  </span>
                </button>
              )}

              <div className="flex flex-col xs:flex-row xs:items-center justify-between text-[10px] font-mono text-[#8b8e99] px-1 gap-1">
                <span>Next Counter: <strong className="text-white">{formatMoney(nextFollowBid)}</strong></span>
                <span>Purse: <strong className="text-[#ffd000]">{formatMoney(availablePurse)}</strong></span>
              </div>
            </div>

            {/* Bottom Status strip */}
            <div className="lg:col-span-12 pt-3 border-t border-[#262833] flex items-center justify-between text-xs text-[#8b8e99] font-mono">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${biddingStatus === 'open' ? 'bg-[#ffd000] animate-pulse' : 'bg-amber-400'}`} />
                <span>Auctioneer Status: <strong className="text-white uppercase">{biddingStatus}</strong></span>
              </div>
              <span className="text-[11px] text-[#6b6e7a]">
                When you bid, competing teams automatically receive counter-bid option at +{formatMoney(incrementStep)}.
              </span>
            </div>

          </div>
        ) : (
          <div className="py-8 text-center text-[#8b8e99] text-xs">
            No player lot currently nominated on stage. Waiting for Auctioneer nomination.
          </div>
        )}
      </div>

      {/* FEATURE 1: POSITION ALTERNATIVE RADAR */}
      <div className="rounded-xl p-6 bg-[#18191f] border border-[#262833] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#262833]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#ffd000]/10 text-[#ffd000] flex items-center justify-center">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>POSITION ALTERNATIVE RADAR</span>
                <span className="px-2 py-0.5 rounded bg-[#ffd000] text-[#0a0b0d] text-[10px] font-black">
                  {currentPos} CLASS
                </span>
              </h3>
              <p className="text-[11px] text-[#8b8e99]">
                {currentPlayer
                  ? `Upcoming ${currentPos} alternatives in auction pool so you don't overspend on ${currentPlayer.name}.`
                  : `Upcoming ${currentPos} options registered in the auction pool.`}
              </p>
            </div>
          </div>

          <Link
            to="/auction"
            className="px-4 py-1.5 rounded bg-[#ffd000] hover:bg-[#facc15] text-[#0a0b0d] font-black text-xs uppercase tracking-wider transition"
          >
            BID IN AUCTION ROOM →
          </Link>
        </div>

        {/* Row: Active Lot vs Pool Alternatives */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Active Target on Bidding Block */}
          <div className="lg:col-span-4 p-4 rounded-lg bg-[#121317] border-2 border-[#ffd000]/40 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase text-[#ffd000] px-2 py-0.5 rounded bg-[#111215] border border-[#ffd000]/30">
                CURRENT BIDDING TARGET
              </span>
              <span className="text-xs font-mono font-bold text-white">
                {currentPlayer ? currentPlayer.primary_position : 'OPEN'}
              </span>
            </div>

            {currentPlayer ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#18191f] border border-[#2a2d38] flex-shrink-0">
                    {currentPlayer.photo_url ? (
                      <img src={currentPlayer.photo_url} alt={currentPlayer.name} className="w-full h-full object-cover object-top" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-[#8b8e99]">P</div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-white uppercase">{currentPlayer.name}</h4>
                    <span className="text-[11px] text-[#8b8e99] block font-mono">
                      Rating: <strong className="text-[#ffd000]">{currentPlayer.overall_rating || 85}</strong> • {currentPlayer.preferred_foot || 'R'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#22242d] flex items-center justify-between font-mono">
                  <span className="text-xs text-[#8b8e99]">Base Valuation:</span>
                  <span className="text-sm font-black text-[#ffd000]">{formatMoney(currentPlayer.base_price)}</span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[#8b8e99] italic">
                No active player lot on block. Waiting for nomination.
              </div>
            )}
          </div>

          {/* Alternatives Grid */}
          <div className="lg:col-span-8 p-4 rounded-lg bg-[#121317] border border-[#22242d] flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#22242d]">
              <span className="text-xs font-black uppercase text-white">
                Upcoming {currentPos} Options in Pool ({upcomingPositionRivals.length})
              </span>
              <span className="text-[10px] text-[#ffd000] font-mono">TACTICAL BACKUPS</span>
            </div>

            {upcomingPositionRivals.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {upcomingPositionRivals.slice(0, 6).map((rival) => (
                  <div
                    key={rival.id}
                    className="p-3 rounded bg-[#18191f] border border-[#262833] flex flex-col justify-between hover:border-[#ffd000]/40 transition"
                  >
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="font-bold text-[#ffd000]">{rival.primary_position}</span>
                      <span className="font-mono text-[#8b8e99]">OVR {rival.overall_rating || 80}</span>
                    </div>
                    <div className="font-black text-xs text-white truncate uppercase">{rival.name}</div>
                    <div className="mt-2 pt-1 border-t border-[#22242d] flex items-center justify-between font-mono text-[11px]">
                      <span className="text-[10px] text-[#646774]">Base</span>
                      <span className="font-bold text-white">{formatMoney(rival.base_price)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[#8b8e99]">
                No more upcoming players registered in the {currentPos} slot.
              </div>
            )}
          </div>

        </div>
      </div>

      {/* FEATURE 2 & 3: 4-3-3 FORMATION COMBINATION BUILDER + RIVAL FINANCES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: INTERACTIVE FORMATION PITCH */}
        <div className="lg:col-span-7 bg-[#18191f] rounded-xl p-6 border border-[#262833] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#262833]">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#ffd000]" />
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  {myTeam?.name} • 4-3-3 Pitch Combination
                </h3>
                <p className="text-[11px] text-[#8b8e99]">
                  Live signed players + trial demo fit for active lot.
                </p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold px-3 py-1 rounded bg-[#111215] text-[#ffd000] border border-[#262833]">
              {myTeam?.squad?.length || 0} / {myTeam?.max_squad_size || 15} SQUAD SLOTS
            </span>
          </div>

          {/* Green Turf Field */}
          <div className="relative w-full h-[480px] rounded-lg bg-gradient-to-b from-[#134e19] to-[#0a300e] border-2 border-[#2b6832] shadow-inner overflow-hidden p-4 select-none">
            {/* Field Lines */}
            <div className="absolute inset-x-6 top-6 bottom-6 border border-white/20 rounded pointer-events-none" />
            <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 border-t border-white/20 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-white/20 pointer-events-none" />

            {/* Formation Position Slots */}
            {formationSlots.map((slot) => {
              const signed = getPlayerForSlot(slot);
              const isTrialSlot = !signed && currentPlayer && (currentPlayer.primary_position === slot.pos);

              return (
                <div
                  key={slot.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer transition-transform hover:scale-110 z-10"
                  style={{ left: slot.x, top: slot.y }}
                >
                  {signed ? (
                    <div className="flex flex-col items-center">
                      <div className="w-9 h-9 rounded-full bg-[#111215] border-2 border-[#ffd000] shadow-lg flex items-center justify-center text-[#ffd000] font-black text-xs">
                        {signed.primary_position}
                      </div>
                      <div className="mt-1 px-2 py-0.5 rounded bg-black/90 text-[10px] font-bold text-white max-w-[80px] truncate shadow">
                        {signed.name}
                      </div>
                    </div>
                  ) : isTrialSlot ? (
                    <div className="flex flex-col items-center animate-bounce">
                      <div className="w-9 h-9 rounded-full bg-[#ffd000] border-2 border-white shadow-xl flex items-center justify-center text-[#0a0b0d] font-black text-xs">
                        FIT
                      </div>
                      <div className="mt-1 px-2 py-0.5 rounded bg-[#ffd000] text-[9px] font-black text-[#0a0b0d] max-w-[90px] truncate shadow">
                        {currentPlayer.name} (Trial)
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center opacity-60 group-hover:opacity-100">
                      <div className="w-8 h-8 rounded-full border border-dashed border-white/40 flex items-center justify-center text-[10px] font-bold text-white bg-black/40">
                        {slot.pos}
                      </div>
                      <span className="text-[9px] text-white/60 font-mono mt-0.5">OPEN</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded bg-[#111215] border border-[#22242d] text-xs text-[#8b8e99] flex items-center gap-2">
            <Info className="w-4 h-4 text-[#ffd000] flex-shrink-0" />
            <span>
              If you secure <strong>{currentPlayer ? currentPlayer.name : 'the active player lot'}</strong>, they slot directly into your highlighted formation quota.
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: RIVALS FINANCIAL INTEL & ROSTER INSPECTOR */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          <div className="bg-[#18191f] rounded-xl p-6 border border-[#262833] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#262833]">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#ffd000]" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Rivals Live Financial Intel
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              {rivalTeams.map((rival) => {
                const maxSquad = rival.max_squad_size || 15;
                const purchased = rival.playersPurchased || rival.squad?.length || 0;
                const remainingSlots = Math.max(0, maxSquad - purchased);
                const maxBidCap = Math.max(0, (rival.remainingPurse || 0) - (Math.max(0, remainingSlots - 1) * 10000));
                const squad = rival.squad || [];
                
                return (
                  <div
                    key={rival.id}
                    className="p-4 rounded-lg bg-[#121317] border border-[#22242d] hover:border-[#ffd000]/40 transition space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center font-black text-xs text-[#0a0b0d]"
                          style={{ backgroundColor: rival.primary_color || '#ffd000' }}
                        >
                          {rival.short_name}
                        </div>
                        <div>
                          <h4 className="font-black text-xs text-white uppercase">{rival.name}</h4>
                          <span className="text-[10px] text-[#8b8e99]">Leader: {rival.captain_name || 'Captain'}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setInspectTeamId(rival.id)}
                        className="px-3 py-1 rounded bg-[#18191f] hover:bg-[#22242e] border border-[#2b2e3a] text-[10px] font-black text-[#ffd000] uppercase transition flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect ({purchased})</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#22242d] text-center font-mono">
                      <div>
                        <span className="text-[9px] text-[#6b6e7a] block uppercase">Remaining Purse</span>
                        <span className="text-xs font-black text-[#ffd000]">{formatMoney(rival.remainingPurse)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#6b6e7a] block uppercase">Max Single Bid</span>
                        <span className="text-xs font-black text-white">{formatMoney(maxBidCap)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#6b6e7a] block uppercase">Open Slots</span>
                        <span className="text-xs font-black text-[#8b8e99]">
                          {remainingSlots} left
                        </span>
                      </div>
                    </div>

                    {/* Quick Roster Tracker for this Rival */}
                    {squad.length > 0 && (
                      <div className="pt-2 border-t border-[#1d1f27] space-y-1">
                        <div className="text-[9px] font-bold text-[#8b8e99] uppercase tracking-wider">
                          Signed Players &amp; Amounts ({squad.length}):
                        </div>
                        <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                          {squad.map((sp, sIdx) => (
                            <div key={sp.id || sIdx} className="flex items-center justify-between text-[10px] font-mono p-1 rounded bg-[#18191f]">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="text-[#ffd000] font-black text-[9px] px-1 rounded bg-[#ffd000]/10">{sp.primary_position}</span>
                                <span className="text-white truncate font-sans">{sp.name}</span>
                              </div>
                              <span className="text-[#ffd000] font-bold flex-shrink-0 ml-2">
                                {formatMoney(sp.purchase_price || sp.sold_price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Franchise Summary */}
          <div className="bg-[#18191f] rounded-xl p-6 border border-[#262833] space-y-3">
            <h4 className="text-xs font-black uppercase text-[#8b8e99] tracking-wider">
              {myTeam?.name} • Your Purse Status
            </h4>
            <div className="grid grid-cols-2 gap-3 text-center font-mono">
              <div className="p-3 rounded bg-[#121317] border border-[#22242d]">
                <span className="text-[10px] text-[#8b8e99] block uppercase">Remaining Purse</span>
                <span className="text-base font-black text-[#ffd000]">
                  {formatMoney(myTeam?.remainingPurse)}
                </span>
              </div>
              <div className="p-3 rounded bg-[#121317] border border-[#22242d]">
                <span className="text-[10px] text-[#8b8e99] block uppercase">Purchased Roster</span>
                <span className="text-base font-black text-white">
                  {myTeam?.squad?.length || 0} / {myTeam?.max_squad_size || 15}
                </span>
              </div>
            </div>

            {/* My Team Signed Players Ledger */}
            {myTeam?.squad && myTeam.squad.length > 0 && (
              <div className="pt-2 border-t border-[#22242d] space-y-1">
                <div className="text-[10px] font-bold text-[#ffd000] uppercase tracking-wider mb-1">
                  Your Signed Players ({myTeam.squad.length}):
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {myTeam.squad.map((p, idx) => (
                    <div key={p.id || idx} className="flex items-center justify-between text-[11px] font-mono p-1.5 rounded bg-[#121317] border border-[#22242d]">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[#ffd000] font-black text-[9px] px-1 rounded bg-[#ffd000]/10">{p.primary_position}</span>
                        <span className="text-white truncate font-sans font-bold">{p.name}</span>
                      </div>
                      <span className="text-[#ffd000] font-bold">
                        {formatMoney(p.purchase_price || p.sold_price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Live Spectator Comments & Cheer Feed for Captains */}
          <div className="bg-[#18191f] rounded-xl p-5 border border-[#262833] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#262833]">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#ffd000]" />
                <h4 className="text-xs font-black uppercase text-white tracking-wider">
                  Live Spectator Cheers
                </h4>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <span className="w-2 h-2 rounded-full bg-[#ffd000] animate-pulse" />
                <span className="text-[#ffd000] font-bold">{comments.length} Cheers</span>
              </div>
            </div>

            {/* Comment Stream */}
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {comments.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#8b8e99]">
                  No spectator comments yet. Cheers will appear here live!
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="p-2 rounded-lg bg-[#121317] border border-[#22242d] space-y-0.5 text-xs">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-[#ffd000]">{c.user}</span>
                      <span className="text-[#646774] font-mono">{new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="text-white/90 flex items-center justify-between gap-2">
                      <span className="break-words">{c.text}</span>
                      <span className="flex-shrink-0 text-xs">{c.reaction}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Captain Reply / Cheer */}
            <form onSubmit={handleSendCaptainComment} className="pt-2 border-t border-[#262833] flex items-center gap-2">
              <input
                type="text"
                value={newCaptainComment}
                onChange={(e) => setNewCaptainComment(e.target.value)}
                maxLength={300}
                placeholder={`Cheer from ${myTeam?.name || 'Captain'}...`}
                className="flex-1 bg-[#121317] border border-[#262833] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#646774] focus:outline-none focus:border-[#ffd000]"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-[#ffd000] hover:bg-[#facc15] text-[#0a0b0d] text-xs font-bold flex items-center gap-1 shadow transition hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0"
              >
                <Send className="w-3 h-3" />
                <span>Send</span>
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* RIVAL TEAM SQUAD INSPECTION MODAL */}
      {inspectTeamId && inspectedTeam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18191f] rounded-xl p-6 max-w-xl w-full border border-[#2a2d3a] shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#262833]">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded flex items-center justify-center font-black text-[#0a0b0d] text-base"
                  style={{ backgroundColor: inspectedTeam.primary_color || '#ffd000' }}
                >
                  {inspectedTeam.short_name}
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase">{inspectedTeam.name} Squad Roster</h3>
                  <p className="text-xs text-[#8b8e99]">Total Spent: {formatMoney(inspectedTeam.totalSpent)}</p>
                </div>
              </div>

              <button
                onClick={() => setInspectTeamId(null)}
                className="w-8 h-8 rounded bg-[#121317] text-[#8b8e99] hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {inspectedTeam.squad && inspectedTeam.squad.length > 0 ? (
                inspectedTeam.squad.map((player, idx) => (
                  <div
                    key={player.id || idx}
                    className="p-3 rounded bg-[#121317] border border-[#22242d] flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2.5 font-sans">
                      <span className="w-5 text-[#555866] text-[10px]">#{idx + 1}</span>
                      <div>
                        <div className="font-bold text-white text-xs uppercase">{player.name}</div>
                        <span className="text-[10px] text-[#8b8e99] font-mono">Rating: {player.overall_rating || 80}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded bg-[#18191f] border border-[#2b2e3c] text-[10px] font-bold text-[#ffd000]">
                        {player.primary_position}
                      </span>
                      <span className="font-black text-[#ffd000] text-xs">
                        {formatMoney(player.sold_price || player.purchase_price)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-[#8b8e99]">
                  {inspectedTeam.name} has not signed any players in the auction yet.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#262833] flex justify-end">
              <button
                onClick={() => setInspectTeamId(null)}
                className="px-5 py-2 rounded bg-[#121317] hover:bg-[#22242e] text-xs font-black uppercase text-white transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

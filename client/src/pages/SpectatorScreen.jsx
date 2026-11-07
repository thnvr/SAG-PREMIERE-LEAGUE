import React, { useState, useEffect, useRef } from 'react';
import { useAuction } from '../context/AuctionContext';
import { useAuth } from '../context/AuthContext';
import { connectSocket } from '../services/socket';
import { getToken, formatMoney, spectatorAPI } from '../services/api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { loadHistoryAndPoll, recordGoogleActivity, WEB_APP_URL } from '../services/googleFeedAPI';
import PlayerCard from '../components/PlayerCard';
import CountdownTimer from '../components/CountdownTimer';
import SoldBanner from '../components/SoldBanner';
import {
  Trophy,
  Maximize,
  Minimize,
  Sparkles,
  Gavel,
  Shield,
  MessageSquare,
  Send,
  Heart,
  Flame,
  ThumbsUp,
  Eye,
  Layers,
  ChevronRight,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SpectatorScreen() {
  const {
    session,
    currentPlayer,
    leadingTeam,
    teams,
    countdown,
    soldAnimation,
    setSoldAnimation
  } = useAuction();
  const { user } = useAuth();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTeamView, setSelectedTeamView] = useState(null);
  const [activeRightTab, setActiveRightTab] = useState('feed'); // 'feed' | 'cheers'
  
  // Interactive Persistent Spectator Encouragement Comments
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [chatError, setChatError] = useState('');
  const chatBottomRef = useRef(null);
  const chatSocketRef = useRef(null);

  // Google Apps Script Live Activity & Broadcast Feed Polling (every 2s)
  useEffect(() => {
    // Record current spectator/user session
    recordGoogleActivity({
      user: user?.displayName || user?.username || 'Spectator Fan',
      status: 'Watching Live Auction',
    });

    // Load past history immediately when page opens
    loadHistoryAndPoll();

    // Refresh every 2 seconds so new logins appear automatically
    const pollInterval = setInterval(() => {
      loadHistoryAndPoll();
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [user?.displayName, user?.username]);

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
    // 1. Immediately load comments from API / DB
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

    // 2. Continuous 2-second polling ensures all new viewers & cross-logins see new comments immediately
    const pollTimer = setInterval(loadComments, 2000);

    // 3. Cross-tab BroadcastChannel for instantaneous sync across browser windows
    let bc = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('sag_chat_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'NEW_COMMENT' && event.data?.payload) {
            mergeComments(event.data.payload);
          }
        };
      }
    } catch {}

    // 4. Supabase Realtime channel for live internet broadcasts
    let channel = null;
    if (isSupabaseConfigured) {
      try {
        channel = supabase
          .channel('spectator-chat-live')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'spectator_comments' },
            (payload) => {
              if (payload.new) {
                mergeComments({
                  id: payload.new.id,
                  user: payload.new.author_name,
                  text: payload.new.message,
                  reaction: payload.new.reaction || '🔥',
                  time: payload.new.created_at,
                });
              }
            }
          )
          .subscribe();
      } catch {}
    }

    return () => {
      clearInterval(pollTimer);
      if (bc) bc.close();
      if (channel) supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const sendChatMessage = async (payload, onSuccess) => {
    const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
    if (!text) return;

    const reaction = payload.reaction || '🔥';
    const sender = user?.displayName || user?.username || 'Spectator';

    setChatError('');
    try {
      const res = await spectatorAPI.postComment({ text, reaction, user: sender });
      if (res?.comment) {
        mergeComments(res.comment);
      }
      onSuccess?.();
    } catch (err) {
      setChatError(err.message || 'Unable to post message.');
    }
  };

    const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  const handleSendComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    sendChatMessage({ text: newComment.trim(), reaction: '🔥' }, () => setNewComment(''));
  };

  const sendQuickEmoji = (emoji) => {
    const text = emoji === '🔥' ? 'High stakes bidding!' : emoji === '👏' ? 'Incredible purchase!' : emoji === '⚡' ? 'Rapid bidding war!' : emoji === '🏆' ? 'Championship caliber signing!' : 'Defend the budget!';
    sendChatMessage({ text, reaction: emoji });
  };

  const currentHighestBid = session?.current_highest_bid || 0;
  const inspectedTeam = teams.find((t) => t.id === selectedTeamView);

  return (
    <div className="flex-1 bg-[#111215] text-[#f1f2f6] flex flex-col p-4 sm:p-6 lg:p-8 select-none relative min-h-screen font-sans">
      
      {/* Top Broadcast Header Bar - Consistent with Home Page */}
      <div className="relative z-10 flex items-center justify-between pb-4 mb-6 border-b border-[#22242b]">
        {/* Official Shield Logo & League Title */}
        <div className="flex items-center gap-3.5">
          <div className="relative w-11 h-11 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_0_12px_rgba(255,208,0,0.35)]">
              <defs>
                <linearGradient id="specShield" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1a1b22" />
                  <stop offset="100%" stopColor="#0b0c0f" />
                </linearGradient>
                <linearGradient id="specGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffd000" />
                  <stop offset="100%" stopColor="#b89000" />
                </linearGradient>
              </defs>
              <path
                d="M50 4 L94 20 L94 65 C94 92 50 116 50 116 C50 116 6 92 6 65 L6 20 Z"
                fill="url(#specShield)"
                stroke="url(#specGold)"
                strokeWidth="4"
              />
              <circle cx="50" cy="55" r="22" fill="#ffffff" />
              <path d="M50 43 L59 50 L56 60 L44 60 L41 50 Z" fill="#111215" />
              <path d="M50 43 L50 33 M59 50 L69 47 M56 60 L62 70 M44 60 L38 70 M41 50 L31 47" stroke="#111215" strokeWidth="2.5" />
              <polygon points="50,14 53,21 60,21 54,26 56,33 50,28 44,33 46,26 40,21 47,21" fill="#ffd000" />
            </svg>
          </div>

          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white leading-none">
              SAG <span className="text-[#ffd000]">PREMIERE LEAGUE</span>
            </h1>
            <span className="text-[10px] tracking-[0.2em] text-[#9ca0b0] font-black uppercase mt-1 font-mono">
              OFFICIAL AUCTION SPECTATOR BROADCAST • SEASON 2026
            </span>
          </div>
        </div>

        {/* Live Pill & Fullscreen Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#18191f] border border-[#ffd000]/40 text-xs font-mono shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#ffd000] animate-pulse shadow-[0_0_8px_#ffd000]" />
            <span className="text-white font-black tracking-wider">LIVE STADIUM FEED</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-md bg-[#18191f] hover:bg-[#23252d] border border-[#262833] text-white transition"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Broadcast Stage (Three-Column Layout) */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* =========================================================================
            COLUMN 1 (LG: 5): ACTIVE PLAYER LOT ON BLOCK
           ========================================================================= */}
        <div className="lg:col-span-5 rounded-2xl p-4 sm:p-6 bg-[#18191f] border border-[#262833] flex flex-col items-center justify-center min-h-[440px] sm:min-h-[540px]">
          {currentPlayer ? (
            <div className="flex flex-col items-center w-full">
              <div className="mb-4 px-3 sm:px-4 py-1.5 rounded-lg bg-[#111215] border border-[#ffd000]/40 text-[#ffd000] text-xs font-mono font-black tracking-widest uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#ffd000] animate-pulse" />
                ACTIVE ON BIDDING BLOCK
              </div>
              {/* Card container: flex centred, full width so xl card shows properly */}
              <div className="flex items-center justify-center w-full overflow-hidden">
                <PlayerCard
                  player={currentPlayer}
                  size="xl"
                  showStats={true}
                  showPrice={true}
                  className="max-w-[285px] xs:max-w-[340px] drop-shadow-[0_24px_60px_rgba(0,0,0,0.95)]"
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-[#6b6e7a] flex flex-col items-center max-w-sm">
              <div className="w-20 h-20 rounded-2xl bg-[#111215] border border-[#262833] flex items-center justify-center mb-6 shadow-inner">
                <Gavel className="w-10 h-10 text-[#ffd000] animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                Awaiting Next Lot
              </h2>
              <p className="text-xs text-[#9ca0b0] mt-2 font-medium leading-relaxed">
                The auctioneer will nominate the next superstar player onto the auction stage shortly.
              </p>
            </div>
          )}
        </div>

        {/* =========================================================================
            COLUMN 2 (LG: 4): CURRENT HIGHEST BID & FRANCHISE INSPECTION
           ========================================================================= */}
        <div className="lg:col-span-4 flex flex-col gap-5 justify-between">
          
          {/* Giant Live Bid Meter Box */}
          <div className="rounded-2xl p-6 bg-[#18191f] border border-[#262833] shadow-xl flex flex-col items-center text-center">
            <span className="text-[11px] uppercase font-black tracking-widest text-[#9ca0b0] block mb-2">
              CURRENT HIGHEST BID
            </span>

            <div className="text-5xl sm:text-6xl font-black font-mono text-[#ffd000] tracking-tight leading-none drop-shadow-[0_0_20px_rgba(255,208,0,0.25)]">
              {currentHighestBid > 0 ? formatMoney(currentHighestBid) : '₹0'}
            </div>

            {leadingTeam ? (
              <div className="text-sm font-black text-white mt-4 flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-[#111215] border border-[#282a35]">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: leadingTeam.primary_color }} />
                <span>Leader: <strong style={{ color: leadingTeam.primary_color }}>{leadingTeam.name}</strong></span>
              </div>
            ) : (
              <div className="text-xs text-[#9ca0b0] font-mono mt-3">
                Waiting for opening bid
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-[#262833] w-full flex justify-center">
              <CountdownTimer seconds={countdown} totalDuration={30} />
            </div>
          </div>

          {/* Spectator Franchise Roster Inspector */}
          <div className="rounded-2xl p-5 bg-[#18191f] border border-[#262833] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#262833]">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white">
                <Shield className="w-4 h-4 text-[#ffd000]" />
                <span>Spectator Franchise View</span>
              </div>
              <span className="text-[10px] text-[#ffd000] font-mono font-bold">CLICK TO INSPECT</span>
            </div>

            {/* 3 Teams Selectors */}
            <div className="grid grid-cols-3 gap-2">
              {teams.map((t) => {
                const isLeading = leadingTeam && leadingTeam.id === t.id;
                const isSelected = selectedTeamView === t.id;

                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTeamView(isSelected ? null : t.id)}
                    className={`rounded-xl p-3 text-left transition flex flex-col justify-between border cursor-pointer ${
                      isSelected
                        ? 'border-[#ffd000] bg-[#ffd000]/10 ring-1 ring-[#ffd000]'
                        : isLeading
                        ? 'border-[#ffd000]/50 bg-[#111215]'
                        : 'border-[#262833] bg-[#111215] hover:bg-[#1a1b22]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black text-[#0a0b0d]"
                        style={{ backgroundColor: t.primary_color || '#ffd000' }}
                      >
                        {t.short_name}
                      </div>
                      <span className="font-black text-xs text-white truncate">{t.short_name}</span>
                    </div>

                    <div className="font-mono text-[10px]">
                      <span className="text-[#8b8e99] block font-bold">Purse:</span>
                      <span className="font-black text-[#ffd000]">{formatMoney(t.remainingPurse)}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Expanded Bought Squad Drawer */}
            {inspectedTeam && (
              <div className="mt-3 p-3.5 rounded-xl bg-[#111215] border border-[#262833] text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-white uppercase font-black">{inspectedTeam.name} Roster</span>
                  <span className="text-[#ffd000] font-mono">{inspectedTeam.squad?.length || 0} / {inspectedTeam.max_squad_size || 15}</span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {inspectedTeam.squad && inspectedTeam.squad.length > 0 ? (
                    inspectedTeam.squad.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-[#18191f] text-[11px] border border-[#22242e]">
                        <span className="text-white font-bold truncate">{p.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-[#111215] text-[9px] text-[#ffd000] font-mono font-bold">{p.primary_position}</span>
                          <span className="font-mono text-[#ffd000] font-bold text-[10px]">{formatMoney(p.sold_price || p.purchase_price)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-[#8b8e99] text-[11px]">No players acquired yet.</div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* =========================================================================
            COLUMN 3 (LG: 3): SPECTATOR CHAT & BROADCAST ACTIVITY FEED (GOOGLE SHEET BACKEND)
           ========================================================================= */}
        <div className="lg:col-span-3 flex flex-col justify-between rounded-2xl bg-[#18191f] border border-[#262833] p-4 h-[520px]">
          <div>
            {/* Header with Switcher Tabs */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#262833]">
              <div className="flex items-center gap-1.5 p-1 bg-[#111215] rounded-xl border border-[#262833]">
                <button
                  type="button"
                  onClick={() => setActiveRightTab('feed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    activeRightTab === 'feed'
                      ? 'bg-[#ffd000] text-[#0a0b0d] shadow'
                      : 'text-[#9ca0b0] hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Activity Feed
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRightTab('cheers')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    activeRightTab === 'cheers'
                      ? 'bg-[#ffd000] text-[#0a0b0d] shadow'
                      : 'text-[#9ca0b0] hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Fan Cheers
                </button>
              </div>
              <span className="text-[10px] text-[#ffd000] font-mono font-bold">2s Sync</span>
            </div>

            {/* TAB 1: Live Broadcast Activity Feed (Google Apps Script Backend) */}
            <div style={{ display: activeRightTab === 'feed' ? 'block' : 'none' }}>
              <div className="flex items-center justify-between text-[11px] text-[#8b8e99] mb-2 px-1">
                <span>Google Sheet Backend Connected</span>
                <span className="text-emerald-400 font-mono text-[10px]">● Online</span>
              </div>
              <div
                id="broadcast-feed"
                style={{
                  background: '#111',
                  color: '#fff',
                  padding: '14px',
                  height: '380px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  lineHeight: '1.6',
                  borderRadius: '12px',
                  border: '1px solid #262833',
                }}
              >
                Loading previous activity...
              </div>
            </div>

            {/* TAB 2: Fan Cheers & Chat Feed */}
            <div style={{ display: activeRightTab === 'cheers' ? 'block' : 'none' }}>
              {/* Quick Emoji Reaction Buttons */}
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#262833]">
                <span className="text-[10px] text-[#9ca0b0] font-bold uppercase">Cheer:</span>
                {['🔥', '👏', '⚡', '⚽', '🏆'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => sendQuickEmoji(emoji)}
                    className="w-8 h-8 rounded-lg bg-[#111215] hover:bg-[#22242e] border border-[#282a35] flex items-center justify-center text-sm transition hover:scale-110 active:scale-95 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Comment Stream */}
              <div className="h-64 overflow-y-auto space-y-2 pr-1">
                {comments.length === 0 ? (
                  <div className="text-center py-12 text-xs text-[#8b8e99] flex flex-col items-center">
                    <MessageSquare className="w-6 h-6 text-[#ffd000]/40 mb-2" />
                    <span>No spectator cheers yet.</span>
                    <span className="text-[10px] text-[#646774] mt-0.5">Be the first to drop a comment!</span>
                  </div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-xl bg-[#111215] border border-[#22242d] space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-[#ffd000]">{c.user}</span>
                        <span className="text-[#646774] font-mono">{new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="text-xs text-white/90 flex items-center justify-between gap-2">
                        <span className="break-words">{c.text}</span>
                        <span className="flex-shrink-0 text-sm">{c.reaction}</span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Comment Input Box */}
              <div className="pt-2 border-t border-[#262833]">
                <div className="text-[10px] text-[#8b8e99] flex items-center justify-between pb-1.5 px-0.5">
                  <span>Chatting as <strong className="text-[#ffd000]">{user?.displayName || user?.username || 'Spectator'}</strong></span>
                  <span className="font-mono text-[9px] text-[#ffd000]">{comments.length} total</span>
                </div>
                <form onSubmit={handleSendComment} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    maxLength={300}
                    placeholder="Cheer for your team..."
                    className="flex-1 bg-[#111215] border border-[#262833] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#646774] focus:outline-none focus:border-[#ffd000]"
                  />
                  <button
                    type="submit"
                    className="w-8 h-8 rounded-lg bg-[#ffd000] hover:bg-[#facc15] text-[#0a0b0d] flex items-center justify-center shadow transition hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
                {chatError && <p role="status" className="pt-1 text-[10px] text-rose-300">{chatError}</p>}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Sold Broadcast Overlay Banner */}
      {soldAnimation && (
        <SoldBanner
          sale={soldAnimation}
          onClose={() => setSoldAnimation(null)}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { playersAPI, auctionAPI, formatMoney } from '../services/api';
import { useAuction } from '../context/AuctionContext';
import { pushPlayerToAuction } from '../services/firebaseAuction';
import {
  RotateCw,
  Zap,
  Play,
  CheckSquare,
  Square,
  Users,
  AlertCircle,
  Sparkles,
  Filter,
  CheckCircle2,
  RefreshCw,
  Shuffle,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

const POSITION_ORDER = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'CF'];

// Broad position buckets to prevent same-role runs (e.g. striker spam)
const POSITION_BUCKETS = {
  GK: 'Goalkeepers',
  CB: 'Defenders',
  LB: 'Defenders',
  RB: 'Defenders',
  CDM: 'Midfielders',
  CM: 'Midfielders',
  CAM: 'Midfielders',
  LW: 'Attackers',
  RW: 'Attackers',
  ST: 'Attackers',
  CF: 'Attackers'
};

const BUCKET_ORDER = ['Attackers', 'Midfielders', 'Defenders', 'Goalkeepers'];

export default function SpinPlayerAuction({ onNominated }) {
  const { nominatePlayer } = useAuction();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Availability / Inclusion map for spin pool: playerId -> boolean
  const [availabilityMap, setAvailabilityMap] = useState({});

  // Position distribution rotation state
  const [balanceMode, setBalanceMode] = useState('position_rotation'); // 'position_rotation' | 'pure_random' | 'bucket_rotation'
  const [lastSelectedPosition, setLastSelectedPosition] = useState(null);
  const [lastSelectedBucket, setLastSelectedBucket] = useState(null);
  const [selectedPositionFilter, setSelectedPositionFilter] = useState('ALL');

  // Spin animation state
  const [isSpinning, setIsSpinning] = useState(false);
  const [highlightedPlayer, setHighlightedPlayer] = useState(null);
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [spinHistory, setSpinHistory] = useState([]);
  const [nominateLoading, setNominateLoading] = useState(false);
  const [nominateSuccess, setNominateSuccess] = useState(null);

  // Sound / Interval ref
  const spinIntervalRef = useRef(null);

  // Load upcoming / registered players
  const loadPool = async () => {
    setLoading(true);
    try {
      const data = await playersAPI.getAll({ status: 'upcoming' });
      const list = Array.isArray(data) ? data : [];
      setPlayers(list);

      // Initialize availability map (default all checked)
      setAvailabilityMap((prev) => {
        const next = { ...prev };
        list.forEach((p) => {
          if (next[p.id] === undefined) {
            next[p.id] = true;
          }
        });
        return next;
      });
    } catch (err) {
      setError(err.message || 'Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPool();
  }, []);

  // Filter eligible players (checked in availability map)
  const eligiblePlayers = useMemo(() => {
    return players.filter((p) => {
      const isAvailable = availabilityMap[p.id] !== false;
      const matchesFilter = selectedPositionFilter === 'ALL' || p.primary_position === selectedPositionFilter;
      return isAvailable && matchesFilter;
    });
  }, [players, availabilityMap, selectedPositionFilter]);

  // Available positions breakdown
  const positionCounts = useMemo(() => {
    const counts = {};
    players.forEach((p) => {
      if (availabilityMap[p.id] !== false) {
        counts[p.primary_position] = (counts[p.primary_position] || 0) + 1;
      }
    });
    return counts;
  }, [players, availabilityMap]);

  // Toggle availability for a single player
  const togglePlayerAvailability = (playerId) => {
    setAvailabilityMap((prev) => ({
      ...prev,
      [playerId]: !prev[playerId]
    }));
  };

  // Toggle all players
  const handleSelectAll = (checkAll) => {
    const updated = {};
    players.forEach((p) => {
      updated[p.id] = checkAll;
    });
    setAvailabilityMap(updated);
  };

  /**
   * STRUCTURED SELECTION LOGIC
   * Avoids consecutive runs of the same position (e.g. Strikers back-to-back)
   * Cycles fairly through available positions and buckets.
   */
  const pickNextBalancedPlayer = () => {
    if (eligiblePlayers.length === 0) return null;
    if (eligiblePlayers.length === 1) return eligiblePlayers[0];

    if (balanceMode === 'pure_random') {
      const idx = Math.floor(Math.random() * eligiblePlayers.length);
      return eligiblePlayers[idx];
    }

    if (balanceMode === 'bucket_rotation') {
      // Find eligible buckets excluding the last chosen bucket
      const otherBucketCandidates = eligiblePlayers.filter(
        (p) => POSITION_BUCKETS[p.primary_position] !== lastSelectedBucket
      );

      const candidatePool = otherBucketCandidates.length > 0 ? otherBucketCandidates : eligiblePlayers;
      const idx = Math.floor(Math.random() * candidatePool.length);
      return candidatePool[idx];
    }

    // Default: 'position_rotation' - Strict anti-striker/same position spam
    // 1. First prioritize players whose primary position is DIFFERENT from last selected
    const differentPosCandidates = eligiblePlayers.filter(
      (p) => p.primary_position !== lastSelectedPosition
    );

    // 2. Also ensure we don't pick the same macro-bucket (e.g. Attackers: ST -> LW -> RW)
    const differentBucketCandidates = differentPosCandidates.filter(
      (p) => POSITION_BUCKETS[p.primary_position] !== lastSelectedBucket
    );

    let candidates = eligiblePlayers;
    if (differentBucketCandidates.length > 0) {
      candidates = differentBucketCandidates;
    } else if (differentPosCandidates.length > 0) {
      candidates = differentPosCandidates;
    }

    const randomIndex = Math.floor(Math.random() * candidates.length);
    return candidates[randomIndex];
  };

  // Execute Spin Animation & Wheel
  const handleStartSpin = () => {
    if (isSpinning || eligiblePlayers.length === 0) return;

    setIsSpinning(true);
    setSelectedWinner(null);
    setNominateSuccess(null);
    setError(null);

    const winner = pickNextBalancedPlayer();
    if (!winner) {
      setIsSpinning(false);
      return;
    }

    let speed = 60; // ms
    let iterations = 0;
    const maxIterations = 28 + Math.floor(Math.random() * 8);

    const step = () => {
      iterations++;
      const randomDisplay = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
      setHighlightedPlayer(randomDisplay);

      if (iterations >= maxIterations) {
        // Land on determined balanced winner
        setHighlightedPlayer(winner);
        setSelectedWinner(winner);
        setIsSpinning(false);
        setLastSelectedPosition(winner.primary_position);
        setLastSelectedBucket(POSITION_BUCKETS[winner.primary_position] || null);
        setSpinHistory((prev) => [winner, ...prev.slice(0, 9)]);
      } else {
        // Slow down toward end
        if (iterations > maxIterations - 8) {
          speed += 40;
        } else if (iterations > maxIterations - 4) {
          speed += 80;
        }
        spinIntervalRef.current = setTimeout(step, speed);
      }
    };

    spinIntervalRef.current = setTimeout(step, speed);
  };

  // Go live immediately with chosen player
  const handleNominateLive = async () => {
    if (!selectedWinner) return;
    setNominateLoading(true);
    setError(null);
    try {
      // Instant push to Firebase Firestore doc 'auction/liveState'
      pushPlayerToAuction(selectedWinner, {
        currentBid: selectedWinner.base_price,
        highestBidder: 'None',
        status: 'active',
      }).catch(() => {});

      await nominatePlayer(selectedWinner.id, {
        name: selectedWinner.name,
        base_price: selectedWinner.base_price,
        primary_position: selectedWinner.primary_position
      });
      setNominateSuccess(`🚀 ${selectedWinner.name} is NOW LIVE on the Auction Block!`);
      if (onNominated) onNominated(selectedWinner);

      // Refresh pool so the nominated player moves out of upcoming
      setTimeout(() => {
        loadPool();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to nominate player to live auction');
    } finally {
      setNominateLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-white font-sans">
      
      {/* Top Banner & Info */}
      <div className="p-6 rounded-2xl bg-[#18191f] border border-[#262833] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ffd000]/10 border border-[#ffd000]/30 text-[#ffd000] font-mono text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>BALANCED ROTATION LOT PICKER</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
            <Shuffle className="w-6 h-6 text-[#ffd000]" />
            Spin Player Auction Room
          </h2>
          <p className="text-xs text-[#8b8e99] mt-1 max-w-2xl">
            Pick registered players one by one using fair position alternation. Prevents striker/forward flooding by rotating between Attackers, Midfielders, Defenders, and Keepers.
          </p>
        </div>

        {/* Pool Stat Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadPool}
            className="p-2.5 rounded-xl bg-[#111215] hover:bg-[#22242d] border border-[#262833] text-[#8b8e99] hover:text-white transition cursor-pointer"
            title="Refresh player registry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#ffd000]' : ''}`} />
          </button>

          <div className="px-3.5 py-2 rounded-xl bg-[#111215] border border-[#262833] text-xs font-mono">
            <span className="text-[#8b8e99] block text-[9px] uppercase">Registered Pool</span>
            <span className="text-[#ffd000] font-bold text-sm">{players.length} Players</span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-[#111215] border border-[#262833] text-xs font-mono">
            <span className="text-[#8b8e99] block text-[9px] uppercase">Active in Spin</span>
            <span className="text-emerald-400 font-bold text-sm">{eligiblePlayers.length} Active</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {nominateSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{nominateSuccess}</span>
        </div>
      )}

      {/* Main Grid: Left Stage (Spin Wheel & Winner Lot) | Right (Tick Availability & Queue) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Spin Stage & Wheel Center (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* SPIN ARENA BOX */}
          <div className="p-4 sm:p-6 lg:p-8 rounded-2xl bg-[#18191f] border-2 border-[#ffd000]/40 shadow-[0_0_35px_rgba(255,208,0,0.1)] flex flex-col items-center text-center relative overflow-hidden">
            
            {/* Background Glow */}
            <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#ffd000]/5 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

            {/* Anti-Inflation Position Rule Pill */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#111215] border border-[#2a2d38] text-[10px] uppercase font-mono tracking-wider mb-6 max-w-full truncate">
              <span className="text-[#8b8e99]">Anti-Spam Logic:</span>
              <span className="text-[#ffd000] font-black truncate">
                {balanceMode === 'position_rotation'
                  ? 'Active (No Same-Position Runs)'
                  : balanceMode === 'bucket_rotation'
                  ? 'Macro-Role Rotation'
                  : 'Pure Random'}
              </span>
            </div>

            {/* Active Display Stage Card */}
            <div className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-[#22242e] to-[#111215] border-2 border-[#333745] p-6 shadow-2xl relative transition-all duration-200">
              {highlightedPlayer || selectedWinner ? (
                <div className="flex flex-col items-center">
                  {/* Photo or Default Avatar */}
                  <div className="relative mb-3">
                    <div className="w-24 h-24 rounded-2xl bg-[#18191f] border-2 border-[#ffd000] overflow-hidden flex items-center justify-center shadow-lg">
                      {(highlightedPlayer || selectedWinner).photo_url ? (
                        <img
                          src={(highlightedPlayer || selectedWinner).photo_url}
                          alt={(highlightedPlayer || selectedWinner).name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="w-10 h-10 text-[#ffd000]" />
                      )}
                    </div>
                    <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded bg-[#ffd000] text-[#0a0b0d] font-black text-xs uppercase shadow">
                      {(highlightedPlayer || selectedWinner).primary_position}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                    {(highlightedPlayer || selectedWinner).name}
                  </h3>
                  <div className="text-xs text-[#8b8e99] font-mono mt-0.5">
                    {(highlightedPlayer || selectedWinner).club || 'SAG Registry'} • Rating: {(highlightedPlayer || selectedWinner).overall_rating || 80} OVR
                  </div>

                  <div className="mt-3 px-4 py-1.5 rounded-lg bg-[#18191f] border border-[#2a2d38] font-mono text-base font-black text-[#ffd000]">
                    Base Price: {formatMoney((highlightedPlayer || selectedWinner).base_price)}
                  </div>

                  {selectedWinner && !isSpinning && (
                    <div className="mt-3 text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                      <Sparkles className="w-3.5 h-3.5" />
                      SELECTED BY SPIN • READY TO NOMINATE
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center text-[#8b8e99]">
                  <RotateCw className="w-14 h-14 text-[#ffd000]/40 mb-3 animate-spin duration-1000" />
                  <span className="font-bold text-sm uppercase text-white">Spin Wheel Ready</span>
                  <span className="text-xs text-[#6b6e7c] mt-1">Press SPIN PLAYER to initiate balanced selection</span>
                </div>
              )}
            </div>

            {/* Spin Controls */}
            <div className="w-full max-w-sm mt-6 space-y-3">
              <button
                onClick={handleStartSpin}
                disabled={isSpinning || eligiblePlayers.length === 0}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#ffd000] to-[#f59e0b] hover:from-[#facc15] hover:to-[#d97706] text-[#0a0b0d] font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(255,208,0,0.35)] transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <RotateCw className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
                <span>{isSpinning ? 'SPINNING LOT...' : 'SPIN PLAYER AUCTION'}</span>
              </button>

              {/* Push Live Button if Winner Selected */}
              {selectedWinner && !isSpinning && (
                <button
                  onClick={handleNominateLive}
                  disabled={nominateLoading}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.35)] transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{nominateLoading ? 'Pushing to Live...' : `PUSH ${selectedWinner.name} TO LIVE AUCTION`}</span>
                </button>
              )}
            </div>

            {/* Rotation Logic Selector */}
            <div className="w-full max-w-sm mt-6 pt-4 border-t border-[#262833] flex items-center justify-between text-xs">
              <span className="text-[#8b8e99] text-[10px] uppercase font-bold">Rotation Logic:</span>
              <div className="flex gap-1.5">
                {[
                  { id: 'position_rotation', label: 'Balanced' },
                  { id: 'bucket_rotation', label: 'Role Cycle' },
                  { id: 'pure_random', label: 'Random' }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setBalanceMode(m.id)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase transition cursor-pointer ${
                      balanceMode === m.id
                        ? 'bg-[#ffd000] text-[#0a0b0d]'
                        : 'bg-[#111215] text-[#8b8e99] border border-[#262833] hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Spin History */}
          {spinHistory.length > 0 && (
            <div className="p-4 rounded-xl bg-[#18191f] border border-[#262833] space-y-2">
              <span className="text-[10px] uppercase font-black text-[#8b8e99] tracking-wider block">
                Recent Spin Selections
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {spinHistory.map((p, idx) => (
                  <div
                    key={`${p.id}-${idx}`}
                    onClick={() => setSelectedWinner(p)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#111215] border border-[#262833] hover:border-[#ffd000]/60 text-xs font-mono cursor-pointer flex items-center gap-2 transition"
                  >
                    <span className="text-[#ffd000] font-bold text-[10px] px-1 rounded bg-[#ffd000]/10">{p.primary_position}</span>
                    <span className="font-sans font-bold text-white text-xs">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Player Availability Checkboxes & Filters (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#18191f] border border-[#262833] shadow-xl space-y-4">
            
            {/* Header + Bulk Select Actions */}
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 pb-3 border-b border-[#262833]">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#ffd000]" />
                  Player Pool Availability
                </h3>
                <span className="text-[10px] text-[#8b8e99]">
                  Tick or untick players to include/exclude from the spin wheel
                </span>
              </div>

              <div className="flex gap-1.5 self-start xs:self-auto flex-shrink-0">
                <button
                  onClick={() => handleSelectAll(true)}
                  className="px-2 py-1 rounded bg-[#111215] text-[#ffd000] border border-[#262833] text-[10px] font-bold uppercase hover:bg-[#22242e] cursor-pointer"
                >
                  All
                </button>
                <button
                  onClick={() => handleSelectAll(false)}
                  className="px-2 py-1 rounded bg-[#111215] text-[#8b8e99] border border-[#262833] text-[10px] font-bold uppercase hover:text-white cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Position Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedPositionFilter('ALL')}
                className={`px-2.5 py-1 rounded text-[10px] font-black uppercase whitespace-nowrap transition cursor-pointer ${
                  selectedPositionFilter === 'ALL'
                    ? 'bg-[#ffd000] text-[#0a0b0d]'
                    : 'bg-[#111215] text-[#8b8e99] border border-[#262833]'
                }`}
              >
                All ({players.length})
              </button>
              {['ST', 'LW', 'RW', 'CAM', 'CM', 'CDM', 'CB', 'LB', 'RB', 'GK'].map((pos) => {
                const count = positionCounts[pos] || 0;
                return (
                  <button
                    key={pos}
                    onClick={() => setSelectedPositionFilter(pos)}
                    className={`px-2 py-1 rounded text-[10px] font-mono font-bold uppercase whitespace-nowrap transition cursor-pointer ${
                      selectedPositionFilter === pos
                        ? 'bg-[#ffd000] text-[#0a0b0d]'
                        : 'bg-[#111215] text-[#8b8e99] border border-[#262833]'
                    }`}
                  >
                    {pos} ({count})
                  </button>
                );
              })}
            </div>

            {/* Scrollable Player Checklist */}
            <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
              {players.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#8b8e99]">
                  No upcoming players in registry. Add players to the database to spin.
                </div>
              ) : (
                players
                  .filter((p) => selectedPositionFilter === 'ALL' || p.primary_position === selectedPositionFilter)
                  .map((player) => {
                    const isAvailable = availabilityMap[player.id] !== false;
                    const isSelected = selectedWinner?.id === player.id;

                    return (
                      <div
                        key={player.id}
                        onClick={() => togglePlayerAvailability(player.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition select-none ${
                          isSelected
                            ? 'bg-[#ffd000]/15 border-[#ffd000] text-white shadow-[0_0_15px_rgba(255,208,0,0.15)]'
                            : isAvailable
                            ? 'bg-[#111215] border-[#262833] text-white hover:border-[#383a48]'
                            : 'bg-[#111215]/40 border-[#1f2026] text-[#555866] opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            className="text-[#ffd000] cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePlayerAvailability(player.id);
                            }}
                          >
                            {isAvailable ? (
                              <CheckSquare className="w-4 h-4 text-[#ffd000]" />
                            ) : (
                              <Square className="w-4 h-4 text-[#555866]" />
                            )}
                          </button>

                          <div>
                            <div className="font-bold font-sans text-xs flex items-center gap-1.5">
                              <span>{player.name}</span>
                              <span className="text-[10px] px-1 rounded bg-[#ffd000]/10 text-[#ffd000] font-mono">
                                {player.primary_position}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#6b6e7c] font-mono">
                              OVR {player.overall_rating || 80} • {player.club || 'SAG FC'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right font-mono text-[11px] font-bold text-[#8b8e99]">
                          {formatMoney(player.base_price)}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Quick Live Auction Link */}
            <div className="pt-2 border-t border-[#262833]">
              <a
                href="/live"
                className="w-full py-2.5 rounded-xl bg-[#111215] hover:bg-[#22242e] border border-[#262833] text-xs font-bold text-[#ffd000] flex items-center justify-center gap-1.5 transition"
              >
                <span>View Live Auction Arena</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

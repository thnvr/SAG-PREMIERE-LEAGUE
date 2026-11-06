import React, { useState, useEffect } from 'react';
import { playersAPI, auctionAPI, formatMoney } from '../services/api';
import { useAuction } from '../context/AuctionContext';
import { Gavel, ListOrdered, Play, ArrowRight, Shield } from 'lucide-react';

export default function AuctionConfig() {
  const { session, league, nominatePlayer } = useAuction();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    playersAPI.getAll({ status: 'upcoming' })
      .then((res) => {
        setPlayers(res || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleFastNominate = async (playerId) => {
    try {
      await nominatePlayer(playerId);
      alert('Player nominated to active auction block!');
    } catch (err) {
      alert('Failed to nominate: ' + err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full gap-8">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs mb-2">
          AUCTION CONTROL & QUEUE
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
          Auction Configuration
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage auction queue order, lot sequencing, and fast-track nominations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl p-6 bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase">Current Session</div>
          <div className="text-lg font-black text-white font-mono truncate">
            {session?.id || 'Active'}
          </div>
          <div className="text-xs text-emerald-400 font-mono">
            Status: {session?.status || 'Active'} • {session?.bidding_status || 'waiting'}
          </div>
        </div>

        <div className="rounded-2xl p-6 bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase">Countdown Rule</div>
          <div className="text-2xl font-black text-white font-mono">
            {league?.countdown_duration || 30}s
          </div>
          <div className="text-xs text-slate-400">
            Late bid extension: +{league?.countdown_extension || 10}s
          </div>
        </div>

        <div className="rounded-2xl p-6 bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase">Min Bid Increment</div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {formatMoney(league?.min_bid_increment || 10000)}
          </div>
          <div className="text-xs text-slate-400">
            Base increment per turn
          </div>
        </div>
      </div>

      {/* Upcoming Player Queue Table */}
      <div className="rounded-2xl p-6 bg-slate-900/90 border border-slate-800 shadow-xl">
        <h3 className="text-base font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <ListOrdered className="w-5 h-5 text-emerald-400" /> Upcoming Auction Lots ({players.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Player</th>
                <th className="py-2.5 px-3">Position</th>
                <th className="py-2.5 px-3">Rating</th>
                <th className="py-2.5 px-3">Base Price</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {players.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-2.5 px-3 font-sans font-bold text-white flex items-center gap-2">
                    <span className="text-slate-500 font-mono">#{idx + 1}</span>
                    <span>{p.name}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px]">
                      {p.primary_position}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-amber-400">
                    {p.overall_rating}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-emerald-400">
                    {formatMoney(p.base_price)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => handleFastNominate(p.id)}
                      className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold text-[11px] transition"
                    >
                      Nominate Lot →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { teamsAPI, formatMoney } from '../services/api';
import PlayerCard from '../components/PlayerCard';
import { Shield, Users, Wallet, ArrowLeft, AlertCircle } from 'lucide-react';

export default function TeamSquadPage() {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    teamsAPI.getById(id)
      .then((res) => {
        setTeam(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading squad details...</div>;
  }

  if (error || !team) {
    return (
      <div className="p-12 text-center text-rose-400">
        Team not found: {error}
      </div>
    );
  }

  const squad = team.squad || [];
  const grouped = team.groupedSquad || {
    goalkeepers: [],
    defenders: [],
    midfielders: [],
    forwards: [],
  };

  const initialPurse = team.initial_purse || 2000000;
  const totalSpent = team.totalSpent || 0;
  const remainingPurse = team.remainingPurse || (initialPurse - totalSpent);
  const avgPrice = team.averagePurchasePrice || 0;
  const highestPrice = team.highestPurchasePrice || 0;

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full gap-8">
      {/* Top Breadcrumb & Header */}
      <div>
        <Link
          to="/captains-dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Captains Desk</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-[#18191f]/90 border border-[#262833] shadow-xl">
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-black text-xl sm:text-2xl shadow-xl border border-white/10 flex-shrink-0"
              style={{ backgroundColor: team.primary_color + '33', color: team.primary_color }}
            >
              {team.short_name}
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tight">
                {team.name}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Captain: <strong className="text-slate-200">{team.captain?.display_name || 'Captain'}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 font-mono justify-between sm:justify-end text-left sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-[#262833]">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Spent</div>
              <div className="text-base sm:text-lg font-black text-[#ffd000]">{formatMoney(totalSpent)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Remaining</div>
              <div className="text-base sm:text-lg font-black text-cyan-400">{formatMoney(remainingPurse)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Squad</div>
              <div className="text-base sm:text-lg font-black text-white">{squad.length} / {team.max_squad_size}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Football Pitch Tactical Board Layout */}
      <div className="rounded-3xl p-6 bg-gradient-to-b from-emerald-950/60 to-slate-950 border border-[#ffd000]/30 shadow-2xl relative overflow-hidden">
        {/* Pitch Markings */}
        <div className="absolute inset-x-8 top-1/2 h-0.5 bg-white/10 -translate-y-1/2 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-white/10 pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-8 py-4">
          <div className="text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#ffd000] px-3 py-1 rounded-full bg-[#ffd000] text-[#0a0b0d]/10 border border-[#ffd000]/20">
              TACTICAL FORMATION VIEW
            </span>
          </div>

          {/* Forwards Line */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-2">
              Forwards ({grouped.forwards.length})
            </div>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              {grouped.forwards.map((p) => (
                <div key={p.id} className="flex justify-center">
                  <PlayerCard player={p} size="sm" showStats={false} />
                </div>
              ))}
              {grouped.forwards.length === 0 && (
                <div className="text-xs text-slate-500 py-4 font-mono">[No Forwards Acquired Yet]</div>
              )}
            </div>
          </div>

          {/* Midfielders Line */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-2">
              Midfielders ({grouped.midfielders.length})
            </div>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              {grouped.midfielders.map((p) => (
                <div key={p.id} className="flex justify-center">
                  <PlayerCard player={p} size="sm" showStats={false} />
                </div>
              ))}
              {grouped.midfielders.length === 0 && (
                <div className="text-xs text-slate-500 py-4 font-mono">[No Midfielders Acquired Yet]</div>
              )}
            </div>
          </div>

          {/* Defenders Line */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-2">
              Defenders ({grouped.defenders.length})
            </div>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              {grouped.defenders.map((p) => (
                <div key={p.id} className="flex justify-center">
                  <PlayerCard player={p} size="sm" showStats={false} />
                </div>
              ))}
              {grouped.defenders.length === 0 && (
                <div className="text-xs text-slate-500 py-4 font-mono">[No Defenders Acquired Yet]</div>
              )}
            </div>
          </div>

          {/* Goalkeepers Line */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-2">
              Goalkeepers ({grouped.goalkeepers.length})
            </div>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              {grouped.goalkeepers.map((p) => (
                <div key={p.id} className="flex justify-center">
                  <PlayerCard player={p} size="sm" showStats={false} />
                </div>
              ))}
              {grouped.goalkeepers.length === 0 && (
                <div className="text-xs text-slate-500 py-4 font-mono">[No Goalkeeper Acquired Yet]</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Structured Squad Table */}
      <div className="rounded-2xl p-6 bg-[#18191f]/90 border border-[#262833] shadow-xl">
        <h3 className="text-base font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#ffd000]" /> Full Roster Table
        </h3>

        {squad.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#111215]/80 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Player</th>
                  <th className="py-2.5 px-3">Position</th>
                  <th className="py-2.5 px-3">Rating</th>
                  <th className="py-2.5 px-3 text-right">Purchase Price</th>
                  <th className="py-2.5 px-3 text-right">Tx Number</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {squad.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-3 font-sans font-bold text-white">
                      {p.name}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-bold text-[10px]">
                        {p.primary_position}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-amber-400">
                      {p.overall_rating}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-[#ffd000]">
                      {formatMoney(p.purchase_price)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500 text-[10px]">
                      {p.transaction_number || 'TX'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-600 text-xs">
            Squad is currently empty. Players will appear here once acquired in the auction.
          </div>
        )}
      </div>
    </div>
  );
}

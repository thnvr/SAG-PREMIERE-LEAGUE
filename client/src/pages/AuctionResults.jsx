import React, { useState, useEffect } from 'react';
import { teamsAPI, formatMoney } from '../services/sheetsService';
import { useAuction } from '../context/AuctionContext';
import { Trophy, Award, Shield, Users, Wallet, CheckCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AuctionResults() {
  const { teams: contextTeams = [], players: contextPlayers = [] } = useAuction();
  const [localTeams, setLocalTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teamsAPI.getAll()
      .then((res) => {
        setLocalTeams(res || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const teams = contextTeams.length > 0 ? contextTeams : localTeams;
  const totalSpent = teams.reduce((acc, t) => acc + (Number(t.totalSpent) || 0), 0);
  const totalPlayers = teams.reduce((acc, t) => acc + (Number(t.playersPurchased || t.squad?.length) || 0), 0);

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full gap-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-2xl shadow-amber-500/30 mb-4">
          <Trophy className="w-8 h-8 text-slate-950 fill-current" />
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
          Auction Standings &amp; Results
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-2 font-medium">
          Official finalized squads, expenditure distribution, and league squad compliance.
        </p>
      </div>

      {/* Aggregate Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#18191f]/90 border border-[#262833] text-center shadow-lg">
          <div className="text-[10px] uppercase font-bold text-slate-400">Total Money Spent</div>
          <div className="text-xl sm:text-2xl font-black font-mono text-[#ffd000] mt-1">
            {formatMoney(totalSpent)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#18191f]/90 border border-[#262833] text-center shadow-lg">
          <div className="text-[10px] uppercase font-bold text-slate-400">Total Players Sold</div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white mt-1">
            {totalPlayers} Players
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-4 rounded-xl bg-[#18191f]/90 border border-[#262833] text-center shadow-lg">
          <div className="text-[10px] uppercase font-bold text-slate-400">Average Transfer Price</div>
          <div className="text-xl sm:text-2xl font-black font-mono text-cyan-400 mt-1">
            {totalPlayers > 0 ? formatMoney(Math.round(totalSpent / totalPlayers)) : '₹0'}
          </div>
        </div>
      </div>

      {/* Team Roster Standings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {teams.map((t) => {
          const squad = t.squad || [];
          const initPurse = Number(t.total_purse ?? t.initial_purse ?? t.initialPurse ?? 200000000);
          const remPurse = Number(t.remaining_purse ?? t.remainingPurse ?? initPurse);
          const spent = Number(t.totalSpent ?? Math.max(0, initPurse - remPurse));
          const count = t.playersPurchased ?? squad.length;

          return (
            <div
              key={t.id}
              className="rounded-2xl p-6 bg-[#18191f]/90 border border-[#262833] shadow-xl flex flex-col justify-between hover:border-[#ffd000]/40 transition"
            >
              <div>
                <div className="flex items-center gap-3 pb-4 mb-4 border-b border-[#262833]">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow"
                    style={{ backgroundColor: (t.primary_color || '#ffd000') + '33', color: t.primary_color || '#ffd000' }}
                  >
                    {t.short_name}
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base uppercase">{t.name}</h3>
                    <p className="text-xs text-slate-400 font-medium">Capt: {t.captain_name || t.captain?.display_name || 'Leader'}</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs font-mono mb-4">
                  <div className="flex justify-between py-1 border-b border-[#262833]/60">
                    <span className="text-slate-400">Initial Budget:</span>
                    <span className="text-white font-bold">{formatMoney(initPurse)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#262833]/60">
                    <span className="text-slate-400">Total Spent:</span>
                    <span className="text-[#ffd000] font-bold">{formatMoney(spent)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#262833]/60">
                    <span className="text-slate-400">Remaining:</span>
                    <span className="text-cyan-400 font-bold">{formatMoney(remPurse)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Squad Count:</span>
                    <span className="text-white font-bold">{count} / {t.max_squad_size || 15}</span>
                  </div>
                </div>

                {/* Signed Squad List Preview */}
                {squad.length > 0 && (
                  <div className="pt-2 border-t border-[#262833] mb-4 space-y-1.5">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Signed Roster ({squad.length})</div>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {squad.map((p, idx) => (
                        <div key={p.id || idx} className="flex items-center justify-between p-1.5 rounded bg-[#111215] text-[10px] font-mono">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-[#ffd000] font-black text-[9px] px-1 rounded bg-[#ffd000]/10">{p.primary_position}</span>
                            <span className="font-sans font-bold text-white truncate">{p.name}</span>
                          </div>
                          <span className="text-[#ffd000] font-bold ml-2">{formatMoney(p.purchase_price || p.sold_price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Link
                to={`/teams/${t.id}`}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-center text-xs font-bold text-[#ffd000] transition flex items-center justify-center gap-1.5"
              >
                <span>Inspect Squad Pitch</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

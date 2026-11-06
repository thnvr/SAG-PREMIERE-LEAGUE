import React from 'react';
import { formatMoney } from '../services/api';
import { Shield, User, Users } from 'lucide-react';

export default function TeamCard({
  team,
  isLeading = false,
  highlight = false,
  compact = false,
}) {
  if (!team) return null;

  const totalSpent = team.totalSpent || 0;
  const initialPurse = team.initial_purse || 2000000;
  const remainingPurse = team.remainingPurse ?? (initialPurse - totalSpent);
  const playersPurchased = team.playersPurchased || team.squadCount || 0;
  const maxSquad = team.max_squad_size || 15;

  const spentPercentage = Math.min(100, Math.round((totalSpent / initialPurse) * 100));
  const teamColor = team.primary_color || '#ffd000';

  return (
    <div
      className={`relative rounded-xl p-5 bg-[#18191f] border transition-all duration-300 overflow-hidden ${
        isLeading
          ? 'border-[#ffd000] ring-1 ring-[#ffd000]/50 shadow-[0_0_20px_rgba(255, 208, 0,0.15)]'
          : 'border-[#262833] hover:border-[#383a48]'
      }`}
    >
      {/* Team Color Top Accent */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: teamColor }}
      />

      {/* Leading Indicator */}
      {isLeading && (
        <div className="absolute top-3 right-3 bg-[#ffd000] text-[#0a0b0d] text-[10px] font-black uppercase px-2 py-0.5 rounded-sm shadow-sm animate-pulse">
          LEADING BID
        </div>
      )}

      {/* Header: Logo, Name & Captain */}
      <div className="flex items-center gap-3.5">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center font-black text-lg text-[#0a0b0d] shadow-md"
          style={{ backgroundColor: teamColor }}
        >
          {team.short_name || team.name.slice(0, 3)}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-black text-white text-base tracking-tight truncate uppercase">
            {team.name}
          </h4>
          <div className="flex items-center gap-1.5 text-xs text-[#8b8e99]">
            <User className="w-3.5 h-3.5 text-[#ffd000]" />
            <span className="truncate">
              Capt: <strong className="text-white">{team.captain?.display_name || team.captain_name || 'Leader'}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Budget Utilization Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs mb-1 font-mono">
          <span className="text-[#8b8e99]">Spent: {formatMoney(totalSpent)}</span>
          <span className="text-white font-bold">{spentPercentage}%</span>
        </div>
        <div className="w-full bg-[#111215] rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-[#ffd000] transition-all duration-500"
            style={{ width: `${spentPercentage}%` }}
          />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-center font-mono">
        <div className="p-2.5 rounded-lg bg-[#111215] border border-[#22242d]">
          <span className="text-[10px] uppercase font-bold text-[#8b8e99] block">Purse Left</span>
          <span className="text-sm font-black text-[#ffd000]">
            {formatMoney(remainingPurse)}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-[#111215] border border-[#22242d]">
          <span className="text-[10px] uppercase font-bold text-[#8b8e99] block">Squad Filled</span>
          <span className="text-sm font-black text-white">
            {playersPurchased} / {maxSquad}
          </span>
        </div>
      </div>
    </div>
  );
}

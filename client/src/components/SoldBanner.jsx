import React from 'react';
import { formatMoney } from '../services/api';
import { Award, CheckCircle, Sparkles } from 'lucide-react';

export default function SoldBanner({ sale, onClose }) {
  if (!sale) return null;

  const player = sale.player || {};
  const team = sale.team || {};
  const price = sale.price || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-lg animate-in fade-in duration-300">
      <div className="relative w-full max-w-xl rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-2 border-emerald-500 shadow-2xl shadow-emerald-500/20 p-8 text-center overflow-hidden">
        {/* Confetti Glow Background */}
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* SOLD Ribbon */}
        <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-emerald-500 text-slate-950 font-black text-sm md:text-base uppercase tracking-widest shadow-xl mb-4 animate-bounce">
          <Sparkles className="w-5 h-5" /> PLAYER SOLD!
        </div>

        {/* Player Name & Position */}
        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase mb-1">
          {player.name}
        </h2>
        <div className="inline-block px-3 py-1 rounded-md bg-slate-800 text-emerald-400 font-bold text-sm tracking-wider uppercase mb-6">
          {player.primary_position} • {player.player_number || 'SAG'}
        </div>

        {/* Winning Team & Price Display */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 mb-6">
          <div className="text-left border-r border-slate-800 pr-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Acquired By</div>
            <div className="text-lg md:text-xl font-black text-white truncate mt-1">
              {team.name || 'Team'}
            </div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              Tx: {sale.txNumber || 'TX-CONFIRMED'}
            </div>
          </div>

          <div className="text-right pl-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Final Price</div>
            <div className="text-xl md:text-3xl font-black font-mono text-emerald-400 mt-1">
              {formatMoney(price)}
            </div>
          </div>
        </div>

        {/* Action Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg hover:from-emerald-400 hover:to-teal-400 transition"
          >
            Continue Auction →
          </button>
        )}
      </div>
    </div>
  );
}

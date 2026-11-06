import React from 'react';
import { Timer, AlertCircle } from 'lucide-react';

export default function CountdownTimer({
  seconds = 0,
  isPaused = false,
  totalDuration = 30,
}) {
  const isUrgent = seconds <= 5 && seconds > 0;
  const isWarning = seconds <= 10 && seconds > 5;

  const colorClasses = isUrgent
    ? 'text-rose-500 border-rose-500 shadow-rose-500/30'
    : isWarning
    ? 'text-amber-400 border-amber-400 shadow-amber-500/20'
    : 'text-emerald-400 border-emerald-400 shadow-emerald-500/20';

  const pulseClass = isUrgent ? 'animate-ping' : '';

  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative w-20 h-20 md:w-24 md:h-24 rounded-full border-4 flex flex-col items-center justify-center bg-slate-950/90 shadow-2xl backdrop-blur-md transition-colors duration-300 ${colorClasses}`}
      >
        {isPaused ? (
          <span className="text-xs font-black uppercase tracking-wider text-amber-400">
            PAUSED
          </span>
        ) : (
          <>
            <span className="text-3xl md:text-4xl font-black font-mono tracking-tighter leading-none">
              {seconds}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
              SEC
            </span>
          </>
        )}
      </div>

      {isUrgent && !isPaused && (
        <span className="text-xs font-bold text-rose-400 animate-bounce mt-1 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" /> GOING ONCE!
        </span>
      )}
    </div>
  );
}

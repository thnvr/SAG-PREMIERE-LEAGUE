import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function ConnectionIndicator({ connected }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors duration-300 ${connected ? 'text-electric' : 'text-red-400'}`}>
      <div className={`w-2 h-2 rounded-full ${connected ? 'bg-electric animate-pulse-slow' : 'bg-red-500'}`} />
      {connected ? (
        <>
          <Wifi className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Live</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Offline</span>
        </>
      )}
    </div>
  );
}

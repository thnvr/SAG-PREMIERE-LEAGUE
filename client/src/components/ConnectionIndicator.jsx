import React, { useState } from 'react';
import { CheckCircle, X, ExternalLink, FileSpreadsheet } from 'lucide-react';
import { SHEETS_API_URL } from '../services/sheetsService';

export default function ConnectionIndicator() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        type="button"
        title="Google Sheets Backend: Connected & Active"
        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold transition cursor-pointer border bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:border-emerald-400 flex-shrink-0"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <FileSpreadsheet className="w-3 h-3 text-[#ffd000]" />
        <span>Sheets Live</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18191f] rounded-2xl p-6 max-w-md w-full border border-[#2a2d3a] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#262833]">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Google Sheets Backend Status
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-lg bg-[#111215] text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs space-y-2">
              <div className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Cloud Sync Active (1.5s Polling)</span>
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed text-slate-300">
                Live auction state, player nominations, bids, and spectator activity are synchronizing across all devices via your Google Sheet backend.
              </p>
              <div className="pt-1 text-[10px] font-mono text-[#ffd000] truncate">
                {SHEETS_API_URL}
              </div>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#ffd000] text-black font-black text-xs uppercase tracking-wider transition hover:bg-[#facc15]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

import React, { useState, useEffect } from 'react';
import { auctionAPI, formatMoney } from '../services/sheetsService';
import { History, Search, Download, Filter, FileText } from 'lucide-react';

export default function AuctionHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    auctionAPI.getHistory()
      .then((res) => {
        setHistory(res || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = history.filter((item) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      item.player_name?.toLowerCase().includes(s) ||
      item.team_name?.toLowerCase().includes(s) ||
      item.transaction_number?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ffd000] text-[#0a0b0d]/10 border border-[#ffd000]/30 text-[#ffd000] font-mono text-xs mb-2">
            AUDITABLE TRANSACTION ARCHIVE
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            Auction History & Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative chronological record of all completed acquisitions and sale transactions.
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative p-4 rounded-xl bg-[#18191f]/90 border border-[#262833]">
        <Search className="w-4 h-4 absolute left-7 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Filter by player name, franchise, or transaction ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#111215] border border-[#262833] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ffd000]"
        />
      </div>

      {/* History Table */}
      <div className="rounded-2xl bg-[#18191f]/90 border border-[#262833] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#111215]/80 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-3">Position</th>
                <th className="py-3 px-3">Acquired By</th>
                <th className="py-3 px-3 text-right">Base Price</th>
                <th className="py-3 px-3 text-right">Final Price</th>
                <th className="py-3 px-4 text-right">Sale Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.length > 0 ? (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 text-slate-400 font-bold">
                      {item.transaction_number || item.id.slice(0, 8)}
                    </td>
                    <td className="py-3 px-4 font-sans font-bold text-white">
                      {item.player_name}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px]">
                        {item.primary_position}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans font-bold" style={{ color: item.team_color }}>
                      {item.team_name}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400">
                      {formatMoney(item.base_price)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-[#ffd000]">
                      {formatMoney(item.purchase_price)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 text-[11px]">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : 'Recent'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    {loading ? 'Loading auction history...' : 'No finalized sales recorded in history yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

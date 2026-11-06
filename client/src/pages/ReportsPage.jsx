import React from 'react';
import { reportsAPI } from '../services/api';
import { FileText, Download, Shield, Users, Wallet, CheckCircle } from 'lucide-react';

export default function ReportsPage() {
  const reports = [
    {
      title: 'Franchise Squad & Purse Report',
      desc: 'Complete export of team rosters, initial purses, total spending, remaining balances, and assigned captains.',
      icon: Shield,
      color: 'text-emerald-400',
      action: reportsAPI.downloadTeamsCSV,
      filename: 'teams_report.csv',
    },
    {
      title: 'Master Player Registry Export',
      desc: 'Full list of registered players with positions, base valuations, transfer statuses, acquiring teams, and purchase prices.',
      icon: Users,
      color: 'text-cyan-400',
      action: reportsAPI.downloadPlayersCSV,
      filename: 'players_report.csv',
    },
    {
      title: 'Financial Ledger & Spend Analysis',
      desc: 'Breakdown of total league spending, average price per player, highest purchase price, and team budget remaining.',
      icon: Wallet,
      color: 'text-amber-400',
      action: reportsAPI.downloadFinancialCSV,
      filename: 'financial_report.csv',
    },
    {
      title: 'Executive Auction Summary',
      desc: 'High-level executive metrics: total lots auctioned, sold vs unsold percentages, total revenue generated, and lot completion status.',
      icon: FileText,
      color: 'text-purple-400',
      action: reportsAPI.downloadSummaryCSV,
      filename: 'auction_summary.csv',
    },
  ];

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full gap-8">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs mb-2">
          OFFICIAL COMPLIANCE & EXPORT CENTRE
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
          Reports & Data Exports
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Export verified database records in standard CSV format for audits, accounting, and league archives.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((r, i) => {
          const Icon = r.icon;
          return (
            <div
              key={i}
              className="rounded-2xl p-6 bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <Icon className={`w-6 h-6 ${r.color}`} />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base">{r.title}</h3>
                    <span className="text-[10px] text-slate-500 font-mono">{r.filename}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  {r.desc}
                </p>
              </div>

              <button
                onClick={r.action}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 border border-slate-700"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Download Verified CSV</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

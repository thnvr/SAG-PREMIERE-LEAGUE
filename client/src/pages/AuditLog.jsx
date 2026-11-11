import React, { useState, useEffect } from 'react';
import { auditAPI, formatMoney } from '../services/sheetsService';
import Modal from '../components/Modal';
import { ClipboardList, ShieldAlert, RotateCcw, AlertCircle, Check } from 'lucide-react';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPurchaseToReverse, setSelectedPurchaseToReverse] = useState(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversing, setReversing] = useState(false);
  const [error, setError] = useState(null);

  const fetchLogs = () => {
    setLoading(true);
    auditAPI.getAll()
      .then((res) => {
        setLogs(res || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleReverseSale = async (e) => {
    e.preventDefault();
    if (!selectedPurchaseToReverse) return;
    setReversing(true);
    setError(null);
    try {
      await auditAPI.reverseSale(selectedPurchaseToReverse.entity_id, reversalReason);
      setSelectedPurchaseToReverse(null);
      setReversalReason('');
      fetchLogs();
      alert('Sale transaction reversed and team purse refunded successfully.');
    } catch (err) {
      setError(err.message || 'Reversal failed');
    } finally {
      setReversing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full gap-8">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-xs mb-2">
          IMMUTABLE GOVERNANCE ARCHIVE
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
          System Audit Trail & Corrections
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Complete audit trail of administrative modifications, nominations, and audited transaction corrections.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Logs Table */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-3">Acting User</th>
                <th className="py-3 px-3">Action Type</th>
                <th className="py-3 px-3">Entity</th>
                <th className="py-3 px-4">Audit Payload</th>
                <th className="py-3 px-3 text-right">Procedure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-sans font-bold text-white">
                      {log.display_name || log.username || 'Admin'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-bold text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {log.entity_type}
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate text-[11px]">
                      {log.new_value || '{}'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {log.action === 'PLAYER_SOLD' && (
                        <button
                          onClick={() => setSelectedPurchaseToReverse(log)}
                          className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold text-[10px] uppercase transition flex items-center gap-1 ml-auto"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reverse</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    {loading ? 'Loading audit trail...' : 'No audited actions recorded yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Reversal Modal */}
      {selectedPurchaseToReverse && (
        <Modal
          isOpen={!!selectedPurchaseToReverse}
          onClose={() => setSelectedPurchaseToReverse(null)}
          title="Audit Procedure: Reversal of Finalized Sale"
        >
          <form onSubmit={handleReverseSale} className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <strong>Caution:</strong> This audited correction will immediately refund the full purchase price back to the winning team's purse, update the immutable ledger, and restore the player to unsold status.
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Mandatory Reversal Justification Reason *
              </label>
              <textarea
                required
                rows="3"
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="e.g. Concurrency correction, mistaken hammer fall, captain technical bid dispute..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedPurchaseToReverse(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reversing || !reversalReason}
                className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs uppercase"
              >
                {reversing ? 'Reversing...' : 'Authorize Reversal'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { adminAPI, formatMoney } from '../services/api';
import { Settings, Save, Shield, Clock, IndianRupee, AlertCircle, Check } from 'lucide-react';

export default function LeagueSettings() {
  const [formData, setFormData] = useState({
    name: 'SAG PREMIERE LEAGUES',
    season: '2026',
    venue: 'SAG Arena',
    currency: '₹',
    initial_purse: 2000000,
    min_bid_increment: 10000,
    countdown_duration: 30,
    countdown_extension: 10,
    extend_on_late_bid: 1,
    late_bid_threshold: 5,
    max_squad_size: 15,
    min_squad_size: 7,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminAPI.getLeague()
      .then((res) => {
        if (res) {
          setFormData((prev) => ({ ...prev, ...res }));
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await adminAPI.updateLeague({
        ...formData,
        initial_purse: parseInt(formData.initial_purse, 10),
        min_bid_increment: parseInt(formData.min_bid_increment, 10),
        countdown_duration: parseInt(formData.countdown_duration, 10),
        countdown_extension: parseInt(formData.countdown_extension, 10),
        late_bid_threshold: parseInt(formData.late_bid_threshold, 10),
        max_squad_size: parseInt(formData.max_squad_size, 10),
        min_squad_size: parseInt(formData.min_squad_size, 10),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full gap-8">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs mb-2">
          COMPETITION ARCHITECTURE
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
          League Rules & Configuration
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Adjust auction countdowns, minimum bid rules, squad requirements, and default budgets.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>League configuration saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* League Identity Section */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" /> 1. League Branding & Season
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">League Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Season</label>
              <input
                type="text"
                required
                value={formData.season}
                onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Venue</label>
              <input
                type="text"
                value={formData.venue || ''}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                placeholder="e.g. SAG International Arena"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Financial Rules Section */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-emerald-400" /> 2. Currency & Budget Parameters
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Default Franchise Budget (₹)
              </label>
              <input
                type="number"
                step="100"
                value={formData.initial_purse / 100}
                onChange={(e) => setFormData({ ...formData, initial_purse: parseFloat(e.target.value) * 100 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Minimum Bid Increment (₹)
              </label>
              <input
                type="number"
                step="10"
                value={formData.min_bid_increment / 100}
                onChange={(e) => setFormData({ ...formData, min_bid_increment: parseFloat(e.target.value) * 100 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Timing Rules Section */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" /> 3. Countdown & Extension Rules
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Timer Duration (Seconds)
              </label>
              <input
                type="number"
                min="10"
                max="120"
                value={formData.countdown_duration}
                onChange={(e) => setFormData({ ...formData, countdown_duration: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Late Bid Extension (+Seconds)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={formData.countdown_extension}
                onChange={(e) => setFormData({ ...formData, countdown_extension: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Late Bid Threshold (Seconds)
              </label>
              <input
                type="number"
                min="1"
                max="15"
                value={formData.late_bid_threshold}
                onChange={(e) => setFormData({ ...formData, late_bid_threshold: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Squad Requirements */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-4 h-4 text-cyan-400" /> 4. Squad Size Rules
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Minimum Squad Size
              </label>
              <input
                type="number"
                min="5"
                max="25"
                value={formData.min_squad_size}
                onChange={(e) => setFormData({ ...formData, min_squad_size: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Maximum Squad Size
              </label>
              <input
                type="number"
                min="7"
                max="30"
                value={formData.max_squad_size}
                onChange={(e) => setFormData({ ...formData, max_squad_size: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          <span>{saving ? 'Updating Configuration...' : 'Save League Settings'}</span>
        </button>
      </form>
    </div>
  );
}

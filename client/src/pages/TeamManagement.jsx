import React, { useState, useEffect } from 'react';
import { teamsAPI, formatMoney } from '../services/sheetsService';
import TeamCard from '../components/TeamCard';
import Modal from '../components/Modal';
import { Shield, Plus, Edit, Users, User, Check, AlertCircle } from 'lucide-react';

export default function TeamManagement() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTeam, setEditingTeam] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    primary_color: '#22c55e',
    secondary_color: '#16a34a',
    initial_purse: 2000000,
    max_squad_size: 15,
  });

  const fetchTeams = () => {
    teamsAPI.getAll()
      .then((res) => {
        setTeams(res || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const openEditModal = (team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      short_name: team.short_name,
      primary_color: team.primary_color || '#22c55e',
      secondary_color: team.secondary_color || '#16a34a',
      initial_purse: team.initial_purse || 2000000,
      max_squad_size: team.max_squad_size || 15,
    });
    setError(null);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    try {
      await teamsAPI.create({
        ...formData,
        initial_purse: parseInt(formData.initial_purse, 10),
        max_squad_size: parseInt(formData.max_squad_size, 10),
      });
      setShowAddModal(false);
      fetchTeams();
    } catch (err) {
      setError(err.message || 'Failed to create team');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingTeam) return;
    setFormLoading(true);
    setError(null);
    try {
      await teamsAPI.update(editingTeam.id, {
        ...formData,
        initial_purse: parseInt(formData.initial_purse, 10),
        max_squad_size: parseInt(formData.max_squad_size, 10),
      });
      setEditingTeam(null);
      fetchTeams();
    } catch (err) {
      setError(err.message || 'Failed to update team');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs mb-2">
            FRANCHISE MANAGEMENT
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            League Teams & Captains
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure teams, custom purses, team colorways, and captain associations.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              name: '',
              short_name: '',
              primary_color: '#3b82f6',
              secondary_color: '#1d4ed8',
              initial_purse: 2000000,
              max_squad_size: 15,
            });
            setShowAddModal(true);
            setError(null);
          }}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Team</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {teams.map((team) => (
          <div key={team.id} className="flex flex-col gap-3">
            <TeamCard team={team} />
            <button
              onClick={() => openEditModal(team)}
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white transition flex items-center justify-center gap-1.5"
            >
              <Edit className="w-3.5 h-3.5 text-amber-400" />
              <span>Edit Configuration & Budget</span>
            </button>
          </div>
        ))}
      </div>

      {/* Add Team Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New Franchise"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
              Team Full Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. SAG Strikers"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
              Short Name (3-4 Letters)
            </label>
            <input
              type="text"
              required
              maxLength="4"
              value={formData.short_name}
              onChange={(e) => setFormData({ ...formData, short_name: e.target.value.toUpperCase() })}
              placeholder="e.g. STR"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Primary Color
              </label>
              <input
                type="color"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="w-full h-9 rounded-xl bg-slate-950 border border-slate-800 p-1 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Initial Budget (₹)
              </label>
              <input
                type="number"
                step="100"
                value={formData.initial_purse}
                onChange={(e) => setFormData({ ...formData, initial_purse: parseFloat(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase"
            >
              {formLoading ? 'Saving...' : 'Create Franchise'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Team Modal */}
      <Modal
        isOpen={!!editingTeam}
        onClose={() => setEditingTeam(null)}
        title={`Edit ${editingTeam?.name}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
              Team Full Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Primary Color
              </label>
              <input
                type="color"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="w-full h-9 rounded-xl bg-slate-950 border border-slate-800 p-1 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Initial Budget (₹)
              </label>
              <input
                type="number"
                step="100"
                value={formData.initial_purse}
                onChange={(e) => setFormData({ ...formData, initial_purse: parseFloat(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setEditingTeam(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase"
            >
              {formLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

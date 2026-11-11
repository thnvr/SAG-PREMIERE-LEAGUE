import React, { useState, useEffect } from 'react';
import { playersAPI, formatMoney } from '../services/sheetsService';
import PlayerCard from '../components/PlayerCard';
import Modal from '../components/Modal';
import {
  Users,
  Plus,
  Search,
  Filter,
  Upload,
  Trash2,
  Edit,
  Eye,
  Check,
  AlertCircle
} from 'lucide-react';

export default function PlayerManagement() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);

  // Add/Edit player form state
  const [formData, setFormData] = useState({
    name: '',
    player_number: '',
    primary_position: 'ST',
    base_price: 10000,
    age: 24,
    nationality: 'India',
    overall_rating: 80,
    category: 'standard',
    card_style: 'standard',
    preferred_foot: 'Right',
  });

  const fetchPlayers = () => {
    setLoading(true);
    playersAPI.getAll({
      search,
      position: positionFilter,
      status: statusFilter,
    })
      .then((res) => {
        setPlayers(res || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPlayers();
  }, [search, positionFilter, statusFilter]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    try {
      await playersAPI.create({
        ...formData,
        base_price: parseInt(formData.base_price, 10),
        age: parseInt(formData.age, 10),
        overall_rating: parseInt(formData.overall_rating, 10),
      });
      setShowAddModal(false);
      fetchPlayers();
    } catch (err) {
      setError(err.message || 'Failed to create player');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (player) => {
    if (!window.confirm(`Delete ${player.name}? This action cannot be undone.`)) return;
    try {
      await playersAPI.delete(player.id);
      fetchPlayers();
    } catch (err) {
      alert(err.message || 'Cannot delete player');
    }
  };

  const handleCsvImport = async (e) => {
    e.preventDefault();
    if (!csvContent) return;
    setFormLoading(true);
    setError(null);
    try {
      await playersAPI.importCSV(csvContent);
      setShowImportModal(false);
      setCsvContent('');
      fetchPlayers();
    } catch (err) {
      setError(err.message || 'CSV Import failed');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs mb-2">
            PLAYER REGISTRATION & ROSTER
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            Player Registry
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Register players, configure base prices, ratings, and batch import rosters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 transition flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>CSV Import</span>
          </button>

          <button
            onClick={() => {
              setFormData({
                name: '',
                player_number: '',
                primary_position: 'ST',
                base_price: 10000,
                age: 24,
                nationality: 'India',
                overall_rating: 80,
                category: 'standard',
                card_style: 'standard',
                preferred_foot: 'Right',
              });
              setShowAddModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Player</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, ID or nationality..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
          >
            <option value="ALL">All Positions</option>
            <option value="GK">GK</option>
            <option value="CB">CB</option>
            <option value="LB">LB</option>
            <option value="RB">RB</option>
            <option value="CDM">CDM</option>
            <option value="CM">CM</option>
            <option value="CAM">CAM</option>
            <option value="LW">LW</option>
            <option value="RW">RW</option>
            <option value="ST">ST</option>
            <option value="CF">CF</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="bidding">In Bidding</option>
            <option value="sold">Sold</option>
            <option value="unsold">Unsold</option>
          </select>
        </div>
      </div>

      {/* Players Table */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-3">Position</th>
                <th className="py-3 px-3">Rating</th>
                <th className="py-3 px-3">Base Price</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Winning Team</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {players.length > 0 ? (
                players.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-sans">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-400 overflow-hidden">
                          {p.photo_url ? (
                            <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            p.primary_position
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white">{p.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {p.player_number || 'SAG'} • {p.nationality || 'IND'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-bold text-[10px]">
                        {p.primary_position}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-bold text-amber-400">
                      {p.overall_rating || 75}
                    </td>

                    <td className="py-3 px-3 font-bold text-emerald-400">
                      {formatMoney(p.base_price)}
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          p.auction_status === 'sold'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : p.auction_status === 'bidding'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : p.auction_status === 'unsold'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {p.auction_status}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-sans">
                      {p.team_name ? (
                        <div>
                          <span className="font-bold text-white">{p.team_name}</span>
                          <div className="text-[10px] text-emerald-400 font-mono">
                            {formatMoney(p.sold_price)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedPlayer(p)}
                          title="Preview Card"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {p.auction_status !== 'sold' && (
                          <button
                            onClick={() => handleDelete(p)}
                            title="Delete"
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    {loading ? 'Loading player registry...' : 'No players found matching your criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Player Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register Football Player"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Player Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Sunil Chhetri"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Primary Position *
              </label>
              <select
                value={formData.primary_position}
                onChange={(e) => setFormData({ ...formData, primary_position: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="GK">Goalkeeper (GK)</option>
                <option value="CB">Centre Back (CB)</option>
                <option value="LB">Left Back (LB)</option>
                <option value="RB">Right Back (RB)</option>
                <option value="CDM">Defensive Midfielder (CDM)</option>
                <option value="CM">Central Midfielder (CM)</option>
                <option value="CAM">Attacking Midfielder (CAM)</option>
                <option value="LW">Left Winger (LW)</option>
                <option value="RW">Right Winger (RW)</option>
                <option value="ST">Striker (ST)</option>
                <option value="CF">Centre Forward (CF)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Base Price (₹) *
              </label>
              <input
                type="number"
                step="100"
                required
                value={formData.base_price / 100}
                onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) * 100 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Overall Rating (0-99)
              </label>
              <input
                type="number"
                min="50"
                max="99"
                value={formData.overall_rating}
                onChange={(e) => setFormData({ ...formData, overall_rating: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Card Edition
              </label>
              <select
                value={formData.card_style}
                onChange={(e) => setFormData({ ...formData, card_style: e.target.value, category: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="standard">Standard Edition</option>
                <option value="premium">Premium Pick (Blue)</option>
                <option value="star">Star Player (Gold)</option>
                <option value="goalkeeper">Goalkeeper (Emerald)</option>
                <option value="special">Special Icon (Purple)</option>
              </select>
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
              {formLoading ? 'Registering...' : 'Register Player'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CSV Bulk Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="CSV Player Batch Import"
      >
        <form onSubmit={handleCsvImport} className="space-y-4">
          <p className="text-xs text-slate-400">
            Paste CSV text with columns: <code className="text-emerald-400 font-mono">name,primary_position,base_price,age,nationality,overall_rating</code>
          </p>

          <textarea
            rows="8"
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            placeholder={`name,primary_position,base_price,age,nationality,overall_rating\nLionel Messi,RW,100000,36,Argentina,90\nKylian Mbappe,ST,100000,25,France,91`}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
          />

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowImportModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading || !csvContent}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase"
            >
              {formLoading ? 'Importing...' : 'Process Batch CSV'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Player Card Preview Modal */}
      {selectedPlayer && (
        <Modal
          isOpen={!!selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          title={`Card Preview - ${selectedPlayer.name}`}
        >
          <div className="flex justify-center p-4">
            <PlayerCard player={selectedPlayer} size="lg" />
          </div>
        </Modal>
      )}
    </div>
  );
}

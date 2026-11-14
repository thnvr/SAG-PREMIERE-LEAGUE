import React, { useState, useEffect, useRef } from 'react';
import { playersAPI, formatMoney } from '../services/sheetsService';
import PlayerCard from '../components/PlayerCard';
import Modal from '../components/Modal';
import ImageCropModal from '../components/ImageCropModal';
import { useAuth } from '../context/AuthContext';
import { toPng } from 'html-to-image';
import {
  Users,
  Search,
  Grid,
  List,
  Edit,
  Download,
  Save,
  Trash2,
  Check,
  AlertCircle,
  Sparkles,
  Palette,
  Sliders,
  User,
  Image as ImageIcon,
  Crop
} from 'lucide-react';

export default function PlayerGallery() {
  const { user } = useAuth();
  const isAdminOrAuctioneer = user?.role === 'super_admin' || user?.role === 'auctioneer';

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Auctioneer in-gallery editor state
  const [editorPlayer, setEditorPlayer] = useState(null);
  const [activeTab, setActiveTab] = useState('player');
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const cardRef = useRef(null);

  // Image crop modal state
  const [cropModalSrc, setCropModalSrc] = useState(null);  // raw image data URL to crop
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlayers();
  }, [search, positionFilter, statusFilter]);

  const openEditor = (p) => {
    if (!isAdminOrAuctioneer) {
      setSelectedPlayer(p);
      return;
    }

    setEditorPlayer({
      ...p,
      secondary_positions: Array.isArray(p.secondary_positions) ? p.secondary_positions : [],
      futbin_rating: p.futbin_rating || (p.overall_rating * 0.9).toFixed(1),
      card_style: p.card_style || p.category || 'special',
      club: p.club || 'SAG FC',
      preferred_foot: p.preferred_foot || 'Right',
      speed_rating: p.speed_rating || 80,
      shooting_rating: p.shooting_rating || 80,
      passing_rating: p.passing_rating || 80,
      dribbling_rating: p.dribbling_rating || 80,
      defensive_rating: p.defensive_rating || 70,
      physical_rating: p.physical_rating || 75,
      photo_scale: p.photo_scale != null ? Number(p.photo_scale) : 1,
      photo_x: p.photo_x != null ? Number(p.photo_x) : 0,
      photo_y: p.photo_y != null ? Number(p.photo_y) : 0,
    });
    setActiveTab('player');
  };

  const handleSaveEditor = async () => {
    if (!editorPlayer) return;
    setSaving(true);
    try {
      await playersAPI.update(editorPlayer.id, {
        ...editorPlayer,
        base_price: parseInt(editorPlayer.base_price, 10),
        overall_rating: parseInt(editorPlayer.overall_rating, 10),
        futbin_rating: parseFloat(editorPlayer.futbin_rating),
        speed_rating: parseInt(editorPlayer.speed_rating, 10),
        shooting_rating: parseInt(editorPlayer.shooting_rating, 10),
        passing_rating: parseInt(editorPlayer.passing_rating, 10),
        dribbling_rating: parseInt(editorPlayer.dribbling_rating, 10),
        defensive_rating: parseInt(editorPlayer.defensive_rating, 10),
        physical_rating: parseInt(editorPlayer.physical_rating, 10),
        category: editorPlayer.card_style,
        photo_scale: editorPlayer.photo_scale != null ? parseFloat(editorPlayer.photo_scale) : 1,
        photo_x: editorPlayer.photo_x != null ? parseInt(editorPlayer.photo_x, 10) : 0,
        photo_y: editorPlayer.photo_y != null ? parseInt(editorPlayer.photo_y, 10) : 0,
        photo_url: editorPlayer.photo_url || null,
      });
      setStatusMessage({ type: 'success', text: 'Player card updated in database!' });
      fetchPlayers();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Update failed' });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, quality: 0.98 });
      const link = document.createElement('a');
      link.download = `${editorPlayer?.name || 'player'}-card.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert('Export failed: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset the file input so the same file can be re-selected
    e.target.value = '';

    // Read as data URL and open crop modal first
    const reader = new FileReader();
    reader.onload = (evt) => {
      setCropModalSrc(evt.target.result); // Opens crop modal
    };
    reader.readAsDataURL(file);
  };

  /**
   * Called when user confirms the crop in ImageCropModal.
   * croppedDataUrl is a PNG data URL of the cropped region.
   * We set it immediately on the card preview, then also
   * convert it to a Blob and upload to the server for persistence.
   */
  const handleCropConfirm = async (croppedDataUrl) => {
    setCropModalSrc(null); // Close crop modal

    // 1. Immediately apply cropped image to card preview
    setEditorPlayer((prev) => ({
      ...prev,
      photo_url: croppedDataUrl,
      photo_scale: 1,
      photo_x: 0,
      photo_y: 0,
    }));

    // 2. Upload cropped image to server in the background
    setUploadingPhoto(true);
    try {
      // Convert base64 data URL → Blob
      const res = await fetch(croppedDataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'player-crop.png', { type: 'image/png' });

      const uploadRes = await playersAPI.uploadPhoto(file);
      if (uploadRes && uploadRes.photoUrl) {
        // Replace data URL with server URL for DB persistence
        setEditorPlayer((prev) => ({ ...prev, photo_url: uploadRes.photoUrl }));
        setStatusMessage({ type: 'success', text: '✓ Cropped photo uploaded & applied to card! Click "Save DB" to persist.' });
      } else {
        setStatusMessage({ type: 'success', text: '✓ Cropped photo applied to card! Click "Save DB" to persist.' });
      }
    } catch (err) {
      // Even if server upload fails, the data URL is applied and works for the session
      setStatusMessage({ type: 'success', text: '✓ Cropped photo applied to card preview! Click "Save DB" to persist.' });
    } finally {
      setUploadingPhoto(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const toggleSecondaryPosition = (pos) => {
    const current = [...(editorPlayer.secondary_positions || [])];
    const index = current.indexOf(pos);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      if (current.length < 3) current.push(pos);
    }
    setEditorPlayer({ ...editorPlayer, secondary_positions: current });
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ffd000] text-[#0a0b0d]/10 border border-[#ffd000]/30 text-[#ffd000] font-mono text-xs mb-2">
            OFFICIAL PLAYER CATALOGUE
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            Player Gallery
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAdminOrAuctioneer
              ? 'Auctioneer Master Access: Click any card to edit attributes, positions, ratings, and photos.'
              : 'Official player roster, base valuations, and transfer statuses.'}
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-[#18191f] p-1 rounded-xl border border-[#262833] self-start sm:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg text-xs font-bold transition ${
              viewMode === 'grid' ? 'bg-[#ffd000] text-[#0a0b0d] text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg text-xs font-bold transition ${
              viewMode === 'list' ? 'bg-[#ffd000] text-[#0a0b0d] text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl bg-[#18191f]/90 border border-[#262833]">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search footballers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#111215] border border-[#262833] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ffd000]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white"
          >
            <option value="ALL">All Positions</option>
            <option value="GK">Goalkeepers (GK)</option>
            <option value="CB">Centre Back (CB)</option>
            <option value="LB">Left Back (LB)</option>
            <option value="RB">Right Back (RB)</option>
            <option value="CDM">Defensive Mid (CDM)</option>
            <option value="CM">Central Mid (CM)</option>
            <option value="CAM">Attacking Mid (CAM)</option>
            <option value="LW">Left Winger (LW)</option>
            <option value="RW">Right Winger (RW)</option>
            <option value="ST">Striker (ST)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="bidding">In Bidding</option>
            <option value="sold">Sold</option>
            <option value="unsold">Unsold</option>
          </select>
        </div>
      </div>

      {/* Grid or List Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">
          {players.map((p) => (
            <div
              key={p.id}
              onClick={() => openEditor(p)}
              className="cursor-pointer transition-transform hover:-translate-y-1 relative group"
            >
              <PlayerCard player={p} size="md" />
              {isAdminOrAuctioneer && (
                <div className="absolute top-3 right-3 bg-purple-600/90 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition shadow">
                  <Edit className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}
          {players.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500">
              No players found matching your filters.
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-[#18191f]/90 border border-[#262833] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#111215]/80 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-3">Position</th>
                  <th className="py-3 px-3">Rating</th>
                  <th className="py-3 px-3">Base Price</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Franchise</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {players.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-sans font-bold text-white">
                      {p.name}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-bold text-[10px]">
                        {p.primary_position}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-amber-400">
                      {p.overall_rating}
                    </td>
                    <td className="py-3 px-3 font-bold text-[#ffd000]">
                      {formatMoney(p.base_price)}
                    </td>
                    <td className="py-3 px-3 uppercase text-[10px] font-bold">
                      {p.auction_status}
                    </td>
                    <td className="py-3 px-3 font-sans text-white">
                      {p.team_name || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openEditor(p)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-sans font-semibold"
                      >
                        {isAdminOrAuctioneer ? 'Edit Card' : 'Inspect'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AUCTIONEER FULL EA FC CARD EDITOR MODAL */}
      {editorPlayer && (
        <Modal
          isOpen={!!editorPlayer}
          onClose={() => setEditorPlayer(null)}
          title={`Auctioneer Card Editor: ${editorPlayer.name}`}
          size="2xl"
        >
          <div className="space-y-4">
            {statusMessage && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  statusMessage.type === 'success'
                    ? 'bg-[#ffd000] text-[#0a0b0d]/10 border-[#ffd000]/30 text-[#ffd000]'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {statusMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Card Preview Column */}
              <div className="lg:col-span-5 flex flex-col items-center w-full">
                <div ref={cardRef} className="p-1 sm:p-2 flex justify-center max-w-full overflow-hidden">
                  <PlayerCard
                    player={editorPlayer}
                    size="md"
                    cardStyleOverride={editorPlayer.card_style}
                    showStats={true}
                    showPrice={true}
                  />
                </div>

                <div className="w-full flex flex-col xs:flex-row gap-2 mt-4 max-w-[320px]">
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="flex-1 py-2.5 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PNG</span>
                  </button>
                  <button
                    onClick={handleSaveEditor}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Save DB'}</span>
                  </button>
                </div>
              </div>

              {/* Editor Tabs Column (Matches EA FC Generator Screenshot) */}
              <div className="lg:col-span-7 flex flex-col rounded-2xl bg-[#111215] border border-[#262833] overflow-hidden w-full">
                <div className="flex border-b border-[#262833] bg-[#18191f]/60 p-1 gap-1 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setActiveTab('player')}
                    className={`flex-1 min-w-[70px] py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 ${
                      activeTab === 'player' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <User className="w-3.5 h-3.5 text-[#ffd000] flex-shrink-0" />
                    <span>Player</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('rarity')}
                    className={`flex-1 min-w-[70px] py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 ${
                      activeTab === 'rarity' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    <span>Rarity</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('image')}
                    className={`flex-1 min-w-[70px] py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 ${
                      activeTab === 'image' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <span>Image</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('display')}
                    className={`flex-1 min-w-[70px] py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 ${
                      activeTab === 'display' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>Stats</span>
                  </button>
                </div>

                <div className="p-4 space-y-3 max-h-96 overflow-y-auto text-xs">
                  {activeTab === 'player' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Player Name
                        </label>
                        <input
                          type="text"
                          value={editorPlayer.name}
                          onChange={(e) => setEditorPlayer({ ...editorPlayer, name: e.target.value })}
                          className="w-full bg-[#18191f] border border-[#262833] rounded-lg px-2.5 py-1.5 text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                            Overall Rating
                          </label>
                          <input
                            type="number"
                            min="50"
                            max="99"
                            value={editorPlayer.overall_rating}
                            onChange={(e) => setEditorPlayer({ ...editorPlayer, overall_rating: parseInt(e.target.value, 10) || 85 })}
                            className="w-full bg-[#18191f] border border-[#262833] rounded-lg px-2.5 py-1.5 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                            Futbin Rating
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={editorPlayer.futbin_rating}
                            onChange={(e) => setEditorPlayer({ ...editorPlayer, futbin_rating: parseFloat(e.target.value) || 77.8 })}
                            className="w-full bg-[#18191f] border border-[#262833] rounded-lg px-2.5 py-1.5 text-white font-mono"
                          />
                        </div>
                      </div>

                      {/* Positions selector */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Primary Position
                        </label>
                        <select
                          value={editorPlayer.primary_position}
                          onChange={(e) => setEditorPlayer({ ...editorPlayer, primary_position: e.target.value })}
                          className="w-full bg-[#18191f] border border-[#262833] rounded-lg px-2.5 py-1.5 text-white"
                        >
                          {['ST', 'CF', 'RW', 'LW', 'CAM', 'CM', 'CDM', 'CB', 'LB', 'RB', 'GK'].map((pos) => (
                            <option key={pos} value={pos}>{pos}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Base Price (₹)</label>
                          <input
                            type="number"
                            step="100"
                            value={editorPlayer.base_price}
                            onChange={(e) => setEditorPlayer({ ...editorPlayer, base_price: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-[#18191f] border border-[#262833] rounded-lg px-2.5 py-1.5 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Club</label>
                          <input
                            type="text"
                            value={editorPlayer.club}
                            onChange={(e) => setEditorPlayer({ ...editorPlayer, club: e.target.value })}
                            className="w-full bg-[#18191f] border border-[#262833] rounded-lg px-2.5 py-1.5 text-white"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {activeTab === 'rarity' && (
                    <div className="space-y-2">
                      {[
                        { id: 'special', name: 'Special Trailblazers (Purple)' },
                        { id: 'star', name: 'Star Gold (TOTY)' },
                        { id: 'premium', name: 'Champions Sapphire (Blue)' },
                        { id: 'goalkeeper', name: 'Goalkeeper Emerald (Green)' },
                        { id: 'standard', name: 'Standard Onyx' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setEditorPlayer({ ...editorPlayer, card_style: t.id })}
                          className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between ${
                            editorPlayer.card_style === t.id
                              ? 'bg-purple-950/60 border-purple-500 text-white font-bold'
                              : 'bg-[#18191f] border-[#262833] text-slate-400'
                          }`}
                        >
                          <span>{t.name}</span>
                          {editorPlayer.card_style === t.id && <span className="w-2 h-2 rounded-full bg-purple-400" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeTab === 'image' && (
                    <div className="space-y-4">
                      {/* Direct file upload zone */}
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-300 mb-2">
                          Upload &amp; Crop Player Photo (PNG / JPG / WEBP)
                        </label>
                        <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-[#ffd000]/40 hover:border-[#ffd000] rounded-xl p-4 cursor-pointer bg-[#18191f] hover:bg-[#20222a] transition group">
                          <ImageIcon className="w-7 h-7 text-[#ffd000] mb-1.5 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold text-white">Click to Select Player Photo</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">A crop tool will open — drag to select region</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* Upload progress */}
                      {uploadingPhoto && (
                        <div className="flex items-center gap-2 text-[11px] text-[#ffd000] font-mono animate-pulse">
                          <span>⟳</span>
                          <span>Uploading cropped photo...</span>
                        </div>
                      )}

                      {/* Photo preview thumbnail & Remove action */}
                      {editorPlayer.photo_url ? (
                        <div className="p-3 rounded-xl bg-[#18191f] border border-[#262833] space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                              ✓ Image Active On Badge
                            </span>
                            <div className="flex gap-2">
                              {/* Re-Crop button */}
                              <label
                                className="px-2.5 py-1 rounded bg-[#ffd000]/20 text-[#ffd000] hover:bg-[#ffd000] hover:text-[#0a0b0d] text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                                title="Upload a new photo and crop it"
                              >
                                ✂ Re-Crop
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handlePhotoUpload}
                                  className="hidden"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => setEditorPlayer(prev => ({ ...prev, photo_url: '', photo_scale: 1, photo_x: 0, photo_y: 0 }))}
                                className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white text-[10px] font-bold transition flex items-center gap-1"
                              >
                                ✕ Remove Photo
                              </button>
                            </div>
                          </div>

                          {/* Live Badge Fit Preview Box */}
                          <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[#0a0b0d] border border-[#262833]">
                            <span className="text-[10px] uppercase font-black text-[#ffd000] tracking-wider">
                              Live Badge Fit Preview
                            </span>
                            <div className="w-32 h-32 rounded-2xl border-2 border-[#ffd000]/80 overflow-hidden bg-[#1f1d0b] relative flex items-center justify-center shadow-inner">
                              <img
                                key={editorPlayer.photo_url}
                                src={editorPlayer.photo_url}
                                alt="Current player photo"
                                style={{
                                  transform: `translate(${editorPlayer.photo_x || 0}px, ${editorPlayer.photo_y || 0}px) scale(${editorPlayer.photo_scale || 1})`,
                                  transformOrigin: 'center center',
                                }}
                                className="w-full h-full object-cover object-center pointer-events-none select-none"
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Zoom: {(editorPlayer.photo_scale || 1).toFixed(2)}x &bull; X: {editorPlayer.photo_x || 0}px &bull; Y: {editorPlayer.photo_y || 0}px
                            </span>
                          </div>

                          {/* Image Crop & Positioning Adjusters */}
                          <div className="pt-2 border-t border-[#262833] space-y-3">
                            <span className="text-[10px] font-black uppercase text-[#ffd000] tracking-wider block">
                              Badge Fit, Zoom & Position Controls
                            </span>

                            {/* Zoom / Scale Slider & Quick Buttons */}
                            <div>
                              <div className="flex justify-between text-[10px] text-slate-300 mb-1">
                                <span>Zoom / Size</span>
                                <span className="font-mono text-[#ffd000]">{(editorPlayer.photo_scale || 1).toFixed(2)}x</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditorPlayer(prev => ({ ...prev, photo_scale: Math.max(0.3, parseFloat(((prev.photo_scale || 1) - 0.1).toFixed(2))) }))}
                                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-white"
                                  title="Zoom Out"
                                >
                                  -
                                </button>
                                <input
                                  type="range"
                                  min="0.3"
                                  max="3.0"
                                  step="0.02"
                                  value={editorPlayer.photo_scale || 1}
                                  onChange={(e) => setEditorPlayer(prev => ({ ...prev, photo_scale: parseFloat(e.target.value) }))}
                                  className="flex-1 accent-[#ffd000] cursor-pointer"
                                />
                                <button
                                  type="button"
                                  onClick={() => setEditorPlayer(prev => ({ ...prev, photo_scale: Math.min(3.0, parseFloat(((prev.photo_scale || 1) + 0.1).toFixed(2))) }))}
                                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-white"
                                  title="Zoom In"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Vertical Position (Y) Slider & Quick Buttons */}
                            <div>
                              <div className="flex justify-between text-[10px] text-slate-300 mb-1">
                                <span>Move Up / Down</span>
                                <span className="font-mono text-[#ffd000]">{editorPlayer.photo_y || 0}px</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditorPlayer(prev => ({ ...prev, photo_y: (prev.photo_y || 0) - 5 }))}
                                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-white"
                                  title="Move Up"
                                >
                                  ▲
                                </button>
                                <input
                                  type="range"
                                  min="-150"
                                  max="150"
                                  step="1"
                                  value={editorPlayer.photo_y || 0}
                                  onChange={(e) => setEditorPlayer(prev => ({ ...prev, photo_y: parseInt(e.target.value, 10) }))}
                                  className="flex-1 accent-[#ffd000] cursor-pointer"
                                />
                                <button
                                  type="button"
                                  onClick={() => setEditorPlayer(prev => ({ ...prev, photo_y: (prev.photo_y || 0) + 5 }))}
                                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-white"
                                  title="Move Down"
                                >
                                  ▼
                                </button>
                              </div>
                            </div>

                            {/* Horizontal Position (X) Slider & Quick Buttons */}
                            <div>
                              <div className="flex justify-between text-[10px] text-slate-300 mb-1">
                                <span>Move Left / Right</span>
                                <span className="font-mono text-[#ffd000]">{editorPlayer.photo_x || 0}px</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditorPlayer(prev => ({ ...prev, photo_x: (prev.photo_x || 0) - 5 }))}
                                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-white"
                                  title="Move Left"
                                >
                                  ◄
                                </button>
                                <input
                                  type="range"
                                  min="-150"
                                  max="150"
                                  step="1"
                                  value={editorPlayer.photo_x || 0}
                                  onChange={(e) => setEditorPlayer(prev => ({ ...prev, photo_x: parseInt(e.target.value, 10) }))}
                                  className="flex-1 accent-[#ffd000] cursor-pointer"
                                />
                                <button
                                  type="button"
                                  onClick={() => setEditorPlayer(prev => ({ ...prev, photo_x: (prev.photo_x || 0) + 5 }))}
                                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-white"
                                  title="Move Right"
                                >
                                  ►
                                </button>
                              </div>
                            </div>

                            {/* Reset Button */}
                            <div className="pt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => setEditorPlayer(prev => ({ ...prev, photo_scale: 1, photo_x: 0, photo_y: 0 }))}
                                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 hover:text-white transition font-mono flex items-center gap-1"
                              >
                                <span>⟲</span>
                                <span>Reset Zoom & Position</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-[#18191f]/50 border border-dashed border-[#262833] text-center text-xs text-slate-400">
                          No custom photo currently assigned. Card is using default silhouette.
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'display' && (
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { k: 'speed_rating', l: 'PAC' },
                        { k: 'shooting_rating', l: 'SHO' },
                        { k: 'passing_rating', l: 'PAS' },
                        { k: 'dribbling_rating', l: 'DRI' },
                        { k: 'defensive_rating', l: 'DEF' },
                        { k: 'physical_rating', l: 'PHY' },
                      ].map(({ k, l }) => (
                        <div key={k} className="p-2 rounded-lg bg-[#18191f] border border-[#262833]">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">{l}</label>
                          <input
                            type="number"
                            min="40"
                            max="99"
                            value={editorPlayer[k]}
                            onChange={(e) => setEditorPlayer({ ...editorPlayer, [k]: parseInt(e.target.value, 10) || 75 })}
                            className="w-full bg-[#111215] border border-[#262833] rounded px-2 py-1 text-white font-mono font-bold"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* NON-ADMIN VIEW-ONLY INSPECT MODAL */}
      {selectedPlayer && !isAdminOrAuctioneer && (
        <Modal
          isOpen={!!selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          title={`Player Profile - ${selectedPlayer.name}`}
        >
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4">
            <PlayerCard player={selectedPlayer} size="lg" />
            <div className="flex-1 space-y-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#111215] border border-[#262833]">
                <span className="text-slate-500 block uppercase font-bold text-[10px]">Dossier</span>
                <p className="text-slate-300 font-sans mt-1">
                  {selectedPlayer.biography || 'Registered athlete under SAG Premiere Leagues.'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-[#111215] border border-[#262833]">
                  <span className="text-slate-500 text-[10px] block">Club</span>
                  <span className="font-bold text-white">{selectedPlayer.club || 'SAG FC'}</span>
                </div>
                <div className="p-2 rounded-lg bg-[#111215] border border-[#262833]">
                  <span className="text-slate-500 text-[10px] block">Preferred Foot</span>
                  <span className="font-bold text-white">{selectedPlayer.preferred_foot || 'Right'}</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* IMAGE CROP MODAL — opens when auctioneer selects a photo file */}
      {cropModalSrc && (
        <ImageCropModal
          imageSrc={cropModalSrc}
          onConfirm={handleCropConfirm}
          onClose={() => setCropModalSrc(null)}
        />
      )}
    </div>
  );
}

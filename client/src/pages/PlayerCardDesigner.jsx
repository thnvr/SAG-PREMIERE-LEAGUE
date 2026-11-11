import React, { useState, useEffect, useRef } from 'react';
import { playersAPI, formatMoney } from '../services/sheetsService';
import PlayerCard from '../components/PlayerCard';
import { toPng } from 'html-to-image';
import { useAuth } from '../context/AuthContext';
import {
  CreditCard,
  Download,
  Save,
  User,
  Shield,
  Palette,
  Image as ImageIcon,
  Sliders,
  Check,
  AlertCircle,
  Plus,
  Search,
  Globe
} from 'lucide-react';

// All FIFA member nations with emoji flags
const FIFA_NATIONS = [
  { name: 'Afghanistan', flag: '🇦🇫' }, { name: 'Albania', flag: '🇦🇱' }, { name: 'Algeria', flag: '🇩🇿' },
  { name: 'Andorra', flag: '🇦🇩' }, { name: 'Angola', flag: '🇦🇴' }, { name: 'Argentina', flag: '🇦🇷' },
  { name: 'Armenia', flag: '🇦🇲' }, { name: 'Australia', flag: '🇦🇺' }, { name: 'Austria', flag: '🇦🇹' },
  { name: 'Azerbaijan', flag: '🇦🇿' }, { name: 'Bahrain', flag: '🇧🇭' }, { name: 'Bangladesh', flag: '🇧🇩' },
  { name: 'Belarus', flag: '🇧🇾' }, { name: 'Belgium', flag: '🇧🇪' }, { name: 'Belize', flag: '🇧🇿' },
  { name: 'Benin', flag: '🇧🇯' }, { name: 'Bhutan', flag: '🇧🇹' }, { name: 'Bolivia', flag: '🇧🇴' },
  { name: 'Bosnia and Herzegovina', flag: '🇧🇦' }, { name: 'Botswana', flag: '🇧🇼' }, { name: 'Brazil', flag: '🇧🇷' },
  { name: 'Brunei', flag: '🇧🇳' }, { name: 'Bulgaria', flag: '🇧🇬' }, { name: 'Burkina Faso', flag: '🇧🇫' },
  { name: 'Burundi', flag: '🇧🇮' }, { name: 'Cambodia', flag: '🇰🇭' }, { name: 'Cameroon', flag: '🇨🇲' },
  { name: 'Canada', flag: '🇨🇦' }, { name: 'Cape Verde', flag: '🇨🇻' }, { name: 'Chad', flag: '🇹🇩' },
  { name: 'Chile', flag: '🇨🇱' }, { name: 'China', flag: '🇨🇳' }, { name: 'Colombia', flag: '🇨🇴' },
  { name: 'Comoros', flag: '🇰🇲' }, { name: 'Congo', flag: '🇨🇬' }, { name: 'DR Congo', flag: '🇨🇩' },
  { name: 'Costa Rica', flag: '🇨🇷' }, { name: 'Croatia', flag: '🇭🇷' }, { name: 'Cuba', flag: '🇨🇺' },
  { name: 'Cyprus', flag: '🇨🇾' }, { name: 'Czech Republic', flag: '🇨🇿' }, { name: 'Denmark', flag: '🇩🇰' },
  { name: 'Djibouti', flag: '🇩🇯' }, { name: 'Dominican Republic', flag: '🇩🇴' }, { name: 'Ecuador', flag: '🇪🇨' },
  { name: 'Egypt', flag: '🇪🇬' }, { name: 'El Salvador', flag: '🇸🇻' }, { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name: 'Equatorial Guinea', flag: '🇬🇶' }, { name: 'Eritrea', flag: '🇪🇷' }, { name: 'Estonia', flag: '🇪🇪' },
  { name: 'Ethiopia', flag: '🇪🇹' }, { name: 'Fiji', flag: '🇫🇯' }, { name: 'Finland', flag: '🇫🇮' },
  { name: 'France', flag: '🇫🇷' }, { name: 'Gabon', flag: '🇬🇦' }, { name: 'Gambia', flag: '🇬🇲' },
  { name: 'Georgia', flag: '🇬🇪' }, { name: 'Germany', flag: '🇩🇪' }, { name: 'Ghana', flag: '🇬🇭' },
  { name: 'Greece', flag: '🇬🇷' }, { name: 'Guatemala', flag: '🇬🇹' }, { name: 'Guinea', flag: '🇬🇳' },
  { name: 'Guinea-Bissau', flag: '🇬🇼' }, { name: 'Guyana', flag: '🇬🇾' }, { name: 'Haiti', flag: '🇭🇹' },
  { name: 'Honduras', flag: '🇭🇳' }, { name: 'Hong Kong', flag: '🇭🇰' }, { name: 'Hungary', flag: '🇭🇺' },
  { name: 'Iceland', flag: '🇮🇸' }, { name: 'India', flag: '🇮🇳' }, { name: 'Indonesia', flag: '🇮🇩' },
  { name: 'Iran', flag: '🇮🇷' }, { name: 'Iraq', flag: '🇮🇶' }, { name: 'Ireland', flag: '🇮🇪' },
  { name: 'Israel', flag: '🇮🇱' }, { name: 'Italy', flag: '🇮🇹' }, { name: "Ivory Coast", flag: '🇨🇮' },
  { name: 'Jamaica', flag: '🇯🇲' }, { name: 'Japan', flag: '🇯🇵' }, { name: 'Jordan', flag: '🇯🇴' },
  { name: 'Kazakhstan', flag: '🇰🇿' }, { name: 'Kenya', flag: '🇰🇪' }, { name: 'Kosovo', flag: '🇽🇰' },
  { name: 'Kuwait', flag: '🇰🇼' }, { name: 'Kyrgyzstan', flag: '🇰🇬' }, { name: 'Latvia', flag: '🇱🇻' },
  { name: 'Lebanon', flag: '🇱🇧' }, { name: 'Lesotho', flag: '🇱🇸' }, { name: 'Liberia', flag: '🇱🇷' },
  { name: 'Libya', flag: '🇱🇾' }, { name: 'Lithuania', flag: '🇱🇹' }, { name: 'Luxembourg', flag: '🇱🇺' },
  { name: 'Madagascar', flag: '🇲🇬' }, { name: 'Malawi', flag: '🇲🇼' }, { name: 'Malaysia', flag: '🇲🇾' },
  { name: 'Maldives', flag: '🇲🇻' }, { name: 'Mali', flag: '🇲🇱' }, { name: 'Malta', flag: '🇲🇹' },
  { name: 'Mauritania', flag: '🇲🇷' }, { name: 'Mauritius', flag: '🇲🇺' }, { name: 'Mexico', flag: '🇲🇽' },
  { name: 'Moldova', flag: '🇲🇩' }, { name: 'Mongolia', flag: '🇲🇳' }, { name: 'Montenegro', flag: '🇲🇪' },
  { name: 'Morocco', flag: '🇲🇦' }, { name: 'Mozambique', flag: '🇲🇿' }, { name: 'Myanmar', flag: '🇲🇲' },
  { name: 'Namibia', flag: '🇳🇦' }, { name: 'Nepal', flag: '🇳🇵' }, { name: 'Netherlands', flag: '🇳🇱' },
  { name: 'New Zealand', flag: '🇳🇿' }, { name: 'Nicaragua', flag: '🇳🇮' }, { name: 'Niger', flag: '🇳🇪' },
  { name: 'Nigeria', flag: '🇳🇬' }, { name: 'North Korea', flag: '🇰🇵' }, { name: 'North Macedonia', flag: '🇲🇰' },
  { name: 'Northern Ireland', flag: '🇬🇧' }, { name: 'Norway', flag: '🇳🇴' }, { name: 'Oman', flag: '🇴🇲' },
  { name: 'Pakistan', flag: '🇵🇰' }, { name: 'Palestine', flag: '🇵🇸' }, { name: 'Panama', flag: '🇵🇦' },
  { name: 'Paraguay', flag: '🇵🇾' }, { name: 'Peru', flag: '🇵🇪' }, { name: 'Philippines', flag: '🇵🇭' },
  { name: 'Poland', flag: '🇵🇱' }, { name: 'Portugal', flag: '🇵🇹' }, { name: 'Qatar', flag: '🇶🇦' },
  { name: 'Romania', flag: '🇷🇴' }, { name: 'Russia', flag: '🇷🇺' }, { name: 'Rwanda', flag: '🇷🇼' },
  { name: 'Saudi Arabia', flag: '🇸🇦' }, { name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' }, { name: 'Senegal', flag: '🇸🇳' },
  { name: 'Serbia', flag: '🇷🇸' }, { name: 'Sierra Leone', flag: '🇸🇱' }, { name: 'Singapore', flag: '🇸🇬' },
  { name: 'Slovakia', flag: '🇸🇰' }, { name: 'Slovenia', flag: '🇸🇮' }, { name: 'Somalia', flag: '🇸🇴' },
  { name: 'South Africa', flag: '🇿🇦' }, { name: 'South Korea', flag: '🇰🇷' }, { name: 'Spain', flag: '🇪🇸' },
  { name: 'Sri Lanka', flag: '🇱🇰' }, { name: 'Sudan', flag: '🇸🇩' }, { name: 'Suriname', flag: '🇸🇷' },
  { name: 'Sweden', flag: '🇸🇪' }, { name: 'Switzerland', flag: '🇨🇭' }, { name: 'Syria', flag: '🇸🇾' },
  { name: 'Tajikistan', flag: '🇹🇯' }, { name: 'Tanzania', flag: '🇹🇿' }, { name: 'Thailand', flag: '🇹🇭' },
  { name: 'Togo', flag: '🇹🇬' }, { name: 'Trinidad and Tobago', flag: '🇹🇹' }, { name: 'Tunisia', flag: '🇹🇳' },
  { name: 'Turkey', flag: '🇹🇷' }, { name: 'Turkmenistan', flag: '🇹🇲' }, { name: 'Uganda', flag: '🇺🇬' },
  { name: 'Ukraine', flag: '🇺🇦' }, { name: 'United Arab Emirates', flag: '🇦🇪' }, { name: 'United States', flag: '🇺🇸' },
  { name: 'Uruguay', flag: '🇺🇾' }, { name: 'Uzbekistan', flag: '🇺🇿' }, { name: 'Venezuela', flag: '🇻🇪' },
  { name: 'Vietnam', flag: '🇻🇳' }, { name: 'Wales', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' }, { name: 'Yemen', flag: '🇾🇪' },
  { name: 'Zambia', flag: '🇿🇲' }, { name: 'Zimbabwe', flag: '🇿🇼' },
];

export default function PlayerCardDesigner() {
  const { user } = useAuth();
  const isAdminOrAuctioneer = user?.role === 'super_admin' || user?.role === 'auctioneer';

  const [players, setPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [activeTab, setActiveTab] = useState('player'); // 'player' | 'rarity' | 'image' | 'stats'
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [nationSearch, setNationSearch] = useState('');
  const [showNationPicker, setShowNationPicker] = useState(false);
  const cardRef = useRef(null);
  const nationPickerRef = useRef(null);

  // Card editor state (matches EA FC 26 generator layout from screenshot)
  const [cardData, setCardData] = useState({
    name: 'Cole',
    overall_rating: 87,
    futbin_rating: 77.8,
    primary_position: 'RW',
    secondary_positions: ['CAM', 'LW'],
    photo_url: '',
    card_style: 'special', // special, star, premium, goalkeeper, standard
    speed_rating: 88,
    shooting_rating: 84,
    passing_rating: 86,
    dribbling_rating: 90,
    defensive_rating: 51,
    physical_rating: 72,
    nationality: 'England',
    club: 'Chelsea',
    preferred_foot: 'Right',
    base_price: 25000,
  });

  const fetchPlayers = () => {
    playersAPI.getAll()
      .then((res) => {
        setPlayers(res || []);
        if (res && res.length > 0 && !selectedPlayerId) {
          loadPlayerData(res[0]);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const loadPlayerData = (p) => {
    setSelectedPlayerId(p.id);
    setCardData({
      name: p.name || 'Player',
      overall_rating: p.overall_rating || 85,
      futbin_rating: p.futbin_rating || (p.overall_rating * 0.9).toFixed(1),
      primary_position: p.primary_position || 'ST',
      secondary_positions: Array.isArray(p.secondary_positions) ? p.secondary_positions : [],
      photo_url: p.photo_url || '',
      card_style: p.card_style || p.category || 'special',
      speed_rating: p.speed_rating || 80,
      shooting_rating: p.shooting_rating || 80,
      passing_rating: p.passing_rating || 80,
      dribbling_rating: p.dribbling_rating || 80,
      defensive_rating: p.defensive_rating || 70,
      physical_rating: p.physical_rating || 75,
      nationality: p.nationality || 'India',
      club: p.club || 'SAG FC',
      preferred_foot: p.preferred_foot || 'Right',
      base_price: p.base_price || 10000,
    });
  };

  const handlePlayerSelect = (id) => {
    const p = players.find((item) => item.id === id);
    if (p) loadPlayerData(p);
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, quality: 0.98 });
      const link = document.createElement('a');
      link.download = `${cardData.name || 'player'}-fut-card.png`;
      link.href = dataUrl;
      link.click();
      setStatusMessage({ type: 'success', text: 'Card exported as high-res PNG!' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Export error: ' + err.message });
    } finally {
      setDownloading(false);
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!selectedPlayerId || !isAdminOrAuctioneer) return;
    setSaving(true);
    try {
      await playersAPI.update(selectedPlayerId, {
        ...cardData,
        base_price: parseInt(cardData.base_price, 10),
        overall_rating: parseInt(cardData.overall_rating, 10),
        futbin_rating: parseFloat(cardData.futbin_rating),
        speed_rating: parseInt(cardData.speed_rating, 10),
        shooting_rating: parseInt(cardData.shooting_rating, 10),
        passing_rating: parseInt(cardData.passing_rating, 10),
        dribbling_rating: parseInt(cardData.dribbling_rating, 10),
        defensive_rating: parseInt(cardData.defensive_rating, 10),
        physical_rating: parseInt(cardData.physical_rating, 10),
        category: cardData.card_style,
      });
      setStatusMessage({ type: 'success', text: 'Player card attributes saved to database!' });
      fetchPlayers();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Save failed' });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Immediately show a local base64 preview on the card
    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64Url = evt.target.result;
      setCardData((prev) => ({ ...prev, photo_url: base64Url }));
    };
    reader.readAsDataURL(file);

    // 2. Also attempt to upload to server (admin only) to get a persistent URL
    setPhotoUploading(true);
    try {
      const res = await playersAPI.uploadPhoto(file);
      if (res && res.photoUrl) {
        // Replace the base64 preview with the real server URL
        setCardData((prev) => ({ ...prev, photo_url: res.photoUrl }));
        setStatusMessage({ type: 'success', text: '✅ Photo uploaded to server and applied to card!' });
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err) {
      // Non-admin users can't upload to server — base64 preview still works for PNG export
      setStatusMessage({ type: 'success', text: '📸 Photo applied to card! (Only visible in preview — save to DB to persist)' });
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setPhotoUploading(false);
    }
  };

  const toggleSecondaryPosition = (pos) => {
    const current = [...cardData.secondary_positions];
    const index = current.indexOf(pos);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      if (current.length < 3) current.push(pos);
    }
    setCardData({ ...cardData, secondary_positions: current });
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full gap-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 font-mono text-xs mb-2">
            EA FC 26 CARD GENERATOR STUDIO
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            Player Card Studio & Editor
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete EA FC Ultimate Team card customization with live stats, attributes, and PNG rendering.
          </p>
        </div>

        {/* Load Existing Player Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={selectedPlayerId}
            onChange={(e) => handlePlayerSelect(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
          >
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.primary_position} - {p.overall_rating})
              </option>
            ))}
          </select>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {statusMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Studio Workstation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: LIVE CARD PREVIEW & ACTION BUTTONS */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl relative">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">
            Live FUT Card Preview
          </div>

          <div ref={cardRef} className="p-2 inline-block">
            <PlayerCard
              player={cardData}
              size="lg"
              cardStyleOverride={cardData.card_style}
              showStats={true}
              showPrice={true}
            />
          </div>

          <div className="w-full flex flex-col gap-2.5 mt-6">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full py-3.5 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              <span>{downloading ? 'Rendering Image...' : 'Download as PNG'}</span>
            </button>

            {isAdminOrAuctioneer && (
              <button
                onClick={handleSaveToDatabase}
                disabled={saving || !selectedPlayerId}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider shadow transition flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Changes to Database'}</span>
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: TABBED EDITOR (Matching Screenshot) */}
        <div className="lg:col-span-7 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
          {/* Tabs Navigation Header */}
          <div className="flex border-b border-slate-800 bg-slate-950/70 p-2 gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('player')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                activeTab === 'player'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-4 h-4 text-emerald-400" />
              <span>Player</span>
            </button>

            <button
              onClick={() => setActiveTab('rarity')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                activeTab === 'rarity'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Palette className="w-4 h-4 text-purple-400" />
              <span>Rarity</span>
            </button>

            <button
              onClick={() => setActiveTab('image')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                activeTab === 'image'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-cyan-400" />
              <span>Player Image</span>
            </button>

            <button
              onClick={() => setActiveTab('display')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                activeTab === 'display'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Display & Stats</span>
            </button>
          </div>

          {/* TAB 1: PLAYER IDENTITY */}
          {activeTab === 'player' && (
            <div className="p-6 space-y-6">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Identity</h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Player Name
                  </label>
                  <input
                    type="text"
                    value={cardData.name}
                    onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Overall Rating
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="99"
                    value={cardData.overall_rating}
                    onChange={(e) => setCardData({ ...cardData, overall_rating: parseInt(e.target.value, 10) || 85 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Futbin Rating
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={cardData.futbin_rating}
                    onChange={(e) => setCardData({ ...cardData, futbin_rating: parseFloat(e.target.value) || 77.8 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Positions Checkboxes */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">
                  Positions & Role Indicators (++)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['ST', 'CF', 'RW', 'LW', 'CAM', 'CM', 'CDM', 'CB', 'LB', 'RB', 'GK'].map((pos) => {
                    const isPrimary = cardData.primary_position === pos;
                    const isSec = cardData.secondary_positions.includes(pos);
                    return (
                      <div
                        key={pos}
                        className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                          isPrimary
                            ? 'bg-purple-950/60 border-purple-500 text-white font-bold'
                            : isSec
                            ? 'bg-slate-950 border-emerald-500/50 text-slate-200'
                            : 'bg-slate-950/50 border-slate-800/80 text-slate-500'
                        }`}
                      >
                        <span className="font-bold">{pos}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setCardData({ ...cardData, primary_position: pos })}
                            className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                              isPrimary ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            Main
                          </button>
                          {!isPrimary && (
                            <button
                              type="button"
                              onClick={() => toggleSecondaryPosition(pos)}
                              className={`text-[9px] px-1 py-0.5 rounded font-bold ${
                                isSec ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              ++
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Club, League & Nation */}
              <div className="pt-4 border-t border-slate-800">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                  Club, League & Nation
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-500 mb-1">Club</label>
                    <input
                      type="text"
                      value={cardData.club}
                      onChange={(e) => setCardData({ ...cardData, club: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  {/* FIFA Nation Picker */}
                  <div className="relative">
                    <label className="block text-[10px] uppercase text-slate-500 mb-1">
                      Nation (FIFA) 🌍
                    </label>
                    <button
                      type="button"
                      onClick={() => { setShowNationPicker((v) => !v); setNationSearch(''); }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white text-left flex items-center gap-2 hover:border-purple-500 transition cursor-pointer"
                    >
                      <span className="text-base leading-none">
                        {FIFA_NATIONS.find(n => n.name === cardData.nationality)?.flag || '🌍'}
                      </span>
                      <span className="flex-1 truncate">{cardData.nationality || 'Select nation...'}</span>
                      <span className="text-slate-500 text-[9px]">▼</span>
                    </button>
                    {showNationPicker && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-2 border-b border-slate-800">
                          <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5">
                            <Search className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <input
                              autoFocus
                              type="text"
                              value={nationSearch}
                              onChange={(e) => setNationSearch(e.target.value)}
                              placeholder="Search country..."
                              className="bg-transparent outline-none text-xs text-white w-full"
                            />
                          </div>
                        </div>
                        <div className="max-h-52 overflow-y-auto">
                          {FIFA_NATIONS.filter(n =>
                            n.name.toLowerCase().includes(nationSearch.toLowerCase())
                          ).map((nation) => (
                            <button
                              key={nation.name}
                              type="button"
                              onClick={() => {
                                setCardData((prev) => ({ ...prev, nationality: nation.name }));
                                setShowNationPicker(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-800 transition cursor-pointer ${
                                cardData.nationality === nation.name ? 'bg-purple-900/40 text-purple-300' : 'text-white'
                              }`}
                            >
                              <span className="text-base w-6 text-center">{nation.flag}</span>
                              <span>{nation.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-500 mb-1">Base Price (₹)</label>
                    <input
                      type="number"
                      step="100"
                      value={cardData.base_price / 100}
                      onChange={(e) => setCardData({ ...cardData, base_price: parseFloat(e.target.value) * 100 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RARITY THEMES */}
          {activeTab === 'rarity' && (
            <div className="p-6 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Card Edition Rarity</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: 'special', name: 'Special Trailblazers', desc: 'Cosmic purple neon beams & holographic edge' },
                  { id: 'star', name: 'TOTY Star Gold', desc: 'Prestige 24k gold broadcast glow' },
                  { id: 'premium', name: 'Champions Sapphire', desc: 'Electric blue and cyan shield' },
                  { id: 'goalkeeper', name: 'Goalkeeper Emerald', desc: 'Emerald green impenetrable wall' },
                  { id: 'standard', name: 'Standard Onyx', desc: 'Clean dark graphite & carbon fiber' },
                ].map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setCardData({ ...cardData, card_style: theme.id })}
                    className={`p-4 rounded-2xl border text-left transition flex items-center justify-between ${
                      cardData.card_style === theme.id
                        ? 'bg-slate-800 border-purple-500 ring-2 ring-purple-500/20 shadow-lg'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-white">{theme.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{theme.desc}</div>
                    </div>
                    {cardData.card_style === theme.id && (
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PLAYER IMAGE */}
          {activeTab === 'image' && (
            <div className="p-6 space-y-5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Player Image & Photo Upload</h3>

              {/* Drag & Drop Upload Zone */}
              <label
                htmlFor="photo-upload-input"
                className="group flex flex-col items-center justify-center w-full border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-8 cursor-pointer bg-slate-950/60 transition-all hover:bg-slate-900/80"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handlePhotoUpload({ target: { files: [file] } });
                }}
              >
                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 group-hover:border-purple-500/60 flex items-center justify-center mb-3 transition-all">
                  {photoUploading ? (
                    <svg className="w-7 h-7 text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                  ) : cardData.photo_url ? (
                    <img src={cardData.photo_url} alt="preview" className="w-14 h-14 object-cover rounded-xl" />
                  ) : (
                    <ImageIcon className="w-7 h-7 text-slate-500 group-hover:text-purple-400 transition-colors" />
                  )}
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">
                  {photoUploading ? 'Uploading...' : cardData.photo_url ? '✅ Photo Applied — Click or Drag to Change' : 'Click or Drag & Drop Player Photo Here'}
                </span>
                <span className="text-[10px] text-slate-600 mt-1">PNG, JPG, WEBP — Max 10MB</span>
                <input
                  id="photo-upload-input"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>

              {/* Current photo preview (if photo_url is set) */}
              {cardData.photo_url && (
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-4">
                  <img
                    src={cardData.photo_url}
                    alt="Player preview"
                    className="w-20 h-20 rounded-xl object-cover object-top border border-slate-700 flex-shrink-0"
                    onError={(e) => { e.target.style.display='none'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-black uppercase text-slate-500 mb-1">Current Photo</div>
                    <div className="text-xs text-slate-300 font-mono truncate max-w-xs">
                      {cardData.photo_url.startsWith('data:') ? '📸 Local preview (base64)' : cardData.photo_url}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCardData((prev) => ({ ...prev, photo_url: '' }))}
                      className="mt-2 text-[10px] px-2 py-1 rounded-lg bg-rose-900/40 border border-rose-700/40 text-rose-400 hover:bg-rose-800/60 transition cursor-pointer font-bold"
                    >
                      ✕ Remove Photo
                    </button>
                  </div>
                </div>
              )}

              {/* OR: Paste URL directly */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                  Or Paste Photo URL Directly
                </label>
                <input
                  type="url"
                  value={cardData.photo_url && !cardData.photo_url.startsWith('data:') ? cardData.photo_url : ''}
                  onChange={(e) => setCardData({ ...cardData, photo_url: e.target.value })}
                  placeholder="https://example.com/player-photo.png"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500 transition"
                />
                <p className="text-[10px] text-slate-600 mt-1">Paste any direct image link. The photo will appear live on the card preview instantly.</p>
              </div>
            </div>
          )}

          {/* TAB 4: DISPLAY & STAT ATTRIBUTES */}
          {activeTab === 'display' && (
            <div className="p-6 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Attributes (PAC, SHO, PAS, DRI, DEF, PHY)
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { key: 'speed_rating', label: 'PAC (Pace / Speed)' },
                  { key: 'shooting_rating', label: 'SHO (Shooting)' },
                  { key: 'passing_rating', label: 'PAS (Passing)' },
                  { key: 'dribbling_rating', label: 'DRI (Dribbling)' },
                  { key: 'defensive_rating', label: 'DEF (Defending)' },
                  { key: 'physical_rating', label: 'PHY (Physical)' },
                ].map(({ key, label }) => (
                  <div key={key} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      {label}
                    </label>
                    <input
                      type="number"
                      min="40"
                      max="99"
                      value={cardData[key]}
                      onChange={(e) => setCardData({ ...cardData, [key]: parseInt(e.target.value, 10) || 75 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

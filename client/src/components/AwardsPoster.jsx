import React, { useRef, useState } from 'react';
import { toPng, toJpeg } from 'html-to-image';
import {
  Download,
  Share2,
  Sparkles,
  Trophy,
  Shield,
  Award,
  Zap,
  Star,
  Check,
  Edit3,
  RefreshCw,
  Image as ImageIcon,
  Upload,
  ZoomIn,
  Move,
  Trash2
} from 'lucide-react';

export default function AwardsPoster({
  awardData,
  onSave,
  availablePlayers = [],
  availableTeams = [],
  availableBadges = []
}) {
  const posterRef = useRef(null);
  const fileInputRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  // Editable award headline
  const [titleLine1, setTitleLine1] = useState(awardData?.title_line1 || 'PLAYER');
  const [titleLine2, setTitleLine2] = useState(awardData?.title_line2 || 'OF THE YEAR');
  const [titleLine3, setTitleLine3] = useState(awardData?.title_line3 || 'WINNER');
  const [subtitle, setSubtitle] = useState(awardData?.subtitle || 'MEN • SAG PREMIERE LEAGUE 2026');
  const [hashtag, setHashtag] = useState(awardData?.hashtag || '#SAGAwards2026');

  // Single winner slot (default finalist)
  const defaultFinalist = {
    id: 'f-1',
    name: 'ACHRAF HAKIMI',
    team: 'PARIS SAINT-GERMAIN',
    flag: '🇲🇦',
    badge: 'Speed Demon',
    statLabel: '14 ASSISTS • RATING 89',
    photo: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=500&auto=format&fit=crop&q=80',
    teamLogo: '⚡',
    photo_scale: 1,
    photo_x: 0,
    photo_y: 0
  };

  const initialFinalist = awardData?.finalists && awardData.finalists.length > 0
    ? { ...defaultFinalist, ...awardData.finalists[0] }
    : defaultFinalist;

  const [finalist, setFinalist] = useState(initialFinalist);

  // Quick Preset Categories
  const applyPreset = (presetKey) => {
    if (presetKey === 'player_of_year') {
      setTitleLine1('PLAYER');
      setTitleLine2('OF THE YEAR');
      setTitleLine3('WINNER');
      setSubtitle('MEN • SAG PREMIERE LEAGUE 2026');
      setHashtag('#SAGAwards2026');
    } else if (presetKey === 'best_striker') {
      setTitleLine1('BEST STRIKER');
      setTitleLine2('GOLDEN BOOT');
      setTitleLine3('WINNER');
      setSubtitle('TOP SCORER • SAG PREMIERE LEAGUE 2026');
      setHashtag('#GoldenBoot2026');
    } else if (presetKey === 'best_gk') {
      setTitleLine1('BEST GOALKEEPER');
      setTitleLine2('GOLDEN GLOVE');
      setTitleLine3('WINNER');
      setSubtitle('CLEAN SHEETS • SAG PREMIERE LEAGUE 2026');
      setHashtag('#GoldenGlove2026');
    } else if (presetKey === 'emerging_player') {
      setTitleLine1('EMERGING');
      setTitleLine2('PLAYER OF THE YEAR');
      setTitleLine3('WINNER');
      setSubtitle('RISING TALENT • SAG PREMIERE LEAGUE 2026');
      setHashtag('#EmergingStar2026');
    } else if (presetKey === 'best_playmaker') {
      setTitleLine1('BEST PLAYMAKER');
      setTitleLine2('ASSISTS KING');
      setTitleLine3('WINNER');
      setSubtitle('CREATIVE MASTER • SAG PREMIERE LEAGUE 2026');
      setHashtag('#PlaymakerAward2026');
    }
  };

  const handleUpdateField = (field, value) => {
    setFinalist((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectTournamentPlayer = (playerId) => {
    const p = availablePlayers.find((item) => item.id === playerId);
    if (!p) return;
    const team = availableTeams.find((t) => t.id === p.sold_to_team_id);
    const badgeName = Array.isArray(p.badges) && p.badges.length > 0 ? p.badges[0] : 'Finisher++';

    setFinalist((prev) => ({
      ...prev,
      name: p.name.toUpperCase(),
      team: (team?.name || p.club || 'SAG FRANCHISE').toUpperCase(),
      photo: p.photo_url || prev.photo,
      badge: badgeName,
      statLabel: `RATING ${p.overall_rating || 85} • ${p.primary_position || 'FWD'}`,
      teamLogo: team?.short_name || '⚽',
      photo_scale: p.photo_scale || 1,
      photo_x: p.photo_x || 0,
      photo_y: p.photo_y || 0
    }));
  };

  // Image Upload Handler (FileReader base64 + direct file attachment)
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result;
      if (base64Data) {
        setFinalist((prev) => ({
          ...prev,
          photo: base64Data,
          photo_scale: prev.photo_scale || 1,
          photo_x: prev.photo_x || 0,
          photo_y: prev.photo_y || 0
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setFinalist((prev) => ({
      ...prev,
      photo: '',
      photo_scale: 1,
      photo_x: 0,
      photo_y: 0
    }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = async () => {
    if (!posterRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(posterRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#07080a'
      });
      const link = document.createElement('a');
      link.download = `SAG-AWARDS-2026-${titleLine1.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error generating poster image:', err);
      alert('Failed to generate high-res image. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveConfig = () => {
    if (onSave) {
      onSave({
        title_line1: titleLine1,
        title_line2: titleLine2,
        title_line3: titleLine3,
        subtitle,
        hashtag,
        finalists: [finalist]
      });
    }
  };

  const photoScale = finalist.photo_scale != null ? finalist.photo_scale : 1;
  const photoX = finalist.photo_x != null ? finalist.photo_x : 0;
  const photoY = finalist.photo_y != null ? finalist.photo_y : 0;

  return (
    <div className="flex flex-col xl:flex-row gap-8 items-start w-full">
      
      {/* LEFT: THE LUXURY AWARDS POSTER PREVIEW (Matches Reference Image) */}
      <div className="flex flex-col items-center flex-1 max-w-[620px] mx-auto w-full">
        <div
          ref={posterRef}
          className="relative w-full aspect-[3/4] max-w-[560px] bg-[#07080a] text-white overflow-hidden rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.95)] border-2 border-[#d4af37]/30 flex flex-col justify-between p-6 sm:p-8 select-none font-sans"
          style={{
            background: 'radial-gradient(circle at 25% 25%, #18191d 0%, #08090b 55%, #040405 100%)',
            boxShadow: '0 25px 80px rgba(0,0,0,0.9), inset 0 0 100px rgba(212,175,55,0.06)'
          }}
        >
          {/* Subtle Golden Vignette & Diagonal Watermark Lines */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(212,175,55,0.05) 40px, rgba(212,175,55,0.05) 41px)'
            }}
          />

          {/* TOP SECTION: LOGO + 3D GOLDEN TROPHY SPHERE + BOLD METALLIC HEADLINE */}
          <div className="relative z-10 w-full pt-1">
            {/* Top Left Tournament Crest */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full border border-[#d4af37]/60 bg-gradient-to-br from-[#1a1c22] to-[#0a0a0c] flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                  {/* Official SAG Football Shield Icon */}
                  <svg viewBox="0 0 100 120" className="w-6 h-6">
                    <path
                      d="M50 4 L94 20 L94 65 C94 92 50 116 50 116 C50 116 6 92 6 65 L6 20 Z"
                      fill="#121316"
                      stroke="#ffd000"
                      strokeWidth="6"
                    />
                    <circle cx="50" cy="55" r="20" fill="#ffd000" />
                    <polygon points="50,14 53,21 60,21 54,26 56,33 50,28 44,33 46,26 40,21 47,21" fill="#ffffff" />
                  </svg>
                </div>
                <div className="flex flex-col leading-none">
                  <span className="font-black text-sm tracking-widest text-white uppercase drop-shadow">
                    SAG <span className="text-[#ffd000]">AWARDS</span>
                  </span>
                  <span className="text-[9px] font-mono tracking-[0.25em] text-[#d4af37] font-bold mt-0.5">
                    2026
                  </span>
                </div>
              </div>

              {/* Top Right Decorative Gold Arc */}
              <div className="h-0.5 w-24 bg-gradient-to-l from-[#ffd000]/60 to-transparent mt-3" />
            </div>

            {/* Main Trophy & Title Hero Row */}
            <div className="grid grid-cols-12 gap-3 items-center mt-3">
              
              {/* 3D Realistic Golden Ball Trophy Sphere on Pedestal */}
              <div className="col-span-5 flex justify-center items-center py-1">
                <div className="relative flex flex-col items-center">
                  {/* Ambient Glow */}
                  <div className="absolute w-28 h-28 rounded-full bg-[#d4af37]/25 blur-xl pointer-events-none" />

                  {/* Golden Sphere Trophy */}
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full shadow-[inset_-8px_-8px_16px_rgba(0,0,0,0.8),inset_8px_8px_16px_rgba(255,255,255,0.6),0_10px_25px_rgba(0,0,0,0.9)] overflow-hidden border border-[#d4af37] bg-gradient-to-br from-[#ffe073] via-[#c69a28] to-[#6d4f0d]">
                    {/* Intricate Engraved Map / Pentagonal Panels */}
                    <div className="absolute inset-0 opacity-40 mix-blend-overlay">
                      <svg viewBox="0 0 100 100" className="w-full h-full stroke-black stroke-[1.5] fill-none">
                        <polygon points="50,10 65,30 55,50 35,50 25,30" />
                        <polygon points="55,50 75,55 80,75 60,85 50,70" />
                        <polygon points="35,50 15,55 10,75 30,85 40,70" />
                        <polygon points="50,70 60,85 40,85" />
                        <line x1="50" y1="10" x2="50" y2="0" />
                        <line x1="65" y1="30" x2="85" y2="25" />
                        <line x1="25" y1="30" x2="5" y2="25" />
                      </svg>
                    </div>

                    {/* Geometric Band / Center Belt matching CAF awards */}
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-6 bg-gradient-to-r from-[#8f6815] via-[#ffd55c] to-[#7a540b] border-y border-[#3a2704] flex items-center justify-around px-1 shadow-inner opacity-90">
                      <span className="text-[7px] text-[#2c1d02] font-black">▲▼▲▼▲▼▲</span>
                      <span className="text-[7px] font-black text-[#1c1200] tracking-wider">SAG</span>
                      <span className="text-[7px] text-[#2c1d02] font-black">▲▼▲▼▲▼▲</span>
                    </div>

                    {/* Top Specular Glint Reflection */}
                    <div className="absolute top-2 left-3 w-8 h-4 rounded-full bg-white/60 blur-[2px] transform -rotate-45" />
                  </div>

                  {/* Trophy Pedestal Base */}
                  <div className="w-14 h-4 bg-gradient-to-b from-[#1c1d22] to-[#0a0b0d] rounded-b-md border-x border-b border-[#ffd000]/40 -mt-1 shadow-lg" />
                  <div className="w-18 h-1.5 bg-[#ffd000] rounded-full blur-[1px] opacity-70 -mt-0.5" />
                </div>
              </div>

              {/* Embossed Bold Metallic Golden Typography */}
              <div className="col-span-7 flex flex-col justify-center pl-1">
                <h1
                  className="font-black leading-[0.92] uppercase tracking-tighter"
                  style={{
                    background: 'linear-gradient(180deg, #fff2a8 0%, #e2b036 45%, #9e7415 80%, #523b05 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.9))'
                  }}
                >
                  <span className="block text-2xl sm:text-3xl font-black">{titleLine1}</span>
                  <span className="block text-2xl sm:text-3xl font-black">{titleLine2}</span>
                  <span className="block text-xl sm:text-2xl font-black text-[#d4af37]">{titleLine3}</span>
                </h1>

                <div className="text-[10px] sm:text-xs font-mono font-bold tracking-[0.2em] text-[#d4af37] uppercase mt-1">
                  {subtitle}
                </div>
              </div>

            </div>
          </div>

          {/* CENTER SECTION: SINGLE WINNER LUXURY CARD */}
          <div className="relative z-10 w-full max-w-sm mx-auto my-auto pt-2">
            <div
              className="relative rounded-2xl overflow-hidden flex flex-col justify-between border-2 border-[#d4af37]/60 bg-[#0e0f14] shadow-[0_15px_45px_rgba(0,0,0,0.95)] group transition-transform hover:scale-[1.01]"
              style={{
                background: 'linear-gradient(180deg, #181a24 0%, #0d0e12 60%, #060709 100%)'
              }}
            >
              {/* Subtle Pitch Watermark Pattern */}
              <div className="absolute inset-0 opacity-15 pointer-events-none">
                <div className="w-full h-full border border-white/20 rounded-xl m-1.5" />
              </div>

              {/* Top Badge Strip (Country Flag Left + Award Badge Right) */}
              <div className="relative z-10 px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-xl sm:text-2xl filter drop-shadow">
                  {finalist.flag || '⚽'}
                </span>

                {/* AWARD HOLDER'S WEBSITE BADGE SPACE */}
                {finalist.badge && (
                  <span className="px-2.5 py-1 rounded-md bg-gradient-to-r from-[#ffd000] via-[#ffd700] to-[#b89000] text-[#0a0b0d] text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1">
                    <Sparkles className="w-3 h-3 fill-current" />
                    <span>{finalist.badge}</span>
                  </span>
                )}
              </div>

              {/* Player Portrait with Golden Backlight & Crop/Transform Controls */}
              <div className="relative w-full h-48 sm:h-64 flex items-end justify-center overflow-hidden">
                {/* Golden Rim Spotlight */}
                <div className="absolute w-40 h-40 rounded-full bg-[#d4af37]/30 blur-2xl bottom-4 pointer-events-none" />

                {finalist.photo ? (
                  <img
                    src={finalist.photo}
                    alt={finalist.name}
                    className="relative z-10 w-full h-full object-cover object-top filter contrast-105 brightness-95 transition-transform"
                    style={{
                      transform: `scale(${photoScale}) translate(${photoX}px, ${photoY}px)`
                    }}
                  />
                ) : (
                  <div className="relative z-10 w-full h-full flex items-center justify-center text-5xl font-black text-[#d4af37]">
                    {finalist.name.charAt(0)}
                  </div>
                )}

                {/* Gradient shadow overlay at bottom of portrait */}
                <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#090a0d] to-transparent z-10" />
              </div>

              {/* Bottom Plaque: Logo + Player Name + Franchise */}
              <div className="relative z-20 p-3 sm:p-4 bg-[#090a0d] border-t border-[#d4af37]/40 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#181920] border border-[#d4af37]/50 flex items-center justify-center text-xs font-black text-[#ffd000] flex-shrink-0 shadow">
                  {finalist.teamLogo || '⚽'}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <h4 className="font-black text-white text-xs sm:text-sm uppercase truncate tracking-tight drop-shadow">
                    {finalist.name}
                  </h4>
                  <span className="text-[9px] sm:text-[10px] text-[#8e919d] font-bold uppercase truncate block tracking-wider mt-0.5">
                    {finalist.team}
                  </span>
                  {finalist.statLabel && (
                    <span className="text-[8.5px] sm:text-[9px] font-mono font-bold text-[#ffd000] block mt-1">
                      {finalist.statLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: HASHTAG + LUXURY GOLD GLYPHS BAR */}
          <div className="relative z-10 w-full text-center pt-2">
            {/* Official Hashtag */}
            <div className="font-mono text-xs sm:text-sm font-black tracking-widest text-[#d4af37] uppercase drop-shadow mb-2.5">
              {hashtag}
            </div>

            {/* Geometric African/Tournament Gold Glyphs Bar (Matching Reference) */}
            <div className="w-full pt-2 border-t border-[#d4af37]/20 flex items-center justify-center gap-3 sm:gap-5 text-[#d4af37]/70 text-[11px] sm:text-sm">
              <span>⧉</span>
              <span>⚑</span>
              <span>●</span>
              <span>▲</span>
              <span>⚔</span>
              <span>✦</span>
              <span>☲</span>
              <span>≈</span>
              <span>⧉</span>
            </div>
          </div>
        </div>

        {/* Download & Actions Toolbar */}
        <div className="flex items-center gap-3 mt-4 w-full justify-center">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#ffd000] to-[#e6b800] hover:from-[#facc15] hover:to-[#ffd000] text-[#0a0b0d] font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(255,208,0,0.4)] transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'GENERATING POSTER...' : 'DOWNLOAD POSTER (HIGH-RES PNG)'}</span>
          </button>

          <button
            onClick={handleSaveConfig}
            className="px-4 py-3 rounded-xl bg-[#18191f] hover:bg-[#22242e] border border-[#2b2e3c] text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4 text-[#ffd000]" />
            <span>Save Setup</span>
          </button>
        </div>
      </div>

      {/* RIGHT: ADVANCED POSTER STUDIO & EDITING CONTROLS */}
      <div className="flex-1 space-y-6 w-full">
        
        {/* Preset Selector */}
        <div className="p-5 rounded-2xl bg-[#18191f] border border-[#262833] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#ffd000]" /> Preset Award Categories
            </h3>
            <span className="text-[10px] font-mono text-[#8b8e99]">1-CLICK PRESETS</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'player_of_year', label: 'Player of the Year', icon: Trophy },
              { id: 'best_striker', label: 'Best Striker (Goals)', icon: Zap },
              { id: 'best_gk', label: 'Best Goalkeeper', icon: Shield },
              { id: 'emerging_player', label: 'Emerging Talent', icon: Star },
              { id: 'best_playmaker', label: 'Best Playmaker', icon: Sparkles },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className="p-2.5 rounded-xl bg-[#111215] hover:bg-[#22242e] border border-[#262833] hover:border-[#ffd000]/50 text-left transition flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer"
              >
                <p.icon className="w-3.5 h-3.5 text-[#ffd000] flex-shrink-0" />
                <span className="truncate">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Headline & Subtitle Editor */}
        <div className="p-5 rounded-2xl bg-[#18191f] border border-[#262833] space-y-4">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-[#ffd000]" /> Customize Poster Typography
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Title Line 1</label>
              <input
                type="text"
                value={titleLine1}
                onChange={(e) => setTitleLine1(e.target.value.toUpperCase())}
                className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white uppercase font-bold focus:border-[#ffd000] outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Title Line 2</label>
              <input
                type="text"
                value={titleLine2}
                onChange={(e) => setTitleLine2(e.target.value.toUpperCase())}
                className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white uppercase font-bold focus:border-[#ffd000] outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Title Line 3</label>
              <input
                type="text"
                value={titleLine3}
                onChange={(e) => setTitleLine3(e.target.value.toUpperCase())}
                className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white uppercase font-bold focus:border-[#ffd000] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Subtitle</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white focus:border-[#ffd000] outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Hashtag</label>
              <input
                type="text"
                value={hashtag}
                onChange={(e) => setHashtag(e.target.value)}
                className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-[#ffd000] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Single Winner Card Editor */}
        <div className="p-5 rounded-2xl bg-[#18191f] border border-[#262833] space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#22242b]">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-[#ffd000]" /> Winner Slot Controls (Single Winner)
            </h3>
            <span className="text-[10px] font-mono text-[#ffd000] bg-[#ffd000]/10 border border-[#ffd000]/30 px-2 py-0.5 rounded">
              1 SLOT ACTIVE
            </span>
          </div>

          <div className="space-y-4 p-4 rounded-xl bg-[#111215] border border-[#262833]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#22242b]">
              <span className="text-xs font-bold text-[#ffd000] uppercase">
                Winner: {finalist.name}
              </span>
              
              {/* Quick Select from Tournament Registered Players */}
              {availablePlayers.length > 0 && (
                <select
                  onChange={(e) => handleSelectTournamentPlayer(e.target.value)}
                  defaultValue=""
                  className="bg-[#18191f] border border-[#2d303d] rounded px-2.5 py-1 text-xs text-[#ffd000] focus:outline-none"
                >
                  <option value="" disabled>Autofill from League Players...</option>
                  {availablePlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.primary_position}) - {p.club || 'SAG FC'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Player Name</label>
                <input
                  type="text"
                  value={finalist.name}
                  onChange={(e) => handleUpdateField('name', e.target.value.toUpperCase())}
                  className="w-full bg-[#18191f] border border-[#262833] rounded px-3 py-1.5 text-xs text-white uppercase font-bold focus:border-[#ffd000] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Franchise / Club</label>
                <input
                  type="text"
                  value={finalist.team}
                  onChange={(e) => handleUpdateField('team', e.target.value.toUpperCase())}
                  className="w-full bg-[#18191f] border border-[#262833] rounded px-3 py-1.5 text-xs text-white uppercase font-bold focus:border-[#ffd000] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Award Badge (Holder Crest)</label>
                <select
                  value={finalist.badge}
                  onChange={(e) => handleUpdateField('badge', e.target.value)}
                  className="w-full bg-[#18191f] border border-[#262833] rounded px-3 py-1.5 text-xs text-[#ffd000] font-bold focus:border-[#ffd000] outline-none"
                >
                  <option value="Finisher++">Finisher++ (Clinical Striker)</option>
                  <option value="Golden Boot">Golden Boot (Top Scorer)</option>
                  <option value="Safe Hands">Safe Hands (Golden Glove)</option>
                  <option value="Playmaker">Playmaker (Assists King)</option>
                  <option value="Defensive Wall">Defensive Wall</option>
                  <option value="Emerging Star">Emerging Star</option>
                  <option value="Speed Demon">Speed Demon</option>
                  <option value="Dead Ball">Dead Ball Specialist</option>
                  <option value="Acrobatic">Acrobatic Finisher</option>
                  {availableBadges.map((b) => (
                    <option key={b.id || b.code} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Tournament Stat / Highlight</label>
                <input
                  type="text"
                  value={finalist.statLabel || ''}
                  onChange={(e) => handleUpdateField('statLabel', e.target.value)}
                  placeholder="e.g. 29 GOALS • RATING 89"
                  className="w-full bg-[#18191f] border border-[#262833] rounded px-3 py-1.5 text-xs text-white font-mono focus:border-[#ffd000] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Country Flag Emoji</label>
                <input
                  type="text"
                  value={finalist.flag || '⚽'}
                  onChange={(e) => handleUpdateField('flag', e.target.value)}
                  className="w-full bg-[#18191f] border border-[#262833] rounded px-3 py-1.5 text-xs text-white focus:border-[#ffd000] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#8b8e99] uppercase font-bold mb-1">Team Icon / Logo Tag</label>
                <input
                  type="text"
                  value={finalist.teamLogo || '⚽'}
                  onChange={(e) => handleUpdateField('teamLogo', e.target.value)}
                  className="w-full bg-[#18191f] border border-[#262833] rounded px-3 py-1.5 text-xs text-white focus:border-[#ffd000] outline-none"
                />
              </div>
            </div>

            {/* Direct Image Attachment & Crop / Zoom Adjusting Section */}
            <div className="pt-3 border-t border-[#262833] space-y-3">
              <label className="block text-xs font-black uppercase tracking-wider text-[#ffd000] flex items-center gap-1.5">
                <Upload className="w-4 h-4" /> Attach Player Photo Cutout
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="awards-photo-upload"
                />
                <label
                  htmlFor="awards-photo-upload"
                  className="px-4 py-2 rounded-lg bg-[#ffd000] hover:bg-[#facc15] text-[#0a0b0d] font-black text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Photo File</span>
                </label>

                {finalist.photo && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-3 py-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-bold text-xs uppercase transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Photo</span>
                  </button>
                )}
              </div>

              {/* Photo Zoom and Position Adjusting Controls */}
              {finalist.photo && (
                <div className="p-3.5 rounded-xl bg-[#18191f] border border-[#262833] space-y-3 mt-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#ffd000] flex items-center gap-1.5">
                    <Move className="w-3.5 h-3.5" /> Photo Zoom &amp; Alignment Adjustments
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Zoom / Scale */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-[#8b8e99] font-bold mb-1">
                        <span>Zoom ({photoScale.toFixed(2)}x)</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateField('photo_scale', 1)}
                          className="text-[#ffd000] hover:underline"
                        >
                          Reset
                        </button>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.5"
                        step="0.05"
                        value={photoScale}
                        onChange={(e) => handleUpdateField('photo_scale', parseFloat(e.target.value))}
                        className="w-full accent-[#ffd000] cursor-pointer"
                      />
                    </div>

                    {/* Horizontal Shift */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-[#8b8e99] font-bold mb-1">
                        <span>X Offset ({photoX}px)</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateField('photo_x', 0)}
                          className="text-[#ffd000] hover:underline"
                        >
                          Reset
                        </button>
                      </div>
                      <input
                        type="range"
                        min="-150"
                        max="150"
                        step="2"
                        value={photoX}
                        onChange={(e) => handleUpdateField('photo_x', parseInt(e.target.value, 10))}
                        className="w-full accent-[#ffd000] cursor-pointer"
                      />
                    </div>

                    {/* Vertical Shift */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-[#8b8e99] font-bold mb-1">
                        <span>Y Offset ({photoY}px)</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateField('photo_y', 0)}
                          className="text-[#ffd000] hover:underline"
                        >
                          Reset
                        </button>
                      </div>
                      <input
                        type="range"
                        min="-150"
                        max="150"
                        step="2"
                        value={photoY}
                        onChange={(e) => handleUpdateField('photo_y', parseInt(e.target.value, 10))}
                        className="w-full accent-[#ffd000] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

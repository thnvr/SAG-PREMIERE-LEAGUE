import React from 'react';
import { formatMoney } from '../services/api';

// ============================================================
// FIFA NATIONAL TEAM FLAGS  — emoji flags for all FIFA members
// ============================================================
const FIFA_FLAG_MAP = {
  // A
  'Afghanistan': '🇦🇫', 'Albania': '🇦🇱', 'Algeria': '🇩🇿', 'Andorra': '🇦🇩',
  'Angola': '🇦🇴', 'Antigua and Barbuda': '🇦🇬', 'Argentina': '🇦🇷', 'Armenia': '🇦🇲',
  'Australia': '🇦🇺', 'Austria': '🇦🇹', 'Azerbaijan': '🇦🇿',
  // B
  'Bahamas': '🇧🇸', 'Bahrain': '🇧🇭', 'Bangladesh': '🇧🇩', 'Barbados': '🇧🇧',
  'Belarus': '🇧🇾', 'Belgium': '🇧🇪', 'Belize': '🇧🇿', 'Benin': '🇧🇯',
  'Bhutan': '🇧🇹', 'Bolivia': '🇧🇴', 'Bosnia and Herzegovina': '🇧🇦',
  'Botswana': '🇧🇼', 'Brazil': '🇧🇷', 'Brunei': '🇧🇳', 'Bulgaria': '🇧🇬',
  'Burkina Faso': '🇧🇫', 'Burundi': '🇧🇮',
  // C
  'Cambodia': '🇰🇭', 'Cameroon': '🇨🇲', 'Canada': '🇨🇦', 'Cape Verde': '🇨🇻',
  'Central African Republic': '🇨🇫', 'Chad': '🇹🇩', 'Chile': '🇨🇱', 'China': '🇨🇳',
  'Colombia': '🇨🇴', 'Comoros': '🇰🇲', 'Congo': '🇨🇬', 'DR Congo': '🇨🇩',
  'Costa Rica': '🇨🇷', 'Croatia': '🇭🇷', 'Cuba': '🇨🇺', 'Cyprus': '🇨🇾',
  'Czech Republic': '🇨🇿', 'Czechia': '🇨🇿',
  // D
  'Denmark': '🇩🇰', 'Djibouti': '🇩🇯', 'Dominica': '🇩🇲', 'Dominican Republic': '🇩🇴',
  // E
  'Ecuador': '🇪🇨', 'Egypt': '🇪🇬', 'El Salvador': '🇸🇻', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Equatorial Guinea': '🇬🇶', 'Eritrea': '🇪🇷', 'Estonia': '🇪🇪', 'Eswatini': '🇸🇿',
  'Ethiopia': '🇪🇹',
  // F
  'Fiji': '🇫🇯', 'Finland': '🇫🇮', 'France': '🇫🇷',
  // G
  'Gabon': '🇬🇦', 'Gambia': '🇬🇲', 'Georgia': '🇬🇪', 'Germany': '🇩🇪',
  'Ghana': '🇬🇭', 'Greece': '🇬🇷', 'Guatemala': '🇬🇹', 'Guinea': '🇬🇳',
  'Guinea-Bissau': '🇬🇼', 'Guyana': '🇬🇾',
  // H
  'Haiti': '🇭🇹', 'Honduras': '🇭🇳', 'Hong Kong': '🇭🇰', 'Hungary': '🇭🇺',
  // I
  'Iceland': '🇮🇸', 'India': '🇮🇳', 'Indonesia': '🇮🇩', 'Iran': '🇮🇷',
  'Iraq': '🇮🇶', 'Ireland': '🇮🇪', 'Israel': '🇮🇱', 'Italy': '🇮🇹',
  'Ivory Coast': '🇨🇮', "Côte d'Ivoire": '🇨🇮',
  // J
  'Jamaica': '🇯🇲', 'Japan': '🇯🇵', 'Jordan': '🇯🇴',
  // K
  'Kazakhstan': '🇰🇿', 'Kenya': '🇰🇪', 'Kosovo': '🇽🇰', 'Kuwait': '🇰🇼',
  'Kyrgyzstan': '🇰🇬',
  // L
  'Laos': '🇱🇦', 'Latvia': '🇱🇻', 'Lebanon': '🇱🇧', 'Lesotho': '🇱🇸',
  'Liberia': '🇱🇷', 'Libya': '🇱🇾', 'Liechtenstein': '🇱🇮', 'Lithuania': '🇱🇹',
  'Luxembourg': '🇱🇺',
  // M
  'Macau': '🇲🇴', 'Madagascar': '🇲🇬', 'Malawi': '🇲🇼', 'Malaysia': '🇲🇾',
  'Maldives': '🇲🇻', 'Mali': '🇲🇱', 'Malta': '🇲🇹', 'Mauritania': '🇲🇷',
  'Mauritius': '🇲🇺', 'Mexico': '🇲🇽', 'Moldova': '🇲🇩', 'Mongolia': '🇲🇳',
  'Montenegro': '🇲🇪', 'Morocco': '🇲🇦', 'Mozambique': '🇲🇿', 'Myanmar': '🇲🇲',
  // N
  'Namibia': '🇳🇦', 'Nepal': '🇳🇵', 'Netherlands': '🇳🇱', 'New Zealand': '🇳🇿',
  'Nicaragua': '🇳🇮', 'Niger': '🇳🇪', 'Nigeria': '🇳🇬', 'North Korea': '🇰🇵',
  'North Macedonia': '🇲🇰', 'Northern Ireland': '🇬🇧', 'Norway': '🇳🇴',
  // O
  'Oman': '🇴🇲',
  // P
  'Pakistan': '🇵🇰', 'Palestine': '🇵🇸', 'Panama': '🇵🇦', 'Papua New Guinea': '🇵🇬',
  'Paraguay': '🇵🇾', 'Peru': '🇵🇪', 'Philippines': '🇵🇭', 'Poland': '🇵🇱',
  'Portugal': '🇵🇹',
  // Q
  'Qatar': '🇶🇦',
  // R
  'Romania': '🇷🇴', 'Russia': '🇷🇺', 'Rwanda': '🇷🇼',
  // S
  'Saudi Arabia': '🇸🇦', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Senegal': '🇸🇳', 'Serbia': '🇷🇸',
  'Sierra Leone': '🇸🇱', 'Singapore': '🇸🇬', 'Slovakia': '🇸🇰', 'Slovenia': '🇸🇮',
  'Solomon Islands': '🇸🇧', 'Somalia': '🇸🇴', 'South Africa': '🇿🇦',
  'South Korea': '🇰🇷', 'Korea Republic': '🇰🇷', 'Korea DPR': '🇰🇵',
  'South Sudan': '🇸🇸', 'Spain': '🇪🇸', 'Sri Lanka': '🇱🇰', 'Sudan': '🇸🇩',
  'Suriname': '🇸🇷', 'Sweden': '🇸🇪', 'Switzerland': '🇨🇭', 'Syria': '🇸🇾',
  // T
  'Taiwan': '🇹🇼', 'Tajikistan': '🇹🇯', 'Tanzania': '🇹🇿', 'Thailand': '🇹🇭',
  'Timor-Leste': '🇹🇱', 'Togo': '🇹🇬', 'Trinidad and Tobago': '🇹🇹',
  'Tunisia': '🇹🇳', 'Turkey': '🇹🇷', 'Turkmenistan': '🇹🇲',
  // U
  'Uganda': '🇺🇬', 'Ukraine': '🇺🇦', 'United Arab Emirates': '🇦🇪', 'UAE': '🇦🇪',
  'United States': '🇺🇸', 'USA': '🇺🇸', 'Uruguay': '🇺🇾', 'Uzbekistan': '🇺🇿',
  // V
  'Venezuela': '🇻🇪', 'Vietnam': '🇻🇳',
  // W
  'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  // Y
  'Yemen': '🇾🇪',
  // Z
  'Zambia': '🇿🇲', 'Zimbabwe': '🇿🇼',
};

function getFlagEmoji(nationality) {
  if (!nationality) return '🌍';
  // Direct lookup
  const direct = FIFA_FLAG_MAP[nationality];
  if (direct) return direct;
  // Case-insensitive lookup
  const lower = nationality.toLowerCase();
  const found = Object.entries(FIFA_FLAG_MAP).find(([k]) => k.toLowerCase() === lower);
  if (found) return found[1];
  return '🌍';
}

export default function PlayerCard({
  player,
  size = 'md', // sm, md, lg, xl
  showPrice = true,
  showStats = true,
  className = '',
}) {
  if (!player) return null;

  // Size styling classes for the Ultimate Gold Card
  const sizeClasses = {
    sm: 'w-44 xs:w-48 h-[285px] xs:h-[310px] text-[10px] xs:text-xs',
    md: 'w-52 xs:w-60 h-[335px] xs:h-[385px] text-xs xs:text-sm',
    lg: 'w-60 xs:w-72 h-[390px] xs:h-[460px] text-xs xs:text-base',
    xl: 'w-full max-w-[285px] xs:max-w-[340px] sm:max-w-[380px] h-[460px] xs:h-[500px] sm:h-[540px] text-xs sm:text-base',
  }[size] || 'w-52 xs:w-60 h-[335px] xs:h-[385px] text-xs xs:text-sm';

  const primaryPos = player.primary_position || 'CF';
  const rating = player.overall_rating || 92;

  // Attributes: PAC, SHO, PAS | DRI, DEF, PHY
  const pac = player.speed_rating || 85;
  const sho = player.shooting_rating || 95;
  const pas = player.passing_rating || 92;
  const dri = player.dribbling_rating || 93;
  const def = player.defensive_rating || 58;
  const phy = player.physical_rating || 67;

  // Format player name e.g. "L. MENZI"
  const formattedName = player.name ? player.name.toUpperCase() : 'L. MENZI';

  return (
    <div
      className={`relative select-none flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] ${sizeClasses} ${className}`}
    >
      {/* Outer Card Frame: Dark Gold Olive Outer Border */}
      <div className="relative w-full h-full rounded-[24px] sm:rounded-[28px] p-1.5 sm:p-2 bg-[#3f3b14] shadow-[0_15px_45px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden">
        
        {/* Inner Card Container */}
        <div className="relative w-full h-full rounded-[18px] sm:rounded-[22px] overflow-hidden flex flex-col justify-between bg-[#1f1d0b] border-2 border-[#b89f28]/60">
          
          {/* =========================================================================
              TOP HALF: Diagonal Stripes Texture, Ultimate Badge, Player Portrait, Flag
             ========================================================================= */}
          <div 
            className="relative flex-1 w-full overflow-hidden flex flex-col justify-between p-2.5 sm:p-3.5"
            style={{
              backgroundColor: '#524813',
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.15) 0px, rgba(0, 0, 0, 0.15) 3px, transparent 3px, transparent 8px)'
            }}
          >
            {/* Header: Ultimate Pill on Left, Season/Serial on Right */}
            <div className="relative z-20 flex items-start justify-between">
              {/* "Ultimate" Rounded Yellow Pill */}
              <div className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[#facc15] text-[#1c1907] font-black text-[10px] sm:text-[11px] tracking-wide shadow-sm">
                Ultimate
              </div>

              {/* Season / Serial Number */}
              <div className="text-right font-mono text-[8.5px] sm:text-[9px] text-[#fef08a]/80 font-bold leading-tight">
                <div>2026 - 2027</div>
                <div className="text-[#fef08a]">{player.jersey_number || 16}/100</div>
              </div>
            </div>

            {/* Left Column: Big Bold Rating & Position */}
            <div className="relative z-20 flex flex-col items-start mt-1 sm:mt-2">
              <span className="font-sans font-black text-3xl xs:text-4xl sm:text-5xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] tracking-tighter leading-none">
                {rating}
              </span>
              <span className="font-sans font-black text-lg xs:text-xl sm:text-2xl text-white/95 uppercase drop-shadow mt-0.5 tracking-wider">
                {primaryPos}
              </span>
            </div>

            {/* Right Side: SAG Premiere League Shield Logo */}
            <div
              className="absolute top-12 right-2.5 z-20 w-10 h-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
              title="SAG Premiere League"
            >
              <svg viewBox="0 0 100 120" className="w-full h-full">
                <defs>
                  <linearGradient id="cardShield" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1a1b22" />
                    <stop offset="100%" stopColor="#0b0c0f" />
                  </linearGradient>
                  <linearGradient id="cardGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffd000" />
                    <stop offset="100%" stopColor="#b89000" />
                  </linearGradient>
                </defs>
                {/* Shield outer shape */}
                <path
                  d="M50 4 L94 20 L94 65 C94 92 50 116 50 116 C50 116 6 92 6 65 L6 20 Z"
                  fill="url(#cardShield)"
                  stroke="url(#cardGold)"
                  strokeWidth="4"
                />
                {/* Football icon inside */}
                <circle cx="50" cy="55" r="22" fill="#ffffff" />
                <path d="M50 43 L59 50 L56 60 L44 60 L41 50 Z" fill="#111215" />
                <path d="M50 43 L50 33 M59 50 L69 47 M56 60 L62 70 M44 60 L38 70 M41 50 L31 47" stroke="#111215" strokeWidth="2.5" />
                {/* Star on top */}
                <polygon points="50,14 53,21 60,21 54,26 56,33 50,28 44,33 46,26 40,21 47,21" fill="#ffd000" />
                {/* S-A-G letters at bottom of shield */}
                <text x="50" y="100" textAnchor="middle" fill="#ffd000" fontSize="11" fontFamily="Arial Black, sans-serif" fontWeight="900" letterSpacing="2">SAG</text>
              </svg>
            </div>

            {/* Center Player Cutout Portrait */}
            <div className="absolute inset-x-0 bottom-0 top-6 z-10 flex items-end justify-center pointer-events-none overflow-hidden">
              <div className="relative w-36 h-36 xs:w-44 xs:h-44 sm:w-52 sm:h-52 flex items-end justify-center">
                {player.photo_url ? (
                  <img
                    key={player.photo_url}
                    src={player.photo_url}
                    alt={player.name}
                    style={{
                      transform: `translate(${player.photo_x || 0}px, ${player.photo_y || 0}px) scale(${player.photo_scale || 1})`,
                      transformOrigin: 'center center',
                    }}
                    className="w-full h-full object-cover object-center drop-shadow-[0_12px_24px_rgba(0,0,0,0.95)]"
                    onLoad={(e) => {
                      e.target.style.display = 'block';
                      const sil = e.target.parentElement?.querySelector('.player-silhouette');
                      if (sil) sil.style.display = 'none';
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const sil = e.target.parentElement?.querySelector('.player-silhouette');
                      if (sil) sil.style.display = 'flex';
                    }}
                  />
                ) : null}
                {/* Placeholder silhouette — always rendered, hidden when photo loads */}
                <div
                  className="player-silhouette w-24 h-24 xs:w-28 xs:h-28 sm:w-32 sm:h-32 mb-2 rounded-full bg-slate-800/80 border-2 border-[#facc15]/50 items-center justify-center shadow-inner"
                  style={{ display: player.photo_url ? 'none' : 'flex' }}
                >
                  <svg className="w-14 h-14 xs:w-16 xs:h-16 text-slate-400 fill-current opacity-80" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              BOTTOM HALF: Vibrant Solid Yellow Shield Base
              - V-Neck Chevron Cut at Top
              - Player Name in Bold Dark Typography (L. MENZI style)
              - 2-Column Stats Grid with Vertical Divider Line
              - Geometric Bowtie Emblem at Pointed Base
             ========================================================================= */}
          <div 
            className="relative z-20 w-full bg-[#ffd000] text-[#1c1907] flex flex-col justify-between pt-3 xs:pt-4 pb-2 px-3 xs:px-4 shadow-2xl -mt-4"
            style={{
              clipPath: 'polygon(0% 12%, 50% 0%, 100% 12%, 100% 90%, 50% 100%, 0% 90%)'
            }}
          >
            {/* Player Name Banner (e.g. L. MENZI) */}
            <div className="pt-2 text-center">
              <h3 className="font-sans font-black text-base xs:text-xl sm:text-2xl tracking-wider text-[#0e0d04] uppercase truncate w-full px-1">
                {formattedName}
              </h3>
            </div>

            {/* Stats Grid: 2 Columns separated by thin vertical line */}
            {showStats && (
              <div className="my-2 py-1.5 flex items-center justify-center font-sans">
                {/* Left Stats Column: PAC, SHO, PAS */}
                <div className="flex-1 space-y-0.5 text-right pr-4">
                  <div className="flex items-center justify-end gap-1.5 font-mono">
                    <span className="font-black text-sm text-[#0e0d04]">{pac}</span>
                    <span className="text-[10px] font-bold text-[#443e0e]">PAC</span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 font-mono">
                    <span className="font-black text-sm text-[#0e0d04]">{sho}</span>
                    <span className="text-[10px] font-bold text-[#443e0e]">SHO</span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 font-mono">
                    <span className="font-black text-sm text-[#0e0d04]">{pas}</span>
                    <span className="text-[10px] font-bold text-[#443e0e]">PAS</span>
                  </div>
                </div>

                {/* Thin Vertical Dividing Line from screenshot */}
                <div className="w-[1px] h-11 bg-[#b39100]/60 self-center" />

                {/* Right Stats Column: DRI, DEF, PHY */}
                <div className="flex-1 space-y-0.5 text-left pl-4">
                  <div className="flex items-center justify-start gap-1.5 font-mono">
                    <span className="font-black text-sm text-[#0e0d04]">{dri}</span>
                    <span className="text-[10px] font-bold text-[#443e0e]">DRI</span>
                  </div>
                  <div className="flex items-center justify-start gap-1.5 font-mono">
                    <span className="font-black text-sm text-[#0e0d04]">{def}</span>
                    <span className="text-[10px] font-bold text-[#443e0e]">DEF</span>
                  </div>
                  <div className="flex items-center justify-start gap-1.5 font-mono">
                    <span className="font-black text-sm text-[#0e0d04]">{phy}</span>
                    <span className="text-[10px] font-bold text-[#443e0e]">PHY</span>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Geometric Hourglass / Bowtie Icon from screenshot */}
            <div className="flex items-center justify-center pb-2">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#735e00] fill-current">
                <path d="M4 2 L20 2 L12 12 L20 22 L4 22 L12 12 Z" />
              </svg>
            </div>
          </div>

          {/* =========================================================================
              BOTTOM LOT / BID PRICE FOOTER
             ========================================================================= */}
          {showPrice && (
            <div className="bg-[#121105] py-2 px-3 flex items-center justify-between text-xs font-mono border-t border-[#3f3b14]">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-[#a89f68] block font-bold leading-none">
                  BASE LOT
                </span>
                <span className="text-xs font-black text-[#facc15]">
                  {formatMoney(player.base_price)}
                </span>
              </div>

              <div className="text-right">
                {player.auction_status === 'sold' ? (
                  <span className="px-2 py-0.5 rounded bg-[#facc15] text-[#1c1907] font-black text-[10px] uppercase shadow">
                    SOLD: {formatMoney(player.sold_price)}
                  </span>
                ) : player.auction_status === 'bidding' ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-500 text-[#0a0b0d] font-black text-[10px] uppercase animate-pulse">
                    IN BIDDING
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-[#2b270a] text-[#d4cc8e] font-bold text-[10px] uppercase">
                    AVAILABLE
                  </span>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

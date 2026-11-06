import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuction } from '../context/AuctionContext';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../services/api';
import TeamCard from '../components/TeamCard';
import {
  Trophy,
  Gavel,
  Shield,
  Users,
  ChevronRight,
  TrendingUp,
  Award,
  Zap,
  ArrowRight,
  Flame,
  ArrowLeft,
  Activity,
  Layers,
  Sparkles,
  ChevronLeft,
  Eye
} from 'lucide-react';

export default function HomePage() {
  const { league, teams, recentSales, topPaidPlayers, lowPaidPlayers, availablePool } = useAuction();
  const { user } = useAuth();

  // Slide state matching "03 / 06" counter and arrow navigation from user screenshot
  const [activeSlide, setActiveSlide] = useState(2); // index 2 = "03 / 06"
  const totalSlides = 6;

  const slidesData = [
    {
      subtitle: 'OFFICIAL LEAGUE AUCTION',
      titleHighlight: 'Football Auction',
      titleMain: 'of the year',
      description: 'The definitive platform for professional football franchises. Real-time authoritative increments, squad quota balance, and instant ledger reconciliation.',
      stat1Label: 'Total Registered Pool',
      stat1Val: '25+ Elite Athletes',
      stat2Label: 'Allocated Purse Pool',
      stat2Val: '₹60,00,000 Total',
      badge: 'TOP SCORER'
    },
    {
      subtitle: 'AUTHORITATIVE BIDDING',
      titleHighlight: 'Tactical Squad',
      titleMain: 'builder radar',
      description: 'Captain war room intelligence featuring position rival alternatives, 4-3-3 formation combination preview, and live rival purse capacity inspection.',
      stat1Label: 'Tactical Formations',
      stat1Val: '11-a-Side Combinations',
      stat2Label: 'Rival Intel',
      stat2Val: 'Live Max Single Bid',
      badge: 'PLAYMAKER'
    },
    {
      subtitle: 'MARQUEE TRANSFERS',
      titleHighlight: 'Football Player',
      titleMain: 'of the year',
      description: 'Experience broadcast-grade auctioning with animated hammer falls, live spectator cheering feeds, and automatic EA FC 26 trading card generation.',
      stat1Label: 'Authoritative Step',
      stat1Val: '+₹50 / +₹100 Orders',
      stat2Label: 'Sync Protocol',
      stat2Val: 'Sub-Millisecond WebSockets',
      badge: 'TOP SCORER'
    },
    {
      subtitle: 'FINANCIAL INTEGRITY',
      titleHighlight: 'Zero Math',
      titleMain: 'discrepancy',
      description: 'Guaranteed integer paise calculations ensuring franchise budgets are protected with reserved quotas for minimum squad requirements.',
      stat1Label: 'Calculation Speed',
      stat1Val: 'Instant ACID Sync',
      stat2Label: 'Squad Enforcement',
      stat2Val: 'Minimum Quota Lock',
      badge: 'DEFENSIVE WALL'
    },
    {
      subtitle: 'EA FC 26 TRADING CARDS',
      titleHighlight: 'Interactive Cutout',
      titleMain: 'card generator',
      description: 'Shield-shaped dynamic cards featuring real-time stat ratings, role ++ playstyle badges, attribute bars, and one-click PNG card export.',
      stat1Label: 'Card Styles',
      stat1Val: 'Star, TOTY, Special Edition',
      stat2Label: 'Attribute Ratings',
      stat2Val: 'PAC, SHO, PAS, DRI, DEF, PHY',
      badge: 'STAR PICK'
    },
    {
      subtitle: 'BROADCAST & SPECTATOR TV',
      titleHighlight: 'Live Stadium',
      titleMain: 'spectator arena',
      description: 'Full-screen broadcast display designed for TV projectors with real-time fan comments, quick cheering emoji reactions, and live team inspection.',
      stat1Label: 'Broadcast Resolution',
      stat1Val: 'Ultra-HD Projector Mode',
      stat2Label: 'Crowd Interaction',
      stat2Val: 'Live Fan Cheer Reactions',
      badge: 'CROWD ROAR'
    }
  ];

  const currentSlideData = slidesData[activeSlide];

  const handlePrev = () => {
    setActiveSlide((prev) => (prev === 0 ? totalSlides - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveSlide((prev) => (prev + 1) % totalSlides);
  };

  return (
    <div className="flex-1 flex flex-col font-sans bg-[#111215] text-white">
      
      {/* ===== HERO BANNER ===== */}
      <section className="relative min-h-[500px] lg:min-h-[620px] flex flex-col lg:flex-row border-b border-[#22242b] overflow-hidden">
        
        {/* Left: Football Action Image */}
        <div className="w-full lg:w-[48%] relative min-h-[220px] xs:min-h-[260px] sm:min-h-[300px] lg:min-h-full flex-shrink-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: 'url("https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1200&auto=format&fit=crop")',
            }}
          />
          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-[#111215]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111215] via-transparent to-transparent lg:hidden" />

          {/* Vertical badge */}
          <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 z-10 flex items-center gap-3">
            <span className="[writing-mode:vertical-lr] rotate-180 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.25em] text-white/90 bg-[#111215]/80 backdrop-blur-md px-2 py-2.5 sm:py-3 rounded border border-white/10">
              {currentSlideData.badge}
            </span>
            <span className="text-[10px] sm:text-[11px] text-white/60 font-mono hidden sm:block">
              SAG PREMIERE LEAGUE • 2026
            </span>
          </div>
        </div>

        {/* Right: Hero Content */}
        <div className="w-full lg:w-[52%] flex flex-col justify-between p-5 sm:p-10 lg:p-14 bg-[#111215] relative z-10">
          
          {/* Slide counter + arrow controls */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-xl xs:text-2xl sm:text-3xl font-black text-white flex items-baseline gap-1.5">
                <span className="text-[#ffd000]">0{activeSlide + 1}</span>
                <span className="text-[#3a3d4a]">/</span>
                <span className="text-[#5a5d6a] text-lg sm:text-xl font-bold">0{totalSlides}</span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-bold text-[#6b6e7a] uppercase tracking-wider mt-0.5 sm:mt-1">
                {currentSlideData.subtitle}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                className="w-9 h-9 sm:w-11 sm:h-11 bg-[#ffd000] hover:bg-[#facc15] active:scale-95 text-[#0a0b0d] font-black flex items-center justify-center transition-all shadow-[0_0_12px_rgba(255,208,0,0.3)] cursor-pointer"
                aria-label="Previous Slide"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
              </button>
              <button
                onClick={handleNext}
                className="w-9 h-9 sm:w-11 sm:h-11 bg-[#ffd000] hover:bg-[#facc15] active:scale-95 text-[#0a0b0d] font-black flex items-center justify-center transition-all shadow-[0_0_12px_rgba(255,208,0,0.3)] cursor-pointer"
                aria-label="Next Slide"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* Headline */}
          <div className="py-5 sm:py-8">
            <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] text-white">
              <span className="text-[#ffd000] block">{currentSlideData.titleHighlight}</span>
              <span>{currentSlideData.titleMain}</span>
            </h1>
            <p className="mt-3 sm:mt-5 text-xs sm:text-sm text-[#9fa2af] max-w-xl leading-relaxed">
              {currentSlideData.description}
            </p>
            <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-2.5 sm:gap-3">
              {user?.role === 'spectator' ? (
                <Link
                  to="/spectator"
                  className="w-full sm:w-auto px-5 sm:px-7 py-3 bg-[#ffd000] hover:bg-[#facc15] text-[#0a0b0d] font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(255,208,0,0.35)] transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>Open Spectator Broadcast</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/auction"
                    className="w-full sm:w-auto px-5 sm:px-7 py-3 bg-[#ffd000] hover:bg-[#facc15] text-[#0a0b0d] font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(255,208,0,0.35)] transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    <Gavel className="w-4 h-4" />
                    <span>Enter Live Auction</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/captains-dashboard"
                    className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-[#1a1b20] hover:bg-[#23252c] text-white border border-[#2b2d37] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <Shield className="w-4 h-4 text-[#ffd000]" />
                    <span>Captains War Room</span>
                  </Link>
                  <Link
                    to="/spectator-login"
                    className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-[#1a1b20] hover:bg-[#23252c] text-white border border-[#2b2d37] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4 text-[#ffd000]" />
                    <span>Spectator Broadcast</span>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Bottom stats */}
          <div className="pt-6 border-t border-[#22242b] grid grid-cols-2 gap-6">
            <div className="flex items-start gap-2">
              <span className="text-[#ffd000] font-black text-lg leading-none mt-0.5">+</span>
              <div>
                <h4 className="text-[11px] font-black text-white uppercase tracking-wider">
                  {currentSlideData.stat1Label}
                </h4>
                <p className="text-xs text-[#6b6e7a] mt-0.5 font-mono">
                  {currentSlideData.stat1Val}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[#ffd000] font-black text-lg leading-none mt-0.5">+</span>
              <div>
                <h4 className="text-[11px] font-black text-white uppercase tracking-wider">
                  {currentSlideData.stat2Label}
                </h4>
                <p className="text-xs text-[#6b6e7a] mt-0.5 font-mono">
                  {currentSlideData.stat2Val}
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          SECTION 2: THREE COMPETING FRANCHISES (Dark Arena Theme)
         ========================================================================= */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-[#22242b]">
          <div>
            <div className="inline-flex items-center gap-2 text-[#ffd000] text-xs font-black uppercase tracking-widest mb-1">
              <span>●</span>
              <span>COMPETING FRANCHISES</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
              Three-Team Championship Roster
            </h2>
          </div>

          <Link
            to="/captains-dashboard"
            className="text-xs font-black text-[#ffd000] hover:underline uppercase tracking-wider flex items-center gap-1"
          >
            <span>TACTICAL WAR ROOM</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: HIGHLIGHTS CAROUSEL (Top Transfers, Tactical Bargains)
         ========================================================================= */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="rounded-2xl p-6 sm:p-8 bg-[#18191f] border border-[#262833] relative overflow-hidden">
          
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#262833]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-[#ffd000]/10 flex items-center justify-center text-[#ffd000]">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#ffd000] block">
                  AUCTION RECORD BOOK
                </span>
                <span className="text-base font-black text-white uppercase">
                  Top Transfers & Tactical Bargains
                </span>
              </div>
            </div>

            <span className="px-3 py-1 rounded bg-[#111215] text-[#ffd000] border border-[#2a2d38] font-mono text-xs font-bold">
              REAL-TIME LEDGER
            </span>
          </div>

          {topPaidPlayers && topPaidPlayers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {topPaidPlayers.map((p, i) => (
                <div
                  key={p.id}
                  className="p-4 rounded-xl bg-[#121317] border border-[#22242d] hover:border-[#ffd000]/50 transition flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-black text-[#ffd000]">RECORD #{i + 1}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#22242e] text-white">
                      {p.primary_position}
                    </span>
                  </div>
                  <div>
                    <div className="font-black text-white text-sm truncate">{p.player_name}</div>
                    <div className="text-xs font-bold mt-0.5" style={{ color: p.team_color }}>
                      {p.team_name}
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-[#22242d] flex items-center justify-between font-mono">
                    <span className="text-[10px] text-[#6b6e7a] uppercase">Fee</span>
                    <span className="text-sm font-black text-[#ffd000]">{p.formattedPrice}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-[#6b6e7a] text-xs">
              No confirmed transfers yet. Highest purchases will appear here live during bidding.
            </div>
          )}

        </div>
      </section>

      {/* =========================================================================
          SECTION 4: COMMISSIONER HOTLINE BANNER
         ========================================================================= */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="p-8 rounded-2xl bg-[#18191f] border border-[#262833] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">
              Tournament Commissioners Desk
            </h3>
            <p className="text-xs text-[#8b8e99] mt-1">
              Authoritative squad quota resolutions, purse adjustments, and match combinations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-5 py-2.5 rounded-md bg-[#111215] border border-[#282a35] font-mono text-xs text-[#ffd000] font-bold">
              HOTLINE: +91 8792434771
            </span>
          </div>
        </div>
      </section>

    </div>
  );
}

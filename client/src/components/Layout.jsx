import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuction } from '../context/AuctionContext';
import ConnectionIndicator from './ConnectionIndicator';
import {
  Trophy,
  LayoutDashboard,
  Gavel,
  Users,
  Shield,
  History,
  Cast,
  LogOut,
  Menu,
  X,
  Phone,
  Mail,
  Instagram
} from 'lucide-react';

export default function Layout({ children }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { connected } = useAuction();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const role = user?.role || 'viewer';

  const navItems = [
    { label: 'HOME', path: '/', icon: Trophy },
    { label: 'CAPTAINS DESK', path: '/captains-dashboard', icon: Shield },
    { label: 'LIVE AUCTION', path: '/auction', icon: Gavel },
    { label: 'PLAYERS', path: '/players', icon: Users },
    { label: 'SPECTATOR TV', path: '/spectator', icon: Cast },
    { label: 'RESULTS', path: '/history', icon: History },
  ];

  return (
    <div className="min-h-screen bg-[#111215] text-[#f1f2f6] flex flex-col font-sans selection:bg-[#ffd000] selection:text-[#0a0b0d] relative overflow-x-hidden">
      
      {/* Top Header - Precision Aligned Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#111215]/95 backdrop-blur-md border-b border-[#22242b]">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Official League Football Shield Logo */}
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group flex-shrink-0 min-w-0">
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
              <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_0_10px_rgba(255,208,0,0.4)]">
                <defs>
                  <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1a1b22" />
                    <stop offset="100%" stopColor="#0b0c0f" />
                  </linearGradient>
                  <linearGradient id="limeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffd000" />
                    <stop offset="100%" stopColor="#b89000" />
                  </linearGradient>
                </defs>
                <path d="M50 4 L94 20 L94 65 C94 92 50 116 50 116 C50 116 6 92 6 65 L6 20 Z" fill="url(#shieldGrad)" stroke="url(#limeGrad)" strokeWidth="4" />
                <circle cx="50" cy="55" r="22" fill="#ffffff" />
                <path d="M50 43 L59 50 L56 60 L44 60 L41 50 Z" fill="#111215" />
                <path d="M50 43 L50 33 M59 50 L69 47 M56 60 L62 70 M44 60 L38 70 M41 50 L31 47" stroke="#111215" strokeWidth="2.5" />
                <polygon points="50,14 53,21 60,21 54,26 56,33 50,28 44,33 46,26 40,21 47,21" fill="#ffd000" />
              </svg>
            </div>
            <div className="flex flex-col leading-none truncate">
              <span className="font-black text-sm sm:text-base lg:text-lg tracking-tight text-white uppercase leading-tight truncate">
                SAG <span className="text-[#ffd000]">PREMIERE LEAGUE</span>
              </span>
              <span className="hidden xs:block text-[8px] sm:text-[9px] tracking-[0.18em] text-[#6b6e7a] font-bold uppercase mt-0.5 whitespace-nowrap">
                OFFICIAL AUCTION PLATFORM 2026
              </span>
            </div>
          </Link>

          {/* Clean Navigation Links - Desktop & Laptop */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center px-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-[11px] font-black tracking-wider uppercase transition-all px-2.5 xl:px-3 py-2 rounded-md whitespace-nowrap ${
                    isActive
                      ? 'text-[#ffd000] bg-[#ffd000]/10 border border-[#ffd000]/30'
                      : 'text-[#9ca0b0] hover:text-white hover:bg-[#18191f]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Admin Desk Shortcut */}
            {(role === 'super_admin' || role === 'auctioneer') && (
              <Link
                to="/admin"
                className={`text-[11px] font-black tracking-wider uppercase transition-all px-3 py-1.5 rounded-md border ml-1 whitespace-nowrap ${
                  location.pathname.startsWith('/admin')
                    ? 'border-[#ffd000] text-[#ffd000] bg-[#ffd000]/10'
                    : 'border-[#2d303b] text-[#ffd000] hover:bg-[#ffd000]/10'
                }`}
              >
                ADMIN DESK
              </Link>
            )}
          </nav>

          {/* Right Status / Auth — responsive */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Cloud Sync Diagnostic & Status Indicator */}
            <ConnectionIndicator />

            {isAuthenticated ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="hidden xl:inline text-xs font-bold text-[#8b8e99] max-w-[120px] truncate">
                  {user?.displayName || user?.username}
                </span>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 sm:p-2 rounded-md bg-[#18191f] hover:bg-rose-950/40 text-[#8b8e99] hover:text-rose-400 border border-[#282a35] transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-md bg-[#ffd000] hover:bg-[#facc15] text-[#0a0b0d] font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(255,208,0,0.35)] transition-all active:scale-[0.98]"
              >
                LOGIN
              </Link>
            )}

            {/* Mobile / Tablet menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md bg-[#18191f] text-[#8b8e99] hover:text-white border border-[#282a35] transition"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-[#ffd000]" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-x-0 top-16 bottom-0 bg-[#0c0d10]/95 backdrop-blur-xl border-t border-[#22242b] z-50 p-4 overflow-y-auto animate-in slide-in-from-top-2 flex flex-col justify-between">
            <div className="space-y-1.5">
              {/* User Status Strip on Mobile */}
              {isAuthenticated && (
                <div className="p-3 mb-3 rounded-xl bg-[#18191f] border border-[#282a35] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#ffd000]/15 border border-[#ffd000]/30 flex items-center justify-center text-[#ffd000] font-black text-xs">
                      {(user?.displayName || user?.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{user?.displayName || user?.username}</div>
                      <div className="text-[10px] text-[#ffd000] font-mono uppercase">{user?.role || 'viewer'}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[11px] font-bold"
                  >
                    Logout
                  </button>
                </div>
              )}

              {/* Navigation Items */}
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-black tracking-wider uppercase transition-all ${
                      isActive
                        ? 'text-[#0a0b0d] bg-[#ffd000] shadow-[0_0_15px_rgba(255,208,0,0.3)]'
                        : 'text-[#8b8e99] hover:text-white bg-[#14151a] hover:bg-[#1c1d24] border border-[#22242d]'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* Admin Desk Shortcut for Admin / Auctioneer */}
              {(role === 'super_admin' || role === 'auctioneer') && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-black tracking-wider uppercase transition-all mt-2 ${
                    location.pathname.startsWith('/admin')
                      ? 'text-[#0a0b0d] bg-[#ffd000] shadow-[0_0_15px_rgba(255,208,0,0.3)]'
                      : 'text-[#ffd000] bg-[#ffd000]/10 border border-[#ffd000]/40 hover:bg-[#ffd000]/20'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
                  <span>ADMIN OPERATIONS DESK</span>
                </Link>
              )}
            </div>

            {/* Bottom hotline & info inside drawer */}
            <div className="pt-4 mt-6 border-t border-[#22242b] text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-[#8b8e99]">
                <Phone className="w-3.5 h-3.5 text-[#ffd000]" />
                <span>HOTLINE: <a href="tel:+918792434771" className="text-[#ffd000] font-bold">+91 8792434771</a></span>
              </div>
              <p className="text-[10px] text-[#555866]">SAG PREMIERE LEAGUES &bull; SEASON 2026</p>
            </div>
          </div>
        )}
      </header>

      {/* Main Page Body */}
      <main className="flex-1 flex flex-col relative z-10">
        {children}
      </main>

      {/* Dark Footer */}
      <footer className="bg-[#0b0c0f] text-white pt-10 sm:pt-14 pb-8 sm:pb-10 border-t border-[#1d1f26]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 pb-8 sm:pb-10 border-b border-[#1c1d24]">
            
            <div className="space-y-3 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-lg tracking-wider text-white">SAG <span className="text-[#ffd000]">PREMIERE LEAGUE</span></span>
              </div>
              <p className="text-xs text-[#8b8e99] leading-relaxed max-w-sm">
                Elite football player auction management engine. Real-time authoritative bids, EA FC card generation, and transparent franchise ledger.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-black text-[#ffd000] uppercase tracking-widest text-[11px]">Command Arena</h4>
              <ul className="space-y-1.5 text-[#8b8e99]">
                <li><Link to="/captains-dashboard" className="hover:text-white transition">Captains War Room</Link></li>
                <li><Link to="/auction" className="hover:text-white transition">Live Auction Stage</Link></li>
                <li><Link to="/players" className="hover:text-white transition">EA FC Player Cards</Link></li>
                <li><Link to="/spectator" className="hover:text-white transition">Spectator Broadcast TV</Link></li>
              </ul>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-black text-[#ffd000] uppercase tracking-widest text-[11px]">Franchises</h4>
              <ul className="space-y-1.5 text-[#8b8e99]">
                <li><Link to="/teams/team-alpha" className="hover:text-white transition">SAAG STRIKERS</Link></li>
                <li><Link to="/teams/team-bravo" className="hover:text-white transition">SAAG UNITED</Link></li>
                <li><Link to="/teams/team-charlie" className="hover:text-white transition">SAAG FC</Link></li>
                <li><Link to="/history" className="hover:text-white transition">Ledger &amp; Results</Link></li>
              </ul>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-black text-[#ffd000] uppercase tracking-widest text-[11px]">Tournament Desk</h4>
              <p className="text-[#8b8e99]">Direct commissioner hotline for rule queries and technical support.</p>
              <div className="pt-1 text-[#ffd000] font-mono text-xs font-bold">
                Hotline: <a href="tel:+918792434771" className="hover:underline">+91 8792434771</a>
              </div>
            </div>

          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#555866] gap-3 text-center sm:text-left">
            <div>&copy; 2026 SAG PREMIERE LEAGUE. All rights reserved.</div>
            <div className="flex items-center gap-2 justify-center">
              <span className="text-[#ffd000]">&bull;</span>
              <span>POWERED BY THANVEER KOLNAD DIGITAL CODER</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

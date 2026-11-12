import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getLocalTeams, DEFAULT_TEAMS, getDeletedTeamIds } from '../services/sheetsService';
import { User, Lock, AlertCircle, Shield, Gavel, Users, Zap, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('captains'); // 'captains' | 'auctioneer' | 'manual'
  const [teams, setTeams] = useState([]);

  const { login, quickLoginTeam, quickLoginAuctioneer, quickLoginAdmin, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    try {
      const deleted = getDeletedTeamIds();
      const local = getLocalTeams().filter(t => !deleted.has(t.id));
      const def = DEFAULT_TEAMS.filter(t => !deleted.has(t.id));
      const map = new Map();
      [...def, ...local].forEach(t => {
        if (t && t.id && !deleted.has(t.id)) map.set(t.id, t);
      });
      setTeams(Array.from(map.values()));
    } catch {
      setTeams(DEFAULT_TEAMS);
    }
  }, []);

  if (user) {
    const destination = location.state?.from?.pathname 
      ? location.state.from.pathname 
      : (user.role === 'captain' ? '/captains-dashboard' : '/auction');
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setError('Please provide both username and password');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const loggedUser = await login(cleanUser, cleanPass);
      const destination = location.state?.from?.pathname 
        ? location.state.from.pathname 
        : (loggedUser?.role === 'captain' ? '/captains-dashboard' : '/auction');
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCaptain = async (team) => {
    setError(null);
    setLoading(true);
    try {
      if (quickLoginTeam) {
        await quickLoginTeam(team);
      } else {
        await login(team.short_name || team.id, `123@${(team.short_name || '').toLowerCase()}`);
      }
      navigate('/captains-dashboard', { replace: true });
    } catch (err) {
      // Fallback: populate the manual form with standard captain credentials
      setUsername(team.short_name || team.name);
      setPassword(`123@${(team.short_name || 'team').toLowerCase()}`);
      setActiveTab('manual');
      setError('Credentials autofilled below. Click Sign In to connect.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAuctioneer = async () => {
    setError(null);
    setLoading(true);
    try {
      if (quickLoginAuctioneer) {
        await quickLoginAuctioneer();
      } else {
        await login('HEAD', '123@head');
      }
      navigate('/auction', { replace: true });
    } catch (err) {
      setUsername('HEAD');
      setPassword('123@head');
      setActiveTab('manual');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdmin = async () => {
    setError(null);
    setLoading(true);
    try {
      if (quickLoginAdmin) {
        await quickLoginAdmin();
      } else {
        await login('ADMIN', '123@admin');
      }
      navigate('/admin', { replace: true });
    } catch (err) {
      setUsername('ADMIN');
      setPassword('123@admin');
      setActiveTab('manual');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-3 xs:p-4 sm:p-6 lg:p-8 bg-[#111215] min-h-[calc(100vh-64px)]">
      <div className="w-full max-w-2xl relative z-10 py-4">
        
        {/* Brand Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-[#ffd000] flex items-center justify-center shadow-[0_0_30px_rgba(255,208,0,0.35)] mb-3 sm:mb-4">
            <span className="text-2xl sm:text-3xl">⚽</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
            SAG <span className="text-[#ffd000]">PREMIERE LEAGUE</span>
          </h1>
          <p className="text-[10px] sm:text-xs text-[#8b8e99] font-bold uppercase tracking-widest mt-1">
            Connected Auctioneer &amp; Franchise War Room Portal
          </p>
        </div>

        {/* Portal Switching Tabs */}
        <div className="flex rounded-xl bg-[#18191f] border border-[#262833] p-1.5 mb-5 shadow-lg">
          <button
            onClick={() => setActiveTab('captains')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'captains'
                ? 'bg-[#ffd000] text-[#0a0b0d] shadow'
                : 'text-[#8b8e99] hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Captains Desk</span>
          </button>

          <button
            onClick={() => setActiveTab('auctioneer')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'auctioneer'
                ? 'bg-[#ffd000] text-[#0a0b0d] shadow'
                : 'text-[#8b8e99] hover:text-white'
            }`}
          >
            <Gavel className="w-4 h-4" />
            <span>Auctioneer Desk</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-[#ffd000] text-[#0a0b0d] shadow'
                : 'text-[#8b8e99] hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Custom Login</span>
          </button>
        </div>

        {/* Login Box */}
        <div className="rounded-2xl p-5 xs:p-6 sm:p-8 bg-[#18191f] border border-[#262833] shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: CAPTAINS WAR ROOM CONNECT */}
          {activeTab === 'captains' && (
            <div className="space-y-4">
              <div className="text-center pb-2 border-b border-[#262833]">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Select Your Franchise To Enter Captain's Desk
                </h3>
                <p className="text-[11px] text-[#8b8e99] mt-0.5">
                  Direct connection links your team's live purse, signed squad, and real-time counter-bids.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {teams.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleQuickCaptain(t)}
                    disabled={loading}
                    className="p-3.5 rounded-xl bg-[#111215] border border-[#262833] hover:border-[#ffd000] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-between text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs text-[#0a0b0d] shadow flex-shrink-0"
                        style={{ backgroundColor: t.primary_color || t.color || '#ffd000' }}
                      >
                        {t.short_name || 'TM'}
                      </div>
                      <div>
                        <div className="text-xs font-black text-white uppercase group-hover:text-[#ffd000] transition">
                          {t.name}
                        </div>
                        <span className="text-[10px] text-[#8b8e99] font-mono">
                          Capt: {t.captain_name || 'Leader'}
                        </span>
                      </div>
                    </div>

                    <div className="px-2.5 py-1 rounded-md bg-[#18191f] border border-[#2a2d38] text-[10px] font-black text-[#ffd000] uppercase tracking-wider group-hover:bg-[#ffd000] group-hover:text-[#0a0b0d] transition">
                      Connect &rarr;
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-3 border-t border-[#262833] text-center text-xs text-[#8b8e99]">
                <span>Want to use manual password? </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('manual')}
                  className="text-[#ffd000] font-bold hover:underline cursor-pointer"
                >
                  Switch to Manual Login
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: AUCTIONEER & ADMIN COMMAND */}
          {activeTab === 'auctioneer' && (
            <div className="space-y-4">
              <div className="text-center pb-2 border-b border-[#262833]">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Auctioneer Master Command &amp; Operations Portals
                </h3>
                <p className="text-[11px] text-[#8b8e99] mt-0.5">
                  Full hammer control, lots nominations, bid increments, and live captain desk synchronization.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <button
                  onClick={handleQuickAuctioneer}
                  disabled={loading}
                  className="p-5 rounded-xl bg-gradient-to-br from-[#ffd000]/15 to-transparent border-2 border-[#ffd000] hover:scale-[1.02] active:scale-[0.98] transition-all text-left flex flex-col justify-between group cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-[#ffd000] text-[#0a0b0d] flex items-center justify-center font-black">
                      <Gavel className="w-5 h-5 fill-current" />
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#ffd000]/20 text-[#ffd000]">
                      DESK: /auction
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase group-hover:text-[#ffd000] transition">
                      AUCTIONEER MASTER DESK
                    </h4>
                    <p className="text-[11px] text-[#8b8e99] mt-0.5">
                      Nominate lots, accept live captain bids, control timer &amp; drop hammer.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#ffd000]/30 text-xs font-black text-[#ffd000] uppercase tracking-wider">
                    Sign In as HEAD &rarr;
                  </div>
                </button>

                <button
                  onClick={handleQuickAdmin}
                  disabled={loading}
                  className="p-5 rounded-xl bg-[#111215] border border-[#2a2d38] hover:border-white hover:scale-[1.02] active:scale-[0.98] transition-all text-left flex flex-col justify-between group cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-white/10 text-white flex items-center justify-center font-black">
                      <Shield className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-white">
                      DESK: /admin
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase group-hover:text-white transition">
                      SUPER ADMIN OPERATIONS
                    </h4>
                    <p className="text-[11px] text-[#8b8e99] mt-0.5">
                      Fix team purses, register players, generate awards &amp; manage squads.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#262833] text-xs font-black text-white uppercase tracking-wider">
                    Sign In as ADMIN &rarr;
                  </div>
                </button>
              </div>

              <div className="pt-3 border-t border-[#262833] text-center text-xs text-[#8b8e99]">
                <span>Credentials: </span>
                <code className="text-[#ffd000] font-mono">HEAD / 123@head</code>
                <span> • </span>
                <code className="text-[#ffd000] font-mono">ADMIN / 123@admin</code>
              </div>
            </div>
          )}

          {/* TAB 3: MANUAL USERNAME & PASSWORD */}
          {activeTab === 'manual' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#8b8e99] mb-1.5">
                  Username or Franchise Short Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5c5f6e]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. HEAD, ADMIN, STK, UTD, SFC, MLK..."
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#111215] border border-[#262833] text-white text-sm focus:outline-none focus:border-[#ffd000] transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#8b8e99] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5c5f6e]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password (e.g. 123@<short_name> or 123@head)"
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#111215] border border-[#262833] text-white text-sm focus:outline-none focus:border-[#ffd000] transition"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-lg bg-[#ffd000] hover:bg-[#facc15] text-[#0a0b0d] font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(255,208,0,0.35)] transition hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 mt-2 cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>{loading ? 'AUTHENTICATING...' : 'SIGN IN TO PORTAL'}</span>
              </button>
            </form>
          )}

          <div className="mt-5 pt-4 border-t border-[#262833] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <Link
              to="/spectator-login"
              className="text-[#8b8e99] hover:text-[#ffd000] transition inline-flex items-center gap-1 font-medium"
            >
              Spectator Access Portal &rarr;
            </Link>
            <span className="text-[#555866] text-[11px]">
              Passcode: 111 for public spectator
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

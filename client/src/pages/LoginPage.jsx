import React, { useState } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Lock, AlertCircle, ArrowRight, KeyRound, Sparkles, Eye } from 'lucide-react';

const PRESET_ACCOUNTS = [
  { label: 'Auctioneer', user: 'HEAD', pass: '123@head', role: 'Auctioneer Desk' },
  { label: 'Super Admin', user: 'ADMIN', pass: '123@admin', role: 'Full System Control' },
  { label: 'SAAG STRIKERS', user: 'STRIKERS', pass: '123@strikers', role: 'Team 1 Captain' },
  { label: 'SAAG UNITED', user: 'UNITED', pass: '123@united', role: 'Team 2 Captain' },
  { label: 'SAAG FC', user: 'SAAGFC', pass: '123@fc', role: 'Team 3 Captain' },
];

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  const handleSelectPreset = (preset) => {
    setUsername(preset.user);
    setPassword(preset.pass);
    setError(null);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-3 xs:p-4 sm:p-6 lg:p-8 bg-[#111215] min-h-[calc(100vh-64px)]">
      <div className="w-full max-w-md relative z-10 py-4">
        
        {/* Brand Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-[#ffd000] flex items-center justify-center shadow-[0_0_30px_rgba(255,208,0,0.35)] mb-3 sm:mb-4">
            <span className="text-2xl sm:text-3xl">⚽</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
            SAG <span className="text-[#ffd000]">PREMIERE LEAGUE</span>
          </h1>
          <p className="text-[10px] sm:text-xs text-[#8b8e99] font-bold uppercase tracking-widest mt-1">
            Authenticated Access Portal
          </p>
        </div>

        {/* Login Form Box */}
        <div className="rounded-2xl p-5 xs:p-6 sm:p-8 bg-[#18191f] border border-[#262833] shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/40 border border-rose-500/50 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#8b8e99] mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5c5f6e]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="HEAD, ADMIN, STRIKERS, etc."
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
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#111215] border border-[#262833] text-white text-sm focus:outline-none focus:border-[#ffd000] transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-lg bg-[#ffd000] hover:bg-[#facc15] text-[#0a0b0d] font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(255,208,0,0.35)] transition hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? 'AUTHENTICATING...' : 'SIGN IN TO PORTAL'}
            </button>
          </form>

          {/* Preset Fill Chips for Fast Mobile Login */}
          <div className="mt-6 pt-5 border-t border-[#262833]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b8e99] flex items-center gap-1.5">
                <KeyRound className="w-3 h-3 text-[#ffd000]" />
                <span>Tap Role to Quick-Fill:</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_ACCOUNTS.map((preset) => (
                <button
                  key={preset.user}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-2 rounded-lg text-left text-xs transition border flex flex-col justify-center ${
                    username.toUpperCase() === preset.user
                      ? 'bg-[#ffd000]/15 border-[#ffd000] text-[#ffd000]'
                      : 'bg-[#111215] border-[#262833] text-[#cfd3dc] hover:border-[#ffd000]/50'
                  }`}
                >
                  <span className="font-bold text-[11px] truncate">{preset.label}</span>
                  <span className="text-[9px] text-[#717583] font-mono truncate">{preset.user}</span>
                </button>
              ))}
              <Link
                to="/spectator-login"
                className="p-2 rounded-lg text-left text-xs bg-[#111215] border border-[#262833] text-[#cfd3dc] hover:border-[#ffd000]/50 transition flex flex-col justify-center"
              >
                <span className="font-bold text-[11px] flex items-center gap-1 text-[#ffd000]">
                  <Eye className="w-3 h-3" /> Spectator Access
                </span>
                <span className="text-[9px] text-[#717583] font-mono">Password: 111</span>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

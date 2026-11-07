import React, { useState } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, AlertCircle } from 'lucide-react';

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
                  placeholder="Enter your username"
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
                  placeholder="Enter your password"
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

          <div className="mt-5 pt-4 border-t border-[#262833] text-center">
            <Link
              to="/spectator-login"
              className="text-xs text-[#8b8e99] hover:text-[#ffd000] transition inline-flex items-center gap-1 font-medium"
            >
              Spectator Access Portal &rarr;
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

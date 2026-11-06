import React, { useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, Eye, Lock, User, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SpectatorLoginPage() {
  const [username, setUsername] = useState('player');
  const [password, setPassword] = useState('111');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const destination = location.state?.from?.pathname || '/spectator';

  if (user) {
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const trimmedPassword = password.trim();
    if (trimmedPassword !== '111') {
      setError('Password must be 111 for spectator access.');
      return;
    }

    const safeUsername = username.trim() || 'player';
    setLoading(true);

    try {
      const loggedUser = await login(safeUsername, trimmedPassword, safeUsername);
      if (loggedUser.role !== 'spectator') {
        throw new Error('Spectator access requires password 111.');
      }
      navigate(destination, { replace: true });
    } catch (loginError) {
      setError(loginError.message || 'Unable to sign in. Password must be 111.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0d0e12] text-white px-4 py-10 relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#ffd000]/10 rounded-full blur-3xl pointer-events-none" />

      <section className="w-full max-w-md border border-[#2a2c36] bg-[#14151b] p-7 sm:p-9 rounded-2xl shadow-2xl relative z-10">
        <div className="mb-6 flex items-center gap-3 pb-5 border-b border-[#22242e]">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ffd000] text-[#111215] shadow-lg shadow-[#ffd000]/20 font-black">
            <Eye className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd000]">SAG PREMIERE LEAGUE</p>
            <h1 className="text-xl font-black uppercase tracking-tight text-white">Spectator Access</h1>
          </div>
        </div>

        {/* Helpful default notice banner */}
        <div className="mb-5 p-3 rounded-xl bg-[#ffd000]/10 border border-[#ffd000]/30 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-[#ffd000] shrink-0 mt-0.5" />
          <div className="text-xs text-[#f1f2f6] leading-relaxed">
            <strong className="text-[#ffd000]">Quick Login:</strong> Default username is <code className="px-1.5 py-0.5 rounded bg-[#1c1d25] text-[#ffd000] font-mono text-[11px]">player</code> and password is <code className="px-1.5 py-0.5 rounded bg-[#1c1d25] text-[#ffd000] font-mono text-[11px]">111</code>. You can keep it default or type your own username!
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#9ca0b0]">
            Username (Chat Name)
            <span className="relative mt-2 block">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#ffd000]" />
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                placeholder="player"
                maxLength={32}
                className="w-full rounded-xl border border-[#2a2c36] bg-[#0d0e12] py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-[#ffd000] transition"
                required
              />
            </span>
          </label>

          <label className="block text-xs font-bold uppercase tracking-wider text-[#9ca0b0]">
            Password
            <span className="relative mt-2 block">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#ffd000]" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="111"
                className="w-full rounded-xl border border-[#2a2c36] bg-[#0d0e12] py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-[#ffd000] font-mono tracking-widest transition"
                required
              />
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ffd000] hover:bg-[#facc15] py-3.5 text-xs font-black uppercase tracking-widest text-[#111215] transition shadow-lg shadow-[#ffd000]/20 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60 cursor-pointer mt-2"
          >
            <Eye className="h-4 w-4" />
            {loading ? 'Entering Broadcast...' : 'Enter Spectator Broadcast'}
          </button>
        </form>
      </section>
    </main>
  );
}

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Cloud, Database, ExternalLink, X, CheckCircle, AlertTriangle, Flame } from 'lucide-react';
import { isSupabaseConfigured, activeSupabaseUrl, checkSupabaseHealth, saveCustomCredentials, clearCustomCredentials } from '../lib/supabase';
import { isFirebaseConfigured, firebaseConfig, saveFirebaseCredentials } from '../lib/firebase';

export default function ConnectionIndicator() {
  const [health, setHealth] = useState({
    configured: isSupabaseConfigured,
    reachable: false,
    tablesExist: false,
    message: 'Checking connection...',
  });
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('firebase'); // 'firebase' | 'supabase'
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');

  // Firebase fields
  const [fbApiKey, setFbApiKey] = useState(firebaseConfig?.apiKey || '');
  const [fbProjectId, setFbProjectId] = useState(firebaseConfig?.projectId || '');
  const [fbAppId, setFbAppId] = useState(firebaseConfig?.appId || '');

  useEffect(() => {
    checkSupabaseHealth().then(setHealth);
    const timer = setInterval(() => {
      checkSupabaseHealth().then(setHealth);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    if (activeTab === 'supabase') {
      if (!customUrl || !customKey) return;
      saveCustomCredentials(customUrl, customKey);
    } else {
      if (!fbApiKey || !fbProjectId) return;
      saveFirebaseCredentials({
        apiKey: fbApiKey.trim(),
        projectId: fbProjectId.trim(),
        appId: fbAppId.trim(),
        authDomain: `${fbProjectId.trim()}.firebaseapp.com`,
      });
      window.location.reload();
    }
  };

  const handleClearFirebase = () => {
    saveFirebaseCredentials(null);
    window.location.reload();
  };

  const isRealtimeActive = isFirebaseConfigured || (health.configured && health.tablesExist);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        type="button"
        title="Click to check Cloud Sync Status (Firebase & Supabase)"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold transition cursor-pointer border ${
          isRealtimeActive
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
            : isFirebaseConfigured || health.configured
            ? 'bg-amber-950/40 border-amber-500/40 text-amber-400'
            : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:text-white'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isRealtimeActive
              ? 'bg-emerald-400 animate-pulse'
              : isFirebaseConfigured || health.configured
              ? 'bg-amber-400 animate-pulse'
              : 'bg-slate-500'
          }`}
        />
        <Flame className="w-3 h-3 text-[#ffd000]" />
        <span>{isFirebaseConfigured ? 'Firebase Live' : isRealtimeActive ? 'Cloud Sync' : 'Connect Sync'}</span>
      </button>

      {/* Cloud Sync Diagnostic & Quick Connect Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18191f] rounded-2xl p-6 max-w-lg w-full border border-[#2a2d3a] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#262833]">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#ffd000]" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Real-Time Cloud Synchronization
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-lg bg-[#111215] text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Provider Tabs */}
            <div className="flex items-center gap-2 p-1 bg-[#111215] rounded-xl border border-[#262833]">
              <button
                type="button"
                onClick={() => setActiveTab('firebase')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'firebase'
                    ? 'bg-[#ffd000] text-[#0a0b0d]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                Firebase Real-Time
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('supabase')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'supabase'
                    ? 'bg-[#ffd000] text-[#0a0b0d]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                Supabase DB
              </button>
            </div>

            {/* FIREBASE TAB */}
            {activeTab === 'firebase' && (
              <div className="space-y-3">
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                    isFirebaseConfigured
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  {isFirebaseConfigured ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <div className="font-bold uppercase tracking-wider text-[11px]">
                      {isFirebaseConfigured
                        ? 'Firebase Firestore: Connected & Active'
                        : 'Firebase Firestore: Not Connected'}
                    </div>
                    <p className="text-[11px] opacity-90 leading-relaxed">
                      {isFirebaseConfigured
                        ? `Project: ${firebaseConfig?.projectId || 'Configured'} — Real-time auction push & spectator chat active.`
                        : 'Paste your Firebase Web App credentials below or set VITE_FIREBASE_API_KEY in Vercel.'}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSave} className="space-y-2.5 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Firebase API Key (apiKey)
                    </label>
                    <input
                      type="text"
                      placeholder="AIzaSy..."
                      value={fbApiKey}
                      onChange={(e) => setFbApiKey(e.target.value)}
                      className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-[#ffd000] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Firebase Project ID (projectId)
                    </label>
                    <input
                      type="text"
                      placeholder="sag-premier-league"
                      value={fbProjectId}
                      onChange={(e) => setFbProjectId(e.target.value)}
                      className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-[#ffd000] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Firebase App ID (appId - optional)
                    </label>
                    <input
                      type="text"
                      placeholder="1:123456789:web:abcdef"
                      value={fbAppId}
                      onChange={(e) => setFbAppId(e.target.value)}
                      className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-[#ffd000] outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleClearFirebase}
                      className="text-[11px] text-rose-400 hover:underline"
                    >
                      Clear Firebase
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#ffd000] hover:bg-[#facc15] text-[#0a0b0d] font-black text-xs uppercase tracking-wider transition"
                    >
                      Connect Firebase
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SUPABASE TAB */}
            {activeTab === 'supabase' && (
              <div className="space-y-3">
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                    isCloudActive
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                      : health.configured
                      ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  {isCloudActive ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <div className="font-bold uppercase tracking-wider text-[11px]">
                      {isCloudActive
                        ? 'Supabase DB: Active'
                        : health.configured
                        ? 'Database Reached - Run SQL Schema'
                        : 'Supabase Not Connected'}
                    </div>
                    <p className="text-[11px] opacity-90 leading-relaxed">{health.message}</p>
                    {activeSupabaseUrl && (
                      <p className="text-[10px] font-mono opacity-70 truncate max-w-sm">
                        URL: {activeSupabaseUrl}
                      </p>
                    )}
                  </div>
                </div>

                <form onSubmit={handleSave} className="space-y-2.5 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Supabase Project URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://xxxx.supabase.co"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-[#ffd000] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Supabase Anon Public Key
                    </label>
                    <input
                      type="password"
                      placeholder="eyJhbGciOi..."
                      value={customKey}
                      onChange={(e) => setCustomKey(e.target.value)}
                      className="w-full bg-[#111215] border border-[#262833] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-[#ffd000] outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={clearCustomCredentials}
                      className="text-[11px] text-rose-400 hover:underline"
                    >
                      Reset Defaults
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#ffd000] hover:bg-[#facc15] text-[#0a0b0d] font-black text-xs uppercase tracking-wider transition"
                    >
                      Connect Supabase
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

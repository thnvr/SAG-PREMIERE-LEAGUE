import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share, PlusSquare, Check } from 'lucide-react';

export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 1. Check if already installed & running as standalone app
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsStandalone(isRunningStandalone);

    // 2. Check iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    // 3. Listen for Android/Chrome install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // 4. Custom trigger listener (from menu or buttons)
    const handleTrigger = () => {
      setDismissed(false);
      handleInstallClick();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('trigger-app-install', handleTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('trigger-app-install', handleTrigger);
    };
  }, []);

  // Do not show if already running inside installed standalone app or user dismissed
  if (isStandalone || dismissed) {
    return null;
  }

  // Trigger Native Android / Desktop Chrome PWA Install
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
        setDismissed(true);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // General instructions fallback
      alert("To install this app on your phone:\n1. Open browser menu (3 dots or share icon)\n2. Tap 'Install app' or 'Add to Home screen'");
    }
  };

  return (
    <>
      {/* Floating Bottom App Installation Bar */}
      <aside aria-label="App installation" className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 animate-in fade-in slide-in-from-bottom duration-300">
        <div className="bg-[#18191f]/95 backdrop-blur-md border border-[#ffd000]/40 rounded-2xl p-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.6)] flex items-center justify-between gap-3">
          
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ffd000] to-[#cca600] flex items-center justify-center text-black font-black flex-shrink-0 shadow-md">
              <Smartphone className="w-5 h-5 text-black" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-white uppercase tracking-tight truncate flex items-center gap-1.5">
                <span>SAG AUCTION APP</span>
                <span className="px-1.5 py-0.2 rounded bg-[#ffd000]/20 text-[#ffd000] text-[9px] font-mono">PWA</span>
              </div>
              <p className="text-[10px] text-slate-300 truncate">
                Install on phone for full-screen auction
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              type="button"
              className="px-3 py-1.5 rounded-lg bg-[#ffd000] hover:bg-[#facc15] text-[#0a0b0d] font-black text-xs uppercase tracking-wider transition flex items-center gap-1 shadow hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={() => setDismissed(true)}
              type="button"
              aria-label="Dismiss install banner"
              className="w-7 h-7 rounded-lg bg-[#111215] text-slate-400 hover:text-white flex items-center justify-center transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </aside>

      {/* iOS iPhone / iPad Step-by-Step Installation Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#18191f] border border-[#2a2d3a] rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between pb-2 border-b border-[#262833]">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#ffd000]" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Install on iPhone / iPad
                </h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="w-7 h-7 rounded-lg bg-[#111215] text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-200">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#111215] border border-[#262833]">
                <div className="w-7 h-7 rounded-lg bg-[#ffd000]/10 border border-[#ffd000]/30 text-[#ffd000] flex items-center justify-center font-black shrink-0">
                  1
                </div>
                <div>
                  <p className="font-bold text-white">Tap the Share button</p>
                  <p className="text-[11px] text-slate-400">At the bottom of Safari, tap the Share icon (<Share className="w-3 h-3 inline text-[#ffd000]" />)</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#111215] border border-[#262833]">
                <div className="w-7 h-7 rounded-lg bg-[#ffd000]/10 border border-[#ffd000]/30 text-[#ffd000] flex items-center justify-center font-black shrink-0">
                  2
                </div>
                <div>
                  <p className="font-bold text-white">Select 'Add to Home Screen'</p>
                  <p className="text-[11px] text-slate-400">Scroll down the menu and choose <span className="text-[#ffd000] font-bold">Add to Home Screen</span> (<PlusSquare className="w-3 h-3 inline text-[#ffd000]" />)</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#111215] border border-[#262833]">
                <div className="w-7 h-7 rounded-lg bg-[#ffd000]/10 border border-[#ffd000]/30 text-[#ffd000] flex items-center justify-center font-black shrink-0">
                  3
                </div>
                <div>
                  <p className="font-bold text-white">Tap 'Add' in top right</p>
                  <p className="text-[11px] text-slate-400">The SAG Auction App icon will be added to your phone's home screen!</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#ffd000] text-black font-black text-xs uppercase tracking-wider transition hover:bg-[#facc15]"
            >
              Got It!
            </button>
          </div>
        </div>
      )}
    </>
  );
}

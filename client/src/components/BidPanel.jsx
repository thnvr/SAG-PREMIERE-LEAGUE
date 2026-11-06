import React, { useState } from 'react';
import { formatMoney } from '../services/api';
import { AlertCircle, Zap, Shield, Check, TrendingUp } from 'lucide-react';

export default function BidPanel({
  currentPlayer,
  currentHighestBid = 0,
  leadingTeam = null,
  myTeam = null,
  activeIncrement = 5000, // paise: 5000 = ₹50, 10000 = ₹100
  biddingStatus = 'open',
  onPlaceBid,
  disabled = false,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [lastBidAmt, setLastBidAmt] = useState(null);

  if (!currentPlayer) {
    return (
      <div className="w-full max-w-[420px] mx-auto rounded-2xl p-6 bg-[#18191f] border border-[#262833] text-center">
        <Zap className="w-8 h-8 text-[#ffd000]/40 mx-auto mb-3" />
        <p className="text-[#8b8e99] font-medium text-xs">
          Waiting for auctioneer to nominate the next player lot…
        </p>
      </div>
    );
  }

  // Base opening price if no bids yet, else next increment
  const basePrice = currentPlayer.base_price || 0;
  const step = activeIncrement || 5000;

  // Strict next single bid: if no bids yet, base_price; if bids exist, strictly currentHighestBid + step
  const nextBid = currentHighestBid === 0 ? basePrice : currentHighestBid + step;
  // Next next bid (for display context only)
  const nextNextBid = nextBid + step;

  const isLeadingBidder = myTeam && leadingTeam && myTeam.id === leadingTeam.id;
  const availablePurse = myTeam
    ? (myTeam.availableBiddingPurse ?? myTeam.remainingPurse ?? 0)
    : 0;
  const canAffordNext = availablePurse >= nextBid;

  const handleBid = async (amount) => {
    if (disabled || isLeadingBidder || submitting) return;
    if (amount <= currentHighestBid && currentHighestBid > 0) {
      setError(`Your bid must exceed current highest bid of ${formatMoney(currentHighestBid)}`);
      return;
    }
    if (amount > availablePurse) {
      setError(`Bid of ${formatMoney(amount)} exceeds your purse (${formatMoney(availablePurse)})`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onPlaceBid(myTeam.id, amount);
      setLastBidAmt(amount);
    } catch (err) {
      setError(err.message || 'Bid submission failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto rounded-2xl overflow-hidden border-2 border-[#ffd000]/50 shadow-[0_0_30px_rgba(255,208,0,0.15)]">
      
      {/* Header strip */}
      <div className="bg-[#ffd000] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#0a0b0d]" />
          <span className="font-black text-[#0a0b0d] text-sm uppercase tracking-wider">
            {myTeam?.name || 'Your Team'}
          </span>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[#0a0b0d]/70 font-bold uppercase">Available Purse</div>
          <div className="font-black text-[#0a0b0d] font-mono text-base leading-none">
            {formatMoney(availablePurse)}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="bg-[#18191f] px-4 py-4 space-y-3">

        {/* Auctioneer rule chip */}
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-[#6b6e7a] uppercase font-bold">Bidding Step</span>
          <span className="text-[#ffd000] font-black bg-[#ffd000]/10 px-2 py-0.5 rounded border border-[#ffd000]/30">
            +{formatMoney(step)} per raise
          </span>
        </div>

        {/* Current highest bid display */}
        <div className="p-3 rounded-xl bg-[#111215] border border-[#262833] flex items-center justify-between">
          <div>
            <div className="text-[9px] uppercase font-bold text-[#6b6e7a] mb-0.5">Current Highest Bid</div>
            <div className="text-xl font-black font-mono text-[#ffd000]">
              {currentHighestBid > 0 ? formatMoney(currentHighestBid) : 'No bids yet'}
            </div>
          </div>
          {leadingTeam && currentHighestBid > 0 && (
            <div
              className="px-2 py-1 rounded-lg text-[10px] font-black uppercase"
              style={{ backgroundColor: (leadingTeam.primary_color || '#ffd000') + '22', color: leadingTeam.primary_color || '#ffd000' }}
            >
              {leadingTeam.short_name || leadingTeam.name}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Bid buttons or status */}
        {isLeadingBidder ? (
          <div className="py-4 text-center rounded-xl bg-[#ffd000]/15 border-2 border-[#ffd000]/60 text-[#ffd000] font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2">
            <Check className="w-5 h-5" />
            You hold the highest bid!
          </div>
        ) : biddingStatus !== 'open' ? (
          <div className="py-4 text-center rounded-xl bg-[#111215] text-[#8b8e99] font-bold text-xs uppercase tracking-wider border border-[#262833]">
            Bidding is {biddingStatus}
          </div>
        ) : !canAffordNext ? (
          <div className="py-4 text-center rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-400 font-bold text-xs">
            Insufficient purse for next bid ({formatMoney(nextBid)})
          </div>
        ) : (
          <div className="space-y-2">
            {/* Direct Step Bid Button — Strictly current + step, no confusion or duplicate */}
            <button
              onClick={() => handleBid(nextBid)}
              disabled={submitting || disabled}
              className="w-full py-4 rounded-xl bg-[#ffd000] hover:bg-[#facc15] active:scale-[0.98] text-[#0a0b0d] font-black text-base sm:text-lg uppercase tracking-wider shadow-[0_0_20px_rgba(255,208,0,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Zap className="w-5 h-5 fill-current flex-shrink-0" />
              <span>
                {currentHighestBid === 0
                  ? `Place Opening Bid — ${formatMoney(nextBid)}`
                  : `Bid ${formatMoney(nextBid)} (+${formatMoney(step)})`}
              </span>
            </button>

            {/* Clear Next Follow-up Alert (shows what other team will have to pay) */}
            <div className="p-2.5 rounded-lg bg-[#111215] border border-[#262833] flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#8b8e99]">Next Counter-Bid will be:</span>
              <span className="text-white font-bold">{formatMoney(nextNextBid)}</span>
            </div>

            <p className="text-[10px] text-center text-[#6b6e7a] font-mono pt-1">
              Bidding is instant. When you press, the other team's option increases to the next step.
            </p>
          </div>
        )}

        {/* Last successful bid confirmation */}
        {lastBidAmt && (
          <div className="text-center text-[10px] text-[#ffd000]/70 font-mono pt-1">
            ✓ Last bid placed: {formatMoney(lastBidAmt)}
          </div>
        )}
      </div>
    </div>
  );
}

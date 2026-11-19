import {useState} from 'react';
import {ArrowRight, Award, Check, Ticket} from 'lucide-react';
import {redeemRewardTier} from '../lib/campusApi';
import type {LoyaltyState, RedeemedVoucher} from '../types';

interface RewardsSectionProps {
  loyalty: LoyaltyState | null;
  pendingOrdersCount: number;
  onLoyaltyUpdated: (next: LoyaltyState) => void;
  onApplyVoucherToBag: (code: string) => void;
  onOpenBookings: () => void;
}

export function RewardsSection({
  loyalty,
  pendingOrdersCount,
  onLoyaltyUpdated,
  onApplyVoucherToBag,
  onOpenBookings,
}: RewardsSectionProps) {
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [justRedeemed, setJustRedeemed] = useState<RedeemedVoucher | null>(null);

  if (!loyalty) {
    return (
      <section id="rewards" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
        <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse space-y-4">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-4 w-80 bg-slate-100 dark:bg-slate-800/70 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="h-24 bg-slate-100 dark:bg-slate-800/70 rounded-xl" />
            <div className="h-24 bg-slate-100 dark:bg-slate-800/70 rounded-xl" />
            <div className="h-24 bg-slate-100 dark:bg-slate-800/70 rounded-xl" />
          </div>
        </div>
      </section>
    );
  }

  const nextTier =
    loyalty.tiers.find((t) => loyalty.availablePoints < t.pointsRequired) ||
    loyalty.tiers[loyalty.tiers.length - 1];
  const progressPct = nextTier
    ? Math.min(100, Math.round((loyalty.availablePoints / nextTier.pointsRequired) * 100))
    : 100;
  const ptsRemaining = nextTier
    ? Math.max(0, nextTier.pointsRequired - loyalty.availablePoints)
    : 0;

  const activeVouchers = loyalty.vouchers.filter((v) => !v.usedInBookingId);

  async function handleRedeem(tierId: string) {
    setRedeemError(null);
    setJustRedeemed(null);
    setRedeemingId(tierId);

    try {
      const data = await redeemRewardTier(tierId);
      onLoyaltyUpdated(data.loyalty);
      setJustRedeemed(data.voucher);
    } catch (err) {
      setRedeemError(err instanceof Error ? err.message : 'Could not redeem reward.');
    } finally {
      setRedeemingId(null);
    }
  }

  return (
    <section id="rewards" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-8 transition-colors duration-150">
        {/* Header Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#14532D] dark:text-emerald-400">
              CampusEase Loyalty Program · 1 pt per ₹10 spent
            </p>
            <h2 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Rewards &amp; Points Progress
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
              Points are awarded automatically whenever a booking is marked completed. Redeem your
              balance for instant discount vouchers across all campus services.
            </p>
          </div>

          {pendingOrdersCount > 0 && (
            <button
              type="button"
              onClick={onOpenBookings}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#14532D] dark:text-emerald-300 bg-[#14532D]/10 dark:bg-emerald-500/15 hover:bg-[#14532D]/15 dark:hover:bg-emerald-500/25 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>
                {pendingOrdersCount} active{' '}
                {pendingOrdersCount === 1 ? 'order' : 'orders'} pending points
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Top 3-Column Progress Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 border border-slate-200 dark:border-slate-800 bg-[#F6F7F6] dark:bg-slate-950/60 rounded-xl divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Available Balance</p>
            <p className="mt-1 font-display text-3xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {loyalty.availablePoints}{' '}
              <span className="text-base font-sans font-medium text-slate-500 dark:text-slate-400">pts</span>
            </p>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Lifetime Earned</p>
            <p className="mt-1 font-display text-3xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {loyalty.lifetimePoints}{' '}
              <span className="text-base font-sans font-medium text-slate-500 dark:text-slate-400">pts</span>
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Across {loyalty.completedOrdersCount} completed{' '}
              {loyalty.completedOrdersCount === 1 ? 'order' : 'orders'}
            </p>
          </div>

          <div className="p-5 flex flex-col justify-center">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-600 dark:text-slate-300">
                {ptsRemaining === 0
                  ? 'Top reward tier unlocked'
                  : `Next reward: ₹${nextTier?.discountInr} Voucher`}
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {loyalty.availablePoints} / {nextTier?.pointsRequired} pts
              </span>
            </div>
            <div
              className="mt-2.5 w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progress toward next loyalty reward"
            >
              <div
                className="h-full bg-[#14532D] dark:bg-emerald-500 rounded-full transition-all duration-300"
                style={{width: `${progressPct}%`}}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {ptsRemaining === 0
                ? 'Ready to redeem any available voucher below.'
                : `${ptsRemaining} more ${ptsRemaining === 1 ? 'pt' : 'pts'} needed (approx. ₹${ptsRemaining * 10} in completed bookings)`}
            </p>
          </div>
        </div>

        {redeemError && (
          <p className="text-xs font-medium text-red-600 dark:text-red-400" role="alert">
            {redeemError}
          </p>
        )}

        {justRedeemed && (
          <div className="p-4 rounded-xl bg-[#F6F7F6] dark:bg-slate-800/70 border border-[#14532D]/30 dark:border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm text-slate-900 dark:text-slate-100">
              <Check className="w-4 h-4 text-[#14532D] dark:text-emerald-400 shrink-0" />
              <span>
                Unlocked <span className="font-semibold">{justRedeemed.title}</span> — code{' '}
                <span className="font-mono font-semibold text-[#14532D] dark:text-emerald-400">{justRedeemed.code}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => onApplyVoucherToBag(justRedeemed.code)}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#14532D] hover:bg-[#166534] dark:bg-emerald-700 dark:hover:bg-emerald-600 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Apply to Booking Bag
            </button>
          </div>
        )}

        {/* Bottom 2-Column Layout: Reward Tiers & Ledger */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Redeemable Campus Vouchers</h3>
            <div className="space-y-3">
              {loyalty.tiers.map((tier) => {
                const canRedeem = loyalty.availablePoints >= tier.pointsRequired;
                const tierPct = Math.min(
                  100,
                  Math.round((loyalty.availablePoints / tier.pointsRequired) * 100),
                );
                const missing = Math.max(0, tier.pointsRequired - loyalty.availablePoints);

                return (
                  <div
                    key={tier.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F6F7F6] dark:bg-slate-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                        <Award className="w-3.5 h-3.5 text-[#14532D] dark:text-emerald-400" />
                        <span>{tier.pointsRequired} points required</span>
                        <span aria-hidden="true">·</span>
                        <span>Saves ₹{tier.discountInr}</span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{tier.title}</p>
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{tier.description}</p>
                      {!canRedeem && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <div className="flex-1 max-w-[180px] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#14532D] dark:bg-emerald-500 rounded-full"
                              style={{width: `${tierPct}%`}}
                            />
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            {missing} pts to go
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={!canRedeem || redeemingId === tier.id}
                      onClick={() => handleRedeem(tier.id)}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                        canRedeem
                          ? 'bg-[#14532D] hover:bg-[#166534] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white cursor-pointer'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {redeemingId === tier.id
                        ? 'Redeeming...'
                        : canRedeem
                          ? `Redeem ${tier.pointsRequired} pts`
                          : `Locked (${loyalty.availablePoints}/${tier.pointsRequired})`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Active Vouchers ({activeVouchers.length})
              </h3>
              {activeVouchers.length === 0 ? (
                <p className="mt-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F6F7F6] dark:bg-slate-800/70 text-xs text-slate-500 dark:text-slate-400">
                  No active reward vouchers yet. Complete orders to earn points and unlock vouchers
                  here.
                </p>
              ) : (
                <div className="mt-2.5 space-y-2.5">
                  {activeVouchers.map((voucher) => (
                    <div
                      key={voucher.code}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F6F7F6] dark:bg-slate-800/70 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-[#14532D] dark:text-emerald-400">
                          <Ticket className="w-3.5 h-3.5 shrink-0" />
                          <span>{voucher.code}</span>
                        </div>
                        <p className="mt-0.5 text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                          {voucher.title}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onApplyVoucherToBag(voucher.code)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-[#14532D] hover:bg-[#166534] dark:bg-emerald-700 dark:hover:bg-emerald-600 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Use ₹{voucher.discountInr} Off
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent Points Activity</h3>
              {loyalty.ledger.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  No completed bookings logged yet.
                </p>
              ) : (
                <ul className="mt-2.5 divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl bg-[#F6F7F6] dark:bg-slate-800/70">
                  {loyalty.ledger.slice(0, 5).map((entry) => (
                    <li
                      key={entry.id}
                      className="px-4 py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="text-slate-700 dark:text-slate-300 truncate">{entry.label}</span>
                      <span
                        className={`font-semibold tabular-nums whitespace-nowrap shrink-0 ${
                          entry.pointsDelta >= 0 ? 'text-[#14532D] dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {entry.pointsDelta >= 0 ? `+${entry.pointsDelta}` : entry.pointsDelta} pts
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

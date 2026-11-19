import {useEffect, useState, type FormEvent} from 'react';
import {CheckCircle2, Minus, Plus, Trash2, X} from 'lucide-react';
import type {BookingRecord, CartItem, LoyaltyState, RedeemedVoucher} from '../types';
import type {StudentProfile} from './AuthModal';

interface BookingBagDrawerProps {
  open: boolean;
  items: CartItem[];
  activeVouchers?: RedeemedVoucher[];
  prefilledPromoCode?: string | null;
  studentProfile?: StudentProfile | null;
  onClose: () => void;
  onUpdateQty: (serviceId: string, packageId: string, timeSlot: string, delta: number) => void;
  onRemoveItem: (serviceId: string, packageId: string, timeSlot: string) => void;
  onBookingSuccess: (booking: BookingRecord, loyalty?: LoyaltyState) => void;
  onOpenMyBookings: () => void;
  onOpenAuth?: (mode: 'login' | 'signup') => void;
}

const HOSTEL_PRESETS = [
  'DBS Boys Hostel · Block A',
  'DBS Boys Hostel · Block B',
  'DBS Girls Hostel · Main Gate',
  'Selaqui Student PG',
];

export function BookingBagDrawer({
  open,
  items,
  activeVouchers = [],
  prefilledPromoCode,
  studentProfile,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onBookingSuccess,
  onOpenMyBookings,
  onOpenAuth,
}: BookingBagDrawerProps) {
  const [studentName, setStudentName] = useState('');
  const [hostelAddress, setHostelAddress] = useState('DBS Boys Hostel · Block B');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Hostel Gate COD'>('UPI');
  const [promoCode, setPromoCode] = useState('FIRSTDEAL');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRecord | null>(null);

  useEffect(() => {
    if (prefilledPromoCode) {
      setPromoCode(prefilledPromoCode);
    }
  }, [prefilledPromoCode]);

  useEffect(() => {
    if (studentProfile) {
      setStudentName((cur) => cur || studentProfile.displayName);
      setHostelAddress((cur) =>
        cur === 'DBS Boys Hostel · Block B' && studentProfile.hostelAddress
          ? studentProfile.hostelAddress
          : cur,
      );
      setPhone((cur) => cur || studentProfile.phone);
    }
  }, [studentProfile]);

  if (!open) return null;

  const subtotal = items.reduce((sum, item) => sum + item.unitPriceInr * item.quantity, 0);
  const normalizedCode = promoCode.trim().toUpperCase();
  const matchedVoucher = activeVouchers.find(
    (v) => v.code.toUpperCase() === normalizedCode && !v.usedInBookingId,
  );
  const firstDealApplied = !matchedVoucher && normalizedCode === 'FIRSTDEAL' && subtotal >= 100;
  const discount = matchedVoucher
    ? Math.min(subtotal, matchedVoucher.discountInr)
    : firstDealApplied
      ? 30
      : 0;
  const total = Math.max(0, subtotal - discount);
  const projectedPoints = Math.max(1, Math.round(total / 10));

  async function handleCheckout(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          studentName,
          hostelAddress,
          phone,
          paymentMethod,
          promoCode,
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not confirm booking.');
      } else {
        setConfirmedBooking(data.booking);
        onBookingSuccess(data.booking, data.loyalty);
      }
    } catch {
      setError('Network error while confirming booking.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setConfirmedBooking(null);
    setError(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 dark:bg-slate-950/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bag-drawer-title"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 h-full border-l border-slate-200 dark:border-slate-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 id="bag-drawer-title" className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            {confirmedBooking ? 'Booking Confirmed' : 'Booking Bag'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close booking bag"
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {confirmedBooking ? (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-[#F6F7F6] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-[#14532D] dark:text-emerald-400 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>
                    Booking <span className="font-mono">{confirmedBooking.id}</span> Confirmed
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
                  {confirmedBooking.estimatedFulfillment} · {confirmedBooking.hostelAddress}
                </p>
              </div>

              <div className="space-y-2.5 text-sm">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">Receipt Summary</h3>
                {confirmedBooking.items.map((item) => (
                  <div
                    key={`${item.serviceId}-${item.packageId}-${item.timeSlot}`}
                    className="flex items-start justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800"
                  >
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{item.serviceName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.packageName} × {item.quantity} · {item.timeSlot}
                      </p>
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                      ₹{item.unitPriceInr * item.quantity}
                    </span>
                  </div>
                ))}

                <div className="pt-2 space-y-1.5 text-sm tabular-nums">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Subtotal</span>
                    <span>₹{confirmedBooking.subtotalInr}</span>
                  </div>
                  {confirmedBooking.discountInr > 0 && (
                    <div className="flex justify-between text-[#14532D] dark:text-emerald-400 font-medium">
                      <span>Student Deal ({confirmedBooking.promoCode})</span>
                      <span>−₹{confirmedBooking.discountInr}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Platform Fee</span>
                    <span>₹{confirmedBooking.convenienceFeeInr}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 dark:text-slate-100 text-base pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span>Total ({confirmedBooking.paymentMethod})</span>
                    <span>₹{confirmedBooking.totalInr}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onOpenMyBookings();
                  }}
                  className="w-full py-2.5 px-4 bg-[#14532D] hover:bg-[#166534] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Track in My Bookings
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-2.5 px-4 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Continue Browsing Services
                </button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Your booking bag is empty</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Add verified food, laundry, printing, transport, or stationery packages to book in
                one checkout.
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="mt-2 px-4 py-2 text-sm font-semibold text-white bg-[#14532D] hover:bg-[#166534] dark:bg-emerald-700 dark:hover:bg-emerald-600 rounded-lg transition-colors cursor-pointer"
              >
                Explore Services
              </button>
            </div>
          ) : (
            <form id="checkout-form" onSubmit={handleCheckout} className="space-y-6">
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={`${item.serviceId}-${item.packageId}-${item.timeSlot}`}
                    className="p-3.5 rounded-xl bg-[#F6F7F6] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {item.category} · {item.timeSlot}
                        </p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {item.serviceName}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{item.packageName}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onRemoveItem(item.serviceId, item.packageId, item.timeSlot)
                        }
                        aria-label={`Remove ${item.packageName}`}
                        className="p-1 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="inline-flex items-center border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
                        <button
                          type="button"
                          aria-label="Decrease item quantity"
                          onClick={() =>
                            onUpdateQty(item.serviceId, item.packageId, item.timeSlot, -1)
                          }
                          className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase item quantity"
                          onClick={() =>
                            onUpdateQty(item.serviceId, item.packageId, item.timeSlot, 1)
                          }
                          className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        ₹{item.unitPriceInr * item.quantity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label htmlFor="promo-input" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Student Deal or Reward Voucher
                  </label>
                  <button
                    type="button"
                    onClick={() => setPromoCode('FIRSTDEAL')}
                    className="text-xs font-medium text-[#14532D] dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Use FIRSTDEAL (₹30 off ₹100+)
                  </button>
                </div>
                <input
                  id="promo-input"
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter code (e.g. FIRSTDEAL)"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
                />
                {activeVouchers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {activeVouchers.map((v) => (
                      <button
                        key={v.code}
                        type="button"
                        onClick={() => setPromoCode(v.code)}
                        className="px-2.5 py-1 text-xs font-mono font-medium rounded border border-[#14532D]/30 dark:border-emerald-500/40 bg-[#14532D]/5 dark:bg-emerald-500/10 hover:bg-[#14532D]/10 dark:hover:bg-emerald-500/20 text-[#14532D] dark:text-emerald-300 cursor-pointer"
                      >
                        Apply {v.code} (−₹{v.discountInr})
                      </button>
                    ))}
                  </div>
                )}
                {!matchedVoucher && promoCode.trim().toUpperCase() === 'FIRSTDEAL' && subtotal < 100 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    Add ₹{100 - subtotal} more to unlock ₹30 off with FIRSTDEAL.
                  </p>
                )}
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Student &amp; Hostel Details
                  </h3>
                  {!studentProfile && onOpenAuth && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAuth('login');
                      }}
                      className="text-xs font-medium text-[#14532D] dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Log in to auto-fill
                    </button>
                  )}
                </div>

                <div>
                  <label htmlFor="student-name" className="block text-xs text-slate-600 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    id="student-name"
                    type="text"
                    required
                    placeholder="e.g. Aarav Rawat"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="hostel-address" className="block text-xs text-slate-600 dark:text-slate-300 mb-1">
                    Hostel / PG / Gate Location
                  </label>
                  <input
                    id="hostel-address"
                    type="text"
                    required
                    value={hostelAddress}
                    onChange={(e) => setHostelAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {HOSTEL_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setHostelAddress(preset)}
                        className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-[#F6F7F6] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="student-phone" className="block text-xs text-slate-600 dark:text-slate-300 mb-1">
                    Mobile Number (for gate pickup alert)
                  </label>
                  <input
                    id="student-phone"
                    type="tel"
                    required
                    placeholder="10-digit number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <span className="block text-xs text-slate-600 dark:text-slate-300 mb-1.5">Payment Method</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(['UPI', 'Hostel Gate COD'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMethod(mode)}
                        className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                          paymentMethod === mode
                            ? 'border-[#14532D] dark:border-emerald-500 bg-[#14532D]/10 dark:bg-emerald-500/15 text-[#14532D] dark:text-emerald-300'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 font-medium" role="alert">
                  {error}
                </p>
              )}
            </form>
          )}
        </div>

        {!confirmedBooking && items.length > 0 && (
          <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-[#F6F7F6] dark:bg-slate-950/60 space-y-3">
            <div className="space-y-1 text-sm tabular-nums">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#14532D] dark:text-emerald-400 font-medium">
                  <span>{matchedVoucher ? `Reward (${matchedVoucher.code})` : 'First Student Deal'}</span>
                  <span>−₹{discount}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>CampusEase Fee</span>
                <span>₹0</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 dark:text-slate-100 pt-1.5 border-t border-slate-200 dark:border-slate-800">
                <span>Total Payable</span>
                <span>₹{total}</span>
              </div>
              <p className="text-xs text-[#14532D] dark:text-emerald-400 font-medium pt-0.5 tabular-nums">
                Earns +{projectedPoints} Campus Points upon order completion
              </p>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={submitting}
              className="w-full py-3 px-4 bg-[#14532D] hover:bg-[#166534] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Confirming Booking...' : `Confirm Booking — ₹${total}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

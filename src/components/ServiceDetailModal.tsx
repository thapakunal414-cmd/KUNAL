import {useEffect, useState, type FormEvent} from 'react';
import {CheckCircle2, Clock, MapPin, Minus, Plus, Star, X} from 'lucide-react';
import type {ServicePackage, ServiceProvider} from '../types';
import {ServiceImage} from './ServiceImage';

interface ServiceDetailModalProps {
  service: ServiceProvider | null;
  onClose: () => void;
  onAddToBag: (
    service: ServiceProvider,
    pkg: ServicePackage,
    quantity: number,
    timeSlot: string,
  ) => void;
  onReviewSubmitted: (updatedService: ServiceProvider) => void;
}

const TIME_SLOTS = [
  'Morning 8–10 AM',
  'Afternoon 1–3 PM',
  'Evening 6–8 PM',
  'Urgent Express',
];

export function ServiceDetailModal({
  service,
  onClose,
  onAddToBag,
  onReviewSubmitted,
}: ServiceDetailModalProps) {
  const [selectedPkgId, setSelectedPkgId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [timeSlot, setTimeSlot] = useState<string>(TIME_SLOTS[0]);
  const [reviewName, setReviewName] = useState('');
  const [reviewHostel, setReviewHostel] = useState('DBS Boys Hostel');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    if (service) {
      setSelectedPkgId(service.packages[0]?.id || '');
      setQuantity(1);
      setTimeSlot(TIME_SLOTS[0]);
      setReviewError(null);
      setReviewSuccess(false);
    }
  }, [service]);

  if (!service) return null;

  const selectedPkg =
    service.packages.find((p) => p.id === selectedPkgId) || service.packages[0];
  const lineTotal = selectedPkg ? selectedPkg.priceInr * quantity : service.basePriceInr;

  async function handleReviewSubmit(e: FormEvent) {
    e.preventDefault();
    if (!service) return;
    setReviewError(null);
    setReviewSuccess(false);
    setSubmittingReview(true);

    try {
      const res = await fetch(`/api/services/${service.id}/reviews`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          studentName: reviewName,
          hostelOrArea: reviewHostel,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReviewError(data.error || 'Could not submit review.');
      } else {
        onReviewSubmitted(data.service);
        setReviewName('');
        setReviewComment('');
        setReviewRating(5);
        setReviewSuccess(true);
      }
    } catch {
      setReviewError('Network error while posting review.');
    } finally {
      setSubmittingReview(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-slate-950/75 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-detail-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>{service.category}</span>
            <span aria-hidden="true">·</span>
            <span>{service.area}</span>
            <span aria-hidden="true">·</span>
            <span>Verified since {service.verifiedSince}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close service details"
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
              <ServiceImage
                src={service.imageUrl}
                alt={service.name}
                category={service.category}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3.5 rounded-lg bg-[#F6F7F6] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span>Distance</span>
                </div>
                <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">{service.distanceLabel}</p>
              </div>
              <div className="p-3.5 rounded-lg bg-[#F6F7F6] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span>Hours &amp; Turnaround</span>
                </div>
                <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                  {service.turnaroundLabel} · {service.operatingHours}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                CampusEase Verification Standards
              </h4>
              <ul className="mt-2.5 space-y-2">
                {service.verificationChecklist.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-[#14532D] dark:text-emerald-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Verified Student Reviews ({service.reviewCount})
                </h4>
                <div className="flex items-center gap-1 text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  <Star className="w-4 h-4 text-amber-600 dark:text-amber-400 fill-amber-500 dark:fill-amber-400" />
                  <span>{service.rating.toFixed(1)}</span>
                </div>
              </div>

              <div className="mt-3 space-y-3">
                {service.reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3.5 rounded-lg bg-[#F6F7F6] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {rev.studentName} ·{' '}
                        <span className="font-normal text-slate-500 dark:text-slate-400">{rev.hostelOrArea}</span>
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                        ★ {rev.rating.toFixed(1)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-300">{rev.comment}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleReviewSubmit} className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Add a peer review
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    required
                    placeholder="Your name"
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="Hostel / Area"
                    value={reviewHostel}
                    onChange={(e) => setReviewHostel(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
                  />
                  <select
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                    aria-label="Rating out of 5"
                    className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
                  >
                    <option value={5}>5 Stars — Excellent</option>
                    <option value={4}>4 Stars — Reliable</option>
                    <option value={3}>3 Stars — Decent</option>
                    <option value={2}>2 Stars — Needs Work</option>
                    <option value={1}>1 Star — Poor</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Share pricing accuracy, speed, or quality..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-4 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {submittingReview ? 'Posting...' : 'Post Review'}
                  </button>
                </div>
                {reviewError && <p className="text-xs text-red-600 dark:text-red-400">{reviewError}</p>}
                {reviewSuccess && (
                  <p className="text-xs text-[#14532D] dark:text-emerald-400 font-medium">
                    Review published and provider rating updated.
                  </p>
                )}
              </form>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-0 p-5 rounded-xl bg-[#F6F7F6] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 space-y-5">
              <div>
                <h2
                  id="service-detail-title"
                  className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight"
                >
                  {service.name}
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{service.summary}</p>
                <p className="mt-2.5 text-xs font-semibold text-[#14532D] dark:text-emerald-400">
                  {service.studentDeal}
                </p>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Select service package
                </span>
                <div className="space-y-2">
                  {service.packages.map((pkg) => {
                    const active = pkg.id === selectedPkg?.id;
                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setSelectedPkgId(pkg.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                          active
                            ? 'bg-white dark:bg-slate-900 border-[#14532D] dark:border-emerald-500 ring-1 ring-[#14532D] dark:ring-emerald-500'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{pkg.name}</p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{pkg.description}</p>
                          </div>
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums whitespace-nowrap shrink-0">
                            ₹{pkg.priceInr}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="slot-select"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2"
                >
                  Preferred pickup / delivery slot
                </label>
                <select
                  id="slot-select"
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Quantity</span>
                <div className="inline-flex items-center border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-3 text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (selectedPkg) {
                    onAddToBag(service, selectedPkg, quantity, timeSlot);
                    onClose();
                  }
                }}
                className="w-full py-3 px-4 bg-[#14532D] hover:bg-[#166534] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer tabular-nums"
              >
                Add to Booking Bag — ₹{lineTotal}
              </button>

              <p className="text-xs text-slate-500 dark:text-slate-400 text-center tabular-nums">
                Pay via {service.paymentMethods.join(' or ')} · Earns +
                {Math.max(1, Math.round(lineTotal / 10))} loyalty pts on completion
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

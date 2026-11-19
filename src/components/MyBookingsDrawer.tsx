import {useState, type FormEvent} from 'react';
import {CheckCircle2, Clock, MessageSquarePlus, PackageCheck, Star, X, XCircle} from 'lucide-react';
import type {
  BookingRecord,
  BookingStatus,
  LoyaltyState,
  ServiceProvider,
  ServiceReview,
} from '../types';

interface MyBookingsDrawerProps {
  open: boolean;
  bookings: BookingRecord[];
  onClose: () => void;
  onStatusUpdated: (updated: BookingRecord, loyalty?: LoyaltyState) => void;
  onReviewSubmitted: (
    updatedService: ServiceProvider,
    updatedBooking: BookingRecord | null,
    review: ServiceReview,
  ) => void;
}

interface ReviewTarget {
  bookingId: string;
  serviceId: string;
  serviceName: string;
}

function getUniqueBookingServices(items: BookingRecord['items']) {
  const seen = new Map<string, {serviceId: string; serviceName: string}>();
  for (const item of items) {
    if (!seen.has(item.serviceId)) {
      seen.set(item.serviceId, {
        serviceId: item.serviceId,
        serviceName: item.serviceName,
      });
    }
  }
  return Array.from(seen.values());
}

function StatusLabel({status}: {status: BookingStatus}) {
  if (status === 'Completed') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#14532D] dark:text-emerald-400">
        <PackageCheck className="w-3.5 h-3.5" />
        <span>Completed</span>
      </span>
    );
  }
  if (status === 'In Progress') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
        <Clock className="w-3.5 h-3.5" />
        <span>In Progress</span>
      </span>
    );
  }
  if (status === 'Cancelled') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <XCircle className="w-3.5 h-3.5" />
        <span>Cancelled</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
      <CheckCircle2 className="w-3.5 h-3.5 text-[#14532D] dark:text-emerald-400" />
      <span>Confirmed</span>
    </span>
  );
}

export function MyBookingsDrawer({
  open,
  bookings,
  onClose,
  onStatusUpdated,
  onReviewSubmitted,
}: MyBookingsDrawerProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  if (!open) return null;

  async function updateStatus(id: string, status: BookingStatus) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({status}),
      });
      if (res.ok) {
        const data = await res.json();
        onStatusUpdated(data.booking, data.loyalty);
      }
    } finally {
      setUpdatingId(null);
    }
  }

  function openReviewComposer(bookingId: string, serviceId: string, serviceName: string) {
    setReviewTarget({bookingId, serviceId, serviceName});
    setReviewRating(5);
    setReviewComment('');
    setReviewError(null);
  }

  function closeReviewComposer() {
    setReviewTarget(null);
    setReviewComment('');
    setReviewError(null);
  }

  async function handleSubmitReview(e: FormEvent, booking: BookingRecord) {
    e.preventDefault();
    if (!reviewTarget || reviewTarget.bookingId !== booking.id) return;

    const cleanComment = reviewComment.trim().slice(0, 500);
    if (!cleanComment) {
      setReviewError('Please add a brief comment about your experience.');
      return;
    }

    const derivedHostel =
      booking.hostelAddress.split('·')[0].trim().slice(0, 80) || 'DBS Campus';
    const cleanName = (booking.studentName || 'DBS Student').trim().slice(0, 80);

    setSubmittingReview(true);
    setReviewError(null);
    try {
      const res = await fetch(`/api/services/${reviewTarget.serviceId}/reviews`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          studentName: cleanName,
          hostelOrArea: derivedHostel,
          rating: reviewRating,
          comment: cleanComment,
          bookingId: booking.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReviewError(data.error || 'Could not submit your review. Please try again.');
        return;
      }
      onReviewSubmitted(data.service, data.booking ?? null, data.review);
      closeReviewComposer();
    } catch {
      setReviewError('Network error while submitting review.');
    } finally {
      setSubmittingReview(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 dark:bg-slate-950/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-bookings-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 h-full border-l border-slate-200 dark:border-slate-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 id="my-bookings-title" className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              My Campus Bookings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live order tracking and receipts across DBS &amp; Selaqui partners.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bookings drawer"
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {bookings.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">No bookings yet</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Your confirmed tiffin, laundry, print, and cab bookings will appear here.
              </p>
            </div>
          ) : (
            bookings.map((booking) => {
              const uniqueServices = getUniqueBookingServices(booking.items);
              const isReviewingThisBooking = reviewTarget?.bookingId === booking.id;

              return (
                <div
                  key={booking.id}
                  className="p-4 rounded-xl bg-[#F6F7F6] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {booking.id}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{booking.paymentMethod}</span>
                      </div>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {booking.studentName} — {booking.hostelAddress}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{booking.estimatedFulfillment}</p>
                    </div>
                    <StatusLabel status={booking.status} />
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-700/80 pt-2.5 space-y-1.5 text-sm">
                    {booking.items.map((item, idx) => (
                      <div
                        key={`${booking.id}-${item.packageId}-${idx}`}
                        className="flex justify-between gap-2 text-xs text-slate-700 dark:text-slate-300"
                      >
                        <span>
                          {item.serviceName} ({item.packageName} × {item.quantity})
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums shrink-0">
                          ₹{item.unitPriceInr * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/80">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      Total: ₹{booking.totalInr}
                      {booking.discountInr > 0 && (
                        <span className="ml-2 text-xs font-medium text-[#14532D] dark:text-emerald-400">
                          (Saved ₹{booking.discountInr})
                        </span>
                      )}
                      {booking.status === 'Completed' && booking.pointsEarned ? (
                        <span className="block text-xs font-semibold text-[#14532D] dark:text-emerald-400 mt-0.5">
                          +{booking.pointsEarned} loyalty pts earned
                        </span>
                      ) : booking.status !== 'Cancelled' ? (
                        <span className="block text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                          Earns +{Math.max(1, Math.round(booking.totalInr / 10))} pts when completed
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {booking.status === 'Confirmed' && (
                        <button
                          type="button"
                          disabled={updatingId === booking.id}
                          onClick={() => updateStatus(booking.id, 'In Progress')}
                          className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                        >
                          Dispatch
                        </button>
                      )}
                      {(booking.status === 'Confirmed' || booking.status === 'In Progress') && (
                        <>
                          <button
                            type="button"
                            disabled={updatingId === booking.id}
                            onClick={() => updateStatus(booking.id, 'Completed')}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#14532D] hover:bg-[#166534] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                          >
                            Mark Received
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === booking.id}
                            onClick={() => updateStatus(booking.id, 'Cancelled')}
                            className="px-2.5 py-1 text-xs font-medium rounded-md text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {booking.status === 'Completed' &&
                        uniqueServices.map((svc) => {
                          const alreadyReviewed = Boolean(
                            booking.reviewedServiceIds?.includes(svc.serviceId),
                          );
                          const isEditing =
                            isReviewingThisBooking && reviewTarget?.serviceId === svc.serviceId;

                          if (alreadyReviewed) {
                            return (
                              <span
                                key={svc.serviceId}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#14532D] dark:text-emerald-400 whitespace-nowrap shrink-0"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>
                                  {uniqueServices.length > 1
                                    ? `Reviewed · ${svc.serviceName}`
                                    : 'Reviewed'}
                                </span>
                              </span>
                            );
                          }

                          return (
                            <button
                              key={svc.serviceId}
                              type="button"
                              onClick={() =>
                                isEditing
                                  ? closeReviewComposer()
                                  : openReviewComposer(booking.id, svc.serviceId, svc.serviceName)
                              }
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                isEditing
                                  ? 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                                  : 'border-[#14532D] dark:border-emerald-500 bg-white dark:bg-slate-900 hover:bg-[#14532D] dark:hover:bg-emerald-600 text-[#14532D] dark:text-emerald-300 hover:text-white dark:hover:text-white'
                              }`}
                            >
                              <MessageSquarePlus className="w-3.5 h-3.5" />
                              <span>
                                {uniqueServices.length > 1
                                  ? `Leave Review · ${svc.serviceName}`
                                  : 'Leave Review'}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {booking.status === 'Completed' && isReviewingThisBooking && reviewTarget && (
                    <form
                      onSubmit={(e) => void handleSubmitReview(e, booking)}
                      className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          Rate {reviewTarget.serviceName}
                        </p>
                        <div className="flex items-center gap-1 shrink-0" role="group" aria-label="Star rating">
                          {[1, 2, 3, 4, 5].map((starValue) => {
                            const active = starValue <= reviewRating;
                            return (
                              <button
                                key={starValue}
                                type="button"
                                onClick={() => setReviewRating(starValue)}
                                aria-label={`Rate ${starValue} out of 5 stars`}
                                aria-pressed={reviewRating === starValue}
                                className="p-0.5 rounded hover:bg-amber-50 dark:hover:bg-amber-500/10 cursor-pointer"
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    active
                                      ? 'text-amber-600 dark:text-amber-400 fill-amber-500 dark:fill-amber-400'
                                      : 'text-slate-300 dark:text-slate-600 fill-transparent'
                                  }`}
                                />
                              </button>
                            );
                          })}
                          <span className="ml-1 text-xs font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                            {reviewRating}.0
                          </span>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor={`review-comment-${booking.id}`}
                          className="sr-only"
                        >
                          Write your review
                        </label>
                        <textarea
                          id={`review-comment-${booking.id}`}
                          rows={2}
                          required
                          maxLength={500}
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Share delivery speed, hygiene, or pricing accuracy..."
                          className="w-full px-3 py-2 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500 resize-none"
                        />
                      </div>

                      {reviewError && (
                        <p className="text-xs font-medium text-red-600 dark:text-red-400">{reviewError}</p>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                          {reviewComment.trim().length}/500
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={closeReviewComposer}
                            className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer whitespace-nowrap shrink-0"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={submittingReview}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#14532D] hover:bg-[#166534] dark:bg-emerald-700 dark:hover:bg-emerald-600 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                          >
                            {submittingReview ? 'Submitting...' : 'Submit Review'}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

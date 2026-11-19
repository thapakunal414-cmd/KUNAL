import {
  CATEGORY_IMAGES,
  REWARD_TIERS,
  buildLoyaltyState,
  buildPilotSummary,
  computePointsForOrder,
  createInitialStoreState,
  type CampusStoreState,
} from '../data/campusCatalog';
import type {
  BookingRecord,
  BookingStatus,
  CampusArea,
  CartItem,
  LoyaltyState,
  PartnerApplication,
  PilotSummary,
  RedeemedVoucher,
  ServiceCategory,
  ServiceProvider,
  ServiceReview,
} from '../types';

const LOCAL_STORE_KEY = 'campusease_local_store_v1';

class ApiUnavailableError extends Error {
  constructor(message = 'Backend API unavailable') {
    super(message);
    this.name = 'ApiUnavailableError';
  }
}

class ApiValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiValidationError';
  }
}

function readLocalStore(): CampusStoreState {
  try {
    const raw = localStorage.getItem(LOCAL_STORE_KEY);
    if (!raw) {
      const initial = createInitialStoreState();
      localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as Partial<CampusStoreState>;
    const fallback = createInitialStoreState();
    return {
      services:
        Array.isArray(parsed.services) && parsed.services.length > 0
          ? parsed.services
          : fallback.services,
      bookings: Array.isArray(parsed.bookings) ? parsed.bookings : fallback.bookings,
      partners: Array.isArray(parsed.partners) ? parsed.partners : [],
      vouchers: Array.isArray(parsed.vouchers) ? parsed.vouchers : [],
      ledger: Array.isArray(parsed.ledger) ? parsed.ledger : fallback.ledger,
    };
  } catch {
    return createInitialStoreState();
  }
}

function writeLocalStore(state: CampusStoreState): void {
  try {
    localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota / private mode errors
  }
}

async function fetchJsonWithRetry<T>(
  url: string,
  init?: RequestInit,
  retries = 1,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');

      if (!isJson) {
        // Static hosting or proxy returned HTML (e.g. 404 or SPA fallback)
        throw new ApiUnavailableError(`Non-JSON response (${res.status}) from ${url}`);
      }

      const data = (await res.json()) as T & {error?: string};

      if (res.status >= 500) {
        throw new ApiUnavailableError(data.error || `Server error ${res.status}`);
      }

      if (!res.ok) {
        throw new ApiValidationError(data.error || `Request failed (${res.status})`);
      }

      return data;
    } catch (err) {
      window.clearTimeout(timeoutId);
      if (err instanceof ApiValidationError) {
        throw err;
      }
      lastError = err;
      if (attempt < retries) {
        await new Promise((resolve) => window.setTimeout(resolve, 350));
      }
    }
  }

  throw lastError instanceof ApiUnavailableError
    ? lastError
    : new ApiUnavailableError('Network or backend endpoint unreachable');
}

export interface DirectoryPayload {
  services: ServiceProvider[];
  bookings: BookingRecord[];
  pilotSummary: PilotSummary;
  loyalty: LoyaltyState;
}

export async function loadDirectoryData(): Promise<DirectoryPayload> {
  try {
    const [svcData, bkgData, sumData, rwdData] = await Promise.all([
      fetchJsonWithRetry<{services: ServiceProvider[]}>('/api/services'),
      fetchJsonWithRetry<{bookings: BookingRecord[]}>('/api/bookings'),
      fetchJsonWithRetry<PilotSummary>('/api/pilot-summary'),
      fetchJsonWithRetry<{loyalty: LoyaltyState}>('/api/rewards'),
    ]);

    const services = Array.isArray(svcData.services) ? svcData.services : [];
    if (services.length === 0) {
      throw new ApiUnavailableError('Empty services response');
    }

    const bookings = Array.isArray(bkgData.bookings) ? bkgData.bookings : [];
    const store = readLocalStore();
    writeLocalStore({
      ...store,
      services,
      bookings,
      vouchers: rwdData.loyalty?.vouchers ?? store.vouchers,
      ledger: rwdData.loyalty?.ledger ?? store.ledger,
    });

    return {
      services,
      bookings,
      pilotSummary: sumData,
      loyalty: rwdData.loyalty,
    };
  } catch (err) {
    if (err instanceof ApiValidationError) {
      throw err;
    }
    const store = readLocalStore();
    return {
      services: store.services,
      bookings: [...store.bookings].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
      pilotSummary: buildPilotSummary(store),
      loyalty: buildLoyaltyState(store),
    };
  }
}

export async function submitServiceReview(params: {
  serviceId: string;
  studentName: string;
  hostelOrArea: string;
  rating: number;
  comment: string;
  bookingId?: string;
}): Promise<{service: ServiceProvider; review: ServiceReview; booking: BookingRecord | null}> {
  try {
    return await fetchJsonWithRetry<{
      service: ServiceProvider;
      review: ServiceReview;
      booking: BookingRecord | null;
    }>(`/api/services/${params.serviceId}/reviews`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        studentName: params.studentName,
        hostelOrArea: params.hostelOrArea,
        rating: params.rating,
        comment: params.comment,
        bookingId: params.bookingId,
      }),
    }, 0);
  } catch (err) {
    if (err instanceof ApiValidationError) {
      throw err;
    }
    const store = readLocalStore();
    const service = store.services.find((s) => s.id === params.serviceId);
    if (!service) {
      throw new ApiValidationError('Service provider not found.');
    }

    const cleanName = params.studentName.trim();
    const cleanComment = params.comment.trim();
    const numericRating = Number(params.rating);
    if (!cleanName || !cleanComment || Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      throw new ApiValidationError('Please enter your name, rating (1-5), and a short review.');
    }

    let updatedBooking: BookingRecord | null = null;
    if (params.bookingId) {
      const booking = store.bookings.find((b) => b.id === params.bookingId);
      if (booking) {
        if (booking.status !== 'Completed') {
          throw new ApiValidationError('Only completed orders can be reviewed.');
        }
        const reviewed = booking.reviewedServiceIds || [];
        if (reviewed.includes(service.id)) {
          throw new ApiValidationError('You have already reviewed this service for this booking.');
        }
        booking.reviewedServiceIds = [...reviewed, service.id];
        updatedBooking = booking;
      }
    }

    const newReview: ServiceReview = {
      id: `rev-${Date.now()}`,
      studentName: cleanName,
      hostelOrArea: (params.hostelOrArea || 'DBS Campus').trim(),
      rating: numericRating,
      comment: cleanComment,
      createdAt: new Date().toISOString(),
    };

    service.reviews = [newReview, ...service.reviews];
    service.reviewCount = service.reviews.length;
    const avg = service.reviews.reduce((sum, r) => sum + r.rating, 0) / service.reviews.length;
    service.rating = Number(avg.toFixed(1));

    writeLocalStore(store);
    return {service, review: newReview, booking: updatedBooking};
  }
}

export async function createBooking(params: {
  studentName: string;
  hostelAddress: string;
  phone: string;
  paymentMethod: 'UPI' | 'Hostel Gate COD';
  promoCode: string;
  items: CartItem[];
}): Promise<{booking: BookingRecord; loyalty: LoyaltyState}> {
  try {
    return await fetchJsonWithRetry<{booking: BookingRecord; loyalty: LoyaltyState}>(
      '/api/bookings',
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(params),
      },
      0,
    );
  } catch (err) {
    if (err instanceof ApiValidationError) {
      throw err;
    }
    if (!params.studentName.trim() || !params.hostelAddress.trim() || !params.phone.trim()) {
      throw new ApiValidationError('Student name, hostel/PG location, and phone number are required.');
    }
    if (!Array.isArray(params.items) || params.items.length === 0) {
      throw new ApiValidationError('Your booking bag is empty.');
    }

    const store = readLocalStore();
    const subtotalInr = params.items.reduce((sum, item) => sum + item.unitPriceInr * item.quantity, 0);
    const normalizedPromo = (params.promoCode || '').trim().toUpperCase();

    let discountInr = 0;
    let appliedCode: string | null = null;
    const matchedVoucher = store.vouchers.find(
      (v) => v.code.toUpperCase() === normalizedPromo && !v.usedInBookingId,
    );

    if (matchedVoucher) {
      discountInr = Math.min(subtotalInr, matchedVoucher.discountInr);
      appliedCode = matchedVoucher.code;
    } else if (normalizedPromo === 'FIRSTDEAL' && subtotalInr >= 100) {
      discountInr = 30;
      appliedCode = 'FIRSTDEAL';
    }

    const totalInr = Math.max(0, subtotalInr - discountInr);
    const nextNum = 1041 + store.bookings.length + 1;
    const firstSlot = params.items[0]?.timeSlot || 'Next available slot';

    const newBooking: BookingRecord = {
      id: `CE-${nextNum}`,
      studentName: params.studentName.trim(),
      hostelAddress: params.hostelAddress.trim(),
      phone: params.phone.trim(),
      paymentMethod: params.paymentMethod === 'Hostel Gate COD' ? 'Hostel Gate COD' : 'UPI',
      promoCode: appliedCode,
      rewardVoucherCode: matchedVoucher ? matchedVoucher.code : null,
      subtotalInr,
      discountInr,
      convenienceFeeInr: 0,
      totalInr,
      status: 'Confirmed',
      createdAt: new Date().toISOString(),
      estimatedFulfillment: `Confirmed · ${firstSlot}`,
      items: params.items,
    };

    if (matchedVoucher) {
      matchedVoucher.usedInBookingId = newBooking.id;
    }

    store.bookings.unshift(newBooking);
    writeLocalStore(store);

    return {booking: newBooking, loyalty: buildLoyaltyState(store)};
  }
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
): Promise<{booking: BookingRecord; loyalty: LoyaltyState}> {
  try {
    return await fetchJsonWithRetry<{booking: BookingRecord; loyalty: LoyaltyState}>(
      `/api/bookings/${id}`,
      {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({status}),
      },
      0,
    );
  } catch (err) {
    if (err instanceof ApiValidationError) {
      throw err;
    }
    const store = readLocalStore();
    const booking = store.bookings.find((b) => b.id === id);
    if (!booking) {
      throw new ApiValidationError('Booking not found.');
    }

    booking.status = status;
    if (status === 'Completed') {
      booking.estimatedFulfillment = 'Completed at campus gate';
      if (!booking.pointsEarned) {
        const pts = computePointsForOrder(booking.totalInr);
        booking.pointsEarned = pts;
        const primaryService = booking.items[0]?.serviceName || 'Campus Service';
        store.ledger.unshift({
          id: `led-${booking.id}-${Date.now()}`,
          label: `Completed Booking ${booking.id} (${primaryService})`,
          pointsDelta: pts,
          bookingId: booking.id,
          createdAt: new Date().toISOString(),
        });
      }
    } else if (status === 'Cancelled') {
      booking.estimatedFulfillment = 'Cancelled by student';
    } else if (status === 'In Progress') {
      booking.estimatedFulfillment = 'Provider preparing / en route';
    }

    writeLocalStore(store);
    return {booking, loyalty: buildLoyaltyState(store)};
  }
}

export async function redeemRewardTier(
  tierId: string,
): Promise<{voucher: RedeemedVoucher; loyalty: LoyaltyState}> {
  try {
    return await fetchJsonWithRetry<{voucher: RedeemedVoucher; loyalty: LoyaltyState}>(
      '/api/rewards/redeem',
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({tierId}),
      },
      0,
    );
  } catch (err) {
    if (err instanceof ApiValidationError) {
      throw err;
    }
    const tier = REWARD_TIERS.find((t) => t.id === tierId);
    if (!tier) {
      throw new ApiValidationError('Reward tier not found.');
    }

    const store = readLocalStore();
    const currentLoyalty = buildLoyaltyState(store);
    if (currentLoyalty.availablePoints < tier.pointsRequired) {
      throw new ApiValidationError(
        `You need ${tier.pointsRequired - currentLoyalty.availablePoints} more points to unlock this reward.`,
      );
    }

    const suffix = String(Date.now()).slice(-4);
    const voucher: RedeemedVoucher = {
      code: `CE-RWD-${tier.discountInr}-${suffix}`,
      tierId: tier.id,
      title: tier.title,
      discountInr: tier.discountInr,
      pointsSpent: tier.pointsRequired,
      redeemedAt: new Date().toISOString(),
      usedInBookingId: null,
    };

    store.vouchers.unshift(voucher);
    store.ledger.unshift({
      id: `led-redeem-${Date.now()}`,
      label: `Redeemed ${tier.title} (${voucher.code})`,
      pointsDelta: -tier.pointsRequired,
      createdAt: new Date().toISOString(),
    });

    writeLocalStore(store);
    return {voucher, loyalty: buildLoyaltyState(store)};
  }
}

export async function submitPartnerApplication(params: {
  businessName: string;
  ownerName: string;
  category: ServiceCategory;
  area: CampusArea;
  phone: string;
  startingPriceInr: number;
  serviceSummary: string;
  studentDeal: string;
}): Promise<{application: PartnerApplication; service: ServiceProvider}> {
  try {
    return await fetchJsonWithRetry<{application: PartnerApplication; service: ServiceProvider}>(
      '/api/partners',
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(params),
      },
      0,
    );
  } catch (err) {
    if (err instanceof ApiValidationError) {
      throw err;
    }
    if (
      !params.businessName.trim() ||
      !params.ownerName.trim() ||
      !params.phone.trim() ||
      !params.serviceSummary.trim()
    ) {
      throw new ApiValidationError('Please complete all required business details.');
    }

    const price = Math.max(20, Math.min(5000, Number(params.startingPriceInr) || 80));
    const application: PartnerApplication = {
      id: `prt-${Date.now()}`,
      businessName: params.businessName.trim(),
      ownerName: params.ownerName.trim(),
      category: params.category,
      area: params.area,
      phone: params.phone.trim(),
      startingPriceInr: price,
      serviceSummary: params.serviceSummary.trim(),
      studentDeal: (params.studentDeal || 'Student-friendly pilot pricing').trim(),
      createdAt: new Date().toISOString(),
    };

    const newService: ServiceProvider = {
      id: `svc-${Date.now()}`,
      name: application.businessName,
      category: params.category,
      area: params.area,
      distanceLabel: `Partner near ${params.area}`,
      turnaroundLabel: '30 min avg',
      turnaroundMinutes: 30,
      operatingHours: '8:00 AM – 9:30 PM',
      summary: application.serviceSummary,
      studentDeal: application.studentDeal,
      verifiedSince: 'Nov 2026',
      verificationChecklist: [
        'Local Selaqui pilot partner',
        'Upfront student rate card locked',
        'UPI & Hostel Gate COD supported',
      ],
      paymentMethods: ['UPI', 'Hostel Gate COD'],
      imageUrl: CATEGORY_IMAGES[params.category],
      basePriceInr: price,
      baseUnitLabel: 'per service',
      rating: 4.8,
      reviewCount: 1,
      packages: [
        {
          id: `pkg-${Date.now()}-1`,
          name: `${application.businessName} Standard Pack`,
          description: application.serviceSummary,
          priceInr: price,
          unitLabel: 'per service',
        },
      ],
      reviews: [
        {
          id: `rev-${Date.now()}`,
          studentName: 'CampusEase Pilot Desk',
          hostelOrArea: params.area,
          rating: 4.8,
          comment: `Verified onboarding completed with ${application.ownerName}.`,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    const store = readLocalStore();
    store.partners.unshift(application);
    store.services.unshift(newService);
    writeLocalStore(store);

    return {application, service: newService};
  }
}

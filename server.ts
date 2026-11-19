import express from 'express';
import type {NextFunction, Request, Response} from 'express';
import fs from 'fs';
import path from 'path';
import {
  CATEGORY_IMAGES,
  REWARD_TIERS,
  SEED_BOOKINGS,
  SEED_SERVICES,
  buildLoyaltyState,
  buildPilotSummary,
  buildSeedLedger,
  computePointsForOrder,
  createInitialStoreState,
  type CampusStoreState,
} from './src/data/campusCatalog.ts';
import type {
  BookingRecord,
  BookingStatus,
  CampusArea,
  PartnerApplication,
  RedeemedVoucher,
  ServiceCategory,
  ServiceProvider,
  ServiceReview,
} from './src/types.ts';

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'campusease-db.json');

let memoryStore: CampusStoreState | null = null;

function ensureStore(): CampusStoreState {
  if (memoryStore) {
    return memoryStore;
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, {recursive: true});
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial = createInitialStoreState();
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      } catch {
        // Fallback cleanly to in-memory store on read-only filesystems
      }
      memoryStore = initial;
      return memoryStore;
    }

    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<CampusStoreState>;
    const bookings = Array.isArray(parsed.bookings) ? parsed.bookings : SEED_BOOKINGS;
    const ledger = Array.isArray(parsed.ledger) ? parsed.ledger : buildSeedLedger();

    // Backfill pointsEarned on completed bookings if upgrading an existing store file
    for (const b of bookings) {
      if (b.status === 'Completed' && !b.pointsEarned) {
        const pts = computePointsForOrder(b.totalInr);
        b.pointsEarned = pts;
        if (!ledger.some((l) => l.bookingId === b.id && l.pointsDelta > 0)) {
          ledger.push({
            id: `led-${b.id}`,
            label: `Completed Booking ${b.id}`,
            pointsDelta: pts,
            bookingId: b.id,
            createdAt: b.createdAt,
          });
        }
      }
    }

    memoryStore = {
      services:
        Array.isArray(parsed.services) && parsed.services.length > 0
          ? parsed.services
          : SEED_SERVICES,
      bookings,
      partners: Array.isArray(parsed.partners) ? parsed.partners : [],
      vouchers: Array.isArray(parsed.vouchers) ? parsed.vouchers : [],
      ledger,
    };
    return memoryStore;
  } catch {
    memoryStore = createInitialStoreState();
    return memoryStore;
  }
}

function saveStore(state: CampusStoreState): void {
  memoryStore = state;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, {recursive: true});
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch {
    // Keep serving from in-memory store if disk write is unavailable
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Prevent proxy or browser caching of dynamic API responses
  app.use('/api', (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Ensure initial store exists on boot
  ensureStore();

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ok: true});
  });

  // Get services with optional category, area, search, and sort filters
  app.get('/api/services', (req: Request, res: Response) => {
    const store = ensureStore();
    const category = typeof req.query.category === 'string' ? req.query.category : 'All';
    const area = typeof req.query.area === 'string' ? req.query.area : 'All';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'recommended';

    let list = [...store.services];

    if (category && category !== 'All') {
      list = list.filter((s) => s.category === category);
    }
    if (area && area !== 'All') {
      list = list.filter((s) => s.area === area);
    }
    if (search) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.category.toLowerCase().includes(search) ||
          s.summary.toLowerCase().includes(search) ||
          s.area.toLowerCase().includes(search) ||
          s.packages.some((p) => p.name.toLowerCase().includes(search)),
      );
    }

    if (sort === 'price_asc') {
      list.sort((a, b) => a.basePriceInr - b.basePriceInr);
    } else if (sort === 'rating_desc') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sort === 'fastest') {
      list.sort((a, b) => a.turnaroundMinutes - b.turnaroundMinutes);
    }

    res.json({services: list});
  });

  // Submit a verified student review for a service provider
  app.post('/api/services/:id/reviews', (req: Request, res: Response) => {
    const store = ensureStore();
    const service = store.services.find((s) => s.id === req.params.id);
    if (!service) {
      res.status(404).json({error: 'Service provider not found.'});
      return;
    }

    const {studentName, hostelOrArea, rating, comment, bookingId} = req.body as {
      studentName?: string;
      hostelOrArea?: string;
      rating?: number;
      comment?: string;
      bookingId?: string;
    };

    const cleanName = (studentName || '').trim();
    const cleanComment = (comment || '').trim();
    const numericRating = Number(rating);

    if (!cleanName || !cleanComment || Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      res.status(400).json({error: 'Please enter your name, rating (1-5), and a short review.'});
      return;
    }

    let updatedBooking: BookingRecord | null = null;
    if (bookingId) {
      const booking = store.bookings.find((b) => b.id === bookingId);
      if (booking) {
        if (booking.status !== 'Completed') {
          res.status(400).json({error: 'Only completed orders can be reviewed.'});
          return;
        }
        const reviewed = booking.reviewedServiceIds || [];
        if (reviewed.includes(service.id)) {
          res.status(409).json({error: 'You have already reviewed this service for this booking.'});
          return;
        }
        booking.reviewedServiceIds = [...reviewed, service.id];
        updatedBooking = booking;
      }
    }

    const newReview: ServiceReview = {
      id: `rev-${Date.now()}`,
      studentName: cleanName,
      hostelOrArea: (hostelOrArea || 'DBS Campus').trim(),
      rating: numericRating,
      comment: cleanComment,
      createdAt: new Date().toISOString(),
    };

    service.reviews = [newReview, ...service.reviews];
    service.reviewCount = service.reviews.length;
    const avg = service.reviews.reduce((sum, r) => sum + r.rating, 0) / service.reviews.length;
    service.rating = Number(avg.toFixed(1));

    saveStore(store);
    res.status(201).json({service, review: newReview, booking: updatedBooking});
  });

  // Get all bookings
  app.get('/api/bookings', (_req: Request, res: Response) => {
    const store = ensureStore();
    const bookings = [...store.bookings].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    res.json({bookings});
  });

  // Create a booking
  app.post('/api/bookings', (req: Request, res: Response) => {
    const store = ensureStore();
    const {
      studentName,
      hostelAddress,
      phone,
      paymentMethod,
      promoCode,
      items,
    } = req.body as Partial<BookingRecord>;

    if (!studentName?.trim() || !hostelAddress?.trim() || !phone?.trim()) {
      res.status(400).json({error: 'Student name, hostel/PG location, and phone number are required.'});
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({error: 'Your booking bag is empty.'});
      return;
    }

    const subtotalInr = items.reduce((sum, item) => sum + item.unitPriceInr * item.quantity, 0);
    const normalizedPromo = (promoCode || '').trim().toUpperCase();

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

    const convenienceFeeInr = 0;
    const totalInr = Math.max(0, subtotalInr - discountInr + convenienceFeeInr);

    const nextNum = 1041 + store.bookings.length + 1;
    const firstSlot = items[0]?.timeSlot || 'Next available slot';

    const newBooking: BookingRecord = {
      id: `CE-${nextNum}`,
      studentName: studentName.trim(),
      hostelAddress: hostelAddress.trim(),
      phone: phone.trim(),
      paymentMethod: paymentMethod === 'Hostel Gate COD' ? 'Hostel Gate COD' : 'UPI',
      promoCode: appliedCode,
      rewardVoucherCode: matchedVoucher ? matchedVoucher.code : null,
      subtotalInr,
      discountInr,
      convenienceFeeInr,
      totalInr,
      status: 'Confirmed',
      createdAt: new Date().toISOString(),
      estimatedFulfillment: `Confirmed · ${firstSlot}`,
      items,
    };

    if (matchedVoucher) {
      matchedVoucher.usedInBookingId = newBooking.id;
    }

    store.bookings.unshift(newBooking);
    saveStore(store);

    res.status(201).json({booking: newBooking, loyalty: buildLoyaltyState(store)});
  });

  // Update booking status (Confirm -> In Progress -> Completed / Cancelled)
  app.patch('/api/bookings/:id', (req: Request, res: Response) => {
    const store = ensureStore();
    const booking = store.bookings.find((b) => b.id === req.params.id);
    if (!booking) {
      res.status(404).json({error: 'Booking not found.'});
      return;
    }

    const {status} = req.body as {status?: BookingStatus};
    const allowed: BookingStatus[] = ['Confirmed', 'In Progress', 'Completed', 'Cancelled'];
    if (!status || !allowed.includes(status)) {
      res.status(400).json({error: 'Invalid booking status.'});
      return;
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

    saveStore(store);
    res.json({booking, loyalty: buildLoyaltyState(store)});
  });

  // Loyalty & Rewards endpoints
  app.get('/api/rewards', (_req: Request, res: Response) => {
    const store = ensureStore();
    res.json({loyalty: buildLoyaltyState(store)});
  });

  app.post('/api/rewards/redeem', (req: Request, res: Response) => {
    const store = ensureStore();
    const {tierId} = req.body as {tierId?: string};
    const tier = REWARD_TIERS.find((t) => t.id === tierId);
    if (!tier) {
      res.status(404).json({error: 'Reward tier not found.'});
      return;
    }

    const currentLoyalty = buildLoyaltyState(store);
    if (currentLoyalty.availablePoints < tier.pointsRequired) {
      res.status(400).json({
        error: `You need ${tier.pointsRequired - currentLoyalty.availablePoints} more points to unlock this reward.`,
      });
      return;
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

    saveStore(store);
    res.status(201).json({voucher, loyalty: buildLoyaltyState(store)});
  });

  // Register a new local service provider (Pilot Partner Onboarding)
  app.post('/api/partners', (req: Request, res: Response) => {
    const store = ensureStore();
    const {
      businessName,
      ownerName,
      category,
      area,
      phone,
      startingPriceInr,
      serviceSummary,
      studentDeal,
    } = req.body as Partial<PartnerApplication>;

    if (!businessName?.trim() || !ownerName?.trim() || !phone?.trim() || !serviceSummary?.trim()) {
      res.status(400).json({error: 'Please complete all required business details.'});
      return;
    }

    const validCategories: ServiceCategory[] = ['Food', 'Laundry', 'Printing', 'Transport', 'Stationery'];
    const safeCategory: ServiceCategory = validCategories.includes(category as ServiceCategory)
      ? (category as ServiceCategory)
      : 'Food';

    const validAreas: CampusArea[] = ['DBS Campus Gate', 'Selaqui Market', 'Chakrata Road', 'Prem Nagar'];
    const safeArea: CampusArea = validAreas.includes(area as CampusArea)
      ? (area as CampusArea)
      : 'Selaqui Market';

    const price = Math.max(20, Math.min(5000, Number(startingPriceInr) || 80));

    const application: PartnerApplication = {
      id: `prt-${Date.now()}`,
      businessName: businessName.trim(),
      ownerName: ownerName.trim(),
      category: safeCategory,
      area: safeArea,
      phone: phone.trim(),
      startingPriceInr: price,
      serviceSummary: serviceSummary.trim(),
      studentDeal: (studentDeal || 'Student-friendly pilot pricing').trim(),
      createdAt: new Date().toISOString(),
    };

    const newService: ServiceProvider = {
      id: `svc-${Date.now()}`,
      name: application.businessName,
      category: safeCategory,
      area: safeArea,
      distanceLabel: `Partner near ${safeArea}`,
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
      imageUrl: CATEGORY_IMAGES[safeCategory],
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
          hostelOrArea: safeArea,
          rating: 4.8,
          comment: `Verified onboarding completed with ${application.ownerName}.`,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    store.partners.unshift(application);
    store.services.unshift(newService);
    saveStore(store);

    res.status(201).json({application, service: newService});
  });

  // Pilot summary metrics derived from real store state
  app.get('/api/pilot-summary', (_req: Request, res: Response) => {
    const store = ensureStore();
    res.json(buildPilotSummary(store));
  });

  if (process.env.NODE_ENV !== 'production') {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CampusEase server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

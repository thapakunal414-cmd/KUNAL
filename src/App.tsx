import {useEffect, useMemo, useState} from 'react';
import {onAuthStateChanged, signOut, type User} from 'firebase/auth';
import {doc, getDoc, serverTimestamp, setDoc, writeBatch} from 'firebase/firestore';
import {ArrowRight, Scale} from 'lucide-react';
import {AuthModal, type StudentProfile} from './components/AuthModal';
import {BookingBagDrawer} from './components/BookingBagDrawer';
import {CompareDrawer} from './components/CompareDrawer';
import {Header} from './components/Header';
import {MarketplaceView} from './components/MarketplaceView';
import {MyBookingsDrawer} from './components/MyBookingsDrawer';
import {PartnerModal} from './components/PartnerModal';
import {ServiceDetailModal} from './components/ServiceDetailModal';
import {OperationType, auth, db, handleFirestoreError} from './firebase';
import {loadDirectoryData} from './lib/campusApi';
import type {
  BookingRecord,
  CampusArea,
  CartItem,
  LoyaltyState,
  PilotSummary,
  ServiceCategory,
  ServicePackage,
  ServiceProvider,
  ServiceReview,
} from './types';

const HERO_IMAGE = '/src/assets/images/hero_campus_services_1795069868230.jpg';

export default function App() {
  const [services, setServices] = useState<ServiceProvider[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [pilotSummary, setPilotSummary] = useState<PilotSummary | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltyState | null>(null);
  const [prefilledPromoCode, setPrefilledPromoCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [activeCategory, setActiveCategory] = useState<'All' | ServiceCategory>('All');
  const [activeArea, setActiveArea] = useState<'All' | CampusArea>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recommended' | 'price_asc' | 'rating_desc' | 'fastest'>(
    'recommended',
  );

  // Interactive drawers & modals
  const [selectedService, setSelectedService] = useState<ServiceProvider | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [bookingsOpen, setBookingsOpen] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  // Firebase Auth & Student Profile
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  // Light / Dark Theme
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('campusease_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // Ignore storage access errors
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('campusease_theme', theme);
    } catch {
      // Ignore storage access errors
    }
  }, [theme]);

  function handleToggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }

  // Persistent Booking Bag in localStorage
  const [bag, setBag] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('campusease_bag_v1');
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('campusease_bag_v1', JSON.stringify(bag));
    } catch {
      // Ignore storage quota errors
    }
  }, [bag]);

  async function fetchInitialData() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await loadDirectoryData();
      setServices(data.services);
      setBookings(data.bookings);
      setPilotSummary(data.pilotSummary);
      setLoyalty(data.loyalty);
    } catch {
      setLoadError('Unable to reach CampusEase service directory. Please retry.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (!user || !user.emailVerified) {
        setStudentProfile(null);
        return;
      }

      const privPath = `users/${user.uid}/private/info`;
      const pubPath = `users/${user.uid}/public/profile`;
      try {
        const [privSnap, pubSnap] = await Promise.all([
          getDoc(doc(db, privPath)),
          getDoc(doc(db, pubPath)),
        ]);

        if (privSnap.exists() && pubSnap.exists()) {
          const privData = privSnap.data();
          const pubData = pubSnap.data();
          setStudentProfile({
            uid: user.uid,
            displayName: pubData.displayName || user.displayName || 'DBS Student',
            email: privData.email || user.email || '',
            phone: privData.phone || '',
            hostelAddress: privData.hostelAddress || 'DBS Campus Gate',
            hostelArea: pubData.hostelArea || 'Selaqui',
            courseLabel: pubData.courseLabel || 'MBA Student',
          });
        } else {
          setStudentProfile(null);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, privPath);
      }
    });

    return () => unsubscribe();
  }, []);

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = services.filter((s) => {
      if (activeCategory !== 'All' && s.category !== activeCategory) return false;
      if (activeArea !== 'All' && s.area !== activeArea) return false;
      if (q) {
        const match =
          s.name.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.area.toLowerCase().includes(q) ||
          s.summary.toLowerCase().includes(q) ||
          s.packages.some((p) => p.name.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });

    if (sortBy === 'price_asc') {
      list = [...list].sort((a, b) => a.basePriceInr - b.basePriceInr);
    } else if (sortBy === 'rating_desc') {
      list = [...list].sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'fastest') {
      list = [...list].sort((a, b) => a.turnaroundMinutes - b.turnaroundMinutes);
    }

    return list;
  }, [services, activeCategory, activeArea, searchQuery, sortBy]);

  const comparedServices = useMemo(
    () => services.filter((s) => compareIds.includes(s.id)),
    [services, compareIds],
  );

  const bagCount = useMemo(
    () => bag.reduce((sum, item) => sum + item.quantity, 0),
    [bag],
  );

  function handleToggleCompare(serviceId: string) {
    setCompareIds((prev) => {
      if (prev.includes(serviceId)) {
        return prev.filter((id) => id !== serviceId);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), serviceId];
      }
      return [...prev, serviceId];
    });
  }

  function handleAddToBag(
    service: ServiceProvider,
    pkg: ServicePackage,
    quantity: number,
    timeSlot: string,
  ) {
    setBag((prev) => {
      const existingIdx = prev.findIndex(
        (item) =>
          item.serviceId === service.id &&
          item.packageId === pkg.id &&
          item.timeSlot === timeSlot,
      );
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + quantity,
        };
        return next;
      }
      return [
        ...prev,
        {
          serviceId: service.id,
          serviceName: service.name,
          category: service.category,
          packageId: pkg.id,
          packageName: pkg.name,
          unitPriceInr: pkg.priceInr,
          unitLabel: pkg.unitLabel,
          quantity,
          timeSlot,
          imageUrl: service.imageUrl,
        },
      ];
    });

    setRecentlyAddedId(service.id);
    window.setTimeout(() => {
      setRecentlyAddedId((cur) => (cur === service.id ? null : cur));
    }, 1200);
  }

  function handleQuickAdd(service: ServiceProvider) {
    const defaultPkg = service.packages[0];
    if (!defaultPkg) return;
    handleAddToBag(service, defaultPkg, 1, 'Next available slot');
  }

  function handleUpdateQty(
    serviceId: string,
    packageId: string,
    timeSlot: string,
    delta: number,
  ) {
    setBag((prev) =>
      prev
        .map((item) => {
          if (
            item.serviceId === serviceId &&
            item.packageId === packageId &&
            item.timeSlot === timeSlot
          ) {
            return {...item, quantity: item.quantity + delta};
          }
          return item;
        })
        .filter((item) => item.quantity > 0),
    );
  }

  function handleRemoveBagItem(serviceId: string, packageId: string, timeSlot: string) {
    setBag((prev) =>
      prev.filter(
        (item) =>
          !(
            item.serviceId === serviceId &&
            item.packageId === packageId &&
            item.timeSlot === timeSlot
          ),
      ),
    );
  }

  async function syncBookingToFirestore(booking: BookingRecord) {
    if (!currentUser || !currentUser.emailVerified) return;

    const bookingDocId = booking.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const bookingPath = `bookings/${bookingDocId}`;

    try {
      const batch = writeBatch(db);
      const summaryLabel = booking.items
        .map((i) => `${i.serviceName} (${i.quantity})`)
        .join(', ')
        .slice(0, 160);

      batch.set(doc(db, bookingPath), {
        uid: currentUser.uid,
        bookingCode: booking.id,
        studentName: booking.studentName.slice(0, 80),
        hostelAddress: booking.hostelAddress.slice(0, 140),
        phone: booking.phone.slice(0, 20),
        paymentMethod: booking.paymentMethod,
        promoCode: (booking.promoCode || '').slice(0, 40),
        subtotalInr: booking.subtotalInr,
        discountInr: booking.discountInr,
        totalInr: booking.totalInr,
        status: 'Confirmed',
        estimatedFulfillment: booking.estimatedFulfillment.slice(0, 120),
        summaryLabel: summaryLabel || 'CampusEase Booking',
        itemCount: Math.max(1, booking.items.length),
        pointsEarned: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      booking.items.forEach((item, index) => {
        const itemId = `item_${index}_${item.packageId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        batch.set(doc(db, `${bookingPath}/items/${itemId}`), {
          uid: currentUser.uid,
          serviceId: item.serviceId,
          serviceName: item.serviceName.slice(0, 100),
          category: item.category,
          packageId: item.packageId,
          packageName: item.packageName.slice(0, 120),
          unitPriceInr: item.unitPriceInr,
          unitLabel: item.unitLabel.slice(0, 40),
          quantity: item.quantity,
          timeSlot: item.timeSlot.slice(0, 60),
          createdAt: serverTimestamp(),
        });
      });

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, bookingPath);
    }
  }

  function handleBookingSuccess(booking: BookingRecord, updatedLoyalty?: LoyaltyState) {
    setBookings((prev) => [booking, ...prev]);
    setBag([]);
    if (updatedLoyalty) {
      setLoyalty(updatedLoyalty);
    }
    void syncBookingToFirestore(booking);
  }

  async function handleBookingStatusUpdated(updated: BookingRecord, updatedLoyalty?: LoyaltyState) {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    if (updatedLoyalty) {
      setLoyalty(updatedLoyalty);
    }

    if (currentUser && currentUser.emailVerified) {
      const bookingDocId = updated.id.replace(/[^a-zA-Z0-9_-]/g, '_');
      const bookingPath = `bookings/${bookingDocId}`;
      try {
        const snap = await getDoc(doc(db, bookingPath));
        if (snap.exists() && snap.data().status !== 'Completed' && snap.data().status !== 'Cancelled') {
          const batch = writeBatch(db);
          if (updated.status === 'Completed') {
            const pts = updated.pointsEarned || Math.max(1, Math.round(updated.totalInr / 10));
            batch.update(doc(db, bookingPath), {
              status: 'Completed',
              estimatedFulfillment: updated.estimatedFulfillment.slice(0, 120),
              pointsEarned: pts,
              updatedAt: serverTimestamp(),
            });
            const ledgerId = `led_${bookingDocId}`;
            batch.set(doc(db, `users/${currentUser.uid}/loyaltyLedger/${ledgerId}`), {
              uid: currentUser.uid,
              label: `Completed Booking ${updated.id}`.slice(0, 160),
              pointsDelta: pts,
              bookingId: updated.id,
              createdAt: serverTimestamp(),
            });
          } else {
            batch.update(doc(db, bookingPath), {
              status: updated.status,
              estimatedFulfillment: updated.estimatedFulfillment.slice(0, 120),
              updatedAt: serverTimestamp(),
            });
          }
          await batch.commit();
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, bookingPath);
      }
    }
  }

  function handleOpenAuth(mode: 'login' | 'signup') {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }

  async function handleSignOut() {
    await signOut(auth);
    setStudentProfile(null);
  }

  function handleApplyVoucherToBag(code: string) {
    setPrefilledPromoCode(code);
    setBagOpen(true);
  }

  const pendingOrdersCount = useMemo(
    () => bookings.filter((b) => b.status === 'Confirmed' || b.status === 'In Progress').length,
    [bookings],
  );

  const activeVouchers = useMemo(
    () => (loyalty?.vouchers || []).filter((v) => !v.usedInBookingId),
    [loyalty],
  );

  async function syncReviewToFirestore(
    serviceId: string,
    bookingCode: string,
    review: ServiceReview,
  ) {
    if (!currentUser || !currentUser.emailVerified) return;

    const reviewId = (review.id || `rev_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const reviewPath = `reviews/${reviewId}`;

    try {
      await setDoc(doc(db, reviewPath), {
        uid: currentUser.uid,
        serviceId: serviceId.replace(/[^a-zA-Z0-9_-]/g, '_'),
        bookingCode: (bookingCode || 'DIRECT').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40),
        studentName: (review.studentName || studentProfile?.displayName || 'DBS Student')
          .trim()
          .slice(0, 80),
        hostelArea: (review.hostelOrArea || studentProfile?.hostelArea || 'DBS Campus')
          .trim()
          .slice(0, 80),
        rating: Math.min(5, Math.max(1, Number(review.rating) || 5)),
        comment: review.comment.trim().slice(0, 500),
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, reviewPath);
    }
  }

  function applyUpdatedServiceRating(updatedService: ServiceProvider) {
    const nextServices = services.map((s) =>
      s.id === updatedService.id ? updatedService : s,
    );
    setServices(nextServices);
    const avg =
      nextServices.reduce((sum, s) => sum + s.rating, 0) /
      Math.max(1, nextServices.length);
    setPilotSummary((ps) =>
      ps
        ? {
            ...ps,
            verifiedProviders: nextServices.length,
            averageRating: Number(avg.toFixed(1)),
          }
        : ps,
    );
    setSelectedService((cur) => (cur?.id === updatedService.id ? updatedService : cur));
  }

  function handleReviewSubmitted(updatedService: ServiceProvider) {
    applyUpdatedServiceRating(updatedService);
  }

  function handleBookingReviewSubmitted(
    updatedService: ServiceProvider,
    updatedBooking: BookingRecord | null,
    review: ServiceReview,
  ) {
    applyUpdatedServiceRating(updatedService);
    if (updatedBooking) {
      setBookings((prev) =>
        prev.map((b) => (b.id === updatedBooking.id ? updatedBooking : b)),
      );
    }
    void syncReviewToFirestore(updatedService.id, updatedBooking?.id || 'DIRECT', review);
  }

  function handlePartnerCreated(newService: ServiceProvider) {
    setServices((prev) => [newService, ...prev]);
  }

  function resetFilters() {
    setActiveCategory('All');
    setActiveArea('All');
    setSearchQuery('');
    setSortBy('recommended');
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7F6] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-150">
      <Header
        bagCount={bagCount}
        compareCount={compareIds.length}
        bookingsCount={bookings.length}
        userEmail={currentUser?.email || null}
        studentProfile={studentProfile}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenCompare={() => setCompareOpen(true)}
        onOpenBookings={() => setBookingsOpen(true)}
        onOpenPartner={() => setPartnerOpen(true)}
        onOpenBag={() => setBagOpen(true)}
        onOpenAuth={handleOpenAuth}
        onSignOut={() => void handleSignOut()}
      />

      <main className="flex-1">
        {/* Section 1: Storefront Hero + Full-Width Proof Strip */}
        <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-150">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center">
                <p className="text-xs font-semibold tracking-wide text-[#14532D] dark:text-emerald-400">
                  DBS Global University · Selaqui &amp; Dehradun
                </p>

                <h1
                  className="mt-3 font-display font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-[1.08]"
                  style={{
                    fontSize: 'clamp(2.2rem, 3.8vw, 3.35rem)',
                    textWrap: 'balance',
                  }}
                >
                  Trusted campus services, compared and booked in one place.
                </h1>

                <p className="mt-4 text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                  Skip scattered WhatsApp groups and unverified listings. Discover transparent
                  student pricing for food, laundry, printing, transport, and stationery around
                  Selaqui—and book in seconds.
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-4">
                  <a
                    href="#catalog"
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#14532D] hover:bg-[#166534] dark:bg-emerald-700 dark:hover:bg-emerald-600 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Browse Verified Services</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>

                  <button
                    type="button"
                    onClick={() => setCompareOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Scale className="w-4 h-4" />
                    <span>
                      Compare Providers{compareIds.length > 0 ? ` (${compareIds.length})` : ''}
                    </span>
                  </button>
                </div>

                <p className="mt-5 text-xs text-slate-500 dark:text-slate-400">
                  First student booking offer: save <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">₹30</span> on orders <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">₹100+</span> with code{' '}
                  <span className="font-mono font-semibold text-[#14532D] dark:text-emerald-400">FIRSTDEAL</span>.
                </p>
              </div>

              <div className="lg:col-span-6">
                <div className="h-full min-h-[260px] lg:min-h-[380px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                  {heroImgFailed ? (
                    <div className="w-full h-full flex items-center justify-center p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      DBS Global University · Selaqui Campus Essentials
                    </div>
                  ) : (
                    <img
                      src={HERO_IMAGE}
                      alt="CampusEase verified student tiffin, folded laundry, printed notes, and campus essentials at Selaqui"
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImgFailed(true)}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Full-width 4-column proof bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-200 dark:border-slate-800 bg-[#F6F7F6] dark:bg-slate-950/60 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
              <div className="p-4 sm:p-5">
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {pilotSummary ? `${pilotSummary.verifiedProviders} Verified` : '12+ Verified'}
                </p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  Local partners across DBS Gate &amp; Selaqui
                </p>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">₹45 – ₹480</p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  Student-friendly transparent pricing
                </p>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {pilotSummary ? `${pilotSummary.averageRating.toFixed(1)} / 5.0` : '4.8 / 5.0'}
                </p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  Peer-reviewed reliability ratings
                </p>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {bookings.length} Active / Logged
                </p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  UPI &amp; Hostel Gate Cash on Delivery
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Marketplace Catalog & Campus Rewards */}
        <MarketplaceView
          services={filteredServices}
          loading={loading}
          loadError={loadError}
          activeCategory={activeCategory}
          activeArea={activeArea}
          searchQuery={searchQuery}
          sortBy={sortBy}
          compareIds={compareIds}
          recentlyAddedId={recentlyAddedId}
          bookingsCount={bookings.length}
          pendingOrdersCount={pendingOrdersCount}
          loyalty={loyalty}
          onCategoryChange={setActiveCategory}
          onAreaChange={setActiveArea}
          onSearchChange={setSearchQuery}
          onSortChange={setSortBy}
          onResetFilters={resetFilters}
          onRetryLoad={fetchInitialData}
          onToggleCompare={handleToggleCompare}
          onQuickAdd={handleQuickAdd}
          onOpenDetail={(s) => setSelectedService(s)}
          onOpenCompare={() => setCompareOpen(true)}
          onOpenBookings={() => setBookingsOpen(true)}
          onLoyaltyUpdated={setLoyalty}
          onApplyVoucherToBag={handleApplyVoucherToBag}
        />

        {/* Section 3: How CampusEase Works & Peer Proof */}
        <section className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors duration-150">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Built for DBS hostel life and local Selaqui businesses
              </h2>
              <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Designed around the daily routine of students living away from home—eliminating
                unorganized group messages and price guesswork.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <p className="text-xs font-semibold text-[#14532D] dark:text-emerald-400 tabular-nums">01.</p>
                <h3 className="mt-1.5 text-base font-semibold text-slate-900 dark:text-slate-100">
                  Verified Campus Providers
                </h3>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Every tiffin kitchen, laundry shop, print hub, and cab operator is vetted within
                  2.5 km of DBS Global University.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#14532D] dark:text-emerald-400 tabular-nums">02.</p>
                <h3 className="mt-1.5 text-base font-semibold text-slate-900 dark:text-slate-100">
                  Side-by-Side Student Pricing
                </h3>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Compare upfront per-meal, per-kg, and per-page rates before you order—with zero
                  last-minute haggling.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#14532D] dark:text-emerald-400 tabular-nums">03.</p>
                <h3 className="mt-1.5 text-base font-semibold text-slate-900 dark:text-slate-100">
                  Hostel Gate Pickup &amp; Flexible Pay
                </h3>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Schedule time slots around your classes and pay via UPI or Cash on Delivery right
                  at your hostel gate.
                </p>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-8">
              <blockquote className="p-6 rounded-xl bg-[#F6F7F6] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800">
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  “Before CampusEase, finding a laundry pickup or reliable morning cab meant asking
                  three different WhatsApp groups. Now I compare prices in ten seconds and book for
                  hostel gate drop.”
                </p>
                <footer className="mt-3 text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Riya Negi · MBA Hostel Resident, DBS Global University
                </footer>
              </blockquote>

              <blockquote className="p-6 rounded-xl bg-[#F6F7F6] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800">
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  “Fixed ₹0.80/page spiral printing and scheduled tiffin delivery saved me hours
                  during mid-sem exams. Having all local vendors verified in one place gives real
                  peace of mind.”
                </p>
                <footer className="mt-3 text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Rohan Chauhan · Postgraduate Student, Selaqui Dehradun
                </footer>
              </blockquote>
            </div>
          </div>
        </section>
      </main>

      {/* Section 4: Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors duration-150">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p>
            © 2026 CampusEase · Selaqui &amp; DBS Global University, Dehradun
          </p>
          <div className="flex flex-wrap items-center gap-6 font-medium text-slate-600 dark:text-slate-300">
            <a href="#catalog" className="hover:text-slate-900 dark:hover:text-white whitespace-nowrap">
              Browse Services
            </a>
            <a href="#rewards" className="hover:text-slate-900 dark:hover:text-white whitespace-nowrap">
              Rewards
            </a>
            <button
              type="button"
              onClick={() => setCompareOpen(true)}
              className="hover:text-slate-900 dark:hover:text-white whitespace-nowrap cursor-pointer"
            >
              Compare Providers
            </button>
            <button
              type="button"
              onClick={() => setBookingsOpen(true)}
              className="hover:text-slate-900 dark:hover:text-white whitespace-nowrap cursor-pointer"
            >
              My Bookings
            </button>
            <button
              type="button"
              onClick={() => setPartnerOpen(true)}
              className="hover:text-slate-900 dark:hover:text-white whitespace-nowrap cursor-pointer"
            >
              Become a Local Partner
            </button>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <ServiceDetailModal
        service={selectedService}
        onClose={() => setSelectedService(null)}
        onAddToBag={handleAddToBag}
        onReviewSubmitted={handleReviewSubmitted}
      />

      <CompareDrawer
        open={compareOpen}
        services={comparedServices}
        allServices={services}
        onClose={() => setCompareOpen(false)}
        onToggleCompare={handleToggleCompare}
        onQuickAdd={handleQuickAdd}
      />

      <BookingBagDrawer
        open={bagOpen}
        items={bag}
        activeVouchers={activeVouchers}
        prefilledPromoCode={prefilledPromoCode}
        studentProfile={studentProfile}
        onClose={() => setBagOpen(false)}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveBagItem}
        onBookingSuccess={handleBookingSuccess}
        onOpenMyBookings={() => setBookingsOpen(true)}
        onOpenAuth={handleOpenAuth}
      />

      <MyBookingsDrawer
        open={bookingsOpen}
        bookings={bookings}
        onClose={() => setBookingsOpen(false)}
        onStatusUpdated={handleBookingStatusUpdated}
        onReviewSubmitted={handleBookingReviewSubmitted}
      />

      <PartnerModal
        open={partnerOpen}
        onClose={() => setPartnerOpen(false)}
        onPartnerCreated={handlePartnerCreated}
      />

      <AuthModal
        open={authModalOpen}
        initialMode={authModalMode}
        currentUser={currentUser}
        existingProfile={studentProfile}
        onClose={() => setAuthModalOpen(false)}
        onProfileSaved={(profile) => setStudentProfile(profile)}
      />
    </div>
  );
}

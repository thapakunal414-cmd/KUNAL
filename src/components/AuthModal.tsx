import {useEffect, useState, type FormEvent} from 'react';
import {signInWithPopup, signOut, type User} from 'firebase/auth';
import {doc, getDoc, serverTimestamp, writeBatch} from 'firebase/firestore';
import {CheckCircle2, ShieldCheck, X} from 'lucide-react';
import {OperationType, auth, db, googleProvider, handleFirestoreError} from '../firebase';

export interface StudentProfile {
  uid: string;
  displayName: string;
  email: string;
  phone: string;
  hostelAddress: string;
  hostelArea: string;
  courseLabel: string;
}

interface AuthModalProps {
  open: boolean;
  initialMode: 'login' | 'signup';
  currentUser: User | null;
  existingProfile: StudentProfile | null;
  onClose: () => void;
  onProfileSaved: (profile: StudentProfile) => void;
}

const HOSTEL_PRESETS = [
  'DBS Boys Hostel · Block A',
  'DBS Boys Hostel · Block B',
  'DBS Girls Hostel · Main Gate',
  'Selaqui Student PG',
];

const COURSE_LABELS = [
  'MBA Student · Hostel Resident',
  'BBA / Undergraduate · Hostel',
  'Postgraduate · Selaqui PG',
  'Day Scholar · Dehradun',
];

export function AuthModal({
  open,
  initialMode,
  currentUser,
  existingProfile,
  onClose,
  onProfileSaved,
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [step, setStep] = useState<'auth' | 'complete-profile'>('auth');
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [hostelAddress, setHostelAddress] = useState('DBS Boys Hostel · Block B');
  const [phone, setPhone] = useState('');
  const [courseLabel, setCourseLabel] = useState(COURSE_LABELS[0]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
      if (currentUser && !existingProfile) {
        setPendingUser(currentUser);
        setDisplayName(currentUser.displayName || 'DBS Student');
        setStep('complete-profile');
      } else {
        setStep('auth');
        setPendingUser(null);
      }
    }
  }, [open, initialMode, currentUser, existingProfile]);

  if (!open) return null;

  async function saveStudentProfileToFirestore(user: User, details: {
    displayName: string;
    hostelAddress: string;
    phone: string;
    courseLabel: string;
  }) {
    const cleanName = details.displayName.trim().slice(0, 80) || 'DBS Student';
    const cleanHostel = details.hostelAddress.trim().slice(0, 140) || 'DBS Campus Gate';
    const cleanPhone = details.phone.trim().slice(0, 20);
    const cleanCourse = details.courseLabel.trim().slice(0, 60) || COURSE_LABELS[0];
    const cleanArea = cleanHostel.split('·')[0].trim().slice(0, 80) || 'Selaqui';

    const publicPath = `users/${user.uid}/public/profile`;
    const privatePath = `users/${user.uid}/private/info`;

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, publicPath), {
        uid: user.uid,
        displayName: cleanName,
        hostelArea: cleanArea,
        courseLabel: cleanCourse,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, privatePath), {
        uid: user.uid,
        email: (user.email || '').slice(0, 160),
        phone: cleanPhone,
        hostelAddress: cleanHostel,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();

      const profile: StudentProfile = {
        uid: user.uid,
        displayName: cleanName,
        email: user.email || '',
        phone: cleanPhone,
        hostelAddress: cleanHostel,
        hostelArea: cleanArea,
        courseLabel: cleanCourse,
      };
      onProfileSaved(profile);
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, privatePath);
    }
  }

  async function handleGoogleAuth() {
    setError(null);
    setBusy(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (!user.emailVerified) {
        setError('Please sign in with a verified Google email address.');
        setBusy(false);
        return;
      }

      if (mode === 'signup') {
        if (!phone.trim() || phone.trim().length < 7) {
          // Signed in with Google, now ask them to finish phone/hostel
          setPendingUser(user);
          setDisplayName(user.displayName || 'DBS Student');
          setStep('complete-profile');
          setBusy(false);
          return;
        }
        await saveStudentProfileToFirestore(user, {
          displayName: displayName.trim() || user.displayName || 'DBS Student',
          hostelAddress,
          phone,
          courseLabel,
        });
        return;
      }

      // Log In mode: check if student private profile already exists
      const privatePath = `users/${user.uid}/private/info`;
      const publicPath = `users/${user.uid}/public/profile`;
      try {
        const [privSnap, pubSnap] = await Promise.all([
          getDoc(doc(db, privatePath)),
          getDoc(doc(db, publicPath)),
        ]);

        if (privSnap.exists() && pubSnap.exists()) {
          const privData = privSnap.data();
          const pubData = pubSnap.data();
          onProfileSaved({
            uid: user.uid,
            displayName: pubData.displayName || user.displayName || 'DBS Student',
            email: privData.email || user.email || '',
            phone: privData.phone || '',
            hostelAddress: privData.hostelAddress || 'DBS Campus Gate',
            hostelArea: pubData.hostelArea || 'Selaqui',
            courseLabel: pubData.courseLabel || COURSE_LABELS[0],
          });
          onClose();
        } else {
          // First-time user logging in -> complete student onboarding profile
          setPendingUser(user);
          setDisplayName(user.displayName || 'DBS Student');
          setStep('complete-profile');
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, privatePath);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('popup-closed-by-user')) {
        setError('Google sign-in window was closed before completing.');
      } else if (msg.includes('popup-blocked')) {
        setError('Sign-in popup was blocked by your browser. Please allow popups and try again.');
      } else {
        setError('Could not complete Google authentication. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleCompleteProfileSubmit(e: FormEvent) {
    e.preventDefault();
    const user = pendingUser || auth.currentUser;
    if (!user) {
      setError('Session expired. Please sign in with Google again.');
      setStep('auth');
      return;
    }
    if (!phone.trim() || phone.trim().length < 7) {
      setError('Please enter a valid 10-digit mobile number for hostel gate alerts.');
      return;
    }

    setError(null);
    setBusy(true);
    try {
      await saveStudentProfileToFirestore(user, {
        displayName,
        hostelAddress,
        phone,
        courseLabel,
      });
    } catch {
      setError('Could not save your student profile. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-slate-950/75 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 id="auth-modal-title" className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              {step === 'complete-profile'
                ? 'Complete Student Sign Up'
                : mode === 'login'
                  ? 'Log In to CampusEase'
                  : 'Create Student Account'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              DBS Global University · Selaqui &amp; Dehradun
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {step === 'auth' ? (
            <>
              <div
                role="tablist"
                aria-label="Authentication mode"
                className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signup'}
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {mode === 'login' ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Sign in with your Google account to access your saved hostel address, track
                    campus bookings, and redeem loyalty points.
                  </p>

                  <div className="p-3.5 rounded-xl bg-[#F6F7F6] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#14532D] dark:text-emerald-400 shrink-0" />
                      <span>Auto-fill hostel block &amp; phone at checkout</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#14532D] dark:text-emerald-400 shrink-0" />
                      <span>Sync completed order loyalty points &amp; vouchers</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Set up your campus delivery defaults once, then verify with Google.
                  </p>

                  <div>
                    <label htmlFor="signup-name" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Full Name (Optional — defaults to Google name)
                    </label>
                    <input
                      id="signup-name"
                      type="text"
                      placeholder="e.g. Aarav Rawat"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="signup-hostel" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Hostel / PG Location
                    </label>
                    <input
                      id="signup-hostel"
                      type="text"
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="signup-phone" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Mobile Number
                      </label>
                      <input
                        id="signup-phone"
                        type="tel"
                        placeholder="10-digit number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="signup-course" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Student Role
                      </label>
                      <select
                        id="signup-course"
                        value={courseLabel}
                        onChange={(e) => setCourseLabel(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
                      >
                        {COURSE_LABELS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-xs font-medium text-red-600 dark:text-red-400" role="alert">
                  {error}
                </p>
              )}

              <button
                type="button"
                disabled={busy}
                onClick={handleGoogleAuth}
                className="w-full py-2.5 px-4 bg-[#14532D] hover:bg-[#166534] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  {busy
                    ? 'Connecting with Google...'
                    : mode === 'login'
                      ? 'Log In with Google'
                      : 'Sign Up with Google'}
                </span>
              </button>
            </>
          ) : (
            <form onSubmit={handleCompleteProfileSubmit} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Signed in as{' '}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {pendingUser?.email || currentUser?.email}
                </span>
                . Add your campus location and phone number to finish setting up your account.
              </p>

              <div>
                <label htmlFor="complete-name" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Display Name
                </label>
                <input
                  id="complete-name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="complete-hostel" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Hostel / PG Address
                </label>
                <input
                  id="complete-hostel"
                  type="text"
                  required
                  value={hostelAddress}
                  onChange={(e) => setHostelAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="complete-phone" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Number
                  </label>
                  <input
                    id="complete-phone"
                    type="tel"
                    required
                    placeholder="10-digit number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label htmlFor="complete-course" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Student Role
                  </label>
                  <select
                    id="complete-course"
                    value={courseLabel}
                    onChange={(e) => setCourseLabel(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#14532D] dark:focus:ring-emerald-500"
                  >
                    {COURSE_LABELS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <p className="text-xs font-medium text-red-600 dark:text-red-400" role="alert">
                  {error}
                </p>
              )}

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 py-2.5 px-4 bg-[#14532D] hover:bg-[#166534] dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {busy ? 'Saving Profile...' : 'Save & Continue'}
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-3 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

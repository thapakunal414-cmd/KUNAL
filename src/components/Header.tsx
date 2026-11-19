import {LogOut, Moon, ShoppingBag, Sun, User as UserIcon} from 'lucide-react';
import type {StudentProfile} from './AuthModal';

interface HeaderProps {
  bagCount: number;
  compareCount: number;
  bookingsCount: number;
  userEmail: string | null;
  studentProfile: StudentProfile | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenCompare: () => void;
  onOpenBookings: () => void;
  onOpenPartner: () => void;
  onOpenBag: () => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onSignOut: () => void;
}

export function Header({
  bagCount,
  compareCount,
  bookingsCount,
  userEmail,
  studentProfile,
  theme,
  onToggleTheme,
  onOpenCompare,
  onOpenBookings,
  onOpenPartner,
  onOpenBag,
  onOpenAuth,
  onSignOut,
}: HeaderProps) {
  const displayName = studentProfile?.displayName || userEmail?.split('@')[0] || 'Student';
  const isDark = theme === 'dark';

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 transition-colors duration-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-6">
        <a
          href="#catalog"
          className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14532D] dark:focus-visible:ring-emerald-500 rounded-sm"
        >
          CampusEase
        </a>

        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          <a
            href="#catalog"
            className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Services
          </a>
          <button
            type="button"
            onClick={onOpenCompare}
            className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {compareCount > 0 ? `Compare (${compareCount})` : 'Compare'}
          </button>
          <a
            href="#rewards"
            className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Rewards
          </a>
          <button
            type="button"
            onClick={onOpenBookings}
            className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {bookingsCount > 0 ? `Bookings (${bookingsCount})` : 'Bookings'}
          </button>
          <button
            type="button"
            onClick={onOpenPartner}
            className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Partner
          </button>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            role="switch"
            aria-checked={isDark}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={onToggleTheme}
            className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14532D] dark:focus-visible:ring-emerald-500"
          >
            {isDark ? (
              <Moon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            )}
            <span
              aria-hidden="true"
              className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors duration-150 ${
                isDark ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-150 ${
                  isDark ? 'translate-x-3.5' : 'translate-x-0.5'
                }`}
              />
            </span>
          </button>

          {userEmail ? (
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
                title={userEmail}
              >
                <UserIcon className="w-3.5 h-3.5 text-[#14532D] dark:text-emerald-400" />
                <span className="max-w-[110px] truncate">{displayName}</span>
              </button>
              <button
                type="button"
                onClick={onSignOut}
                aria-label="Log out"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenBag}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#14532D] hover:bg-[#166534] dark:bg-emerald-700 dark:hover:bg-emerald-600 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#14532D] dark:focus-visible:ring-emerald-500 dark:focus-visible:ring-offset-slate-900"
          >
            <ShoppingBag className="w-4 h-4" strokeWidth={2} />
            <span className="tabular-nums">
              {bagCount > 0 ? `Bag (${bagCount})` : 'Booking Bag'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}

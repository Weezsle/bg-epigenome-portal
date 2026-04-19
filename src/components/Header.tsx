import { useState, useRef, useEffect } from 'react';
import { TabDefinition } from './TabNavigation';

interface HeaderProps {
  nightMode: boolean;
  onToggleNightMode: () => void;
  onReset: () => void;
  tabs: TabDefinition[];
  currentTab: string;
  onTabChange: (tabId: string) => void;
}

const isDevEnv = typeof window !== 'undefined' && window.location.pathname.startsWith('/dev');
const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

function Header({ nightMode, onToggleNightMode, onReset, tabs, currentTab, onTabChange }: HeaderProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [devBannerDismissed, setDevBannerDismissed] = useState(false);
  const [localBannerDismissed, setLocalBannerDismissed] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);

  // Close the popover when clicking outside
  useEffect(() => {
    if (!showConfirm) return;
    const handler = (e: MouseEvent) => {
      if (confirmRef.current && !confirmRef.current.contains(e.target as Node)) {
        setShowConfirm(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showConfirm]);

  const handleConfirmReset = () => {
    setShowConfirm(false);
    onReset();
  };

  return (
    <header className={`${nightMode ? 'bg-science-900/95 border-science-800' : 'bg-white/95 border-science-200'} border-b backdrop-blur-md transition-colors duration-300 sticky top-0 z-50`}>
      {/* Dev environment banner */}
      {isDevEnv && !devBannerDismissed && (
        <div className="flex items-center justify-center gap-2 px-4 py-1.5 bg-amber-400 text-amber-900 text-xs font-semibold">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>
            Development Preview — This is an unstable development build. Visit{' '}
            <a
              href="https://basalganglia.epigenomes.net/"
              className="underline underline-offset-2 hover:text-amber-700 transition-colors"
            >
              basalganglia.epigenomes.net
            </a>{' '}
            for the stable release.
          </span>
          <button
            onClick={() => setDevBannerDismissed(true)}
            aria-label="Dismiss development banner"
            className="ml-2 p-0.5 rounded hover:bg-amber-500/40 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {/* Local dev environment banner */}
      {isLocalDev && !localBannerDismissed && (
        <div className="flex items-center justify-center gap-2 px-4 py-1.5 bg-violet-500 text-white text-xs font-semibold">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span>Local Dev — Running on localhost</span>
          <button
            onClick={() => setLocalBannerDismissed(true)}
            aria-label="Dismiss local dev banner"
            className="ml-2 p-0.5 rounded hover:bg-violet-400/40 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {/* Top bar with logo and controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shrink-0 ${
              nightMode ? 'bg-science-800 border-science-700' : 'bg-white border-science-200'
            } border shadow-sm`}>
              <img 
                src="/logo.png" 
                alt="BICAN Basal Ganglia Epigenome" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback: hide broken image
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            {/* Title area */}
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-xl font-bold tracking-tight ${nightMode ? 'text-white' : 'text-science-900'}`}>
                  Basal Ganglia Epigenome
                </h1>
                {/* BICAN badge */}
                <span className={`hidden sm:inline-flex px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded ${
                  nightMode ? 'bg-primary-500/20 text-primary-300' : 'bg-primary-100 text-primary-700'
                }`}>
                  BICAN
                </span>
              </div>
              <p className={`text-sm ${nightMode ? 'text-science-400' : 'text-science-600'}`}>
                Navigate the Brain Initiative Cell Atlas
              </p>
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-3">
            {/* Reset button with inline confirmation */}
            <div className="relative" ref={confirmRef}>
              <button
                onClick={() => setShowConfirm(v => !v)}
                className={`p-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  showConfirm
                    ? nightMode
                      ? 'bg-red-900/50 text-red-300 border border-red-700'
                      : 'bg-red-50 text-red-600 border border-red-300'
                    : nightMode
                      ? 'bg-science-800 text-science-200 hover:bg-science-700 border border-science-700'
                      : 'bg-science-100 text-science-700 hover:bg-science-200 border border-science-200'
                }`}
                aria-label="Reset all selections"
                title="Reset all selections"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden md:inline text-sm">Reset</span>
              </button>

              {/* Confirmation popover */}
              {showConfirm && (
                <div className={`absolute right-0 top-full mt-2 w-72 rounded-xl shadow-2xl border z-50 overflow-hidden ${
                  nightMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <div className={`px-4 py-3 border-b flex items-center gap-2 ${
                    nightMode ? 'bg-red-900/30 border-gray-700' : 'bg-red-50 border-gray-100'
                  }`}>
                    <svg className={`w-4 h-4 flex-shrink-0 ${nightMode ? 'text-red-400' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className={`text-sm font-semibold ${nightMode ? 'text-red-300' : 'text-red-700'}`}>
                      Reset Everything?
                    </span>
                  </div>
                  <div className="px-4 py-3">
                    <p className={`text-sm mb-4 ${nightMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      This will clear all taxonomy selections, deselect all tracks, and return you to a fresh state. This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleConfirmReset}
                        className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors"
                      >
                        Yes, Reset
                      </button>
                      <button
                        onClick={() => setShowConfirm(false)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          nightMode
                            ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Theme toggle */}
            <button
              onClick={onToggleNightMode}
              className={`p-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                nightMode
                  ? 'bg-science-800 text-science-200 hover:bg-science-700 border border-science-700'
                  : 'bg-science-100 text-science-700 hover:bg-science-200 border border-science-200'
              }`}
              aria-label={nightMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {nightMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
              <span className="hidden md:inline text-sm">{nightMode ? 'Light' : 'Dark'}</span>
            </button>

            {/* BICAN Portal link */}
            <a
              href="https://www.portal.brain-bican.org/"
              target="_blank"
              rel="noopener noreferrer"
              className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                nightMode
                  ? 'text-sky-400 hover:bg-sky-500/10'
                  : 'text-primary-600 hover:bg-primary-50'
              }`}
            >
              <span>BICAN Portal</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={`${nightMode ? 'bg-science-900/50' : 'bg-science-50/80'} border-t ${nightMode ? 'border-science-800' : 'border-science-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex -mb-px overflow-x-auto scrollbar-hide" role="tablist">
            {tabs.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  role="tab"
                  aria-selected={isActive}
                  className={`relative px-5 py-3.5 font-medium text-sm whitespace-nowrap transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                    isActive
                      ? nightMode
                        ? 'text-sky-400'
                        : 'text-primary-600'
                      : nightMode
                        ? 'text-science-400 hover:text-science-200'
                        : 'text-science-600 hover:text-science-900'
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <div
                      className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full ${
                        nightMode ? 'bg-sky-400' : 'bg-primary-500'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;

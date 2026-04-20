import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import Header from './components/Header';
import TabNavigation, { TabDefinition } from './components/TabNavigation';
import TaxonomySelection from './components/TaxonomySelection';
import AssaySelection from './components/AssaySelection';
import BrowserPanel from './components/BrowserPanel';
import DatasetOverview from './components/DatasetOverview';
import AboutSection from './components/AboutSection';
import LandingPage from './components/LandingPage';
import InteractiveGuide from './components/InteractiveGuide';
import SessionTab from './components/SessionTab';
import ScAnalysisTab from './components/ScAnalysisTab';
import TutorialTab from './components/TutorialTab';
import CookieBanner from './components/CookieBanner';
import { parseTaxonomyData, type TaxonomyNeighborhood, serializeTaxonomyStore } from './store/taxonomyStore';
import { parseTracksData, filterAndSortTracks, type Track } from './store/trackStore';
import { getCookie, setCookie } from './utils/cookieUtils';
import './style.css';

type TabId = 'tutorial' | 'taxonomy' | 'assay' | 'browser' | 'dataset' | 'about' | 'session' | 'scAnalysis';

// Valid tab IDs
const validTabIds: TabId[] = ['tutorial', 'taxonomy', 'assay', 'browser', 'dataset', 'about', 'session', 'scAnalysis'];

// Get initial tab from URL params
function getInitialTabFromURL(): TabId {
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get('tab');
  if (tabParam && validTabIds.includes(tabParam as TabId)) {
    return tabParam as TabId;
  }
  return 'tutorial';
}

function App() {
  // Check if user wants to skip landing page
  const skipLanding = getCookie('bge_skip_landing') === 'true';
  const [showLanding, setShowLanding] = useState(!skipLanding);
  const [nightMode, setNightMode] = useState(false); // Default to light mode
  const [currentTab, setCurrentTab] = useState<TabId>(() => getInitialTabFromURL());
  const [showGuide, setShowGuide] = useState(false);
  
  // Centralized taxonomy data store
  const [taxonomyData, setTaxonomyData] = useState<TaxonomyNeighborhood[]>(() => parseTaxonomyData());
  
  // Load all tracks data before page renders
  const [allTracks] = useState<Track[]>(() => parseTracksData());
  
  // Track states with selection managed at App level to persist across tab changes
  const [trackStates, setTrackStates] = useState<Track[]>([]);

  // Browser view region state
  const DEFAULT_VIEW_REGION = 'chr7:27053397-27373765';
  const [currentViewRegion, setCurrentViewRegion] = useState<string>(DEFAULT_VIEW_REGION);
  
  // Access serialized selections for debugging or passing to other components
  // Keep groups and subclasses separated to distinguish between them
  const taxonomySelections = useMemo(() => {
    return serializeTaxonomyStore(taxonomyData);
  }, [taxonomyData]);

  // Filter and sort tracks based on taxonomy selections at App level
  const sortedTracks = useMemo(() => {
    return filterAndSortTracks(allTracks, taxonomySelections, taxonomyData);
  }, [allTracks, taxonomySelections, taxonomyData]);

  // Track previous taxonomy selections to detect changes
  const prevTaxonomySelectionsRef = useRef<string | null>(null);

  // Helper function to serialize taxonomy selections for comparison
  const serializeTaxonomySelections = useCallback((selections: { groups: Record<string, boolean>, subclasses: Record<string, boolean> }): string => {
    return JSON.stringify({
      groups: Object.entries(selections.groups).filter(([_, v]) => v).map(([k]) => k).sort(),
      subclasses: Object.entries(selections.subclasses).filter(([_, v]) => v).map(([k]) => k).sort()
    });
  }, []);

  // Handle track selection logic at App level
  useEffect(() => {
    const currentTaxonomyString = serializeTaxonomySelections(taxonomySelections);
    const taxonomyChanged = prevTaxonomySelectionsRef.current !== null && 
                           prevTaxonomySelectionsRef.current !== currentTaxonomyString;

    if (taxonomyChanged) {
      // Taxonomy changed: deselect all tracks
      setTrackStates(sortedTracks.map(track => ({ ...track, selected: false })));
    } else if (prevTaxonomySelectionsRef.current === null && sortedTracks.length > 0) {
      // First load: deselect all tracks
      setTrackStates(sortedTracks.map(track => ({ ...track, selected: false })));
    } else if (!taxonomyChanged && trackStates.length > 0 && sortedTracks.length > 0) {
      // Taxonomy unchanged: preserve user selections
      const selectionMap = new Map<string, boolean>();
      trackStates.forEach(track => {
        selectionMap.set(track.config.url, track.selected || false);
      });

      // Check if sortedTracks structure changed (not just selections)
      const sortedTrackUrls = new Set(sortedTracks.map(t => t.config.url));
      const currentTrackUrls = new Set(trackStates.map(t => t.config.url));
      
      const structureChanged = sortedTrackUrls.size !== currentTrackUrls.size || 
                              Array.from(sortedTrackUrls).some(url => !currentTrackUrls.has(url));

      if (structureChanged) {
        // Apply preserved selections to the sorted tracks, default new tracks to unselected
        setTrackStates(sortedTracks.map(track => ({
          ...track,
          selected: selectionMap.has(track.config.url) 
            ? selectionMap.get(track.config.url)!
            : false
        })));
      }
    }

    // Update the reference for next comparison
    prevTaxonomySelectionsRef.current = currentTaxonomyString;
  // Note: trackStates is intentionally excluded to prevent infinite loops
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedTracks, taxonomySelections, serializeTaxonomySelections]);

  // Get selected tracks for the browser
  const selectedTracks = useMemo(() => {
    return trackStates.filter(track => track.selected);
  }, [trackStates]);

  // Handle loading a session
  const handleLoadSession = useCallback((loadedTaxonomyData: TaxonomyNeighborhood[], loadedTrackStates: Track[], loadedViewRegion?: string) => {
    setTaxonomyData(loadedTaxonomyData);
    setTrackStates(loadedTrackStates);
    if (loadedViewRegion) {
      setCurrentViewRegion(loadedViewRegion);
    }
    // Reset the previous taxonomy ref to prevent auto-selection
    prevTaxonomySelectionsRef.current = serializeTaxonomySelections(serializeTaxonomyStore(loadedTaxonomyData));
  }, [serializeTaxonomySelections]);

  // Reset everything to a fresh state
  const handleReset = useCallback(() => {
    const freshTaxonomy = parseTaxonomyData();
    setTaxonomyData(freshTaxonomy);
    setTrackStates([]);
    prevTaxonomySelectionsRef.current = null;
    setCurrentTab('taxonomy');
  }, []);

  // Large selection warning before opening browser
  const TRACK_WARNING_THRESHOLD = 30;
  const [pendingBrowserNav, setPendingBrowserNav] = useState(false);

  const handleTabChange = useCallback((tab: string) => {
    if (tab === 'browser' && selectedTracks.length > TRACK_WARNING_THRESHOLD) {
      setPendingBrowserNav(true);
      return;
    }
    setCurrentTab(tab as TabId);
  }, [selectedTracks.length]);

  const confirmBrowserNav = useCallback(() => {
    setPendingBrowserNav(false);
    setCurrentTab('browser');
  }, []);

  // Check if this is first visit and show guide
  useEffect(() => {
    if (!showLanding) {
      // User has entered the portal - check if they've seen the guide
      const hasSeenGuide = getCookie('bge_has_seen_guide') === 'true';
      if (!hasSeenGuide) {
        // First time user - show guide after a short delay
        const timer = setTimeout(() => {
          setShowGuide(true);
          setCookie('bge_has_seen_guide', 'true', 365);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [showLanding]);

  // Update URL when tab changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', currentTab);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
  }, [currentTab]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const tabFromURL = getInitialTabFromURL();
      setCurrentTab(tabFromURL);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const tabs: TabDefinition[] = useMemo(
    () => [
      { id: 'tutorial', label: 'Tutorial' },
      { id: 'taxonomy', label: 'Taxonomy Selection' },
      { id: 'assay', label: 'Assay Selection' },
      { id: 'browser', label: 'Browser' },
      { id: 'scAnalysis', label: 'scAnalysis' },
      { id: 'session', label: 'Session' },
      { id: 'dataset', label: 'Dataset' },
      { id: 'about', label: 'About' },
    ],
    []
  );

  // Show landing page first
  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} />;
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      nightMode 
        ? 'bg-science-900' 
        : 'bg-gradient-to-br from-science-50 via-primary-50/30 to-science-100'
    }`} style={currentTab === 'browser' || currentTab === 'scAnalysis' ? { height: '100vh', display: 'flex', flexDirection: 'column' } : {}}>
      {/* Subtle background pattern */}
      <div className={`fixed inset-0 pointer-events-none ${nightMode ? 'opacity-30' : 'opacity-50'}`}>
        <div className="absolute inset-0 pattern-neural" />
      </div>
      
      {/* Gradient mesh overlay for depth */}
      {nightMode && (
        <div className="fixed inset-0 pointer-events-none gradient-mesh opacity-50" />
      )}

      <div className={`relative z-10 ${currentTab === 'browser' || currentTab === 'scAnalysis' ? 'flex flex-col flex-1' : ''}`} style={currentTab === 'browser' || currentTab === 'scAnalysis' ? { minHeight: 0, overflow: 'hidden' } : {}}>
        {/* Interactive Guide Overlay */}
        {showGuide && (
          <InteractiveGuide
            nightMode={nightMode}
            onComplete={() => setShowGuide(false)}
            onSkip={() => setShowGuide(false)}
            onTabChange={(tab) => setCurrentTab(tab as TabId)}
          />
        )}

        <Header 
          nightMode={nightMode} 
          onToggleNightMode={() => setNightMode(!nightMode)}
          onReset={handleReset}
          tabs={tabs}
          currentTab={currentTab}
          onTabChange={handleTabChange}
        />

        {/* Browser and scAnalysis tabs use full width and maximize vertical space */}
        {currentTab === 'browser' || currentTab === 'scAnalysis' ? (
          <main className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-4" style={{ minHeight: 0, overflow: 'hidden' }}>
            <section className="animate-fade-in flex-1 flex flex-col" style={{ minHeight: 0, overflow: 'hidden' }}>
              {currentTab === 'browser' && (
                <BrowserPanel 
                  nightMode={nightMode}
                  selectedTracks={selectedTracks}
                  viewRegion={currentViewRegion}
                  onViewRegionChange={setCurrentViewRegion}
                />
              )}
              {currentTab === 'scAnalysis' && (
                <ScAnalysisTab nightMode={nightMode} />
              )}
            </section>
          </main>
        ) : (
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Tab content with animations */}
            <section className="animate-fade-in">
              {currentTab === 'tutorial' && (
                <TutorialTab 
                  nightMode={nightMode}
                  onNavigate={(tab) => setCurrentTab(tab as TabId)}
                />
              )}
              {currentTab === 'taxonomy' && (
                <TaxonomySelection 
                  nightMode={nightMode} 
                  taxonomyData={taxonomyData}
                  setTaxonomyData={setTaxonomyData}
                  onNextStep={() => setCurrentTab('assay')}
                />
              )}
              {currentTab === 'assay' && (
                <AssaySelection 
                  nightMode={nightMode} 
                  trackStates={trackStates}
                  setTrackStates={setTrackStates}
                  onNextStep={() => handleTabChange('browser')}
                />
              )}
              {currentTab === 'dataset' && <DatasetOverview nightMode={nightMode} />}
              {currentTab === 'about' && <AboutSection nightMode={nightMode} />}
              {currentTab === 'session' && (
                <SessionTab 
                  nightMode={nightMode}
                  taxonomyData={taxonomyData}
                  trackStates={trackStates}
                  currentViewRegion={currentViewRegion}
                  onLoadSession={handleLoadSession}
                  onShowLanding={() => setShowLanding(true)}
                  onStartGuide={() => setShowGuide(true)}
                />
              )}
            </section>
          </main>
        )}

        <footer className={`shrink-0 ${
          nightMode 
            ? 'bg-science-900/80 border-science-800' 
            : 'bg-white/80 border-science-200'
        } border-t backdrop-blur-sm transition-colors duration-300`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <span className={`text-sm font-medium ${nightMode ? 'text-science-300' : 'text-science-700'}`}>
                  BGE Navigator
                </span>
                <span className={`text-sm ${nightMode ? 'text-science-500' : 'text-science-400'}`}>
                  © {new Date().getFullYear()}
                </span>
              </div>
              <div className="flex items-center gap-6">
                <a 
                  href="https://www.portal.brain-bican.org/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`text-sm transition-colors ${
                    nightMode 
                      ? 'text-science-400 hover:text-sky-400' 
                      : 'text-science-500 hover:text-primary-600'
                  }`}
                >
                  BICAN Portal
                </a>
                <span className={`w-1 h-1 rounded-full ${nightMode ? 'bg-science-700' : 'bg-science-300'}`} />
                <span className={`text-sm ${nightMode ? 'text-science-500' : 'text-science-400'}`}>
                  Supported by NIH BRAIN Initiative
                </span>
              </div>
            </div>
          </div>
        </footer>

        {/* Cookie Banner */}
        <CookieBanner nightMode={nightMode} />

        {/* Large track selection warning modal */}
        {pendingBrowserNav && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className={`mx-4 max-w-md w-full rounded-2xl shadow-2xl p-6 space-y-4 ${
              nightMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  nightMode ? 'bg-amber-500/20' : 'bg-amber-100'
                }`}>
                  <svg className={`w-5 h-5 ${nightMode ? 'text-amber-400' : 'text-amber-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold">Large Number of Tracks</h3>
              </div>

              <p className={`text-sm leading-relaxed ${nightMode ? 'text-gray-300' : 'text-gray-600'}`}>
                You have <strong className={nightMode ? 'text-white' : 'text-gray-900'}>{selectedTracks.length} tracks</strong> selected.
                Loading many tracks simultaneously may take a while and could cause the browser to become slow or unresponsive.
              </p>
              <p className={`text-sm leading-relaxed ${nightMode ? 'text-gray-400' : 'text-gray-500'}`}>
                For best performance, consider selecting fewer than {TRACK_WARNING_THRESHOLD} tracks at a time. You can always come back and load more.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setPendingBrowserNav(false)}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    nightMode
                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Go Back
                </button>
                <button
                  onClick={confirmBrowserNav}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    nightMode
                      ? 'bg-primary-600 text-white hover:bg-primary-500'
                      : 'bg-primary-500 text-white hover:bg-primary-600'
                  }`}
                >
                  Continue Anyway
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

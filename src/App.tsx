import { useMemo, useState, useCallback, useEffect } from 'react';
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
import CookieBanner from './components/CookieBanner';
import { parseTaxonomyData, type TaxonomyNeighborhood, serializeTaxonomyStore } from './store/taxonomyStore';
import { parseTracksData, type Track } from './store/trackStore';
import { getCookie, setCookie } from './utils/cookieUtils';
import './style.css';

type TabId = 'taxonomy' | 'assay' | 'browser' | 'dataset' | 'about' | 'session' | 'scAnalysis';

// Valid tab IDs
const validTabIds: TabId[] = ['taxonomy', 'assay', 'browser', 'dataset', 'about', 'session', 'scAnalysis'];

// Get initial tab from URL params
function getInitialTabFromURL(): TabId {
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get('tab');
  if (tabParam && validTabIds.includes(tabParam as TabId)) {
    return tabParam as TabId;
  }
  return 'taxonomy';
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
  
  // Selected tracks for browser (passed from AssaySelection)
  const [selectedTracks, setSelectedTracks] = useState<Track[]>([]);
  
  // Access serialized selections for debugging or passing to other components
  // Keep groups and subclasses separated to distinguish between them
  const taxonomySelections = useMemo(() => {
    return serializeTaxonomyStore(taxonomyData);
  }, [taxonomyData]);

  // Callback to update selected tracks from AssaySelection
  const handleTracksUpdate = useCallback((tracks: Track[]) => {
    setSelectedTracks(tracks);
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
          tabs={tabs}
          currentTab={currentTab}
          onTabChange={(tab) => setCurrentTab(tab as TabId)}
        />

        {/* Browser and scAnalysis tabs use full width and maximize vertical space */}
        {currentTab === 'browser' || currentTab === 'scAnalysis' ? (
          <main className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-4" style={{ minHeight: 0, overflow: 'hidden' }}>
            <section className="animate-fade-in flex-1 flex flex-col" style={{ minHeight: 0, overflow: 'hidden' }}>
              {currentTab === 'browser' && (
                <BrowserPanel 
                  nightMode={nightMode}
                  selectedTracks={selectedTracks}
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
                  allTracks={allTracks}
                  taxonomySelections={taxonomySelections}
                  taxonomyData={taxonomyData}
                  onTracksUpdate={handleTracksUpdate}
                  onNextStep={() => setCurrentTab('browser')}
                />
              )}
              {currentTab === 'dataset' && <DatasetOverview nightMode={nightMode} />}
              {currentTab === 'about' && <AboutSection nightMode={nightMode} />}
              {currentTab === 'session' && (
                <SessionTab 
                  nightMode={nightMode} 
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
      </div>
    </div>
  );
}

export default App;

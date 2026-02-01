import type { FC } from 'react';

type TutorialTabProps = {
  nightMode: boolean;
  onNavigate?: (tab: string) => void;
};

const TutorialTab: FC<TutorialTabProps> = ({ nightMode, onNavigate }) => {
  return (
    <div className={`space-y-8 ${nightMode ? 'text-gray-200' : 'text-gray-800'}`}>
      {/* Header Section */}
      <div className="rounded-2xl shadow-xl p-8 gradient-science text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pattern-neural" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 text-xs font-semibold tracking-wider uppercase rounded-full bg-white/20">
              Getting Started
            </span>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight">Tutorial & Workflow Guide</h3>
          <p className="text-base text-white/80 mt-2 leading-relaxed max-w-3xl">
            Learn how to navigate the BGE Navigator portal and explore brain cell epigenome data effectively.
          </p>
        </div>
      </div>

      {/* Quick Start Workflow */}
      <div className={`rounded-2xl shadow-xl p-6 ${
        nightMode ? 'card-science-dark' : 'card-science'
      }`}>
        <h4 className={`text-xl font-bold mb-4 ${nightMode ? 'text-white' : 'text-science-900'}`}>
          🚀 Quick Start Workflow
        </h4>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
              nightMode ? 'bg-primary-500/20 text-primary-400' : 'bg-primary-100 text-primary-700'
            }`}>
              1
            </div>
            <div className="flex-1">
              <button
                onClick={() => onNavigate?.('taxonomy')}
                className={`text-left font-semibold mb-1 hover:underline ${
                  nightMode ? 'text-primary-400' : 'text-primary-600'
                }`}
              >
                Taxonomy Selection →
              </button>
              <p className={`text-sm ${nightMode ? 'text-science-300' : 'text-science-700'}`}>
                Select cell types by taxonomy (subclasses/groups) and assay type
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
              nightMode ? 'bg-primary-500/20 text-primary-400' : 'bg-primary-100 text-primary-700'
            }`}>
              2
            </div>
            <div className="flex-1">
              <button
                onClick={() => onNavigate?.('assay')}
                className={`text-left font-semibold mb-1 hover:underline ${
                  nightMode ? 'text-primary-400' : 'text-primary-600'
                }`}
              >
                Assay Selection →
              </button>
              <p className={`text-sm ${nightMode ? 'text-science-300' : 'text-science-700'}`}>
                Filter and select specific tracks to visualize in the browser
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
              nightMode ? 'bg-primary-500/20 text-primary-400' : 'bg-primary-100 text-primary-700'
            }`}>
              3
            </div>
            <div className="flex-1">
              <button
                onClick={() => onNavigate?.('browser')}
                className={`text-left font-semibold mb-1 hover:underline ${
                  nightMode ? 'text-primary-400' : 'text-primary-600'
                }`}
              >
                Browser →
              </button>
              <p className={`text-sm ${nightMode ? 'text-science-300' : 'text-science-700'}`}>
                Explore your selected tracks in the WashU Epigenome Browser
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Descriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Taxonomy Selection Tab */}
        <div className={`rounded-xl p-6 ${
          nightMode ? 'bg-science-800/50 border border-science-700' : 'bg-white border border-science-200'
        } shadow-lg`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              nightMode ? 'bg-purple-500/20' : 'bg-purple-100'
            }`}>
              <svg className={`w-6 h-6 ${nightMode ? 'text-purple-400' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <button
              onClick={() => onNavigate?.('taxonomy')}
              className={`text-lg font-bold hover:underline ${nightMode ? 'text-white' : 'text-science-900'}`}
            >
              Taxonomy Selection
            </button>
          </div>
          <p className={`mb-3 ${nightMode ? 'text-science-300' : 'text-science-700'}`}>
            Start your exploration by selecting cell types based on their taxonomic classification.
          </p>
          <ul className={`space-y-2 text-sm ${nightMode ? 'text-science-400' : 'text-science-600'}`}>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Choose from three assay types: HMBA, PairedTag, or snm3C</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Select cell type subclasses or individual groups</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Use search to quickly find specific cell types</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>View region distribution charts for selected cells</span>
            </li>
          </ul>
        </div>

        {/* Assay Selection Tab */}
        <div className={`rounded-xl p-6 ${
          nightMode ? 'bg-science-800/50 border border-science-700' : 'bg-white border border-science-200'
        } shadow-lg`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              nightMode ? 'bg-blue-500/20' : 'bg-blue-100'
            }`}>
              <svg className={`w-6 h-6 ${nightMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <button
              onClick={() => onNavigate?.('assay')}
              className={`text-lg font-bold hover:underline ${nightMode ? 'text-white' : 'text-science-900'}`}
            >
              Assay Selection
            </button>
          </div>
          <p className={`mb-3 ${nightMode ? 'text-science-300' : 'text-science-700'}`}>
            Filter and refine the available tracks based on your taxonomy selections.
          </p>
          <ul className={`space-y-2 text-sm ${nightMode ? 'text-science-400' : 'text-science-600'}`}>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>View tracks filtered by selected cell types</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Search by subclass, group, assay, modality, or source</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Batch select by assay, modality, or species</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Check specific tracks to display in the browser</span>
            </li>
          </ul>
        </div>

        {/* Browser Tab */}
        <div className={`rounded-xl p-6 ${
          nightMode ? 'bg-science-800/50 border border-science-700' : 'bg-white border border-science-200'
        } shadow-lg`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              nightMode ? 'bg-green-500/20' : 'bg-green-100'
            }`}>
              <svg className={`w-6 h-6 ${nightMode ? 'text-green-400' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <button
              onClick={() => onNavigate?.('browser')}
              className={`text-lg font-bold hover:underline ${nightMode ? 'text-white' : 'text-science-900'}`}
            >
              Browser
            </button>
          </div>
          <p className={`mb-3 ${nightMode ? 'text-science-300' : 'text-science-700'}`}>
            Visualize your selected tracks in the WashU Epigenome Browser.
          </p>
          <ul className={`space-y-2 text-sm ${nightMode ? 'text-science-400' : 'text-science-600'}`}>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Interactive genome browser with multi-species support</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Pan and zoom to explore genomic regions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Toggle fullscreen mode for detailed analysis</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Genome alignment tracks for cross-species comparison</span>
            </li>
          </ul>
        </div>

        {/* scAnalysis Tab */}
        <div className={`rounded-xl p-6 ${
          nightMode ? 'bg-science-800/50 border border-science-700' : 'bg-white border border-science-200'
        } shadow-lg`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              nightMode ? 'bg-orange-500/20' : 'bg-orange-100'
            }`}>
              <svg className={`w-6 h-6 ${nightMode ? 'text-orange-400' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <button
              onClick={() => onNavigate?.('scAnalysis')}
              className={`text-lg font-bold hover:underline ${nightMode ? 'text-white' : 'text-science-900'}`}
            >
              scAnalysis
            </button>
          </div>
          <p className={`mb-3 ${nightMode ? 'text-science-300' : 'text-science-700'}`}>
            Access single-cell RNA-seq analysis tools and visualizations.
          </p>
          <ul className={`space-y-2 text-sm ${nightMode ? 'text-science-400' : 'text-science-600'}`}>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Interactive single-cell analysis interface</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Explore cell type classifications and markers</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Visualize gene expression patterns</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Integration with taxonomy selections</span>
            </li>
          </ul>
        </div>

        {/* Session Tab */}
        <div className={`rounded-xl p-6 ${
          nightMode ? 'bg-science-800/50 border border-science-700' : 'bg-white border border-science-200'
        } shadow-lg`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              nightMode ? 'bg-cyan-500/20' : 'bg-cyan-100'
            }`}>
              <svg className={`w-6 h-6 ${nightMode ? 'text-cyan-400' : 'text-cyan-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </div>
            <button
              onClick={() => onNavigate?.('session')}
              className={`text-lg font-bold hover:underline ${nightMode ? 'text-white' : 'text-science-900'}`}
            >
              Session
            </button>
          </div>
          <p className={`mb-3 ${nightMode ? 'text-science-300' : 'text-science-700'}`}>
            Save and restore your work sessions for later analysis.
          </p>
          <ul className={`space-y-2 text-sm ${nightMode ? 'text-science-400' : 'text-science-600'}`}>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Save current taxonomy and track selections</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Load previously saved sessions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Export sessions as JSON files</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Import sessions from JSON files</span>
            </li>
          </ul>
        </div>

        {/* Dataset Tab */}
        <div className={`rounded-xl p-6 ${
          nightMode ? 'bg-science-800/50 border border-science-700' : 'bg-white border border-science-200'
        } shadow-lg`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              nightMode ? 'bg-indigo-500/20' : 'bg-indigo-100'
            }`}>
              <svg className={`w-6 h-6 ${nightMode ? 'text-indigo-400' : 'text-indigo-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <button
              onClick={() => onNavigate?.('dataset')}
              className={`text-lg font-bold hover:underline ${nightMode ? 'text-white' : 'text-science-900'}`}
            >
              Dataset
            </button>
          </div>
          <p className={`mb-3 ${nightMode ? 'text-science-300' : 'text-science-700'}`}>
            Learn about the datasets and data sources used in the portal.
          </p>
          <ul className={`space-y-2 text-sm ${nightMode ? 'text-science-400' : 'text-science-600'}`}>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Overview of available datasets</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Data sources and contributors</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Statistics on cell types and assays</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Data access and citation information</span>
            </li>
          </ul>
        </div>

        {/* About Tab */}
        <div className={`rounded-xl p-6 ${
          nightMode ? 'bg-science-800/50 border border-science-700' : 'bg-white border border-science-200'
        } shadow-lg`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              nightMode ? 'bg-pink-500/20' : 'bg-pink-100'
            }`}>
              <svg className={`w-6 h-6 ${nightMode ? 'text-pink-400' : 'text-pink-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <button
              onClick={() => onNavigate?.('about')}
              className={`text-lg font-bold hover:underline ${nightMode ? 'text-white' : 'text-science-900'}`}
            >
              About
            </button>
          </div>
          <p className={`mb-3 ${nightMode ? 'text-science-300' : 'text-science-700'}`}>
            Information about the portal, project, and how to get help.
          </p>
          <ul className={`space-y-2 text-sm ${nightMode ? 'text-science-400' : 'text-science-600'}`}>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Project overview and goals</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Contact information and issue tracker</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Contributors and acknowledgments</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              <span>Links to related resources</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Tips & Best Practices */}
      <div className={`rounded-2xl shadow-xl p-6 ${
        nightMode ? 'card-science-dark' : 'card-science'
      }`}>
        <h4 className={`text-xl font-bold mb-4 ${nightMode ? 'text-white' : 'text-science-900'}`}>
          💡 Tips & Best Practices
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg ${
            nightMode ? 'bg-science-800/50' : 'bg-science-50'
          }`}>
            <h5 className={`font-semibold mb-2 ${nightMode ? 'text-primary-400' : 'text-primary-600'}`}>
              Start Broad, Then Narrow
            </h5>
            <p className={`text-sm ${nightMode ? 'text-science-300' : 'text-science-700'}`}>
              Begin by selecting subclasses to see a broader range of cell types, then refine your selection to specific groups as needed.
            </p>
          </div>
          
          <div className={`p-4 rounded-lg ${
            nightMode ? 'bg-science-800/50' : 'bg-science-50'
          }`}>
            <h5 className={`font-semibold mb-2 ${nightMode ? 'text-primary-400' : 'text-primary-600'}`}>
              Use Search Effectively
            </h5>
            <p className={`text-sm ${nightMode ? 'text-science-300' : 'text-science-700'}`}>
              Search bars support multiple keywords. Type multiple terms separated by spaces to find specific cell types or tracks quickly.
            </p>
          </div>
          
          <div className={`p-4 rounded-lg ${
            nightMode ? 'bg-science-800/50' : 'bg-science-50'
          }`}>
            <h5 className={`font-semibold mb-2 ${nightMode ? 'text-primary-400' : 'text-primary-600'}`}>
              Save Your Sessions
            </h5>
            <p className={`text-sm ${nightMode ? 'text-science-300' : 'text-science-700'}`}>
              Use the Session tab to save your work. This allows you to continue your analysis later or share your selections with colleagues.
            </p>
          </div>
          
          <div className={`p-4 rounded-lg ${
            nightMode ? 'bg-science-800/50' : 'bg-science-50'
          }`}>
            <h5 className={`font-semibold mb-2 ${nightMode ? 'text-primary-400' : 'text-primary-600'}`}>
              Batch Selection
            </h5>
            <p className={`text-sm ${nightMode ? 'text-science-300' : 'text-science-700'}`}>
              Use batch selection tools to quickly add all tracks of a specific assay, modality, or species to your browser view.
            </p>
          </div>
        </div>
      </div>

      {/* Help & Support */}
      <div className={`rounded-2xl shadow-xl p-6 ${
        nightMode ? 'card-science-dark' : 'card-science'
      }`}>
        <h4 className={`text-xl font-bold mb-4 ${nightMode ? 'text-white' : 'text-science-900'}`}>
          🆘 Need Help or Found an Issue?
        </h4>
        <div className={`p-4 rounded-lg mb-4 ${
          nightMode ? 'bg-science-800/50 border border-science-700' : 'bg-science-50 border border-science-200'
        }`}>
          <p className={`mb-4 ${nightMode ? 'text-science-300' : 'text-science-700'}`}>
            If you encounter any bugs, have feature requests, or need assistance using the portal, please visit our GitHub issue tracker.
          </p>
          <a
            href="https://github.com/twlab/bg-epigenome-portal/issues"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              nightMode 
                ? 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border border-orange-500/30' 
                : 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Report an Issue or Request a Feature</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
        <p className={`text-sm ${nightMode ? 'text-science-400' : 'text-science-600'}`}>
          You can also explore the{' '}
          <button
            onClick={() => onNavigate?.('about')}
            className={`font-medium hover:underline ${nightMode ? 'text-primary-400' : 'text-primary-600'}`}
          >
            About tab
          </button>
          {' '}for more information about the project and related resources.
        </p>
      </div>

      {/* Get Started Button */}
      <div className="flex justify-center pt-6">
        <button
          onClick={() => onNavigate?.('taxonomy')}
          className={`group relative px-8 py-4 text-lg font-bold rounded-2xl shadow-2xl transition-all transform hover:scale-105 active:scale-95 ${
            nightMode
              ? 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white'
              : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white'
          }`}
        >
          <span className="flex items-center gap-3">
            <svg 
              className="w-6 h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Get Started with Taxonomy Selection</span>
            <svg 
              className="w-6 h-6 transition-transform group-hover:translate-x-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
          <div className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
        </button>
      </div>
    </div>
  );
};

export default TutorialTab;

import React, { useState, useEffect, useRef, type FC } from 'react';
import { deleteCookie } from '../utils/cookieUtils';
import type { TaxonomyNeighborhood } from '../store/taxonomyStore';
import type { Track } from '../store/trackStore';
import type { Session } from '../types/session';
import {
  getAllSessions,
  saveSession,
  deleteSession,
  downloadSessionAsJSON,
  importSessionFromFile,
  getSessionMetadata,
  formatDate,
} from '../utils/sessionUtils';

// ============================================================================
// Dialog Types & State
// ============================================================================

type DialogType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  type: DialogType;
  onConfirm?: () => void;
}

const initialDialogState: DialogState = {
  isOpen: false,
  title: '',
  message: '',
  type: 'info',
  onConfirm: undefined,
};

// ============================================================================
// Types
// ============================================================================

type SessionTabProps = {
  nightMode: boolean;
  taxonomyData: TaxonomyNeighborhood[];
  trackStates: Track[];
  currentViewRegion: string;
  onLoadSession: (taxonomyData: TaxonomyNeighborhood[], trackStates: Track[], viewRegion?: string) => void;
  onShowLanding: () => void;
  onStartGuide: () => void;
};

// ============================================================================
// Icons
// ============================================================================

const SaveIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);

const LoadIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const DownloadIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const UploadIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const TrashIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const PlayIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const HomeIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

// Cell/Neuron icon for taxonomy
const CellIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <circle cx="12" cy="12" r="5" strokeWidth={1.5} />
    <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.3" />
    <path strokeLinecap="round" strokeWidth={1.5} d="M12 7V3" />
    <path strokeLinecap="round" strokeWidth={1.5} d="M12 21v-4" />
    <path strokeLinecap="round" strokeWidth={1.5} d="M17 12h4" />
    <path strokeLinecap="round" strokeWidth={1.5} d="M3 12h4" />
    <path strokeLinecap="round" strokeWidth={1.5} d="M15.5 8.5l2.5-2.5" />
    <path strokeLinecap="round" strokeWidth={1.5} d="M6 18l2.5-2.5" />
    <path strokeLinecap="round" strokeWidth={1.5} d="M15.5 15.5l2.5 2.5" />
    <path strokeLinecap="round" strokeWidth={1.5} d="M6 6l2.5 2.5" />
  </svg>
);

// Track/Data icon
const TrackIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

// ============================================================================
// Main Component
// ============================================================================

const SessionTab: FC<SessionTabProps> = ({
  nightMode,
  taxonomyData = [],
  trackStates = [],
  currentViewRegion,
  onLoadSession,
  onShowLanding,
  onStartGuide,
}) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Dialog state
  const [dialog, setDialog] = useState<DialogState>(initialDialogState);
  const pendingActionRef = useRef<(() => void) | null>(null);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = () => {
    try {
      const loadedSessions = getAllSessions();
      setSessions(loadedSessions || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      setSessions([]);
    }
  };

  const showDialog = (
    title: string,
    message: string,
    type: DialogType = 'info',
    onConfirm?: () => void
  ) => {
    setDialog({
      isOpen: true,
      title,
      message,
      type,
      onConfirm,
    });
  };

  const closeDialog = () => {
    setDialog(initialDialogState);
  };

  const handleSaveSession = () => {
    if (!sessionName.trim()) {
      showDialog('Missing Name', 'Please enter a session name.', 'warning');
      return;
    }

    try {
      saveSession(sessionName, sessionDescription, taxonomyData || [], trackStates || [], currentViewRegion);
      loadSessions();
      setShowSaveDialog(false);
      setSessionName('');
      setSessionDescription('');
      showDialog('Success', 'Session saved successfully!', 'success');
    } catch (error) {
      showDialog('Error', `Failed to save session: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleLoadSession = (session: Session) => {
    showDialog(
      'Load Session',
      `Load session "${session.name}"? This will replace your current selections.`,
      'confirm',
      () => {
        onLoadSession(session.taxonomyData, session.trackStates, session.currentViewRegion);
        showDialog('Success', 'Session loaded successfully!', 'success');
      }
    );
  };

  const handleDeleteSession = (sessionId: string, sessionName: string) => {
    showDialog(
      'Delete Session',
      `Delete session "${sessionName}"? This action cannot be undone.`,
      'confirm',
      () => {
        deleteSession(sessionId);
        loadSessions();
        showDialog('Deleted', 'Session has been deleted.', 'success');
      }
    );
  };

  const handleExportSession = (session: Session) => {
    try {
      downloadSessionAsJSON(session);
      showDialog('Exported', `Session "${session.name}" has been exported as JSON.`, 'success');
    } catch (error) {
      showDialog('Error', `Failed to export session: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleImportSession = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const session = await importSessionFromFile(file);
      
      // Save the imported session
      const allSessions = getAllSessions();
      allSessions.push(session);
      localStorage.setItem('bge_sessions', JSON.stringify(allSessions));
      
      loadSessions();
      showDialog('Imported', `Session "${session.name}" has been imported successfully!`, 'success');
    } catch (error) {
      showDialog('Import Failed', `Failed to import session: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleShowLanding = () => {
    deleteCookie('bge_skip_landing');
    onShowLanding();
  };

  // Check if there are any taxonomy selections or track selections
  const hasTaxonomySelections = taxonomyData?.some(n => 
    n.classes?.some(c => 
      c.subclasses?.some(s => 
        s.isSelected || s.groups?.some(g => g.isSelected)
      )
    )
  ) ?? false;
  const hasTrackSelections = (trackStates?.length ?? 0) > 0;
  const canSaveSession = hasTaxonomySelections || hasTrackSelections;

  // Count taxonomy selections
  const taxonomySelectionCount = taxonomyData?.reduce((count, n) => {
    return count + (n.classes?.reduce((cCount, c) => {
      return cCount + (c.subclasses?.reduce((sCount, s) => {
        let subCount = s.isSelected ? 1 : 0;
        subCount += s.groups?.filter(g => g.isSelected).length ?? 0;
        return sCount + subCount;
      }, 0) ?? 0);
    }, 0) ?? 0);
  }, 0) ?? 0;

  const selectedTrackCount = trackStates?.filter(t => t.selected).length ?? 0;

  return (
    <div className={`space-y-6 ${nightMode ? 'text-gray-200' : 'text-gray-800'}`}>
      {/* Custom Dialog */}
      {dialog.isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={closeDialog}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          
          {/* Dialog */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-md rounded-2xl shadow-2xl transform transition-all duration-200 animate-fade-in ${
              nightMode 
                ? 'bg-science-900 border border-science-700' 
                : 'bg-white'
            }`}
          >
            <div className="p-6">
              {/* Icon and Title */}
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                  dialog.type === 'success' ? (nightMode ? 'bg-green-500/20' : 'bg-green-100') :
                  dialog.type === 'warning' ? (nightMode ? 'bg-amber-500/20' : 'bg-amber-100') :
                  dialog.type === 'error' ? (nightMode ? 'bg-red-500/20' : 'bg-red-100') :
                  (nightMode ? 'bg-blue-500/20' : 'bg-blue-100')
                }`}>
                  {dialog.type === 'success' ? (
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : dialog.type === 'warning' ? (
                    <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : dialog.type === 'error' ? (
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : dialog.type === 'confirm' ? (
                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-lg font-semibold mb-2 ${
                    nightMode ? 'text-white' : 'text-science-900'
                  }`}>
                    {dialog.title}
                  </h3>
                  <p className={`text-sm leading-relaxed ${
                    nightMode ? 'text-science-300' : 'text-science-600'
                  }`}>
                    {dialog.message}
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className={`flex gap-3 mt-6 ${dialog.type === 'confirm' ? 'justify-end' : 'justify-center'}`}>
                {dialog.type === 'confirm' && (
                  <button
                    onClick={closeDialog}
                    className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                      nightMode
                        ? 'bg-science-800 text-science-300 hover:bg-science-700 border border-science-700'
                        : 'bg-science-100 text-science-700 hover:bg-science-200 border border-science-200'
                    }`}
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={() => {
                    if (dialog.onConfirm) dialog.onConfirm();
                    closeDialog();
                  }}
                  className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                    dialog.type === 'error'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : dialog.type === 'warning'
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {dialog.type === 'confirm' ? 'Confirm' : 'OK'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="rounded-2xl shadow-xl p-8 gradient-science text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pattern-neural" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 text-xs font-semibold tracking-wider uppercase rounded-full bg-white/20">
              Session
            </span>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight">Session Management</h3>
          <p className="text-base text-white/80 mt-2 leading-relaxed max-w-2xl">
            Save, load, export, and import your taxonomy and track selections.
          </p>
        </div>
      </div>

      {/* Current State Summary */}
      <div className={`rounded-2xl shadow-xl p-6 ${
        nightMode ? 'card-science-dark' : 'card-science'
      }`}>
        <h4 className={`text-lg font-semibold mb-4 ${nightMode ? 'text-white' : 'text-science-900'}`}>
          Current Selection
        </h4>
        
        <div className="grid gap-4 md:grid-cols-2">
          {/* Taxonomy Card */}
          <div className={`p-4 rounded-xl border ${
            nightMode 
              ? 'bg-science-800/50 border-science-700' 
              : 'bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                nightMode ? 'bg-purple-500/20' : 'bg-purple-100'
              }`}>
                <CellIcon className={`w-7 h-7 ${nightMode ? 'text-purple-400' : 'text-purple-600'}`} />
              </div>
              <div>
                <div className={`text-2xl font-bold ${nightMode ? 'text-white' : 'text-purple-900'}`}>
                  {taxonomySelectionCount}
                </div>
                <div className={`text-sm ${nightMode ? 'text-science-400' : 'text-purple-600'}`}>
                  Cell Types Selected
                </div>
              </div>
            </div>
          </div>

          {/* Tracks Card */}
          <div className={`p-4 rounded-xl border ${
            nightMode 
              ? 'bg-science-800/50 border-science-700' 
              : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                nightMode ? 'bg-emerald-500/20' : 'bg-emerald-100'
              }`}>
                <TrackIcon className={`w-7 h-7 ${nightMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
              </div>
              <div>
                <div className={`text-2xl font-bold ${nightMode ? 'text-white' : 'text-emerald-900'}`}>
                  {selectedTrackCount} / {trackStates?.length ?? 0}
                </div>
                <div className={`text-sm ${nightMode ? 'text-science-400' : 'text-emerald-600'}`}>
                  Tracks Selected
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={`rounded-2xl shadow-xl p-6 ${
        nightMode ? 'card-science-dark' : 'card-science'
      }`}>
        <h4 className={`text-lg font-semibold mb-4 ${nightMode ? 'text-white' : 'text-science-900'}`}>
          Quick Actions
        </h4>
        
        <div className="grid gap-3 md:grid-cols-2">
          <button
            onClick={() => setShowSaveDialog(true)}
            disabled={!canSaveSession}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              canSaveSession
                ? nightMode
                  ? 'bg-primary-500/20 text-primary-300 hover:bg-primary-500/30 border border-primary-500/30'
                  : 'bg-primary-100 text-primary-700 hover:bg-primary-200 border border-primary-200'
                : nightMode
                ? 'bg-science-800 text-science-600 cursor-not-allowed border border-science-700'
                : 'bg-science-100 text-science-400 cursor-not-allowed border border-science-200'
            }`}
          >
            <SaveIcon className="w-5 h-5" />
            <span>Save Current Session</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              nightMode
                ? 'bg-accent-500/20 text-accent-300 hover:bg-accent-500/30 border border-accent-500/30'
                : 'bg-accent-100 text-accent-700 hover:bg-accent-200 border border-accent-200'
            }`}
          >
            <UploadIcon className="w-5 h-5" />
            <span>Import from JSON</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportSession}
            className="hidden"
          />
        </div>

        {!canSaveSession && (
          <p className={`text-sm mt-3 ${nightMode ? 'text-science-400' : 'text-science-600'}`}>
            Please select taxonomy or tracks before saving a session.
          </p>
        )}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl p-6 ${
            nightMode ? 'bg-science-900 border border-science-700' : 'bg-white'
          }`}>
            <h3 className={`text-xl font-bold mb-4 ${nightMode ? 'text-white' : 'text-science-900'}`}>
              Save Session
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  nightMode ? 'text-science-300' : 'text-science-700'
                }`}>
                  Session Name *
                </label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="e.g., Neuron Analysis 2024"
                  className={`w-full px-4 py-2.5 rounded-xl border transition-colors ${
                    nightMode
                      ? 'bg-science-800 border-science-700 text-white placeholder-science-500'
                      : 'bg-white border-science-300 text-science-900 placeholder-science-400'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  nightMode ? 'text-science-300' : 'text-science-700'
                }`}>
                  Description (optional)
                </label>
                <textarea
                  value={sessionDescription}
                  onChange={(e) => setSessionDescription(e.target.value)}
                  placeholder="Add a description for this session..."
                  rows={3}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-colors resize-none ${
                    nightMode
                      ? 'bg-science-800 border-science-700 text-white placeholder-science-500'
                      : 'bg-white border-science-300 text-science-900 placeholder-science-400'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                />
              </div>

              {/* Preview of what will be saved */}
              <div className={`p-3 rounded-lg ${nightMode ? 'bg-science-800' : 'bg-science-50'}`}>
                <div className={`text-xs font-medium mb-2 ${nightMode ? 'text-science-400' : 'text-science-600'}`}>
                  Will include:
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CellIcon className={`w-4 h-4 ${nightMode ? 'text-purple-400' : 'text-purple-600'}`} />
                    <span className={nightMode ? 'text-science-300' : 'text-science-700'}>
                      {taxonomySelectionCount} cell types
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrackIcon className={`w-4 h-4 ${nightMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <span className={nightMode ? 'text-science-300' : 'text-science-700'}>
                      {selectedTrackCount} tracks
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setSessionName('');
                  setSessionDescription('');
                }}
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors ${
                  nightMode
                    ? 'bg-science-800 text-science-300 hover:bg-science-700'
                    : 'bg-science-200 text-science-700 hover:bg-science-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSession}
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors ${
                  nightMode
                    ? 'bg-primary-600 text-white hover:bg-primary-500'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                Save Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Sessions */}
      <div className={`rounded-2xl shadow-xl overflow-hidden ${
        nightMode ? 'bg-gray-900/50 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        <div className={`px-6 py-4 border-b ${
          nightMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
        }`}>
          <h4 className={`text-lg font-semibold ${nightMode ? 'text-white' : 'text-science-900'}`}>
            Saved Sessions ({sessions.length})
          </h4>
        </div>

        <div className={`divide-y ${nightMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
          {sessions.length === 0 ? (
            <div className="p-12 text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                nightMode ? 'bg-science-800' : 'bg-science-100'
              }`}>
                <SaveIcon className={`w-8 h-8 ${nightMode ? 'text-science-500' : 'text-science-400'}`} />
              </div>
              <h3 className={`text-xl font-semibold mb-2 ${nightMode ? 'text-gray-100' : 'text-gray-900'}`}>
                No Saved Sessions
              </h3>
              <p className={`${nightMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Save your current selections to create a session.
              </p>
            </div>
          ) : (
            sessions.map((session) => {
              const metadata = getSessionMetadata(session);
              return (
                <div
                  key={session.id}
                  className={`p-6 transition-colors ${
                    nightMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h5 className={`font-semibold text-lg mb-1 ${
                        nightMode ? 'text-white' : 'text-science-900'
                      }`}>
                        {session.name}
                      </h5>
                      {session.description && (
                        <p className={`text-sm mb-3 ${
                          nightMode ? 'text-science-400' : 'text-science-600'
                        }`}>
                          {session.description}
                        </p>
                      )}
                      
                      {/* Session metadata with icons */}
                      <div className="flex flex-wrap items-center gap-4">
                        <div className={`flex items-center gap-1.5 text-sm ${
                          nightMode ? 'text-science-400' : 'text-science-500'
                        }`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{formatDate(session.createdAt)}</span>
                        </div>
                        <div className={`flex items-center gap-1.5 text-sm ${
                          nightMode ? 'text-purple-400' : 'text-purple-600'
                        }`}>
                          <CellIcon className="w-4 h-4" />
                          <span>{metadata.taxonomyCount} cell types</span>
                        </div>
                        <div className={`flex items-center gap-1.5 text-sm ${
                          nightMode ? 'text-emerald-400' : 'text-emerald-600'
                        }`}>
                          <TrackIcon className="w-4 h-4" />
                          <span>{metadata.selectedTrackCount}/{metadata.trackCount} tracks</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleLoadSession(session)}
                        className={`p-2.5 rounded-xl transition-colors ${
                          nightMode
                            ? 'bg-primary-500/20 text-primary-400 hover:bg-primary-500/30'
                            : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
                        }`}
                        title="Load session"
                      >
                        <LoadIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleExportSession(session)}
                        className={`p-2.5 rounded-xl transition-colors ${
                          nightMode
                            ? 'bg-accent-500/20 text-accent-400 hover:bg-accent-500/30'
                            : 'bg-accent-100 text-accent-600 hover:bg-accent-200'
                        }`}
                        title="Export as JSON"
                      >
                        <DownloadIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSession(session.id, session.name)}
                        className={`p-2.5 rounded-xl transition-colors ${
                          nightMode
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}
                        title="Delete session"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Interactive Features */}
      <div className={`rounded-2xl shadow-xl p-6 ${
        nightMode ? 'card-science-dark' : 'card-science'
      }`}>
        <h4 className={`text-lg font-semibold mb-4 ${nightMode ? 'text-white' : 'text-science-900'}`}>
          Interactive Features
        </h4>
        
        <div className="grid gap-3 md:grid-cols-2">
          <button
            onClick={onStartGuide}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              nightMode
                ? 'bg-accent-500/20 text-accent-300 hover:bg-accent-500/30 border border-accent-500/30'
                : 'bg-accent-100 text-accent-700 hover:bg-accent-200 border border-accent-200'
            }`}
          >
            <PlayIcon className="w-5 h-5" />
            <span>Restart Interactive Guide</span>
          </button>

          <button
            onClick={handleShowLanding}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              nightMode
                ? 'bg-primary-500/20 text-primary-300 hover:bg-primary-500/30 border border-primary-500/30'
                : 'bg-primary-100 text-primary-700 hover:bg-primary-200 border border-primary-200'
            }`}
          >
            <HomeIcon className="w-5 h-5" />
            <span>Show Landing Page</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionTab;

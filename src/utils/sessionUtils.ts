import type { Session, SessionMetadata } from '../types/session';
import type { TaxonomyNeighborhood } from '../store/taxonomyStore';
import type { Track } from '../store/trackStore';

const SESSION_STORAGE_KEY = 'bge_sessions';
const SESSION_VERSION = '1.0.0';

// ============================================================================
// Local Storage Management
// ============================================================================

export function getAllSessions(): Session[] {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return [];
    
    const sessions = JSON.parse(stored) as Session[];
    
    // Validate and filter out corrupted sessions
    return sessions.filter(session => {
      if (!session || typeof session !== 'object') return false;
      if (!session.id || !session.name) return false;
      
      // Ensure required arrays exist
      if (!Array.isArray(session.taxonomyData)) session.taxonomyData = [];
      if (!Array.isArray(session.trackStates)) session.trackStates = [];
      
      // Ensure createdAt is valid
      if (!session.createdAt || isNaN(new Date(session.createdAt).getTime())) {
        session.createdAt = new Date().toISOString();
      }
      
      return true;
    });
  } catch (error) {
    console.error('Error loading sessions:', error);
    return [];
  }
}

export function saveSession(
  name: string,
  description: string,
  taxonomyData: TaxonomyNeighborhood[],
  trackStates: Track[],
  currentViewRegion?: string
): Session {
  const session: Session = {
    id: generateSessionId(),
    name,
    description,
    createdAt: new Date().toISOString(),
    taxonomyData: JSON.parse(JSON.stringify(taxonomyData)), // Deep clone
    trackStates: JSON.parse(JSON.stringify(trackStates)), // Deep clone
    currentViewRegion,
    version: SESSION_VERSION,
  };

  const sessions = getAllSessions();
  sessions.push(session);
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));

  return session;
}

export function deleteSession(sessionId: string): void {
  const sessions = getAllSessions();
  const filtered = sessions.filter(s => s.id !== sessionId);
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(filtered));
}

export function getSession(sessionId: string): Session | null {
  const sessions = getAllSessions();
  return sessions.find(s => s.id === sessionId) || null;
}

export function updateSession(sessionId: string, updates: Partial<Session>): void {
  const sessions = getAllSessions();
  const index = sessions.findIndex(s => s.id === sessionId);
  if (index !== -1) {
    sessions[index] = { ...sessions[index], ...updates };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
  }
}

// ============================================================================
// Session Metadata
// ============================================================================

export function getSessionMetadata(session: Session): SessionMetadata {
  const taxonomyCount = countSelectedTaxonomy(session.taxonomyData || []);
  const trackCount = session.trackStates?.length ?? 0;
  const selectedTrackCount = session.trackStates?.filter(t => t.selected)?.length ?? 0;

  return {
    id: session.id || '',
    name: session.name || 'Unnamed Session',
    description: session.description || '',
    createdAt: session.createdAt || new Date().toISOString(),
    taxonomyCount,
    trackCount,
    selectedTrackCount,
  };
}

function countSelectedTaxonomy(taxonomyData: TaxonomyNeighborhood[]): number {
  if (!taxonomyData || !Array.isArray(taxonomyData)) return 0;
  
  let count = 0;
  taxonomyData.forEach(neighborhood => {
    neighborhood?.classes?.forEach(classObj => {
      classObj?.subclasses?.forEach(subclass => {
        if (subclass?.isSelected) count++;
        subclass?.groups?.forEach(group => {
          if (group?.isSelected) count++;
        });
      });
    });
  });
  return count;
}

// ============================================================================
// Import/Export
// ============================================================================

export function exportSessionToJSON(session: Session): string {
  return JSON.stringify(session, null, 2);
}

export function downloadSessionAsJSON(session: Session): void {
  const json = exportSessionToJSON(session);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(session.name)}_${session.id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importSessionFromJSON(jsonString: string): Session {
  try {
    const session = JSON.parse(jsonString) as Session;
    
    // Validate session structure
    if (!session.id || !session.name || !session.taxonomyData || !session.trackStates) {
      throw new Error('Invalid session format');
    }

    // Generate new ID to avoid conflicts
    session.id = generateSessionId();
    session.createdAt = new Date().toISOString();

    return session;
  } catch (error) {
    throw new Error(`Failed to import session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function importSessionFromFile(file: File): Promise<Session> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const session = importSessionFromJSON(content);
        resolve(session);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// ============================================================================
// Helpers
// ============================================================================

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

// ============================================================================
// Format Helpers
// ============================================================================

export function formatDate(isoString: string): string {
  if (!isoString) return 'Unknown date';
  
  try {
    const date = new Date(isoString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

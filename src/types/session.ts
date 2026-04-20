import type { TaxonomyNeighborhood } from '../store/taxonomyStore';
import type { Track } from '../store/trackStore';

export interface Session {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  taxonomyData: TaxonomyNeighborhood[];
  trackStates: Track[];
  currentViewRegion?: string;
  version: string;
}

export interface SessionMetadata {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  taxonomyCount: number;
  trackCount: number;
  selectedTrackCount: number;
}

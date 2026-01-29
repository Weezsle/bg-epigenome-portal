import tracksData from '../data/tracks.tsv?raw';
import type { TaxonomyNeighborhood } from './taxonomyStore';

export interface TrackMetadata {
  source?: string;
  assay?: string;
  modality?: string;
  description?: string;
  reference?: string;
  group?: string;
  subclass?: string;
}

export interface TrackConfig {
  name: string;
  type: string;
  url: string;
  options: {
    height: number;
  };
}

export interface Track {
  metadata: TrackMetadata;
  config: TrackConfig;
  selected?: boolean; // For browser display
}

// Build hierarchy map from taxonomy data
export function buildTaxonomyHierarchy(taxonomyData: TaxonomyNeighborhood[]): {
  subclassOrder: Map<string, number>;
  groupToSubclass: Map<string, string>;
  groupOrderInSubclass: Map<string, number>;
} {
  const subclassOrder = new Map<string, number>();
  const groupToSubclass = new Map<string, string>();
  const groupOrderInSubclass = new Map<string, number>();
  
  let subclassIndex = 0;
  
  taxonomyData.forEach(neighborhood => {
    neighborhood.classes.forEach(classObj => {
      classObj.subclasses.forEach(subclass => {
        // Record subclass order
        if (!subclassOrder.has(subclass.subclass)) {
          subclassOrder.set(subclass.subclass, subclassIndex++);
        }
        
        // Record group to subclass mapping and group order
        subclass.groups.forEach((group, groupIndex) => {
          groupToSubclass.set(group.group, subclass.subclass);
          groupOrderInSubclass.set(group.group, groupIndex);
        });
      });
    });
  });
  
  return { subclassOrder, groupToSubclass, groupOrderInSubclass };
}

// Parse tracks.tsv file
export function parseTracksData(): Track[] {
  const lines = tracksData.trim().split('\n');
  const tracks: Track[] = [];

  lines.forEach((line) => {
    if (!line.trim()) return;

    const parts = line.split('\t');
    if (parts.length < 2) return;

    try {
      const metadata = JSON.parse(parts[0]) as TrackMetadata;
      const config = JSON.parse(parts[1]) as TrackConfig;

      tracks.push({
        metadata,
        config,
      });
    } catch (error) {
      console.error('Error parsing track line:', line, error);
    }
  });

  return tracks;
}

// Species/reference sort order: human first, then mouse, macaque, marmoset
const REFERENCE_ORDER: Record<string, number> = {
  'hg38': 0,      // Human
  'mm10': 1,      // Mouse
  'rheMac10': 2,  // Macaque
  'mCalJa1.2': 3, // Marmoset
};

function getReferenceOrder(reference: string | undefined): number {
  if (!reference) return 9999;
  return REFERENCE_ORDER[reference] ?? 9999;
}

// Filter and sort tracks based on taxonomy selections
// taxonomySelections can be either:
// 1. Separated format: { groups: Record<string, boolean>, subclasses: Record<string, boolean> }
// 2. Legacy flat format: Record<string, boolean>
export function filterAndSortTracks(
  tracks: Track[],
  taxonomySelections: Record<string, boolean> | { groups: Record<string, boolean>, subclasses: Record<string, boolean> },
  taxonomyData: TaxonomyNeighborhood[]
): Track[] {
  // Parse selections into separate sets for subclasses and groups
  let selectedSubclasses = new Set<string>();
  let selectedGroups = new Set<string>();

  // Check if we have the new separated format
  if ('groups' in taxonomySelections && 'subclasses' in taxonomySelections) {
    // New format: explicitly separated
    Object.entries(taxonomySelections.subclasses).forEach(([name, isSelected]) => {
      if (isSelected) {
        selectedSubclasses.add(name);
      }
    });
    Object.entries(taxonomySelections.groups).forEach(([name, isSelected]) => {
      if (isSelected) {
        selectedGroups.add(name);
      }
    });
  } else {
    // Legacy flat format: merge into a single set (old behavior for backward compatibility)
    const selectedItems = new Set<string>();
    Object.entries(taxonomySelections).forEach(([name, isSelected]) => {
      if (isSelected) {
        selectedItems.add(name);
      }
    });
    // For backward compatibility, check both subclass and group against the same set
    selectedSubclasses = selectedItems;
    selectedGroups = selectedItems;
  }

  // If no selections, return empty (user needs to select something first)
  if (selectedSubclasses.size === 0 && selectedGroups.size === 0) {
    return [];
  }

  // Build hierarchy for sorting
  const { subclassOrder, groupToSubclass, groupOrderInSubclass } = buildTaxonomyHierarchy(taxonomyData);

  // Filter tracks - include if track's subclass OR group is selected
  const filteredTracks = tracks.filter((track) => {
    const { metadata } = track;
    
    // Check if track matches selected subclass or group (now using separate sets)
    const matchesSubclass = metadata.subclass && selectedSubclasses.has(metadata.subclass);
    const matchesGroup = metadata.group && selectedGroups.has(metadata.group);
    
    return matchesSubclass || matchesGroup;
  }).map(track => ({ ...track, selected: true })); // Default: show all

  // Sort tracks by: reference (species) > subclass > group > assay > source
  filteredTracks.sort((a, b) => {
    // 1. Sort by reference/species (human hg38 > mouse mm10 > macaque rheMac10 > marmoset mCalJa1.2)
    const refOrderA = getReferenceOrder(a.metadata.reference);
    const refOrderB = getReferenceOrder(b.metadata.reference);
    
    if (refOrderA !== refOrderB) {
      return refOrderA - refOrderB;
    }
    
    // 2. Sort by subclass
    const subclassA = a.metadata.subclass || '';
    const subclassB = b.metadata.subclass || '';
    const subclassOrderA = subclassOrder.get(subclassA) ?? 9999;
    const subclassOrderB = subclassOrder.get(subclassB) ?? 9999;
    
    if (subclassOrderA !== subclassOrderB) {
      return subclassOrderA - subclassOrderB;
    }
    
    // 3. Sort by group within subclass
    const groupA = a.metadata.group || '';
    const groupB = b.metadata.group || '';
    const groupOrderA = groupOrderInSubclass.get(groupA) ?? 9999;
    const groupOrderB = groupOrderInSubclass.get(groupB) ?? 9999;
    
    if (groupOrderA !== groupOrderB) {
      return groupOrderA - groupOrderB;
    }
    
    // 4. Sort by assay type
    const assayA = a.metadata.assay || '';
    const assayB = b.metadata.assay || '';
    const assayCompare = assayA.localeCompare(assayB);
    
    if (assayCompare !== 0) {
      return assayCompare;
    }
    
    // 5. Sort by source
    const sourceA = a.metadata.source || '';
    const sourceB = b.metadata.source || '';
    return sourceA.localeCompare(sourceB);
  });

  return filteredTracks;
}

// Get unique assay types from tracks
export function getUniqueAssays(tracks: Track[]): string[] {
  const assays = new Set<string>();
  tracks.forEach((track) => {
    if (track.metadata.assay) {
      assays.add(track.metadata.assay);
    }
  });
  return Array.from(assays).sort();
}

// Get unique sources from tracks
export function getUniqueSources(tracks: Track[]): string[] {
  const sources = new Set<string>();
  tracks.forEach((track) => {
    if (track.metadata.source) {
      sources.add(track.metadata.source);
    }
  });
  return Array.from(sources).sort();
}

// Get unique references from tracks
export function getUniqueReferences(tracks: Track[]): string[] {
  const references = new Set<string>();
  tracks.forEach((track) => {
    if (track.metadata.reference) {
      references.add(track.metadata.reference);
    }
  });
  return Array.from(references).sort();
}

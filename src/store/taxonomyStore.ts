import taxonomyData from '../data/taxonomy.tsv?raw';

// Import assay-specific region distribution data
import hmbaGroupData from '../data/taxonomy/HMBA.group.tsv?raw';
import hmbaSubclassData from '../data/taxonomy/HMBA.subclass.tsv?raw';
import pairedTagGroupData from '../data/taxonomy/PairedTag.group.tsv?raw';
import pairedTagSubclassData from '../data/taxonomy/PairedTag.subclass.tsv?raw';
import snm3cGroupData from '../data/taxonomy/snm3c.group.tsv?raw';
import snm3cSubclassData from '../data/taxonomy/snm3c.subclass.tsv?raw';

export type AssayType = 'HMBA' | 'PairedTag' | 'snm3c';

export interface TaxonomyGroup {
  group: string;
  isSelected: boolean;  // Whether this group is selected for visualization
}

export interface TaxonomySubclass {
  subclass: string;
  groups: TaxonomyGroup[];
  isExpanded: boolean;
  isSelected: boolean;  // Whether this subclass is selected for visualization
}

export interface TaxonomyClass {
  class: string;
  subclasses: TaxonomySubclass[];
  isExpanded: boolean;
}

export interface TaxonomyNeighborhood {
  neighborhood: string;
  classes: TaxonomyClass[];
  isExpanded: boolean;
}

export interface TaxonomyStore {
  neighborhoods: TaxonomyNeighborhood[];
}

// Parse TSV and build hierarchical structure (only hierarchy, no region distribution)
export function parseTaxonomyData(): TaxonomyNeighborhood[] {
  const lines = taxonomyData.trim().split('\n');
  const neighborhoods = new Map<string, TaxonomyNeighborhood>();

  lines.forEach((line) => {
    const cols = line.split('\t');
    const neighborhoodName = cols[0] || '';
    const className = cols[1] || '';
    const subclassName = cols[2] || '';
    const groupName = cols[3] || '';

    // Get or create neighborhood (expanded by default)
    if (!neighborhoods.has(neighborhoodName)) {
      neighborhoods.set(neighborhoodName, {
        neighborhood: neighborhoodName,
        classes: [],
        isExpanded: true,
      });
    }
    const neighborhood = neighborhoods.get(neighborhoodName)!;

    // Get or create class
    let classObj = neighborhood.classes.find(c => c.class === className);
    if (!classObj) {
      classObj = {
        class: className,
        subclasses: [],
        isExpanded: false,
      };
      neighborhood.classes.push(classObj);
    }

    // Get or create subclass
    let subclassObj = classObj.subclasses.find(s => s.subclass === subclassName);
    if (!subclassObj) {
      subclassObj = {
        subclass: subclassName,
        groups: [],
        isExpanded: false,
        isSelected: false,
      };
      classObj.subclasses.push(subclassObj);
    }

    // Add group (groups are unique)
    subclassObj.groups.push({
      group: groupName,
      isSelected: false,
    });
  });

  return Array.from(neighborhoods.values());
}

// Load region distribution data for groups from assay-specific file
export function loadGroupRegionDistribution(assayType: AssayType): Map<string, string> {
  let data: string;
  switch (assayType) {
    case 'HMBA':
      data = hmbaGroupData;
      break;
    case 'PairedTag':
      data = pairedTagGroupData;
      break;
    case 'snm3c':
      data = snm3cGroupData;
      break;
    default:
      data = hmbaGroupData;
  }

  const distributionMap = new Map<string, string>();
  const lines = data.trim().split('\n');

  lines.forEach((line) => {
    const cols = line.split('\t');
    if (cols.length >= 5) {
      const neighborhoodName = cols[0] || '';
      const className = cols[1] || '';
      const subclassName = cols[2] || '';
      const groupName = cols[3] || '';
      const regionDistribution = cols[4] || '';
      
      // Create a unique key: neighborhood|class|subclass|group
      const key = `${neighborhoodName}|${className}|${subclassName}|${groupName}`;
      distributionMap.set(key, regionDistribution);
    }
  });

  return distributionMap;
}

// Load region distribution data for subclasses from assay-specific file
export function loadSubclassRegionDistribution(assayType: AssayType): Map<string, string> {
  let data: string;
  switch (assayType) {
    case 'HMBA':
      data = hmbaSubclassData;
      break;
    case 'PairedTag':
      data = pairedTagSubclassData;
      break;
    case 'snm3c':
      data = snm3cSubclassData;
      break;
    default:
      data = hmbaSubclassData;
  }

  const distributionMap = new Map<string, string>();
  const lines = data.trim().split('\n');

  lines.forEach((line) => {
    const cols = line.split('\t');
    if (cols.length >= 4) {
      const neighborhoodName = cols[0] || '';
      const className = cols[1] || '';
      const subclassName = cols[2] || '';
      const regionDistribution = cols[3] || '';
      
      // Create a unique key: neighborhood|class|subclass
      const key = `${neighborhoodName}|${className}|${subclassName}`;
      distributionMap.set(key, regionDistribution);
    }
  });

  return distributionMap;
}

// Helper to serialize the store (for saving state)
// Returns an object with separate groups and subclasses to distinguish between them
export function serializeTaxonomyStore(neighborhoods: TaxonomyNeighborhood[]): {
  groups: Record<string, boolean>;
  subclasses: Record<string, boolean>;
} {
  const groups: Record<string, boolean> = {};
  const subclasses: Record<string, boolean> = {};
  
  neighborhoods.forEach(neighborhood => {
    neighborhood.classes.forEach(classObj => {
      classObj.subclasses.forEach(subclass => {
        // Include subclass selections
        if (subclass.isSelected) {
          subclasses[subclass.subclass] = true;
        }
        // Include group selections
        subclass.groups.forEach(group => {
          if (group.isSelected) {
            groups[group.group] = true;
          }
        });
      });
    });
  });
  
  return { groups, subclasses };
}

// Get color for a specific level in the hierarchy using colorblind-friendly palette
// Uses varying luminance (grayscale variations) which is universally accessible
export function getHierarchyColor(neighborhoodName: string, level: 'neighborhood' | 'class' | 'subclass' | 'group', nightMode: boolean = false) {
  if (nightMode) {
    // Night mode: clear hierarchy with accessible contrast ratios
    switch (level) {
      case 'neighborhood': return 'bg-science-800 text-science-100';
      case 'class': return 'bg-science-800/80 text-science-200';
      case 'subclass': return 'bg-science-800/60 text-science-300';
      case 'group': return 'bg-science-900/50 text-science-400';
    }
  }
  
  // Light mode: clear visual hierarchy using luminance (deeper grays)
  switch (level) {
    case 'neighborhood': return 'bg-gray-300 text-science-900';
    case 'class': return 'bg-gray-200 text-science-800';
    case 'subclass': return 'bg-gray-100 text-science-700';
    case 'group': return 'bg-gray-50 text-science-600';
  }
}

// Parse region distribution string (dictionary format) into a map
export function parseRegionDistribution(regionDistStr: string): Record<string, number> {
  // Return empty object for empty/null/undefined strings
  if (!regionDistStr || regionDistStr.trim() === '') {
    return {};
  }
  
  try {
    // The string is in Python dict format like "{'GPi': 1329, 'GPe': 312, ...}"
    // Convert to JSON format
    const jsonStr = regionDistStr
      .replace(/'/g, '"')  // Replace single quotes with double quotes
      .replace(/\s+/g, ''); // Remove whitespace
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Failed to parse region distribution:', regionDistStr, error);
    return {};
  }
}

// Calculate summed region distribution for selected groups
export function calculateGroupRegionDistribution(
  neighborhoods: TaxonomyNeighborhood[],
  assayType: AssayType
): Record<string, number> {
  const summedDistribution: Record<string, number> = {};
  const groupDistributionMap = loadGroupRegionDistribution(assayType);
  
  neighborhoods.forEach(neighborhood => {
    neighborhood.classes.forEach(classObj => {
      classObj.subclasses.forEach(subclass => {
        subclass.groups.forEach(group => {
          // Only include groups that are selected
          if (group.isSelected) {
            const key = `${neighborhood.neighborhood}|${classObj.class}|${subclass.subclass}|${group.group}`;
            const regionDistStr = groupDistributionMap.get(key) || '';
            const distribution = parseRegionDistribution(regionDistStr);
            
            // Sum up the counts for each region
            Object.entries(distribution).forEach(([region, count]) => {
              summedDistribution[region] = (summedDistribution[region] || 0) + count;
            });
          }
        });
      });
    });
  });
  
  return summedDistribution;
}

// Calculate summed region distribution for selected subclasses
export function calculateSubclassRegionDistribution(
  neighborhoods: TaxonomyNeighborhood[],
  assayType: AssayType
): Record<string, number> {
  const summedDistribution: Record<string, number> = {};
  const subclassDistributionMap = loadSubclassRegionDistribution(assayType);
  
  neighborhoods.forEach(neighborhood => {
    neighborhood.classes.forEach(classObj => {
      classObj.subclasses.forEach(subclass => {
        // Only include subclasses that are selected
        if (subclass.isSelected) {
          const key = `${neighborhood.neighborhood}|${classObj.class}|${subclass.subclass}`;
          const regionDistStr = subclassDistributionMap.get(key) || '';
          const distribution = parseRegionDistribution(regionDistStr);
          
          // Sum up the counts for each region
          Object.entries(distribution).forEach(([region, count]) => {
            summedDistribution[region] = (summedDistribution[region] || 0) + count;
          });
        }
      });
    });
  });
  
  return summedDistribution;
}

// Legacy function for backward compatibility (now uses groups only)
export function calculateRegionDistribution(neighborhoods: TaxonomyNeighborhood[]): Record<string, number> {
  return calculateGroupRegionDistribution(neighborhoods, 'HMBA');
}

// Get list of selected groups
export function getSelectedGroups(neighborhoods: TaxonomyNeighborhood[]): TaxonomyGroup[] {
  const selectedGroups: TaxonomyGroup[] = [];
  
  neighborhoods.forEach(neighborhood => {
    neighborhood.classes.forEach(classObj => {
      classObj.subclasses.forEach(subclass => {
        subclass.groups.forEach(group => {
          if (group.isSelected) {
            selectedGroups.push(group);
          }
        });
      });
    });
  });
  
  return selectedGroups;
}

import abbr2fnData from '../data/abbr2fn.tsv?raw';

export interface AbbreviationEntry {
  abbreviation: string;
  type: 'neighborhood' | 'class' | 'subclass' | 'group';
  fullName: string;
}

// Lookup map: abbreviation -> list of entries (can have multiple types for same abbreviation)
type LookupMap = Map<string, AbbreviationEntry[]>;

let lookupMap: LookupMap | null = null;

/**
 * Parse the abbreviation lookup table from TSV format
 */
function parseLookupTable(): LookupMap {
  const map = new Map<string, AbbreviationEntry[]>();
  const lines = abbr2fnData.trim().split('\n');

  lines.forEach((line) => {
    if (!line.trim()) return;

    const parts = line.split('\t');
    if (parts.length < 3) return;

    const abbreviation = parts[0].trim();
    const type = parts[1].trim() as AbbreviationEntry['type'];
    const fullName = parts[2].trim();

    const entry: AbbreviationEntry = {
      abbreviation,
      type,
      fullName,
    };

    if (!map.has(abbreviation)) {
      map.set(abbreviation, []);
    }
    map.get(abbreviation)!.push(entry);
  });

  return map;
}

/**
 * Get the lookup map (lazy initialization)
 */
function getLookupMap(): LookupMap {
  if (!lookupMap) {
    lookupMap = parseLookupTable();
  }
  return lookupMap;
}

/**
 * Get full name for an abbreviation, optionally filtered by type
 */
export function getFullName(
  abbreviation: string,
  type?: 'neighborhood' | 'class' | 'subclass' | 'group'
): string | null {
  const map = getLookupMap();
  const entries = map.get(abbreviation);

  if (!entries || entries.length === 0) {
    return null;
  }

  // If type is specified, filter by type
  if (type) {
    const filtered = entries.find(e => e.type === type);
    return filtered ? filtered.fullName : null;
  }

  // If no type specified, return the first entry's full name
  return entries[0].fullName;
}

/**
 * Get all entries for an abbreviation
 */
export function getEntries(abbreviation: string): AbbreviationEntry[] {
  const map = getLookupMap();
  return map.get(abbreviation) || [];
}

/**
 * Check if an abbreviation exists in the lookup table
 */
export function hasAbbreviation(abbreviation: string): boolean {
  const map = getLookupMap();
  return map.has(abbreviation);
}

/**
 * Get formatted tooltip text for an abbreviation
 * Returns the abbreviation itself if not found in lookup table
 */
export function getTooltipText(
  abbreviation: string,
  type?: 'neighborhood' | 'class' | 'subclass' | 'group'
): string {
  const fullName = getFullName(abbreviation, type);
  return fullName || abbreviation;
}

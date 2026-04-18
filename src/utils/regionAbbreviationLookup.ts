import abiRegionData from '../data/abi_region_abbv2fn.tsv?raw';

let lookupMap: Map<string, string> | null = null;

function getLookupMap(): Map<string, string> {
  if (!lookupMap) {
    lookupMap = new Map<string, string>();
    const lines = abiRegionData.trim().split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      const tabIdx = line.indexOf('\t');
      if (tabIdx === -1) continue;
      const abbv = line.slice(0, tabIdx).trim();
      const fullName = line.slice(tabIdx + 1).trim();
      if (abbv && fullName) {
        // Store with lowercase key for case-insensitive lookup
        lookupMap.set(abbv.toLowerCase(), fullName);
      }
    }
  }
  return lookupMap;
}

/**
 * Get the full name for a brain-region abbreviation (case-insensitive).
 * Returns null if the abbreviation is not found.
 */
export function getRegionFullName(abbreviation: string): string | null {
  return getLookupMap().get(abbreviation.toLowerCase()) ?? null;
}

/**
 * Given a set of region abbreviations, return an array of
 * { abbv, fullName } pairs sorted by abbreviation, for those
 * abbreviations that exist in the lookup table (case-insensitive).
 */
export function resolveRegions(
  abbreviations: string[]
): { abbv: string; fullName: string }[] {
  const map = getLookupMap();
  return abbreviations
    .map((abbv) => ({ abbv, fullName: map.get(abbv.toLowerCase()) ?? '' }))
    .filter((e) => e.fullName !== '')
    .sort((a, b) => a.abbv.localeCompare(b.abbv));
}

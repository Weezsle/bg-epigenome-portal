// Brain Atlas Nomenclature - Maps region abbreviations to full names for display purposes
// Note: For taxonomy names (neighborhoods, classes, subclasses, groups), use the centralized
// abbreviation lookup system in src/utils/abbreviationLookup.ts instead.

// Regional Distribution Keys (Anatomical Locations)
// These are brain region abbreviations used in region distribution charts
export const regionNames: Record<string, string> = {
  "BF": "Basal Forebrain",
  "CaB": "Caudate Nucleus (Body)",
  "CaH": "Caudate Nucleus (Head)",
  "CaT": "Caudate Nucleus (Tail)",
  "Eca": "Extended Amygdala (Capsular)",
  "GPe": "Globus Pallidus externa",
  "GPeC": "Globus Pallidus externa (Caudal)",
  "GPeR": "Globus Pallidus externa (Rostral)",
  "GPi": "Globus Pallidus interna",
  "NAC": "Nucleus Accumbens",
  "NACc": "Nucleus Accumbens (Core)",
  "NACs": "Nucleus Accumbens (Shell)",
  "Pu": "Putamen",
  "PuC": "Putamen (Caudal)",
  "PuPV": "Putamen (Paraventricular)",
  "PuR": "Putamen (Rostral)",
  "SN": "Substantia Nigra",
  "SN-VTA": "Substantia Nigra / Ventral Tegmental Area Transition",
  "STH": "Subthalamic Nucleus",
  "VeP": "Ventral Pallidum"
};

// Helper function to get full region name with fallback to original key
export function getRegionFullName(key: string): string {
  return regionNames[key] || key;
}

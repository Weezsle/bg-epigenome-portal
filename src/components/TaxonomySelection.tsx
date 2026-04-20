import React, { type FC, useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { TaxonomyNeighborhood, AssayType } from '../store/taxonomyStore';
import { parseTracksData } from '../store/trackStore';
import { 
  getHierarchyColor, 
  calculateGroupRegionDistribution,
  calculateSubclassRegionDistribution 
} from '../store/taxonomyStore';
import RegionDistributionChart from './RegionDistributionChart';
import { resolveRegions } from '../utils/regionAbbreviationLookup';
import TaxonomyTooltip from './TaxonomyTooltip';

const SPECIES_ORDER = ['hg38', 'mm10', 'mCalJa1.2', 'rheMac10'] as const;
const SPECIES_LABELS: Record<string, string> = {
  hg38: 'Human',
  mm10: 'Mouse',
  'mCalJa1.2': 'Marmoset',
  rheMac10: 'Macaque',
};

// Okabe-Ito colorblind-friendly palette — one color per assay
const OKABE_ITO = [
  '#E69F00', // orange
  '#56B4E9', // sky blue
  '#009E73', // bluish green
  '#CC79A7', // reddish purple
  '#0072B2', // blue
  '#D55E00', // vermillion
  '#F0E442', // yellow
  '#000000', // black
];

// Single dot with a rich hover card — rendered via portal into document.body
// so it is never clipped by overflow:hidden or CSS transforms on ancestors
const AssayDot: FC<{ assay: string; modalities: Set<string>; color: string }> = ({ assay, modalities, color }) => {
  const [cardPos, setCardPos] = useState<{ x: number; y: number } | null>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePos = () => {
    if (dotRef.current) {
      const rect = dotRef.current.getBoundingClientRect();
      setCardPos({ x: rect.left + rect.width / 2, y: rect.top });
    }
  };

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(updatePos, 100);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCardPos(null);
  };

  // Dismiss on scroll so the card doesn't float away from the dot
  useEffect(() => {
    if (!cardPos) return;
    const dismiss = () => setCardPos(null);
    window.addEventListener('scroll', dismiss, true);
    return () => window.removeEventListener('scroll', dismiss, true);
  }, [cardPos]);

  const sortedModalities = Array.from(modalities).sort();

  const card = cardPos && createPortal(
    <div
      className="pointer-events-none"
      style={{
        position: 'fixed',
        left: cardPos.x,
        top: cardPos.y - 10,
        transform: 'translate(-50%, -100%)',
        zIndex: 9999,
      }}
    >
      <div className="bg-gray-900 text-white rounded-xl shadow-2xl overflow-hidden" style={{ minWidth: 190 }}>
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
          <span style={{ backgroundColor: color, width: 10, height: 10, display: 'inline-block' }}
            className="rounded-full flex-shrink-0 ring-1 ring-white/20" />
          <span className="text-sm font-bold whitespace-nowrap">{assay}</span>
        </div>
        {sortedModalities.length > 0 && (
          <div className="px-3 py-2">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Modalities</p>
            {sortedModalities.map(m => (
              <div key={m} className="flex items-center gap-1.5 text-xs text-gray-200 py-0.5">
                <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0 inline-block" />
                {m}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-center">
        <span className="border-[5px] border-transparent border-t-gray-900 inline-block" />
      </div>
    </div>,
    document.body
  );

  return (
    <span className="inline-flex" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <span
        ref={dotRef}
        style={{ backgroundColor: color, width: 14, height: 14, display: 'inline-block' }}
        className="rounded-full flex-shrink-0 cursor-default ring-1 ring-black/10"
        aria-label={assay}
      />
      {card}
    </span>
  );
};

type SpeciesAssayMapType = Map<string, Map<string, Set<string>>>;

const AssayDotsBySpecies: FC<{
  speciesAssayMap: SpeciesAssayMapType | undefined;
  colorMap: Map<string, string>;
  nightMode?: boolean;
}> = ({ speciesAssayMap, colorMap, nightMode }) => {
  if (!speciesAssayMap || speciesAssayMap.size === 0) return <span className="text-gray-400 text-xs">—</span>;

  const speciesEntries = SPECIES_ORDER
    .filter(s => speciesAssayMap.has(s))
    .map(s => [s, speciesAssayMap.get(s)!] as const);

  if (speciesEntries.length === 0) return <span className="text-gray-400 text-xs">—</span>;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 items-center">
      {speciesEntries.map(([species, assayMap]) => (
        <div key={species} className="flex items-center gap-1">
          <span className={`text-[10px] font-semibold mr-0.5 ${nightMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {SPECIES_LABELS[species] ?? species}:
          </span>
          {Array.from(assayMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([assay, modalities]) => (
            <AssayDot key={assay} assay={assay} modalities={modalities} color={colorMap.get(assay) ?? '#888888'} />
          ))}
        </div>
      ))}
    </div>
  );
};

const SharedRegionLegend: FC<{
  entries: { abbv: string; fullName: string }[];
  nightMode: boolean;
}> = ({ entries, nightMode }) => {
  const [open, setOpen] = useState(true);

  return (
    <div className={`rounded-2xl overflow-hidden border ${nightMode ? 'bg-gray-900/50 border-gray-700' : 'bg-white border-gray-200'}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-6 py-3 text-sm font-medium transition-colors ${
          nightMode ? 'text-gray-300 hover:bg-gray-800/60' : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Region Abbreviation Legend
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${nightMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
            {entries.length}
          </span>
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className={`px-6 pb-5 border-t ${nightMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-200 bg-gray-50/60'}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1 pt-4 max-h-72 overflow-y-auto pr-1">
            {entries.map(({ abbv, fullName }) => (
              <div key={abbv} className="flex items-baseline gap-2 py-0.5">
                <span className={`font-mono text-xs font-semibold whitespace-nowrap ${nightMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  {abbv}
                </span>
                <span className={`text-xs leading-snug ${nightMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {fullName}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

type TaxonomySelectionProps = {
  nightMode: boolean;
  taxonomyData: TaxonomyNeighborhood[];
  setTaxonomyData: React.Dispatch<React.SetStateAction<TaxonomyNeighborhood[]>>;
  onNextStep?: () => void;
};

const TaxonomySelection: FC<TaxonomySelectionProps> = ({ nightMode, taxonomyData, setTaxonomyData, onNextStep }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [assayType, setAssayType] = useState<AssayType>('HMBA');
  const [isAtlasExpanded, setIsAtlasExpanded] = useState(false);
  const [atlasSpecies, setAtlasSpecies] = useState<'human' | 'mouse' | 'marmoset' | 'macaque' | null>(null);
  
  // Calculate region distribution for selected groups
  const groupRegionDistribution = useMemo(() => {
    return calculateGroupRegionDistribution(taxonomyData, assayType);
  }, [taxonomyData, assayType]);
  
  // Calculate region distribution for selected subclasses
  const subclassRegionDistribution = useMemo(() => {
    return calculateSubclassRegionDistribution(taxonomyData, assayType);
  }, [taxonomyData, assayType]);
  
  // Combined region legend for both charts
  const combinedRegionLegend = useMemo(() => {
    const allAbbvs = Array.from(new Set([
      ...Object.keys(subclassRegionDistribution),
      ...Object.keys(groupRegionDistribution),
    ]));
    return resolveRegions(allAbbvs);
  }, [subclassRegionDistribution, groupRegionDistribution]);

  // Filter taxonomy data based on search query - preserve original indices
  const filteredData = useMemo(() => {
    // Always add originalIndex to all levels
    if (!searchQuery.trim()) {
      return taxonomyData.map((n, nIdx) => ({
        ...n,
        originalIndex: nIdx,
        classes: n.classes.map((c, cIdx) => ({
          ...c,
          originalIndex: cIdx,
          subclasses: c.subclasses.map((s, sIdx) => ({
            ...s,
            originalIndex: sIdx,
            groups: s.groups.map((g, gIdx) => ({
              ...g,
              originalIndex: gIdx
            }))
          }))
        }))
      }));
    }
    
    const query = searchQuery.toLowerCase();
    return taxonomyData.map((neighborhood, nIdx) => {
      const matchesNeighborhood = neighborhood.neighborhood.toLowerCase().includes(query);
      
      const filteredClasses = neighborhood.classes.map((classObj, cIdx) => {
        const matchesClass = classObj.class.toLowerCase().includes(query);
        
        const filteredSubclasses = classObj.subclasses.map((subclass, sIdx) => {
          const matchesSubclass = subclass.subclass.toLowerCase().includes(query);
          
          const filteredGroups = subclass.groups.map((group, gIdx) => ({
            ...group,
            originalIndex: gIdx
          })).filter(group =>
            group.group.toLowerCase().includes(query)
          );
          
          // Include subclass if it matches or has matching groups
          if (matchesSubclass || filteredGroups.length > 0) {
            return {
              ...subclass,
              originalIndex: sIdx,
              groups: matchesSubclass 
                ? subclass.groups.map((g, gIdx) => ({ ...g, originalIndex: gIdx }))
                : filteredGroups,
              isExpanded: true // Auto-expand when searching
            };
          }
          return null;
        }).filter(Boolean);
        
        // Include class if it matches or has matching subclasses
        if (matchesClass || filteredSubclasses.length > 0) {
          return {
            ...classObj,
            originalIndex: cIdx,
            subclasses: matchesClass 
              ? classObj.subclasses.map((s, sIdx) => ({ 
                  ...s, 
                  originalIndex: sIdx,
                  groups: s.groups.map((g, gIdx) => ({ ...g, originalIndex: gIdx }))
                }))
              : filteredSubclasses,
            isExpanded: true // Auto-expand when searching
          };
        }
        return null;
      }).filter(Boolean);
      
      // Include neighborhood if it matches or has matching classes
      if (matchesNeighborhood || filteredClasses.length > 0) {
        return {
          ...neighborhood,
          originalIndex: nIdx,
          classes: matchesNeighborhood 
            ? neighborhood.classes.map((c, cIdx) => ({ 
                ...c, 
                originalIndex: cIdx,
                subclasses: c.subclasses.map((s, sIdx) => ({ 
                  ...s, 
                  originalIndex: sIdx,
                  groups: s.groups.map((g, gIdx) => ({ ...g, originalIndex: gIdx }))
                }))
              }))
            : filteredClasses,
          isExpanded: true // Auto-expand when searching
        };
      }
      return null;
    }).filter(Boolean) as (TaxonomyNeighborhood & { originalIndex: number })[];
  }, [taxonomyData, searchQuery]);
  
  const toggleNeighborhood = (neighborhoodIndex: number) => {
    setTaxonomyData(prev => {
      const newData = [...prev];
      newData[neighborhoodIndex] = {
        ...newData[neighborhoodIndex],
        isExpanded: !newData[neighborhoodIndex].isExpanded,
      };
      return newData;
    });
  };

  const toggleClass = (neighborhoodIndex: number, classIndex: number) => {
    setTaxonomyData(prev => {
      const newData = [...prev];
      newData[neighborhoodIndex] = {
        ...newData[neighborhoodIndex],
        classes: newData[neighborhoodIndex].classes.map((c, i) =>
          i === classIndex ? { ...c, isExpanded: !c.isExpanded } : c
        ),
      };
      return newData;
    });
  };

  const toggleSubclass = (neighborhoodIndex: number, classIndex: number, subclassIndex: number) => {
    setTaxonomyData(prev => {
      const newData = [...prev];
      newData[neighborhoodIndex] = {
        ...newData[neighborhoodIndex],
        classes: newData[neighborhoodIndex].classes.map((c, ci) =>
          ci === classIndex
            ? {
                ...c,
                subclasses: c.subclasses.map((s, si) =>
                  si === subclassIndex ? { ...s, isExpanded: !s.isExpanded } : s
                ),
              }
            : c
        ),
      };
      return newData;
    });
  };

  const toggleGroupSelection = (
    neighborhoodIndex: number,
    classIndex: number,
    subclassIndex: number,
    groupIndex: number
  ) => {
    setTaxonomyData(prev => {
      const newData = [...prev];
      const group = newData[neighborhoodIndex].classes[classIndex].subclasses[subclassIndex].groups[groupIndex];

      newData[neighborhoodIndex] = {
        ...newData[neighborhoodIndex],
        classes: newData[neighborhoodIndex].classes.map((c, ci) =>
          ci === classIndex
            ? {
                ...c,
                subclasses: c.subclasses.map((s, si) =>
                  si === subclassIndex
                    ? {
                        ...s,
                        groups: s.groups.map((g, gi) =>
                          gi === groupIndex
                            ? { ...g, isSelected: !group.isSelected }
                            : g
                        ),
                      }
                    : s
                ),
              }
            : c
        ),
      };
      return newData;
    });
  };

  const toggleAllGroupsInSubclass = (
    neighborhoodIndex: number,
    classIndex: number,
    subclassIndex: number
  ) => {
    setTaxonomyData(prev => {
      const newData = [...prev];
      const groups = newData[neighborhoodIndex].classes[classIndex].subclasses[subclassIndex].groups;
      const allSelected = groups.length > 0 && groups.every(g => g.isSelected);
      const nextSelected = !allSelected;

      newData[neighborhoodIndex] = {
        ...newData[neighborhoodIndex],
        classes: newData[neighborhoodIndex].classes.map((c, ci) =>
          ci === classIndex
            ? {
                ...c,
                subclasses: c.subclasses.map((s, si) =>
                  si === subclassIndex
                    ? { ...s, groups: s.groups.map(g => ({ ...g, isSelected: nextSelected })) }
                    : s
                ),
              }
            : c
        ),
      };
      return newData;
    });
  };

  // Toggle subclass selection
  const toggleSubclassSelection = (
    neighborhoodIndex: number,
    classIndex: number,
    subclassIndex: number
  ) => {
    setTaxonomyData(prev => {
      const newData = [...prev];
      const subclass = newData[neighborhoodIndex].classes[classIndex].subclasses[subclassIndex];

      newData[neighborhoodIndex] = {
        ...newData[neighborhoodIndex],
        classes: newData[neighborhoodIndex].classes.map((c, ci) =>
          ci === classIndex
            ? {
                ...c,
                subclasses: c.subclasses.map((s, si) =>
                  si === subclassIndex
                    ? { ...s, isSelected: !subclass.isSelected }
                    : s
                ),
              }
            : c
        ),
      };
      return newData;
    });
  };

  // Count all selected subclasses and groups
  const selectionCounts = useMemo(() => {
    let subclasses = 0;
    let groups = 0;
    taxonomyData.forEach(n => {
      n.classes.forEach(c => {
        c.subclasses.forEach(s => {
          if (s.isSelected) subclasses++;
          s.groups.forEach(g => {
            if (g.isSelected) groups++;
          });
        });
      });
    });
    return { subclasses, groups, total: subclasses + groups };
  }, [taxonomyData]);

  const selectAll = () => {
    setTaxonomyData(prev => prev.map(n => ({
      ...n,
      classes: n.classes.map(c => ({
        ...c,
        subclasses: c.subclasses.map(s => ({
          ...s,
          isSelected: true,
          groups: s.groups.map(g => ({ ...g, isSelected: true }))
        }))
      }))
    })));
  };

  const clearAll = () => {
    setTaxonomyData(prev => prev.map(n => ({
      ...n,
      classes: n.classes.map(c => ({
        ...c,
        subclasses: c.subclasses.map(s => ({
          ...s,
          isSelected: false,
          groups: s.groups.map(g => ({ ...g, isSelected: false }))
        }))
      }))
    })));
  };

  const allExpanded = useMemo(() =>
    taxonomyData.length > 0 && taxonomyData.every(n =>
      n.isExpanded &&
      n.classes.every(c => c.isExpanded && c.subclasses.every(s => s.isExpanded))
    ),
  [taxonomyData]);

  const expandAll = () => {
    setTaxonomyData(prev => prev.map(n => ({
      ...n,
      isExpanded: true,
      classes: n.classes.map(c => ({
        ...c,
        isExpanded: true,
        subclasses: c.subclasses.map(s => ({ ...s, isExpanded: true }))
      }))
    })));
  };

  const collapseAll = () => {
    setTaxonomyData(prev => prev.map(n => ({
      ...n,
      isExpanded: false,
      classes: n.classes.map(c => ({
        ...c,
        isExpanded: false,
        subclasses: c.subclasses.map(s => ({ ...s, isExpanded: false }))
      }))
    })));
  };

  // ── Assay availability ────────────────────────────────────────────────────
  const allTracks = useMemo(() => parseTracksData(), []);

  type AssayModalityMap = Map<string, Set<string>>;
  type SpeciesAssayMap = Map<string, AssayModalityMap>;

  const assayData = useMemo(() => {
    const assaySet = new Set<string>();
    allTracks.forEach(t => { if (t.metadata.assay) assaySet.add(t.metadata.assay); });
    const sortedAssays = Array.from(assaySet).sort();
    const colorMap = new Map<string, string>();
    sortedAssays.forEach((assay, i) => colorMap.set(assay, OKABE_ITO[i % OKABE_ITO.length]));

    const byGroup = new Map<string, SpeciesAssayMap>();
    const bySubclass = new Map<string, SpeciesAssayMap>();

    const addToMap = (outer: Map<string, SpeciesAssayMap>, key: string, species: string, assay: string, modality: string) => {
      if (!outer.has(key)) outer.set(key, new Map());
      const speciesMap = outer.get(key)!;
      if (!speciesMap.has(species)) speciesMap.set(species, new Map());
      const inner = speciesMap.get(species)!;
      if (!inner.has(assay)) inner.set(assay, new Set());
      if (modality) inner.get(assay)!.add(modality);
    };

    allTracks.forEach(t => {
      const assay = t.metadata.assay;
      const species = t.metadata.reference ?? 'unknown';
      if (!assay) return;
      const modality = t.metadata.modality ?? '';
      if (t.metadata.group) addToMap(byGroup, t.metadata.group, species, assay, modality);
      if (t.metadata.subclass) addToMap(bySubclass, t.metadata.subclass, species, assay, modality);
    });

    return { colorMap, byGroup, bySubclass, sortedAssays };
  }, [allTracks]);

  // ──────────────────────────────────────────────────────────────────────────

  const displayData = filteredData;

  return (
    <div className={`space-y-6 ${nightMode ? 'text-gray-200' : 'text-gray-800'}`}>
      <div className="rounded-2xl shadow-xl p-8 space-y-2 gradient-science text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pattern-neural" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 text-xs font-semibold tracking-wider uppercase rounded-full bg-white/20">
              Taxonomy
            </span>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight">Cell Type Taxonomy Selection</h3>
          <p className="text-base text-white/80 mt-2 leading-relaxed max-w-2xl">
            Select cell types for visualization. Click to expand hierarchical levels, then select subclasses or groups.
          </p>
        </div>
      </div>

      {/* Selection controls + Assay legend — side by side */}
      <div className={`rounded-2xl shadow-lg flex flex-col sm:flex-row overflow-hidden ${
        nightMode ? 'bg-gray-900/50 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        {/* Selection counter + bulk action buttons */}
        <div className={`flex flex-col gap-3 px-5 py-4 flex-shrink-0 border-b sm:border-b-0 sm:border-r ${
          nightMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          {/* Title */}
          <p className={`text-xs font-semibold uppercase tracking-wider ${nightMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Selection Controls
          </p>
          {/* Counter row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium ${nightMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Selected:
            </span>
            {selectionCounts.total === 0 ? (
              <span className={`text-xs ${nightMode ? 'text-gray-500' : 'text-gray-400'}`}>— None</span>
            ) : (
              <>
                {selectionCounts.subclasses > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-500 text-white">
                    {selectionCounts.subclasses} subclass{selectionCounts.subclasses !== 1 ? 'es' : ''}
                  </span>
                )}
                {selectionCounts.groups > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-science-500 text-white">
                    {selectionCounts.groups} group{selectionCounts.groups !== 1 ? 's' : ''}
                  </span>
                )}
              </>
            )}
          </div>
          {/* Button row */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={allExpanded ? collapseAll : expandAll}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                nightMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              } shadow-sm hover:shadow-md`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {allExpanded
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                }
              </svg>
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </button>
            <div className={`w-px h-4 ${nightMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
            <button
              onClick={selectAll}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                nightMode ? 'bg-primary-700 hover:bg-primary-600 text-white' : 'bg-primary-500 hover:bg-primary-600 text-white'
              } shadow-sm hover:shadow-md`}
            >
              Select All
            </button>
            <button
              onClick={clearAll}
              disabled={selectionCounts.total === 0}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectionCounts.total === 0
                  ? 'opacity-40 cursor-not-allowed ' + (nightMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500')
                  : nightMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 shadow-sm hover:shadow-md'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700 shadow-sm hover:shadow-md'
              }`}
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Assay legend */}
        {assayData.sortedAssays.length > 0 && (
          <div className="flex-1 px-6 py-4 flex flex-col items-center justify-center">
            <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${nightMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Assay Legend
            </p>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
              {assayData.sortedAssays.map(assay => {
                const color = assayData.colorMap.get(assay)!;
                const allModalities = new Set<string>();
                const collectModalities = (outer: Map<string, SpeciesAssayMap>) => {
                  outer.forEach(speciesMap => {
                    speciesMap.forEach(assayMap => {
                      (assayMap.get(assay) ?? new Set()).forEach(m => { if (m) allModalities.add(m); });
                    });
                  });
                };
                collectModalities(assayData.bySubclass);
                collectModalities(assayData.byGroup);
                const sortedModalities = Array.from(allModalities).sort();
                return (
                  <div key={assay} className="flex items-start gap-2">
                    <span
                      style={{ backgroundColor: color, width: 10, height: 10, marginTop: 2 }}
                      className="rounded-full flex-shrink-0 ring-1 ring-black/10 inline-block"
                    />
                    <div>
                      <span className={`text-xs font-bold ${nightMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {assay}
                      </span>
                      {sortedModalities.map(m => (
                        <p key={m} className={`text-[11px] leading-tight mt-0.5 ${nightMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          · {m}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Search Box */}
      <div className={`rounded-2xl shadow-lg p-4 ${
        nightMode ? 'bg-gray-900/50 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search taxonomy (neighborhood, class, subclass, or group)..."
            className={`w-full px-4 py-3 pl-12 rounded-lg text-sm transition-colors ${
              nightMode 
                ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-blue-500' 
                : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
            } border focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
          />
          <svg 
            className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${nightMode ? 'text-gray-400' : 'text-gray-500'}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`absolute right-4 top-1/2 -translate-y-1/2 ${nightMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className={`rounded-2xl shadow-xl overflow-hidden ${
        nightMode ? 'bg-gray-900/50 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        <div>
          <table className="w-full">
            <thead className={`${nightMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
              <tr>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                  nightMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Taxonomy Hierarchy
                </th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                  nightMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Select
                </th>
                <th className={`px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                  nightMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Available Assays
                </th>
              </tr>
            </thead>
            <tbody className={`${nightMode ? 'divide-gray-700' : 'divide-gray-300'}`}>
              {displayData.map((neighborhood) => {
                const nIndex = (neighborhood as any).originalIndex;
                return (
                <React.Fragment key={`n-${nIndex}`}>
                  {/* Neighborhood Row */}
                  <tr
                    className={`cursor-pointer transition-colors border-t-2 ${
                      nightMode 
                        ? 'hover:bg-gray-700/70 ' + getHierarchyColor(neighborhood.neighborhood, 'neighborhood', true) + ' border-gray-600'
                        : 'hover:brightness-95 ' + getHierarchyColor(neighborhood.neighborhood, 'neighborhood', false) + ' border-gray-400'
                    }`}
                    onClick={() => toggleNeighborhood(nIndex)}
                  >
                    <td className={`px-4 py-3 font-bold ${nightMode ? 'text-gray-100' : ''}`}>
                      <span className="inline-block w-4 text-center mr-2">
                        {neighborhood.isExpanded ? '▼' : '▶'}
                      </span>
                      <TaxonomyTooltip name={neighborhood.neighborhood} type="neighborhood">
                        {neighborhood.neighborhood}
                      </TaxonomyTooltip>
                    </td>
                    <td className="px-4 py-3"></td>
                    <td className="px-2 py-3"></td>
                  </tr>

                  {/* Classes under this Neighborhood */}
                  {neighborhood.isExpanded && neighborhood.classes.map((classObj) => {
                    const cIndex = (classObj as any).originalIndex;
                    return (
                    <React.Fragment key={`c-${nIndex}-${cIndex}`}>
                      <tr
                        className={`cursor-pointer transition-colors ${
                          nightMode 
                            ? 'hover:bg-gray-700/50 ' + getHierarchyColor(neighborhood.neighborhood, 'class', true)
                            : 'hover:brightness-95 ' + getHierarchyColor(neighborhood.neighborhood, 'class', false)
                        }`}
                        onClick={() => toggleClass(nIndex, cIndex)}
                      >
                        <td className={`px-4 py-3 pl-12 font-semibold ${nightMode ? 'text-gray-100' : ''}`}>
                          <span className="inline-block w-4 text-center mr-2">
                            {classObj.isExpanded ? '▼' : '▶'}
                          </span>
                          <TaxonomyTooltip name={classObj.class} type="class">
                            {classObj.class}
                          </TaxonomyTooltip>
                        </td>
                        <td className="px-4 py-3"></td>
                        <td className="px-2 py-3"></td>
                      </tr>

                      {/* Subclasses under this Class */}
                      {classObj.isExpanded && classObj.subclasses.map((subclass) => {
                        const sIndex = (subclass as any).originalIndex;
                        return (
                        <React.Fragment key={`s-${nIndex}-${cIndex}-${sIndex}`}>
                          <tr
                            className={`cursor-pointer transition-colors ${
                              nightMode 
                                ? 'hover:bg-gray-700/30 ' + getHierarchyColor(neighborhood.neighborhood, 'subclass', true)
                                : 'hover:brightness-95 ' + getHierarchyColor(neighborhood.neighborhood, 'subclass', false)
                            }`}
                            onClick={() => toggleSubclass(nIndex, cIndex, sIndex)}
                          >
                            <td className={`px-4 py-3 pl-20 font-medium ${nightMode ? 'text-gray-200' : ''}`}>
                              <span className="inline-block w-4 text-center mr-2">
                                {subclass.isExpanded ? '▼' : '▶'}
                              </span>
                              <TaxonomyTooltip name={subclass.subclass} type="subclass">{subclass.subclass}</TaxonomyTooltip>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSubclassSelection(nIndex, cIndex, sIndex);
                                  }}
                                  className={`min-w-[100px] px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    subclass.isSelected
                                      ? 'bg-primary-500 text-white shadow-md'
                                      : nightMode
                                      ? 'bg-science-700 text-science-300 hover:bg-science-600'
                                      : 'bg-science-200 text-science-700 hover:bg-science-300'
                                  }`}
                                >
                                  {subclass.isSelected ? 'Selected ✓' : 'Select'}
                                </button>
                                {subclass.groups.length > 0 && (() => {
                                  const allGroupsSelected = subclass.groups.every(g => g.isSelected);
                                  return (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleAllGroupsInSubclass(nIndex, cIndex, sIndex);
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                                        allGroupsSelected
                                          ? nightMode
                                            ? 'bg-amber-700 hover:bg-amber-600 text-white shadow-md'
                                            : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md'
                                          : nightMode
                                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                      }`}
                                    >
                                      {allGroupsSelected ? 'Deselect All Groups' : 'Select All Groups'}
                                    </button>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="px-2 py-3">
                              <AssayDotsBySpecies
                                speciesAssayMap={assayData.bySubclass.get(subclass.subclass)}
                                colorMap={assayData.colorMap}
                                nightMode={nightMode}
                              />
                            </td>
                          </tr>

                          {/* Groups under this Subclass */}
                          {subclass.isExpanded && subclass.groups.map((group) => {
                            const gIndex = (group as any).originalIndex;
                            return (
                            <tr
                              key={`g-${nIndex}-${cIndex}-${sIndex}-${gIndex}`}
                              className={`transition-colors ${
                                nightMode 
                                  ? 'hover:bg-gray-700/20 ' + getHierarchyColor(neighborhood.neighborhood, 'group', true)
                                  : 'hover:bg-gray-100 ' + getHierarchyColor(neighborhood.neighborhood, 'group', false)
                              }`}
                            >
                              <td className={`px-4 py-3 pl-28 text-sm ${nightMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                <TaxonomyTooltip name={group.group} type="group">{group.group}</TaxonomyTooltip>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleGroupSelection(nIndex, cIndex, sIndex, gIndex);
                                  }}
                                  className={`min-w-[100px] px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    group.isSelected
                                      ? 'bg-primary-500 text-white shadow-md'
                                      : nightMode
                                      ? 'bg-science-700 text-science-300 hover:bg-science-600'
                                      : 'bg-science-200 text-science-700 hover:bg-science-300'
                                  }`}
                                >
                                  {group.isSelected ? 'Selected ✓' : 'Select'}
                                </button>
                              </td>
                              <td className="px-2 py-3">
                                <AssayDotsBySpecies
                                  speciesAssayMap={assayData.byGroup.get(group.group)}
                                  colorMap={assayData.colorMap}
                                  nightMode={nightMode}
                                />
                              </td>
                            </tr>
                          );})}
                        </React.Fragment>
                      );})}
                    </React.Fragment>
                  );})}
                </React.Fragment>
              );})}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dataset + Region Distribution Panel */}
      <div className={`rounded-2xl shadow-xl overflow-hidden ${
        nightMode ? 'bg-gray-900/50 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        {/* Panel header */}
        <div className={`px-6 py-4 border-b ${nightMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${nightMode ? 'bg-blue-900/50' : 'bg-blue-100'}`}>
              <svg className={`w-4 h-4 ${nightMode ? 'text-blue-300' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${nightMode ? 'text-gray-100' : 'text-gray-900'}`}>
                Region Distribution Analysis
              </h3>
              <p className={`text-sm ${nightMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Cell harvest breakdown by brain region for your current taxonomy selections
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Dataset Selector row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className={`text-sm font-semibold whitespace-nowrap ${nightMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Dataset:
            </label>
            <select
              value={assayType}
              onChange={(e) => setAssayType(e.target.value as AssayType)}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                nightMode
                  ? 'bg-gray-800 border-gray-600 text-gray-100 focus:border-blue-500'
                  : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
              } border focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
            >
              <option value="HMBA">HMBA 10X Multiome</option>
              <option value="PairedTag">BG_PairedTag</option>
              <option value="snm3c">BG_snm3C-seq</option>
            </select>
          </div>

          {/* Summary prose */}
          {(() => {
            const datasetLabel = assayType === 'HMBA' ? 'HMBA 10X Multiome' : assayType === 'PairedTag' ? 'BG_PairedTag' : 'BG_snm3C-seq';
            const subTotal = Object.values(subclassRegionDistribution).reduce((s, n) => s + n, 0);
            const grpTotal = Object.values(groupRegionDistribution).reduce((s, n) => s + n, 0);
            const hasSubclass = selectionCounts.subclasses > 0 && subTotal > 0;
            const hasGroup = selectionCounts.groups > 0 && grpTotal > 0;

            const top3 = (dist: Record<string, number>) =>
              Object.entries(dist)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);

            if (!hasSubclass && !hasGroup) {
              return (
                <div className={`flex items-start gap-3 p-4 rounded-xl ${
                  nightMode ? 'bg-gray-800/60 border border-gray-700' : 'bg-blue-50 border border-blue-100'
                }`}>
                  <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${nightMode ? 'text-blue-400' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className={`text-sm ${nightMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    No subclasses or groups are selected yet. Use the taxonomy table above to select cell types, then this panel will show how many cells were harvested from each brain region in the <strong>{datasetLabel}</strong> dataset.
                  </p>
                </div>
              );
            }

            const lines: React.ReactNode[] = [];

            if (hasSubclass) {
              const regions = Object.keys(subclassRegionDistribution).length;
              const topRegions = top3(subclassRegionDistribution);
              const topStr = topRegions.map(([r, c]) => `${r} (${c.toLocaleString()} cells)`).join(', ');
              lines.push(
                <span key="sub">
                  The <strong>{selectionCounts.subclasses} selected subclass{selectionCounts.subclasses !== 1 ? 'es' : ''}</strong> account for{' '}
                  <strong>{subTotal.toLocaleString()} cells</strong> harvested from <strong>{regions} brain region{regions !== 1 ? 's' : ''}</strong>.
                  {topRegions.length > 0 && <> The top contributor{topRegions.length > 1 ? 's are' : ' is'} {topStr}.</>}
                </span>
              );
            }

            if (hasGroup) {
              const regions = Object.keys(groupRegionDistribution).length;
              const topRegions = top3(groupRegionDistribution);
              const topStr = topRegions.map(([r, c]) => `${r} (${c.toLocaleString()} cells)`).join(', ');
              lines.push(
                <span key="grp">
                  The <strong>{selectionCounts.groups} selected group{selectionCounts.groups !== 1 ? 's' : ''}</strong> account for{' '}
                  <strong>{grpTotal.toLocaleString()} cells</strong> across <strong>{regions} brain region{regions !== 1 ? 's' : ''}</strong>.
                  {topRegions.length > 0 && <> The top contributor{topRegions.length > 1 ? 's are' : ' is'} {topStr}.</>}
                </span>
              );
            }

            return (
              <div className={`flex items-start gap-3 p-4 rounded-xl ${
                nightMode ? 'bg-gray-800/60 border border-gray-700' : 'bg-blue-50 border border-blue-100'
              }`}>
                <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${nightMode ? 'text-blue-400' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className={`text-sm space-y-1 ${nightMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <p className={`font-semibold text-xs uppercase tracking-wider mb-1 ${nightMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {datasetLabel}
                  </p>
                  {lines.map((line, i) => <p key={i}>{line}</p>)}
                </div>
              </div>
            );
          })()}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RegionDistributionChart
              regionDistribution={subclassRegionDistribution}
              nightMode={nightMode}
              title="Subclass Region Distribution"
              description="Cell count distribution for selected subclasses"
            />
            <RegionDistributionChart
              regionDistribution={groupRegionDistribution}
              nightMode={nightMode}
              title="Group Region Distribution"
              description="Cell count distribution for selected groups"
            />
          </div>

          {/* Shared Region Abbreviation Legend */}
          {combinedRegionLegend.length > 0 && (
            <SharedRegionLegend entries={combinedRegionLegend} nightMode={nightMode} />
          )}
        </div>
      </div>

      {/* 3D Brain Structure Explorer Section */}
      <div className={`rounded-2xl shadow-xl overflow-hidden ${
        nightMode ? 'bg-gray-900/50 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          nightMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
        }`}>
          <div>
            <h3 className={`text-lg font-semibold ${nightMode ? 'text-gray-100' : 'text-gray-900'}`}>
              3D Brain Structure Explorer
            </h3>
            <p className={`text-sm mt-1 ${nightMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Interactive 3D reference atlas — select a species to explore brain structures
            </p>
          </div>
          <button
            onClick={() => setIsAtlasExpanded(!isAtlasExpanded)}
            className={`p-2 rounded-lg transition-all ${
              nightMode
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
            aria-label={isAtlasExpanded ? 'Collapse atlas' : 'Expand atlas'}
          >
            <svg 
              className={`w-5 h-5 transition-transform ${isAtlasExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        {isAtlasExpanded && (
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {([
                { key: 'human' as const, label: 'Human', icon: '🧠' },
                { key: 'mouse' as const, label: 'Mouse', icon: '🐭' },
                { key: 'marmoset' as const, label: 'Marmoset', icon: '🐒' },
                { key: 'macaque' as const, label: 'Macaque', icon: '🐵' },
              ]).map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setAtlasSpecies(atlasSpecies === key ? null : key)}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                    atlasSpecies === key
                      ? nightMode
                        ? 'bg-primary-600 text-white ring-2 ring-primary-400 shadow-lg'
                        : 'bg-primary-500 text-white ring-2 ring-primary-300 shadow-lg'
                      : nightMode
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  <span className="text-lg">{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
            {atlasSpecies && (
              <div className="relative w-full rounded-xl overflow-hidden" style={{ height: '800px' }}>
                <iframe
                  key={atlasSpecies}
                  src={{
                    human: 'https://atlas.brain-map.org/atlas?atlas=265297126#atlas=265297126&plate=112360888&structure=10390&x=40320&y=46976&zoom=-7&resolution=124.49&z=3',
                    mouse: 'https://atlas.brain-map.org/atlas?atlas=602630314#atlas=602630314&plate=576989940&structure=549&x=5280.017636427238&y=3744.003614738806&zoom=-3&resolution=11.93&z=3',
                    marmoset: 'https://scalablebrainatlas.incf.org/marmoset/PWPRT12',
                    macaque: 'https://scalablebrainatlas.incf.org/main/coronal3d.php?template=CBCetal15',
                  }[atlasSpecies]}
                  className="w-full h-full border-0"
                  title={`3D Brain Structure Explorer — ${atlasSpecies.charAt(0).toUpperCase() + atlasSpecies.slice(1)}`}
                  allow="fullscreen"
                  loading="lazy"
                  tabIndex={-1}
                />
              </div>
            )}
            {!atlasSpecies && (
              <div className={`flex items-center justify-center rounded-xl border-2 border-dashed py-16 ${
                nightMode ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-400'
              }`}>
                <p className="text-sm">Select a species above to load the brain atlas viewer</p>
              </div>
            )}
            <div className={`mt-4 pt-4 border-t text-xs ${
              nightMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'
            }`}>
              <p>
                Human and Mouse atlases provided by the{' '}
                <a href="https://atlas.brain-map.org/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500">
                  Allen Institute for Brain Science
                </a>
                . Marmoset and Macaque atlases provided by the{' '}
                <a href="https://scalablebrainatlas.incf.org/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500">
                  Scalable Brain Atlas
                </a>
                {' '}(INCF). Macaque atlas based on: Calabrese E, Badea A, Coe CL, Lubach GR, Shi Y, Styner MA, Johnson A (2015)
                {' '}&ldquo;A diffusion tensor MRI atlas of the postmortem rhesus macaque brain&rdquo;{' '}
                <em>Neuroimage</em> 117:408&ndash;416.{' '}
                <a href="https://doi.org/10.1016/j.neuroimage.2015.05.072" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500">
                  doi:10.1016/j.neuroimage.2015.05.072
                </a>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Next Step Button */}
      {onNextStep && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onNextStep}
            className={`group relative px-8 py-4 text-lg font-bold rounded-2xl shadow-2xl transition-all transform hover:scale-105 active:scale-95 ${
              nightMode
                ? 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white'
                : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white'
            }`}
          >
            <span className="flex items-center gap-3">
              <span>Next: Select Assays & Tracks</span>
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
      )}
    </div>
  );
};

export default TaxonomySelection;

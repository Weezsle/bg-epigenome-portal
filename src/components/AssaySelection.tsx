import React, { useMemo, useState, useCallback, useRef, type FC } from 'react';
import type { Track } from '../store/trackStore';
import { getTooltipText } from '../utils/abbreviationLookup';

type AssaySelectionProps = {
  nightMode: boolean;
  trackStates: Track[];
  setTrackStates: React.Dispatch<React.SetStateAction<Track[]>>;
  onNextStep?: () => void;
};

type PageSize = 10 | 25 | 100 | 'all';

type SortableColumn = 'subclass' | 'group' | 'assay' | 'modality' | 'source' | 'trackType' | 'description';
type SortDirection = 'asc' | 'desc';
type SortState = { column: SortableColumn; direction: SortDirection } | null;

const SPECIES_ORDER: Record<string, number> = {
  'hg38': 0,
  'mm10': 1,
  'rheMac10': 2,
  'mCalJa1.2': 3,
};

function getTrackSortValue(track: Track, column: SortableColumn): string {
  switch (column) {
    case 'subclass': return track.metadata.subclass || '';
    case 'group': return track.metadata.group || '';
    case 'assay': return track.metadata.assay || '';
    case 'modality': return track.metadata.modality || '';
    case 'source': return track.metadata.source || '';
    case 'trackType': return track.config.type || '';
    case 'description': return track.metadata.description || '';
  }
}

const PAGE_SIZE_OPTIONS: { value: PageSize; label: string }[] = [
  { value: 10, label: '10' },
  { value: 25, label: '25' },
  { value: 100, label: '100' },
  { value: 'all', label: 'All' },
];

const getReferenceLabel = (reference: string | undefined) => {
  if (reference === 'hg38') return 'Human (hg38)';
  if (reference === 'mm10') return 'Mouse (mm10)';
  if (reference === 'rheMac10') return 'Macaque (rheMac10)';
  if (reference === 'mCalJa1.2') return 'Marmoset (mCalJa1.2)';
  return reference || 'Unknown';
};

const getTypeLabel = (type: string) => {
  const typeLabels: Record<string, string> = {
    'bw': 'BigWig',
    'bigwig': 'BigWig',
    'bedgraph': 'BedGraph',
    'bed': 'BED',
    'bigBed': 'BigBed',
  };
  return typeLabels[type] || type;
};

const getSpeciesColor = (ref: string | undefined, nightMode: boolean) => {
  switch (ref) {
    case 'hg38': return nightMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-800';
    case 'mm10': return nightMode ? 'bg-orange-900/50 text-orange-300' : 'bg-orange-100 text-orange-800';
    case 'rheMac10': return nightMode ? 'bg-teal-900/50 text-teal-300' : 'bg-teal-100 text-teal-800';
    case 'mCalJa1.2': return nightMode ? 'bg-pink-900/50 text-pink-300' : 'bg-pink-100 text-pink-800';
    default: return nightMode ? 'bg-gray-900/50 text-gray-300' : 'bg-gray-100 text-gray-800';
  }
};

interface FilterState {
  species: string[];
  subclass: string[];
  group: string[];
  assay: string[];
  trackType: string[];
  modality: string[];
  source: string[];
}

const EMPTY_FILTER: FilterState = {
  species: [],
  subclass: [],
  group: [],
  assay: [],
  trackType: [],
  modality: [],
  source: [],
};

const FilterDropdown: FC<{
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  nightMode: boolean;
  renderLabel?: (value: string) => string;
}> = ({ label, options, selected, onChange, nightMode, renderLabel }) => {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false); // true = opened by click (sticky)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const show = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setOpen(true);
  };

  const handleMouseEnter = () => {
    if (pinned) return;
    hoverTimer.current = setTimeout(show, 120);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (pinned) return;
    setOpen(false);
  };

  const handleClick = () => {
    if (pinned) {
      setPinned(false);
      setOpen(false);
    } else {
      setPinned(true);
      setOpen(true);
    }
  };

  const dismissPinned = () => {
    setPinned(false);
    setOpen(false);
  };

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const clearThis = () => onChange([]);

  const activeCount = selected.length;

  return (
    <div
      className="relative"
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
          activeCount > 0
            ? nightMode
              ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
              : 'bg-primary-50 border-primary-300 text-primary-700'
            : nightMode
              ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <span>{label}</span>
        {activeCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-primary-500 text-white">
            {activeCount}
          </span>
        )}
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          {pinned && <div className="fixed inset-0 z-30" onClick={dismissPinned} />}
          <div className={`absolute z-40 mt-1 w-64 max-h-72 overflow-y-auto rounded-xl shadow-xl border ${
            nightMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            {activeCount > 0 && (
              <div className={`sticky top-0 z-10 px-3 py-2 border-b ${
                nightMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <button
                  onClick={clearThis}
                  className={`text-xs font-medium ${
                    nightMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'
                  }`}
                >
                  Clear {label} filter
                </button>
              </div>
            )}
            {options.map(option => {
              const isChecked = selected.includes(option);
              const display = renderLabel ? renderLabel(option) : option;
              return (
                <label
                  key={option}
                  className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                    isChecked
                      ? nightMode ? 'bg-primary-500/10' : 'bg-primary-50'
                      : nightMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(option)}
                    className="w-4 h-4 rounded cursor-pointer flex-shrink-0"
                  />
                  <span className={`text-sm truncate ${nightMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    {display}
                  </span>
                </label>
              );
            })}
            {options.length === 0 && (
              <div className={`px-3 py-4 text-center text-sm ${nightMode ? 'text-gray-500' : 'text-gray-400'}`}>
                No options
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const AssaySelection: FC<AssaySelectionProps> = ({
  nightMode,
  trackStates,
  setTrackStates,
  onNextStep,
}) => {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTER);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState<SortState>(null);

  const toggleSort = useCallback((column: SortableColumn) => {
    setSort(prev => {
      if (prev?.column === column) {
        if (prev.direction === 'asc') return { column, direction: 'desc' };
        return null; // third click clears sort
      }
      return { column, direction: 'asc' };
    });
    setCurrentPage(1);
  }, []);

  const updateFilter = useCallback((key: keyof FilterState, values: string[]) => {
    setFilters(prev => ({ ...prev, [key]: values }));
    setCurrentPage(1);
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters(EMPTY_FILTER);
    setCurrentPage(1);
  }, []);

  const activeFilterCount = useMemo(() =>
    Object.values(filters).reduce((sum, arr) => sum + arr.length, 0),
  [filters]);

  // Unique values for each filterable column
  const uniqueValues = useMemo(() => {
    const species = new Set<string>();
    const subclass = new Set<string>();
    const group = new Set<string>();
    const assay = new Set<string>();
    const trackType = new Set<string>();
    const modality = new Set<string>();
    const source = new Set<string>();

    trackStates.forEach(t => {
      if (t.metadata.reference) species.add(t.metadata.reference);
      if (t.metadata.subclass) subclass.add(t.metadata.subclass);
      if (t.metadata.group) group.add(t.metadata.group);
      if (t.metadata.assay) assay.add(t.metadata.assay);
      if (t.config.type) trackType.add(t.config.type);
      if (t.metadata.modality) modality.add(t.metadata.modality);
      if (t.metadata.source) source.add(t.metadata.source);
    });

    const speciesOrder = ['hg38', 'mm10', 'rheMac10', 'mCalJa1.2'];
    return {
      species: Array.from(species).sort((a, b) => speciesOrder.indexOf(a) - speciesOrder.indexOf(b)),
      subclass: Array.from(subclass).sort(),
      group: Array.from(group).sort(),
      assay: Array.from(assay).sort(),
      trackType: Array.from(trackType).sort(),
      modality: Array.from(modality).sort(),
      source: Array.from(source).sort(),
    };
  }, [trackStates]);

  // Filtered indices (indices into trackStates that pass all filters)
  const filteredIndices = useMemo(() => {
    return trackStates.reduce<number[]>((acc, track, i) => {
      if (filters.species.length > 0 && (!track.metadata.reference || !filters.species.includes(track.metadata.reference))) return acc;
      if (filters.subclass.length > 0 && (!track.metadata.subclass || !filters.subclass.includes(track.metadata.subclass))) return acc;
      if (filters.group.length > 0 && (!track.metadata.group || !filters.group.includes(track.metadata.group))) return acc;
      if (filters.assay.length > 0 && (!track.metadata.assay || !filters.assay.includes(track.metadata.assay))) return acc;
      if (filters.trackType.length > 0 && (!track.config.type || !filters.trackType.includes(track.config.type))) return acc;
      if (filters.modality.length > 0 && (!track.metadata.modality || !filters.modality.includes(track.metadata.modality))) return acc;
      if (filters.source.length > 0 && (!track.metadata.source || !filters.source.includes(track.metadata.source))) return acc;
      acc.push(i);
      return acc;
    }, []);
  }, [trackStates, filters]);

  // Sort filtered indices: always species-first, then by chosen column
  const sortedFilteredIndices = useMemo(() => {
    if (!sort) return filteredIndices;

    return [...filteredIndices].sort((a, b) => {
      const ta = trackStates[a];
      const tb = trackStates[b];

      // Primary: species order (always ascending to keep species blocks together)
      const specA = SPECIES_ORDER[ta.metadata.reference || ''] ?? 9999;
      const specB = SPECIES_ORDER[tb.metadata.reference || ''] ?? 9999;
      if (specA !== specB) return specA - specB;

      // Secondary: the selected column
      const valA = getTrackSortValue(ta, sort.column).toLowerCase();
      const valB = getTrackSortValue(tb, sort.column).toLowerCase();
      const cmp = valA.localeCompare(valB);
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }, [filteredIndices, trackStates, sort]);

  // Pagination
  const totalFiltered = sortedFilteredIndices.length;
  const effectivePageSize = pageSize === 'all' ? totalFiltered : pageSize;
  const totalPages = effectivePageSize > 0 ? Math.ceil(totalFiltered / effectivePageSize) : 1;
  const safePage = Math.min(currentPage, totalPages);

  const pagedIndices = useMemo(() => {
    if (pageSize === 'all') return sortedFilteredIndices;
    const start = (safePage - 1) * (pageSize as number);
    return sortedFilteredIndices.slice(start, start + (pageSize as number));
  }, [sortedFilteredIndices, safePage, pageSize]);

  // Selection helpers
  const toggleTrack = (originalIndex: number) => {
    setTrackStates(prev =>
      prev.map((track, i) =>
        i === originalIndex ? { ...track, selected: !track.selected } : track
      )
    );
  };

  const selectAllFiltered = () => {
    const filteredSet = new Set(filteredIndices);
    setTrackStates(prev =>
      prev.map((track, i) =>
        filteredSet.has(i) ? { ...track, selected: true } : track
      )
    );
  };

  const deselectAllFiltered = () => {
    const filteredSet = new Set(filteredIndices);
    setTrackStates(prev =>
      prev.map((track, i) =>
        filteredSet.has(i) ? { ...track, selected: false } : track
      )
    );
  };

  const toggleAllFiltered = () => {
    const allFilteredSelected = filteredIndices.every(i => trackStates[i].selected);
    const filteredSet = new Set(filteredIndices);
    setTrackStates(prev =>
      prev.map((track, i) =>
        filteredSet.has(i) ? { ...track, selected: !allFilteredSelected } : track
      )
    );
  };

  const selectedCount = trackStates.filter(t => t.selected).length;
  const filteredSelectedCount = filteredIndices.filter(i => trackStates[i].selected).length;

  // TSV download of selected tracks
  const downloadSelectedTSV = useCallback(() => {
    const selectedTracks = trackStates.filter(t => t.selected);
    if (selectedTracks.length === 0) return;

    const header = ['Species', 'Subclass', 'Group', 'Assay', 'Modality', 'Source', 'Track Type', 'Name', 'Description', 'URL'].join('\t');
    const rows = selectedTracks.map(t =>
      [
        t.metadata.reference || '',
        t.metadata.subclass || '',
        t.metadata.group || '',
        t.metadata.assay || '',
        t.metadata.modality || '',
        t.metadata.source || '',
        t.config.type || '',
        t.config.name || '',
        t.metadata.description || '',
        t.config.url || '',
      ].join('\t')
    );

    const tsv = [header, ...rows].join('\n');
    const blob = new Blob([tsv], { type: 'text/tab-separated-values;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bge_selected_tracks_${new Date().toISOString().slice(0, 10)}.tsv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [trackStates]);

  return (
    <div className={`space-y-6 ${nightMode ? 'text-gray-200' : 'text-gray-800'}`}>
      {/* Header */}
      <div className="rounded-2xl shadow-xl p-8 gradient-science text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pattern-neural" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 text-xs font-semibold tracking-wider uppercase rounded-full bg-white/20">
              Assays
            </span>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight">Filtered Tracks</h3>
          <p className="text-base text-white/80 mt-2 leading-relaxed max-w-2xl">
            Use column filters to narrow tracks by species, subclass, group, assay, modality, track type, or source.
            Select tracks to show in the genome browser, then download your selection as TSV.
          </p>
        </div>
      </div>

      {/* Filter + Controls panel */}
      <div className={`rounded-2xl shadow-xl p-6 space-y-4 ${
        nightMode ? 'card-science-dark' : 'card-science'
      }`}>
        {/* Stats row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h4 className={`text-lg font-semibold ${nightMode ? 'text-white' : 'text-science-900'}`}>
            Available Tracks
          </h4>
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`px-4 py-2 rounded-lg ${nightMode ? 'bg-science-800' : 'bg-science-100'}`}>
              <span className={`text-2xl font-bold ${nightMode ? 'text-sky-400' : 'text-primary-600'}`}>
                {trackStates.length}
              </span>
              <span className={`ml-2 text-sm ${nightMode ? 'text-science-400' : 'text-science-600'}`}>total</span>
            </div>
            {activeFilterCount > 0 && (
              <div className={`px-4 py-2 rounded-lg ${nightMode ? 'bg-accent-500/20' : 'bg-accent-100'}`}>
                <span className={`text-2xl font-bold ${nightMode ? 'text-accent-400' : 'text-accent-600'}`}>
                  {totalFiltered}
                </span>
                <span className={`ml-2 text-sm ${nightMode ? 'text-science-400' : 'text-science-600'}`}>filtered</span>
              </div>
            )}
            <div className={`px-4 py-2 rounded-lg ${nightMode ? 'bg-success-500/20' : 'bg-success-100'}`}>
              <span className={`text-2xl font-bold ${nightMode ? 'text-success-400' : 'text-success-600'}`}>
                {selectedCount}
              </span>
              <span className={`ml-2 text-sm ${nightMode ? 'text-science-400' : 'text-science-600'}`}>selected</span>
            </div>
          </div>
        </div>

        {/* Filter dropdowns row */}
        <div className={`p-4 rounded-xl border ${
          nightMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <svg className={`w-5 h-5 ${nightMode ? 'text-primary-400' : 'text-primary-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className={`text-sm font-semibold ${nightMode ? 'text-white' : 'text-gray-900'}`}>
              Column Filters
            </span>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className={`ml-auto text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                  nightMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'
                }`}
              >
                Clear all filters ({activeFilterCount})
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterDropdown
              label="Species"
              options={uniqueValues.species}
              selected={filters.species}
              onChange={(v) => updateFilter('species', v)}
              nightMode={nightMode}
              renderLabel={getReferenceLabel}
            />
            <FilterDropdown
              label="Subclass"
              options={uniqueValues.subclass}
              selected={filters.subclass}
              onChange={(v) => updateFilter('subclass', v)}
              nightMode={nightMode}
            />
            <FilterDropdown
              label="Group"
              options={uniqueValues.group}
              selected={filters.group}
              onChange={(v) => updateFilter('group', v)}
              nightMode={nightMode}
            />
            <FilterDropdown
              label="Assay"
              options={uniqueValues.assay}
              selected={filters.assay}
              onChange={(v) => updateFilter('assay', v)}
              nightMode={nightMode}
            />
            <FilterDropdown
              label="Track Type"
              options={uniqueValues.trackType}
              selected={filters.trackType}
              onChange={(v) => updateFilter('trackType', v)}
              nightMode={nightMode}
              renderLabel={getTypeLabel}
            />
            <FilterDropdown
              label="Modality"
              options={uniqueValues.modality}
              selected={filters.modality}
              onChange={(v) => updateFilter('modality', v)}
              nightMode={nightMode}
            />
            <FilterDropdown
              label="Source"
              options={uniqueValues.source}
              selected={filters.source}
              onChange={(v) => updateFilter('source', v)}
              nightMode={nightMode}
            />
          </div>
        </div>

        {/* Selection + download controls */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-sm font-medium ${nightMode ? 'text-science-400' : 'text-science-600'}`}>
            Filtered ({totalFiltered}):
          </span>
          <button
            onClick={selectAllFiltered}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              nightMode
                ? 'bg-primary-500/20 text-primary-400 hover:bg-primary-500/30'
                : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
            }`}
          >
            Select All Filtered
          </button>
          <button
            onClick={deselectAllFiltered}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              nightMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Deselect All Filtered
          </button>

          <div className={`mx-2 w-px h-5 ${nightMode ? 'bg-gray-600' : 'bg-gray-300'}`} />

          {/* Download */}
          <button
            onClick={downloadSelectedTSV}
            disabled={selectedCount === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              selectedCount === 0
                ? 'opacity-40 cursor-not-allowed ' + (nightMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400')
                : nightMode
                  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            }`}
            title={selectedCount === 0 ? 'Select tracks first' : `Download ${selectedCount} selected tracks as TSV`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download TSV ({selectedCount})
          </button>
        </div>
      </div>

      {/* Table */}
      {trackStates.length === 0 ? (
        <div className={`rounded-2xl shadow-xl p-12 text-center ${
          nightMode ? 'bg-gray-900/50 border border-gray-700' : 'bg-white border border-gray-200'
        }`}>
          <div className="text-6xl mb-4">🔍</div>
          <h3 className={`text-xl font-semibold mb-2 ${nightMode ? 'text-gray-100' : 'text-gray-900'}`}>
            No Tracks Found
          </h3>
          <p className={nightMode ? 'text-gray-400' : 'text-gray-600'}>
            Please select cell types from the Taxonomy Selection tab to view available tracks.
          </p>
        </div>
      ) : totalFiltered === 0 ? (
        <div className={`rounded-2xl shadow-xl p-12 text-center ${
          nightMode ? 'bg-gray-900/50 border border-gray-700' : 'bg-white border border-gray-200'
        }`}>
          <div className="text-6xl mb-4">🔎</div>
          <h3 className={`text-xl font-semibold mb-2 ${nightMode ? 'text-gray-100' : 'text-gray-900'}`}>
            No Matching Tracks
          </h3>
          <p className={nightMode ? 'text-gray-400' : 'text-gray-600'}>
            No tracks match your current filters. Try adjusting or clearing filters.
          </p>
          <button
            onClick={clearAllFilters}
            className={`mt-4 px-4 py-2 rounded-lg font-medium transition-colors ${
              nightMode
                ? 'bg-primary-500 text-white hover:bg-primary-400'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className={`rounded-2xl shadow-xl overflow-hidden ${
          nightMode ? 'bg-gray-900/50 border border-gray-700' : 'bg-white border border-gray-200'
        }`}>
          {/* Pagination header */}
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b ${
            nightMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-3">
              <span className={`text-sm ${nightMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Rows per page:
              </span>
              <div className="flex rounded-lg overflow-hidden border shadow-sm"
                style={{ borderColor: nightMode ? '#374151' : '#d1d5db' }}>
                {PAGE_SIZE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setPageSize(opt.value); setCurrentPage(1); }}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      pageSize === opt.value
                        ? nightMode
                          ? 'bg-primary-600 text-white'
                          : 'bg-primary-500 text-white'
                        : nightMode
                          ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-sm ${nightMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {pageSize === 'all'
                  ? `1–${totalFiltered} of ${totalFiltered}`
                  : `${Math.min((safePage - 1) * (pageSize as number) + 1, totalFiltered)}–${Math.min(safePage * (pageSize as number), totalFiltered)} of ${totalFiltered}`
                }
                {activeFilterCount > 0 && filteredSelectedCount > 0 && (
                  <span className={`ml-1 ${nightMode ? 'text-primary-400' : 'text-primary-600'}`}>
                    ({filteredSelectedCount} selected in view)
                  </span>
                )}
              </span>

              {pageSize !== 'all' && totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={safePage <= 1}
                    className={`p-1.5 rounded transition-colors ${
                      safePage <= 1
                        ? 'opacity-30 cursor-not-allowed'
                        : nightMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'
                    }`}
                    title="First page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className={`p-1.5 rounded transition-colors ${
                      safePage <= 1
                        ? 'opacity-30 cursor-not-allowed'
                        : nightMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'
                    }`}
                    title="Previous page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className={`text-sm px-2 ${nightMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {safePage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className={`p-1.5 rounded transition-colors ${
                      safePage >= totalPages
                        ? 'opacity-30 cursor-not-allowed'
                        : nightMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'
                    }`}
                    title="Next page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safePage >= totalPages}
                    className={`p-1.5 rounded transition-colors ${
                      safePage >= totalPages
                        ? 'opacity-30 cursor-not-allowed'
                        : nightMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'
                    }`}
                    title="Last page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Actual table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={nightMode ? 'bg-gray-800' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                    nightMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Select
                  </th>
                  {/* Species: not sortable */}
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${nightMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    Species
                  </th>
                  {/* Sortable columns */}
                  {([
                    ['subclass', 'Subclass'],
                    ['group', 'Group'],
                    ['assay', 'Assay'],
                    ['modality', 'Modality'],
                    ['source', 'Source'],
                    ['trackType', 'Track Type'],
                    ['description', 'Description'],
                  ] as [SortableColumn, string][]).map(([col, label]) => {
                    const isActive = sort?.column === col;
                    return (
                      <th
                        key={col}
                        onClick={() => toggleSort(col)}
                        className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer select-none transition-colors ${
                          isActive
                            ? nightMode ? 'text-primary-300' : 'text-primary-600'
                            : nightMode ? 'text-gray-300 hover:text-gray-100' : 'text-gray-500 hover:text-gray-800'
                        }`}
                        title={isActive ? `Sorted ${sort!.direction === 'asc' ? 'ascending' : 'descending'} — click to ${sort!.direction === 'asc' ? 'reverse' : 'clear'}` : `Sort by ${label}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {label}
                          {isActive ? (
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {sort!.direction === 'asc'
                                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                              }
                            </svg>
                          ) : (
                            <svg className={`w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-40 ${nightMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                          )}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className={`divide-y ${nightMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
                {pagedIndices.map((originalIndex) => {
                  const track = trackStates[originalIndex];
                  return (
                    <tr
                      key={originalIndex}
                      onClick={() => toggleTrack(originalIndex)}
                      className={`transition-colors cursor-pointer ${
                        track.selected
                          ? nightMode ? 'bg-primary-500/10' : 'bg-primary-50/60'
                          : nightMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={track.selected || false}
                          onChange={() => toggleTrack(originalIndex)}
                          className="w-5 h-5 rounded cursor-pointer"
                        />
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm`}>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSpeciesColor(track.metadata.reference, nightMode)}`}>
                          {getReferenceLabel(track.metadata.reference)}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm ${nightMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <div className="max-w-xs truncate" title={track.metadata.subclass ? getTooltipText(track.metadata.subclass, 'subclass') : '-'}>
                          {track.metadata.subclass || '-'}
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-sm ${nightMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <div className="max-w-xs font-medium whitespace-normal break-words" title={track.metadata.group ? getTooltipText(track.metadata.group, 'group') : '-'}>
                          {track.metadata.group || '-'}
                        </div>
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm`}>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          track.metadata.assay === 'DNA'
                            ? nightMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800'
                            : nightMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'
                        }`}>
                          {track.metadata.assay || '-'}
                        </span>
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm ${nightMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {track.metadata.modality || '-'}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm`}>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          track.metadata.source === 'Allen Institute'
                            ? nightMode ? 'bg-cyan-900/50 text-cyan-300' : 'bg-cyan-100 text-cyan-800'
                            : nightMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {track.metadata.source || '-'}
                        </span>
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm ${nightMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {getTypeLabel(track.config.type)}
                      </td>
                      <td className={`px-4 py-3 text-sm ${nightMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <div className="max-w-md whitespace-normal break-words" title={track.metadata.description || '-'}>
                          {track.metadata.description || '-'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          {pageSize !== 'all' && totalPages > 1 && (
            <div className={`flex items-center justify-between px-4 py-3 border-t ${
              nightMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
            }`}>
              <span className={`text-sm ${nightMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Page {safePage} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    safePage <= 1
                      ? 'opacity-30 cursor-not-allowed'
                      : nightMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    safePage >= totalPages
                      ? 'opacity-30 cursor-not-allowed'
                      : nightMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Next Step Button */}
      {onNextStep && (
        <div className="flex justify-center pt-6">
          <button
            onClick={onNextStep}
            className={`group relative px-8 py-4 text-lg font-bold rounded-2xl shadow-2xl transition-all transform hover:scale-105 active:scale-95 ${
              nightMode
                ? 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white'
                : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white'
            }`}
          >
            <span className="flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Next: Visualize Your Tracks on WashU Epigenome Browser</span>
              <svg className="w-6 h-6 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

export default AssaySelection;

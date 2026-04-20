import { type FC, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  parseTaxonomyData,
  loadGroupRegionDistribution,
  loadSubclassRegionDistribution,
  parseRegionDistribution,
  type TaxonomyNeighborhood,
  type AssayType,
} from '../store/taxonomyStore';
import { parseTracksData, type Track } from '../store/trackStore';
import { getRegionFullName } from '../utils/regionAbbreviationLookup';
import TaxonomyTooltip from './TaxonomyTooltip';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
  type ChartConfiguration,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, BarController, Title, Tooltip, Legend);

type DataExplorerProps = {
  nightMode: boolean;
};

type TaxonomyLevel = 'subclass' | 'group';

interface SearchItem {
  name: string;
  level: TaxonomyLevel;
  neighborhood: string;
  class: string;
  subclass: string;
  group?: string;
}

interface AssayCard {
  assay: string;
  species: string[];
  modalities: string[];
  trackCount: number;
  tracks: Track[];
}

const ASSAY_DISPLAY: Record<string, string> = {
  '10X multiome': '10X Multiome',
  'ATAC-seq': 'ATAC-seq',
  'Paired Tag': 'Paired Tag',
  'Paired Tag,': 'Paired Tag+',
  'snm3C-seq': 'snm3C-seq',
};

const SPECIES_DISPLAY: Record<string, string> = {
  hg38: 'Human',
  rheMac10: 'Macaque',
  'mCalJa1.2': 'Marmoset',
  mm10: 'Mouse',
};

const SPECIES_ORDER: Record<string, number> = {
  hg38: 0,
  mm10: 1,
  rheMac10: 2,
  'mCalJa1.2': 3,
};

const ASSAY_TYPE_LABELS: Record<AssayType, string> = {
  HMBA: 'HMBA (10X Multiome)',
  PairedTag: 'Paired Tag',
  snm3c: 'snm3C-seq',
};

function buildSearchIndex(taxonomy: TaxonomyNeighborhood[]): SearchItem[] {
  const items: SearchItem[] = [];
  const seenSubclasses = new Set<string>();

  taxonomy.forEach((nh) => {
    nh.classes.forEach((cls) => {
      cls.subclasses.forEach((sc) => {
        if (!seenSubclasses.has(sc.subclass)) {
          seenSubclasses.add(sc.subclass);
          items.push({
            name: sc.subclass,
            level: 'subclass',
            neighborhood: nh.neighborhood,
            class: cls.class,
            subclass: sc.subclass,
          });
        }
        sc.groups.forEach((g) => {
          items.push({
            name: g.group,
            level: 'group',
            neighborhood: nh.neighborhood,
            class: cls.class,
            subclass: sc.subclass,
            group: g.group,
          });
        });
      });
    });
  });

  return items;
}

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return true;
  const tokens = q.split(/\s+/);
  return tokens.every((tok) => t.includes(tok));
}

function buildAssayCards(tracks: Track[], selected: SearchItem): AssayCard[] {
  const filtered = tracks.filter((t) => {
    if (selected.level === 'subclass') return t.metadata.subclass === selected.subclass;
    return t.metadata.group === selected.group;
  });

  const byAssay = new Map<string, Track[]>();
  filtered.forEach((t) => {
    const a = t.metadata.assay || 'Unknown';
    if (!byAssay.has(a)) byAssay.set(a, []);
    byAssay.get(a)!.push(t);
  });

  const cards: AssayCard[] = [];
  byAssay.forEach((assayTracks, assay) => {
    const speciesSet = new Set<string>();
    const modalitySet = new Set<string>();
    assayTracks.forEach((t) => {
      if (t.metadata.reference) speciesSet.add(t.metadata.reference);
      if (t.metadata.modality) modalitySet.add(t.metadata.modality);
    });
    cards.push({
      assay,
      species: Array.from(speciesSet).sort((a, b) => (SPECIES_ORDER[a] ?? 99) - (SPECIES_ORDER[b] ?? 99)),
      modalities: Array.from(modalitySet).sort(),
      trackCount: assayTracks.length,
      tracks: assayTracks,
    });
  });

  cards.sort((a, b) => a.assay.localeCompare(b.assay));
  return cards;
}

function getRegionDistributions(
  selected: SearchItem
): Record<AssayType, { distribution: Record<string, number>; total: number }> {
  const assayTypes: AssayType[] = ['HMBA', 'PairedTag', 'snm3c'];
  const result: Record<string, { distribution: Record<string, number>; total: number }> = {};

  assayTypes.forEach((at) => {
    let distStr = '';
    if (selected.level === 'subclass') {
      const map = loadSubclassRegionDistribution(at);
      const key = `${selected.neighborhood}|${selected.class}|${selected.subclass}`;
      distStr = map.get(key) || '';
    } else {
      const map = loadGroupRegionDistribution(at);
      const key = `${selected.neighborhood}|${selected.class}|${selected.subclass}|${selected.group}`;
      distStr = map.get(key) || '';
    }
    const distribution = parseRegionDistribution(distStr);
    const total = Object.values(distribution).reduce((s, v) => s + v, 0);
    result[at] = { distribution, total };
  });

  return result as Record<AssayType, { distribution: Record<string, number>; total: number }>;
}

const MODALITY_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  accessibility: { bg: 'bg-blue-100', text: 'text-blue-700', darkBg: 'bg-blue-500/20', darkText: 'text-blue-300' },
  expression: { bg: 'bg-emerald-100', text: 'text-emerald-700', darkBg: 'bg-emerald-500/20', darkText: 'text-emerald-300' },
  'DNA methylation': { bg: 'bg-purple-100', text: 'text-purple-700', darkBg: 'bg-purple-500/20', darkText: 'text-purple-300' },
  'H3K27ac modification': { bg: 'bg-amber-100', text: 'text-amber-700', darkBg: 'bg-amber-500/20', darkText: 'text-amber-300' },
  'H3K27me3 modification': { bg: 'bg-rose-100', text: 'text-rose-700', darkBg: 'bg-rose-500/20', darkText: 'text-rose-300' },
  'H3K9me3 modification': { bg: 'bg-orange-100', text: 'text-orange-700', darkBg: 'bg-orange-500/20', darkText: 'text-orange-300' },
  'chromatin conformation': { bg: 'bg-cyan-100', text: 'text-cyan-700', darkBg: 'bg-cyan-500/20', darkText: 'text-cyan-300' },
};

const DEFAULT_MODALITY_COLOR = { bg: 'bg-gray-100', text: 'text-gray-700', darkBg: 'bg-gray-500/20', darkText: 'text-gray-300' };

// ── Sub-components ──────────────────────────────────────────────────────

const ModalityBadge: FC<{ modality: string; nightMode: boolean }> = ({ modality, nightMode }) => {
  const c = MODALITY_COLORS[modality] ?? DEFAULT_MODALITY_COLOR;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${nightMode ? `${c.darkBg} ${c.darkText}` : `${c.bg} ${c.text}`}`}>
      {modality}
    </span>
  );
};

const SpeciesPill: FC<{ species: string; nightMode: boolean }> = ({ species, nightMode }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
      nightMode ? 'bg-science-700/60 text-science-200' : 'bg-science-100 text-science-700'
    }`}
  >
    {SPECIES_DISPLAY[species] ?? species}
  </span>
);

const RegionBarChart: FC<{
  distribution: Record<string, number>;
  total: number;
  nightMode: boolean;
  title: string;
}> = ({ distribution, total, nightMode, title }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS | null>(null);

  const sorted = useMemo(() => {
    return Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  }, [distribution]);

  const labels = sorted.map(([r]) => r);
  const values = sorted.map(([, v]) => v);

  useEffect(() => {
    if (!canvasRef.current || sorted.length === 0) return;
    if (chartRef.current) chartRef.current.destroy();

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Nuclei',
            data: values,
            backgroundColor: nightMode ? 'rgba(96,165,250,0.75)' : 'rgba(59,130,246,0.75)',
            borderColor: nightMode ? 'rgba(96,165,250,1)' : 'rgba(59,130,246,1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: false },
          tooltip: {
            backgroundColor: nightMode ? 'rgba(31,41,55,0.95)' : 'rgba(255,255,255,0.95)',
            titleColor: nightMode ? '#e5e7eb' : '#1f2937',
            bodyColor: nightMode ? '#d1d5db' : '#374151',
            borderColor: nightMode ? '#4b5563' : '#d1d5db',
            borderWidth: 1,
            callbacks: {
              title: (items) => {
                const abbr = items[0]?.label ?? '';
                const full = getRegionFullName(abbr);
                return full ? `${abbr} — ${full}` : abbr;
              },
              label: (ctx) => {
                const v = ctx.parsed.y;
                const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0.0';
                return `${v.toLocaleString()} nuclei (${pct}%)`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: nightMode ? '#d1d5db' : '#374151', font: { size: 10 } },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: nightMode ? '#d1d5db' : '#374151',
              callback: (v) => (typeof v === 'number' ? v.toLocaleString() : v),
            },
            grid: { color: nightMode ? 'rgba(75,85,99,0.3)' : 'rgba(229,231,235,0.8)' },
          },
        },
      },
    };

    chartRef.current = new ChartJS(ctx, config);
    return () => {
      chartRef.current?.destroy();
    };
  }, [labels, values, nightMode, total, sorted.length]);

  if (sorted.length === 0) {
    return (
      <div className={`p-6 rounded-lg text-center text-sm ${nightMode ? 'bg-science-800/40 text-science-500' : 'bg-science-50 text-science-400'}`}>
        No region data for {title}
      </div>
    );
  }

  return (
    <div className={`rounded-lg overflow-hidden border ${nightMode ? 'border-science-700 bg-science-800/40' : 'border-science-200 bg-white'}`}>
      <div className={`px-4 py-2 flex items-center justify-between border-b ${nightMode ? 'border-science-700' : 'border-science-200'}`}>
        <h4 className={`text-sm font-semibold ${nightMode ? 'text-white' : 'text-science-900'}`}>{title}</h4>
        <span className={`text-xs ${nightMode ? 'text-science-400' : 'text-science-500'}`}>
          {total.toLocaleString()} nuclei · {sorted.length} regions
        </span>
      </div>
      <div className="p-3" style={{ height: 260 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};

const TrackDetailList: FC<{
  tracks: Track[];
  nightMode: boolean;
  selectedName: string;
}> = ({ tracks, nightMode, selectedName }) => {
  const [isOpen, setIsOpen] = useState(false);

  const exportTracksCsv = () => {
    const headers = ['Track Name', 'Assay', 'Modality', 'Species', 'Source', 'Subclass', 'Group', 'Type', 'URL'];
    const rows = tracks.map((t) => [
      t.config.name,
      t.metadata.assay ?? '',
      t.metadata.modality ?? '',
      SPECIES_DISPLAY[t.metadata.reference ?? ''] ?? t.metadata.reference ?? '',
      t.metadata.source ?? '',
      t.metadata.subclass ?? '',
      t.metadata.group ?? '',
      t.config.type,
      t.config.url,
    ]);
    const csv = [
      headers.map((h) => `"${h}"`).join(','),
      ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedName.replace(/\s+/g, '_')}_tracks.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`rounded-lg border overflow-hidden ${nightMode ? 'border-science-700' : 'border-science-200'}`}>
      <div className={`flex items-center justify-between px-4 py-2.5 ${nightMode ? 'bg-science-800/60' : 'bg-science-50'}`}>
        <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 flex-1 text-left">
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''} ${nightMode ? 'text-science-400' : 'text-science-500'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <h4 className={`text-sm font-semibold ${nightMode ? 'text-science-300' : 'text-science-700'}`}>
            Track Details
          </h4>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            nightMode ? 'bg-science-700 text-science-400' : 'bg-science-200 text-science-600'
          }`}>
            {tracks.length}
          </span>
        </button>
        <button
          onClick={exportTracksCsv}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            nightMode
              ? 'bg-primary-500/20 text-primary-400 hover:bg-primary-500/30'
              : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>

      {isOpen && (
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className={`w-full text-xs ${nightMode ? 'text-science-300' : 'text-science-700'}`}>
            <thead>
              <tr className={`sticky top-0 z-10 ${nightMode ? 'bg-science-800' : 'bg-science-100'}`}>
                <th className={`px-3 py-2 text-left font-semibold ${nightMode ? 'text-science-200' : 'text-science-800'}`}>Track Name</th>
                <th className={`px-3 py-2 text-left font-semibold ${nightMode ? 'text-science-200' : 'text-science-800'}`}>Assay</th>
                <th className={`px-3 py-2 text-left font-semibold ${nightMode ? 'text-science-200' : 'text-science-800'}`}>Modality</th>
                <th className={`px-3 py-2 text-left font-semibold ${nightMode ? 'text-science-200' : 'text-science-800'}`}>Species</th>
                <th className={`px-3 py-2 text-left font-semibold ${nightMode ? 'text-science-200' : 'text-science-800'}`}>Source</th>
                <th className={`px-3 py-2 text-left font-semibold ${nightMode ? 'text-science-200' : 'text-science-800'}`}>Type</th>
                <th className={`px-3 py-2 text-left font-semibold ${nightMode ? 'text-science-200' : 'text-science-800'}`}>URL</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((t, i) => (
                <tr
                  key={i}
                  className={`border-t transition-colors ${
                    nightMode
                      ? 'border-science-700/50 hover:bg-science-700/30'
                      : 'border-science-200 hover:bg-primary-50/50'
                  }`}
                >
                  <td className={`px-3 py-1.5 font-medium max-w-[200px] truncate ${nightMode ? 'text-white' : 'text-science-900'}`} title={t.config.name}>
                    {t.config.name}
                  </td>
                  <td className="px-3 py-1.5">{ASSAY_DISPLAY[t.metadata.assay ?? ''] ?? t.metadata.assay ?? ''}</td>
                  <td className="px-3 py-1.5">
                    {t.metadata.modality && <ModalityBadge modality={t.metadata.modality} nightMode={nightMode} />}
                  </td>
                  <td className="px-3 py-1.5">{SPECIES_DISPLAY[t.metadata.reference ?? ''] ?? t.metadata.reference ?? ''}</td>
                  <td className="px-3 py-1.5">{t.metadata.source ?? ''}</td>
                  <td className="px-3 py-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      nightMode ? 'bg-science-700/60 text-science-300' : 'bg-science-100 text-science-600'
                    }`}>
                      {t.config.type}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 max-w-[250px]">
                    <a
                      href={t.config.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`truncate block underline ${nightMode ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}`}
                      title={t.config.url}
                    >
                      {t.config.url.split('/').pop() || t.config.url}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Main component ──────────────────────────────────────────────────────

const DataExplorer: FC<DataExplorerProps> = ({ nightMode }) => {
  const taxonomyData = useMemo(() => parseTaxonomyData(), []);
  const tracks = useMemo(() => parseTracksData(), []);
  const searchIndex = useMemo(() => buildSearchIndex(taxonomyData), [taxonomyData]);

  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<SearchItem | null>(null);
  const [activeAssayTab, setActiveAssayTab] = useState<AssayType | 'all'>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return [];
    return searchIndex.filter((item) => fuzzyMatch(query, item.name)).slice(0, 40);
  }, [query, searchIndex]);

  // Group filtered results by hierarchy path
  const groupedResults = useMemo(() => {
    const groups = new Map<string, SearchItem[]>();
    filteredItems.forEach((item) => {
      const path = `${item.neighborhood} › ${item.class}`;
      if (!groups.has(path)) groups.set(path, []);
      groups.get(path)!.push(item);
    });
    return groups;
  }, [filteredItems]);

  const handleSelect = useCallback((item: SearchItem) => {
    setSelected(item);
    setQuery(item.name);
    setShowDropdown(false);
    setActiveAssayTab('all');
  }, []);

  const handleClear = useCallback(() => {
    setSelected(null);
    setQuery('');
    setActiveAssayTab('all');
    inputRef.current?.focus();
  }, []);

  const assayCards = useMemo(() => {
    if (!selected) return [];
    return buildAssayCards(tracks, selected);
  }, [selected, tracks]);

  const allTracks = useMemo(() => {
    if (!selected) return [];
    return tracks.filter((t) => {
      if (selected.level === 'subclass') return t.metadata.subclass === selected.subclass;
      return t.metadata.group === selected.group;
    });
  }, [selected, tracks]);

  const regionData = useMemo(() => {
    if (!selected) return null;
    return getRegionDistributions(selected);
  }, [selected]);

  const availableAssayTabs = useMemo(() => {
    if (!regionData) return [];
    const tabs: AssayType[] = [];
    (['HMBA', 'PairedTag', 'snm3c'] as AssayType[]).forEach((at) => {
      if (regionData[at].total > 0) tabs.push(at);
    });
    return tabs;
  }, [regionData]);

  return (
    <div className={`rounded-2xl overflow-hidden shadow-xl ${nightMode ? 'card-science-dark' : 'card-science'}`}>
      {/* Header */}
      <div className={`px-6 py-5 border-b ${nightMode ? 'border-science-700' : 'border-science-200'}`}>
        <h3 className={`text-xl font-bold mb-1 ${nightMode ? 'text-white' : 'text-science-900'}`}>
          Interactive Data Explorer
        </h3>
        <p className={`text-sm ${nightMode ? 'text-science-400' : 'text-science-500'}`}>
          Search for a cell type by subclass or group name, then explore available assays, modalities, and region distribution.
        </p>
      </div>

      <div className="px-6 py-5 space-y-6">
        {/* Search bar */}
        <div className="relative">
          <label className={`block text-sm font-medium mb-1.5 ${nightMode ? 'text-science-300' : 'text-science-700'}`}>
            Search cell type
          </label>
          <div className="relative">
            <svg
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
                nightMode ? 'text-science-500' : 'text-science-400'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowDropdown(true);
                if (!e.target.value.trim()) setSelected(null);
              }}
              onFocus={() => {
                if (query.trim()) setShowDropdown(true);
              }}
              placeholder="e.g. D2 MSN, Astrocyte, Microglia, Oligodendrocyte …"
              className={`w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm transition-colors ${
                nightMode
                  ? 'bg-science-800 border-science-600 text-white placeholder-science-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500'
                  : 'bg-white border-science-300 text-science-900 placeholder-science-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500'
              }`}
            />
            {query && (
              <button
                onClick={handleClear}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded ${
                  nightMode ? 'text-science-500 hover:text-science-300' : 'text-science-400 hover:text-science-600'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Dropdown */}
          {showDropdown && filteredItems.length > 0 && (
            <div
              ref={dropdownRef}
              className={`absolute z-50 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border shadow-xl ${
                nightMode ? 'bg-science-800 border-science-600' : 'bg-white border-science-200'
              }`}
            >
              {Array.from(groupedResults.entries()).map(([path, items]) => (
                <div key={path}>
                  <div
                    className={`px-3 py-1.5 text-xs font-semibold sticky top-0 ${
                      nightMode ? 'bg-science-700/90 text-science-400' : 'bg-science-50 text-science-500'
                    }`}
                  >
                    {path}
                  </div>
                  {items.map((item) => (
                    <button
                      key={`${item.level}-${item.name}`}
                      onClick={() => handleSelect(item)}
                      className={`w-full text-left px-4 py-2 flex items-center gap-2 text-sm transition-colors ${
                        nightMode ? 'hover:bg-science-700/60 text-science-200' : 'hover:bg-primary-50 text-science-800'
                      } ${selected?.name === item.name && selected?.level === item.level ? (nightMode ? 'bg-primary-500/15' : 'bg-primary-50') : ''}`}
                    >
                      <span
                        className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          item.level === 'subclass'
                            ? nightMode
                              ? 'bg-primary-500/20 text-primary-400'
                              : 'bg-primary-100 text-primary-700'
                            : nightMode
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.level}
                      </span>
                      <TaxonomyTooltip name={item.name} type={item.level}>
                        <span className="truncate">
                          {item.name}
                        </span>
                      </TaxonomyTooltip>
                      {item.level === 'group' && (
                        <span className={`ml-auto text-xs shrink-0 ${nightMode ? 'text-science-500' : 'text-science-400'}`}>
                          {item.subclass}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {showDropdown && query.trim() && filteredItems.length === 0 && (
            <div
              ref={dropdownRef}
              className={`absolute z-50 mt-1 w-full rounded-lg border shadow-xl p-4 text-center text-sm ${
                nightMode ? 'bg-science-800 border-science-600 text-science-500' : 'bg-white border-science-200 text-science-400'
              }`}
            >
              No matching cell types found
            </div>
          )}
        </div>

        {/* Selected item header */}
        {selected && (
          <div className={`rounded-lg px-4 py-3 flex flex-wrap items-center gap-3 ${
            nightMode ? 'bg-science-800/60 border border-science-700' : 'bg-science-50 border border-science-200'
          }`}>
            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${
              selected.level === 'subclass'
                ? nightMode ? 'bg-primary-500/20 text-primary-400' : 'bg-primary-100 text-primary-700'
                : nightMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
            }`}>
              {selected.level}
            </span>
            <TaxonomyTooltip name={selected.name} type={selected.level}>
              <span className={`font-semibold ${nightMode ? 'text-white' : 'text-science-900'}`}>
                {selected.name}
              </span>
            </TaxonomyTooltip>
            <span className={`text-xs ${nightMode ? 'text-science-500' : 'text-science-400'}`}>
              <TaxonomyTooltip name={selected.neighborhood} type="neighborhood">
                <span>{selected.neighborhood}</span>
              </TaxonomyTooltip>
              {' › '}
              <TaxonomyTooltip name={selected.class} type="class">
                <span>{selected.class}</span>
              </TaxonomyTooltip>
              {selected.level === 'group' && (
                <>
                  {' › '}
                  <TaxonomyTooltip name={selected.subclass} type="subclass">
                    <span>{selected.subclass}</span>
                  </TaxonomyTooltip>
                </>
              )}
            </span>
            <span className={`ml-auto text-xs font-medium ${nightMode ? 'text-science-400' : 'text-science-500'}`}>
              {assayCards.reduce((s, c) => s + c.trackCount, 0)} tracks across {assayCards.length} assay{assayCards.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Assay cards */}
        {selected && assayCards.length > 0 && (
          <div>
            <h4 className={`text-sm font-semibold mb-3 ${nightMode ? 'text-science-300' : 'text-science-700'}`}>
              Available Assays &amp; Modalities
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assayCards.map((card) => (
                <div
                  key={card.assay}
                  className={`rounded-xl border p-4 transition-shadow hover:shadow-lg ${
                    nightMode ? 'border-science-700 bg-science-800/50' : 'border-science-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h5 className={`font-semibold text-sm ${nightMode ? 'text-white' : 'text-science-900'}`}>
                      {ASSAY_DISPLAY[card.assay] ?? card.assay}
                    </h5>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      nightMode ? 'bg-primary-500/20 text-primary-400' : 'bg-primary-100 text-primary-700'
                    }`}>
                      {card.trackCount} track{card.trackCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Species */}
                  <div className="mb-3">
                    <p className={`text-xs mb-1 ${nightMode ? 'text-science-500' : 'text-science-400'}`}>Species</p>
                    <div className="flex flex-wrap gap-1">
                      {card.species.map((sp) => (
                        <SpeciesPill key={sp} species={sp} nightMode={nightMode} />
                      ))}
                    </div>
                  </div>

                  {/* Modalities */}
                  <div>
                    <p className={`text-xs mb-1 ${nightMode ? 'text-science-500' : 'text-science-400'}`}>Modalities</p>
                    <div className="flex flex-wrap gap-1">
                      {card.modalities.map((mod) => (
                        <ModalityBadge key={mod} modality={mod} nightMode={nightMode} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selected && assayCards.length === 0 && (
          <div className={`text-center py-8 text-sm ${nightMode ? 'text-science-500' : 'text-science-400'}`}>
            No tracks found for this cell type.
          </div>
        )}

        {/* Track detail list */}
        {selected && allTracks.length > 0 && (
          <TrackDetailList tracks={allTracks} nightMode={nightMode} selectedName={selected.name} />
        )}

        {/* Region distribution */}
        {selected && regionData && availableAssayTabs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className={`text-sm font-semibold ${nightMode ? 'text-science-300' : 'text-science-700'}`}>
                Nuclei Region Distribution
              </h4>
              {/* Assay tab selector */}
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveAssayTab('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    activeAssayTab === 'all'
                      ? nightMode ? 'bg-primary-500 text-white' : 'bg-primary-600 text-white'
                      : nightMode ? 'bg-science-700/60 text-science-400 hover:bg-science-700' : 'bg-science-100 text-science-500 hover:bg-science-200'
                  }`}
                >
                  All
                </button>
                {availableAssayTabs.map((at) => (
                  <button
                    key={at}
                    onClick={() => setActiveAssayTab(at)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      activeAssayTab === at
                        ? nightMode ? 'bg-primary-500 text-white' : 'bg-primary-600 text-white'
                        : nightMode ? 'bg-science-700/60 text-science-400 hover:bg-science-700' : 'bg-science-100 text-science-500 hover:bg-science-200'
                    }`}
                  >
                    {ASSAY_TYPE_LABELS[at]}
                  </button>
                ))}
              </div>
            </div>

            {activeAssayTab === 'all' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {availableAssayTabs.map((at) => (
                  <RegionBarChart
                    key={at}
                    distribution={regionData[at].distribution}
                    total={regionData[at].total}
                    nightMode={nightMode}
                    title={ASSAY_TYPE_LABELS[at]}
                  />
                ))}
              </div>
            ) : (
              <RegionBarChart
                distribution={regionData[activeAssayTab as AssayType].distribution}
                total={regionData[activeAssayTab as AssayType].total}
                nightMode={nightMode}
                title={ASSAY_TYPE_LABELS[activeAssayTab as AssayType]}
              />
            )}
          </div>
        )}

        {/* Empty state */}
        {!selected && (
          <div className={`text-center py-12 ${nightMode ? 'text-science-500' : 'text-science-400'}`}>
            <svg className="mx-auto w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="text-sm">Type a cell type name above to explore data availability.</p>
            <p className="text-xs mt-1 opacity-70">
              Try searching for "D2 MSN", "Astrocyte", "Microglia", or "Oligodendrocyte"
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataExplorer;

import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { parseTaxonomyData, type TaxonomyNeighborhood } from '../store/taxonomyStore';
import { parseTracksData, type Track, getUniqueAssays } from '../store/trackStore';
import { getTooltipText } from '../utils/abbreviationLookup';

type DatasetOverviewProps = {
  nightMode: boolean;
};

// Species display names mapping
const speciesDisplayNames: Record<string, string> = {
  'hg38': 'Human',
  'rheMac10': 'Macaque',
  'mCalJa1.2': 'Marmoset',
  'mm10': 'Mouse',
};

// Assay display names mapping
const assayDisplayNames: Record<string, string> = {
  '10X multiome': '10X multiome',
  'ATAC-seq': 'ATAC-seq',
  'Paired Tag': 'Paired Tag',
  'Paired Tag,': 'Paired Tag+',
  'snm3C-seq': 'snm3C-seq',
};

// Species order for consistent display
const speciesOrder: Record<string, number> = {
  'hg38': 0,
  'rheMac10': 1,
  'mCalJa1.2': 2,
  'mm10': 3,
};

// Build availability matrix from taxonomy and tracks data
function buildAvailabilityMatrix(
  taxonomyData: TaxonomyNeighborhood[],
  tracks: Track[]
) {
  // Collect all unique assay+species combinations
  const assaySpeciesSet = new Set<string>();
  const speciesSet = new Set<string>();
  
  tracks.forEach(track => {
    if (track.metadata.assay && track.metadata.reference) {
      const key = `${track.metadata.assay}|${track.metadata.reference}`;
      assaySpeciesSet.add(key);
      speciesSet.add(track.metadata.reference);
    }
  });
  
  // Sort assay+species combinations by assay name first, then by species order
  const assaySpeciesCombos = Array.from(assaySpeciesSet)
    .map(key => {
      const [assay, species] = key.split('|');
      return { key, assay, species };
    })
    .sort((a, b) => {
      // First sort by assay name
      const assayCompare = a.assay.localeCompare(b.assay);
      if (assayCompare !== 0) return assayCompare;
      // Then by species order
      return (speciesOrder[a.species] ?? 99) - (speciesOrder[b.species] ?? 99);
    });
  
  const species = Array.from(speciesSet).sort((a, b) => 
    (speciesOrder[a] ?? 99) - (speciesOrder[b] ?? 99)
  );

  // Build subclass availability map
  const subclassAvailability: Map<string, {
    neighborhood: string;
    class: string;
    subclass: string;
    assaySpecies: Set<string>; // Now tracks assay|species combinations
    order: number;
  }> = new Map();

  // Build group availability map
  const groupAvailability: Map<string, {
    neighborhood: string;
    class: string;
    subclass: string;
    group: string;
    assaySpecies: Set<string>; // Now tracks assay|species combinations
    order: number;
  }> = new Map();

  // Parse taxonomy to get ordered list of subclasses and groups
  let subclassOrder = 0;
  let groupOrder = 0;

  taxonomyData.forEach(neighborhood => {
    neighborhood.classes.forEach(classObj => {
      classObj.subclasses.forEach(subclass => {
        // Initialize subclass entry
        if (!subclassAvailability.has(subclass.subclass)) {
          subclassAvailability.set(subclass.subclass, {
            neighborhood: neighborhood.neighborhood,
            class: classObj.class,
            subclass: subclass.subclass,
            assaySpecies: new Set(),
            order: subclassOrder++,
          });
        }

        // Initialize group entries
        subclass.groups.forEach(group => {
          if (!groupAvailability.has(group.group)) {
            groupAvailability.set(group.group, {
              neighborhood: neighborhood.neighborhood,
              class: classObj.class,
              subclass: subclass.subclass,
              group: group.group,
              assaySpecies: new Set(),
              order: groupOrder++,
            });
          }
        });
      });
    });
  });

  // Populate availability from tracks with assay+species combination
  tracks.forEach(track => {
    const { metadata } = track;
    const assay = metadata.assay;
    const reference = metadata.reference;
    if (!assay || !reference) return;
    
    const key = `${assay}|${reference}`;

    if (metadata.subclass && subclassAvailability.has(metadata.subclass)) {
      subclassAvailability.get(metadata.subclass)!.assaySpecies.add(key);
    }

    if (metadata.group && groupAvailability.has(metadata.group)) {
      groupAvailability.get(metadata.group)!.assaySpecies.add(key);
    }
  });

  // Convert to sorted arrays
  const subclassRows = Array.from(subclassAvailability.values()).sort((a, b) => a.order - b.order);
  const groupRows = Array.from(groupAvailability.values()).sort((a, b) => a.order - b.order);

  return { assaySpeciesCombos, species, subclassRows, groupRows };
}

// Color-coded cell component - narrower for space efficiency
const AvailabilityCell: FC<{ available: boolean; nightMode: boolean }> = ({ available, nightMode }) => (
  <td className={`px-1 py-1 text-center border transition-colors w-8 min-w-8 ${
    nightMode ? 'border-science-700/50' : 'border-science-200'
  }`}>
    {available ? (
      <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${
        nightMode ? 'bg-success-500/30 text-success-400' : 'bg-success-100 text-success-600'
      }`}>
        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </span>
    ) : (
      <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${
        nightMode ? 'bg-science-700/30 text-science-600' : 'bg-science-100 text-science-400'
      }`}>
        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      </span>
    )}
  </td>
);

// Vertical header cell for assay names
const VerticalHeader: FC<{ text: string; nightMode: boolean }> = ({ text, nightMode }) => (
  <th className={`px-1 py-2 text-center font-semibold w-8 min-w-8 ${
    nightMode ? 'text-white' : 'text-science-900'
  }`}>
    <div 
      className="text-xs whitespace-nowrap"
      style={{ 
        writingMode: 'vertical-rl', 
        transform: 'rotate(180deg)',
        height: 'auto',
        lineHeight: 1.2
      }}
    >
      {text}
    </div>
  </th>
);

// Export CSV helper function
const exportToCSV = (filename: string, csvContent: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Collapsible section component
const CollapsibleSection: FC<{
  title: string;
  count: number;
  children: React.ReactNode;
  nightMode: boolean;
  defaultOpen?: boolean;
  maxHeight?: string;
  onExport?: () => void;
}> = ({ title, count, children, nightMode, defaultOpen = true, maxHeight = '2000px', onExport }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleExportClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onExport) {
      onExport();
    }
  };

  return (
    <div className={`rounded-xl overflow-hidden ${
      nightMode ? 'card-science-dark' : 'card-science'
    }`}>
      <div className={`w-full px-6 py-4 flex items-center justify-between gap-4 ${
        nightMode 
          ? 'hover:bg-science-700/30' 
          : 'hover:bg-science-50'
      } transition-colors`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 flex-1 text-left"
        >
          <h3 className={`text-lg font-semibold ${nightMode ? 'text-white' : 'text-science-900'}`}>
            {title}
          </h3>
          <span className={`px-2 py-0.5 text-sm rounded-full font-medium ${
            nightMode ? 'bg-primary-500/20 text-primary-400' : 'bg-primary-100 text-primary-700'
          }`}>
            {count} items
          </span>
        </button>
        <div className="flex items-center gap-2">
          {onExport && (
            <button
              onClick={handleExportClick}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                nightMode
                  ? 'bg-primary-500/20 text-primary-400 hover:bg-primary-500/30'
                  : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
              }`}
              title="Export to CSV"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </button>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1"
          >
            <svg 
              className={`w-5 h-5 transition-transform duration-300 ${
                nightMode ? 'text-science-400' : 'text-science-500'
              } ${isOpen ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
      
      <div 
        className={`transition-all duration-300 ease-out overflow-hidden ${
          isOpen ? 'opacity-100' : 'max-h-0 opacity-0'
        }`}
        style={isOpen ? { maxHeight } : undefined}
      >
        <div className="px-4 pb-4">
          {children}
        </div>
      </div>
    </div>
  );
};

// Legend component
const Legend: FC<{ nightMode: boolean }> = ({ nightMode }) => (
  <div className={`flex items-center gap-6 px-4 py-3 rounded-lg ${
    nightMode ? 'bg-science-800/50' : 'bg-science-50'
  }`}>
    <span className={`text-sm font-medium ${nightMode ? 'text-science-300' : 'text-science-600'}`}>
      Legend:
    </span>
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${
        nightMode ? 'bg-success-500/30 text-success-400' : 'bg-success-100 text-success-600'
      }`}>
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </span>
      <span className={`text-sm ${nightMode ? 'text-science-400' : 'text-science-600'}`}>
        Available
      </span>
    </div>
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${
        nightMode ? 'bg-science-700/30 text-science-600' : 'bg-science-100 text-science-400'
      }`}>
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      </span>
      <span className={`text-sm ${nightMode ? 'text-science-400' : 'text-science-600'}`}>
        Not Available
      </span>
    </div>
  </div>
);

const DatasetOverview: FC<DatasetOverviewProps> = ({ nightMode }) => {
  // Load taxonomy and tracks data
  const taxonomyData = useMemo(() => parseTaxonomyData(), []);
  const tracks = useMemo(() => parseTracksData(), []);
  
  // Build availability matrices
  const { assaySpeciesCombos, species, subclassRows, groupRows } = useMemo(
    () => buildAvailabilityMatrix(taxonomyData, tracks),
    [taxonomyData, tracks]
  );

  // Summary stats
  const totalTracks = tracks.length;
  const subclassesWithData = subclassRows.filter(r => r.assaySpecies.size > 0).length;
  const groupsWithData = groupRows.filter(r => r.assaySpecies.size > 0).length;
  const uniqueAssaySpecies = assaySpeciesCombos.length;
  const uniqueAssayTypes = getUniqueAssays(tracks).length;

  // Export functions
  const exportSubclassData = () => {
    const headers = [
      'Neighborhood',
      'Class',
      'Subclass',
      ...assaySpeciesCombos.map(combo => 
        `${assayDisplayNames[combo.assay] || combo.assay} (${speciesDisplayNames[combo.species] || combo.species})`
      )
    ];
    
    const rows = subclassRows.map(row => {
      const data = [
        row.neighborhood,
        row.class,
        row.subclass,
        ...assaySpeciesCombos.map(combo => 
          row.assaySpecies.has(combo.key) ? 'Y' : 'N'
        )
      ];
      return data.map(cell => `"${cell}"`).join(',');
    });
    
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows
    ].join('\n');
    
    exportToCSV('subclass_data_availability.csv', csvContent);
  };

  const exportGroupData = () => {
    const headers = [
      'Neighborhood',
      'Class',
      'Subclass',
      'Group',
      ...assaySpeciesCombos.map(combo => 
        `${assayDisplayNames[combo.assay] || combo.assay} (${speciesDisplayNames[combo.species] || combo.species})`
      )
    ];
    
    const rows = groupRows.map(row => {
      const data = [
        row.neighborhood,
        row.class,
        row.subclass,
        row.group,
        ...assaySpeciesCombos.map(combo => 
          row.assaySpecies.has(combo.key) ? 'Y' : 'N'
        )
      ];
      return data.map(cell => `"${cell}"`).join(',');
    });
    
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows
    ].join('\n');
    
    exportToCSV('group_data_availability.csv', csvContent);
  };

  return (
    <div className={`space-y-8 ${nightMode ? 'text-gray-200' : 'text-gray-800'}`}>
      {/* Hero Section */}
      <div className="rounded-2xl p-8 gradient-science text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pattern-neural" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 text-xs font-semibold tracking-wider uppercase rounded-full bg-white/20">
              Dataset
            </span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
            Data Availability Matrix
          </h2>
          
          <p className="text-lg text-white/90 leading-relaxed max-w-3xl mb-6">
            Comprehensive overview of available epigenomic data across cell types in the basal ganglia,
            organized by taxonomy hierarchy.
          </p>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-6 mt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold">{totalTracks.toLocaleString()}</div>
                <div className="text-sm text-white/70">Total Tracks</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold">{species.length}</div>
                <div className="text-sm text-white/70">Species</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold">{uniqueAssayTypes}</div>
                <div className="text-sm text-white/70">Assay Types</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold">{uniqueAssaySpecies}</div>
                <div className="text-sm text-white/70">Assay×Species</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold">{subclassesWithData}/{subclassRows.length}</div>
                <div className="text-sm text-white/70">Subclasses with Data</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold">{groupsWithData}/{groupRows.length}</div>
                <div className="text-sm text-white/70">Groups with Data</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <Legend nightMode={nightMode} />

      {/* Subclass Availability Matrix */}
      <CollapsibleSection 
        title="Subclass Data Availability" 
        count={subclassRows.length}
        nightMode={nightMode}
        defaultOpen={true}
        onExport={exportSubclassData}
      >
        <div className="overflow-x-auto">
          <table className={`w-full text-sm ${nightMode ? 'text-science-300' : 'text-science-700'}`}>
            <thead>
              <tr className={nightMode ? 'bg-science-800' : 'bg-science-100'}>
                <th className={`px-3 py-2 text-left font-semibold sticky left-0 z-10 ${
                  nightMode ? 'bg-science-800 text-white' : 'bg-science-100 text-science-900'
                }`}>
                  Neighborhood
                </th>
                <th className={`px-3 py-2 text-left font-semibold sticky left-0 z-10 ${
                  nightMode ? 'bg-science-800 text-white' : 'bg-science-100 text-science-900'
                }`}>
                  Class
                </th>
                <th className={`px-3 py-2 text-left font-semibold sticky left-0 z-10 ${
                  nightMode ? 'bg-science-800 text-white' : 'bg-science-100 text-science-900'
                }`}>
                  Subclass
                </th>
                {assaySpeciesCombos.map(combo => (
                  <VerticalHeader 
                    key={combo.key} 
                    text={`${assayDisplayNames[combo.assay] || combo.assay} (${speciesDisplayNames[combo.species] || combo.species})`} 
                    nightMode={nightMode} 
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {subclassRows.map((row, idx) => {
                // Calculate rowspan for neighborhood
                const prevRow = idx > 0 ? subclassRows[idx - 1] : null;
                const isFirstNeighborhood = !prevRow || prevRow.neighborhood !== row.neighborhood;
                
                let neighborhoodRowspan = 1;
                if (isFirstNeighborhood) {
                  let count = 1;
                  for (let i = idx + 1; i < subclassRows.length; i++) {
                    if (subclassRows[i].neighborhood === row.neighborhood) {
                      count++;
                    } else {
                      break;
                    }
                  }
                  neighborhoodRowspan = count;
                }

                // Calculate rowspan for class (only within same neighborhood)
                const isFirstClass = !prevRow || prevRow.class !== row.class || prevRow.neighborhood !== row.neighborhood;
                
                let classRowspan = 1;
                if (isFirstClass) {
                  let count = 1;
                  for (let i = idx + 1; i < subclassRows.length; i++) {
                    if (subclassRows[i].class === row.class && subclassRows[i].neighborhood === row.neighborhood) {
                      count++;
                    } else {
                      break;
                    }
                  }
                  classRowspan = count;
                }

                const newNeighborhood = isFirstNeighborhood;
                const newClass = isFirstClass;

                return (
                  <tr 
                    key={row.subclass} 
                    className={`transition-colors ${
                      nightMode 
                        ? 'hover:bg-science-700/30' 
                        : 'hover:bg-primary-50/50'
                    } ${newNeighborhood && nightMode ? 'border-t-2 border-science-600' : ''} ${newNeighborhood && !nightMode ? 'border-t-2 border-science-300' : ''}`}
                  >
                    {isFirstNeighborhood && (
                      <td 
                        rowSpan={neighborhoodRowspan}
                        className={`px-3 py-1.5 border ${
                          nightMode ? 'border-science-700/50' : 'border-science-200'
                        }`}
                      >
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          nightMode ? 'bg-primary-500/20 text-primary-400' : 'bg-primary-100 text-primary-700'
                        }`}>
                          {row.neighborhood}
                        </span>
                      </td>
                    )}
                    {isFirstClass && (
                      <td 
                        rowSpan={classRowspan}
                        className={`px-3 py-1.5 border ${
                          nightMode ? 'border-science-700/50' : 'border-science-200'
                        }`}
                      >
                        <span className={`text-xs ${nightMode ? 'text-science-400' : 'text-science-600'}`}>
                          {row.class}
                        </span>
                      </td>
                    )}
                    <td 
                      className={`px-3 py-1.5 border font-medium ${
                        nightMode ? 'border-science-700/50 text-white' : 'border-science-200 text-science-800'
                      }`}
                      title={getTooltipText(row.subclass, 'subclass')}
                    >
                      {row.subclass}
                    </td>
                    {assaySpeciesCombos.map(combo => (
                      <AvailabilityCell 
                        key={combo.key} 
                        available={row.assaySpecies.has(combo.key)} 
                        nightMode={nightMode} 
                      />
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      {/* Group Availability Matrix */}
      <CollapsibleSection 
        title="Group Data Availability" 
        count={groupRows.length}
        nightMode={nightMode}
        defaultOpen={true}
        maxHeight="3000px"
        onExport={exportGroupData}
      >
        <div className="overflow-x-auto">
          <table className={`w-full text-sm ${nightMode ? 'text-science-300' : 'text-science-700'}`}>
            <thead>
              <tr className={nightMode ? 'bg-science-800' : 'bg-science-100'}>
                <th className={`px-3 py-2 text-left font-semibold sticky left-0 z-10 ${
                  nightMode ? 'bg-science-800 text-white' : 'bg-science-100 text-science-900'
                }`}>
                  Neighborhood
                </th>
                <th className={`px-3 py-2 text-left font-semibold ${
                  nightMode ? 'text-white' : 'text-science-900'
                }`}>
                  Class
                </th>
                <th className={`px-3 py-2 text-left font-semibold ${
                  nightMode ? 'text-white' : 'text-science-900'
                }`}>
                  Subclass
                </th>
                <th className={`px-3 py-2 text-left font-semibold ${
                  nightMode ? 'text-white' : 'text-science-900'
                }`}>
                  Group
                </th>
                {assaySpeciesCombos.map(combo => (
                  <VerticalHeader 
                    key={combo.key} 
                    text={`${assayDisplayNames[combo.assay] || combo.assay} (${speciesDisplayNames[combo.species] || combo.species})`} 
                    nightMode={nightMode} 
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {groupRows.map((row, idx) => {
                // Calculate rowspan for neighborhood
                const prevRow = idx > 0 ? groupRows[idx - 1] : null;
                const isFirstNeighborhood = !prevRow || prevRow.neighborhood !== row.neighborhood;
                
                let neighborhoodRowspan = 1;
                if (isFirstNeighborhood) {
                  let count = 1;
                  for (let i = idx + 1; i < groupRows.length; i++) {
                    if (groupRows[i].neighborhood === row.neighborhood) {
                      count++;
                    } else {
                      break;
                    }
                  }
                  neighborhoodRowspan = count;
                }

                // Calculate rowspan for class (only within same neighborhood)
                const isFirstClass = !prevRow || prevRow.class !== row.class || prevRow.neighborhood !== row.neighborhood;
                
                let classRowspan = 1;
                if (isFirstClass) {
                  let count = 1;
                  for (let i = idx + 1; i < groupRows.length; i++) {
                    if (groupRows[i].class === row.class && groupRows[i].neighborhood === row.neighborhood) {
                      count++;
                    } else {
                      break;
                    }
                  }
                  classRowspan = count;
                }

                // Calculate rowspan for subclass (only within same class and neighborhood)
                const isFirstSubclass = !prevRow || prevRow.subclass !== row.subclass || prevRow.class !== row.class || prevRow.neighborhood !== row.neighborhood;
                
                let subclassRowspan = 1;
                if (isFirstSubclass) {
                  let count = 1;
                  for (let i = idx + 1; i < groupRows.length; i++) {
                    if (groupRows[i].subclass === row.subclass && groupRows[i].class === row.class && groupRows[i].neighborhood === row.neighborhood) {
                      count++;
                    } else {
                      break;
                    }
                  }
                  subclassRowspan = count;
                }

                const newNeighborhood = isFirstNeighborhood;
                const newClass = isFirstClass;
                const newSubclass = isFirstSubclass;

                return (
                  <tr 
                    key={row.group} 
                    className={`transition-colors ${
                      nightMode 
                        ? 'hover:bg-science-700/30' 
                        : 'hover:bg-primary-50/50'
                    } ${newNeighborhood && nightMode ? 'border-t-2 border-science-600' : ''} ${newNeighborhood && !nightMode ? 'border-t-2 border-science-300' : ''}`}
                  >
                    {isFirstNeighborhood && (
                      <td 
                        rowSpan={neighborhoodRowspan}
                        className={`px-3 py-1.5 border ${
                          nightMode ? 'border-science-700/50' : 'border-science-200'
                        }`}
                      >
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          nightMode ? 'bg-primary-500/20 text-primary-400' : 'bg-primary-100 text-primary-700'
                        }`}>
                          {row.neighborhood}
                        </span>
                      </td>
                    )}
                    {isFirstClass && (
                      <td 
                        rowSpan={classRowspan}
                        className={`px-3 py-1.5 border ${
                          nightMode ? 'border-science-700/50' : 'border-science-200'
                        }`}
                      >
                        <span className={`text-xs ${nightMode ? 'text-science-400' : 'text-science-600'}`}>
                          {row.class}
                        </span>
                      </td>
                    )}
                    {isFirstSubclass && (
                      <td 
                        rowSpan={subclassRowspan}
                        className={`px-3 py-1.5 border ${
                          nightMode ? 'border-science-700/50' : 'border-science-200'
                        }`}
                        title={getTooltipText(row.subclass, 'subclass')}
                      >
                        <span className={`text-xs ${nightMode ? 'text-science-400' : 'text-science-600'}`}>
                          {row.subclass}
                        </span>
                      </td>
                    )}
                    <td 
                      className={`px-3 py-1.5 border font-medium ${
                        nightMode ? 'border-science-700/50 text-white' : 'border-science-200 text-science-800'
                      }`}
                      title={getTooltipText(row.group, 'group')}
                    >
                      {row.group}
                    </td>
                    {assaySpeciesCombos.map(combo => (
                      <AvailabilityCell 
                        key={combo.key} 
                        available={row.assaySpecies.has(combo.key)} 
                        nightMode={nightMode} 
                      />
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      {/* BICAN Portal Link */}
      <div className={`rounded-xl p-6 text-center ${
        nightMode ? 'card-science-dark' : 'card-science'
      }`}>
        <p className={`text-sm mb-4 ${nightMode ? 'text-science-400' : 'text-science-600'}`}>
          For more datasets and download options, visit the BICAN Data Portal.
        </p>
        <a 
          href="https://www.portal.brain-bican.org/"
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
            nightMode 
              ? 'bg-primary-500 text-white hover:bg-primary-400' 
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          <span>Browse BICAN Catalog</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
};

export default DatasetOverview;

import React, { useMemo, useState, type FC } from 'react';
import type { Track } from '../store/trackStore';
import { getTooltipText } from '../utils/abbreviationLookup';

type AssaySelectionProps = {
  nightMode: boolean;
  trackStates: Track[];
  setTrackStates: React.Dispatch<React.SetStateAction<Track[]>>;
  onNextStep?: () => void;
};

const AssaySelection: FC<AssaySelectionProps> = ({ 
  nightMode, 
  trackStates,
  setTrackStates,
  onNextStep,
}) => {
  // Search query state
  const [searchQuery, setSearchQuery] = useState('');

  // Filter tracks based on search query
  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return trackStates;
    
    // Split search query into individual words
    const searchWords = searchQuery.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    
    return trackStates.filter(track => {
      const searchableFields = [
        track.metadata.subclass,
        track.metadata.group,
        track.metadata.assay,
        track.metadata.modality,
        track.metadata.source,
        track.metadata.description,
        track.metadata.reference,
        track.config.name,
        track.config.type,
      ].filter(Boolean).map(f => f!.toLowerCase());
      
      // Combine all searchable fields into a single string for easier matching
      const combinedText = searchableFields.join(' ');
      
      // Track matches if ALL search words are found in the combined text
      return searchWords.every(word => combinedText.includes(word));
    });
  }, [trackStates, searchQuery]);

  // Get indices of filtered tracks in the original trackStates array
  const filteredIndices = useMemo(() => {
    if (!searchQuery.trim()) return trackStates.map((_, i) => i);
    
    // Split search query into individual words
    const searchWords = searchQuery.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    
    return trackStates.reduce<number[]>((acc, track, i) => {
      const searchableFields = [
        track.metadata.subclass,
        track.metadata.group,
        track.metadata.assay,
        track.metadata.modality,
        track.metadata.source,
        track.metadata.description,
        track.metadata.reference,
        track.config.name,
        track.config.type,
      ].filter(Boolean).map(f => f!.toLowerCase());
      
      // Combine all searchable fields into a single string for easier matching
      const combinedText = searchableFields.join(' ');
      
      // Track matches if ALL search words are found in the combined text
      if (searchWords.every(word => combinedText.includes(word))) {
        acc.push(i);
      }
      return acc;
    }, []);
  }, [trackStates, searchQuery]);

  // Toggle individual track by its original index
  const toggleTrack = (originalIndex: number) => {
    setTrackStates(prev => 
      prev.map((track, i) => 
        i === originalIndex ? { ...track, selected: !track.selected } : track
      )
    );
  };

  // Select all tracks
  const selectAll = () => {
    setTrackStates(prev => prev.map(track => ({ ...track, selected: true })));
  };

  // Deselect all tracks
  const deselectAll = () => {
    setTrackStates(prev => prev.map(track => ({ ...track, selected: false })));
  };

  // Select all filtered tracks
  const selectAllFiltered = () => {
    const filteredSet = new Set(filteredIndices);
    setTrackStates(prev => 
      prev.map((track, i) => 
        filteredSet.has(i) ? { ...track, selected: true } : track
      )
    );
  };

  // Deselect all filtered tracks
  const deselectAllFiltered = () => {
    const filteredSet = new Set(filteredIndices);
    setTrackStates(prev => 
      prev.map((track, i) => 
        filteredSet.has(i) ? { ...track, selected: false } : track
      )
    );
  };

  // Toggle all visible (filtered) tracks
  const toggleAllFiltered = () => {
    const allFilteredSelected = filteredTracks.every(track => track.selected);
    const filteredSet = new Set(filteredIndices);
    setTrackStates(prev => 
      prev.map((track, i) => 
        filteredSet.has(i) ? { ...track, selected: !allFilteredSelected } : track
      )
    );
  };

  // Batch select by assay
  const selectByAssay = (assay: string) => {
    setTrackStates(prev => 
      prev.map(track => 
        track.metadata.assay === assay ? { ...track, selected: true } : track
      )
    );
  };

  // Batch select by modality
  const selectByModality = (modality: string) => {
    setTrackStates(prev => 
      prev.map(track => 
        track.metadata.modality === modality ? { ...track, selected: true } : track
      )
    );
  };

  // Batch select by species (reference)
  const selectBySpecies = (reference: string) => {
    setTrackStates(prev => 
      prev.map(track => 
        track.metadata.reference === reference ? { ...track, selected: true } : track
      )
    );
  };

  // Get unique values for batch selection
  const uniqueAssays = useMemo(() => {
    const assays = new Set(trackStates.map(t => t.metadata.assay).filter(Boolean));
    return Array.from(assays).sort();
  }, [trackStates]);

  const uniqueModalities = useMemo(() => {
    const modalities = new Set(trackStates.map(t => t.metadata.modality).filter(Boolean));
    return Array.from(modalities).sort();
  }, [trackStates]);

  const uniqueSpecies = useMemo(() => {
    const species = new Set(trackStates.map(t => t.metadata.reference).filter(Boolean));
    return Array.from(species).sort((a, b) => {
      // Sort by species order: hg38, mm10, rheMac10, mCalJa1.2
      const order = ['hg38', 'mm10', 'rheMac10', 'mCalJa1.2'];
      return order.indexOf(a) - order.indexOf(b);
    });
  }, [trackStates]);

  // Get reference label
  const getReferenceLabel = (reference: string | undefined) => {
    if (reference === 'hg38') return 'Human (hg38)';
    if (reference === 'mm10') return 'Mouse (mm10)';
    if (reference === 'rheMac10') return 'Macaque (rheMac10)';
    if (reference === 'mCalJa1.2') return 'Marmoset (mCalJa1.2)';
    return reference || 'Unknown';
  };

  // Get track type label
  const getTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      'bw': 'BigWig',
      'bedgraph': 'BedGraph',
      'bed': 'BED',
      'bigBed': 'BigBed',
    };
    return typeLabels[type] || type;
  };

  const selectedCount = trackStates.filter(track => track.selected).length;

  return (
    <div className={`space-y-6 ${nightMode ? 'text-gray-200' : 'text-gray-800'}`}>
      {/* Header Section */}
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
            Tracks filtered and sorted by species (human → mouse → macaque → marmoset), then by subclass → group → assay → source. 
            Check tracks to show in the genome browser.
          </p>
        </div>
      </div>

      {/* Search and Controls */}
      <div className={`rounded-2xl shadow-xl p-6 ${
        nightMode ? 'card-science-dark' : 'card-science'
      }`}>
        <div className="space-y-4">
          {/* Stats Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h4 className={`text-lg font-semibold ${nightMode ? 'text-white' : 'text-science-900'}`}>
              Available Tracks
            </h4>
            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-lg ${nightMode ? 'bg-science-800' : 'bg-science-100'}`}>
                <span className={`text-2xl font-bold ${nightMode ? 'text-sky-400' : 'text-primary-600'}`}>
                  {trackStates.length}
                </span>
                <span className={`ml-2 text-sm ${nightMode ? 'text-science-400' : 'text-science-600'}`}>
                  total
                </span>
              </div>
              {searchQuery && (
                <div className={`px-4 py-2 rounded-lg ${nightMode ? 'bg-accent-500/20' : 'bg-accent-100'}`}>
                  <span className={`text-2xl font-bold ${nightMode ? 'text-accent-400' : 'text-accent-600'}`}>
                    {filteredTracks.length}
                  </span>
                  <span className={`ml-2 text-sm ${nightMode ? 'text-science-400' : 'text-science-600'}`}>
                    filtered
                  </span>
                </div>
              )}
              <div className={`px-4 py-2 rounded-lg ${nightMode ? 'bg-success-500/20' : 'bg-success-100'}`}>
                <span className={`text-2xl font-bold ${nightMode ? 'text-success-400' : 'text-success-600'}`}>
                  {selectedCount}
                </span>
                <span className={`ml-2 text-sm ${nightMode ? 'text-science-400' : 'text-science-600'}`}>
                  selected
                </span>
              </div>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search tracks by subclass, group, assay, modality, source, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-4 py-3 pl-11 rounded-xl border transition-all ${
                nightMode 
                  ? 'bg-science-800 border-science-700 text-white placeholder-science-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500' 
                  : 'bg-white border-science-300 text-science-900 placeholder-science-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500'
              }`}
            />
            <svg 
              className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
                nightMode ? 'text-science-500' : 'text-science-400'
              }`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
                  nightMode 
                    ? 'text-science-400 hover:text-white hover:bg-science-700' 
                    : 'text-science-400 hover:text-science-700 hover:bg-science-100'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Batch Add Panel */}
          <div className={`p-4 rounded-xl border ${
            nightMode ? 'bg-science-800/50 border-science-700' : 'bg-science-50 border-science-200'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <svg className={`w-5 h-5 ${nightMode ? 'text-primary-400' : 'text-primary-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className={`text-sm font-semibold ${nightMode ? 'text-white' : 'text-science-900'}`}>
                Batch Add by Category
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* By Assay */}
              <div className="space-y-2">
                <label className={`text-xs font-medium ${nightMode ? 'text-science-400' : 'text-science-600'}`}>
                  By Assay:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueAssays.map(assay => (
                    <button
                      key={assay}
                      onClick={() => selectByAssay(assay)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        nightMode 
                          ? 'bg-primary-500/20 text-primary-300 hover:bg-primary-500/30 border border-primary-500/30' 
                          : 'bg-primary-100 text-primary-700 hover:bg-primary-200 border border-primary-200'
                      }`}
                      title={`Select all ${assay} tracks`}
                    >
                      {assay}
                    </button>
                  ))}
                </div>
              </div>

              {/* By Modality */}
              <div className="space-y-2">
                <label className={`text-xs font-medium ${nightMode ? 'text-science-400' : 'text-science-600'}`}>
                  By Modality:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueModalities.map(modality => (
                    <button
                      key={modality}
                      onClick={() => selectByModality(modality)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        nightMode 
                          ? 'bg-accent-500/20 text-accent-300 hover:bg-accent-500/30 border border-accent-500/30' 
                          : 'bg-accent-100 text-accent-700 hover:bg-accent-200 border border-accent-200'
                      }`}
                      title={`Select all ${modality} tracks`}
                    >
                      {modality}
                    </button>
                  ))}
                </div>
              </div>

              {/* By Species */}
              <div className="space-y-2">
                <label className={`text-xs font-medium ${nightMode ? 'text-science-400' : 'text-science-600'}`}>
                  By Species:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueSpecies.map(species => (
                    <button
                      key={species}
                      onClick={() => selectBySpecies(species)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        nightMode 
                          ? 'bg-success-500/20 text-success-300 hover:bg-success-500/30 border border-success-500/30' 
                          : 'bg-success-100 text-success-700 hover:bg-success-200 border border-success-200'
                      }`}
                      title={`Select all ${getReferenceLabel(species)} tracks`}
                    >
                      {getReferenceLabel(species)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Selection Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-sm font-medium ${nightMode ? 'text-science-400' : 'text-science-600'}`}>
              Selection:
            </span>
            <button
              onClick={selectAll}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                nightMode 
                  ? 'bg-primary-500/20 text-primary-400 hover:bg-primary-500/30' 
                  : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
              }`}
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                nightMode 
                  ? 'bg-science-700 text-science-300 hover:bg-science-600' 
                  : 'bg-science-200 text-science-700 hover:bg-science-300'
              }`}
            >
              Deselect All
            </button>
            
            {searchQuery && (
              <>
                <span className={`mx-2 ${nightMode ? 'text-science-600' : 'text-science-300'}`}>|</span>
                <span className={`text-sm font-medium ${nightMode ? 'text-accent-400' : 'text-accent-600'}`}>
                  Filtered ({filteredTracks.length}):
                </span>
                <button
                  onClick={selectAllFiltered}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    nightMode 
                      ? 'bg-accent-500/20 text-accent-400 hover:bg-accent-500/30' 
                      : 'bg-accent-100 text-accent-700 hover:bg-accent-200'
                  }`}
                >
                  Select Filtered
                </button>
                <button
                  onClick={deselectAllFiltered}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    nightMode 
                      ? 'bg-science-700 text-science-300 hover:bg-science-600' 
                      : 'bg-science-200 text-science-700 hover:bg-science-300'
                  }`}
                >
                  Deselect Filtered
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tracks Table */}
      {trackStates.length === 0 ? (
        <div className={`rounded-2xl shadow-xl p-12 text-center ${
          nightMode ? 'bg-gray-900/50 border border-gray-700' : 'bg-white border border-gray-200'
        }`}>
          <div className="text-6xl mb-4">🔍</div>
          <h3 className={`text-xl font-semibold mb-2 ${nightMode ? 'text-gray-100' : 'text-gray-900'}`}>
            No Tracks Found
          </h3>
          <p className={`${nightMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Please select cell types from the Taxonomy Selection tab to view available tracks.
          </p>
        </div>
      ) : filteredTracks.length === 0 ? (
        <div className={`rounded-2xl shadow-xl p-12 text-center ${
          nightMode ? 'bg-gray-900/50 border border-gray-700' : 'bg-white border border-gray-200'
        }`}>
          <div className="text-6xl mb-4">🔎</div>
          <h3 className={`text-xl font-semibold mb-2 ${nightMode ? 'text-gray-100' : 'text-gray-900'}`}>
            No Matching Tracks
          </h3>
          <p className={`${nightMode ? 'text-gray-400' : 'text-gray-600'}`}>
            No tracks match your search query "{searchQuery}". Try a different search term.
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className={`mt-4 px-4 py-2 rounded-lg font-medium transition-colors ${
              nightMode 
                ? 'bg-primary-500 text-white hover:bg-primary-400' 
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className={`rounded-2xl shadow-xl overflow-hidden ${
          nightMode ? 'bg-gray-900/50 border border-gray-700' : 'bg-white border border-gray-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={nightMode ? 'bg-gray-800' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                    nightMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    <div className="flex items-center justify-center gap-2">
                      <span>Show</span>
                      <input
                        type="checkbox"
                        checked={filteredTracks.every(track => track.selected)}
                        onChange={toggleAllFiltered}
                        className="w-4 h-4 rounded cursor-pointer"
                        title={searchQuery ? "Toggle all filtered" : "Toggle all"}
                      />
                    </div>
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    nightMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Species
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    nightMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Subclass
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    nightMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Group
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    nightMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Assay
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    nightMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Source
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    nightMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Track Type
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    nightMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${nightMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
                {filteredIndices.map((originalIndex) => {
                  const track = trackStates[originalIndex];
                  // Species color coding based on reference
                  const getSpeciesColor = (ref: string | undefined) => {
                    switch (ref) {
                      case 'hg38': return nightMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-800';
                      case 'mm10': return nightMode ? 'bg-orange-900/50 text-orange-300' : 'bg-orange-100 text-orange-800';
                      case 'rheMac10': return nightMode ? 'bg-teal-900/50 text-teal-300' : 'bg-teal-100 text-teal-800';
                      case 'mCalJa1.2': return nightMode ? 'bg-pink-900/50 text-pink-300' : 'bg-pink-100 text-pink-800';
                      default: return nightMode ? 'bg-gray-900/50 text-gray-300' : 'bg-gray-100 text-gray-800';
                    }
                  };
                  return (
                    <tr 
                      key={originalIndex}
                      onClick={() => toggleTrack(originalIndex)}
                      className={`transition-colors cursor-pointer ${
                        nightMode 
                          ? 'hover:bg-gray-800/50' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={track.selected || false}
                          onChange={() => toggleTrack(originalIndex)}
                          className="w-5 h-5 rounded cursor-pointer"
                        />
                      </td>
                      <td className={`px-4 py-4 whitespace-nowrap text-sm ${
                        nightMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSpeciesColor(track.metadata.reference)}`}>
                          {getReferenceLabel(track.metadata.reference)}
                        </span>
                      </td>
                      <td className={`px-4 py-4 text-sm ${
                        nightMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <div 
                          className="max-w-xs truncate" 
                          title={track.metadata.subclass ? getTooltipText(track.metadata.subclass, 'subclass') : '-'}
                        >
                          {track.metadata.subclass || '-'}
                        </div>
                      </td>
                      <td className={`px-4 py-4 text-sm ${
                        nightMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <div 
                          className="max-w-xs font-medium whitespace-normal break-words" 
                          title={track.metadata.group ? getTooltipText(track.metadata.group, 'group') : '-'}
                        >
                          {track.metadata.group || '-'}
                        </div>
                      </td>
                      <td className={`px-4 py-4 whitespace-nowrap text-sm ${
                        nightMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          track.metadata.assay === 'DNA' 
                            ? nightMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800'
                            : nightMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'
                        }`}>
                          {track.metadata.assay || '-'}
                        </span>
                      </td>
                      <td className={`px-4 py-4 whitespace-nowrap text-sm ${
                        nightMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          track.metadata.source === 'Allen Institute'
                            ? nightMode ? 'bg-cyan-900/50 text-cyan-300' : 'bg-cyan-100 text-cyan-800'
                            : nightMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {track.metadata.source || '-'}
                        </span>
                      </td>
                      <td className={`px-4 py-4 whitespace-nowrap text-sm ${
                        nightMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {getTypeLabel(track.config.type)}
                      </td>
                      <td className={`px-4 py-4 text-sm ${
                        nightMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
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
              <svg 
                className="w-6 h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Next: Visualize Your Tracks on WashU Epigenome Browser</span>
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

export default AssaySelection;

import React, { type FC, useState, useMemo } from 'react';
import type { TaxonomyNeighborhood, AssayType } from '../store/taxonomyStore';
import { 
  getHierarchyColor, 
  calculateGroupRegionDistribution,
  calculateSubclassRegionDistribution 
} from '../store/taxonomyStore';
import RegionDistributionChart from './RegionDistributionChart';
import { getTooltipText } from '../utils/abbreviationLookup';

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
  
  // Calculate region distribution for selected groups
  const groupRegionDistribution = useMemo(() => {
    return calculateGroupRegionDistribution(taxonomyData, assayType);
  }, [taxonomyData, assayType]);
  
  // Calculate region distribution for selected subclasses
  const subclassRegionDistribution = useMemo(() => {
    return calculateSubclassRegionDistribution(taxonomyData, assayType);
  }, [taxonomyData, assayType]);
  
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
                      <span title={getTooltipText(neighborhood.neighborhood, 'neighborhood')}>
                        {neighborhood.neighborhood}
                      </span>
                    </td>
                    <td className="px-4 py-3"></td>
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
                          <span title={getTooltipText(classObj.class, 'class')}>
                            {classObj.class}
                          </span>
                        </td>
                        <td className="px-4 py-3"></td>
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
                              <span title={getTooltipText(subclass.subclass, 'subclass')}>{subclass.subclass}</span>
                            </td>
                            <td className="px-4 py-3">
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
                                <span title={getTooltipText(group.group, 'group')}>{group.group}</span>
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

      {/* Dataset Selector */}
      <div className={`rounded-2xl shadow-lg p-4 ${
        nightMode ? 'bg-gray-900/50 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        <label className={`block text-sm font-medium mb-2 ${nightMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Dataset
        </label>
        <p className={`text-xs mb-3 ${nightMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Select the dataset for region distribution calculation
        </p>
        <select
          value={assayType}
          onChange={(e) => setAssayType(e.target.value as AssayType)}
          className={`w-full px-4 py-3 rounded-lg text-sm transition-colors ${
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

      {/* Region Distribution Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subclass Region Distribution */}
        <RegionDistributionChart 
          regionDistribution={subclassRegionDistribution}
          nightMode={nightMode}
          title="Subclass Region Distribution"
          description="Cell count distribution for selected subclasses"
        />
        
        {/* Group Region Distribution */}
        <RegionDistributionChart 
          regionDistribution={groupRegionDistribution}
          nightMode={nightMode}
          title="Group Region Distribution"
          description="Cell count distribution for selected groups"
        />
      </div>

      {/* Allen Brain Atlas Section */}
      <div className={`rounded-2xl shadow-xl overflow-hidden ${
        nightMode ? 'bg-gray-900/50 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          nightMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
        }`}>
          <div>
            <h3 className={`text-lg font-semibold ${nightMode ? 'text-gray-100' : 'text-gray-900'}`}>
              Allen Brain Atlas
            </h3>
            <p className={`text-sm mt-1 ${nightMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Interactive 3D reference atlas from the{' '}
              <a 
                href="https://atlas.brain-map.org/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 underline"
              >
                Allen Institute for Brain Science
              </a>
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
          <div className="relative w-full" style={{ height: '800px' }}>
            <iframe
              src="https://atlas.brain-map.org/atlas?atlas=265297126#atlas=265297126&plate=112282815&structure=10338&x=53996.08258928572&y=57561.14397321429&zoom=-7&resolution=176.55&z=3"
              className="w-full h-full border-0"
              title="Allen Brain Atlas"
              allow="fullscreen"
              loading="lazy"
              tabIndex={-1}
            />
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

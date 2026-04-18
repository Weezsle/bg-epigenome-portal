import React, { type FC, useEffect, useRef, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
  type ChartConfiguration
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend
);

type RegionDistributionChartProps = {
  regionDistribution: Record<string, number>;
  nightMode: boolean;
  title?: string;
  description?: string;
};

const RegionDistributionChart: FC<RegionDistributionChartProps> = ({ 
  regionDistribution, 
  nightMode,
  title = 'Region Distribution',
  description
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS | null>(null);

  // Sort regions by count (descending)
  const sortedData = useMemo(() => {
    const entries = Object.entries(regionDistribution);
    entries.sort((a, b) => b[1] - a[1]);
    return entries;
  }, [regionDistribution]);

  // Use abbreviations for labels
  const labels = sortedData.map(([region]) => region);
  const regionKeys = sortedData.map(([region]) => region);
  const data = sortedData.map(([, count]) => count);
  const totalCount = data.reduce((sum, count) => sum + count, 0);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const chartData = {
      labels,
      datasets: [
        {
          label: 'Cell Count',
          data,
          backgroundColor: nightMode 
            ? 'rgba(96, 165, 250, 0.8)'  // blue-400 with opacity
            : 'rgba(59, 130, 246, 0.8)',  // blue-500 with opacity
          borderColor: nightMode
            ? 'rgba(96, 165, 250, 1)'
            : 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
        },
      ],
    };

    const options: ChartOptions<'bar'> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: false,
        },
        tooltip: {
          backgroundColor: nightMode ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          titleColor: nightMode ? '#e5e7eb' : '#1f2937',
          bodyColor: nightMode ? '#d1d5db' : '#374151',
          borderColor: nightMode ? '#4b5563' : '#d1d5db',
          borderWidth: 1,
          callbacks: {
            label: (context) => {
              const value = context.parsed.y;
              const percentage = totalCount > 0 ? ((value / totalCount) * 100).toFixed(1) : '0.0';
              return `Count: ${value.toLocaleString()} (${percentage}%)`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: nightMode ? '#d1d5db' : '#374151',
            font: {
              size: 11,
            },
          },
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: nightMode ? '#d1d5db' : '#374151',
            callback: (value) => {
              if (typeof value === 'number') {
                return value.toLocaleString();
              }
              return value;
            },
          },
          grid: {
            color: nightMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 0.8)',
          },
        },
      },
    };

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: chartData,
      options,
    };

    chartRef.current = new ChartJS(ctx, config);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [labels, data, nightMode, totalCount]);

  if (sortedData.length === 0) {
    return (
      <div className={`rounded-2xl shadow-xl overflow-hidden ${
        nightMode ? 'bg-gray-900/50 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        <div className={`px-6 py-4 border-b ${nightMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
          <h3 className={`text-lg font-semibold ${nightMode ? 'text-gray-100' : 'text-gray-900'}`}>
            {title}
          </h3>
          <p className={`text-sm mt-1 ${nightMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {description || `Cell count distribution across brain regions (Total: ${totalCount.toLocaleString()} cells)`}
          </p>
        </div>
        <div className="p-12 text-center">
          <svg 
            className={`mx-auto h-16 w-16 ${nightMode ? 'text-gray-600' : 'text-gray-400'}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
            />
          </svg>
          <p className={`mt-4 text-sm ${nightMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {description || 'No data selected. Select items above to see region distribution.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl shadow-xl overflow-hidden ${
      nightMode ? 'bg-gray-900/50 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <div className={`px-6 py-4 border-b ${nightMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
          <h3 className={`text-lg font-semibold ${nightMode ? 'text-gray-100' : 'text-gray-900'}`}>
            {title}
          </h3>
          <p className={`text-sm mt-1 ${nightMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {description ? `${description} (Total: ${totalCount.toLocaleString()} cells)` : `Cell count distribution across brain regions (Total: ${totalCount.toLocaleString()} cells)`}
          </p>
        </div>
      <div className="p-6">
        <div style={{ height: '400px', position: 'relative' }}>
          <canvas ref={canvasRef}></canvas>
        </div>
      </div>
      
      {/* Summary Statistics */}
      <div className={`px-6 py-4 border-t ${nightMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50/50'}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className={`text-xs ${nightMode ? 'text-gray-400' : 'text-gray-600'}`}>Regions</p>
            <p className={`text-lg font-semibold ${nightMode ? 'text-gray-100' : 'text-gray-900'}`}>
              {sortedData.length}
            </p>
          </div>
          <div>
            <p className={`text-xs ${nightMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Cells</p>
            <p className={`text-lg font-semibold ${nightMode ? 'text-gray-100' : 'text-gray-900'}`}>
              {totalCount.toLocaleString()}
            </p>
          </div>
          <div>
            <p className={`text-xs ${nightMode ? 'text-gray-400' : 'text-gray-600'}`}>Top Region</p>
            <p className={`text-lg font-semibold ${nightMode ? 'text-gray-100' : 'text-gray-900'}`} title={sortedData[0]?.[0] || 'N/A'}>
              {sortedData[0]?.[0] || 'N/A'}
            </p>
          </div>
          <div>
            <p className={`text-xs ${nightMode ? 'text-gray-400' : 'text-gray-600'}`}>Top Count</p>
            <p className={`text-lg font-semibold ${nightMode ? 'text-gray-100' : 'text-gray-900'}`}>
              {sortedData[0]?.[1]?.toLocaleString() || 'N/A'}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default RegionDistributionChart;

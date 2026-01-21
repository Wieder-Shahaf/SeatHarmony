import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useGuests } from '../src/context/GuestContext';
import { getVisualLayout } from '../src/utils/visualLayouts';
import { prepareDataForApi } from '../src/services/api';
import { getTableColor, getTableBorderColor, TABLE_COLORS } from '../src/types/models';
import confetti from 'canvas-confetti';

const API_BASE = import.meta.env.VITE_API_BASE || '';

// Half-circle scale component
interface HalfCircleScaleProps {
  percentage: number; // 0-100
  size?: number; // Size in pixels
}

const HalfCircleScale: React.FC<HalfCircleScaleProps> = ({ percentage, size = 120 }) => {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  // Animate from 0 to target percentage on mount
  useEffect(() => {
    const duration = 1500; // 1.5 seconds
    const startTime = Date.now();
    const startValue = 0;
    const endValue = percentage;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      const currentValue = startValue + (endValue - startValue) * easedProgress;
      setAnimatedPercentage(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setAnimatedPercentage(endValue);
      }
    };

    requestAnimationFrame(animate);
  }, [percentage]);

  const radius = size / 2;
  const centerX = size / 2;
  const centerY = size / 2; // Center vertically, but arc will be above
  const strokeWidth = 10;
  const innerRadius = radius - strokeWidth / 2;
  const labelRadius = innerRadius + 12; // Position labels slightly outside the arc

  // Calculate angle for the dial using animated percentage
  // 0% = left (180°), 50% = top (90°), 100% = right (0°)
  const startAngle = 180; // Left side
  const endAngle = 0; // Right side
  const angle = startAngle - (animatedPercentage / 100) * (startAngle - endAngle);
  const angleRad = (angle * Math.PI) / 180;

  // Calculate dial endpoint
  const dialX = centerX + innerRadius * Math.cos(angleRad);
  const dialY = centerY - innerRadius * Math.sin(angleRad);

  // Path for the upper half circle
  const pathData = `M ${centerX - innerRadius} ${centerY} A ${innerRadius} ${innerRadius} 0 0 1 ${centerX + innerRadius} ${centerY}`;

  // Calculate section boundaries (in degrees)
  const section1End = 120; // 33% = 180 - 60 = 120°
  const section2End = 60;  // 66% = 180 - 120 = 60°

  // Monochromatic colors matching UI theme (flipped order)
  const colors = {
    shuffled: '#68604D',  // Dark brown (text-main) - flipped from harmony
    mix: '#8A8E75',      // Medium sage (primary)
    harmony: '#D5C7AD', // Light beige (secondary) - flipped from shuffled
  };

  // Determine which section the percentage falls into
  const getSection = (pct: number) => {
    if (pct < 33) return { name: 'Shuffled', color: colors.shuffled };
    if (pct < 66) return { name: 'Mix', color: colors.mix };
    return { name: 'Harmony', color: colors.harmony };
  };

  const section = getSection(animatedPercentage);

  // Calculate section arc endpoints
  const section1EndRad = (section1End * Math.PI) / 180;
  const section2EndRad = (section2End * Math.PI) / 180;

  const section1EndX = centerX + innerRadius * Math.cos(section1EndRad);
  const section1EndY = centerY - innerRadius * Math.sin(section1EndRad);
  const section2EndX = centerX + innerRadius * Math.cos(section2EndRad);
  const section2EndY = centerY - innerRadius * Math.sin(section2EndRad);

  // Calculate label positions
  // Shuffled at left edge (180°), Harmony at right edge (0°), Mix in middle
  const shuffledAngle = 180; // Left edge
  const mixAngle = (section1End + section2End) / 2; // Middle of section 2
  const harmonyAngle = 0; // Right edge

  const shuffledRad = (shuffledAngle * Math.PI) / 180;
  const mixRad = (mixAngle * Math.PI) / 180;
  const harmonyRad = (harmonyAngle * Math.PI) / 180;

  // Adjust positions: Shuffled slightly left, Harmony slightly right
  const shuffledX = centerX + labelRadius * Math.cos(shuffledRad) - 4; // Move left
  const shuffledY = centerY - labelRadius * Math.sin(shuffledRad);
  const mixX = centerX + labelRadius * Math.cos(mixRad);
  const mixY = centerY - labelRadius * Math.sin(mixRad);
  const harmonyX = centerX + labelRadius * Math.cos(harmonyRad) + 4; // Move right
  const harmonyY = centerY - labelRadius * Math.sin(harmonyRad);

  return (
    <div className="flex flex-col items-center mt-2">
      <svg width={size} height={size / 2 + 15} className="overflow-visible" viewBox={`0 -5 ${size} ${size / 2 + 20}`}>
        {/* Background half circle (light gray) */}
        <path
          d={pathData}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Section 1: Shuffled (0-33%) */}
        <path
          d={`M ${centerX - innerRadius} ${centerY} A ${innerRadius} ${innerRadius} 0 0 1 ${section1EndX} ${section1EndY}`}
          fill="none"
          stroke={colors.shuffled}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Section 2: Mix (33-66%) */}
        <path
          d={`M ${section1EndX} ${section1EndY} A ${innerRadius} ${innerRadius} 0 0 1 ${section2EndX} ${section2EndY}`}
          fill="none"
          stroke={colors.mix}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Section 3: Harmony (66-100%) */}
        <path
          d={`M ${section2EndX} ${section2EndY} A ${innerRadius} ${innerRadius} 0 0 1 ${centerX + innerRadius} ${centerY}`}
          fill="none"
          stroke={colors.harmony}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Dial/Indicator line */}
        <line
          x1={centerX}
          y1={centerY}
          x2={dialX}
          y2={dialY}
          stroke={section.color}
          strokeWidth={4}
          strokeLinecap="round"
        />

        {/* Dial circle at end */}
        <circle
          cx={dialX}
          cy={dialY}
          r={7}
          fill={section.color}
          stroke="white"
          strokeWidth={2}
        />

        {/* Center dot */}
        <circle
          cx={centerX}
          cy={centerY}
          r={5}
          fill="#9ca3af"
        />

        {/* Labels on the arc */}
        <text
          x={shuffledX}
          y={shuffledY}
          textAnchor="end"
          dominantBaseline="middle"
          className="text-[11px] font-bold fill-gray-600 dark:fill-gray-400"
          style={{ fontFamily: 'Lato, sans-serif' }}
        >
          Shuffled
        </text>

        <text
          x={mixX}
          y={mixY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-[11px] font-bold fill-gray-600 dark:fill-gray-400"
          style={{ fontFamily: 'Lato, sans-serif' }}
        >
          Mix
        </text>

        <text
          x={harmonyX}
          y={harmonyY}
          textAnchor="start"
          dominantBaseline="middle"
          className="text-[11px] font-bold fill-gray-600 dark:fill-gray-400"
          style={{ fontFamily: 'Lato, sans-serif' }}
        >
          Harmony
        </text>
      </svg>
    </div>
  );
};

const ExportDashboard: React.FC = () => {
  const { guests, tables, layouts, selectedLayoutIndex, selectedVenueLayout } = useGuests();
  const [showPreview, setShowPreview] = useState(false);
  const iconRef = useRef<HTMLDivElement>(null);

  // Debug logging
  useEffect(() => {
    console.log('ExportDashboard mounted', {
      guestsCount: guests.length,
      tablesCount: tables.length,
      layoutsCount: layouts.length,
      selectedLayoutIndex,
      hasSelectedVenueLayout: !!selectedVenueLayout
    });
  }, []);

  const navigate = useNavigate();
  // Redirect if no venue selected
  // Placeholder if no venue selected
  if (!selectedVenueLayout) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[60vh]">
        <div className="text-center py-16 px-4">
          <span className="material-icons-round text-6xl text-gray-300 dark:text-gray-600 mb-4">storefront</span>
          <h2 className="font-display text-2xl text-text-main dark:text-white mb-4">Select a Venue</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Please choose a venue layout before concluding your plan. This ensures your seating chart matches the actual space.
          </p>
          <button
            onClick={() => navigate('/venues')}
            className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-[#777b63] transition-colors shadow-lg shadow-primary/20"
          >
            Go to Venue Selection
          </button>
        </div>
      </div>
    );
  }

  // Export states
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Export options state (connected to checkboxes)
  const [exportOptions, setExportOptions] = useState({
    includeDietary: false,
    vendorMealCount: false,
    tableSummary: false,
    highResForPrinting: false,
  });

  // Trigger confetti on mount
  useEffect(() => {
    try {
      if (iconRef.current && typeof window !== 'undefined') {
        const rect = iconRef.current.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;

        confetti({
          particleCount: 150,
          spread: 70,
          origin: { x, y },
          colors: ['#8f9b77', '#b8c4a9', '#f3f4f6', '#d1d5db'], // Custom colors to match theme
          disableForReducedMotion: true
        });
      }
    } catch (error) {
      console.warn('Confetti effect failed:', error);
      // Silently fail - confetti is not critical
    }
  }, []);

  // Format date for filename
  const formatDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  // Handle Excel export
  const handleExcelExport = async () => {
    const selectedLayout = layouts[selectedLayoutIndex];
    if (!selectedLayout) return;

    setIsExportingExcel(true);
    setExportError(null);

    try {
      const response = await fetch(`${API_BASE}/api/export/excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...prepareDataForApi(guests, tables),
          layout: selectedLayout.layout,
          options: {
            include_dietary: exportOptions.includeDietary,
            include_vendor_summary: exportOptions.vendorMealCount,
            include_table_details: exportOptions.tableSummary,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate Excel file');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const venueName = selectedVenueLayout?.name?.replace(/\s+/g, '_') || 'Venue';
      a.download = `SeatHarmony_SeatingPlan_${venueName}_${formatDate()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Excel export failed:', err);
      setExportError('Failed to export Excel file. Please try again.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Handle PDF export (client-side using html2canvas + jsPDF)
  const handlePdfExport = async () => {
    setIsExportingPdf(true);
    setExportError(null);

    try {
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');

      // Find the dedicated export container
      const previewElement = document.querySelector('#pdf-export-container');
      if (!previewElement) {
        throw new Error('Preview element not found');
      }

      const scale = exportOptions.highResForPrinting ? 2 : 1;

      // Wait for render cycle to display the container
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(previewElement as HTMLElement, {
        scale,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false, // cleaner console
      });

      const imgWidth = 297; // A4 landscape width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: imgHeight > imgWidth ? 'portrait' : 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);

      const venueName = selectedVenueLayout?.name?.replace(/\s+/g, '_') || 'Venue';
      pdf.save(`SeatHarmony_FloorPlan_${venueName}_${formatDate()}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      setExportError('Failed to export PDF. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Get selected layout
  const selectedLayout = layouts[selectedLayoutIndex] || null;
  const assignments = selectedLayout?.layout?.assignments || {};

  // Calculate stats
  const seatedCount = useMemo(() => {
    return guests.filter(g => assignments[g.id]).length;
  }, [guests, assignments]);

  const score = selectedLayout?.layout?.score || selectedLayout?.value || 0;

  // Prepare data for visual layout (reusing logic from Confirmation.tsx)
  // Group guests by table for easier rendering
  const guestsByTable = useMemo(() => {
    const acc: Record<string, typeof guests> = {};
    guests.forEach(guest => {
      const tableId = assignments[guest.id];
      if (tableId) {
        if (!acc[tableId]) acc[tableId] = [];
        acc[tableId].push(guest);
      }
    });
    return acc;
  }, [guests, assignments]);

  // Calculate harmony percentage: guests seated at tables where majority are from same group
  const harmonyPercentage = useMemo(() => {
    try {
      const seatedGuests = guests.filter(g => assignments[g.id]);
      if (seatedGuests.length === 0) return 0;

      let guestsWithGroupMajority = 0;

      // For each table, check if majority of guests are from the same group
      Object.entries(guestsByTable).forEach(([tableId, tableGuests]: [string, typeof guests]) => {
        if (tableGuests.length === 0) return;

        // Count guests by group
        const groupCounts: Record<string, number> = {};
        tableGuests.forEach(guest => {
          const groupId = guest.group_id || 'Uncategorized';
          groupCounts[groupId] = (groupCounts[groupId] || 0) + 1;
        });

        // Find the majority group (group with most guests)
        const groupEntries = Object.entries(groupCounts);
        if (groupEntries.length === 0) return; // Skip if no groups found

        const majorityGroup = groupEntries.reduce((a, b) =>
          groupCounts[a[0]] > groupCounts[b[0]] ? a : b
        );
        const majorityCount = majorityGroup[1];
        const isMajority = majorityCount > tableGuests.length / 2;

        // Count guests who are in the majority group
        if (isMajority) {
          tableGuests.forEach(guest => {
            const groupId = guest.group_id || 'Uncategorized';
            if (groupId === majorityGroup[0]) {
              guestsWithGroupMajority++;
            }
          });
        }
      });

      return Math.round((guestsWithGroupMajority / seatedGuests.length) * 100);
    } catch (error) {
      console.error('Error calculating harmony percentage:', error);
      return 0; // Return safe default
    }
  }, [guests, guestsByTable, assignments]);

  // Calculate category stats for coloring
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    tables.forEach(table => {
      const tableGuests = guestsByTable[table.id] || [];
      const primaryCategory = tableGuests.length > 0
        ? (tableGuests.find(g => g.group_id)?.group_id || 'Mixed')
        : 'Empty';
      stats[primaryCategory] = (stats[primaryCategory] || 0) + 1;
    });
    return stats;
  }, [tables, guestsByTable]);

  // Get visual layout configuration
  const visualLayout = useMemo(() => {
    try {
      return getVisualLayout(selectedVenueLayout?.id, tables.length);
    } catch (error) {
      console.error('Error getting visual layout:', error);
      // Return a safe default layout
      return {
        venueId: 'default',
        width: 1200,
        height: 1000,
        danceFloor: { x: 50, y: 15, width: 30, height: 10, shape: 'rect' },
        tables: tables.map((_, i) => ({ x: 50, y: 50, rotation: 0 }))
      };
    }
  }, [selectedVenueLayout, tables.length]);


  // Handle no data - check if we have a valid layout
  if (!selectedLayout || !selectedLayout.layout || guests.length === 0) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="text-center py-16">
          <span className="material-icons-round text-6xl text-gray-300 dark:text-gray-600 mb-4">download</span>
          <h2 className="font-display text-2xl text-text-main dark:text-white mb-4">No Layout to Export</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please generate and confirm a layout first.
          </p>
          <Link to="/recommendations" className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-[#777b63] transition-colors">
            Generate Recommendations
          </Link>
        </div>
      </div>
    );
  }

  // Render Map Helper
  const renderMap = (isSmall = false) => (
    <div className="relative w-full h-full">
      <div className="absolute inset-0 pattern-grid opacity-20 pointer-events-none"></div>

      {/* Visual Features (Bars, Restrooms, etc.) */}
      {visualLayout.features?.map((feature, i) => {
        const isZone = feature.type === 'zone';
        return (
          <div
            key={`feat-${i}`}
            className={`absolute flex justify-center
            ${isZone
                ? 'items-end pb-1 border-none' // Bottom aligned for zones
                : `items-center border-2 shadow-sm ${feature.type === 'canopy' ? '' : 'backdrop-blur-sm'}`}
            ${feature.type === 'bar' ? 'bg-amber-100/50 border-amber-400 dark:bg-amber-900/30' :
                feature.type === 'restroom' ? 'bg-blue-100/50 border-blue-400 dark:bg-blue-900/30' :
                  feature.type === 'zone' && feature.label === 'Garden' ? 'bg-green-50/80 dark:bg-green-900/20' : // Soft natural green
                    feature.type === 'zone' && feature.label === 'Beach' ? 'bg-sky-400/60 dark:bg-sky-900/50' : // Beachy blue
                      feature.type === 'zone' && feature.label === 'Indoor Hall' ? 'bg-slate-200/50 dark:bg-slate-800/30' : // Increased opacity
                        feature.type === 'canopy' ? 'bg-pink-50/20 border-pink-300 border-dashed dark:bg-pink-900/10' :
                          feature.type === 'lifeguard' ? 'bg-red-100/80 border-red-500 border-2 dark:bg-red-900/40' :
                            feature.type === 'present-table' ? 'bg-purple-100/80 border-purple-400 border-2 border-dotted dark:bg-purple-900/40' :
                              feature.type === 'cake' ? 'bg-sky-100/90 border-sky-300/60 border-2 dark:bg-sky-900/40' :
                                feature.type === 'aisle' ? 'bg-amber-700/20 border-amber-600 border-dashed dark:bg-amber-600/20' :
                                  feature.type === 'resting-area' ? 'bg-rose-900/10 border-rose-900/30 border-2 dark:bg-rose-500/10 dark:border-rose-400/30' :
                                    feature.type === 'binoculars' ? 'bg-purple-500/80 border-purple-700 border-2 dark:bg-purple-600/60' :
                                      feature.type === 'viewing-platform' ? 'bg-rose-900/80 border-rose-950 border-2 dark:bg-rose-800/60' :
                                        feature.type === 'magnets-board' ? 'bg-teal-500/80 border-teal-700 border-2 dark:bg-teal-600/60' :
                                          feature.type === 'emergency-exit' ? 'bg-red-500/80 border-red-700 border-2 dark:bg-red-600/60' :
                                            feature.type === 'piano' ? 'bg-gray-900/90 border-black border-2 dark:bg-black/80' :
                                              feature.type === 'kids-area' ? 'bg-lime-200/80 border-lime-400 border-2 border-dashed dark:bg-lime-900/40' :
                                                feature.type === 'seating-area' ? 'bg-teal-100/80 border-teal-300 border-2 dark:bg-teal-900/40' :
                                                  feature.type === 'boutique-seating' ? 'bg-fuchsia-100/80 border-fuchsia-300 border-2 dark:bg-fuchsia-900/40' :
                                                    feature.type === 'kitchen' ? 'bg-[#68604D]/20 border-[#68604D] border-2 dark:bg-[#68604D]/40' :
                                                      'bg-gray-100/50 border-gray-400 dark:bg-gray-700/30'}`}
            style={{
              left: `${feature.x}%`,
              top: `${feature.y}%`,
              width: `${feature.width}%`,
              height: `${feature.height}%`,
              transform: `translate(-50%, -50%) rotate(${feature.rotation || 0}deg)`,
              borderRadius: feature.shape === 'circle' ? '9999px' : isZone ? '16px' : '8px',
              zIndex: isZone ? 0 : 5 // Zones are background (0), others are foreground (5)
            }}
          >
            {(!isSmall || isZone) && (
              <span
                className={`uppercase tracking-wider whitespace-pre-wrap text-center leading-3 px-1 ${isZone
                  ? isSmall ? 'text-[10px] font-extrabold text-gray-500' : 'text-xs md:text-sm font-extrabold text-gray-600 dark:text-gray-400'
                  : (['binoculars', 'viewing-platform', 'magnets-board', 'emergency-exit', 'piano'].includes(feature.type) ? 'text-[10px] font-bold text-white' : 'text-[10px] font-bold text-gray-700 dark:text-gray-300')}`}
                style={{
                  display: 'inline-block',
                  transform: `rotate(${feature.labelRotation || 0}deg)`
                }}
              >
                {feature.label}
              </span>
            )}
          </div>
        );
      })}
      {/* Visual Dance Floor */}
      {visualLayout.danceFloor && (
        <div
          className="absolute border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center opacity-50"
          style={{
            left: `${visualLayout.danceFloor.x}%`,
            top: `${visualLayout.danceFloor.y}%`,
            width: `${visualLayout.danceFloor.width}%`,
            height: `${visualLayout.danceFloor.height}%`,
            transform: 'translate(-50%, -50%)',
            borderRadius: visualLayout.danceFloor.shape === 'circle' ? '9999px' : '16px'
          }}
        >
          {!isSmall && <span className="text-sm text-gray-400 uppercase tracking-widest font-light whitespace-pre-wrap text-center">{visualLayout.danceFloor.label || 'Dance Floor'}</span>}
        </div>
      )}

      {/* Absolutely Positioned Tables */}
      {tables.map((table, i) => {
        const tableGuests = guestsByTable[table.id] || [];
        const primaryCategory = tableGuests.length > 0
          ? (tableGuests.find(g => g.group_id)?.group_id || 'Mixed')
          : 'Empty';
        const colorIndex = Object.keys(categoryStats).indexOf(primaryCategory) % TABLE_COLORS.length;
        const bgColor = getTableColor(colorIndex);
        const borderColor = getTableBorderColor(colorIndex);
        const isRound = table.constraints?.tableType !== 'rectangular';

        // Get position from visual layout, fallback to grid
        const position = visualLayout.tables[i] || { x: 50, y: 50, rotation: 0 };

        return (
          <div
            key={table.id}
            className="absolute flex flex-col items-center justify-center"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              transform: `translate(-50%, -50%) rotate(${position.rotation}deg) scale(${isSmall ? 0.6 : 1})`
            }}
          >
            <div className={`
                 ${isSmall
                ? (isRound ? 'w-8 h-8' : 'w-10 h-5')
                : (isRound ? 'w-16 h-16' : 'w-20 h-10')}
                 ${isRound ? 'rounded-full' : 'rounded-lg'}
                 ${bgColor}/20 dark:${bgColor}/10
                 border-2 ${borderColor}
                 flex items-center justify-center shadow-md relative backdrop-blur-sm
               `}>
              {!isSmall && (
                <span className={`font-bold text-sm ${bgColor.replace('bg-', 'text-').replace('-400', '-500').replace('-300', '-400')}`}>
                  {table.name.replace('Table ', '')}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex-grow flex flex-col items-center justify-center py-6 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-background-lighter dark:bg-background-dark">
      {/* Decorative Blobs */}
      {/* Decorative Blobs - Removed per user request */}

      <div className="max-w-5xl w-full space-y-8 relative z-10 animate-[fadeInUp_0.8s_ease-out]">

        {/* Success Hero Card */}
        <div ref={iconRef} className="bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md shadow-2xl rounded-3xl px-8 pb-8 pt-6 md:px-12 md:pb-12 md:pt-8 text-center border border-white/50 dark:border-gray-700 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-secondary via-primary to-secondary opacity-50"></div>



          <h2 className="flex flex-col items-center justify-center gap-0 font-display text-5xl text-text-main dark:text-gray-100 mb-6 tracking-tight">
            <span className="text-primary font-script text-6xl block transform -rotate-2">Optimization Complete!</span>
            <span className="text-3xl opacity-90">Ready for your big day</span>
          </h2>

          <p className="text-xl text-gray-600 dark:text-gray-300 font-light max-w-2xl mx-auto leading-relaxed">
            Your seating plan for <strong className="font-medium text-primary">{selectedVenueLayout?.name || 'your venue'}</strong> is perfected.
            Every guest has been harmoniously placed to ensure a memorable celebration.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
            {/* Guests Seated */}
            <div className="relative group/stat px-6 py-3.5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-secondary/20 hover:border-primary/30 hover:-translate-y-1">
              <div className="absolute top-3.5 right-5 transition-colors">
                <span className="material-icons-outlined text-xl text-primary opacity-80">groups</span>
              </div>
              <dt className="text-[12px] font-bold text-gray-400 dark:text-gray-500 text-left uppercase tracking-widest mt-1">
                Guests Seated
              </dt>
              <dd className="mt-2 text-5xl font-display font-semibold text-text-main dark:text-white text-center leading-tight">
                {seatedCount}
              </dd>
            </div>

            {/* Tables Arranged */}
            <div className="relative group/stat px-6 py-3.5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-secondary/20 hover:border-primary/30 hover:-translate-y-1">
              <div className="absolute top-3.5 right-5 transition-colors">
                <span className="material-icons-outlined text-xl text-primary opacity-80">table_restaurant</span>
              </div>
              <dt className="text-[12px] font-bold text-gray-400 dark:text-gray-500 text-left uppercase tracking-widest mt-1">
                Tables Arranged
              </dt>
              <dd className="mt-2 text-5xl font-display font-semibold text-text-main dark:text-white text-center leading-tight">
                {tables.length}
              </dd>
            </div>

            {/* Harmony Scale */}
            <div className="relative group/stat px-6 py-3.5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-secondary/20 hover:border-primary/30 hover:-translate-y-1 flex flex-col items-center justify-center">
              <dt className="text-[12px] font-bold text-gray-400 dark:text-gray-500 text-center uppercase tracking-widest mb-1">
                Seating Harmony
              </dt>
              <HalfCircleScale percentage={harmonyPercentage} size={100} />
            </div>
          </div>

          {/* Error message */}
          {exportError && (
            <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm flex items-center justify-center gap-2">
              <span className="material-icons-outlined">error_outline</span>
              {exportError}
            </div>
          )}

          <div className="mt-12 flex flex-col sm:flex-row justify-center gap-5">
            <button
              onClick={handleExcelExport}
              disabled={isExportingExcel}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium rounded-2xl shadow-lg shadow-primary/20 text-white bg-gradient-to-br from-primary to-[#777b63] hover:to-[#666a54] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isExportingExcel ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <span className="material-icons-outlined mr-2">table_view</span>
                  Download Excel
                </>
              )}
            </button>
            <button
              onClick={handlePdfExport}
              disabled={isExportingPdf}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium rounded-2xl shadow-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-all duration-200 transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isExportingPdf ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <span className="material-icons-outlined mr-2">picture_as_pdf</span>
                  Download PDF Map
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Floor Plan Preview Card */}
          <div className="bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md rounded-3xl shadow-lg p-8 border border-white/50 dark:border-gray-700 flex flex-col group hover:shadow-xl transition-all duration-300">
            <div className="flex justify-center items-center mb-6">
              <h3 className="flex items-center gap-3 font-display text-2xl text-text-main dark:text-gray-200">
                <div className="text-primary">
                  <span className="material-icons-outlined text-2xl">space_dashboard</span>
                </div>
                Visual Preview
              </h3>

            </div>

            {/* Functional Map Preview */}
            <div
              className="floor-plan-preview bg-gray-50 dark:bg-gray-800 rounded-2xl h-64 w-full relative overflow-hidden cursor-pointer border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-primary/50 transition-all duration-300"
              onClick={() => setShowPreview(true)}
            >
              {renderMap(true)}

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-5 py-2.5 rounded-full shadow-lg border border-white/50 dark:border-gray-700/50 transform transition-all duration-300 group-hover:scale-105 group-hover:bg-white dark:group-hover:bg-gray-800 flex items-center gap-2">
                  <span className="material-icons-outlined text-primary">zoom_in</span>
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Zoom to View</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <span className="material-icons-outlined text-gray-400 mt-0.5">info</span>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {selectedVenueLayout ? (
                  <div className="flex flex-col">
                    <span>Previewing <span className="font-semibold text-gray-700 dark:text-gray-300">{selectedVenueLayout.name}</span> layout.</span>
                    <span>Arranged across <span className="font-semibold">{tables.length} tables</span>.</span>
                  </div>
                ) : (
                  <>Custom venue with {tables.length} tables.</>
                )}
              </p>
            </div>
          </div>

          {/* Export Settings Card */}
          <div className="bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md rounded-3xl shadow-lg p-8 border border-white/50 dark:border-gray-700 flex flex-col hover:shadow-xl transition-all duration-300">
            <h3 className="flex justify-center items-center gap-3 font-display text-2xl text-text-main dark:text-gray-200 mb-6">
              <div className="text-primary">
                <span className="material-icons-outlined text-2xl">tune</span>
              </div>
              Export Options
            </h3>

            <div className="space-y-4 flex-grow">
              {[
                {
                  id: 'dietary',
                  label: 'Dietary Info',
                  desc: 'Allergies & restrictions',
                  icon: 'restaurant',
                  checked: exportOptions.includeDietary,
                  setter: (checked: boolean) => setExportOptions(p => ({ ...p, includeDietary: checked }))
                },
                {
                  id: 'group_analysis',
                  label: 'Group Analysis',
                  desc: 'Guest list by group',
                  icon: 'groups',
                  checked: exportOptions.vendorMealCount,
                  setter: (checked: boolean) => setExportOptions(p => ({ ...p, vendorMealCount: checked }))
                },
                {
                  id: 'table_summary',
                  label: 'Table Summary',
                  desc: 'Stats per table',
                  icon: 'backup_table',
                  checked: exportOptions.tableSummary,
                  setter: (checked: boolean) => setExportOptions(p => ({ ...p, tableSummary: checked }))
                },
                {
                  id: 'print_res',
                  label: 'Print Quality',
                  desc: 'High-DPI rendering',
                  icon: 'print',
                  checked: exportOptions.highResForPrinting,
                  setter: (checked: boolean) => setExportOptions(p => ({ ...p, highResForPrinting: checked }))
                }
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => opt.setter(!opt.checked)}
                  className={`relative p-4 rounded-2xl cursor-pointer transition-all duration-300 border-2 flex items-center gap-4 group hover:shadow-md
                    ${opt.checked
                      ? 'bg-primary/5 border-primary dark:bg-primary/10 dark:border-primary'
                      : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-primary/30'}
                  `}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300
                    ${opt.checked ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400 dark:bg-gray-700'}
                  `}>
                    <span className="material-icons-outlined text-2xl">{opt.icon}</span>
                  </div>

                  <div className="flex-1">
                    <h4 className={`font-bold text-base transition-colors duration-300 ${opt.checked ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>
                      {opt.label}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
                      {opt.desc}
                    </p>
                  </div>

                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300
                    ${opt.checked ? 'border-primary bg-primary' : 'border-gray-300 dark:border-gray-600'}
                  `}>
                    {opt.checked && <span className="material-icons-round text-white text-[16px]">check</span>}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

        <div className="text-center pt-1">
          <p className="text-xl text-gray-500 dark:text-gray-400 italic font-display">
            "Love is the master key that opens the gates of happiness."
          </p>
        </div>
      </div>

      {/* Full Screen Preview Modal */}
      {
        showPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col relative overflow-hidden animate-slide-up">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-display text-2xl text-text-main dark:text-white">Full Floor Plan Preview</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="material-icons-outlined text-gray-500 dark:text-gray-400">close</span>
                </button>
              </div>
              <div className="flex-grow relative bg-gray-50 dark:bg-gray-900 p-16 overflow-auto flex items-center justify-center">
                <div className="w-full h-full max-w-4xl max-h-[800px] aspect-[5/4] relative translate-y-4">
                  {renderMap(false)}
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end gap-3">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium hover:bg-white dark:hover:bg-gray-700 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => { setShowPreview(false); handlePdfExport(); }}
                  disabled={isExportingPdf}
                  className="px-5 py-2 rounded-lg bg-primary text-white font-medium hover:bg-opacity-90 shadow-md transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isExportingPdf ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <span className="material-icons-outlined text-sm">download</span> Download PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      }
      {/* Hidden container for high-res PDF export */}
      {/* Hidden container for high-res PDF export - Portaled to body to avoid clipping */}
      {typeof document !== 'undefined' && createPortal(
        (() => {
          const baseWidth = visualLayout.width || 1200;
          const baseHeight = visualLayout.height || 1000;
          const padding = 200; // Extra space for bleed elements

          return (
            <div
              id="pdf-export-container"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: `${baseWidth + (padding * 1.2)}px`,
                height: `${baseHeight + (padding * 1)}px`,
                backgroundColor: '#ffffff',
                zIndex: isExportingPdf ? 9999 : -1,
                opacity: isExportingPdf ? 1 : 0,
                pointerEvents: 'none',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                visibility: isExportingPdf ? 'visible' : 'hidden',
              }}
            >
              {/* Inner container with exact layout dimensions */}
              <div
                style={{
                  width: `${baseWidth}px`,
                  height: `${baseHeight}px`,
                  position: 'relative'
                }}
              >
                {renderMap(false)}

                {/* Watermark */}
                <div className="absolute -bottom-16 right-0 text-right">
                  <div className="text-3xl font-display text-primary font-bold">SeatHarmony</div>
                  <div className="text-md text-gray-400">{selectedVenueLayout?.name} Seating Plan</div>
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}
    </div >
  );
};

export default ExportDashboard;
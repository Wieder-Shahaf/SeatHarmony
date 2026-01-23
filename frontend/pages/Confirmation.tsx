import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGuests } from '../src/context/GuestContext';
import { Guest, getTableColor, getTableBorderColor, TABLE_COLORS } from '../src/types/models';
import { getVisualLayout } from '../src/utils/visualLayouts';
import { prepareDataForApi } from '../src/services/api';

const API_BASE = import.meta.env.VITE_API_BASE || '';

const Confirmation: React.FC = () => {
  const { guests, tables, layouts, selectedLayoutIndex, selectedVenueLayout } = useGuests();
  const navigate = useNavigate();

  // Placeholder if no venue selected
  if (!selectedVenueLayout) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[60vh]">
        <div className="text-center py-16 px-4">
          <span className="material-icons-round text-6xl text-gray-300 dark:text-gray-600 mb-4">storefront</span>
          <h2 className="font-display text-2xl text-text-main dark:text-white mb-4">Select a Venue</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            We need to know your venue layout to display the final confirmation details.
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
  const [zoom, setZoom] = useState(0.65);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.3));
  const handleFit = () => setZoom(0.65);

  const [showAllTables, setShowAllTables] = useState(false);
  const [showLegendInfo, setShowLegendInfo] = useState(false);
  const [hoveredTooltip, setHoveredTooltip] = useState<{ text: string, x: number, y: number } | null>(null);

  // Panning state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const layoutRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Get selected layout
  const selectedLayout = layouts[selectedLayoutIndex] || null;
  const assignments = selectedLayout?.layout?.assignments || {};

  // Group guests by table
  const guestsByTable = useMemo(() => {
    const result: Record<string, Guest[]> = {};
    tables.forEach(t => {
      result[t.id] = [];
    });
    guests.forEach(guest => {
      const tableId = assignments[guest.id];
      if (tableId && result[tableId]) {
        result[tableId].push(guest);
      }
    });
    return result;
  }, [guests, tables, assignments]);

  // Count tables by category (unique group_ids at each table)
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

  // Get unseated count
  const unseatedCount = guests.filter(g => !assignments[g.id]).length;



  // Calculate additional stats
  const vipCount = useMemo(() => guests.filter(g => g.importance > 0).length, [guests]);
  const totalCapacity = useMemo(() => tables.reduce((acc, t) => acc + t.capacity, 0), [tables]);
  const utilization = Math.round((guests.length / totalCapacity) * 100);
  const avgPerTable = (guests.length / tables.length).toFixed(1);

  // Get visual layout configuration
  const visualLayout = useMemo(() => {
    return getVisualLayout(selectedVenueLayout?.id, tables.length);
  }, [selectedVenueLayout, tables.length]);

  // Handle no data
  if (!selectedLayout || guests.length === 0) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="text-center py-16">
          <span className="material-icons-round text-6xl text-gray-300 dark:text-gray-600 mb-4">check_circle</span>
          <h2 className="font-display text-2xl text-text-main dark:text-white mb-4">No Layout to Confirm</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please generate and select a layout first.
          </p>
          <Link to="/recommendations" className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-[#777b63] transition-colors">
            Generate Recommendations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow w-full bg-background-lighter dark:bg-background-dark min-h-screen">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-4 text-center max-w-5xl mx-auto">
          <h2 className="flex items-center justify-center gap-3 font-display text-5xl text-text-main dark:text-white mb-4">Finalize</h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg font-light leading-relaxed">
            Review your final seating arrangement below. When you're ready, export the plan for printing or distribution.
          </p>
        </div>

        {/* Main Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-280px)] min-h-[400px]">

          {/* Sidebar Info */}
          <div className="lg:col-span-3 flex flex-col gap-4 h-full overflow-hidden">
            <div className="bg-white/60 dark:bg-surface-dark/60 backdrop-blur-md rounded-2xl shadow-sm border border-secondary/20 dark:border-gray-700 flex flex-col overflow-hidden flex-shrink-0 max-h-[45%]">
              <div className="relative px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 bg-white/50 dark:bg-white/5">
                <span className="material-icons-round text-secondary text-lg">map</span>
                <h3 className="font-display text-lg text-text-main dark:text-secondary">Groups Legend</h3>
                <button
                  onClick={() => setShowLegendInfo(!showLegendInfo)}
                  className="material-icons-round text-gray-400/70 hover:text-primary text-lg cursor-pointer transition-colors focus:outline-none mt-0.5"
                  title="Click for more info"
                >
                  info
                </button>

                {/* Info Tooltip Popover */}
                {showLegendInfo && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowLegendInfo(false)}></div>
                    <div className="absolute top-10 left-4 right-4 z-20 bg-white dark:bg-gray-800 p-3 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 animate-fade-in-down">
                      <div className="flex items-start gap-2">
                        <span className="material-icons-round text-primary text-sm mt-0.5">info</span>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                            Table colors represent the <span className="text-primary font-bold">majority group</span> seated at that table.
                          </p>
                        </div>
                        <button onClick={() => setShowLegendInfo(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                          <span className="material-icons-round text-sm">close</span>
                        </button>
                      </div>
                      <div className="absolute -top-1.5 left-28 w-3 h-3 bg-white dark:bg-gray-800 border-t border-l border-gray-200 dark:border-gray-700 transform rotate-45"></div>
                    </div>
                  </>
                )}
              </div>
              <div className="p-4 space-y-2 overflow-y-auto">
                {Object.entries(categoryStats).slice(0, 6).map(([category, count], i) => {
                  return (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-4 h-4 rounded-full ${getTableColor(i)} block shadow-sm`}></span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[140px]">{category}</span>
                      </div>
                      <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{count} Tables</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white/60 dark:bg-surface-dark/60 backdrop-blur-md rounded-2xl shadow-sm border border-secondary/20 dark:border-gray-700 flex flex-col overflow-hidden flex-1 min-h-0">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 bg-white/50 dark:bg-white/5">
                <span className="material-icons-round text-secondary text-lg">analytics</span>
                <h3 className="font-display text-lg text-text-main dark:text-secondary">Summary</h3>
              </div>

              <div className="p-4 flex flex-col gap-3 flex-1 overflow-hidden min-h-0">
                {/* Venue Section - Cleaner */}
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      {/* <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Selected Venue</span> */}
                      <div className="font-display text-lg text-text-main dark:text-white mt-0.5">{selectedVenueLayout?.name}</div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-icons-round text-lg">storefront</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                      <span>Capacity Used</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${utilization > 90 ? 'bg-red-400' : 'bg-primary'}`}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>{guests.length} guests</span>
                      <span>{totalCapacity} max</span>
                    </div>
                  </div>
                </div>

                {/* Stats Grid - High Contrast Tiles */}
                <div className="grid grid-cols-2 gap-1.5">
                  {/* Guests */}
                  <div className="bg-white/80 dark:bg-gray-800 p-1.5 rounded-lg shadow-sm border border-gray-200/50 dark:border-gray-700 flex flex-col items-center justify-center hover:bg-white transition-colors">
                    <span className="text-[8px] font-extrabold text-gray-500 uppercase tracking-widest">Guests</span>
                    <span className="font-display text-xl text-gray-800 dark:text-white leading-none lining-nums">{guests.length}</span>
                  </div>

                  {/* Tables */}
                  <div className="bg-white/80 dark:bg-gray-800 p-1.5 rounded-lg shadow-sm border border-gray-200/50 dark:border-gray-700 flex flex-col items-center justify-center hover:bg-white transition-colors">
                    <span className="text-[8px] font-extrabold text-gray-500 uppercase tracking-widest">Tables</span>
                    <span className="font-display text-xl text-gray-800 dark:text-white leading-none lining-nums">{tables.length}</span>
                  </div>
                </div>

                {/* Unseated Status */}
                <div className="border-t border-secondary/10 dark:border-gray-700 pt-3">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</h4>
                    {unseatedCount === 0 ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full">
                        <span className="material-icons-round text-[14px]">check_circle</span>
                        All Seated
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-full">
                        <span className="material-icons-round text-[14px]">priority_high</span>
                        Action Needed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Large Map View */}
          <div
            ref={layoutRef}
            className={`lg:col-span-9 bg-white dark:bg-gray-800 rounded-3xl shadow-inner border border-secondary/20 dark:border-gray-700 relative overflow-hidden flex items-center justify-center h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
              <button onClick={handleZoomIn} className="bg-white dark:bg-gray-700 p-2 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition" title="Zoom In">
                <span className="material-icons-round">add</span>
              </button>
              <button onClick={handleZoomOut} className="bg-white dark:bg-gray-700 p-2 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition" title="Zoom Out">
                <span className="material-icons-round">remove</span>
              </button>
              <button onClick={handleFit} className="bg-white dark:bg-gray-700 p-2 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition" title="Fit to Screen">
                <span className="material-icons-round">restart_alt</span>
              </button>
            </div>

            <div
              className="w-half h-full relative transition-transform duration-75 overflow-visible origin-center p-4 flex items-center justify-center"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                width: '100%',
                height: '100%'
              }}
            >
              <div className="relative w-full max-w-[1000px] aspect-[5/4]">
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
                      <span
                        className={`uppercase tracking-wider whitespace-pre-wrap text-center leading-3 px-1 ${isZone
                          ? 'text-xs md:text-sm font-extrabold text-gray-600 dark:text-gray-400' // Darker and centered
                          : (['binoculars', 'viewing-platform', 'magnets-board', 'emergency-exit', 'piano'].includes(feature.type) ? 'text-[10px] font-bold text-white' : 'text-[10px] font-bold text-gray-700 dark:text-gray-300')}`}
                        style={{
                          display: 'inline-block',
                          transform: `rotate(${feature.labelRotation || 0}deg)`
                        }}
                      >
                        {feature.label}
                      </span>
                    </div>
                  );
                })}

                {/* Visual Dance Floor */}
                {visualLayout.danceFloor && (
                  <div
                    className="absolute border-2 border-dashed border-indigo-200 dark:border-indigo-700/50 bg-indigo-50/30 dark:bg-indigo-900/20 flex items-center justify-center transition-all duration-500"
                    style={{
                      left: `${visualLayout.danceFloor.x}%`,
                      top: `${visualLayout.danceFloor.y}%`,
                      width: `${visualLayout.danceFloor.width}%`,
                      height: `${visualLayout.danceFloor.height}%`,
                      transform: 'translate(-50%, -50%)',
                      borderRadius: visualLayout.danceFloor.shape === 'circle' ? '9999px' : '16px'
                    }}
                  >
                    <span className="text-sm text-indigo-300 dark:text-indigo-400/70 uppercase tracking-widest font-medium whitespace-pre-wrap text-center">{visualLayout.danceFloor.label || 'Dance Floor'}</span>
                  </div>
                )}

                {/* Absolutely Positioned Tables */}
                {tables.map((table, i) => {
                  const tableGuests = guestsByTable[table.id] || [];

                  // Find majority category at this table
                  let primaryCategory = 'Empty';
                  if (tableGuests.length > 0) {
                    const categoryCounts: Record<string, number> = {};
                    tableGuests.forEach((g: Guest) => {
                      const cat = g.group_id || 'Mixed';
                      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
                    });
                    const counts = Object.values(categoryCounts);
                    if (counts.length > 0) {
                      const maxCount = Math.max(...counts);
                      const topCategories = Object.keys(categoryCounts).filter(cat => categoryCounts[cat] === maxCount);
                      primaryCategory = topCategories.length > 0 ? topCategories[i % topCategories.length] : 'Mixed';
                    }
                  }

                  const colorIndex = Math.max(0, Object.keys(categoryStats).indexOf(primaryCategory)) % TABLE_COLORS.length;
                  const bgColor = getTableColor(colorIndex);
                  const borderColor = getTableBorderColor(colorIndex);
                  const isRound = table.constraints?.tableType !== 'rectangular';

                  // Get position from visual layout, fallback to grid if index exceeds defined positions
                  const position = visualLayout.tables[i] || { x: 50, y: 50, rotation: 0 };

                  // Dynamic sizing for large venues
                  // Dynamic sizing for large venues
                  const isLargeVenue = tables.length > 30;
                  // distinct sizing for rectangular tables
                  const tableSizeClass = isLargeVenue
                    ? (isRound ? 'w-14 h-14' : 'w-16 h-8')
                    : (isRound ? 'w-16 h-16' : 'w-20 h-10');

                  const fontSizeClass = isLargeVenue ? 'text-[10px]' : 'text-sm';
                  const badgeSizeClass = isLargeVenue ? 'text-[8px] -bottom-1 -right-1 px-1' : 'text-[9px] -bottom-1 -right-1 px-1';

                  return (
                    <div
                      key={table.id}
                      className="absolute flex flex-col items-center cursor-pointer hover:scale-110 hover:z-20 transition-all duration-300"
                      style={{
                        left: `${position.x}%`,
                        top: `${position.y}%`,
                        transform: `translate(-50%, -50%) rotate(${position.rotation}deg)`
                      }}
                    >
                      <div className={`${tableSizeClass} ${isRound ? 'rounded-full' : 'rounded-lg'} ${bgColor}/20 dark:${bgColor}/10 border-2 ${borderColor} flex items-center justify-center shadow-md relative backdrop-blur-sm`}>
                        <span className={`font-bold ${fontSizeClass} ${bgColor.replace('bg-', 'text-').replace('-400', '-500').replace('-300', '-400')}`}>
                          {table.name.replace('Table ', '')}
                        </span>
                        <span className={`absolute bg-white dark:bg-gray-700 rounded-full shadow text-gray-500 font-mono ${badgeSizeClass}`}>
                          {tableGuests.length}
                        </span>
                      </div>
                      <div className={`mt-1 text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 max-w-[80px] truncate bg-white/80 dark:bg-gray-800/80 px-1.5 rounded backdrop-blur-sm shadow-sm ${isLargeVenue ? 'hidden group-hover:block' : ''}`}>
                        {primaryCategory}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Scroll CTA - Elegant Arrow */}
        <div className="flex justify-center mt-2">
          <button
            onClick={() => {
              const el = document.getElementById('table-details');
              if (el) {
                const top = el.getBoundingClientRect().top + window.scrollY;
                window.scrollTo({ top: top - 82, behavior: 'smooth' });
              }
            }}
            className="group flex items-center gap-2 text-gray-400 hover:text-primary transition-colors duration-300 cursor-pointer"
          >
            <span className="material-icons-round text-xl animate-bounce group-hover:animate-none">keyboard_arrow_down</span>
            <span className="text-sm font-medium tracking-wide">Table Details</span>
            <span className="material-icons-round text-xl animate-bounce group-hover:animate-none">keyboard_arrow_down</span>
          </button>
        </div>

        {/* Detail Rows */}
        <div id="table-details" className="mt-8">
          <h2 className="font-display text-2xl text-text-main dark:text-secondary mb-4">Table Details</h2>
          <div className="max-h-[800px] overflow-y-auto pr-2 -mr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-2">
              {(showAllTables ? tables : tables.slice(0, 8)).map((table, idx) => {
                const tableGuests = guestsByTable[table.id] || [];

                // Find majority category at this table
                let primaryCategory = 'Empty';
                if (tableGuests.length > 0) {
                  const categoryCounts: Record<string, number> = {};
                  tableGuests.forEach((g: Guest) => {
                    const cat = g.group_id || 'Mixed';
                    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
                  });
                  const counts = Object.values(categoryCounts);
                  if (counts.length > 0) {
                    const maxCount = Math.max(...counts);
                    const topCategories = Object.keys(categoryCounts).filter(cat => categoryCounts[cat] === maxCount);
                    primaryCategory = topCategories.length > 0 ? topCategories[idx % topCategories.length] : 'Mixed';
                  }
                }

                const colorIndex = Math.max(0, Object.keys(categoryStats).indexOf(primaryCategory)) % TABLE_COLORS.length;
                const tableBgColor = getTableColor(colorIndex);
                const isRound = table.constraints?.tableType !== 'rectangular';

                return (
                  <div key={table.id} className="bg-white dark:bg-surface-dark rounded-xl border border-secondary/20 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition">
                    <div className={`h-2 ${tableBgColor} w-full`}></div>
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3 gap-2">
                        <h4 className="font-bold text-gray-800 dark:text-gray-200">{table.name}</h4>
                        <span className={`text-xs font-medium ${tableBgColor}/20 px-2 py-1 rounded whitespace-nowrap`}>
                          {primaryCategory}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        {table.capacity} Seats • {isRound ? 'Round' : 'Rectangular'} Table
                        {table.zone && ` • ${table.zone}`}
                      </p>
                      <ul className="space-y-1 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-600">
                        {(() => {
                          // Sort guests by group
                          const sortedGuests = [...tableGuests].sort((a: Guest, b: Guest) => {
                            const groupA = a.group_id || 'Other';
                            const groupB = b.group_id || 'Other';
                            return groupA.localeCompare(groupB);
                          });

                          return sortedGuests.map((guest: Guest) => {
                            const guestGroup = guest.group_id || 'Other';
                            const groupColorIndex = Object.keys(categoryStats).indexOf(guestGroup);
                            const bulletColor = getTableColor(Math.max(0, groupColorIndex) % TABLE_COLORS.length);

                            return (
                              <li
                                key={guest.id}
                                className={`text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2 ${guest.importance > 0 ? 'font-bold' : ''} cursor-default`}
                                onMouseEnter={(e) => {
                                  const textSpan = e.currentTarget.querySelector('span.truncate');
                                  const rect = textSpan ? textSpan.getBoundingClientRect() : e.currentTarget.getBoundingClientRect();
                                  setHoveredTooltip({ text: guestGroup, x: rect.right, y: rect.top + (rect.height / 2) });
                                }}
                                onMouseLeave={() => setHoveredTooltip(null)}
                              >
                                <div className={`w-2 h-2 rounded-full ${bulletColor} ${guest.importance > 0 ? 'ring-1 ring-secondary' : ''}`}></div>
                                <span className="truncate">{guest.name}</span>
                              </li>
                            );
                          });
                        })()}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>

            {tables.length > 8 && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setShowAllTables(!showAllTables)}
                  className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-full text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm flex items-center gap-2"
                >
                  {showAllTables ? (
                    <>
                      <span className="material-icons-round text-sm">expand_less</span> Show Less
                    </>
                  ) : (
                    <>
                      <span className="material-icons-round text-sm">expand_more</span> Show All ({tables.length})
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/60 dark:bg-surface-dark/60 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 shadow-lg z-50 animate-slide-up">
        {/* Error Banner - Removed */}
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary">
              <span className="material-icons-round">check_circle</span>
            </div>
            <div>
              <h4 className="font-display text-lg text-text-main dark:text-white">
                Ready to Finalize?
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Export your plan to PDF or print it directly.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">

            <Link
              to="/export"
              className="px-8 py-3 bg-primary text-white rounded-xl font-medium shadow-lg shadow-primary/25 hover:bg-[#777b63] transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
            >
              <span>Confirm & Print</span>
              <span className="material-icons-round">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>
      <div className="h-24"></div> {/* Spacer for bottom bar */}

      {/* Global Tooltip for Guest Groups */}
      {hoveredTooltip && (
        <div
          className="fixed z-[100] px-2 py-1 bg-gray-800 text-white text-xs font-medium rounded shadow-lg pointer-events-none transform -translate-y-1/2 ml-2 whitespace-nowrap"
          style={{ left: hoveredTooltip.x, top: hoveredTooltip.y }}
        >
          {hoveredTooltip.text}
          <div className="absolute top-1/2 right-full -mt-1 border-4 border-transparent border-r-gray-800"></div>
        </div>
      )}
    </div>
  );
};

export default Confirmation;
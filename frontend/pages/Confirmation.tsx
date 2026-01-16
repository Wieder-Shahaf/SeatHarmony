import React, { useState, useMemo, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Link } from 'react-router-dom';
import { useGuests } from '../src/context/GuestContext';
import { Guest } from '../src/types/models';
import { getVisualLayout } from '../src/utils/visualLayouts';

const API_BASE = import.meta.env.VITE_API_BASE || '';

const Confirmation: React.FC = () => {
  const { guests, tables, layouts, selectedLayoutIndex, selectedVenueLayout } = useGuests();
  const [zoom, setZoom] = useState(0.9);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleFit = () => setZoom(0.9);

  const [showAllTables, setShowAllTables] = useState(false);

  const layoutRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!layoutRef.current || !selectedVenueLayout) return;

    try {
      // Temporarily reset zoom for capture
      const currentZoom = zoom;
      setZoom(1);

      // Wait for zoom reset to render
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(layoutRef.current, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`SeatHarmony_Layout_${selectedVenueLayout.name.replace(/\s+/g, '_')}.pdf`);

      // Restore zoom
      setZoom(currentZoom);
    } catch (err) {
      console.error('PDF Export failed:', err);
      alert('Failed to generate PDF. Please try again.');
    }
  };

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

    try {
      const response = await fetch(`${API_BASE}/api/export/excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guests: guests.map(g => ({
            id: g.id,
            name: g.name,
            group_id: g.group_id,
            importance: g.importance,
            tags: g.tags,
          })),
          tables: tables.map(t => ({
            id: t.id,
            name: t.name,
            capacity: t.capacity,
            zone: t.zone,
            constraints: t.constraints,
          })),
          layout: selectedLayout.layout,
          options: {
            include_dietary: true,
            include_vendor_summary: false,
            include_table_details: true,
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
      alert('Failed to export Excel file. Please try again.');
    } finally {
      setIsExportingExcel(false);
    }
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
    <div className="flex-grow w-full bg-background-light dark:bg-background-dark min-h-screen">
      {/* Header */}
      <div className="mb-12 text-center max-w-2xl mx-auto pt-12 text-center">
        <h2 className="font-display text-5xl text-text-main dark:text-white mb-4">Finalize & Export</h2>
        <p className="text-gray-600 dark:text-gray-300 text-lg font-light leading-relaxed">
          Review your final seating arrangement below. When you're ready, export the plan for printing or distribution.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Main Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[max(600px,calc(100vh-250px))]">

          {/* Sidebar Info */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <div className="bg-white/60 dark:bg-surface-dark/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-secondary/20 dark:border-gray-700">
              <h3 className="flex items-center gap-2 font-display text-lg text-text-main dark:text-secondary mb-4">
                <span className="material-icons-round text-secondary">map</span> Groups Legend
              </h3>
              <div className="space-y-3">
                {Object.entries(categoryStats).slice(0, 6).map(([category, count], i) => {
                  const colors = ['bg-slate-400', 'bg-red-300', 'bg-primary', 'bg-secondary', 'bg-amber-400', 'bg-emerald-400'];
                  return (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-4 h-4 rounded-full ${colors[i % colors.length]} block shadow-sm`}></span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[140px]">{category}</span>
                      </div>
                      <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{count} Tables</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white/60 dark:bg-surface-dark/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-secondary/20 dark:border-gray-700 flex-grow flex flex-col">
              <h3 className="flex items-center gap-2 font-display text-lg text-text-main dark:text-secondary mb-4">
                <span className="material-icons-round text-secondary">analytics</span> Summary
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="col-span-2 bg-background-light dark:bg-gray-800 p-4 rounded-xl text-center border border-secondary/10 dark:border-gray-700">
                  <span className="block text-xl font-display text-text-main dark:text-white mb-1">{selectedVenueLayout?.name}</span>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Selected Venue</span>
                </div>
                <div className="bg-background-light dark:bg-gray-800 p-4 rounded-xl text-center border border-secondary/10 dark:border-gray-700">
                  <span className="block text-3xl font-display text-primary font-bold lining-nums">{guests.length}</span>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Guests</span>
                </div>
                <div className="bg-background-light dark:bg-gray-800 p-4 rounded-xl text-center border border-secondary/10 dark:border-gray-700">
                  <span className="block text-3xl font-display text-primary font-bold lining-nums">{tables.length}</span>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Tables</span>
                </div>
              </div>
              <div className="mt-auto">
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Unseated Guests</h4>
                {unseatedCount === 0 ? (
                  <>
                    <div className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg border-none">
                      <span className="material-icons-round text-green-800 dark:text-green-300 text-xl">check_circle</span>
                      <span className="text-sm font-medium text-green-800 dark:text-green-300">Everyone is seated!</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-center">Great job! Everyone has a seat.</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800/30">
                      <span className="material-icons-round text-red-400 text-xl">warning</span>
                      <span className="text-sm text-red-600 dark:text-red-300">{unseatedCount} guests remaining</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-center">Some guests still need seats.</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Large Map View */}
          <div ref={layoutRef} className="lg:col-span-9 bg-white dark:bg-gray-800 rounded-3xl shadow-inner border border-secondary/20 dark:border-gray-700 relative overflow-hidden flex items-center justify-center">
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
              <button onClick={handleZoomIn} className="bg-white dark:bg-gray-700 p-2 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition" title="Zoom In">
                <span className="material-icons-round">add</span>
              </button>
              <button onClick={handleZoomOut} className="bg-white dark:bg-gray-700 p-2 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition" title="Zoom Out">
                <span className="material-icons-round">remove</span>
              </button>
              <button onClick={handleFit} className="bg-white dark:bg-gray-700 p-2 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition" title="Fit to Screen">
                <span className="material-icons-round">aspect_ratio</span>
              </button>
            </div>

            {/* Visual Layout Container */}
            <div
              className="w-full h-full relative transition-transform duration-200 overflow-visible origin-center p-12 flex items-center justify-center"
              style={{
                transform: `scale(${zoom}) translateX(-2%) translateY(2%)`,
                width: '100%',
                height: '100%',
                minHeight: '800px'
              }}
            >
              <div className="relative w-full max-w-[1200px] aspect-[6/5]">
                {/* Visual Features (Bars, Restrooms, etc.) */}
                {visualLayout.features?.map((feature, i) => {
                  const isZone = feature.type === 'zone';
                  return (
                    <div
                      key={`feat-${i}`}
                      className={`absolute flex justify-center
                      ${isZone
                          ? 'items-center pb-0 border-none' // Centered for zones
                          : 'items-center border-2 shadow-sm backdrop-blur-sm'}
                      ${feature.type === 'bar' ? 'bg-amber-100/50 border-amber-400 dark:bg-amber-900/30' :
                          feature.type === 'restroom' ? 'bg-blue-100/50 border-blue-400 dark:bg-blue-900/30' :
                            feature.type === 'zone' && feature.label === 'Garden' ? 'bg-green-50/80 dark:bg-green-900/20' : // Soft natural green
                              feature.type === 'zone' && feature.label === 'Beach' ? 'bg-sky-400/60 dark:bg-sky-900/50' : // Beachy blue
                                feature.type === 'zone' && feature.label === 'Indoor Hall' ? 'bg-slate-200/50 dark:bg-slate-800/30' : // Increased opacity
                                  feature.type === 'canopy' ? 'bg-pink-50/80 border-pink-300 border-dashed dark:bg-pink-900/30' :
                                    feature.type === 'lifeguard' ? 'bg-red-100/80 border-red-500 border-2 dark:bg-red-900/40' :
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
                        className={`uppercase tracking-wider whitespace-nowrap px-1 ${isZone
                          ? 'text-xs md:text-sm font-extrabold text-gray-600 dark:text-gray-400' // Darker and centered
                          : 'text-[10px] font-bold text-gray-700 dark:text-gray-300'}`}
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
                    <span className="text-sm text-indigo-300 dark:text-indigo-400/70 uppercase tracking-widest font-medium whitespace-nowrap">Dance Floor</span>
                  </div>
                )}

                {/* Absolutely Positioned Tables */}
                {tables.map((table, i) => {
                  const tableGuests = guestsByTable[table.id] || [];
                  const primaryCategory = tableGuests.length > 0
                    ? (tableGuests.find(g => g.group_id)?.group_id || 'Mixed')
                    : 'Empty';
                  const colors = ['bg-slate-400', 'bg-red-300', 'bg-primary', 'bg-secondary', 'bg-amber-400', 'bg-emerald-400'];
                  const borderColors = ['border-slate-400', 'border-red-300', 'border-primary', 'border-secondary', 'border-amber-400', 'border-emerald-400'];
                  const colorIndex = Object.keys(categoryStats).indexOf(primaryCategory) % colors.length;
                  const isRound = table.constraints?.tableType !== 'rectangular';

                  // Get position from visual layout, fallback to grid if index exceeds defined positions
                  const position = visualLayout.tables[i] || { x: 50, y: 50, rotation: 0 };

                  // Dynamic sizing for large venues
                  const isLargeVenue = tables.length > 30;
                  const tableSizeClass = isLargeVenue ? 'w-10 h-10' : 'w-16 h-16';
                  const fontSizeClass = isLargeVenue ? 'text-[8px]' : 'text-sm';
                  const badgeSizeClass = isLargeVenue ? 'text-[7px] -bottom-1 -right-1 px-0.5' : 'text-[9px] -bottom-1 -right-1 px-1';

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
                      <div className={`${tableSizeClass} ${isRound ? 'rounded-full' : 'rounded-lg'} ${colors[colorIndex]}/20 dark:${colors[colorIndex]}/10 border-2 ${borderColors[colorIndex]} flex items-center justify-center shadow-md relative backdrop-blur-sm`}>
                        <span className={`font-bold ${fontSizeClass} ${colors[colorIndex].replace('bg-', 'text-').replace('-400', '-500').replace('-300', '-400')}`}>
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

        {/* Detail Rows */}
        <div className="mt-8">
          <h2 className="font-display text-2xl text-text-main dark:text-secondary mb-4">Table Details</h2>
          <div className="max-h-[800px] overflow-y-auto pr-2 -mr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-2">
              {(showAllTables ? tables : tables.slice(0, 8)).map((table, i) => {
                const tableGuests = guestsByTable[table.id] || [];
                const primaryCategory = tableGuests.length > 0
                  ? (tableGuests.find(g => g.group_id)?.group_id || 'Mixed')
                  : 'Empty';
                const colors = ['bg-slate-400', 'bg-red-300', 'bg-primary', 'bg-secondary', 'bg-amber-400', 'bg-emerald-400'];
                const colorIndex = Object.keys(categoryStats).indexOf(primaryCategory) % colors.length;
                const isRound = table.constraints?.tableType !== 'rectangular';

                return (
                  <div key={table.id} className="bg-white dark:bg-surface-dark rounded-xl border border-secondary/20 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition">
                    <div className={`h-2 ${colors[colorIndex]} w-full`}></div>
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3 gap-2">
                        <h4 className="font-bold text-gray-800 dark:text-gray-200">{table.name}</h4>
                        <span className={`text-xs font-medium ${colors[colorIndex]}/20 px-2 py-1 rounded whitespace-nowrap`}>
                          {primaryCategory}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        {table.capacity} Seats • {isRound ? 'Round' : 'Rectangular'} Table
                        {table.zone && ` • ${table.zone}`}
                      </p>
                      <ul className="space-y-1 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-600">
                        {tableGuests.map((guest) => (
                          <li key={guest.id} className={`text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2 ${guest.importance > 0 ? 'font-bold' : ''}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${guest.importance > 0 ? 'bg-secondary' : 'bg-gray-300'}`}></div>
                            <span className="truncate">{guest.name}</span>
                          </li>
                        ))}
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
            <button
              onClick={handleExcelExport}
              disabled={isExportingExcel}
              className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2">
                {isExportingExcel ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="hidden sm:inline">Exporting...</span>
                  </>
                ) : (
                  <>
                    <span className="material-icons-round">description</span>
                    <span className="hidden sm:inline">Export Excel</span>
                  </>
                )}
              </span>
            </button>
            <button
              onClick={handleExportPDF}
              className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <span className="flex items-center gap-2">
                <span className="material-icons-round">picture_as_pdf</span>
                <span className="hidden sm:inline">Export PDF</span>
              </span>
            </button>
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
    </div>
  );
};

export default Confirmation;
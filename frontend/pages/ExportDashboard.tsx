import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useGuests } from '../src/context/GuestContext';
import { getVisualLayout } from '../src/utils/visualLayouts';
import confetti from 'canvas-confetti';

const ExportDashboard: React.FC = () => {
  const { guests, tables, layouts, selectedLayoutIndex, selectedVenueLayout } = useGuests();
  const [showPreview, setShowPreview] = useState(false);
  const iconRef = useRef<HTMLDivElement>(null);

  // Trigger confetti on mount
  useEffect(() => {
    if (iconRef.current) {
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
  }, []);

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
    return getVisualLayout(selectedVenueLayout?.id, tables.length);
  }, [selectedVenueLayout, tables.length]);


  // Handle no data
  if (!selectedLayout || guests.length === 0) {
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
      {/* Visual Dance Floor */}
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
        {!isSmall && <span className="text-sm text-gray-400 uppercase tracking-widest font-light whitespace-nowrap">Dance Floor</span>}
      </div>

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
                 ${isSmall ? 'w-8 h-8' : 'w-16 h-16'} 
                 ${isRound ? 'rounded-full' : 'rounded-lg'} 
                 ${colors[colorIndex]}/20 dark:${colors[colorIndex]}/10 
                 border-2 ${borderColors[colorIndex]} 
                 flex items-center justify-center shadow-md relative backdrop-blur-sm
               `}>
              {!isSmall && (
                <span className={`font-bold text-sm ${colors[colorIndex].replace('bg-', 'text-').replace('-400', '-500').replace('-300', '-400')}`}>
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
    <div className="flex-grow flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-background-light dark:bg-background-dark">
      {/* Decorative Blobs */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-accent opacity-20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse dark:opacity-5"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-secondary opacity-20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000 dark:opacity-5"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-primary opacity-20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-2000 dark:opacity-5"></div>

      <div className="max-w-4xl w-full space-y-8 relative z-10 animate-[fadeInUp_0.8s_ease-out]">
        <div className="bg-white dark:bg-surface-dark shadow-xl rounded-2xl p-10 text-center border border-secondary/20 dark:border-gray-700">
          <div ref={iconRef} className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-green-100 dark:bg-green-900 mb-6 animate-[bounce_1s_infinite]">
            <span className="material-icons-round text-5xl text-primary dark:text-green-300">check_circle</span>
          </div>
          <h2 className="flex items-center justify-center gap-3 font-display text-4xl text-text-main dark:text-gray-100 mb-2">
            <span className="material-icons-round text-primary text-4xl">celebration</span> Seating Plan Optimized!
          </h2>
          <p className="text-lg text-gray-500 dark:text-gray-400 font-light max-w-lg mx-auto">
            Your wedding seating arrangement at {selectedVenueLayout?.name || 'your venue'} has been successfully generated by our AI. Every guest has been placed according to your preferences and harmony rules.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="px-4 py-5 bg-background-light dark:bg-gray-800 shadow rounded-lg overflow-hidden sm:p-6 border border-secondary/30">
              <dt className="flex items-center gap-1 text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                <span className="material-icons-round text-sm">people</span> Total Guests Seated
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-primary dark:text-gray-200">{seatedCount}</dd>
            </div>
            <div className="px-4 py-5 bg-background-light dark:bg-gray-800 shadow rounded-lg overflow-hidden sm:p-6 border border-secondary/30">
              <dt className="flex items-center gap-1 text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                <span className="material-icons-round text-sm">restaurant</span> Tables Filled
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-primary dark:text-gray-200">{tables.length}</dd>
            </div>
            <div className="px-4 py-5 bg-background-light dark:bg-gray-800 shadow rounded-lg overflow-hidden sm:p-6 border border-secondary/30">
              <dt className="flex items-center gap-1 text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                <span className="material-icons-round text-sm">favorite</span> Harmony Score
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-primary dark:text-gray-200">{Math.round(score)}%</dd>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <button className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 transform hover:-translate-y-0.5">
              <span className="material-icons-round mr-2">description</span>
              Download Final Excel
            </button>
            <button className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-primary bg-background-light dark:bg-gray-700 hover:bg-secondary/50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-all duration-200 transform hover:-translate-y-0.5">
              <span className="material-icons-round mr-2">map</span>
              Download PDF Map
            </button>
            <button className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-surface-dark hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200">
              <span className="material-icons-round mr-2">link</span>
              Share Link
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-surface-dark rounded-xl shadow-md p-6 border border-secondary/20 dark:border-gray-700 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="flex items-center gap-2 font-display text-xl text-text-main dark:text-gray-200">
                <span className="material-icons-round text-lg">visibility</span> Floor Plan Preview
              </h3>
              <button onClick={() => setShowPreview(true)} className="text-sm text-primary hover:text-accent font-medium outline-none focus:text-accent">
                View Full Screen
              </button>
            </div>

            {/* Functional Map Preview */}
            <div
              className="bg-gray-50 dark:bg-gray-800 rounded-lg h-56 w-full relative overflow-hidden group cursor-pointer border border-gray-200 dark:border-gray-600 hover:border-primary/50 transition-colors"
              onClick={() => setShowPreview(true)}
            >
              {renderMap(true)}

              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 flex items-center justify-center">
                <div className="bg-white/90 dark:bg-gray-800/90 p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100">
                  <span className="material-icons-round text-primary text-2xl">zoom_in</span>
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {selectedVenueLayout ? (
                <>
                  Venue: <span className="font-semibold">{selectedVenueLayout.name}</span>.
                  Includes {tables.length} tables with capacity for {tables.reduce((sum, t) => sum + t.capacity, 0)} guests.
                </>
              ) : (
                <>Custom venue with {tables.length} tables.</>
              )}
            </p>
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-xl shadow-md p-6 border border-secondary/20 dark:border-gray-700 flex flex-col">
            {/* ... Export Settings content unchanged ... */}
            <h3 className="flex items-center gap-2 font-display text-xl text-text-main dark:text-gray-200 mb-4">
              <span className="material-icons-round text-lg">settings</span> Export Settings
            </h3>
            <div className="space-y-4 flex-grow">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input id="dietary" name="dietary" type="checkbox" defaultChecked className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded" />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="dietary" className="font-medium text-gray-700 dark:text-gray-300">Include Dietary Restrictions</label>
                  <p className="text-gray-500 dark:text-gray-400">Add a column for allergies and preferences in the Excel file.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input id="vendor" name="vendor" type="checkbox" className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded" />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="vendor" className="font-medium text-gray-700 dark:text-gray-300">Vendor Meal Count</label>
                  <p className="text-gray-500 dark:text-gray-400">Generate a separate summary sheet for catering vendors.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input id="print" name="print" type="checkbox" defaultChecked className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded" />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="print" className="font-medium text-gray-700 dark:text-gray-300">High-Res for Printing</label>
                  <p className="text-gray-500 dark:text-gray-400">Ensure PDF map is 300 DPI ready for large format printing.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center pt-8">
          <p className="text-sm text-gray-500 dark:text-gray-400 italic font-display">
            "Love is the master key that opens the gates of happiness."
          </p>
        </div>
      </div>

      {/* Full Screen Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col relative overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-display text-2xl text-text-main dark:text-white">Full Floor Plan Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="material-icons-round text-gray-500 dark:text-gray-400">close</span>
              </button>
            </div>
            <div className="flex-grow relative bg-gray-50 dark:bg-gray-900 p-8 overflow-auto flex items-center justify-center">
              <div className="w-full h-full max-w-4xl max-h-[800px] aspect-[5/4] relative">
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
              <button className="px-5 py-2 rounded-lg bg-primary text-white font-medium hover:bg-opacity-90 shadow-md transition flex items-center gap-2">
                <span className="material-icons-round text-sm">download</span> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportDashboard;
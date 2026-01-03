import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useGuests } from '../src/context/GuestContext';
import { Guest } from '../src/types/models';

const Confirmation: React.FC = () => {
  const { guests, tables, layouts, selectedLayoutIndex, selectedVenueLayout } = useGuests();
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleFit = () => setZoom(1);

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
    <div className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Actions */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wider text-primary dark:text-accent font-bold mb-1">Step 3 of 3</p>
          <h1 className="flex items-center gap-3 font-display text-4xl text-text-main dark:text-secondary mb-2">
            <span className="material-icons-round text-primary text-4xl">check_circle</span> Final Confirmation
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl">
            Review the bird's eye view of your seating arrangement at {selectedVenueLayout?.name || 'your venue'}. Tables are color-coded by group affiliation. Confirm layout to finalize seating charts.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-6 py-2.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium flex items-center gap-2">
            <span className="material-icons-round text-sm">picture_as_pdf</span> Export PDF
          </button>
          <Link to="/export" className="px-6 py-2.5 rounded-full bg-primary hover:bg-opacity-90 text-white shadow-lg shadow-primary/30 transition font-medium flex items-center gap-2">
            <span className="material-icons-round text-sm">print</span> Confirm & Print
          </Link>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-250px)] min-h-[600px]">

        {/* Sidebar Info */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-secondary/20 dark:border-gray-700">
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

          <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-secondary/20 dark:border-gray-700 flex-grow flex flex-col">
            <h3 className="flex items-center gap-2 font-display text-lg text-text-main dark:text-secondary mb-4">
              <span className="material-icons-round text-secondary">analytics</span> Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-background-light dark:bg-gray-800 p-4 rounded-xl text-center border border-secondary/10 dark:border-gray-700">
                <span className="block text-3xl font-display text-primary font-bold">{guests.length}</span>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Guests</span>
              </div>
              <div className="bg-background-light dark:bg-gray-800 p-4 rounded-xl text-center border border-secondary/10 dark:border-gray-700">
                <span className="block text-3xl font-display text-primary font-bold">{tables.length}</span>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Tables</span>
              </div>
            </div>
            <div className="mt-auto">
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Unseated Guests</h4>
              {unseatedCount === 0 ? (
                <>
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800/30">
                    <span className="material-icons-round text-green-400 text-xl">check_circle</span>
                    <span className="text-sm text-green-600 dark:text-green-300">Everyone is seated!</span>
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
        <div className="lg:col-span-9 bg-white dark:bg-gray-800 rounded-3xl shadow-inner border border-secondary/20 dark:border-gray-700 relative overflow-hidden">
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

          <div className="w-full h-full relative pattern-grid transition-transform duration-200 p-8 overflow-auto" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
            {/* Dance Floor */}
            <div className="mx-auto w-40 h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center opacity-50 mb-8">
              <span className="text-sm text-gray-400 uppercase tracking-widest font-light">Dance Floor</span>
            </div>

            {/* Dynamic Tables Grid */}
            <div className="flex flex-wrap justify-center gap-6">
              {tables.map((table, i) => {
                const tableGuests = guestsByTable[table.id] || [];
                const primaryCategory = tableGuests.length > 0 
                  ? (tableGuests.find(g => g.group_id)?.group_id || 'Mixed')
                  : 'Empty';
                const colors = ['bg-slate-400', 'bg-red-300', 'bg-primary', 'bg-secondary', 'bg-amber-400', 'bg-emerald-400'];
                const borderColors = ['border-slate-400', 'border-red-300', 'border-primary', 'border-secondary', 'border-amber-400', 'border-emerald-400'];
                const colorIndex = Object.keys(categoryStats).indexOf(primaryCategory) % colors.length;
                const isRound = table.constraints?.tableType !== 'rectangular';

                return (
                  <div key={table.id} className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform">
                    <div className={`w-20 h-20 ${isRound ? 'rounded-full' : 'rounded-xl'} ${colors[colorIndex]}/20 dark:${colors[colorIndex]}/10 border-2 ${borderColors[colorIndex]} flex items-center justify-center shadow-md relative`}>
                      <span className={`font-bold text-lg ${colors[colorIndex].replace('bg-', 'text-').replace('-400', '-500').replace('-300', '-400')}`}>
                        {table.name.replace('Table ', '')}
                      </span>
                      <span className="absolute -bottom-1 -right-1 text-[10px] bg-white dark:bg-gray-700 px-1.5 rounded-full shadow text-gray-500">
                        {tableGuests.length}/{table.capacity}
                      </span>
                    </div>
                    <div className="mt-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 max-w-[80px] truncate">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tables.slice(0, 8).map((table, i) => {
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
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-bold text-gray-800 dark:text-gray-200">{table.name}</h4>
                    <span className={`text-xs font-medium ${colors[colorIndex]}/20 px-2 py-1 rounded truncate max-w-[80px]`}>
                      {primaryCategory}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    {table.capacity} Seats • {isRound ? 'Round' : 'Rectangular'} Table
                    {table.zone && ` • ${table.zone}`}
                  </p>
                  <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {tableGuests.slice(0, 6).map((guest) => (
                      <li key={guest.id} className={`text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2 ${guest.importance > 0 ? 'font-bold' : ''}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${guest.importance > 0 ? 'bg-secondary' : 'bg-gray-300'}`}></div>
                        <span className="truncate">{guest.name}</span>
                      </li>
                    ))}
                    {tableGuests.length > 6 && (
                      <li className="text-xs text-gray-400 italic">+{tableGuests.length - 6} more...</li>
                    )}
                    {tableGuests.length === 0 && (
                      <li className="text-xs text-gray-400 italic">No guests assigned</li>
                    )}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
        
        {tables.length > 8 && (
          <p className="text-center text-sm text-gray-400 mt-4">
            Showing first 8 tables. {tables.length - 8} more tables available.
          </p>
        )}
      </div>
    </div>
  );
};

export default Confirmation;
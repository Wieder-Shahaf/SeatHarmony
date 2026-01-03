import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGuests } from '../src/context/GuestContext';
import { Guest, Table } from '../src/types/models';

const API_BASE = import.meta.env.VITE_API_BASE || '';

// Guest explanation cache
type ExplanationCache = Record<string, string>;

const PlannerAI: React.FC = () => {
  const navigate = useNavigate();
  const {
    guests,
    tables,
    selectedVenueLayout,
    layouts,
    selectedLayoutIndex,
  } = useGuests();

  const [zoom, setZoom] = useState(1);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [explanations, setExplanations] = useState<ExplanationCache>({});
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Get the selected layout
  const selectedLayout = layouts[selectedLayoutIndex] || null;
  const assignments = selectedLayout?.layout?.assignments || {};
  const weights = selectedLayout?.weights || {};

  // Group guests by table based on assignments
  const guestsByTable = useMemo(() => {
    const result: Record<string, Guest[]> = {};
    
    // Initialize all tables with empty arrays
    tables.forEach(t => {
      result[t.id] = [];
    });
    
    // Assign guests to their tables
    guests.forEach(guest => {
      const tableId = assignments[guest.id];
      if (tableId && result[tableId]) {
        result[tableId].push(guest);
      }
    });
    
    return result;
  }, [guests, tables, assignments]);

  // Get unseated guests
  const unseatedGuests = useMemo(() => {
    return guests.filter(g => !assignments[g.id]);
  }, [guests, assignments]);

  // Fetch explanation for a guest
  const fetchExplanation = async (guestId: string) => {
    if (explanations[guestId] || !selectedLayout) return;
    
    setLoadingExplanation(true);
    try {
      const response = await fetch(`${API_BASE}/api/layouts/explain-guests`, {
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
          weights: selectedLayout.weights,
          notes: selectedLayout.notes,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setExplanations(prev => ({ ...prev, ...data.explanations }));
      }
    } catch (err) {
      console.error('Failed to fetch explanation:', err);
    } finally {
      setLoadingExplanation(false);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));

  // When guest is selected, fetch explanation
  useEffect(() => {
    if (selectedGuestId && !explanations[selectedGuestId]) {
      fetchExplanation(selectedGuestId);
    }
  }, [selectedGuestId]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPanning) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - panPosition.x, y: e.clientY - panPosition.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Get unique categories for filter buttons
  const categories = useMemo(() => {
    const cats = new Set<string>();
    guests.forEach(g => {
      if (g.group_id) cats.add(g.group_id);
    });
    return Array.from(cats);
  }, [guests]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // Filter sidebar guests
  const filteredGuests = useMemo(() => {
    return guests.filter(g => {
      const matchesSearch = !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !filterCategory || g.group_id === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [guests, searchQuery, filterCategory]);

  // Get guest initials
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Handle no data
  if (!selectedLayout || guests.length === 0) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="text-center py-16">
          <span className="material-icons-round text-6xl text-gray-300 dark:text-gray-600 mb-4">table_restaurant</span>
          <h2 className="font-display text-2xl text-text-main dark:text-white mb-4">No Layout Selected</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please generate recommendations first to view the seating plan.
          </p>
          <Link to="/recommendations" className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-[#777b63] transition-colors">
            Generate Recommendations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-white dark:bg-surface-dark border-r border-secondary/30 dark:border-gray-700 flex flex-col z-10 shadow-soft">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="flex items-center gap-2 font-display text-lg text-text-main dark:text-secondary mb-4">
            <span className="material-icons-round text-primary">list_alt</span> Guest List ({guests.length})
          </h2>
          <div className="relative">
            <span className="material-icons-round absolute left-3 top-2.5 text-gray-400 text-sm">search</span>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background-light dark:bg-gray-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/50 text-gray-700 dark:text-gray-200 placeholder-gray-400" 
              placeholder="Find a guest..." 
            />
          </div>
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
            <button 
              onClick={() => setFilterCategory(null)}
              className={`flex items-center gap-1 px-3 py-1 text-xs rounded-full whitespace-nowrap ${
                !filterCategory ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All ({guests.length})
            </button>
            {unseatedGuests.length > 0 && (
              <button className="flex items-center gap-1 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs rounded-full whitespace-nowrap">
                <span className="material-icons-round text-[10px]">hourglass_empty</span> Unseated ({unseatedGuests.length})
              </button>
            )}
            {categories.slice(0, 3).map(cat => (
              <button 
                key={cat}
                onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
                className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${
                  filterCategory === cat ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredGuests.map(guest => {
            const tableId = assignments[guest.id];
            const table = tables.find(t => t.id === tableId);
            const isSelected = selectedGuestId === guest.id;
            
            return (
              <div 
                key={guest.id}
                onClick={() => setSelectedGuestId(isSelected ? null : guest.id)}
                className={`group bg-background-light dark:bg-gray-800 p-3 rounded-lg border shadow-sm cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : 'border-gray-100 dark:border-gray-700 hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    tableId ? 'bg-primary/20 text-primary' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}>
                    {getInitials(guest.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {guest.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {guest.group_id || 'No category'} {table && `• ${table.name}`}
                    </p>
                  </div>
                  {guest.importance > 0 && (
                    <div className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center" title="VIP">
                      <span className="material-icons-round text-yellow-500 text-xs">star</span>
                    </div>
                  )}
                </div>
                
                {/* Explanation tooltip */}
                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-icons-round text-primary text-sm">auto_awesome</span>
                      <span className="text-xs font-bold text-primary">AI Insight</span>
                    </div>
                    {loadingExplanation ? (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <span className="material-icons-round animate-spin text-xs">progress_activity</span>
                        Loading...
                      </p>
                    ) : explanations[guest.id] ? (
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                        {explanations[guest.id]}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Click to load explanation</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Canvas */}
      <main
        className={`flex-1 bg-background-lighter dark:bg-background-dark pattern-grid relative overflow-hidden ${isPanning ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Floating Toolbar */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-white dark:bg-surface-dark px-2 py-1.5 rounded-xl shadow-lg flex items-center gap-2 border border-secondary/20 dark:border-gray-700 z-30">
          <button onClick={handleZoomOut} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-colors" title="Zoom Out">
            <span className="material-icons-round text-xl">remove</span>
          </button>
          <span className="text-xs font-mono text-gray-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-colors" title="Zoom In">
            <span className="material-icons-round text-xl">add</span>
          </button>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1"></div>
          <button
            className={`p-2 rounded-lg transition-colors ${!isPanning ? 'text-primary bg-primary/10' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            onClick={() => setIsPanning(false)}
            title="Select Tool"
          >
            <span className="material-icons-round text-xl">near_me</span>
          </button>
          <button
            className={`p-2 rounded-lg transition-colors ${isPanning ? 'text-primary bg-primary/10' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            onClick={() => setIsPanning(true)}
            title="Pan Tool"
          >
            <span className="material-icons-round text-xl">hand_gesture</span>
          </button>
          
          {/* Venue info */}
          {selectedVenueLayout && (
            <>
              <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1"></div>
              <div className="flex items-center gap-2 px-2">
                <span className="material-icons-round text-primary text-sm">{selectedVenueLayout.icon || 'location_on'}</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">{selectedVenueLayout.name}</span>
              </div>
            </>
          )}
        </div>

        {/* Canvas Area - Dynamic Tables */}
        <div
          className="absolute top-0 left-0 w-full h-full flex items-start justify-center p-20 pt-24 origin-center transition-transform duration-75 ease-linear overflow-auto"
          style={{ transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoom})` }}
        >
          <div className="flex flex-wrap justify-center gap-8 max-w-6xl">
            {tables.map((table, tableIndex) => {
              const tableGuests = guestsByTable[table.id] || [];
              const isRound = table.constraints?.tableType !== 'rectangular';
              const capacity = table.capacity;
              const tableSize = Math.max(120, 80 + capacity * 8);
              
              return (
                <div 
                  key={table.id}
                  className="relative flex flex-col items-center"
                >
                  {/* Table */}
                  <div 
                    className={`bg-white dark:bg-gray-800 border-4 shadow-lg flex flex-col items-center justify-center relative group ${
                      isRound ? 'rounded-full' : 'rounded-xl'
                    } ${tableIndex === 0 ? 'border-primary/40 dark:border-primary/20' : 'border-secondary/50 dark:border-gray-600'}`}
                    style={{ 
                      width: tableSize, 
                      height: isRound ? tableSize : tableSize * 0.6,
                    }}
                  >
                    <span className={`font-display text-text-main dark:text-secondary ${tableIndex === 0 ? 'text-3xl' : 'text-xl'}`}>
                      {table.name.replace('Table ', '')}
                    </span>
                    {tableIndex === 0 && (
                      <span className="text-xs uppercase tracking-widest text-gray-400">Head Table</span>
                    )}
                    <span className="text-xs text-gray-400 mt-1">
                      {tableGuests.length}/{capacity}
                    </span>
                    {table.zone && (
                      <span className="text-[10px] text-gray-300 dark:text-gray-600">{table.zone}</span>
                    )}
                  </div>

                  {/* Guest seats around table */}
                  <div className="flex flex-wrap justify-center gap-1 mt-2 max-w-[200px]">
                    {tableGuests.map((guest, guestIndex) => {
                      const isSelectedGuest = selectedGuestId === guest.id;
                      return (
                        <div
                          key={guest.id}
                          onClick={() => setSelectedGuestId(isSelectedGuest ? null : guest.id)}
                          className={`relative cursor-pointer transition-all ${isSelectedGuest ? 'scale-110 z-10' : 'hover:scale-105'}`}
                          title={`${guest.name} (${guest.group_id || 'No category'})`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-sm border-2 ${
                            isSelectedGuest 
                              ? 'bg-primary text-white border-white ring-4 ring-primary/20' 
                              : guest.importance > 0
                                ? 'bg-accent text-white border-white'
                                : 'bg-primary/80 text-white border-white/50'
                          }`}>
                            {getInitials(guest.name)}
                          </div>
                          
                          {/* Popup explanation */}
                          {isSelectedGuest && explanations[guest.id] && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 z-50">
                              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-primary/20 dark:border-gray-600 p-3">
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-800 border-b border-r border-primary/20 dark:border-gray-600 rotate-45"></div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="material-icons-round text-primary text-sm">auto_awesome</span>
                                  <span className="text-xs font-bold text-primary">AI Insight</span>
                                </div>
                                <p className="text-xs font-semibold text-gray-800 dark:text-white mb-1">{guest.name}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                  {explanations[guest.id]}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Empty seats */}
                    {Array.from({ length: Math.max(0, capacity - tableGuests.length) }).map((_, i) => (
                      <div key={`empty-${i}`} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600"></div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-6 right-6 bg-white dark:bg-surface-dark p-3 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 z-20 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary"></div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Seated</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-dashed border-gray-400"></div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Empty</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent"></div>
            <span className="text-xs text-gray-500 dark:text-gray-400">VIP</span>
          </div>
        </div>

        {/* Layout info */}
        <div className="absolute bottom-6 left-6 bg-white dark:bg-surface-dark p-3 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 z-20">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Layout Score</div>
          <div className="text-lg font-bold text-primary">{Math.round(selectedLayout.layout.score || selectedLayout.value)}/100</div>
          {selectedLayout.notes && (
            <div className="text-[10px] text-gray-400 mt-1 max-w-[150px] truncate" title={selectedLayout.notes}>
              {selectedLayout.notes}
            </div>
          )}
        </div>

        {/* Continue button */}
        <div className="absolute top-6 right-6 z-30">
          <Link
            to="/confirmation"
            className="px-4 py-2 bg-primary hover:bg-[#777b63] text-white rounded-lg font-medium transition-colors shadow-lg flex items-center gap-2"
          >
            Continue to Export
            <span className="material-icons-round text-sm">arrow_forward</span>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default PlannerAI;
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGuests } from '../src/context/GuestContext';
import { Guest, Table } from '../src/types/models';

const API_BASE = import.meta.env.VITE_API_BASE || '';

// Color palette for groups (elegant, sophisticated colors that complement the UI theme)
const GROUP_COLORS = [
  { bg: '#8A8E75', name: 'Sage Green' },        // Primary - sage green
  { bg: '#68604D', name: 'Dark Brown' },        // Text-main - dark brown
  { bg: '#D5C7AD', name: 'Light Beige' },       // Secondary - light beige
  { bg: '#BEC5A4', name: 'Light Sage' },        // Accent - light sage
  { bg: '#A67C7C', name: 'Dusty Rose' },        // Muted rose
  { bg: '#7A8B8B', name: 'Slate Blue' },        // Muted blue-grey
  { bg: '#B8A082', name: 'Warm Taupe' },        // Warm taupe
  { bg: '#8B9A7A', name: 'Olive Green' },        // Olive green
  { bg: '#9B8B7A', name: 'Muted Terracotta' },   // Muted terracotta
  { bg: '#7B8A9B', name: 'Steel Blue' },        // Steel blue
  { bg: '#C4A88A', name: 'Sandy Beige' },       // Sandy beige
  { bg: '#6B7A6B', name: 'Forest Green' },       // Forest green
  { bg: '#A89B8C', name: 'Warm Grey' },         // Warm grey
  { bg: '#8B7A9B', name: 'Lavender Grey' },      // Lavender grey
  { bg: '#9B7A7A', name: 'Muted Mauve' },       // Muted mauve
  { bg: '#7A9B8B', name: 'Teal Green' },         // Teal green
  { bg: '#B89B7A', name: 'Golden Beige' },      // Golden beige
  { bg: '#8B8A7A', name: 'Sage Grey' },          // Sage grey
];

// Get color for a group
const getGroupColor = (groupIndex: number): string => {
  return GROUP_COLORS[groupIndex % GROUP_COLORS.length].bg;
};

// Animated ellipsis component for loading states
const AnimatedEllipsis: React.FC = () => {
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <span
        className="inline-block"
        style={{
          animation: 'bounce-dot 1.2s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite',
          animationDelay: '0s'
        }}
      >.</span>
      <span
        className="inline-block"
        style={{
          animation: 'bounce-dot 1.2s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite',
          animationDelay: '0.2s'
        }}
      >.</span>
      <span
        className="inline-block"
        style={{
          animation: 'bounce-dot 1.2s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite',
          animationDelay: '0.4s'
        }}
      >.</span>
    </span>
  );
};

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
    updateGuestAssignment,
    explanations,
    fetchExplanationsForTables,
    originalLayout,
    saveOriginalLayout,
    restoreOriginalLayout,
  } = useGuests();

  // Placeholder if no venue selected
  if (!selectedVenueLayout) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[60vh]">
        <div className="text-center py-16 px-4">
          <span className="material-icons-round text-6xl text-gray-300 dark:text-gray-600 mb-4">storefront</span>
          <h2 className="font-display text-2xl text-text-main dark:text-white mb-4">Select a Venue</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            The AI Planner needs a venue layout to organize your seating effectively.
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

  const [zoom, setZoom] = useState(1);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [capacityError, setCapacityError] = useState<string | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [holdingGuestId, setHoldingGuestId] = useState<string | null>(null);
  const [holdingGuestOriginalTableId, setHoldingGuestOriginalTableId] = useState<string | null>(null);
  const guestRefs = React.useRef<{ [key: string]: HTMLDivElement | null }>({});
  const tableRefs = React.useRef<{ [key: string]: HTMLDivElement | null }>({});


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

  // Find guests seated alone without their group members
  const lonelyGuests = useMemo(() => {
    const lonely: Guest[] = [];

    tables.forEach(table => {
      const tableGuests = guestsByTable[table.id] || [];
      const guestsByGroup: Record<string, number> = {};

      // Count group members at this table
      tableGuests.forEach(g => {
        if (g.group_id) {
          guestsByGroup[g.group_id] = (guestsByGroup[g.group_id] || 0) + 1;
        }
      });

      // Find guests whose group count is 1 (themselves only)
      tableGuests.forEach(g => {
        if (g.group_id && guestsByGroup[g.group_id] === 1) {
          lonely.push(g);
        }
      });
    });

    return lonely;
  }, [guestsByTable, tables]);

  const [showLonelyGuests, setShowLonelyGuests] = useState(false);
  const [showLonelyAlertBubble, setShowLonelyAlertBubble] = useState(false);

  // Track if we've already shown the alert to avoid spamming
  const hasShownLonelyAlertRef = React.useRef(false);

  // Show alert bubble when lonely guests are detected (only once)
  useEffect(() => {
    if (lonelyGuests.length > 0 && !hasShownLonelyAlertRef.current) {
      setShowLonelyAlertBubble(true);
      hasShownLonelyAlertRef.current = true;
    }
  }, [lonelyGuests.length]);

  // Auto-hide alert bubble
  useEffect(() => {
    if (showLonelyAlertBubble) {
      const timer = setTimeout(() => setShowLonelyAlertBubble(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showLonelyAlertBubble]);

  // Get unseated guests
  const unseatedGuests = useMemo(() => {
    return guests.filter(g => !assignments[g.id]);
  }, [guests, assignments]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));

  // Handle guest movement between tables
  const handleGuestMove = (guestId: string, newTableId: string) => {
    // Get the old table ID before the move
    const oldTableId = assignments[guestId];

    // Check if moving to a different table
    if (oldTableId === newTableId) {
      return; // No change needed
    }

    // Find the target table
    const targetTable = tables.find(t => t.id === newTableId);
    if (!targetTable) {
      return;
    }

    // Count current guests at the target table
    const currentGuestsAtTable = guestsByTable[newTableId] || [];

    // Check if table is already at capacity
    // Note: We don't need to subtract the guest being moved because:
    // - If they're moving FROM another table TO this table, currentGuestsAtTable doesn't include them yet
    // - If they're already at this table, we return early above
    if (currentGuestsAtTable.length >= targetTable.capacity) {
      setCapacityError(`Table ${targetTable.name.replace('Table ', '')} is full (${targetTable.capacity}/${targetTable.capacity} seats)`);
      setTimeout(() => setCapacityError(null), 3000); // Clear error after 3 seconds
      return;
    }

    // Clear any previous errors
    setCapacityError(null);

    // Update the assignment
    updateGuestAssignment(guestId, newTableId);

    // Refresh explanations for affected tables after a short delay
    // (to allow state to update)
    setTimeout(() => {
      const tablesToRefresh: string[] = [];
      if (oldTableId && oldTableId !== newTableId) {
        tablesToRefresh.push(oldTableId);
      }
      if (newTableId) {
        tablesToRefresh.push(newTableId);
      }

      if (tablesToRefresh.length > 0) {
        fetchExplanationsForTables(tablesToRefresh);
      }
    }, 200);
  };

  // Scroll to guest in sidebar when selected
  useEffect(() => {
    if (selectedGuestId && guestRefs.current[selectedGuestId]) {
      guestRefs.current[selectedGuestId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [selectedGuestId]);

  // Clear holding guest if they get assigned to a table (dropped elsewhere)
  useEffect(() => {
    if (holdingGuestId && assignments[holdingGuestId]) {
      setHoldingGuestId(null);
      setHoldingGuestOriginalTableId(null);
    }
  }, [assignments, holdingGuestId]);

  const holdingGuest = useMemo(() =>
    holdingGuestId ? guests.find(g => g.id === holdingGuestId) : null
    , [holdingGuestId, guests]);

  // Close lonely guests popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click target is inside the popover or the toggle button
      const target = event.target as HTMLElement;
      if (showLonelyGuests && !target.closest('.lonely-guests-popover') && !target.closest('.lonely-guests-toggle')) {
        setShowLonelyGuests(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLonelyGuests]);

  // Save original layout when first entering PlannerAI if not already saved
  // This ensures we have a backup even if user navigated directly to PlannerAI
  useEffect(() => {
    if (selectedLayout && selectedLayoutIndex >= 0 && !originalLayout && layouts.length > 0) {
      console.log('Saving original layout on PlannerAI mount (fallback)', { selectedLayoutIndex, hasLayout: !!selectedLayout });
      // Use setTimeout to ensure layouts state is fully loaded
      setTimeout(() => {
        saveOriginalLayout();
      }, 100);
    }
  }, [selectedLayout, selectedLayoutIndex, originalLayout, layouts.length, saveOriginalLayout]);



  // Get unique categories for filter buttons
  const categories = useMemo(() => {
    const cats = new Set<string>();
    guests.forEach(g => {
      if (g.group_id) cats.add(g.group_id);
    });
    return Array.from(cats);
  }, [guests]);

  // Create group color mapping
  const groupColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((group, index) => {
      map[group] = getGroupColor(index);
    });
    return map;
  }, [categories]);

  // Get color for a guest based on their group
  const getGuestColor = (guest: Guest): string => {
    if (!guest.group_id) return '#8A8E75'; // Default primary color for ungrouped guests
    return groupColorMap[guest.group_id] || '#8A8E75';
  };

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
      <aside className="w-80 bg-white/60 dark:bg-surface-dark/60 backdrop-blur-md border-r border-secondary/30 dark:border-gray-700 flex flex-col z-10 shadow-soft">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="flex items-center gap-2 font-display text-2xl font-light tracking-wide text-text-main dark:text-secondary mb-6">
            <span className="material-icons-round text-primary/80">list_alt</span> Guest List
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
              className={`flex items-center gap-1 px-3 py-1 text-xs rounded-full whitespace-nowrap ${!filterCategory ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            >
              All ({guests.length})
            </button>
            {unseatedGuests.length > 0 && (
              <button className="flex items-center gap-1 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs rounded-full whitespace-nowrap">
                <span className="material-icons-round text-[10px]">hourglass_empty</span> Unseated ({unseatedGuests.length})
              </button>
            )}
            {categories.map((cat, index) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
                className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-all ${filterCategory === cat
                  ? 'text-white shadow-md'
                  : 'text-white hover:opacity-90'
                  }`}
                style={{
                  backgroundColor: filterCategory === cat
                    ? groupColorMap[cat] || getGroupColor(index)
                    : groupColorMap[cat] || getGroupColor(index),
                  opacity: filterCategory === cat ? 1 : 0.8
                }}
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
                ref={el => guestRefs.current[guest.id] = el}
                onClick={() => setSelectedGuestId(isSelected ? null : guest.id)}
                className={`group bg-background-light dark:bg-gray-800 p-3 rounded-lg border shadow-sm cursor-pointer transition-all ${isSelected
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-gray-100 dark:border-gray-700 hover:border-primary/50'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${tableId ? '' : 'opacity-50'}`}
                    style={{ backgroundColor: tableId ? getGuestColor(guest) : '#9ca3af' }}
                  >
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
                    {explanations[guest.id] ? (
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                        {explanations[guest.id]}
                      </p>
                    ) : (
                      <p className="text-xs text-primary flex items-center gap-1">
                        <span className="material-icons-round animate-spin text-xs">progress_activity</span>
                        <span className="absolute">Generating insight<AnimatedEllipsis /></span>
                      </p>
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
        className="flex-1 bg-background-lighter dark:bg-background-dark pattern-grid relative overflow-auto cursor-default"
        onClick={() => setSelectedGuestId(null)}
      >


        {/* Floating Toolbar */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-white/60 dark:bg-surface-dark/60 backdrop-blur-md px-2 py-1.5 rounded-xl shadow-lg flex items-center gap-2 border border-secondary/20 dark:border-gray-700 z-30">
          <button onClick={handleZoomOut} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-colors" title="Zoom Out">
            <span className="material-icons-round text-xl">remove</span>
          </button>
          <span className="text-xs font-mono text-gray-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-colors" title="Zoom In">
            <span className="material-icons-round text-xl">add</span>
          </button>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1"></div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
              <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">Seated</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-dashed border-gray-400"></div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Empty</span>
            </div>
          </div>



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

        {/* Capacity Error Toast */}
        {capacityError && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 shadow-lg flex items-center gap-3">
              <span className="material-icons-round text-red-500 text-xl">error_outline</span>
              <span className="text-sm text-red-700 dark:text-red-300 font-medium">{capacityError}</span>
            </div>
          </div>
        )}

        {/* Canvas Area - Dynamic Tables */}
        <div
          className="w-full min-h-full flex items-start justify-center p-20 pt-32 origin-top transition-transform duration-200 ease-out"
          style={{ transform: `scale(${zoom})` }}
        >
          <div className="flex flex-wrap justify-center gap-8 max-w-6xl">
            {tables.map((table, tableIndex) => {
              const tableGuests = guestsByTable[table.id] || [];
              const isRound = table.constraints?.tableType !== 'rectangular';
              const capacity = table.capacity;
              const tableSize = Math.max(120, 80 + capacity * 8);
              const isFull = tableGuests.length >= capacity;

              return (
                <div
                  key={table.id}
                  ref={el => tableRefs.current[table.id] = el}
                  className="relative flex flex-col items-center"
                  onDragOver={(e) => {
                    e.preventDefault();
                    // Only allow drop if table is not full
                    if (!isFull) {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.dataTransfer.dropEffect = 'move';
                    } else {
                      e.dataTransfer.dropEffect = 'none';
                    }
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.transform = 'scale(1)';
                    const guestId = e.dataTransfer.getData('guestId');
                    if (guestId && !isFull) {
                      handleGuestMove(guestId, table.id);
                    }
                  }}
                >
                  {/* Table */}
                  <div
                    className={`bg-white dark:bg-gray-800 border-4 shadow-lg flex flex-col items-center justify-center relative group ${isRound ? 'rounded-full' : 'rounded-xl'
                      } ${tableIndex === 0 ? 'border-primary/40 dark:border-primary/20' : 'border-secondary/50 dark:border-gray-600'} ${isFull ? 'opacity-75' : ''}`}
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
                    <span className={`text-xs mt-1 ${isFull ? 'text-red-300 dark:text-red-400' : 'text-gray-400'}`}>
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGuestId(isSelectedGuest ? null : guest.id);
                          }}
                          className={`relative cursor-pointer transition-all ${isSelectedGuest ? 'scale-110 z-[100]' : 'hover:scale-105'}`}
                          title={`${guest.name} (${guest.group_id || 'No category'})`}
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-sm border-2 transition-transform duration-200 text-white ${isSelectedGuest
                              ? 'border-white ring-4 ring-primary/20'
                              : 'border-white/50'
                              }`}
                            style={{ backgroundColor: getGuestColor(guest) }}
                            draggable
                            onDragStart={(e) => {
                              if (isSelectedGuest) setSelectedGuestId(null);
                              e.dataTransfer.setData('guestId', guest.id);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                          >
                            {getInitials(guest.name)}
                          </div>

                          {/* Popup explanation */}
                          {isSelectedGuest && (
                            <div
                              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[9999] cursor-default"
                              style={{ width: '256px' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-primary/20 dark:border-gray-600 p-4 relative z-[9999]">
                                {/* Arrow */}
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-800 border-b border-r border-primary/20 dark:border-gray-600 rotate-45"></div>
                                {/* Header */}
                                <div className="flex items-center gap-2 mb-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                                  <span className="material-icons-round text-primary text-sm">auto_awesome</span>
                                  <span className="text-xs font-bold text-primary">AI Insight</span>
                                </div>
                                {/* Guest name */}
                                <p className="text-sm font-semibold text-gray-800 dark:text-white mb-2">{guest.name}</p>
                                {/* Content - Loading or explanation */}
                                {explanations[guest.id] ? (
                                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                    {explanations[guest.id]}
                                  </p>
                                ) : (
                                  <p className="text-xs text-primary flex items-center gap-1">
                                    <span className="material-icons-round animate-spin text-sm">progress_activity</span>
                                    <span className="absolute">Generating insight<AnimatedEllipsis /></span>
                                  </p>
                                )}
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



        {/* Restore Layout Confirmation Modal */}
        {showRestoreModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-8 relative animate-slide-up">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-icons-round text-primary text-3xl">refresh</span>
                </div>
              </div>

              <h3 className="font-display text-2xl text-text-main dark:text-white text-center mb-4">
                Restore Recommendation Layout
              </h3>

              <p className="text-gray-600 dark:text-gray-300 text-center mb-8 leading-relaxed">
                Your guest layout will be switched back to the SeatHarmony-recommended layout.
                Any manual changes you've made will be replaced with the original AI-optimized seating arrangement.
              </p>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowRestoreModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    console.log('Restore button clicked', {
                      originalLayout: !!originalLayout,
                      selectedLayoutIndex,
                      currentLayout: !!selectedLayout,
                      originalAssignmentsCount: originalLayout ? Object.keys(originalLayout.layout.assignments).length : 0
                    });

                    if (!originalLayout) {
                      console.warn('No original layout saved');
                      alert('No original layout found. Please select a layout from the Recommendations page first.');
                      setShowRestoreModal(false);
                      return;
                    }

                    // Restore the layout
                    const success = restoreOriginalLayout();
                    console.log('Restore result:', success);

                    if (success) {
                      setShowRestoreModal(false);
                      // Force a small delay to ensure state updates propagate
                      setTimeout(() => {
                        fetchExplanationsForTables(tables.map(t => t.id));
                        // Force React to re-render by updating a dummy state if needed
                        console.log('Layout restored, refreshing explanations');
                      }, 300);
                    } else {
                      console.error('Failed to restore layout');
                      alert('Unable to restore the original layout. Please try again.');
                    }
                  }}
                  className="flex-1 px-6 py-3 rounded-xl bg-primary hover:bg-[#777b63] text-white font-medium transition-colors shadow-md"
                >
                  Restore Layout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sticky Bottom Bar */}
        {/* Sticky Bottom Bar */}
        <div className="fixed bottom-0 left-80 right-0 bg-white/60 dark:bg-surface-dark/60 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 shadow-lg z-50 animate-slide-up py-4">

          {/* Layer 1: Ghost Container for Centered Alignment (Buttons) - Spans full screen */}
          <div className="absolute inset-0 w-screen -ml-80 pointer-events-none flex justify-center">
            <div className="w-full max-w-7xl px-6 flex items-center justify-end h-full">
              <div className="flex items-center gap-3 pointer-events-auto">
                {/* Reset Layout Button */}
                {selectedLayout && (
                  <button
                    onClick={() => {
                      if (!originalLayout) {
                        saveOriginalLayout();
                      }
                      setShowRestoreModal(true);
                    }}
                    className="px-6 h-12 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl font-medium transition-all flex items-center gap-2 shadow-sm"
                  >
                    <span className="material-icons-round text-lg">refresh</span>
                    <span className="text-sm font-medium">Reset Layout</span>
                  </button>
                )}
                {holdingGuestId ? (
                  <button
                    disabled
                    title="Please seat the guest in the holding zone before continuing"
                    className="px-8 py-3 bg-gray-400 text-white rounded-xl font-medium cursor-not-allowed flex items-center gap-2 shadow-none"
                  >
                    <span>Continue to Final Review</span>
                    <span className="material-icons-round text-sm">arrow_forward</span>
                  </button>
                ) : (
                  <Link
                    to="/confirmation"
                    className="px-8 py-3 bg-primary hover:bg-[#777b63] text-white rounded-xl font-medium transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                  >
                    <span>Continue to Final Review</span>
                    <span className="material-icons-round text-sm">arrow_forward</span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Layer 2: Standard Content (Left Side) - Respects sidebar offset */}
          <div className="h-full px-6 flex items-center">
            <div className="flex items-center gap-4">
              {/* Left side content (optional) */}
              <div className="hidden md:flex items-center gap-2">
                <span className="material-icons-round text-primary text-xl">event_seat</span>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Arranging <strong>{guests.length} guests</strong> across <strong>{tables.length} tables</strong>
                </span>

                {/* Lonely Guests Alert */}
                {lonelyGuests.length > 0 && (
                  <div className="relative ml-2">
                    <button
                      onClick={() => setShowLonelyGuests(!showLonelyGuests)}
                      className={`lonely-guests-toggle flex items-center gap-2 px-3 h-10 rounded-lg transition-all ${showLonelyGuests
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-amber-600'
                        }`}
                      title={`${lonelyGuests.length} guests seated without their group`}
                    >
                      <div className="relative">
                        <span className="material-icons-round text-xl">group_off</span>
                        <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800 ${showLonelyGuests ? 'bg-amber-600' : 'bg-red-500 animate-pulse'
                          }`}></span>
                      </div>
                    </button>

                    {/* Red Cloud Bubble Alert - Temporary */}
                    {showLonelyAlertBubble && (
                      <div className="absolute bottom-full left-0 mb-3 bg-red-500 text-white px-4 py-2 rounded-xl shadow-xl z-[60] animate-bounce w-max flex items-center gap-2">
                        <div className="absolute -bottom-1.5 left-6 w-3 h-3 bg-red-500 rotate-45"></div>
                        <span className="material-icons-round text-sm">priority_high</span>
                        <span className="text-xs font-bold whitespace-nowrap">Attention: {lonelyGuests.length} guests seated alone</span>
                      </div>
                    )}

                    {/* Popover */}
                    {showLonelyGuests && (
                      <div className="lonely-guests-popover absolute bottom-full left-0 mb-4 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 z-50 animate-slide-up origin-bottom-left">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                          <span className="font-semibold text-sm text-amber-600 flex items-center gap-2">
                            <span className="material-icons-round text-sm">warning</span>
                            Seated Alone
                          </span>
                          <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                            {lonelyGuests.length}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                          These guests are seated at a table with no one else from their "{lonelyGuests[0]?.group_id}" group.
                        </p>
                        <div className="max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                          {lonelyGuests.map(guest => {
                            const tableId = assignments[guest.id];
                            const table = tables.find(t => t.id === tableId);

                            return (
                              <div
                                key={guest.id}
                                className="flex items-center gap-3 mb-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer transition-colors group"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedGuestId(guest.id);
                                  setShowLonelyGuests(false);

                                  // Scroll table into view on canvas
                                  if (tableId && tableRefs.current[tableId]) {
                                    tableRefs.current[tableId]?.scrollIntoView({
                                      behavior: 'smooth',
                                      block: 'center',
                                      inline: 'center'
                                    });
                                  }
                                }}
                              >
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                                  style={{ backgroundColor: getGuestColor(guest) }}
                                >
                                  {getInitials(guest.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-primary transition-colors">
                                    {guest.name}
                                  </p>
                                  <p className="text-[10px] text-gray-500 truncate">
                                    {guest.group_id} • {table?.name.replace('Table ', 'T') || 'Unseated'}
                                  </p>
                                </div>
                                <span className="material-icons-round text-gray-300 text-sm group-hover:text-primary group-hover:translate-x-1 transition-all">arrow_forward</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-1 hidden md:block"></div>

              {/* Holding Zone */}
              <div
                onDragOver={(e) => {
                  // Only allow drop if zone is empty
                  if (!holdingGuestId) {
                    e.preventDefault();
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.dataTransfer.dropEffect = 'move';
                  }
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.transform = 'scale(1)';

                  // Double check constraint
                  if (holdingGuestId) return;

                  const guestId = e.dataTransfer.getData('guestId');
                  if (guestId) {
                    // Capture original table before unseating
                    const currentTable = assignments[guestId];
                    if (currentTable) {
                      setHoldingGuestOriginalTableId(currentTable);
                    }

                    // Unseat the guest and put them in holding
                    updateGuestAssignment(guestId, null); // null unassigns them
                    setHoldingGuestId(guestId);
                  }
                }}
                className={`flex items-center gap-3 px-4 h-12 rounded-xl border-2 border-dashed transition-all duration-200 ${holdingGuest
                  ? 'bg-primary/10 border-primary border-solid'
                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600 hover:border-primary/50'
                  }`}
                style={{ minWidth: '200px' }}
              >
                {holdingGuest ? (
                  <>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm cursor-grab active:cursor-grabbing"
                      style={{ backgroundColor: getGuestColor(holdingGuest) }}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('guestId', holdingGuest.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={(e) => {
                        // If dropped on background (cancelled), ensure guest stays in holding
                        if (e.dataTransfer.dropEffect === 'none') {
                          // No state change needed, just visual confirmation if needed
                        }
                      }}
                    >
                      {getInitials(holdingGuest.name)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-gray-800 dark:text-white">{holdingGuest.name}</span>
                      <span className="text-[10px] text-primary font-medium">Drag to seat</span>
                    </div>
                    <button
                      onClick={() => {
                        // Restore to original table if possible
                        if (holdingGuestOriginalTableId && holdingGuestId) {
                          updateGuestAssignment(holdingGuestId, holdingGuestOriginalTableId);
                        }
                        setHoldingGuestId(null);
                        setHoldingGuestOriginalTableId(null);
                      }}
                      className="ml-auto w-6 h-6 rounded-full hover:bg-black/5 flex items-center justify-center text-gray-400 hover:text-gray-600"
                      title="Return to original seat"
                    >
                      <span className="material-icons-round text-sm">close</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="material-icons-round text-gray-400 text-sm">front_hand</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                      Drag guest here to hold
                    </span>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default PlannerAI;
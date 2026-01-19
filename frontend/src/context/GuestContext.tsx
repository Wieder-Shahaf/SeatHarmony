import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import {
  Guest,
  Table,
  GuestGroup,
  VenueConfig,
  TotParams,
  TotLayout,
  VenueLayout,
  DEFAULT_TOT_PARAMS,
  groupGuestsByCategory,
  createDefaultTables,
} from '../types/models';
import { prepareDataForApi } from '../services/api';

// localStorage keys
const STORAGE_KEYS = {
  GUESTS: 'seatharmony_guests',
  TABLES: 'seatharmony_tables',
  VENUE_CONFIG: 'seatharmony_venue_config',
  VENUE_LAYOUT: 'seatharmony_venue_layout',
  TOT_PARAMS: 'seatharmony_tot_params',
  LAYOUTS: 'seatharmony_layouts',
  LAYOUTS_CACHE_KEY: 'seatharmony_layouts_cache_key',
  SELECTED_LAYOUT: 'seatharmony_selected_layout',
  EXPLANATIONS: 'seatharmony_explanations',
  ORIGINAL_LAYOUT: 'seatharmony_original_layout', // Store original recommended layout
} as const;

// Type for guest explanations cache
export type ExplanationCache = Record<string, string>;

const API_BASE = import.meta.env.VITE_API_BASE || '';

// Helper functions for localStorage
function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn(`Failed to save to localStorage (${key}):`, error);
  }
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as T;
    }
  } catch (error) {
    console.warn(`Failed to load from localStorage (${key}):`, error);
  }
  return defaultValue;
}

function clearStorage(): void {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.warn('Failed to clear localStorage:', error);
  }
}

// Generate a cache key for layouts based on inputs that affect optimization results
function generateLayoutsCacheKey(guests: Guest[], tables: Table[], totParams: TotParams): string {
  // Create a deterministic string from the inputs that affect layout generation
  const guestKey = guests
    .map(g => `${g.id}:${g.group_id || ''}:${g.importance}:${(g.tags || []).sort().join(',')}`)
    .sort()
    .join('|');
  const tableKey = tables
    .map(t => `${t.id}:${t.capacity}:${t.zone || ''}`)
    .sort()
    .join('|');
  const paramsKey = `${totParams.n_generate}:${totParams.n_evaluate}:${totParams.depth}`;

  // Simple hash function for the combined key
  const combined = `${guestKey}||${tableKey}||${paramsKey}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

interface GuestContextType {
  // Guest data
  guests: Guest[];
  setGuests: (guests: Guest[]) => void;
  addGuest: (guest: Guest) => void;
  updateGuest: (id: string, updates: Partial<Guest>) => void;
  removeGuest: (id: string) => void;

  // Derived data
  guestGroups: GuestGroup[];
  totalGuestCount: number;

  // Table/Venue data
  tables: Table[];
  setTables: (tables: Table[]) => void;
  venueConfig: VenueConfig;
  setVenueConfig: (config: VenueConfig) => void;
  selectedVenueLayout: VenueLayout | null;
  setSelectedVenueLayout: (layout: VenueLayout | null) => void;

  // ToT parameters
  totParams: TotParams;
  setTotParams: (params: TotParams) => void;

  // Optimization results
  layouts: TotLayout[];
  setLayouts: (layouts: TotLayout[]) => void;
  setLayoutsWithCacheKey: (layouts: TotLayout[]) => void;
  selectedLayoutIndex: number;
  setSelectedLayoutIndex: (index: number) => void;

  // Loading/error state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;

  // Actions
  clearAll: () => void;
  initializeFromExcel: (guests: Guest[]) => void;

  // Storage info
  // Storage info
  hasStoredData: boolean;

  // Manual assignment
  updateGuestAssignment: (guestId: string, tableId: string | null) => void;

  // Explanations
  explanations: ExplanationCache;
  setExplanations: (explanations: ExplanationCache) => void;
  fetchAllExplanations: () => Promise<void>;
  fetchExplanationsForTables: (tableIds: string[]) => Promise<void>;
  isLoadingExplanations: boolean;

  // Cache validation
  layoutsCacheKey: string;
  isLayoutsCacheValid: () => boolean;
  invalidateLayoutsCache: () => void;

  // Original layout restoration
  originalLayout: TotLayout | null;
  saveOriginalLayout: () => void;
  restoreOriginalLayout: () => boolean;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

interface GuestProviderProps {
  children: ReactNode;
}

export const GuestProvider: React.FC<GuestProviderProps> = ({ children }) => {
  // Load initial state from localStorage
  const [guests, setGuestsState] = useState<Guest[]>(() =>
    loadFromStorage(STORAGE_KEYS.GUESTS, [])
  );
  const [tables, setTablesState] = useState<Table[]>(() =>
    loadFromStorage(STORAGE_KEYS.TABLES, [])
  );
  const [venueConfig, setVenueConfigState] = useState<VenueConfig>(() =>
    loadFromStorage(STORAGE_KEYS.VENUE_CONFIG, { tables: [], settings: {} })
  );
  const [selectedVenueLayout, setSelectedVenueLayoutState] = useState<VenueLayout | null>(() =>
    loadFromStorage(STORAGE_KEYS.VENUE_LAYOUT, null)
  );
  const [totParams, setTotParamsState] = useState<TotParams>(() =>
    loadFromStorage(STORAGE_KEYS.TOT_PARAMS, DEFAULT_TOT_PARAMS)
  );
  const [layouts, setLayoutsState] = useState<TotLayout[]>(() =>
    loadFromStorage(STORAGE_KEYS.LAYOUTS, [])
  );
  const [selectedLayoutIndex, setSelectedLayoutIndexState] = useState<number>(() =>
    loadFromStorage(STORAGE_KEYS.SELECTED_LAYOUT, -1)
  );
  const [explanations, setExplanationsState] = useState<ExplanationCache>(() =>
    loadFromStorage(STORAGE_KEYS.EXPLANATIONS, {})
  );
  const [layoutsCacheKey, setLayoutsCacheKeyState] = useState<string>(() =>
    loadFromStorage(STORAGE_KEYS.LAYOUTS_CACHE_KEY, '')
  );
  const [originalLayout, setOriginalLayoutState] = useState<TotLayout | null>(() =>
    loadFromStorage(STORAGE_KEYS.ORIGINAL_LAYOUT, null)
  );

  // UI state (not persisted)
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingExplanations, setIsLoadingExplanations] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived data
  const guestGroups = groupGuestsByCategory(guests);
  const totalGuestCount = guests.length;
  const hasStoredData = guests.length > 0;

  // Auto-save to localStorage when data changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.GUESTS, guests);
  }, [guests]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.TABLES, tables);
  }, [tables]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.VENUE_CONFIG, venueConfig);
  }, [venueConfig]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.VENUE_LAYOUT, selectedVenueLayout);
  }, [selectedVenueLayout]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.TOT_PARAMS, totParams);
  }, [totParams]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.LAYOUTS, layouts);
  }, [layouts]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SELECTED_LAYOUT, selectedLayoutIndex);
  }, [selectedLayoutIndex]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.EXPLANATIONS, explanations);
  }, [explanations]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.LAYOUTS_CACHE_KEY, layoutsCacheKey);
  }, [layoutsCacheKey]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ORIGINAL_LAYOUT, originalLayout);
  }, [originalLayout]);

  // Guest management
  const setGuests = useCallback((newGuests: Guest[]) => {
    setGuestsState(newGuests);
    setError(null);
  }, []);

  const addGuest = useCallback((guest: Guest) => {
    setGuestsState(prev => [...prev, guest]);
  }, []);

  const updateGuest = useCallback((id: string, updates: Partial<Guest>) => {
    setGuestsState(prev =>
      prev.map(g => (g.id === id ? { ...g, ...updates } : g))
    );
  }, []);

  const removeGuest = useCallback((id: string) => {
    setGuestsState(prev => prev.filter(g => g.id !== id));
  }, []);

  // Table management
  const setTables = useCallback((newTables: Table[]) => {
    setTablesState(newTables);
    setVenueConfigState(prev => ({ ...prev, tables: newTables }));
  }, []);

  const setVenueConfig = useCallback((config: VenueConfig) => {
    setVenueConfigState(config);
    setTablesState(config.tables);
  }, []);

  // Venue layout selection
  const setSelectedVenueLayout = useCallback((layout: VenueLayout | null) => {
    setSelectedVenueLayoutState(layout);
  }, []);

  // ToT params with persistence
  const setTotParams = useCallback((params: TotParams) => {
    setTotParamsState(params);
  }, []);

  // Layouts with persistence
  const setLayouts = useCallback((newLayouts: TotLayout[]) => {
    setLayoutsState(newLayouts);
  }, []);

  const setSelectedLayoutIndex = useCallback((index: number) => {
    const previousIndex = selectedLayoutIndex;
    setSelectedLayoutIndexState(index);
    
    // Clear and save new original layout when selecting a different layout
    if (index !== previousIndex && index >= 0) {
      // Use functional update to get latest layouts state
      setLayoutsState(currentLayouts => {
        if (currentLayouts[index]) {
          const currentLayout = currentLayouts[index];
          // Deep clone the layout
          const clonedLayout: TotLayout = {
            value: currentLayout.value,
            weights: { ...currentLayout.weights },
            notes: currentLayout.notes,
            layout: {
              id: currentLayout.layout.id,
              assignments: { ...currentLayout.layout.assignments },
              score: currentLayout.layout.score,
              objective_breakdown: { ...currentLayout.layout.objective_breakdown },
              variant_label: currentLayout.layout.variant_label,
              variant_id: currentLayout.layout.variant_id,
              summary: currentLayout.layout.summary ? { ...currentLayout.layout.summary } : null,
            }
          };
          setOriginalLayoutState(clonedLayout);
          console.log('Saved new original layout for index:', index, {
            assignmentsCount: Object.keys(clonedLayout.layout.assignments).length,
            layoutId: clonedLayout.layout.id
          });
        } else {
          console.warn('Layout not found at index:', index);
        }
        return currentLayouts; // Return unchanged
      });
    }
  }, [selectedLayoutIndex]);

  // Clear all data (including localStorage)
  const clearAll = useCallback(() => {
    setGuestsState([]);
    setTablesState([]);
    setVenueConfigState({ tables: [], settings: {} });
    setSelectedVenueLayoutState(null);
    setLayoutsState([]);
    setSelectedLayoutIndexState(-1);
    setExplanationsState({});
    setError(null);
    clearStorage();
    console.log('All data cleared from memory and localStorage');
  }, []);

  // Explanations management
  const setExplanations = useCallback((newExplanations: ExplanationCache) => {
    setExplanationsState(newExplanations);
  }, []);

  // Fetch explanations for all guests in the selected layout
  const fetchAllExplanations = useCallback(async () => {
    const selectedLayout = layouts[selectedLayoutIndex];
    if (!selectedLayout || guests.length === 0 || tables.length === 0) return;

    setIsLoadingExplanations(true);
    try {
      const response = await fetch(`${API_BASE}/api/layouts/explain-guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...prepareDataForApi(guests, tables),
          layout: selectedLayout.layout,
          weights: selectedLayout.weights,
          notes: selectedLayout.notes,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setExplanationsState(data.explanations || {});
        console.log(`Fetched explanations for ${Object.keys(data.explanations || {}).length} guests`);
      }
    } catch (err) {
      console.error('Failed to fetch explanations:', err);
    } finally {
      setIsLoadingExplanations(false);
    }
  }, [guests, tables, layouts, selectedLayoutIndex]);

  // Fetch explanations for specific tables only (for when guests are moved)
  const fetchExplanationsForTables = useCallback(async (tableIds: string[]) => {
    const selectedLayout = layouts[selectedLayoutIndex];
    if (!selectedLayout || tableIds.length === 0) return;

    const assignments = selectedLayout.layout.assignments as Record<string, string>;

    // Get guests at the specified tables
    const affectedGuestIds = new Set<string>();
    for (const [guestId, tableId] of Object.entries(assignments)) {
      if (tableIds.includes(tableId)) {
        affectedGuestIds.add(guestId);
      }
    }

    if (affectedGuestIds.size === 0) return;

    // Get the affected guests and tables
    const affectedGuests = guests.filter(g => affectedGuestIds.has(g.id));
    const affectedTables = tables.filter(t => tableIds.includes(t.id));

    setIsLoadingExplanations(true);
    try {
      const response = await fetch(`${API_BASE}/api/layouts/explain-guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guests: affectedGuests.map(g => ({
            id: g.id,
            name: g.name,
            group_id: g.group_id,
            importance: g.importance,
            tags: g.tags,
          })),
          tables: affectedTables.map(t => ({
            id: t.id,
            name: t.name,
            capacity: t.capacity,
            zone: t.zone,
            constraints: t.constraints,
          })),
          layout: {
            ...selectedLayout.layout,
            // Only include assignments for affected guests
            assignments: Object.fromEntries(
              Object.entries(assignments).filter(([gId]) => affectedGuestIds.has(gId))
            ),
          },
          weights: selectedLayout.weights,
          notes: selectedLayout.notes,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Merge new explanations with existing ones
        setExplanationsState(prev => ({
          ...prev,
          ...data.explanations,
        }));
        console.log(`Updated explanations for ${Object.keys(data.explanations || {}).length} guests at tables: ${tableIds.join(', ')}`);
      }
    } catch (err) {
      console.error('Failed to fetch explanations for tables:', err);
    } finally {
      setIsLoadingExplanations(false);
    }
  }, [guests, tables, layouts, selectedLayoutIndex]);

  // Manual assignment update
  const updateGuestAssignment = useCallback((guestId: string, tableId: string | null) => {
    // Only update if we have a selected layout
    if (!layouts[selectedLayoutIndex]) return;

    // Get the current table for the guest (before move)
    const currentLayout = layouts[selectedLayoutIndex];
    const oldTableId = currentLayout.layout.assignments[guestId];

    setLayoutsState(prev => {
      const newLayouts = [...prev];
      const currentLayout = { ...newLayouts[selectedLayoutIndex] };
      const currentAssignments = { ...currentLayout.layout.assignments };

      if (tableId) {
        currentAssignments[guestId] = tableId;
      } else {
        delete currentAssignments[guestId];
      }

      currentLayout.layout = {
        ...currentLayout.layout,
        assignments: currentAssignments
      };

      newLayouts[selectedLayoutIndex] = currentLayout;
      return newLayouts;
    });

    // After updating, refresh explanations for affected tables
    // Use setTimeout to ensure state update completes first
    setTimeout(() => {
      const tablesToRefresh: string[] = [];
      if (oldTableId) tablesToRefresh.push(oldTableId);
      if (tableId) tablesToRefresh.push(tableId);

      if (tablesToRefresh.length > 0) {
        // We need to call this after the state update, so we use a workaround
        // The fetchExplanationsForTables will be called from the component
      }
    }, 100);

    // Return the affected table IDs so the component can refresh explanations
    return { oldTableId, newTableId: tableId };
  }, [layouts, selectedLayoutIndex]);

  // Cache validation for layouts
  const isLayoutsCacheValid = useCallback((): boolean => {
    // No cache key means no valid cache
    if (!layoutsCacheKey) return false;
    // No layouts means cache is empty
    if (layouts.length === 0) return false;
    // Check if current inputs match the cache key
    const currentKey = generateLayoutsCacheKey(guests, tables, totParams);
    const isValid = currentKey === layoutsCacheKey;
    console.log(`Cache validation: stored=${layoutsCacheKey}, current=${currentKey}, valid=${isValid}`);
    return isValid;
  }, [layoutsCacheKey, layouts, guests, tables, totParams]);

  const invalidateLayoutsCache = useCallback(() => {
    setLayoutsCacheKeyState('');
    console.log('Layouts cache invalidated');
  }, []);

  // Update cache key when layouts are set (called from Recommendations page after fetch)
  const setLayoutsWithCacheKey = useCallback((newLayouts: TotLayout[]) => {
    setLayoutsState(newLayouts);
    // Set cache key based on current inputs
    const newCacheKey = generateLayoutsCacheKey(guests, tables, totParams);
    setLayoutsCacheKeyState(newCacheKey);
    console.log(`Layouts set with cache key: ${newCacheKey}`);
  }, [guests, tables, totParams]);

  // Save original recommended layout
  const saveOriginalLayout = useCallback(() => {
    if (selectedLayoutIndex >= 0 && layouts.length > 0 && layouts[selectedLayoutIndex]) {
      const currentLayout = layouts[selectedLayoutIndex];
      // Deep clone the layout to avoid reference issues
      const clonedLayout: TotLayout = {
        value: currentLayout.value,
        weights: { ...currentLayout.weights },
        notes: currentLayout.notes,
        layout: {
          id: currentLayout.layout.id,
          assignments: { ...currentLayout.layout.assignments },
          score: currentLayout.layout.score,
          objective_breakdown: { ...currentLayout.layout.objective_breakdown },
          variant_label: currentLayout.layout.variant_label,
          variant_id: currentLayout.layout.variant_id,
          summary: currentLayout.layout.summary ? { ...currentLayout.layout.summary } : null,
        }
      };
      setOriginalLayoutState(clonedLayout);
      console.log('Original layout saved', { 
        layoutId: clonedLayout.layout.id,
        assignmentsCount: Object.keys(clonedLayout.layout.assignments).length,
        selectedLayoutIndex 
      });
    } else {
      console.warn('Cannot save original layout:', { selectedLayoutIndex, layoutsLength: layouts.length });
    }
  }, [layouts, selectedLayoutIndex]);

  // Restore original recommended layout
  const restoreOriginalLayout = useCallback(() => {
    if (!originalLayout) {
      console.warn('Cannot restore: originalLayout is null');
      return false;
    }
    if (selectedLayoutIndex < 0) {
      console.warn('Cannot restore: invalid selectedLayoutIndex', { selectedLayoutIndex });
      return false;
    }
    
    // Deep clone the original layout to restore it
    const restoredLayout: TotLayout = {
      value: originalLayout.value,
      weights: { ...originalLayout.weights },
      notes: originalLayout.notes,
      layout: {
        id: originalLayout.layout.id,
        assignments: { ...originalLayout.layout.assignments },
        score: originalLayout.layout.score,
        objective_breakdown: { ...originalLayout.layout.objective_breakdown },
        variant_label: originalLayout.layout.variant_label,
        variant_id: originalLayout.layout.variant_id,
        summary: originalLayout.layout.summary ? { ...originalLayout.layout.summary } : null,
      }
    };
    
    setLayoutsState(prev => {
      // Ensure we have enough layouts
      const newLayouts = [...prev];
      // Extend array if needed
      while (newLayouts.length <= selectedLayoutIndex) {
        newLayouts.push({} as TotLayout);
      }
      newLayouts[selectedLayoutIndex] = restoredLayout;
      console.log('Original layout restored', { 
        layoutId: restoredLayout.layout.id,
        assignmentsCount: Object.keys(restoredLayout.layout.assignments).length,
        selectedLayoutIndex,
        assignments: Object.keys(restoredLayout.layout.assignments).slice(0, 5) // Log first 5 for debugging
      });
      return newLayouts;
    });
    
    return true;
  }, [originalLayout, selectedLayoutIndex]);

  // Initialize from Excel upload
  const initializeFromExcel = useCallback((newGuests: Guest[]) => {
    setGuestsState(newGuests);

    // Create default tables based on guest count (10 seats per table)
    const defaultTables = createDefaultTables(newGuests.length, 10);
    setTablesState(defaultTables);
    setVenueConfigState({ tables: defaultTables, settings: {} });

    // Clear previous results and cache
    setLayoutsState([]);
    setSelectedLayoutIndexState(-1);
    setLayoutsCacheKeyState('');
    setError(null);

    console.log(`Initialized ${newGuests.length} guests and ${defaultTables.length} tables (auto-saved to localStorage)`);
  }, []);

  const value: GuestContextType = {
    guests,
    setGuests,
    addGuest,
    updateGuest,
    removeGuest,
    guestGroups,
    totalGuestCount,
    tables,
    setTables,
    venueConfig,
    setVenueConfig,
    selectedVenueLayout,
    setSelectedVenueLayout,
    totParams,
    setTotParams,
    layouts,
    setLayouts,
    setLayoutsWithCacheKey,
    selectedLayoutIndex,
    setSelectedLayoutIndex,
    isLoading,
    setIsLoading,
    error,
    setError,
    clearAll,
    initializeFromExcel,
    hasStoredData,
    updateGuestAssignment,
    explanations,
    setExplanations,
    fetchAllExplanations,
    fetchExplanationsForTables,
    isLoadingExplanations,
    layoutsCacheKey,
    isLayoutsCacheValid,
    invalidateLayoutsCache,
    originalLayout,
    saveOriginalLayout,
    restoreOriginalLayout,
  };

  return (
    <GuestContext.Provider value={value}>
      {children}
    </GuestContext.Provider>
  );
};

// Custom hook to use guest context
export const useGuests = (): GuestContextType => {
  const context = useContext(GuestContext);
  if (context === undefined) {
    throw new Error('useGuests must be used within a GuestProvider');
  }
  return context;
};

export default GuestContext;

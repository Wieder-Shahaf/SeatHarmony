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

// localStorage keys
const STORAGE_KEYS = {
  GUESTS: 'seatharmony_guests',
  TABLES: 'seatharmony_tables',
  VENUE_CONFIG: 'seatharmony_venue_config',
  VENUE_LAYOUT: 'seatharmony_venue_layout',
  TOT_PARAMS: 'seatharmony_tot_params',
  LAYOUTS: 'seatharmony_layouts',
  SELECTED_LAYOUT: 'seatharmony_selected_layout',
} as const;

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
  hasStoredData: boolean;
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
    loadFromStorage(STORAGE_KEYS.SELECTED_LAYOUT, 0)
  );
  
  // UI state (not persisted)
  const [isLoading, setIsLoading] = useState(false);
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
    setSelectedLayoutIndexState(index);
  }, []);

  // Clear all data (including localStorage)
  const clearAll = useCallback(() => {
    setGuestsState([]);
    setTablesState([]);
    setVenueConfigState({ tables: [], settings: {} });
    setSelectedVenueLayoutState(null);
    setLayoutsState([]);
    setSelectedLayoutIndexState(0);
    setError(null);
    clearStorage();
    console.log('All data cleared from memory and localStorage');
  }, []);

  // Initialize from Excel upload
  const initializeFromExcel = useCallback((newGuests: Guest[]) => {
    setGuestsState(newGuests);
    
    // Create default tables based on guest count (10 seats per table)
    const defaultTables = createDefaultTables(newGuests.length, 10);
    setTablesState(defaultTables);
    setVenueConfigState({ tables: defaultTables, settings: {} });
    
    // Clear previous results
    setLayoutsState([]);
    setSelectedLayoutIndexState(0);
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
    selectedLayoutIndex,
    setSelectedLayoutIndex,
    isLoading,
    setIsLoading,
    error,
    setError,
    clearAll,
    initializeFromExcel,
    hasStoredData,
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

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGuests } from '../src/context/GuestContext';
import { TotLayout, LayoutRequest } from '../src/types/models';

const API_BASE = import.meta.env.VITE_API_BASE || '';

const Recommendations: React.FC = () => {
  const navigate = useNavigate();
  const {
    guests,
    tables,
    venueConfig,
    selectedVenueLayout,
    totParams,
    setLayouts: saveLayoutsToContext,
    setSelectedLayoutIndex,
    isLoading: contextLoading,
    setIsLoading,
    error: contextError,
    setError: setContextError,
  } = useGuests();

  const [layouts, setLayouts] = useState<TotLayout[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Use ref to prevent double-fetch in StrictMode (ref persists across re-renders)
  const fetchStartedRef = useRef(false);

  // Check if we have the required data
  const hasRequiredData = guests.length > 0 && tables.length > 0;

  // Build the request payload from context
  const requestPayload: LayoutRequest | null = useMemo(() => {
    if (!hasRequiredData) return null;

    return {
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
      settings: venueConfig.settings,
      tot: totParams,
    };
  }, [guests, tables, venueConfig.settings, totParams, hasRequiredData]);

  useEffect(() => {
    // Don't fetch if we don't have required data, already fetched, or fetch already started
    // fetchStartedRef prevents double-fetch in React StrictMode
    if (!hasRequiredData || hasFetched || !requestPayload || fetchStartedRef.current) {
      return;
    }

    // Mark fetch as started immediately (before async call)
    fetchStartedRef.current = true;

    const fetchLayouts = async () => {
      setLoading(true);
      setIsLoading(true);
      setError(null);

      console.log('Fetching ToT layouts with:', {
        guestCount: guests.length,
        tableCount: tables.length,
        venue: selectedVenueLayout?.name || 'Custom',
        totParams,
      });

      try {
        const response = await fetch(`${API_BASE}/api/layouts/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestPayload)
        });

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();
        const fetchedLayouts = data.layouts ?? [];

        setLayouts(fetchedLayouts);
        saveLayoutsToContext(fetchedLayouts);
        setHasFetched(true);

        console.log(`Received ${fetchedLayouts.length} layout recommendations`);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch layouts');
        setContextError(err.message || 'Failed to fetch layouts');
        // Reset ref on error so user can retry
        fetchStartedRef.current = false;
      } finally {
        setLoading(false);
        setIsLoading(false);
      }
    };

    fetchLayouts();
  }, [hasRequiredData, hasFetched, requestPayload]);

  // Handle layout selection
  const handleSelectLayout = (index: number) => {
    setSelectedLayoutIndex(index);
    navigate('/planner');
  };

  // Redirect if no data
  if (!hasRequiredData && !loading) {
    return (
      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="text-center py-16">
          <span className="material-icons-round text-6xl text-gray-300 dark:text-gray-600 mb-4">warning</span>
          <h2 className="font-display text-2xl text-text-main dark:text-white mb-4">No Data Available</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please upload your guest list and select a venue before generating recommendations.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/dashboard" className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-[#777b63] transition-colors">
              Upload Guest List
            </Link>
            <Link to="/venues" className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              Select Venue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow w-full bg-background-light dark:bg-background-dark min-h-screen">
      {/* Sticky Glassy Header */}
      <div className="sticky top-0 left-0 right-0 z-40 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl text-text-main dark:text-secondary">
              Top Recommendations
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">
              Generated by SeatHarmony&apos;s Tree-of-Thoughts search
            </p>
          </div>

          {/* Venue & Guest Info - Compact */}
          <div className="flex items-center gap-3">
            {selectedVenueLayout && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 dark:bg-primary/20 rounded-full">
                <span className="material-icons-round text-primary text-sm">{selectedVenueLayout.icon || 'location_on'}</span>
                <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                  {selectedVenueLayout.name}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/10 dark:bg-secondary/20 rounded-full">
              <span className="material-icons-round text-secondary text-sm">people</span>
              <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                {guests.length} guests
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {loading && (
          <div className="flex flex-col justify-center items-center py-32 relative overflow-hidden">
            <style>
              {`
              @keyframes heartbeat {
                0%, 100% { transform: scale(1); }
                15% { transform: scale(1.15); }
                30% { transform: scale(1); }
                45% { transform: scale(1.15); }
                60% { transform: scale(1); }
              }
              .animate-heartbeat {
                animation: heartbeat 2s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
              }
              @keyframes shimmer-slide {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
              }
              .animate-shimmer-slide {
                animation: shimmer-slide 2s infinite linear;
              }
            `}
            </style>

            {/* Background Ambient Glow */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
              <div className="w-64 h-64 bg-primary/30 rounded-full blur-3xl animate-pulse"></div>
            </div>

            {/* Animated Logo Construction */}
            <div className="relative flex items-center gap-3 mb-8 z-10 scale-125 transform">
              <span className="material-icons-round text-5xl text-primary animate-heartbeat drop-shadow-sm">favorite</span>
              <h1 className="font-display text-5xl text-text-main dark:text-secondary tracking-tight">
                Seat<span className="italic relative">
                  Harmony
                  <span className="absolute -top-1 -right-2 text-primary text-xl">✨</span>
                </span>
              </h1>
            </div>

            {/* Loading Progress & Text */}
            <div className="flex flex-col items-center gap-4 z-10 w-full max-w-xs">
              <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700/50 rounded-full overflow-hidden relative">
                <div className="absolute inset-0 bg-primary/20"></div>
                <div className="h-full bg-primary w-1/3 rounded-full animate-shimmer-slide absolute top-0 left-0"></div>
              </div>

              <div className="flex flex-col items-center">
                <p className="font-display text-lg text-gray-700 dark:text-gray-200">
                  Harmonizing your seating plan...
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-sans tracking-wide uppercase mt-1">
                  Generating Optimized Layouts
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-xl mx-auto mb-8 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-200 flex items-start gap-2">
            <span className="material-icons-round text-base mt-0.5">error</span>
            <div>
              <p className="font-semibold mb-1">Couldn&apos;t reach the ToT backend</p>
              <p>{error}</p>
              <p className="mt-2 text-xs text-red-600/80 dark:text-red-200/80">
                Make sure the Python backend (FastAPI/Streamlit) is running and reachable at <code>{API_BASE || window.location.origin}</code>.
              </p>
            </div>
          </div>
        )}

        {!loading && !error && layouts.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
            No layouts returned yet. Ensure the backend is running with the ToT API enabled.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {layouts.map((entry, index) => {
            const { layout, value, weights, notes } = entry;
            const scoreLabel = `${Math.round(layout.score || value)}/100`;
            const titleLabels = ['Option A', 'Option B', 'Option C'];
            const variantLabel = titleLabels[index] || `Option ${index + 1}`;

            return (
              <div
                key={index}
                className="group relative bg-white dark:bg-surface-dark rounded-2xl shadow-soft hover:shadow-glow transition-all duration-300 overflow-hidden border border-secondary/20 dark:border-white/5 transform hover:-translate-y-1 h-full flex flex-col"
              >
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${index === 0 ? 'bg-primary' : index === 1 ? 'bg-secondary' : 'bg-accent'}`}></div>
                <div className="p-8 flex-grow">
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-primary/10 dark:bg-primary/20 p-3 rounded-xl">
                      <span className="material-icons-round text-primary text-2xl">family_restroom</span>
                    </div>
                    <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full border border-green-100 dark:border-green-800">
                      <span className="text-sm font-bold text-green-700 dark:text-green-300">{scoreLabel}</span>
                      <span className="material-icons-round text-green-600 dark:text-green-400 text-sm">stars</span>
                    </div>
                  </div>
                  <h2 className="flex items-center gap-2 font-display text-2xl text-text-main dark:text-white mb-2">
                    <span className="material-icons-round">handshake</span> {variantLabel}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 italic">
                    Weights: Family {weights.family_cohesion?.toFixed(2) ?? '—'}, Social {weights.social_group_cohesion?.toFixed(2) ?? '—'},
                    Mixing {weights.side_mixing?.toFixed(2) ?? '—'}, Relations {weights.relationship_priority?.toFixed(2) ?? '—'}
                  </p>
                  {notes && (
                    <p className="text-xs text-primary dark:text-accent mb-4">
                      Thought that produced this variant: <span className="font-semibold">{notes}</span>
                    </p>
                  )}
                  <div className="space-y-2 mb-6">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Assignments</h3>
                    <div className="text-xs max-h-32 overflow-y-auto rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3 border border-gray-100 dark:border-gray-700 space-y-1">
                      {Object.entries(layout.assignments).map(([guestId, tableId]) => (
                        <div key={guestId} className="flex justify-between gap-2">
                          <span className="font-mono text-gray-600 dark:text-gray-300">{guestId}</span>
                          <span className="text-gray-500 dark:text-gray-400">→ {tableId}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {layout.summary && (
                    <div className="space-y-2 mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Constraint Summary</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        Hard violations: {layout.summary.hard_violations.length || 0}
                      </p>
                    </div>
                  )}
                </div>
                <div className="p-6 pt-0 mt-auto">
                  <button
                    onClick={() => handleSelectLayout(index)}
                    className="w-full py-3 px-4 bg-primary hover:bg-[#777b63] text-white rounded-xl font-medium transition-colors shadow-lg shadow-primary/20 flex justify-center items-center gap-2 group-hover:gap-3 transition-all"
                  >
                    <span className="material-icons-round text-sm">auto_awesome</span> Select & Refine
                    <span className="material-icons-round text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Table Preview */}
        {selectedVenueLayout && (
          <div className="mt-12">
            <h3 className="text-center font-display text-xl text-text-main dark:text-secondary mb-6">
              <span className="material-icons-round text-primary align-middle mr-2">table_restaurant</span>
              Your Venue: {selectedVenueLayout.name}
            </h3>
            <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
              {selectedVenueLayout.tableTemplates.map((template, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <span className="material-icons-round text-gray-400 text-sm">
                    {template.type === 'round' ? 'circle' : 'crop_square'}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {template.count}× {template.type} ({template.capacity} seats)
                  </span>
                  <span className="text-xs text-gray-400">{template.zone}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Recommendations;
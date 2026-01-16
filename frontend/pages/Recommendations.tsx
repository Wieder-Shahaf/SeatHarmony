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
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Initializing optimization...');
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
      setProgress(0);
      setStatusMessage('Initializing optimization...');

      console.log('Fetching ToT layouts with:', {
        guestCount: guests.length,
        tableCount: tables.length,
        venue: selectedVenueLayout?.name || 'Custom',
        totParams,
      });

      try {
        const response = await fetch(`${API_BASE}/api/layouts/stream-generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestPayload)
        });

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        if (!response.body) {
          throw new Error('No response body for streaming');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');

          // Process all complete lines
          buffer = lines.pop() || ''; // Keep the last partial line in buffer

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const event = JSON.parse(line);

              if (event.type === 'progress') {
                setProgress(event.percent);
                setStatusMessage(event.message);
              } else if (event.type === 'result') {
                const fetchedLayouts = event.layouts ?? [];
                setLayouts(fetchedLayouts);
                saveLayoutsToContext(fetchedLayouts);
                setHasFetched(true);
                console.log(`Received ${fetchedLayouts.length} layout recommendations`);
              }
            } catch (e) {
              console.warn('Failed to parse stream line:', line, e);
            }
          }
        }

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


  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  // Handle layout preview selection
  const handlePreviewLayout = (index: number) => {
    setPreviewIndex(index);
  };

  // Confirm selection and navigate
  const handleConfirmLayout = () => {
    if (previewIndex === null) return;

    setSelectedLayoutIndex(previewIndex);
    navigate('/planner');
  };

  // ... (existing helper function map)



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
    <div className="flex-grow w-full min-h-screen">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Header - Matching Venue Style */}
        <div className="mb-12 text-center max-w-3xl mx-auto">
          <h2 className="flex items-center justify-center gap-3 font-display text-5xl text-text-main dark:text-white mb-4">
            Optimized Seating Plans
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg font-light leading-relaxed">
            We&apos;ve turned your guest list into a social masterpiece. Explore these three AI-curated arrangements, each designed to create a unique atmosphere for your celebration.
          </p>
          {selectedVenueLayout && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-black/20 rounded-full text-sm text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
              <span className="material-icons-round text-primary text-sm">{selectedVenueLayout.icon || 'location_on'}</span>
              <span className="font-medium">{selectedVenueLayout.name}</span>
              <span className="text-gray-400">•</span>
              <span className="material-icons-outlined text-sm text-gray-500">people</span>
              <span>{guests.length} Guests</span>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex flex-col justify-center items-center py-32 relative overflow-hidden">
            <style>
              {`
        @keyframes heartbeat {
          0 %, 100 % { transform: scale(1); }
                15% {transform: scale(1.15); }
        30% {transform: scale(1); }
        45% {transform: scale(1.15); }
        60% {transform: scale(1); }
              }
        .animate-heartbeat {
          animation: heartbeat 2s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
              }
        @keyframes shimmer-slide {
          0 % { transform: translateX(-100 %); }
                100% {transform: translateX(400%); }
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
              <div className="h-2 w-full bg-gray-200 dark:bg-gray-700/50 rounded-full overflow-hidden relative shadow-inner">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300 ease-out flex items-center justify-end"
                  style={{ width: `${Math.max(5, progress)}%` }}
                >
                  <div className="w-full h-full bg-gradient-to-r from-transparent to-white/30"></div>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <p className="font-display text-lg text-gray-700 dark:text-gray-200 animate-pulse">
                  Harmonizing your seating plan...
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-sans tracking-wide uppercase mt-1">
                  Generating Optimized Layouts
                </p>
              </div>
            </div>
          </div >
        )}

        {
          error && (
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
          )
        }

        {
          !loading && !error && layouts.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
              No layouts returned yet. Ensure the backend is running with the ToT API enabled.
            </div>
          )
        }

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {layouts.map((entry, index) => {
            const { layout, value, weights, notes } = entry;
            const scoreLabel = `${Math.round(layout.score || value)}/100`;

            // Map strategy names to friendly titles
            const strategyTitles: Record<string, string> = {
              'baseline': 'Balanced Harmony',
              'boost_family': 'Family Focused',
              'boost_social': 'Social Butterfly',
              'max_cohesion': 'Tight-Knit Groups',
              'max_mingling': 'Mix & Mingle',
              'reduce_social': 'Formal Arrangement',
            };

            const variantLabel = strategyTitles[notes || ''] || notes || `Option ${index + 1}`;

            return (
              <div
                key={index}
                onClick={() => handlePreviewLayout(index)}
                className={`group relative bg-white dark:bg-surface-dark rounded-2xl shadow-soft hover:shadow-xl transition-all duration-300 overflow-hidden border cursor-pointer transform hover:-translate-y-1 h-full flex flex-col
                  ${previewIndex === index
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-background-light dark:ring-offset-background-dark border-primary'
                    : 'border-secondary/20 dark:border-white/5'}`}
              >
                {/* Selection Indicator */}
                {previewIndex === index && (
                  <div className="absolute top-4 right-4 z-10 bg-primary text-white w-8 h-8 flex items-center justify-center rounded-full shadow-lg animate-fade-in">
                    <span className="material-icons-round text-lg">check</span>
                  </div>
                )}

                <div className={`absolute top-0 left-0 right-0 h-1.5 ${index === 0 ? 'bg-primary' : index === 1 ? 'bg-secondary' : 'bg-accent'}`}></div>
                <div className="p-8 flex-grow">
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-primary/10 dark:bg-primary/20 p-3 rounded-xl">
                      <span className="material-icons-round text-primary text-2xl">family_restroom</span>
                    </div>
                  </div>
                  <h2 className="flex items-center gap-2 font-display text-2xl text-text-main dark:text-white mb-2">
                    <span className="material-icons-round">handshake</span> {variantLabel}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 italic">
                    Prioritizing {weights.family_cohesion && weights.family_cohesion > 0.6 ? 'family bonds' :
                      weights.social_group_cohesion && weights.social_group_cohesion > 0.6 ? 'social connections' :
                        weights.side_mixing && weights.side_mixing > 0.6 ? 'mixing guests' : 'a balanced arrangement'}.
                  </p>

                  {/* Harmony Profile - Visual Summary (showing actual results) */}
                  <div className="space-y-4 mb-6">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Harmony Profile</h3>

                    <div className="space-y-3">
                      {/* Family Cohesion Meter */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600 dark:text-gray-300">Family Cohesion</span>
                          <span className="font-semibold text-primary">{Math.round(layout.objective_breakdown?.family_cohesion || 0)}%</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${layout.objective_breakdown?.family_cohesion || 0}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Social Connections Meter */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600 dark:text-gray-300">Social Groups</span>
                          <span className="font-semibold text-secondary">{Math.round(layout.objective_breakdown?.social_group_cohesion || 0)}%</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-secondary rounded-full"
                            style={{ width: `${layout.objective_breakdown?.social_group_cohesion || 0}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Mixing Meter */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600 dark:text-gray-300">Mixing</span>
                          <span className="font-semibold text-accent">{Math.round(layout.objective_breakdown?.side_mixing || 0)}%</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full"
                            style={{ width: `${layout.objective_breakdown?.side_mixing || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {layout.summary && layout.summary.hard_violations.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-red-400">Issues</h3>
                      <p className="text-xs text-red-600 dark:text-red-300">
                        {layout.summary.hard_violations.length} constraints could not be met.
                      </p>
                    </div>
                  )}
                </div>
                <div className="p-6 pt-0 mt-auto flex justify-end">
                  <span className={`text-sm font-medium transition-colors flex items-center gap-1 
                     ${previewIndex === index ? 'text-primary' : 'text-gray-400 group-hover:text-primary'}`}>
                    {previewIndex === index ? 'Selected' : 'Select'} <span className="material-icons-round text-sm">arrow_forward</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sticky Bottom Bar */}
        {previewIndex !== null && layouts[previewIndex] && (
          <div className="fixed bottom-0 left-0 right-0 bg-white/60 dark:bg-surface-dark/60 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 shadow-lg z-50 animate-slide-up">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary">
                  <span className="material-icons-round">handshake</span>
                </div>
                <div>
                  <h4 className="font-display text-lg text-text-main dark:text-white">
                    {(() => {
                      const layout = layouts[previewIndex];
                      const strategyTitles: Record<string, string> = {
                        'baseline': 'Balanced Harmony',
                        'boost_family': 'Family Focused',
                        'boost_social': 'Social Butterfly',
                        'max_cohesion': 'Tight-Knit Groups',
                        'max_mingling': 'Mix & Mingle',
                        'reduce_social': 'Formal Arrangement',
                      };
                      return strategyTitles[layout.notes || ''] || layout.notes || `Option ${previewIndex + 1}`;
                    })()}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                    Ready to refine this seating plan?
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPreviewIndex(null)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmLayout}
                  className="px-8 py-3 bg-primary hover:bg-[#777b63] text-white rounded-xl font-medium transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                >
                  <span>Select & Refine</span>
                  <span className="material-icons-round text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Spacer for bottom bar */}
        {previewIndex !== null && <div className="h-24"></div>}
      </div >
    </div >
  );
};

export default Recommendations;
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGuests } from '../src/context/GuestContext';
import { TotLayout, LayoutRequest } from '../src/types/models';
import { prepareDataForApi } from '../src/services/api';

const API_BASE = import.meta.env.VITE_API_BASE || '';

const Recommendations: React.FC = () => {
  const navigate = useNavigate();
  const {
    guests,
    tables,
    venueConfig,
    selectedVenueLayout,
    totParams,
    layouts: cachedLayouts,
    setLayoutsWithCacheKey,
    setLayouts,
    selectedLayoutIndex,
    setSelectedLayoutIndex,
    setIsLoading,
    setError: setContextError,
    fetchAllExplanations,
    setExplanations,
    isLayoutsCacheValid,
    saveOriginalLayout,
    originalLayout,
    invalidateLayoutsCache,
  } = useGuests();

  // Track previous venue to detect changes
  const previousVenueIdRef = React.useRef<string | null>(selectedVenueLayout?.id || null);

  // Initialize local layouts from cache if available
  const [layouts, setLocalLayouts] = useState<TotLayout[]>(() => {
    // Check if we have valid cached layouts on mount
    return cachedLayouts.length > 0 ? cachedLayouts : [];
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStrategy, setCurrentStrategy] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(12);
  const [error, setError] = useState<string | null>(null);
  // Track if we've determined whether to fetch (either from cache hit or actual fetch)
  const [hasFetched, setHasFetched] = useState(false);

  // Clear layouts when venue changes
  useEffect(() => {
    const currentVenueId = selectedVenueLayout?.id || null;
    const previousVenueId = previousVenueIdRef.current;

    if (previousVenueId !== null && currentVenueId !== previousVenueId && currentVenueId !== null) {
      console.log('Venue changed - clearing old recommendations', { previousVenueId, currentVenueId });
      setLocalLayouts([]);
      setLayouts([]);
      setSelectedLayoutIndex(-1);
      invalidateLayoutsCache();
      setHasFetched(false);
      fetchStartedRef.current = false;
    }

    previousVenueIdRef.current = currentVenueId;
  }, [selectedVenueLayout?.id, setLayouts, setSelectedLayoutIndex, invalidateLayoutsCache]);

  // Strategy display names for loading experience
  const strategyDisplayNames: Record<string, string> = {
    'baseline': 'Balanced Approach',
    'boost_family': 'Family Priority',
    'boost_social': 'Friend Groups Priority',
    'max_cohesion': 'Maximum Togetherness',
    'max_mingling': 'Maximum Mixing',
    'reduce_social': 'Flexible Groupings',
  };

  // Compute all layout titles at once to ensure uniqueness
  const layoutTitles = useMemo(() => {
    if (layouts.length === 0) return [];
    if (layouts.length === 1) return ['Your Optimized Seating'];

    const titles: string[] = [];
    const usedTitles = new Set<string>();

    // Available title options in priority order
    const titleOptions = [
      { key: 'recommended', title: 'Recommended', condition: (idx: number) => idx === 0 },
      { key: 'family', title: 'Family Focused', condition: (_: number, f: number, s: number, m: number) => f >= s && f >= m },
      { key: 'social', title: 'Friends Together', condition: (_: number, f: number, s: number, m: number) => s > f && s >= m },
      { key: 'mixing', title: 'Mix & Mingle', condition: (_: number, f: number, s: number, m: number) => m > f && m > s },
    ];

    // Fallback titles if primary ones are taken
    const fallbackTitles = ['Alternative Plan', 'Option B', 'Option C'];

    layouts.forEach((entry, index) => {
      const family = entry.layout.objective_breakdown?.family_cohesion || 0;
      const social = entry.layout.objective_breakdown?.social_group_cohesion || 0;
      const mixing = entry.layout.objective_breakdown?.side_mixing || 0;

      let assignedTitle = '';

      // First option is always "Recommended"
      if (index === 0) {
        assignedTitle = 'Recommended';
      } else {
        // Find the best fitting title that hasn't been used
        for (const opt of titleOptions.slice(1)) { // Skip 'recommended' for non-first
          if (!usedTitles.has(opt.title) && opt.condition(index, family, social, mixing)) {
            assignedTitle = opt.title;
            break;
          }
        }

        // If no unique title found, use fallback
        if (!assignedTitle) {
          for (const fallback of fallbackTitles) {
            if (!usedTitles.has(fallback)) {
              assignedTitle = fallback;
              break;
            }
          }
        }

        // Last resort
        if (!assignedTitle) {
          assignedTitle = `Plan ${index + 1}`;
        }
      }

      usedTitles.add(assignedTitle);
      titles.push(assignedTitle);
    });

    return titles;
  }, [layouts]);

  // Helper to get value proposition text (always positive framing)
  const getValueProposition = (title: string): string => {
    // Always frame positively - focus on what IS achieved, not scores
    if (title === 'Recommended') {
      return 'Our top pick based on your guest relationships';
    }
    if (title === 'Your Optimized Seating') {
      return 'The best arrangement for your celebration';
    }
    if (title === 'Family Focused') {
      return 'Keeps family members close together';
    }
    if (title === 'Friends Together') {
      return 'Friend groups stay at the same tables';
    }
    if (title === 'Mix & Mingle') {
      return 'Great for making new connections';
    }
    if (title === 'Alternative Plan') {
      return 'Another great option to consider';
    }
    // Default - always positive
    return 'A balanced arrangement for your celebration';
  };

  // Helper to convert score to quality indicator (for bar display)
  const getQualityLabel = (score: number): string => {
    if (score >= 70) return 'Strong';
    if (score >= 40) return 'Good';
    return 'Mixed';
  };


  // Use ref to prevent double-fetch in StrictMode (ref persists across re-renders)
  const fetchStartedRef = useRef(false);

  // Check if we have the required data
  const hasRequiredData = guests.length > 0 && tables.length > 0;

  // Build the request payload from context
  const requestPayload: LayoutRequest | null = useMemo(() => {
    if (!hasRequiredData) return null;

    return {
      ...prepareDataForApi(guests, tables),
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

    // Check if we have valid cached layouts
    if (isLayoutsCacheValid()) {
      console.log('Using cached layouts - cache is valid');
      setLocalLayouts(cachedLayouts);
      setLayouts(cachedLayouts); // Also update context
      setHasFetched(true);
      return;
    }

    console.log('Cache invalid or empty - fetching new layouts');

    // Mark fetch as started immediately (before async call)
    fetchStartedRef.current = true;

    const fetchLayouts = async () => {
      setLoading(true);
      setIsLoading(true);
      setSelectedLayoutIndex(-1);
      setError(null);
      setProgress(0);
      setCurrentStrategy(null);
      setCurrentStep(0);

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
                if (event.strategy) setCurrentStrategy(event.strategy);
                if (event.currentStep !== undefined) setCurrentStep(event.currentStep);
                if (event.totalSteps !== undefined) setTotalSteps(event.totalSteps);
              } else if (event.type === 'result') {
                const fetchedLayouts = event.layouts ?? [];
                setLocalLayouts(fetchedLayouts);
                setLayoutsWithCacheKey(fetchedLayouts); // This also updates context layouts
                setHasFetched(true);
                console.log(`Received ${fetchedLayouts.length} layout recommendations`);
                // Save the first layout as original when layouts are first generated
                if (fetchedLayouts.length > 0 && !originalLayout && selectedLayoutIndex >= 0) {
                  setTimeout(() => saveOriginalLayout(), 100);
                }
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
  }, [hasRequiredData, hasFetched, requestPayload, isLayoutsCacheValid, cachedLayouts]);



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
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
        {/* Header - Matching Venue Style */}
        <div className="mb-4 text-center max-w-3xl mx-auto">
          <h2 className="flex items-center justify-center gap-3 font-display text-5xl text-text-main dark:text-white mb-4">
            Optimized Seating Plans
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg font-light leading-relaxed">
            {layouts.length <= 1
              ? "We've analyzed your guest list and found the optimal seating arrangement based on your constraints."
              : "We've turned your guest list into a social masterpiece. Explore these AI-curated arrangements, each designed to create a unique atmosphere for your celebration."}
          </p>
          {selectedVenueLayout && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white/50 dark:bg-black/20 rounded-full text-xs text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
              <span className="material-icons-round text-primary text-xs">{selectedVenueLayout.icon || 'location_on'}</span>
              <span className="font-medium">{selectedVenueLayout.name}</span>
              <span className="text-gray-400">•</span>
              <span className="material-icons-outlined text-xs text-gray-500">people</span>
              <span>{guests.length} Guests</span>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex flex-col justify-center items-center py-8 relative overflow-hidden">
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
        @keyframes fade-slide-in {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-slide-out {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        .animate-fade-slide-in {
          animation: fade-slide-in 0.4s ease-out forwards;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
              `}
            </style>

            {/* Background Ambient Glow */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
              <div className="w-64 h-64 bg-primary/30 rounded-full blur-3xl animate-pulse"></div>
            </div>

            {/* Animated Logo Construction */}
            <div className="relative flex items-center gap-3 mb-6 z-10 scale-110 transform">
              <span className="material-icons-round text-4xl text-primary animate-heartbeat drop-shadow-sm">favorite</span>
              <h1 className="font-display text-4xl text-text-main dark:text-secondary tracking-tight">
                Seat<span className="italic relative">
                  Harmony
                </span>
              </h1>
            </div>

            {/* Time Estimate Banner */}
            <div className="mb-4 px-4 py-2 bg-white/50 dark:bg-black/20 rounded-xl border border-gray-100 dark:border-gray-700 max-w-sm z-10">
              <p className="text-xs text-gray-600 dark:text-gray-300 text-center">
                Estimated time: <strong>~4 minutes</strong>
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center mt-1">
                Analyzing {totalSteps} seating strategies to find your best options
              </p>
            </div>

            {/* Loading Progress & Text */}
            <div className="flex flex-col items-center gap-3 z-10 w-full max-w-md">
              {/* Progress bar with step indicators */}
              <div className="w-full">
                <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700/50 rounded-full overflow-hidden relative shadow-inner">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.max(5, progress)}%` }}
                  >
                    <div className="w-full h-full bg-gradient-to-r from-transparent to-white/30"></div>
                  </div>
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                  <span>Strategy {currentStep} of {totalSteps}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
              </div>

              {/* Carousel-style live text */}
              <div className="h-20 flex flex-col items-center justify-center overflow-hidden">
                {/* Current strategy with animated icon */}
                <div className="flex items-center gap-2 mb-1 animate-fade-slide-in" key={currentStrategy || 'init'}>
                  <span className={`material-icons-round text-xl animate-float ${currentStrategy === 'boost_family' ? 'text-primary' :
                    currentStrategy === 'boost_social' ? 'text-secondary' :
                      currentStrategy === 'max_mingling' ? 'text-accent' :
                        currentStrategy === 'max_cohesion' ? 'text-primary' :
                          'text-gray-500'
                    }`}>
                    {currentStrategy === 'boost_family' ? 'family_restroom' :
                      currentStrategy === 'boost_social' ? 'groups' :
                        currentStrategy === 'max_mingling' ? 'sync_alt' :
                          currentStrategy === 'max_cohesion' ? 'hub' :
                            currentStrategy === 'reduce_social' ? 'tune' :
                              currentStrategy === 'baseline' ? 'balance' :
                                'auto_awesome'}
                  </span>
                  <p className="font-display text-lg text-gray-700 dark:text-gray-200">
                    {currentStrategy ? (strategyDisplayNames[currentStrategy] || currentStrategy) : 'Initializing...'}
                  </p>
                </div>

                {/* Strategy-specific description */}
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs animate-fade-slide-in"
                  key={`desc-${currentStrategy || 'init'}`}>
                  {currentStrategy === 'boost_family' ? 'Keeping your loved ones close at every table' :
                    currentStrategy === 'boost_social' ? 'Ensuring friend groups stay together' :
                      currentStrategy === 'max_mingling' ? 'Creating connections between both families' :
                        currentStrategy === 'max_cohesion' ? 'Maximizing togetherness for all groups' :
                          currentStrategy === 'reduce_social' ? 'Exploring flexible seating options' :
                            currentStrategy === 'baseline' ? 'Finding the perfect balance for everyone' :
                              'Preparing your personalized seating analysis...'}
                </p>
              </div>

              {/* Wedding tips carousel - one per step */}
              {(() => {
                const weddingTips = [
                  "Send save-the-dates 6-8 months in advance",
                  "Book your photographer at least 12 months ahead",
                  "Create a dedicated wedding email address",
                  "Schedule hair & makeup trial 2-3 months before",
                  "Break in your wedding shoes at home first",
                  "Assign a day-of point person for vendors",
                  "Practice reading your vows aloud beforehand",
                  "Pack an emergency kit for the big day",
                  "Don't forget to feed your vendors!",
                  "Schedule alone time with your partner",
                  "Try a Polaroid guest book for memories",
                  "Almost there! Great seating makes great parties",
                ];
                const tipIndex = Math.min(currentStep, weddingTips.length) - 1;
                const tip = weddingTips[Math.max(0, tipIndex)] || weddingTips[0];

                return (
                  <div className="mt-2 px-4 py-2 bg-secondary/20 dark:bg-secondary/10 rounded-xl border border-secondary/30 max-w-md">
                    <p className="text-xs text-gray-700 dark:text-gray-300 text-center font-medium animate-fade-slide-in whitespace-nowrap"
                      key={`tip-${currentStep}`}>
                      <span className="mr-2">💡</span>{tip}
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {
          error && (
            <div className="max-w-xl mx-auto mb-6 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-200 flex items-start gap-2">
              <span className="material-icons-round text-base mt-0.5">error</span>
              <div>
                <p className="font-semibold mb-1">Couldn&apos;t reach the ToT backend</p>
                <p>{error}</p>
                <p className="mt-1 text-xs text-red-600/80 dark:text-red-200/80">
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

        {/* Optimal Solution Message - Show when only 1 unique layout found */}
        {!loading && !error && layouts.length === 1 && (
          <div className="mb-4 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 rounded-2xl border border-primary/20 dark:border-primary/30 max-w-2xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-primary/20 dark:bg-primary/30 rounded-full flex items-center justify-center">
                <span className="material-icons-round text-primary text-xl">auto_awesome</span>
              </div>
              <div>
                <h3 className="font-display text-base text-text-main dark:text-white mb-1">
                  We Found Your Optimal Seating!
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  Based on your guest list and constraints, we've identified the best possible seating arrangement.
                  <span className="block mt-1 font-medium text-primary dark:text-primary-light">
                    Select it below and make any personal adjustments in the Planner.
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Legend - Explains metrics once for all cards */}
        {!loading && !error && layouts.length > 0 && (
          <div className="mb-3 max-w-3xl mx-auto">
            <div className="bg-white/60 dark:bg-surface-dark/60 rounded-xl border border-gray-100 dark:border-gray-700 p-3">
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <span className="material-icons-round text-xs text-primary">family_restroom</span>
                  <span><strong>Family</strong> — keeps relatives together</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-icons-round text-xs text-secondary">groups</span>
                  <span><strong>Friends</strong> — keeps friend groups together</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-icons-round text-xs text-accent">sync_alt</span>
                  <span><strong>Mixing</strong> — bride & groom sides interact</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={`grid gap-6 items-start ${layouts.length === 1
          ? 'grid-cols-1 max-w-md mx-auto'
          : layouts.length === 2
            ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto'
            : 'grid-cols-1 md:grid-cols-3'
          }`}>
          {layouts.map((entry: TotLayout, index: number) => {
            const { layout } = entry;

            // Get metrics
            const family = layout.objective_breakdown?.family_cohesion || 0;
            const social = layout.objective_breakdown?.social_group_cohesion || 0;
            const mixing = layout.objective_breakdown?.side_mixing || 0;

            // Get unique title from pre-computed array
            const title = layoutTitles[index] || `Plan ${index + 1}`;
            const valueProposition = getValueProposition(title);

            return (
              <div
                key={index}
                onClick={() => {
                  setSelectedLayoutIndex(index);
                  // The original layout will be saved automatically in setSelectedLayoutIndex
                }}
                className={`group relative bg-white dark:bg-surface-dark rounded-xl transition-all duration-300 overflow-hidden border cursor-pointer h-full flex flex-col scale-95 hover:scale-100
                  border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary hover:shadow-lg`}
              >
                {/* Minimal top accent */}
                <div className={`h-1 ${index === 0 ? 'bg-primary' : index === 1 ? 'bg-secondary' : 'bg-accent'}`}></div>

                <div className="p-5 flex-grow flex flex-col">
                  {/* Badge row - fixed height for alignment */}
                  <div className="h-4 mb-1">
                    {index === 0 && layouts.length > 1 && (
                      <span className="inline-block text-[10px] font-bold text-white bg-primary px-2 py-0.5 rounded-full uppercase tracking-wide">
                        Top Pick
                      </span>
                    )}
                  </div>

                  {/* Title - fixed height */}
                  <h2 className="font-display text-lg text-text-main dark:text-white h-6 mb-2">
                    {title}
                  </h2>

                  {/* Value proposition - fixed height container */}
                  <div className={`mb-3 p-2.5 rounded-lg border-l-4 min-h-[44px] flex items-center ${index === 0 ? 'border-l-primary bg-primary/5' :
                    index === 1 ? 'border-l-secondary bg-secondary/5' :
                      'border-l-accent bg-accent/5'
                    }`}>
                    <p className="text-xs text-gray-600 dark:text-gray-300">{valueProposition}</p>
                  </div>

                  {/* Metrics breakdown */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center text-xs h-4">
                      <span className="text-gray-500 flex items-center gap-1.5 w-16 flex-shrink-0">
                        <span className="material-icons-round text-[10px] text-gray-400">family_restroom</span>
                        Family
                      </span>
                      <div className="flex items-center gap-2 ml-auto">
                        <div className="flex gap-0.5 w-[52px]">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className={`w-2 h-2.5 rounded-sm ${i < Math.ceil(family / 20) ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center text-xs h-4">
                      <span className="text-gray-500 flex items-center gap-1.5 w-16 flex-shrink-0">
                        <span className="material-icons-round text-[10px] text-gray-400">groups</span>
                        Friends
                      </span>
                      <div className="flex items-center gap-2 ml-auto">
                        <div className="flex gap-0.5 w-[52px]">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className={`w-2 h-2.5 rounded-sm ${i < Math.ceil(social / 20) ? 'bg-secondary' : 'bg-gray-200 dark:bg-gray-700'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center text-xs h-4">
                      <span className="text-gray-500 flex items-center gap-1.5 w-16 flex-shrink-0">
                        <span className="material-icons-round text-[10px] text-gray-400">sync_alt</span>
                        Mixing
                      </span>
                      <div className="flex items-center gap-2 ml-auto">
                        <div className="flex gap-0.5 w-[52px]">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className={`w-2 h-2.5 rounded-sm ${i < Math.ceil(mixing / 20) ? 'bg-accent' : 'bg-gray-200 dark:bg-gray-700'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {layout.summary && layout.summary.hard_violations.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <p className="text-[10px] text-red-600 dark:text-red-400">
                        {layout.summary.hard_violations.length} constraint{layout.summary.hard_violations.length > 1 ? 's' : ''} un-met
                      </p>
                    </div>
                  )}
                </div>
                <div className="px-5 pb-4 mt-auto">
                  <button className={`w-full py-2 text-xs font-medium rounded-lg transition-colors ${layouts[selectedLayoutIndex]?.layout === layout // Check if this layout is currently selected
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 group-hover:bg-primary/10 group-hover:text-primary'
                    }`}>
                    {layouts[selectedLayoutIndex]?.layout === layout ? 'Selected' : 'Select'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Helpful note */}
        {!loading && layouts.length > 0 && (
          <div className="mt-6 text-center pb-24">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <span className="material-icons-round text-[10px] align-middle mr-1">info</span>
              You can always come back here to try a different arrangement
            </p>
          </div>
        )}
      </div >

      {/* Sticky Bottom Bar */}
      {selectedLayoutIndex !== -1 && layouts[selectedLayoutIndex] && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/60 dark:bg-surface-dark/60 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 shadow-lg z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                <span className="material-icons-round text-2xl">auto_awesome</span>
              </div>
              <div>
                <h4 className="font-display text-lg text-text-main dark:text-white">
                  {layoutTitles[selectedLayoutIndex] || 'Selected Plan'}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {getValueProposition(layoutTitles[selectedLayoutIndex])}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setExplanations({});
                  fetchAllExplanations();
                  navigate('/planner');
                }}
                className="px-6 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 bg-primary text-white hover:bg-[#777b63]"
              >
                Confirm & Continue
                <span className="material-icons-round">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spacer for bottom bar */}
      {selectedLayoutIndex !== -1 && layouts[selectedLayoutIndex] && <div className="h-24"></div>}
    </div >
  );
};

export default Recommendations;
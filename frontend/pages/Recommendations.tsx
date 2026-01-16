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
    setIsLoading,
    setError: setContextError,
    fetchAllExplanations,
    setExplanations,
  } = useGuests();

  const [layouts, setLayouts] = useState<TotLayout[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStrategy, setCurrentStrategy] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(12);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Strategy display names for loading experience
  const strategyDisplayNames: Record<string, string> = {
    'baseline': 'Balanced Approach',
    'boost_family': 'Family Priority',
    'boost_social': 'Friend Groups Priority',
    'max_cohesion': 'Maximum Togetherness',
    'max_mingling': 'Maximum Mixing',
    'reduce_social': 'Flexible Groupings',
  };

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
  const [isConfirming, setIsConfirming] = useState(false);


  // Handle layout preview selection
  const handlePreviewLayout = (index: number) => {
    setPreviewIndex(index);
  };

  // Confirm selection, pre-fetch explanations, and navigate
  const handleConfirmLayout = async () => {
    if (previewIndex === null) return;

    setIsConfirming(true);

    // Set the selected layout index first
    setSelectedLayoutIndex(previewIndex);

    // Clear old explanations and fetch new ones for the selected layout
    setExplanations({});

    try {
      // Pre-fetch explanations in the background
      // We don't await this - let it run while navigating
      fetchAllExplanations();

      // Small delay to let the state update before navigating
      await new Promise(resolve => setTimeout(resolve, 100));

      navigate('/planner');
    } catch (err) {
      console.error('Error during layout confirmation:', err);
      navigate('/planner');
    } finally {
      setIsConfirming(false);
    }
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
            {layouts.length <= 1 
              ? "We've analyzed your guest list and found the optimal seating arrangement based on your constraints."
              : "We've turned your guest list into a social masterpiece. Explore these AI-curated arrangements, each designed to create a unique atmosphere for your celebration."}
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
            <div className="relative flex items-center gap-3 mb-8 z-10 scale-125 transform">
              <span className="material-icons-round text-5xl text-primary animate-heartbeat drop-shadow-sm">favorite</span>
              <h1 className="font-display text-5xl text-text-main dark:text-secondary tracking-tight">
                Seat<span className="italic relative">
                  Harmony
                </span>
              </h1>
            </div>

            {/* Time Estimate Banner */}
            <div className="mb-6 px-4 py-3 bg-white/50 dark:bg-black/20 rounded-xl border border-gray-100 dark:border-gray-700 max-w-sm z-10">
              <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
                Estimated time: <strong>~4 minutes</strong>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                Analyzing {totalSteps} seating strategies to find your best options
              </p>
            </div>

            {/* Loading Progress & Text */}
            <div className="flex flex-col items-center gap-4 z-10 w-full max-w-md">
              {/* Progress bar with step indicators */}
              <div className="w-full">
                <div className="h-2 w-full bg-gray-200 dark:bg-gray-700/50 rounded-full overflow-hidden relative shadow-inner">
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
              <div className="h-24 flex flex-col items-center justify-center overflow-hidden">
                {/* Current strategy with animated icon */}
                <div className="flex items-center gap-2 mb-2 animate-fade-slide-in" key={currentStrategy || 'init'}>
                  <span className={`material-icons-round text-2xl animate-float ${
                    currentStrategy === 'boost_family' ? 'text-primary' :
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
                  <p className="font-display text-xl text-gray-700 dark:text-gray-200">
                    {currentStrategy ? (strategyDisplayNames[currentStrategy] || currentStrategy) : 'Initializing...'}
                  </p>
                </div>

                {/* Strategy-specific description */}
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs animate-fade-slide-in"
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
                  "Send save-the-dates 6-8 months before your wedding date",
                  "Book your photographer early — the best ones get reserved 12+ months ahead",
                  "Create a wedding email address to keep all vendor communications organized",
                  "Schedule your hair and makeup trial 2-3 months before the big day",
                  "Break in your wedding shoes at home to avoid blisters on the dance floor",
                  "Assign a point person to handle vendor questions on wedding day — not you!",
                  "Write personal vows? Practice reading them aloud to time them perfectly",
                  "Pack an emergency kit: stain remover, pain relievers, sewing kit, and snacks",
                  "Feed your vendors! Happy photographers and DJs go the extra mile",
                  "Schedule 15 minutes of alone time with your partner during the reception",
                  "Tip: Guest book alternatives like Polaroid albums create lasting memories",
                  "Almost there! Your seating plan will set the tone for an amazing celebration",
                ];
                const tipIndex = Math.min(currentStep, weddingTips.length) - 1;
                const tip = weddingTips[Math.max(0, tipIndex)] || weddingTips[0];

                return (
                  <div className="mt-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg max-w-sm">
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center italic animate-fade-slide-in"
                       key={`tip-${currentStep}`}>
                      💡 {tip}
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
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

        {/* Optimal Solution Message - Show when only 1 unique layout found */}
        {!loading && !error && layouts.length === 1 && (
          <div className="mb-8 p-6 bg-gradient-to-r from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 rounded-2xl border border-primary/20 dark:border-primary/30">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-primary/20 dark:bg-primary/30 rounded-full flex items-center justify-center">
                <span className="material-icons-round text-primary text-2xl">auto_awesome</span>
              </div>
              <div>
                <h3 className="font-display text-lg text-text-main dark:text-white mb-1">
                  We Found Your Optimal Seating!
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  Based on your guest list and constraints, we've identified the best possible seating arrangement. 
                  This layout maximizes family cohesion, social connections, and table balance.
                  <span className="block mt-2 font-medium text-primary dark:text-primary-light">
                    Feel free to select it and make any personal adjustments in the Planner.
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className={`grid gap-8 items-start ${
          layouts.length === 1
            ? 'grid-cols-1 max-w-lg mx-auto'
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

            // Compare against other layouts to find what makes THIS one unique
            const allMetrics = layouts.map(l => ({
              family: l.layout.objective_breakdown?.family_cohesion || 0,
              social: l.layout.objective_breakdown?.social_group_cohesion || 0,
              mixing: l.layout.objective_breakdown?.side_mixing || 0,
            }));

            // Find max values across all layouts
            const maxFamily = Math.max(...allMetrics.map(m => m.family));
            const maxSocial = Math.max(...allMetrics.map(m => m.social));
            const maxMixing = Math.max(...allMetrics.map(m => m.mixing));

            // Determine what this layout is BEST at (relative to others)
            const isBestFamily = family === maxFamily && family > Math.min(...allMetrics.map(m => m.family)) + 5;
            const isBestSocial = social === maxSocial && social > Math.min(...allMetrics.map(m => m.social)) + 5;
            const isBestMixing = mixing === maxMixing && mixing > Math.min(...allMetrics.map(m => m.mixing)) + 5;

            // Calculate the key differentiator - what stands out most
            const familyDiff = family - (allMetrics.reduce((sum, m) => sum + m.family, 0) / allMetrics.length);
            const socialDiff = social - (allMetrics.reduce((sum, m) => sum + m.social, 0) / allMetrics.length);
            const mixingDiff = mixing - (allMetrics.reduce((sum, m) => sum + m.mixing, 0) / allMetrics.length);

            // Determine title and highlight based on what's unique about this option
            let title = '';
            let highlight = '';
            let highlightValue = '';

            if (isBestMixing && Math.abs(mixingDiff) >= Math.abs(familyDiff) && Math.abs(mixingDiff) >= Math.abs(socialDiff)) {
              title = 'Maximum Mingling';
              highlight = 'Best for mixing both sides';
              highlightValue = `${Math.round(mixing)}% mixing`;
            } else if (isBestFamily && Math.abs(familyDiff) >= Math.abs(socialDiff)) {
              title = 'Family Priority';
              highlight = 'Best for keeping families together';
              highlightValue = `${Math.round(family)}% family cohesion`;
            } else if (isBestSocial) {
              title = 'Friends First';
              highlight = 'Best for keeping friend groups intact';
              highlightValue = `${Math.round(social)}% friend groups`;
            } else if (mixing > family && mixing > social) {
              title = 'Social Mix';
              highlight = 'Encourages mingling';
              highlightValue = `${Math.round(mixing)}% mixing`;
            } else if (family > social) {
              title = 'Family Focused';
              highlight = 'Prioritizes family seating';
              highlightValue = `${Math.round(family)}% family cohesion`;
            } else {
              title = 'Balanced';
              highlight = 'Well-rounded arrangement';
              highlightValue = `${Math.round((family + social + mixing) / 3)}% overall`;
            }

            // If no clear differentiator, use index-based naming
            if (!isBestFamily && !isBestSocial && !isBestMixing && layouts.length > 1) {
              const indexTitles = ['Primary Choice', 'Alternative A', 'Alternative B'];
              title = indexTitles[index] || `Option ${index + 1}`;
            }

            return (
              <div
                key={index}
                onClick={() => handlePreviewLayout(index)}
                className={`group relative bg-white dark:bg-surface-dark rounded-xl transition-all duration-300 overflow-hidden border cursor-pointer h-full flex flex-col
                  ${previewIndex === index
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-background-light dark:ring-offset-background-dark border-primary shadow-lg'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'}`}
              >
                {/* Minimal top accent */}
                <div className={`h-1 ${index === 0 ? 'bg-primary' : index === 1 ? 'bg-secondary' : 'bg-accent'}`}></div>

                <div className="p-6 flex-grow">
                  {/* Header with unique title */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Option {index + 1}
                      </span>
                      <h2 className="font-display text-xl text-text-main dark:text-white mt-1">
                        {title}
                      </h2>
                    </div>
                    {previewIndex === index && (
                      <span className="text-xs font-semibold text-primary border border-primary rounded-full px-2 py-0.5">
                        Selected
                      </span>
                    )}
                  </div>

                  {/* Key differentiator - what makes this option unique */}
                  {highlight && (
                    <div className={`mb-5 p-3 rounded-lg border-l-4 ${
                      index === 0 ? 'border-l-primary bg-primary/5' :
                      index === 1 ? 'border-l-secondary bg-secondary/5' :
                      'border-l-accent bg-accent/5'
                    }`}>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{highlight}</p>
                      <p className={`text-lg font-display mt-1 ${
                        index === 0 ? 'text-primary' :
                        index === 1 ? 'text-secondary' :
                        'text-accent'
                      }`}>{highlightValue}</p>
                    </div>
                  )}

                  {/* Metrics breakdown - compact */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Family groups</span>
                      <span className={`font-medium ${isBestFamily ? 'text-primary font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                        {Math.round(family)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Friend groups</span>
                      <span className={`font-medium ${isBestSocial ? 'text-secondary font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                        {Math.round(social)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Side mixing</span>
                      <span className={`font-medium ${isBestMixing ? 'text-accent font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                        {Math.round(mixing)}%
                      </span>
                    </div>
                  </div>

                  {layout.summary && layout.summary.hard_violations.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {layout.summary.hard_violations.length} constraint{layout.summary.hard_violations.length > 1 ? 's' : ''} could not be met
                      </p>
                    </div>
                  )}
                </div>
                <div className="px-6 pb-5 mt-auto">
                  <button className={`w-full py-2 text-sm font-medium rounded-lg transition-colors
                    ${previewIndex === index
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                    {previewIndex === index ? 'Selected' : 'Select this option'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sticky Bottom Bar */}
        {previewIndex !== null && layouts[previewIndex] && (
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-surface-dark/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 z-50">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              <div>
                <h4 className="font-display text-lg text-text-main dark:text-white">
                  Option {previewIndex + 1} selected
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Continue to customize your seating arrangement
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPreviewIndex(null)}
                  disabled={isConfirming}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors font-medium text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmLayout}
                  disabled={isConfirming}
                  className="px-8 py-3 bg-primary hover:bg-[#777b63] text-white rounded-xl font-medium transition-all shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-70"
                >
                  {isConfirming ? (
                    <>
                      <span className="material-icons-round text-sm animate-spin">progress_activity</span>
                      <span>Preparing...</span>
                    </>
                  ) : (
                    <>
                      <span>Select & Refine</span>
                      <span className="material-icons-round text-sm">arrow_forward</span>
                    </>
                  )}
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
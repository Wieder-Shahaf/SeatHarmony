import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuests } from '../src/context/GuestContext';
import { VENUE_LAYOUTS, VenueLayout, generateTablesFromVenue } from '../src/types/models';

type CategoryFilter = 'all' | 'indoor' | 'outdoor' | 'banquet' | 'intimate';

const VenueSelection: React.FC = () => {
  const navigate = useNavigate();
  const { setTables, setVenueConfig, setSelectedVenueLayout, totalGuestCount, selectedVenueLayout: savedVenueLayout } = useGuests();
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(savedVenueLayout?.id || null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter venues based on category and search
  const filteredVenues = useMemo(() => {
    return VENUE_LAYOUTS.filter(venue => {
      const matchesCategory = categoryFilter === 'all' || venue.category === categoryFilter;
      const matchesSearch = searchQuery === '' || 
        venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        venue.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, searchQuery]);

  // Get selected venue
  const selectedVenue = useMemo(() => 
    VENUE_LAYOUTS.find(v => v.id === selectedVenueId),
    [selectedVenueId]
  );

  // Check if venue has enough capacity
  const hasEnoughCapacity = (venue: VenueLayout) => {
    return venue.totalCapacity >= totalGuestCount;
  };

  // Handle venue selection and apply to context
  const handleSelectVenue = (venue: VenueLayout) => {
    setSelectedVenueId(venue.id);
  };

  // Apply selected venue and navigate
  const handleConfirmSelection = () => {
    if (!selectedVenue) return;

    // Generate tables from the selected venue layout
    const tables = generateTablesFromVenue(selectedVenue);
    
    // Update context with tables and venue config
    setTables(tables);
    setVenueConfig({
      tables,
      settings: {
        venueId: selectedVenue.id,
        venueName: selectedVenue.name,
        totalCapacity: selectedVenue.totalCapacity,
        category: selectedVenue.category,
        features: selectedVenue.features,
      },
    });
    
    // Save the full venue layout for pipeline use
    setSelectedVenueLayout(selectedVenue);

    console.log(`Applied venue "${selectedVenue.name}" with ${tables.length} tables (saved to localStorage)`);
    
    // Navigate to next step
    navigate('/recommendations');
  };

  const getCategoryIcon = (category: CategoryFilter) => {
    switch (category) {
      case 'indoor': return 'apartment';
      case 'outdoor': return 'deck';
      case 'banquet': return 'restaurant';
      case 'intimate': return 'favorite';
      default: return 'home';
    }
  };

  return (
    <div className="flex-grow max-w-7xl mx-auto px-6 lg:px-8 py-12 w-full">
      {/* Header */}
      <div className="mb-12 text-center max-w-2xl mx-auto">
        <h2 className="flex items-center justify-center gap-3 font-display text-5xl text-text-main dark:text-white mb-4">
          <span className="material-icons-round text-4xl text-primary">domain</span> Select Your Venue Layout
        </h2>
        <p className="text-gray-600 dark:text-gray-300 text-lg font-light leading-relaxed">
          Choose a floor plan that matches your event space. SeatHarmony will optimize seating for your{' '}
          <span className="font-bold text-primary">{totalGuestCount} guests</span>.
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div className="relative w-full md:w-96">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <span className="material-icons-outlined">search</span>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-3 pl-10 pr-4 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark focus:ring-primary focus:border-primary shadow-sm transition-shadow dark:text-white dark:placeholder-gray-500"
            placeholder="Search venues..."
          />
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
          {(['all', 'indoor', 'outdoor', 'banquet', 'intimate'] as CategoryFilter[]).map((category) => (
            <button
              key={category}
              onClick={() => setCategoryFilter(category)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium shadow-sm transition whitespace-nowrap ${
                categoryFilter === category
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary dark:hover:text-primary'
              }`}
            >
              <span className="material-icons-round text-sm">{getCategoryIcon(category)}</span>
              {category === 'all' ? 'All Types' : category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Venues Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
        {filteredVenues.map((venue) => {
          const isSelected = selectedVenueId === venue.id;
          const capacityOk = hasEnoughCapacity(venue);
          
          return (
            <div
              key={venue.id}
              onClick={() => handleSelectVenue(venue)}
              className={`group bg-white dark:bg-surface-dark rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border cursor-pointer transform hover:-translate-y-1 relative 
                ${isSelected
                  ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background-light dark:ring-offset-background-dark'
                  : 'border-gray-100 dark:border-gray-700'}
                ${!capacityOk ? 'opacity-60' : ''}`}
            >
              {/* Selection Check */}
              {isSelected && (
                <div className="absolute top-4 left-4 z-10 bg-primary text-white w-8 h-8 flex items-center justify-center rounded-full shadow-lg">
                  <span className="material-icons-outlined text-lg">check</span>
                </div>
              )}

              {/* Capacity Warning */}
              {!capacityOk && (
                <div className="absolute top-4 left-4 z-10 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <span className="material-icons-round text-sm">warning</span>
                  Too Small
                </div>
              )}

              {/* Image */}
              <div className="relative h-56 bg-gray-100 overflow-hidden">
                <img
                  src={venue.image}
                  alt={venue.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {venue.popular && (
                  <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1">
                    <span className="material-icons-outlined text-sm">stars</span> Popular
                  </div>
                )}
                {/* Category Badge */}
                <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-xs font-medium text-white capitalize flex items-center gap-1">
                  <span className="material-icons-round text-sm">{getCategoryIcon(venue.category)}</span>
                  {venue.category}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="flex items-center gap-2 font-display text-2xl font-medium text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                    <span className="material-icons-round text-secondary">{venue.icon}</span> {venue.name}
                  </h3>
                  <span className={`flex items-center text-sm font-medium px-2 py-1 rounded-md ${
                    capacityOk 
                      ? 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800'
                      : 'text-orange-600 bg-orange-50 dark:bg-orange-900/30'
                  }`}>
                    <span className="material-icons-outlined text-sm mr-1">people</span> {venue.totalCapacity}
                  </span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-2">{venue.description}</p>
                
                {/* Table Info */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {venue.tableTemplates.map((template, idx) => (
                    <span 
                      key={idx}
                      className="text-xs px-2 py-1 bg-secondary/10 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300"
                      title={`${template.nearDanceFloor} to dance floor, ${template.placement}`}
                    >
                      {template.count}× {template.type} ({template.capacity} seats)
                    </span>
                  ))}
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {venue.features.slice(0, 3).map((feature, idx) => (
                    <span 
                      key={idx}
                      className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full"
                    >
                      {feature}
                    </span>
                  ))}
                  {venue.features.length > 3 && (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
                      +{venue.features.length - 3} more
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {venue.tableTemplates.reduce((sum, t) => sum + t.count, 0)} tables total
                  </div>
                  {isSelected ? (
                    <span className="text-primary font-semibold text-sm flex items-center gap-1">
                      <span className="material-icons-round text-sm">check_circle</span> Selected
                    </span>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400 font-medium text-sm group-hover:text-primary transition-colors flex items-center gap-1">
                      Select <span className="material-icons-outlined text-sm">arrow_forward</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* No Results */}
      {filteredVenues.length === 0 && (
        <div className="text-center py-12">
          <span className="material-icons-round text-6xl text-gray-300 dark:text-gray-600">search_off</span>
          <p className="text-gray-500 dark:text-gray-400 mt-4">No venues match your search criteria.</p>
          <button 
            onClick={() => { setSearchQuery(''); setCategoryFilter('all'); }}
            className="mt-4 text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Sticky Bottom Bar */}
      {selectedVenue && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-surface-dark border-t border-gray-200 dark:border-gray-700 shadow-lg z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src={selectedVenue.image} 
                alt={selectedVenue.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div>
                <h4 className="font-display text-lg text-text-main dark:text-white">{selectedVenue.name}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedVenue.tableTemplates.reduce((sum, t) => sum + t.count, 0)} tables • 
                  Capacity: {selectedVenue.totalCapacity} guests
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedVenueId(null)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
              >
                Change
              </button>
              <button
                onClick={handleConfirmSelection}
                disabled={!hasEnoughCapacity(selectedVenue)}
                className={`px-6 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 ${
                  hasEnoughCapacity(selectedVenue)
                    ? 'bg-primary text-white hover:bg-[#777b63]'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Confirm & Continue
                <span className="material-icons-round">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Padding for Sticky Bar */}
      {selectedVenue && <div className="h-24" />}
    </div>
  );
};

export default VenueSelection;

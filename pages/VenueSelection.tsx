import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface Venue {
  id: number;
  name: string;
  icon: string;
  capacity: number;
  description: string;
  image: string;
  popular?: boolean;
  tables: ('round' | 'rect')[];
}

const venues: Venue[] = [
  {
    id: 1,
    name: "Grand Ballroom",
    icon: "celebration",
    capacity: 350,
    description: "A classic, elegant space with high ceilings and a central dance floor. Perfect for large weddings.",
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
    popular: true,
    tables: ['round', 'rect']
  },
  {
    id: 2,
    name: "Garden Pavilion",
    icon: "local_florist",
    capacity: 200,
    description: "Open-air feel with protective covering. Ideal for spring and summer receptions with flexible layouts.",
    image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
    tables: ['round']
  },
  {
    id: 3,
    name: "Modern Banquet",
    icon: "wine_bar",
    capacity: 180,
    description: "Contemporary design with long communal tables. Great for a more intimate, family-style dinner.",
    image: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?q=80&w=1587&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    tables: ['rect']
  }
];

const VenueSelection: React.FC = () => {
  const [selectedVenueId, setSelectedVenueId] = useState<number>(2);

  return (
    <div className="flex-grow max-w-7xl mx-auto px-6 lg:px-8 py-12 w-full">
      <div className="mb-12 text-center max-w-2xl mx-auto">
        <h2 className="flex items-center justify-center gap-3 font-display text-5xl text-text-main dark:text-white mb-4">
          <span className="material-icons-round text-4xl text-primary">domain</span> Select Your Venue Layout
        </h2>
        <p className="text-gray-600 dark:text-gray-300 text-lg font-light leading-relaxed">
          Choose a floor plan that matches your event space. SeatHarmony will optimize seating arrangements based on your selection.
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
            className="w-full py-3 pl-10 pr-4 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark focus:ring-primary focus:border-primary shadow-sm transition-shadow dark:text-white dark:placeholder-gray-500"
            placeholder="Search venues..."
          />
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white font-medium shadow-md hover:bg-opacity-90 transition whitespace-nowrap">
            <span className="material-icons-round text-sm">home</span> All Types
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary dark:hover:text-primary transition whitespace-nowrap">
            <span className="material-icons-round text-sm">apartment</span> Indoor Hall
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary dark:hover:text-primary transition whitespace-nowrap">
            <span className="material-icons-round text-sm">deck</span> Outdoor Tent
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary dark:hover:text-primary transition whitespace-nowrap">
            <span className="material-icons-round text-sm">restaurant</span> Banquet
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
        {venues.map((venue) => {
          const isSelected = selectedVenueId === venue.id;
          return (
            <div
              key={venue.id}
              onClick={() => setSelectedVenueId(venue.id)}
              className={`group bg-white dark:bg-surface-dark rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border cursor-pointer transform hover:-translate-y-1 relative 
                    ${isSelected
                  ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background-light dark:ring-offset-background-dark'
                  : 'border-gray-100 dark:border-gray-700'}`}
            >
              {isSelected && (
                <div className="absolute top-4 left-4 z-10 bg-primary text-white w-8 h-8 flex items-center justify-center rounded-full shadow-lg">
                  <span className="material-icons-outlined text-lg">check</span>
                </div>
              )}

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
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="flex items-center gap-2 font-display text-2xl font-medium text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                    <span className="material-icons-round text-secondary">{venue.icon}</span> {venue.name}
                  </h3>
                  <span className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-md">
                    <span className="material-icons-outlined text-sm mr-1">people</span> {venue.capacity}
                  </span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 line-clamp-2">{venue.description}</p>
                <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex -space-x-2">
                    {venue.tables.map(table => (
                      <div key={table} className={`w-8 h-8 rounded-full ${table === 'round' ? 'bg-secondary' : 'bg-accent'} flex items-center justify-center text-white text-xs border-2 border-white dark:border-surface-dark`} title={`${table === 'round' ? 'Round' : 'Rectangular'} Tables`}>
                        {table === 'round' ? '●' : '■'}
                      </div>
                    ))}
                  </div>
                  {isSelected ? (
                    <span className="text-primary font-semibold text-sm flex items-center gap-1">
                      Current Choice
                    </span>
                  ) : (
                    <Link to="/recommendations" className="text-primary font-semibold text-sm group-hover:underline flex items-center gap-1">
                      Select Layout <span className="material-icons-outlined text-sm">arrow_forward</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center">
        <nav className="flex items-center gap-2">
          <button className="p-2 rounded-lg text-gray-500 hover:text-primary disabled:opacity-50">
            <span className="material-icons-outlined">chevron_left</span>
          </button>
          <button className="w-10 h-10 rounded-lg bg-primary text-white font-medium">1</button>
          <button className="w-10 h-10 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition">2</button>
          <button className="w-10 h-10 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition">3</button>
          <span className="text-gray-400">...</span>
          <button className="p-2 rounded-lg text-gray-500 hover:text-primary">
            <span className="material-icons-outlined">chevron_right</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default VenueSelection;
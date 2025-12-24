import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuests } from '../src/context/GuestContext';
import { GuestGroup } from '../src/types/models';

// Group/Category data structure for display
interface GroupDisplayData {
  id: string;
  name: string;
  category: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  priority: string;
  guestCount: number;
  progress: number;
  avatarBg: string;
  guests: string[]; // Guest names for avatars
  note?: string;
  noteType?: 'info' | 'warning';
  tags?: string[];
}

// Color schemes for groups (cyclic assignment)
const groupStyles = [
  { icon: 'family_restroom', iconBg: 'bg-primary/10', iconColor: 'text-primary', borderColor: 'border-primary', avatarBg: '8A8E75' },
  { icon: 'family_restroom', iconBg: 'bg-blue-100 dark:bg-blue-800', iconColor: 'text-blue-500', borderColor: 'border-blue-400', avatarBg: '3B82F6' },
  { icon: 'school', iconBg: 'bg-slate-100 dark:bg-slate-800', iconColor: 'text-slate-500', borderColor: 'border-slate-400', avatarBg: '94a3b8' },
  { icon: 'work', iconBg: 'bg-secondary/20', iconColor: 'text-text-main', borderColor: 'border-secondary', avatarBg: 'D5C7AD' },
  { icon: 'emoji_people', iconBg: 'bg-purple-100 dark:bg-purple-800', iconColor: 'text-purple-500', borderColor: 'border-purple-400', avatarBg: 'A855F7' },
  { icon: 'home', iconBg: 'bg-green-100 dark:bg-green-800', iconColor: 'text-green-500', borderColor: 'border-green-400', avatarBg: '22C55E' },
  { icon: 'groups', iconBg: 'bg-orange-100 dark:bg-orange-800', iconColor: 'text-orange-500', borderColor: 'border-orange-400', avatarBg: 'F97316' },
  { icon: 'celebration', iconBg: 'bg-pink-100 dark:bg-pink-800', iconColor: 'text-pink-500', borderColor: 'border-pink-400', avatarBg: 'EC4899' },
  { icon: 'favorite', iconBg: 'bg-red-100 dark:bg-red-800', iconColor: 'text-red-500', borderColor: 'border-red-400', avatarBg: 'EF4444' },
  { icon: 'star', iconBg: 'bg-amber-100 dark:bg-amber-800', iconColor: 'text-amber-500', borderColor: 'border-amber-400', avatarBg: 'F59E0B' },
];

// Convert GuestGroup from context to display format
function convertToDisplayData(groups: GuestGroup[]): GroupDisplayData[] {
  return groups.map((group, index) => {
    const style = groupStyles[index % groupStyles.length];
    const guestCount = group.guests.length;
    
    // Determine priority based on keywords in category name
    let priority = 'Standard';
    const nameLower = group.name.toLowerCase();
    if (nameLower.includes('family') || nameLower.includes('parent') || nameLower.includes('sibling')) {
      priority = 'High Priority';
    } else if (nameLower.includes('work') || nameLower.includes('colleague')) {
      priority = 'Mixed Group';
    }
    
    return {
      id: group.id,
      name: group.name,
      category: group.name,
      icon: style.icon,
      iconBg: style.iconBg,
      iconColor: style.iconColor,
      borderColor: style.borderColor,
      priority,
      guestCount,
      progress: 100, // All guests in this group are assigned
      avatarBg: style.avatarBg,
      guests: group.guests.slice(0, 5).map(g => g.name), // First 5 for avatars
    };
  });
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { guests, guestGroups, totalGuestCount } = useGuests();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const filterRef = useRef<HTMLDivElement>(null);

  // Convert context data to display format
  const groupsData = useMemo(() => convertToDisplayData(guestGroups), [guestGroups]);
  
  // Extract unique categories for the filter
  const categories = useMemo(() => 
    ['All Groups', ...Array.from(new Set(groupsData.map(g => g.category)))],
    [groupsData]
  );

  // Redirect to landing if no data (after giving localStorage time to load)
  const [initialized, setInitialized] = useState(false);
  
  useEffect(() => {
    // Wait a tick for localStorage data to load into context
    const timer = setTimeout(() => {
      setInitialized(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    if (initialized && guests.length === 0) {
      navigate('/');
    }
  }, [initialized, guests.length, navigate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle a category in the filter
  const toggleFilter = (category: string) => {
    if (category === 'All Groups') {
      setSelectedFilters([]);
    } else {
      setSelectedFilters(prev => 
        prev.includes(category)
          ? prev.filter(c => c !== category)
          : [...prev, category]
      );
    }
  };

  // Filter groups based on selected categories (show all if none selected)
  const filteredGroups = selectedFilters.length === 0
    ? groupsData
    : groupsData.filter(g => selectedFilters.includes(g.category));

  const totalGuests = totalGuestCount;
  const totalGroups = groupsData.length;
  
  // Count unassigned (uncategorized) guests
  const unassignedCount = useMemo(() => {
    const uncategorizedGroup = groupsData.find(g => g.name === 'Uncategorized');
    return uncategorizedGroup ? uncategorizedGroup.guestCount : 0;
  }, [groupsData]);
  
  // Show loading state if no data yet
  if (guests.length === 0) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="text-center">
          <span className="material-icons-round text-6xl text-primary animate-pulse">hourglass_empty</span>
          <p className="text-gray-500 mt-4">Loading guest data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow p-6 md:p-10 max-w-7xl mx-auto w-full">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-4xl text-text-main dark:text-white mb-2">Guest Group Orientation</h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-xl">
            Our AI has detected <span className="font-bold text-primary">{totalGroups} distinct clusters</span> from your guest list.
            Review these groupings to ensure everyone is seated with their tribe.
          </p>
        </div>
        <div className="flex items-center gap-3 relative" ref={filterRef}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-colors bg-white dark:bg-transparent ${
              selectedFilters.length > 0
                ? 'border-primary text-primary'
                : 'border-secondary text-text-main dark:text-accent hover:bg-secondary/10'
            }`}
          >
            <span className="material-icons-round text-sm">filter_list</span>
            {selectedFilters.length === 0 
              ? 'Filter' 
              : selectedFilters.length === 1 
                ? selectedFilters[0] 
                : `${selectedFilters.length} selected`}
            <span className="material-icons-round text-sm">{isFilterOpen ? 'expand_less' : 'expand_more'}</span>
          </button>

          {/* Dropdown Menu */}
          {isFilterOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-surface-dark rounded-xl shadow-lg border border-secondary/20 dark:border-gray-700 z-50 overflow-hidden">
              <div className="p-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium px-2">Filter by Category</p>
                {selectedFilters.length > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{selectedFilters.length}</span>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {categories.map((category) => {
                  const isSelected = category === 'All Groups' 
                    ? selectedFilters.length === 0 
                    : selectedFilters.includes(category);
                  return (
                    <button
                      key={category}
                      onClick={() => toggleFilter(category)}
                      className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {category === 'All Groups' && <span className="material-icons-round text-sm">apps</span>}
                        {category}
                      </span>
                      <span className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected 
                          ? 'bg-primary border-primary' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {isSelected && <span className="material-icons-round text-xs text-white">check</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
              {selectedFilters.length > 0 && (
                <div className="p-2 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setSelectedFilters([]);
                    }}
                    className="w-full text-center text-sm text-gray-500 hover:text-primary py-2"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-secondary/20 flex flex-col">
          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">
            <span className="material-icons-round text-sm">people</span> Total Guests
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-text-main dark:text-white">{totalGuests}</span>
            <span className="text-green-600 text-sm flex items-center bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
              <span className="material-icons-round text-xs mr-1">check_circle</span> Confirmed
            </span>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-secondary/20 flex flex-col">
          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">
            <span className="material-icons-round text-sm">hourglass_empty</span> Unassigned
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-orange-400">{unassignedCount}</span>
            <span className="text-gray-400 text-sm">Guests pending</span>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-secondary/20 flex flex-col">
          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">
            <span className="material-icons-round text-sm">workspaces</span> Groups
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-primary">{totalGroups}</span>
            <span className="text-gray-400 text-sm">Groups detected</span>
          </div>
        </div>
      </div>

      {/* Active Filter Badges */}
      {selectedFilters.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Showing:</span>
          {selectedFilters.map((filter) => (
            <span 
              key={filter}
              className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
            >
              {filter}
              <button
                onClick={() => toggleFilter(filter)}
                className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
              >
                <span className="material-icons-round text-sm">close</span>
              </button>
            </span>
          ))}
          <span className="text-sm text-gray-400">({filteredGroups.length} group{filteredGroups.length !== 1 ? 's' : ''})</span>
          {selectedFilters.length > 1 && (
            <button
              onClick={() => setSelectedFilters([])}
              className="text-sm text-gray-500 hover:text-primary underline ml-2"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Clusters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
        {filteredGroups.map((group) => (
          <div
            key={group.id}
            className={`bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-md border-t-4 ${group.borderColor} hover:shadow-lg transition-shadow`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`${group.iconBg} ${group.iconColor} p-2 rounded-lg`}>
                  <span className="material-icons-round">{group.icon}</span>
                </div>
                <div>
                  <h3 className="font-display text-xl text-text-main dark:text-white font-semibold">{group.name}</h3>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{group.priority}</p>
                </div>
              </div>
              <button className="text-gray-400 hover:text-primary">
                <span className="material-icons-round">more_vert</span>
              </button>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Size</span>
                <span className="font-bold text-gray-800 dark:text-white">{group.guestCount} Guests</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${group.borderColor.replace('border-', 'bg-')}`}
                  style={{ width: `${group.progress}%` }}
                ></div>
              </div>
              <div className="flex -space-x-2 overflow-hidden py-2">
                {group.guests.slice(0, 3).map((guestName, i) => (
                  <img
                    key={i}
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-surface-dark object-cover"
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(guestName)}&background=${group.avatarBg}&color=fff`}
                    alt={guestName}
                    title={guestName}
                  />
                ))}
                {group.guestCount > 3 && (
                  <div className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-surface-dark bg-gray-100 dark:bg-gray-600 flex items-center justify-center text-xs text-gray-500 dark:text-gray-300 font-medium">
                    +{group.guestCount - 3}
                  </div>
                )}
              </div>
            </div>
            {group.note && (
              <div
                className={`rounded-xl p-3 flex items-start gap-2 ${
                  group.noteType === 'warning'
                    ? 'bg-red-50 dark:bg-red-900/20'
                    : 'bg-secondary/10 dark:bg-gray-700/50'
                }`}
              >
                {group.noteType === 'warning' && (
                  <span className="material-icons-round text-red-400 text-sm mt-0.5">warning</span>
                )}
                <p
                  className={`text-xs italic font-display ${
                    group.noteType === 'warning'
                      ? 'text-red-800 dark:text-red-200'
                      : 'text-text-main dark:text-accent'
                  }`}
                >
                  {group.noteType === 'info' ? `"${group.note}"` : group.note}
                </p>
              </div>
            )}
            {group.tags && group.tags.length > 0 && (
              <div className="bg-secondary/10 dark:bg-gray-700/50 rounded-xl p-3 flex justify-between items-center">
                <div className="flex gap-2">
                  {group.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-white dark:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-200 border border-gray-200 dark:border-gray-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Card - Create New */}
        <div className="border-2 border-dashed border-secondary/50 dark:border-gray-600 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[200px] hover:bg-secondary/10 dark:hover:bg-gray-800 transition-colors cursor-pointer group">
          <div className="h-12 w-12 rounded-full bg-secondary/20 dark:bg-gray-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <span className="material-icons-round text-primary text-2xl">add</span>
          </div>
          <h3 className="font-display text-lg text-text-main dark:text-accent font-medium">Create New Cluster</h3>
          <p className="text-sm text-gray-500 text-center mt-2">Manually group remaining guests</p>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;

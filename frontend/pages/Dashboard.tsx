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
  // 1. Taupe/Beige (Neutral/Warm)
  { icon: 'family_restroom', iconBg: 'bg-[#C1A58D]/20', iconColor: 'text-[#C1A58D]', borderColor: 'border-[#C1A58D]', avatarBg: 'C1A58D' },
  // 2. Deep Teal (Cool/Dark)
  { icon: 'waves', iconBg: 'bg-[#264653]/15', iconColor: 'text-[#264653]', borderColor: 'border-[#264653]', avatarBg: '264653' },
  // 3. Rust Red (Warm/Vibrant)
  { icon: 'school', iconBg: 'bg-[#A63A29]/10', iconColor: 'text-[#A63A29]', borderColor: 'border-[#A63A29]', avatarBg: 'A63A29' },
  // 4. Sage Green (Cool/Light)
  { icon: 'groups', iconBg: 'bg-[#98A593]/20', iconColor: 'text-[#98A593]', borderColor: 'border-[#98A593]', avatarBg: '98A593' },
  // 5. Burnt Orange (Warm/Vibrant)
  { icon: 'whatshot', iconBg: 'bg-[#E76F51]/15', iconColor: 'text-[#E76F51]', borderColor: 'border-[#E76F51]', avatarBg: 'E76F51' },
  // 6. Midnight Blue (Cool/Dark)
  { icon: 'nights_stay', iconBg: 'bg-[#1D3557]/15', iconColor: 'text-[#1D3557]', borderColor: 'border-[#1D3557]', avatarBg: '1D3557' },
  // 7. Muted Terracotta (Warm/Earthy)
  { icon: 'work', iconBg: 'bg-[#B07B62]/20', iconColor: 'text-[#B07B62]', borderColor: 'border-[#B07B62]', avatarBg: 'B07B62' },
  // 8. Olive Drab (Cool/Earthy)
  { icon: 'forest', iconBg: 'bg-[#606C38]/15', iconColor: 'text-[#606C38]', borderColor: 'border-[#606C38]', avatarBg: '606C38' },
  // 9. Dusty Rose (Warm/Soft)
  { icon: 'favorite', iconBg: 'bg-[#C6878F]/20', iconColor: 'text-[#C6878F]', borderColor: 'border-[#C6878F]', avatarBg: 'C6878F' },
  // 10. Slate Blue (Cool/Muted)
  { icon: 'emoji_people', iconBg: 'bg-[#899CA1]/20', iconColor: 'text-[#899CA1]', borderColor: 'border-[#899CA1]', avatarBg: '899CA1' },
  // 11. Metallic Copper (Warm/Rich)
  { icon: 'filter_vintage', iconBg: 'bg-[#B87333]/20', iconColor: 'text-[#B87333]', borderColor: 'border-[#B87333]', avatarBg: 'B87333' },
  // 12. Warm Grey (Neutral/Cool)
  { icon: 'cloud', iconBg: 'bg-[#6B705C]/20', iconColor: 'text-[#6B705C]', borderColor: 'border-[#6B705C]', avatarBg: '6B705C' },
  // 13. Dark Red/Brown (Warm/Dark)
  { icon: 'home', iconBg: 'bg-[#7B3F36]/10', iconColor: 'text-[#7B3F36]', borderColor: 'border-[#7B3F36]', avatarBg: '7B3F36' },
  // 14. Pale Moss (Cool/Light)
  { icon: 'grass', iconBg: 'bg-[#B7B7A4]/25', iconColor: 'text-[#A5A58D]', borderColor: 'border-[#B7B7A4]', avatarBg: 'B7B7A4' },
  // 15. Muted Mustard (Warm/Yellow)
  { icon: 'star', iconBg: 'bg-[#D4A373]/20', iconColor: 'text-[#D4A373]', borderColor: 'border-[#D4A373]', avatarBg: 'D4A373' },
  // 16. Forest Green (Cool/Dark)
  { icon: 'park', iconBg: 'bg-[#2E5D4B]/15', iconColor: 'text-[#2E5D4B]', borderColor: 'border-[#2E5D4B]', avatarBg: '2E5D4B' },
  // 17. Rich Clay (Warm/Orange)
  { icon: 'landscape', iconBg: 'bg-[#A97142]/20', iconColor: 'text-[#A97142]', borderColor: 'border-[#A97142]', avatarBg: 'A97142' },
  // 18. Storm Cloud (Cool/Purple-Grey)
  { icon: 'thunderstorm', iconBg: 'bg-[#4A4E69]/20', iconColor: 'text-[#4A4E69]', borderColor: 'border-[#4A4E69]', avatarBg: '4A4E69' },
  // 19. Sandstone (Warm/Light)
  { icon: 'terrain', iconBg: 'bg-[#E6CCB2]/25', iconColor: 'text-[#DDB892]', borderColor: 'border-[#E6CCB2]', avatarBg: 'E6CCB2' },
  // 20. Artichoke (Cool/Green)
  { icon: 'spa', iconBg: 'bg-[#6B8E23]/20', iconColor: 'text-[#6B8E23]', borderColor: 'border-[#6B8E23]', avatarBg: '6B8E23' },
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
  const { guests, guestGroups, totalGuestCount, updateGuest } = useGuests();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const filterRef = useRef<HTMLDivElement>(null);
  const [filterSearch, setFilterSearch] = useState('');
  const [flippedGroupIds, setFlippedGroupIds] = useState<Set<string>>(new Set());
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});

  const toggleFlip = (id: string) => {
    setFlippedGroupIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
        // Close menu when unflipping
        if (menuOpenGroupId === id) {
          setMenuOpenGroupId(null);
        }
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const [menuOpenGroupId, setMenuOpenGroupId] = useState<string | null>(null);

  const handleDeleteGroup = (groupId: string) => {
    // Find the group from context data
    const groupToDelete = guestGroups.find(g => g.id === groupId);
    if (groupToDelete) {
      // Update each guest's category to 'Uncategorized'
      groupToDelete.guests.forEach(guest => {
        updateGuest(guest.id, { group_id: 'Uncategorized' });
      });
    }
    setMenuOpenGroupId(null);
  };


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
  const filteredGroups = useMemo(() => {
    const groups = selectedFilters.length === 0
      ? groupsData
      : groupsData.filter(g => selectedFilters.includes(g.category));

    // Always sort "Uncategorized" to the end
    return [...groups].sort((a, b) => {
      if (a.name === 'Uncategorized') return 1;
      if (b.name === 'Uncategorized') return -1;
      return 0; // Keep original order for others
    });
  }, [groupsData, selectedFilters]);

  // Filter categories for the dropdown based on search text
  const filteredCategories = useMemo(() => {
    if (!filterSearch) return categories;
    return categories.filter(c =>
      c.toLowerCase().includes(filterSearch.toLowerCase()) ||
      c === 'All Groups' // Always show 'All Groups'
    );
  }, [categories, filterSearch]);

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
          <h2 className="font-display text-4xl text-text-main dark:text-white mb-2">Guest Group Overview</h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-xl">
            Review and organize your guests into logical groups beneath. This helps the AI understand relationships and ensure everyone is seated with their tribe. Scroll
          </p>
        </div>
        <div className="flex items-center gap-3 relative" ref={filterRef}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-colors bg-white dark:bg-transparent ${selectedFilters.length > 0
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
              <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                <div className="relative">
                  <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                  <input
                    type="text"
                    placeholder="Find category..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-text-main dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                </div>
              </div>
              <div className="p-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-300 uppercase tracking-wider font-medium px-2">Filter by Category</p>
                {selectedFilters.length > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{selectedFilters.length}</span>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filteredCategories.map((category) => {
                  const isSelected = category === 'All Groups'
                    ? selectedFilters.length === 0
                    : selectedFilters.includes(category);
                  return (
                    <button
                      key={category}
                      onClick={() => toggleFilter(category)}
                      className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${isSelected
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-gray-700 dark:text-gray-300'
                        }`}
                    >
                      <span className="flex items-center gap-2">
                        {category === 'All Groups' && <span className="material-icons-round text-sm">apps</span>}
                        {category}
                      </span>
                      <span className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected
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
                      setFilterSearch('');
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
          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-300 text-sm font-medium uppercase tracking-wider mb-2">
            <span className="material-icons-round text-sm">people</span> Total Guests
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-text-main dark:text-white">{totalGuests}</span>
            <span className="text-green-800 dark:text-green-300 text-sm flex items-center bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
              <span className="material-icons-round text-xs mr-1">check_circle</span> Confirmed
            </span>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-secondary/20 flex flex-col">
          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-300 text-sm font-medium uppercase tracking-wider mb-2">
            <span className="material-icons-round text-sm">workspaces</span> Groups
          </span>
          <div className="flex items-center gap-2">
            <span className="font-display text-3xl font-bold text-primary">{totalGroups}</span>
            <span className="text-gray-400 text-sm mt-1">Groups Detected</span>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-secondary/20 flex flex-col">
          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-300 text-sm font-medium uppercase tracking-wider mb-2">
            <span className="material-icons-round text-md">person_search</span> Uncategorized
          </span>
          <div className="flex items-center gap-2">
            <span className="font-display text-3xl font-bold text-orange-400">{unassignedCount}</span>
            <span className="text-gray-400 text-sm mt-1">Guests Pending</span>
          </div>
        </div>
      </div>

      {/* Active Filter Badges */}
      {selectedFilters.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-300">Showing:</span>
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
        {filteredGroups.map((group) => {
          const isFlipped = flippedGroupIds.has(group.id);
          const searchQuery = searchQueries[group.id] || '';


          return (
            <div
              key={group.id}
              className="relative h-96 w-full perspective-[1000px] group"
            >
              <div
                className={`relative w-full h-full duration-700 [transform-style:preserve-3d] transition-all shadow-md hover:shadow-lg rounded-2xl ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
              >
                {/* Front Face */}
                <div
                  onClick={() => !isFlipped && toggleFlip(group.id)}
                  className={`absolute inset-0 [backface-visibility:hidden] bg-white dark:bg-surface-dark rounded-2xl p-6 border-t-4 ${group.borderColor} cursor-pointer flex flex-col`}
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
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenGroupId(menuOpenGroupId === group.id ? null : group.id);
                        }}
                        className="text-gray-400 hover:text-primary p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <span className="material-icons-round">more_vert</span>
                      </button>

                      {/* Dropdown Menu */}
                      {menuOpenGroupId === group.id && (
                        <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 p-1.5 z-50 min-w-[180px] animate-in fade-in slide-in-from-top-2 duration-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroup(group.id);
                            }}
                            className="w-full px-3 py-2.5 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100/50 dark:hover:from-red-900/30 dark:hover:to-red-800/20 rounded-lg flex items-center gap-3 transition-all group/delete"
                          >
                            <span className="w-8 h-8 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center group-hover/delete:scale-110 transition-transform">
                              <span className="material-icons-round text-lg text-red-500">delete_outline</span>
                            </span>
                            <div>
                              <span className="block">Delete Group</span>
                              <span className="text-xs text-gray-400 font-normal"></span>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
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
                      className={`rounded-xl p-3 flex items-start gap-2 ${group.noteType === 'warning'
                        ? 'bg-red-50 dark:bg-red-900/20'
                        : 'bg-secondary/10 dark:bg-gray-700/50'
                        }`}
                    >
                      {group.noteType === 'warning' && (
                        <span className="material-icons-round text-red-400 text-sm mt-0.5">warning</span>
                      )}
                      <p
                        className={`text-xs italic font-display ${group.noteType === 'warning'
                          ? 'text-red-800 dark:text-red-200'
                          : 'text-text-main dark:text-accent'
                          }`}
                      >
                        {group.noteType === 'info' ? `"${group.note}"` : group.note}
                      </p>
                    </div>
                  )}

                  {group.tags && group.tags.length > 0 && (
                    <div className="bg-secondary/10 dark:bg-gray-700/50 rounded-xl p-3 flex justify-between items-center mt-auto">
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

                  {/* Tap to flip hint */}
                  <div className="absolute bottom-4 right-4 text-gray-300 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-icons-round text-lg">touch_app</span>
                  </div>
                </div>

                {/* Back Face */}
                <div
                  className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)_translateZ(1px)] bg-white dark:bg-surface-dark rounded-2xl p-6 border-t-4 ${group.borderColor} flex flex-col ${isFlipped ? 'pointer-events-auto z-10' : 'pointer-events-none z-0'}`}
                >
                  <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                    <h3 className="font-display font-bold text-lg text-text-main dark:text-white truncate pr-2">{group.name}</h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFlip(group.id);
                      }}
                      className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <span className="material-icons-round">close</span>
                    </button>
                  </div>

                  <div className="relative mb-3">
                    <span className="material-icons-round absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setSearchQueries(prev => ({ ...prev, [group.id]: e.target.value }))}
                      className="w-full pl-8 pr-2 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-text-main dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto -mx-2 px-2 divide-y divide-gray-50 dark:divide-gray-800 overscroll-contain relative z-20">
                    {group.guests
                      .filter(g => g.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((guestName, idx) => (
                        <div key={idx} className="py-2 flex items-center gap-2">
                          <img
                            className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-surface-dark object-cover"
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(guestName)}&background=${group.avatarBg}&color=fff`}
                            alt={guestName}
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{guestName}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

      </div>

    </div>
  );
};

export default Dashboard;

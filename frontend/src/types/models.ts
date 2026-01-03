/**
 * TypeScript types matching backend Pydantic models
 * These types ensure frontend-backend compatibility for Gurobi and ToT optimization
 */

// Matches backend GuestIn Pydantic model
export interface Guest {
  id: string;
  name: string;
  group_id: string | null;  // Category from Excel - used for clustering
  importance: number;       // 0 = normal, higher = VIP
  tags: string[];           // Optional tags like "vegetarian", "wheelchair"
}

// Matches backend TableIn Pydantic model
export interface Table {
  id: string;
  name: string;
  capacity: number;
  zone: string | null;      // e.g., "front", "back", "dance_floor"
  constraints: Record<string, any>;
}

// Matches backend TotParams Pydantic model
export interface TotParams {
  depth: number;
  branching: number;
  n_generate: number;
  n_evaluate: number;
  top_k: number;
}

// Matches backend LayoutRequest Pydantic model
export interface LayoutRequest {
  guests: Guest[];
  tables: Table[];
  settings: Record<string, any>;
  tot: TotParams;
}

// Constraint summary from optimization
export interface ConstraintSummary {
  satisfied_soft: Record<string, number>;
  violated_soft: Record<string, number>;
  hard_violations: string[];
}

// Layout result from ToT optimization
export interface Layout {
  id: string;
  assignments: Record<string, string>; // guest_id -> table_id
  score: number;
  objective_breakdown: Record<string, number>;
  variant_label: string | null;
  variant_id: string | null;
  summary: ConstraintSummary | null;
}

// ToT layout result with metadata
export interface TotLayout {
  value: number;
  weights: Record<string, number>;
  notes: string;
  layout: Layout;
}

// Response from /api/layouts/generate
export interface LayoutResponse {
  layouts: TotLayout[];
}

// Request for guest explanations
export interface ExplainGuestsRequest {
  guests: Guest[];
  tables: Table[];
  layout: Layout;
  weights: Record<string, number>;
  notes: string;
}

// Response from /api/layouts/explain-guests
export interface GuestExplanationsResponse {
  explanations: Record<string, string>; // guest_id -> explanation text
}

// Group data for Dashboard display (derived from guests)
export interface GuestGroup {
  id: string;
  name: string;           // group_id / category name
  guests: Guest[];
  guestCount: number;
}

// Venue configuration (tables + settings)
export interface VenueConfig {
  tables: Table[];
  settings: Record<string, any>;
}

// Table type for venue layouts
export type TableType = 'round' | 'rectangular';

// Table location relative to dance floor
export type DanceFloorProximity = 'adjacent' | 'near' | 'far';

// Table placement (indoor/outdoor)
export type TablePlacement = 'indoor' | 'outdoor' | 'covered';

// Table template within a venue layout
export interface TableTemplate {
  type: TableType;
  capacity: number;           // Seats per table
  count: number;              // Number of tables of this type
  zone?: string;              // Zone name (e.g., 'front', 'main', 'sides')
  nearDanceFloor: DanceFloorProximity;  // Proximity to dance floor
  placement: TablePlacement;  // Indoor, outdoor, or covered area
}

// Venue layout template
export interface VenueLayout {
  id: string;
  name: string;
  description: string;
  icon: string;
  image: string;
  category: 'indoor' | 'outdoor' | 'banquet' | 'intimate';
  totalCapacity: number;
  tableTemplates: TableTemplate[];
  features: string[];
  popular?: boolean;
}

// 7 Pre-defined Venue Layouts
export const VENUE_LAYOUTS: VenueLayout[] = [
  {
    id: 'grand-ballroom',
    name: 'Grand Ballroom',
    description: 'A classic, elegant space with high ceilings and a central dance floor. Perfect for large weddings with traditional round table seating.',
    icon: 'celebration',
    image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    category: 'indoor',
    totalCapacity: 320, // 8×10 + 12×10 + 15×8 = 80 + 120 + 120
    tableTemplates: [
      { type: 'round', capacity: 10, count: 8, zone: 'inner-ring', nearDanceFloor: 'adjacent', placement: 'indoor' },
      { type: 'round', capacity: 10, count: 12, zone: 'main', nearDanceFloor: 'near', placement: 'indoor' },
      { type: 'round', capacity: 8, count: 15, zone: 'sides', nearDanceFloor: 'far', placement: 'indoor' },
    ],
    features: ['Dance Floor', 'Stage', 'High Ceilings', 'Central Location'],
    popular: true,
  },
  {
    id: 'garden-pavilion',
    name: 'Garden Pavilion',
    description: 'Open-air feel with protective covering. Ideal for spring and summer receptions with flexible round table arrangements.',
    icon: 'local_florist',
    image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    category: 'outdoor',
    totalCapacity: 194, // 7×10 + 6×10 + 8×8 = 70 + 60 + 64
    tableTemplates: [
      { type: 'round', capacity: 10, count: 7, zone: 'pavilion', nearDanceFloor: 'adjacent', placement: 'covered' },
      { type: 'round', capacity: 10, count: 6, zone: 'lawn', nearDanceFloor: 'near', placement: 'outdoor' },
      { type: 'round', capacity: 8, count: 8, zone: 'garden', nearDanceFloor: 'far', placement: 'outdoor' },
    ],
    features: ['Natural Light', 'Garden Views', 'Covered Area', 'Photo Spots'],
  },
  {
    id: 'modern-banquet',
    name: 'Modern Banquet',
    description: 'Contemporary design with long communal tables. Great for intimate, family-style dining with elegant rectangular seating.',
    icon: 'wine_bar',
    image: 'https://cdn.greenvelope.com/blog/wp-content/uploads/Wedding-reception.jpeg',
    category: 'banquet',
    totalCapacity: 174, // 2×14 + 4×12 + 4×12 + 5×10 = 28 + 48 + 48 + 50
    tableTemplates: [
      { type: 'rectangular', capacity: 14, count: 2, zone: 'front', nearDanceFloor: 'adjacent', placement: 'indoor' },
      { type: 'rectangular', capacity: 12, count: 4, zone: 'center', nearDanceFloor: 'near', placement: 'indoor' },
      { type: 'rectangular', capacity: 12, count: 4, zone: 'main', nearDanceFloor: 'near', placement: 'indoor' },
      { type: 'rectangular', capacity: 10, count: 5, zone: 'sides', nearDanceFloor: 'far', placement: 'indoor' },
    ],
    features: ['Family Style', 'Communal Dining', 'Modern Aesthetic', 'Intimate Feel'],
    popular: true,
  },
  {
    id: 'rooftop-terrace',
    name: 'Rooftop Terrace',
    description: 'Stunning city views with a mix of round and cocktail tables. Perfect for sunset ceremonies and evening receptions.',
    icon: 'roofing',
    image: 'https://www.sofitel-frankfurt.com/wp-content/uploads/sites/92/2022/05/08-26-2020-Sofitel-Glam-Wedding-Frankfurt-Diana-Frohm%C3%BCller-Photography-www.dianafrohmueller.com-300-_-1170x780.jpg',
    category: 'outdoor',
    totalCapacity: 142, // 4×8 + 6×8 + 4×8 + 5×6 = 32 + 48 + 32 + 30
    tableTemplates: [
      { type: 'round', capacity: 8, count: 4, zone: 'front', nearDanceFloor: 'adjacent', placement: 'covered' },
      { type: 'round', capacity: 8, count: 6, zone: 'main', nearDanceFloor: 'near', placement: 'covered' },
      { type: 'round', capacity: 8, count: 4, zone: 'lounge', nearDanceFloor: 'far', placement: 'indoor' },
      { type: 'round', capacity: 6, count: 5, zone: 'terrace', nearDanceFloor: 'far', placement: 'outdoor' },
    ],
    features: ['City Views', 'Sunset Location', 'Open Air', 'Cocktail Space'],
  },
  {
    id: 'rustic-barn',
    name: 'Rustic Barn',
    description: 'Charming countryside venue with exposed beams. Long farmhouse tables create a warm, intimate atmosphere.',
    icon: 'cottage',
    image: 'https://cdn0.hitched.co.uk/article/7982/3_2/1280/jpg/152897-preston-court-barn.jpeg',
    category: 'indoor',
    totalCapacity: 156, // 2×12 + 3×14 + 3×14 + 4×12 = 24 + 42 + 42 + 48
    tableTemplates: [
      { type: 'rectangular', capacity: 12, count: 2, zone: 'front', nearDanceFloor: 'adjacent', placement: 'indoor' },
      { type: 'rectangular', capacity: 14, count: 3, zone: 'main-floor', nearDanceFloor: 'near', placement: 'indoor' },
      { type: 'rectangular', capacity: 14, count: 3, zone: 'barn-center', nearDanceFloor: 'near', placement: 'indoor' },
      { type: 'rectangular', capacity: 12, count: 4, zone: 'loft', nearDanceFloor: 'far', placement: 'indoor' },
    ],
    features: ['Exposed Beams', 'Farmhouse Style', 'Warm Lighting', 'Country Charm'],
  },
  {
    id: 'intimate-chapel',
    name: 'Intimate Chapel',
    description: 'A cozy, elegant space for smaller gatherings. Mixed seating with round tables for personal connections.',
    icon: 'church',
    image: 'https://www.elegantweddinginvites.com/wedding-blog/wp-content/uploads/2021/01/romantic-glass-chapel-wedding.jpg',
    category: 'intimate',
    totalCapacity: 86, // 3×8 + 4×8 + 5×6 = 24 + 32 + 30
    tableTemplates: [
      { type: 'round', capacity: 8, count: 3, zone: 'altar', nearDanceFloor: 'adjacent', placement: 'indoor' },
      { type: 'round', capacity: 8, count: 4, zone: 'nave', nearDanceFloor: 'near', placement: 'indoor' },
      { type: 'round', capacity: 6, count: 5, zone: 'sides', nearDanceFloor: 'far', placement: 'indoor' },
    ],
    features: ['Intimate Setting', 'Classic Architecture', 'Natural Acoustics', 'Cozy Atmosphere'],
  },
  {
    id: 'beach-resort',
    name: 'Beach Resort',
    description: 'Oceanfront venue with flexible indoor-outdoor flow. Round tables with ocean views for a relaxed celebration.',
    icon: 'beach_access',
    image: 'https://www.bogmallobeachresort.com/wp-content/themes/resort/images/w01.jpg',
    category: 'outdoor',
    totalCapacity: 208, // 4×10 + 6×10 + 6×10 + 6×8 = 40 + 60 + 60 + 48
    tableTemplates: [
      { type: 'round', capacity: 10, count: 4, zone: 'front', nearDanceFloor: 'adjacent', placement: 'covered' },
      { type: 'round', capacity: 10, count: 6, zone: 'pavilion', nearDanceFloor: 'near', placement: 'covered' },
      { type: 'round', capacity: 10, count: 6, zone: 'patio', nearDanceFloor: 'near', placement: 'outdoor' },
      { type: 'round', capacity: 8, count: 6, zone: 'beachfront', nearDanceFloor: 'far', placement: 'outdoor' },
    ],
    features: ['Ocean Views', 'Beach Access', 'Indoor-Outdoor', 'Sunset Backdrop'],
    popular: true,
  },
];

// Helper to generate tables from a venue layout
export function generateTablesFromVenue(layout: VenueLayout): Table[] {
  const tables: Table[] = [];
  let tableIndex = 1;

  for (const template of layout.tableTemplates) {
    for (let i = 0; i < template.count; i++) {
      tables.push({
        id: `${layout.id}-table-${tableIndex}`,
        name: `Table ${tableIndex}`,
        capacity: template.capacity,
        zone: template.zone || null,
        constraints: {
          tableType: template.type,
          venueId: layout.id,
          nearDanceFloor: template.nearDanceFloor,
          placement: template.placement,
          // Boolean flags for easy filtering in optimization
          isAdjacentToDanceFloor: template.nearDanceFloor === 'adjacent',
          isNearDanceFloor: template.nearDanceFloor === 'adjacent' || template.nearDanceFloor === 'near',
          isIndoor: template.placement === 'indoor',
          isOutdoor: template.placement === 'outdoor',
          isCovered: template.placement === 'covered',
        },
      });
      tableIndex++;
    }
  }

  return tables;
}

// Helper to get venue by ID
export function getVenueById(id: string): VenueLayout | undefined {
  return VENUE_LAYOUTS.find(v => v.id === id);
}

// Default ToT parameters
export const DEFAULT_TOT_PARAMS: TotParams = {
  depth: 2,
  branching: 4,
  n_generate: 4,
  n_evaluate: 4,
  top_k: 3,
};

// Helper to create a guest from Excel row
export function createGuestFromExcel(
  id: string,
  name: string,
  category: string
): Guest {
  return {
    id,
    name,
    group_id: category || null,
    importance: 0,
    tags: [],
  };
}

// Helper to group guests by category
export function groupGuestsByCategory(guests: Guest[]): GuestGroup[] {
  const groupMap = new Map<string, Guest[]>();

  guests.forEach(guest => {
    const groupId = guest.group_id || 'Uncategorized';
    if (!groupMap.has(groupId)) {
      groupMap.set(groupId, []);
    }
    groupMap.get(groupId)!.push(guest);
  });

  return Array.from(groupMap.entries()).map(([name, guests], index) => ({
    id: `group-${index + 1}`,
    name,
    guests,
    guestCount: guests.length,
  }));
}

// Helper to create default tables based on guest count
export function createDefaultTables(guestCount: number, seatsPerTable: number = 10): Table[] {
  const tableCount = Math.ceil(guestCount / seatsPerTable);
  return Array.from({ length: tableCount }, (_, i) => ({
    id: `table-${i + 1}`,
    name: `Table ${i + 1}`,
    capacity: seatsPerTable,
    zone: null,
    constraints: {},
  }));
}


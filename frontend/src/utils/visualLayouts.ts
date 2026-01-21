export interface TablePosition {
    id: string; // "table-1", "table-2", etc. (matching the generated ID sequence)
    x: number;  // Percentage 0-100
    y: number;  // Percentage 0-100
    rotation: number; // Degrees
}

export interface DanceFloorConfig {
    x: number;
    y: number;
    width: number;
    height: number;
    shape: 'rect' | 'circle';
    rotation?: number;
    label?: string;
}

export interface VisualLayoutDef {
    venueId: string;
    width: number;
    height: number;
    danceFloor?: DanceFloorConfig;
    tables: TablePosition[];
}

// Helper to generate circular arrangements
const createCircle = (
    centerX: number,
    centerY: number,
    radiusX: number,
    radiusY: number,
    count: number,
    startAngle: number = 0,
    startIndex: number = 1
): TablePosition[] => {
    const tables: TablePosition[] = [];
    for (let i = 0; i < count; i++) {
        const angle = startAngle + (i / count) * 2 * Math.PI;
        tables.push({
            id: `table-${startIndex + i}`,
            x: centerX + Math.cos(angle) * radiusX,
            y: centerY + Math.sin(angle) * radiusY,
            rotation: 0,
        });
    }
    return tables;
};

// Helper to generate grid/row arrangements
const createGrid = (
    startX: number,
    startY: number,
    cols: number,
    rows: number,
    gapX: number,
    gapY: number,
    startIndex: number = 1,
    rotation: number = 0
): TablePosition[] => {
    const tables: TablePosition[] = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (tables.length >= cols * rows) break;
            tables.push({
                id: `table-${startIndex + tables.length}`,
                x: startX + c * gapX,
                y: startY + r * gapY,
                rotation: rotation,
            });
        }
    }
    return tables;
};

// --- VENUE DEFINITIONS ---

// 1. Grand Ballroom (36 tables)
// Grid layout on the right side
const grandBallroom: VisualLayoutDef = {
    venueId: 'grand-ballroom',
    width: 1200,
    height: 1000,
    danceFloor: { x: 25, y: 50, width: 30, height: 70, shape: 'rect' },
    tables: [
        // Grid of 36 tables (3 columns x 12 rows) on the right side
        ...createGrid(52, 12, 4, 9, 12, 9, 1),
        //createGrid(width, height, start_x, start_y, cell_size, padding, seed)
    ],
    features: [
        { x: 25, y: 4, width: 8, height: 40, type: 'bar', label: 'Main Bar', shape: 'rect', rotation: 90, labelRotation: -90 },
        { x: 100, y: 92, width: 8, height: 8, type: 'restroom', label: 'WC', shape: 'rect' },
        { x: 100, y: 4, width: 8, height: 8, type: 'restroom', label: 'WC', shape: 'rect' },
        { x: 0, y: 92, width: 16, height: 8, type: 'entrance', label: 'Entrance', shape: 'rect' },
        { x: 0, y: 50, width: 25, height: 16, type: 'canopy', label: 'Wedding Canopy', shape: 'circle', rotation: -90 },
        { x: 100, y: 50, width: 40, height: 10, type: 'buffet', label: 'Buffet', shape: 'rect', rotation: 90, labelRotation: -90 },
    ]
};

// 2. Garden Pavilion (20 tables)
// Pavilion area (top) + Lawn (bottom)
const gardenPavilion: VisualLayoutDef = {
    venueId: 'garden-pavilion',
    width: 1200,
    height: 1000,
    danceFloor: { x: 40, y: 51, width: 55, height: 34, shape: 'rect' },
    tables: [
        // Pavilion (8 tables) - Grid 4x2
        ...createGrid(22, 15, 4, 2, 12, 12, 1),

        // Lawn Left (6 tables) - Grid 2x3
        ...createGrid(20, 76, 2, 3, 12, 12, 9),

        // Lawn Right (6 tables) - Grid 2x3
        ...createGrid(50, 76, 2, 3, 12, 12, 15),
    ],
    features: [
        { x: 40, y: -4, width: 48, height: 18, type: 'bar', label: 'Main Bar', shape: 'rect' },
        { x: 81.6, y: 14, width: 8, height: 12, type: 'bar', label: 'Small Bar', shape: 'rect' },
        { x: 0, y: -5, width: 8, height: 8, type: 'restroom', label: 'WC', shape: 'rect' },
        { x: 0, y: 5, width: 8, height: 8, type: 'restroom', label: 'WC', shape: 'rect' },
        { x: 0, y: 90, width: 8, height: 8, type: 'restroom', label: 'WC', shape: 'rect' },
        { x: 0, y: 100, width: 8, height: 8, type: 'restroom', label: 'WC', shape: 'rect' },
        { x: 1, y: 50, width: 10, height: 18, type: 'entrance', label: 'Entrance', shape: 'rect' },
        { x: 90, y: 50, width: 25, height: 55, type: 'canopy', label: 'Wedding Canopy', shape: 'rect' },
        { x: 90, y: 94, width: 25, height: 25, type: 'resting-area', label: 'Resting\nArea', shape: 'rect' },
        { x: 90, y: -4, width: 25, height: 18, type: 'kids-area', label: 'Kids Playing\nArea', shape: 'rect' },
        { x: 95, y: 14, width: 14, height: 12, type: 'kitchen', label: 'Kitchen', shape: 'rect' },
    ]
};

// 3. Modern Banquet (15 tables)
// Long rows
const modernBanquet: VisualLayoutDef = {
    venueId: 'modern-banquet',
    width: 1200,
    height: 1000,
    danceFloor: { x: 92, y: 59, width: 24, height: 52, shape: 'rect', rotation: 90 },
    tables: [
        // Row 1 (2 large head tables)
        ...createGrid(42, 44, 2, 1, 15, 0, 1),
        // Row 2 (4 tables)
        ...createGrid(30, 0, 5, 1, 15, 0, 3),
        // Row 3 (4 tables)
        ...createGrid(30, 22, 5, 1, 15, 0, 7),
        // Row 4 (5 tables)
        ...createGrid(35, 67, 5, 1, 15, 0, 11),
    ],
    features: [
        { x: 5, y: 2, width: 22, height: 20, type: 'bar', label: 'Main Bar', shape: 'rect' },
        { x: 63, y: 94, width: 7, height: 5, type: 'restroom', label: 'WC', shape: 'rect' },
        { x: 63, y: 100, width: 7, height: 5, type: 'restroom', label: 'WC', shape: 'rect' },
        { x: 37, y: 94, width: 7, height: 5, type: 'restroom', label: 'WC', shape: 'rect' },
        { x: 37, y: 100, width: 7, height: 5, type: 'restroom', label: 'WC', shape: 'rect' },
        { x: 50, y: 97, width: 16, height: 14, type: 'entrance', label: 'Entrance', shape: 'rect' },
        { x: 5, y: 56, width: 22, height: 55, type: 'canopy', label: 'Wedding Canopy', shape: 'rect' },
        { x: 4, y: 97, width: 16, height: 10, type: 'present-table', label: 'Presents', shape: 'rect' },
        { x: 5, y: 20, width: 22, height: 8, type: 'cake', label: 'Cake & Pastries', shape: 'rect' },
        { x: 90, y: 97, width: 28, height: 12, type: 'kids-area', label: 'Kids Playing\nArea', shape: 'rect' },
        { x: 22, y: 97, width: 10, height: 10, type: 'magnets-board', label: 'Magnets Board', shape: 'rect', },
    ]
};

// 4. Rooftop Terrace (19 tables)
const rooftopTerrace: VisualLayoutDef = {
    venueId: 'rooftop-terrace',
    width: 1200,
    height: 1000,
    danceFloor: { x: 50, y: 46, width: 30, height: 60, shape: 'rect' },
    tables: [
        // Main area (4 tables)
        ...createGrid(5, 20, 2, 2, 14, 12, 1),
        // Terrace edge (6 tables)
        ...createGrid(75, 20, 1, 6, 0, 12.8, 5),
        // Lounge area (4 tables)
        ...createGrid(5, 44, 2, 2, 14, 12, 11),
        // High tops (5 tables)
        ...createGrid(5, 84, 5, 2, 14, 12, 15),
    ],
    features: [
        { x: 12, y: 0, width: 18, height: 12, type: 'bar', label: 'Bar', shape: 'rect' },
        { x: 12, y: 100, width: 24, height: 8, type: 'restroom', label: 'WC', shape: 'rect' },
        { x: 8, y: 70, width: 16, height: 10, type: 'entrance', label: 'Entrance', shape: 'rect' },
        { x: 50, y: 0, width: 35, height: 18, type: 'canopy', label: 'Wedding Canopy', shape: 'circle' },
        { x: 35, y: 100, width: 10, height: 10, type: 'present-table', label: 'Presents', shape: 'rect' },
        { x: 92, y: 50, width: 18, height: 110, type: 'viewing-platform', label: 'Skyline\nViewing Platform', shape: 'rect' },
        { x: 92, y: 6, width: 12, height: 12, type: 'binoculars', label: 'City Skyline\nBinoculars', shape: 'circle' },
        { x: 55, y: 100, width: 20, height: 10, type: 'buffet', label: 'Small Appetizers Table', shape: 'rect', },
        { x: 75, y: 100, width: 10, height: 8, type: 'magnets-board', label: 'Magnets Board', shape: 'rect', },

    ]
};

// 5. Rustic Barn (12 tables)
const rusticBarn: VisualLayoutDef = {
    venueId: 'rustic-barn',
    width: 1200,
    height: 1000,
    //danceFloor: { x: 50, y: 50, width: 20, height: 30, shape: 'rect' },
    tables: [
        // Left long table (6 tables)
        ...createGrid(40, 18, 1, 6, 0, 14, 1),
        // Right long table (6 tables)
        ...createGrid(60, 18, 1, 6, 0, 14, 7),
    ],

    features: [
        { x: 12, y: 28, width: 18, height: 26, type: 'bar', label: 'Wine Bar', shape: 'rect' },
        { x: 12, y: 78, width: 18, height: 26, type: 'bar', label: 'Beer Bar', shape: 'rect' },
        { x: 12, y: 100, width: 24, height: 8, type: 'restroom', label: 'Male WC', shape: 'rect' },
        { x: 90, y: 100, width: 24, height: 8, type: 'restroom', label: 'Female WC', shape: 'rect' },
        { x: 50, y: 100, width: 16, height: 10, type: 'entrance', label: 'Barn Entrance', shape: 'rect' },
        { x: 50, y: 0, width: 35, height: 18, type: 'canopy', label: 'Ceramony Stage', shape: 'circle' },
        { x: 35, y: 100, width: 10, height: 10, type: 'present-table', label: 'Presents', shape: 'rect' },
        { x: 66, y: 100, width: 10, height: 10, type: 'magnets-board', label: 'Magnets Board', shape: 'rect', },
        { x: 12, y: 53, width: 10, height: 10, type: 'cake', label: 'Cake', shape: 'circle' },
        { x: 100, y: 0, width: 10, height: 8, type: 'emergency-exit', label: 'Emergency Exit', shape: 'rect', rotation: 90 }

    ]
};

// 6. Intimate Chapel (12 tables)
const intimateChapel: VisualLayoutDef = {
    venueId: 'intimate-chapel',
    width: 1200,
    height: 1000,
    //danceFloor: { x: 50, y: 20, width: 20, height: 10, shape: 'rect' }, // Altar area as dance floor for visualization
    tables: [
        // Left aisle (6 tables)
        ...createGrid(19, 24, 2, 3, 16, 24, 1),
        // Right aisle (6 tables)
        ...createGrid(65, 24, 2, 3, 16, 24, 7),
    ],

    features: [
        { x: 28, y: 94, width: 26, height: 18, type: 'bar', label: 'Small Bar', shape: 'rect' },
        { x: 4, y: 94, width: 8, height: 20, type: 'restroom', label: 'Male \n WC', shape: 'rect' },
        { x: 96, y: 94, width: 8, height: 20, type: 'restroom', label: 'Female \n WC', shape: 'rect' },
        { x: 50, y: 95, width: 12, height: 20, type: 'entrance', label: 'Chapel Entrance', shape: 'rect' },
        { x: 50, y: 0, width: 74, height: 18, type: 'canopy', label: 'Altar Ceramony Stage', shape: 'circle' },
        { x: 67, y: 92, width: 10, height: 15, type: 'present-table', label: 'Presents Table', shape: 'rect' },
        { x: 4, y: 0, width: 12, height: 10, type: 'magnets-board', label: 'Magnets Board', shape: 'rect', },
        { x: 82, y: 92, width: 10, height: 15, type: 'cake', label: 'Cake \n & \nPastries', shape: 'rect' },
        { x: 74.4, y: 103, width: 25.2, height: 4, type: 'emergency-exit', label: 'Emergency Exit', shape: 'rect' },
        { x: 96, y: 0, width: 12, height: 10, type: 'piano', label: 'Piano', shape: 'rect' },
        { x: 50, y: 47, width: 12, height: 72, type: 'aisle', label: 'Down the\nAisle walk', shape: 'rect' },
        { x: 96, y: 46, width: 9, height: 70, type: 'boutique-seating', label: 'Boutique\nSeating', shape: 'rect' },
        { x: 4, y: 46, width: 9, height: 70, type: 'boutique-seating', label: 'Boutique\nSeating', shape: 'rect' },
    ]
};

// 7. Beach Resort (22 tables)
// Organic flow
const beachResort: VisualLayoutDef = {
    venueId: 'beach-resort',
    width: 1200,
    height: 1000,
    danceFloor: { x: 0, y: 92, width: 10, height: 25, shape: 'circle', rotation: 90, label: 'Dance \n Floor' },
    tables: [
        // Left Side (2 columns x 6 rows)
        ...createGrid(22, 30, 2, 6, 12, 13, 10),
        // Right Side (2 columns x 6 rows)
        ...createGrid(68, 30, 2, 6, 12, 13, 10),

    ],
    features: [
        // Zones
        { x: 52, y: -4, width: 120, height: 20, type: 'zone', label: 'Beach', shape: 'rect' },

        { x: 0, y: 51, width: 40, height: 10, type: 'bar', label: 'Main Bar', shape: 'rect', rotation: 90, labelRotation: -90 },
        { x: 100, y: 60, width: 40, height: 10, type: 'buffet', label: 'Buffet', shape: 'rect', rotation: 90, labelRotation: -90 },
        { x: 39, y: 106, width: 8, height: 8, type: 'restroom', label: 'WC', shape: 'rect' },
        { x: 65, y: 106, width: 8, height: 8, type: 'restroom', label: 'WC', shape: 'rect' },
        { x: 52, y: 106, width: 16, height: 8, type: 'entrance', label: 'Entrance', shape: 'rect' },
        { x: 52, y: 16, width: 25, height: 16, type: 'canopy', label: 'Wedding Canopy', shape: 'circle' },
        { x: 98, y: 104, width: 12, height: 12, type: 'lifeguard', label: 'Lifeguard', shape: 'rect' },
        { x: 52, y: 63, width: 16, height: 72, type: 'aisle', label: 'Down the\nAisle walk', shape: 'rect' },
        { x: 100, y: 20, width: 9, height: 18, type: 'seating-area', label: 'Sitting Lounge', shape: 'circle' },
    ]

};

const LAYOUTS: Record<string, VisualLayoutDef> = {
    'grand-ballroom': grandBallroom,
    'garden-pavilion': gardenPavilion,
    'modern-banquet': modernBanquet,
    'rooftop-terrace': rooftopTerrace,
    'rustic-barn': rusticBarn,
    'intimate-chapel': intimateChapel,
    'beach-resort': beachResort,
};

// Default fallback (Grid)
const getDefaultLayout = (count: number): VisualLayoutDef => {
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    return {
        venueId: 'default',
        width: 1200,
        height: 1000,
        danceFloor: { x: 50, y: 15, width: 30, height: 10, shape: 'rect' },
        tables: createGrid(15, 30, cols, rows, 80 / cols, 60 / rows, 1)
    };
};

// --- FEATURES SUPPORT ---
export interface VenueFeature {
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'bar' | 'restroom' | 'entrance' | 'buffet' | 'stage' | 'zone' | 'canopy' | 'lifeguard' | 'present-table' | 'cake' | 'aisle' | 'resting-area' | 'binoculars' | 'viewing-platform' | 'magnets-board' | 'emergency-exit' | 'piano' | 'kids-area' | 'seating-area' | 'boutique-seating' | 'kitchen';
    label: string;
    rotation?: number;
    labelRotation?: number;
    shape?: 'rect' | 'circle';
}

// Extend definition to include features
export interface VisualLayoutDef {
    venueId: string;
    width: number;
    height: number;
    danceFloor?: DanceFloorConfig;
    tables: TablePosition[];
    features?: VenueFeature[];
}

// 8. Luxury Garden Estate (45 tables - 500 capacity approx logic)
// Indoor Hall (Rectangular) + Outdoor Garden (Round)
const luxuryGardenEstate: VisualLayoutDef = {
    venueId: 'luxury-garden-estate',
    width: 1200,
    height: 1000,
    danceFloor: { x: 23, y: 85, width: 35, height: 20, shape: 'rect' },

    tables: [
        // --- INDOOR (Left Side) ---
        // Grid x=10, 28
        ...createGrid(10, 8, 2, 8, 10, 8, 1),
        // Garden Split Grid to allow label visibility
        ...createGrid(55, 6, 4, 4, 8, 10, 17),
        ...createGrid(55, 46, 4, 4, 8, 10, 33),

    ],
    features: [
        // ZONES
        { x: 23, y: 50, width: 40, height: 100, type: 'zone', label: 'Indoor Hall', shape: 'rect' },
        { x: 75, y: 50, width: 50, height: 100, type: 'zone', label: 'Garden', shape: 'rect' },

        { x: 36, y: 36, width: 9, height: 65, type: 'bar', label: 'Main Bar', shape: 'rect' },
        { x: 92, y: 30, width: 10, height: 35, type: 'bar', label: 'Garden Bar', shape: 'circle' },
        { x: -1, y: 4, width: 8, height: 8, type: 'restroom', label: 'WC', shape: 'rect' },
        { x: -1, y: 96, width: 8, height: 8, type: 'restroom', label: 'WC', shape: 'rect' },
        { x: 105, y: 96, width: 10, height: 8, type: 'restroom', label: 'Garden WC', shape: 'rect' },
        { x: 90, y: -3, width: 14, height: 6, type: 'entrance', label: 'Entrance', shape: 'rect' },
        { x: 67, y: 85, width: 28, height: 18, type: 'canopy', label: 'Wedding Canopy', shape: 'rect' },
    ]
};

// Re-map with update
const UPDATED_LAYOUTS: Record<string, VisualLayoutDef> = {
    ...LAYOUTS,
    'luxury-garden-estate': luxuryGardenEstate,
};

export const getVisualLayout = (venueId: string | undefined, tableCount: number): VisualLayoutDef => {
    if (venueId && UPDATED_LAYOUTS[venueId]) {
        return UPDATED_LAYOUTS[venueId];
    }
    return getDefaultLayout(tableCount);
};

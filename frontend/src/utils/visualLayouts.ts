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

// 2. Garden Pavilion (21 tables)
// Pavilion area (top) + Lawn (bottom)
const gardenPavilion: VisualLayoutDef = {
    venueId: 'garden-pavilion',
    width: 1200,
    height: 1000,
    danceFloor: { x: 50, y: 30, width: 25, height: 15, shape: 'rect' },
    tables: [
        // Pavilion (7 tables) - around dance floor
        ...createCircle(50, 30, 25, 15, 7, 0, 1),
        // Lawn Left (7 tables)
        ...createGrid(20, 60, 3, 3, 12, 12, 8),
        // Lawn Right (7 tables)
        ...createGrid(80, 60, 3, 3, -12, 12, 15),
    ],
};

// 3. Modern Banquet (15 tables)
// Long rows
const modernBanquet: VisualLayoutDef = {
    venueId: 'modern-banquet',
    width: 1200,
    height: 1000,
    danceFloor: { x: 50, y: 85, width: 40, height: 15, shape: 'rect' },
    tables: [
        // Row 1 (2 large head tables)
        { id: 'table-1', x: 35, y: 20, rotation: 0 },
        { id: 'table-2', x: 65, y: 20, rotation: 0 },
        // Row 2 (4 tables)
        ...createGrid(20, 40, 4, 1, 20, 0, 3),
        // Row 3 (4 tables)
        ...createGrid(20, 55, 4, 1, 20, 0, 7),
        // Row 4 (5 tables)
        ...createGrid(10, 70, 5, 1, 20, 0, 11),
    ],
};

// 4. Rooftop Terrace (19 tables)
const rooftopTerrace: VisualLayoutDef = {
    venueId: 'rooftop-terrace',
    width: 1200,
    height: 1000,
    danceFloor: { x: 80, y: 50, width: 15, height: 25, shape: 'rect' },
    tables: [
        // Main area (4 tables)
        ...createGrid(20, 20, 2, 2, 15, 15, 1),
        // Terrace edge (6 tables)
        ...createGrid(15, 60, 6, 1, 12, 0, 5),
        // Lounge area (4 tables)
        ...createGrid(60, 20, 2, 2, 15, 15, 11),
        // High tops (5 tables)
        ...createGrid(60, 80, 5, 1, 8, 0, 15),
    ],
};

// 5. Rustic Barn (12 tables)
const rusticBarn: VisualLayoutDef = {
    venueId: 'rustic-barn',
    width: 1200,
    height: 1000,
    danceFloor: { x: 50, y: 50, width: 30, height: 20, shape: 'rect' },
    tables: [
        // Top section (2 long tables)
        { id: 'table-1', x: 50, y: 20, rotation: 90 },
        { id: 'table-2', x: 50, y: 80, rotation: 90 },
        // Left side (5 tables)
        ...createGrid(20, 20, 1, 5, 0, 15, 3),
        // Right side (5 tables)
        ...createGrid(80, 20, 1, 5, 0, 15, 8),
    ],
};

// 6. Intimate Chapel (12 tables)
const intimateChapel: VisualLayoutDef = {
    venueId: 'intimate-chapel',
    width: 1200,
    height: 1000,
    danceFloor: { x: 50, y: 20, width: 20, height: 10, shape: 'rect' }, // Altar area as dance floor for visualization
    tables: [
        // Left aisle (6 tables)
        ...createGrid(30, 40, 2, 3, 10, 15, 1),
        // Right aisle (6 tables)
        ...createGrid(70, 40, -2, 3, -10, 15, 7),
    ],
};

// 7. Beach Resort (22 tables)
// Organic flow
const beachResort: VisualLayoutDef = {
    venueId: 'beach-resort',
    width: 1200,
    height: 1000,
    //danceFloor: { x: 0, y: 90, width: 10, height: 10, shape: 'circle' },
    tables: [
        // Left Side (2 columns x 6 rows)
        ...createGrid(22, 34, 2, 6, 12, 11, 10),
        // Right Side (2 columns x 6 rows)
        ...createGrid(67, 34, 2, 6, 12, 11, 10),

    ],
    features: [
        // Zones
        { x: 52, y: -4, width: 120, height: 20, type: 'zone', label: 'Beach', shape: 'rect' },

        { x: 0, y: 60, width: 40, height: 10, type: 'bar', label: 'Main Bar', shape: 'rect', rotation: 90, labelRotation: -90 },
        { x: 100, y: 60, width: 40, height: 10, type: 'buffet', label: 'Buffet', shape: 'rect', rotation: 90, labelRotation: -90 },
        { x: 39, y: 106, width: 8, height: 8, type: 'restroom', label: 'WC', shape: 'rect' },
        { x: 65, y: 106, width: 8, height: 8, type: 'restroom', label: 'WC', shape: 'rect' },
        { x: 52, y: 106, width: 16, height: 8, type: 'entrance', label: 'Entrance', shape: 'rect' },
        { x: 52, y: 16, width: 25, height: 16, type: 'canopy', label: 'Wedding Canopy', shape: 'circle' },
        { x: 98, y: 104, width: 12, height: 12, type: 'lifeguard', label: 'Lifeguard', shape: 'rect' },

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
    type: 'bar' | 'restroom' | 'entrance' | 'buffet' | 'stage' | 'zone' | 'canopy' | 'lifeguard';
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

    tables: [
        // --- INDOOR (Left Side) ---
        // Grid x=10, 28
        ...createGrid(10, 8, 2, 8, 10, 8, 1),
        ...createGrid(55, 10, 4, 8, 8, 8, 17),

    ],
    features: [
        // ZONES
        { x: 23, y: 50, width: 40, height: 100, type: 'zone', label: 'Indoor Hall', shape: 'rect' },
        { x: 75, y: 50, width: 50, height: 100, type: 'zone', label: 'Garden', shape: 'rect' },

        { x: 38, y: 35, width: 8, height: 65, type: 'bar', label: 'Main Bar', shape: 'rect' },
        { x: 92, y: 30, width: 10, height: 35, type: 'bar', label: 'Garden Bar', shape: 'circle' },
        { x: -1, y: 4, width: 8, height: 8, type: 'restroom', label: 'WC', shape: 'rect' },
        { x: -1, y: 96, width: 8, height: 8, type: 'restroom', label: 'WC', shape: 'rect' },
        { x: 105, y: 96, width: 10, height: 8, type: 'restroom', label: 'Garden WC', shape: 'rect' },
        { x: 90, y: -3, width: 14, height: 6, type: 'entrance', label: 'Entrance', shape: 'rect' },
        { x: 65, y: 88, width: 25, height: 14, type: 'canopy', label: 'Wedding Canopy', shape: 'rect' },
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


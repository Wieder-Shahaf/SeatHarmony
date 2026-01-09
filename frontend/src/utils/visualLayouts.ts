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
    danceFloor: DanceFloorConfig;
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

// 1. Grand Ballroom (35 tables)
// Concentric circles around dance floor
const grandBallroom: VisualLayoutDef = {
    venueId: 'grand-ballroom',
    width: 1000,
    height: 800,
    danceFloor: { x: 50, y: 50, width: 20, height: 20, shape: 'circle' },
    tables: [
        // Inner ring (8 tables)
        ...createCircle(50, 50, 20, 25, 8, 0, 1),
        // Middle ring (12 tables)
        ...createCircle(50, 50, 32, 38, 12, 0.2, 9),
        // Outer ring / corners (15 tables)
        ...createCircle(50, 50, 42, 45, 15, 0, 21),
    ],
};

// 2. Garden Pavilion (21 tables)
// Pavilion area (top) + Lawn (bottom)
const gardenPavilion: VisualLayoutDef = {
    venueId: 'garden-pavilion',
    width: 1000,
    height: 900,
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
    width: 1000,
    height: 800,
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
    width: 1000,
    height: 800,
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
    width: 800,
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
    width: 800,
    height: 800,
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
    width: 1000,
    height: 800,
    danceFloor: { x: 50, y: 50, width: 30, height: 30, shape: 'circle' },
    tables: [
        // Inner circle (6 tables)
        ...createCircle(50, 50, 25, 25, 6, 0, 1),
        // Middle wave
        ...createCircle(50, 50, 40, 40, 10, 0.5, 7),
        // Outer scatter
        ...createCircle(50, 50, 48, 45, 6, 0, 17),
    ],
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
        width: 1000,
        height: 800,
        danceFloor: { x: 50, y: 15, width: 30, height: 10, shape: 'rect' },
        tables: createGrid(15, 30, cols, rows, 80 / cols, 60 / rows, 1)
    };
};

export const getVisualLayout = (venueId: string | undefined, tableCount: number): VisualLayoutDef => {
    if (venueId && LAYOUTS[venueId]) {
        // If we have fewer tables than the template defines, the extra positions will just be unused, which is fine.
        // However, if we have MORE tables (custom added), we need to ensure they have positions.
        // For now, we assume the venue visual matches the venue config table count closely.
        return LAYOUTS[venueId];
    }
    return getDefaultLayout(tableCount);
};

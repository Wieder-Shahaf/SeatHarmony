/**
 * API Service for SeatHarmony Backend
 * Handles communication with FastAPI backend for Gurobi/ToT optimization
 */

import {
  Guest,
  Table,
  LayoutRequest,
  LayoutResponse,
  TotParams,
  DEFAULT_TOT_PARAMS,
} from '../types/models';

// Base URL from environment or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Generate optimized seating layouts using ToT algorithm
 */
export async function generateLayouts(
  guests: Guest[],
  tables: Table[],
  settings: Record<string, any> = {},
  totParams: TotParams = DEFAULT_TOT_PARAMS
): Promise<LayoutResponse> {
  const request: LayoutRequest = {
    guests,
    tables,
    settings,
    tot: totParams,
  };

  const response = await fetch(`${API_BASE_URL}/api/layouts/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to generate layouts: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Get explanation for a specific layout
 */
export async function explainLayout(
  layout: Record<string, any>
): Promise<{ explanation: string }> {
  const response = await fetch(`${API_BASE_URL}/api/layouts/explain`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ layout }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to explain layout: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Health check - verify backend is running
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/docs`, {
      method: 'HEAD',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Helper to convert frontend guest data to API format
 * (Already in correct format if using our types, but useful for validation)
 */
export function prepareGuestsForApi(guests: Guest[]): Guest[] {
  return guests.map(guest => ({
    id: guest.id,
    name: guest.name,
    group_id: guest.group_id,
    importance: guest.importance || 0,
    tags: guest.tags || [],
    must_sit_with: guest.must_sit_with || [],
    must_not_sit_with: guest.must_not_sit_with || [],
  }));
}

/**
 * Helper to create API-ready tables from basic config
 */
export function createTablesForApi(
  tableCount: number,
  seatsPerTable: number,
  zones?: string[]
): Table[] {
  return Array.from({ length: tableCount }, (_, i) => ({
    id: `table-${i + 1}`,
    name: `Table ${i + 1}`,
    capacity: seatsPerTable,
    zone: zones ? zones[i % zones.length] : null,
    constraints: {},
  }));
}


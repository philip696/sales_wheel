import { supabase } from '@/src/lib/supabase';
import type { LocationPing } from '@/src/types';

/*
 * ================================================================
 * LOCATION PATH — READ
 * ================================================================
 *
 * Backed by public.get_location_path(sales_id, date) (see
 * supabase/migrations/009_location_pings.sql). That RPC already
 * enforces access (a rep can only read their own path, an admin can
 * read anyone's) and returns rows ordered by recorded_at, so this is
 * a thin wrapper rather than a raw table query.
 *
 * @param salesId - the rep whose path to fetch
 * @param date - calendar date as 'YYYY-MM-DD' (matches the app's
 *   existing formatDateKey() convention elsewhere in the codebase)
 */
export async function getLocationPath(
  salesId: string,
  date: string
): Promise<LocationPing[]> {
  const { data, error } = await supabase.rpc(
    'get_location_path',
    {
      p_sales_id: salesId,
      p_date: date,
    }
  );

  if (error) {
    throw error;
  }

  return (data ?? []) as LocationPing[];
}

/*
 * ================================================================
 * LOCATION PING — WRITE
 * ================================================================
 *
 * Backed by public.log_location_ping(...) (009_location_pings.sql).
 * Not yet called from anywhere in the app -- this is the entry point
 * the "implement location ping/tracking feature" roadmap step will
 * wire up (e.g. from an expo-task-manager background task firing
 * every 3 minutes). Included here now so the read and write sides of
 * this feature live in the same service file.
 *
 * @param latitude
 * @param longitude
 * @param accuracy - GPS accuracy in meters, if available
 * @param recordedAt - when the fix was taken on the device; defaults
 *   to the RPC's own now() if omitted. The RPC rejects values more
 *   than 5 minutes in the future or more than 24 hours in the past.
 */
export async function logLocationPing(
  latitude: number,
  longitude: number,
  accuracy?: number | null,
  recordedAt?: string
): Promise<LocationPing> {
  const { data, error } = await supabase.rpc(
    'log_location_ping',
    {
      p_latitude: latitude,
      p_longitude: longitude,
      p_accuracy: accuracy ?? null,
      ...(recordedAt
        ? { p_recorded_at: recordedAt }
        : {}),
    }
  );

  if (error) {
    throw error;
  }

  return data as LocationPing;
}
import { supabase } from '@/src/lib/supabase';
import type {
  AdminStoreSearchParams,
  PaginatedResult,
  Store,
  StoreInput,
  StoreSearchParams,
} from '@/src/types';
import { sanitizeSearchQuery } from '@/src/utils/validation';

const DEFAULT_PAGE_SIZE = 20;

// Postgres error codes we handle specially when writing to `stores`.
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

/**
 * Thrown by `deleteStore` when the store can't be removed because
 * attendance/spin rows still reference it. Callers can catch this
 * specifically to offer `forceDeleteStore` as a next step.
 */
export class StoreHasHistoryError extends Error {
  constructor(storeId: string) {
    super(
      'This store has attendance or spin history and cannot be deleted directly.'
    );
    this.name = 'StoreHasHistoryError';
    this.storeId = storeId;
  }
  storeId: string;
}

export async function searchStores(
  params: StoreSearchParams = {}
): Promise<PaginatedResult<Store>> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const query = sanitizeSearchQuery(params.query ?? '');

  let builder = supabase
    .from('stores')
    .select('*', { count: 'exact' })
    .eq('status', 'active')
    .order('name', { ascending: true })
    .range(from, to);

  if (query.length > 0) {
    builder = builder.or(
      `name.ilike.%${query}%,store_code.ilike.%${query}%,address.ilike.%${query}%`
    );
  }

  const { data, error, count } = await builder;

  if (error) {
    throw new Error(error.message);
  }

  const total = count ?? 0;

  return {
    data: data ?? [],
    total,
    page,
    pageSize,
    hasMore: from + (data?.length ?? 0) < total,
  };
}

export async function getStoreById(storeId: string): Promise<Store | null> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('id', storeId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getStoreByCode(storeCode: string): Promise<Store | null> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('store_code', storeCode)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// ---------------------------------------------------------------------------
// Admin CRUD
//
// These bypass the `status = 'active'` filter that the sales-facing functions
// above apply, and rely on the `admin_manage_stores` RLS policy (FOR ALL,
// USING/WITH CHECK public.is_admin()) to authorize writes. They are only
// meaningful when called by a signed-in user whose `public.sales.role` is
// 'admin' — for any other user, Postgres will simply reject the write.
// ---------------------------------------------------------------------------

export async function listAllStores(
  params: AdminStoreSearchParams = {}
): Promise<PaginatedResult<Store>> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const query = sanitizeSearchQuery(params.query ?? '');

  let builder = supabase
    .from('stores')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (params.status && params.status !== 'all') {
    builder = builder.eq('status', params.status);
  }

  if (query.length > 0) {
    builder = builder.or(
      `name.ilike.%${query}%,store_code.ilike.%${query}%,address.ilike.%${query}%`
    );
  }

  const { data, error, count } = await builder;

  if (error) {
    throw new Error(error.message);
  }

  const total = count ?? 0;

  return {
    data: data ?? [],
    total,
    page,
    pageSize,
    hasMore: from + (data?.length ?? 0) < total,
  };
}

function normalizeStoreInput(input: StoreInput) {
  return {
    store_code: input.store_code.trim(),
    name: input.name.trim(),
    address: input.address?.trim() ? input.address.trim() : null,
    latitude: input.latitude,
    longitude: input.longitude,
    radius_meters: Math.round(input.radius_meters),
    status: input.status,
  };
}

export async function createStore(input: StoreInput): Promise<Store> {
  const { data, error } = await supabase
    .from('stores')
    .insert(normalizeStoreInput(input))
    .select('*')
    .single();

  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      throw new Error(`Store code "${input.store_code}" is already in use.`);
    }
    throw new Error(error.message);
  }

  return data;
}

export async function updateStore(
  storeId: string,
  input: StoreInput
): Promise<Store> {
  const { data, error } = await supabase
    .from('stores')
    .update(normalizeStoreInput(input))
    .eq('id', storeId)
    .select('*')
    .single();

  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      throw new Error(`Store code "${input.store_code}" is already in use.`);
    }
    throw new Error(error.message);
  }

  return data;
}

export async function setStoreStatus(
  storeId: string,
  status: Store['status']
): Promise<Store> {
  const { data, error } = await supabase
    .from('stores')
    .update({ status })
    .eq('id', storeId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Permanently deletes a store. `attendance` and `spins` reference stores with
 * ON DELETE RESTRICT, so this will fail with a friendly error for any store
 * that already has history — callers should offer deactivation
 * (`setStoreStatus(id, 'inactive')`) as the alternative in that case.
 */
/**
 * Permanently deletes a store. `attendance` and `spins` reference stores with
 * ON DELETE RESTRICT, so this will fail with a friendly error for any store
 * that already has history — callers should offer `forceDeleteStore` (which
 * also wipes that history) or `setStoreStatus(id, 'inactive')` instead.
 */
export async function deleteStore(storeId: string): Promise<void> {
  const { error } = await supabase.from('stores').delete().eq('id', storeId);

  if (error) {
    if (error.code === PG_FOREIGN_KEY_VIOLATION) {
      throw new StoreHasHistoryError(storeId);
    }
    throw new Error(error.message);
  }
}

/**
 * Permanently deletes a store, and everything that references it.
 *
 * `attendance` and `spins` reference stores with ON DELETE RESTRICT, so a
 * plain delete (see `deleteStore` above) fails for any store with history.
 * This variant clears that history first, in FK-safe order, then deletes
 * the store itself:
 *
 *   spins (references both store and attendance) -> attendance -> store
 *
 * `audit_log.store_id` is ON DELETE SET NULL, so those rows are preserved
 * automatically with the store reference cleared — no action needed there.
 *
 * This is destructive and irreversible. Callers should get an explicit,
 * unambiguous confirmation from the admin before calling this — a generic
 * "Delete?" alert is not enough, since it also erases attendance/spin
 * history for every sales rep who ever visited this store.
 */
export async function forceDeleteStore(storeId: string): Promise<void> {
  const { error: spinsError } = await supabase
    .from('spins')
    .delete()
    .eq('store_id', storeId);

  if (spinsError) {
    throw new Error(`Could not clear spin history: ${spinsError.message}`);
  }

  const { error: attendanceError } = await supabase
    .from('attendance')
    .delete()
    .eq('store_id', storeId);

  if (attendanceError) {
    throw new Error(
      `Could not clear attendance history: ${attendanceError.message}`
    );
  }

  const { error: storeError } = await supabase
    .from('stores')
    .delete()
    .eq('id', storeId);

  if (storeError) {
    throw new Error(storeError.message);
  }
}
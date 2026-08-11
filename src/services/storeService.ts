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
export async function deleteStore(storeId: string): Promise<void> {
  const { error } = await supabase.from('stores').delete().eq('id', storeId);

  if (error) {
    if (error.code === PG_FOREIGN_KEY_VIOLATION) {
      throw new Error(
        'This store has attendance or spin history and cannot be deleted. Deactivate it instead.'
      );
    }
    throw new Error(error.message);
  }
}
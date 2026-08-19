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

const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

export class StoreHasHistoryError extends Error {
  storeId: string;

  constructor(storeId: string) {
    super(
      'This store has attendance or spin history and cannot be deleted directly.'
    );

    this.name = 'StoreHasHistoryError';
    this.storeId = storeId;
  }
}

/*
 * ============================================================
 * SALES — SEARCH ACTIVE STORES
 * ============================================================
 */

export async function searchStores(
  params: StoreSearchParams = {}
): Promise<PaginatedResult<Store>> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const query = sanitizeSearchQuery(
    params.query ?? ''
  );

  let builder = supabase
    .from('stores')
    .select('*', {
      count: 'exact',
    })
    .eq('status', 'active')
    .order('name', {
      ascending: true,
    })
    .range(from, to);

  if (query.length > 0) {
    builder = builder.or(
      `name.ilike.%${query}%,store_code.ilike.%${query}%,address.ilike.%${query}%`
    );
  }

  const {
    data,
    error,
    count,
  } = await builder;

  if (error) {
    console.error(
      'SEARCH STORES ERROR:',
      error
    );

    throw new Error(error.message);
  }

  const stores = (data ?? []) as Store[];

  const total = count ?? 0;

  return {
    data: stores,
    total,
    page,
    pageSize,
    hasMore:
      from + stores.length < total,
  };
}

/*
 * ============================================================
 * GET STORE
 * ============================================================
 */

export async function getStoreById(
  storeId: string
): Promise<Store | null> {
  if (!storeId) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase
    .from('stores')
    .select('*')
    .eq('id', storeId)
    .maybeSingle();

  if (error) {
    console.error(
      'GET STORE BY ID ERROR:',
      error
    );

    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return data as Store;
}

/*
 * ============================================================
 * GET STORE BY CODE
 * ============================================================
 */

export async function getStoreByCode(
  storeCode: string
): Promise<Store | null> {
  const code = storeCode.trim();

  if (!code) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase
    .from('stores')
    .select('*')
    .eq('store_code', code)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as Store | null;
}

/*
 * ============================================================
 * ADMIN — LIST ALL STORES
 * ============================================================
 */

export async function listAllStores(
  params: AdminStoreSearchParams = {}
): Promise<PaginatedResult<Store>> {
  const page = params.page ?? 1;
  const pageSize =
    params.pageSize ?? DEFAULT_PAGE_SIZE;

  const from =
    (page - 1) * pageSize;

  const to =
    from + pageSize - 1;

  const query = sanitizeSearchQuery(
    params.query ?? ''
  );

  let builder = supabase
    .from('stores')
    .select('*', {
      count: 'exact',
    })
    .order('created_at', {
      ascending: false,
    })
    .range(from, to);

  if (
    params.status &&
    params.status !== 'all'
  ) {
    builder = builder.eq(
      'status',
      params.status
    );
  }

  if (query.length > 0) {
    builder = builder.or(
      `name.ilike.%${query}%,store_code.ilike.%${query}%,address.ilike.%${query}%`
    );
  }

  const {
    data,
    error,
    count,
  } = await builder;

  if (error) {
    throw new Error(error.message);
  }

  const stores = (data ?? []) as Store[];

  const total = count ?? 0;

  return {
    data: stores,
    total,
    page,
    pageSize,
    hasMore:
      from + stores.length < total,
  };
}

/*
 * ============================================================
 * NORMALIZE INPUT
 * ============================================================
 */

function normalizeStoreInput(
  input: StoreInput
) {
  return {
    store_code:
      input.store_code.trim(),

    name:
      input.name.trim(),

    address:
      input.address?.trim()
        ? input.address.trim()
        : null,

    latitude:
      Number(input.latitude),

    longitude:
      Number(input.longitude),

    radius_meters:
      Math.round(
        Number(input.radius_meters)
      ),

    status:
      input.status ?? 'active',
  };
}

/*
 * ============================================================
 * CREATE STORE
 * ============================================================
 */

export async function createStore(
  input: StoreInput
): Promise<Store> {
  const payload =
    normalizeStoreInput(input);

  console.log(
    'CREATING STORE IN SUPABASE:',
    payload
  );

  const {
    data,
    error,
  } = await supabase
    .from('stores')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error(
      'CREATE STORE ERROR:',
      error
    );

    if (
      error.code ===
      PG_UNIQUE_VIOLATION
    ) {
      throw new Error(
        `Store code "${input.store_code}" is already in use.`
      );
    }

    throw new Error(
      error.message
    );
  }

  return data as Store;
}

/*
 * ============================================================
 * UPDATE STORE
 * ============================================================
 */

export async function updateStore(
  storeId: string,
  input: StoreInput
): Promise<Store> {
  const payload =
    normalizeStoreInput(input);

  const {
    data,
    error,
  } = await supabase
    .from('stores')
    .update(payload)
    .eq('id', storeId)
    .select('*')
    .single();

  if (error) {
    if (
      error.code ===
      PG_UNIQUE_VIOLATION
    ) {
      throw new Error(
        `Store code "${input.store_code}" is already in use.`
      );
    }

    throw new Error(
      error.message
    );
  }

  return data as Store;
}

/*
 * ============================================================
 * UPDATE STORE DETAILS
 *
 * This uses the columns you already created:
 *
 * phone_number
 * owner_name
 * usual_order
 * notes
 * ============================================================
 */

export async function updateStoreDetails(
  storeId: string,
  details: {
    phone_number: string;
    owner_name: string;
    usual_order: string;
    notes: string;
  }
): Promise<Store> {
  const {
    data,
    error,
  } = await supabase
    .from('stores')
    .update({
      phone_number:
        details.phone_number.trim(),

      owner_name:
        details.owner_name.trim(),

      usual_order:
        details.usual_order.trim(),

      notes:
        details.notes.trim(),
    })
    .eq('id', storeId)
    .select('*')
    .single();

  if (error) {
    console.error(
      'UPDATE STORE DETAILS ERROR:',
      error
    );

    throw new Error(
      error.message
    );
  }

  return data as Store;
}

/*
 * ============================================================
 * SET STATUS
 * ============================================================
 */

export async function setStoreStatus(
  storeId: string,
  status: Store['status']
): Promise<Store> {
  const {
    data,
    error,
  } = await supabase
    .from('stores')
    .update({
      status,
    })
    .eq('id', storeId)
    .select('*')
    .single();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data as Store;
}

/*
 * ============================================================
 * DELETE STORE
 * ============================================================
 */

export async function deleteStore(
  storeId: string
): Promise<void> {
  const {
    error,
  } = await supabase
    .from('stores')
    .delete()
    .eq('id', storeId);

  if (error) {
    if (
      error.code ===
      PG_FOREIGN_KEY_VIOLATION
    ) {
      throw new StoreHasHistoryError(
        storeId
      );
    }

    throw new Error(
      error.message
    );
  }
}

/*
 * ============================================================
 * FORCE DELETE
 * ============================================================
 */

export async function forceDeleteStore(
  storeId: string
): Promise<void> {
  const {
    error: spinsError,
  } = await supabase
    .from('spins')
    .delete()
    .eq(
      'store_id',
      storeId
    );

  if (spinsError) {
    throw new Error(
      `Could not clear spin history: ${spinsError.message}`
    );
  }

  const {
    error: attendanceError,
  } = await supabase
    .from('attendance')
    .delete()
    .eq(
      'store_id',
      storeId
    );

  if (attendanceError) {
    throw new Error(
      `Could not clear attendance history: ${attendanceError.message}`
    );
  }

  const {
    error: storeError,
  } = await supabase
    .from('stores')
    .delete()
    .eq('id', storeId);

  if (storeError) {
    throw new Error(
      storeError.message
    );
  }
}
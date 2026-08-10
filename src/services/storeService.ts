import { supabase } from '@/src/lib/supabase';
import { sanitizeSearchQuery } from '@/src/utils/validation';
import type {
  PaginatedResult,
  Store,
  StoreSearchParams,
} from '@/src/types';

const DEFAULT_PAGE_SIZE = 20;

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

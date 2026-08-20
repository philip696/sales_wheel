import { supabase } from '@/src/lib/supabase';

export interface StoreSpinSummary {
  storeId: string;
  storeName: string;
  storeCode: string;
  spinCount: number;
}

/*
 * ============================================================
 * LIST STORES + SPIN COUNTS
 * ============================================================
 *
 * Reads:
 *
 * stores
 * spins
 *
 * No database changes.
 *
 * The relationship is:
 *
 * stores.id
 *      ↓
 * spins.store_id
 *
 * If your spins table uses a different column name for the
 * store relationship, Supabase will return an error and the
 * console log will show it.
 */

export async function listStoresWithSpinCounts(): Promise<
  StoreSpinSummary[]
> {
  console.log(
    'ADMIN SPINS: Loading stores and spin counts...'
  );

  /*
   * ==========================================================
   * LOAD STORES
   * ==========================================================
   */

  const {
    data: stores,
    error: storesError,
  } = await supabase
    .from('stores')
    .select(
      `
        id,
        store_code,
        name
      `
    )
    .order('name', {
      ascending: true,
    });

  if (storesError) {
    console.error(
      'ADMIN SPINS: STORE QUERY ERROR:',
      storesError
    );

    throw new Error(
      `Could not load stores: ${storesError.message}`
    );
  }

  console.log(
    'ADMIN SPINS: STORES LOADED:',
    stores?.length ?? 0
  );

  /*
   * ==========================================================
   * LOAD SPINS
   * ==========================================================
   */

  const {
    data: spins,
    error: spinsError,
  } = await supabase
    .from('spins')
    .select(
      `
        id,
        store_id
      `
    );

  if (spinsError) {
    console.error(
      'ADMIN SPINS: SPIN QUERY ERROR:',
      spinsError
    );

    throw new Error(
      `Could not load spins: ${spinsError.message}`
    );
  }

  console.log(
    'ADMIN SPINS: SPINS LOADED:',
    spins?.length ?? 0
  );

  /*
   * ==========================================================
   * COUNT SPINS BY STORE
   * ==========================================================
   */

  const spinCounts =
    new Map<string, number>();

  for (const spin of spins ?? []) {
    if (!spin.store_id) {
      continue;
    }

    const current =
      spinCounts.get(
        spin.store_id
      ) ?? 0;

    spinCounts.set(
      spin.store_id,
      current + 1
    );
  }

  /*
   * ==========================================================
   * BUILD RESULT
   * ==========================================================
   */

  const result: StoreSpinSummary[] =
    (stores ?? []).map(
      (store) => ({
        storeId: store.id,

        storeName:
          store.name,

        storeCode:
          store.store_code,

        spinCount:
          spinCounts.get(
            store.id
          ) ?? 0,
      })
    );

  /*
   * ==========================================================
   * DEBUG
   * ==========================================================
   */

  console.log(
    'ADMIN SPINS: FINAL RESULT:',
    result
  );

  return result;
}
import { supabase } from '@/src/lib/supabase';
import type { SpinStatus } from '@/src/types';

export interface StoreSpinSummary {
  storeId: string;
  storeName: string;
  storeCode: string;
  spinCount: number;
}

/**
 * Every store, with how many spins have ever happened there. Stores with
 * zero spins are still included (spinCount: 0) so an admin can see
 * inactivity, not just activity.
 */
export async function listStoresWithSpinCounts(): Promise<StoreSpinSummary[]> {
  const { data, error } = await supabase
    .from('stores')
    .select('id, name, store_code, spins(count)')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  type Row = {
    id: string;
    name: string;
    store_code: string;
    spins: { count: number }[] | null;
  };

  // The hand-maintained Database type file (src/types/database.ts) leaves
  // every table's `Relationships` array empty, so TypeScript can't confirm
  // this embed against a real foreign key even though `spins.store_id`
  // does reference `stores.id` in the actual schema — PostgREST resolves
  // it fine at runtime. Route through `unknown` to bypass the stale
  // static check rather than the query itself.
  return ((data ?? []) as unknown as Row[])
    .map((row) => ({
      storeId: row.id,
      storeName: row.name,
      storeCode: row.store_code,
      spinCount: row.spins?.[0]?.count ?? 0,
    }))
    .sort((a, b) => b.spinCount - a.spinCount);
}

export interface StoreSpinEntry {
  id: string;
  salesName: string;
  salesCode: string;
  rewardName: string | null;
  rewardValue: string | null;
  status: SpinStatus;
  spinDate: string;
  createdAt: string;
}

/**
 * Full spin history for one store — who spun, what they won, and when —
 * newest first.
 */
export async function getSpinsForStore(
  storeId: string
): Promise<StoreSpinEntry[]> {
  const { data, error } = await supabase
    .from('spins')
    .select(
      `
      id,
      status,
      spin_date,
      created_at,
      sales:sales_id (name, sales_code),
      reward:reward_id (name, value)
    `
    )
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  type Row = {
    id: string;
    status: SpinStatus;
    spin_date: string;
    created_at: string;
    sales: { name: string; sales_code: string } | null;
    reward: { name: string; value: string } | null;
  };

  return ((data ?? []) as Row[]).map((row) => ({
    id: row.id,
    salesName: row.sales?.name ?? 'Unknown sales rep',
    salesCode: row.sales?.sales_code ?? '—',
    rewardName: row.reward?.name ?? null,
    rewardValue: row.reward?.value ?? null,
    status: row.status,
    spinDate: row.spin_date,
    createdAt: row.created_at,
  }));
}
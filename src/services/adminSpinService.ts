import { supabase } from '@/src/lib/supabase';
import type { SpinStatus } from '@/src/types';

export interface StoreSpinEntry {
  id: string;
  salesName: string;
  salesCode: string;
  storeName: string | null;
  storeCode: string | null;
  rewardName: string | null;
  rewardValue: string | null;
  status: SpinStatus;
  spinDate: string;
  createdAt: string;
}

/**
 * Full spin history for one event -- who spun, at which store, what they
 * won, and when -- newest first. Relies on spins.event_id, which is only
 * populated for spins made after the events feature shipped; older spins
 * won't show up here.
 */
export async function getSpinsForEvent(
  eventId: string
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
      store:store_id (name, store_code),
      reward:reward_id (name, value)
    `
    )
    .eq('event_id', eventId)
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
    store: { name: string; store_code: string } | null;
    reward: { name: string; value: string } | null;
  };

  return ((data ?? []) as Row[]).map((row) => ({
    id: row.id,
    salesName: row.sales?.name ?? 'Unknown sales rep',
    salesCode: row.sales?.sales_code ?? '—',
    storeName: row.store?.name ?? null,
    storeCode: row.store?.store_code ?? null,
    rewardName: row.reward?.name ?? null,
    rewardValue: row.reward?.value ?? null,
    status: row.status,
    spinDate: row.spin_date,
    createdAt: row.created_at,
  }));
}
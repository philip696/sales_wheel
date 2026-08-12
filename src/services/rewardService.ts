import { supabase } from '@/src/lib/supabase';
import type { EntityStatus, Reward } from '@/src/types';

// Postgres error code we handle specially when deleting a reward that's
// still referenced by spin history.
const PG_FOREIGN_KEY_VIOLATION = '23503';

export interface RewardInput {
  name: string;
  value: string;
  probability: number;
  status: EntityStatus;
}

export async function listRewards(): Promise<Reward[]> {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * Active rewards only, ordered by probability descending — used by the
 * sales-facing spin wheel to render its slices. RLS already restricts
 * non-admins to active rewards regardless, but filtering explicitly here
 * keeps this call site's intent clear and avoids depending on that as the
 * only enforcement.
 */
export async function listActiveRewards(): Promise<Reward[]> {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .eq('status', 'active')
    .order('probability', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

function normalizeRewardInput(input: RewardInput) {
  return {
    name: input.name.trim(),
    value: input.value.trim(),
    probability: input.probability,
    status: input.status,
  };
}

export async function createReward(input: RewardInput): Promise<Reward> {
  const { data, error } = await supabase
    .from('rewards')
    .insert(normalizeRewardInput(input))
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateReward(
  rewardId: string,
  input: RewardInput
): Promise<Reward> {
  const { data, error } = await supabase
    .from('rewards')
    .update(normalizeRewardInput(input))
    .eq('id', rewardId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function setRewardStatus(
  rewardId: string,
  status: EntityStatus
): Promise<Reward> {
  const { data, error } = await supabase
    .from('rewards')
    .update({ status })
    .eq('id', rewardId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Thrown by `deleteReward` when the reward has already been won by someone
 * — `spins.reward_id` references rewards, but with ON DELETE SET NULL, so
 * a delete never actually fails at the database level. This error type is
 * kept for symmetry with storeService/consistency, but in practice
 * `deleteReward` should always succeed.
 */
export class RewardHasHistoryError extends Error {
  constructor() {
    super('This reward is referenced by past spin history.');
    this.name = 'RewardHasHistoryError';
  }
}

export async function deleteReward(rewardId: string): Promise<void> {
  const { error } = await supabase.from('rewards').delete().eq('id', rewardId);

  if (error) {
    if (error.code === PG_FOREIGN_KEY_VIOLATION) {
      throw new RewardHasHistoryError();
    }
    throw new Error(error.message);
  }
}
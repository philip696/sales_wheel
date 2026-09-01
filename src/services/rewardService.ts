// src/services/rewardService.ts

import { supabase } from '@/src/lib/supabase';
import type {
  EntityStatus,
  Reward,
} from '@/src/types';

/*
 * ============================================================
 * CONSTANTS
 * ============================================================
 */

const PG_FOREIGN_KEY_VIOLATION =
  '23503';

/*
 * ============================================================
 * TYPES
 * ============================================================
 */

export interface RewardInput {
  name: string;
  value: string;
  probability: number;
  status: EntityStatus;
}

export interface RewardMode {
  enabled: boolean;
  eventId: string | null;
}

export interface RewardEvent {
  id: string;
  starts_at: string | null;
  ends_at: string | null;
  status: EntityStatus;
}

/*
 * ============================================================
 * LIST ALL REWARDS FOR EVENT
 * ============================================================
 */

/**
 * All rewards belonging to a single event.
 */
export async function listRewardsForEvent(
  eventId: string
): Promise<Reward[]> {
  const {
    data,
    error,
  } = await supabase
    .from('rewards')
    .select('*')
    .eq(
      'event_id',
      eventId
    )
    .order(
      'created_at',
      {
        ascending:
          false,
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data ?? [];
}

/*
 * ============================================================
 * LIST ACTIVE REWARDS FOR EVENT
 * ============================================================
 */

/**
 * Active rewards for one event.
 *
 * These are used by the sales-facing Spin Wheel.
 */
export async function listActiveRewardsForEvent(
  eventId: string
): Promise<Reward[]> {
  const {
    data,
    error,
  } = await supabase
    .from('rewards')
    .select('*')
    .eq(
      'event_id',
      eventId
    )
    .eq(
      'status',
      'active'
    )
    .order(
      'probability',
      {
        ascending:
          false,
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data ?? [];
}

/*
 * ============================================================
 * NORMALIZE INPUT
 * ============================================================
 */

function normalizeRewardInput(
  input: RewardInput
) {
  return {
    name:
      input.name.trim(),

    value:
      input.value.trim(),

    probability:
      input.probability,

    status:
      input.status,
  };
}

/*
 * ============================================================
 * CREATE REWARD
 * ============================================================
 */

export async function createReward(
  eventId: string,
  input: RewardInput
): Promise<Reward> {
  const {
    data,
    error,
  } = await supabase
    .from('rewards')
    .insert({
      ...normalizeRewardInput(
        input
      ),

      event_id:
        eventId,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data;
}

/*
 * ============================================================
 * UPDATE REWARD
 * ============================================================
 */

export async function updateReward(
  rewardId: string,
  input: RewardInput
): Promise<Reward> {
  const {
    data,
    error,
  } = await supabase
    .from('rewards')
    .update(
      normalizeRewardInput(
        input
      )
    )
    .eq(
      'id',
      rewardId
    )
    .select('*')
    .single();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data;
}

/*
 * ============================================================
 * SET REWARD STATUS
 * ============================================================
 */

export async function setRewardStatus(
  rewardId: string,
  status: EntityStatus
): Promise<Reward> {
  const {
    data,
    error,
  } = await supabase
    .from('rewards')
    .update({
      status,
    })
    .eq(
      'id',
      rewardId
    )
    .select('*')
    .single();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data;
}

/*
 * ============================================================
 * REWARD HISTORY ERROR
 * ============================================================
 */

/**
 * Thrown when a reward is still referenced by past spin
 * history.
 */
export class RewardHasHistoryError extends Error {
  constructor() {
    super(
      'This reward is referenced by past spin history.'
    );

    this.name =
      'RewardHasHistoryError';
  }
}

/*
 * ============================================================
 * DELETE REWARD
 * ============================================================
 */

export async function deleteReward(
  rewardId: string
): Promise<void> {
  const {
    error,
  } = await supabase
    .from('rewards')
    .delete()
    .eq(
      'id',
      rewardId
    );

  if (error) {
    if (
      error.code ===
      PG_FOREIGN_KEY_VIOLATION
    ) {
      throw new RewardHasHistoryError();
    }

    throw new Error(
      error.message
    );
  }
}

/*
 * ============================================================
 * GET ACTIVE REWARD EVENT
 * ============================================================
 *
 * This is the database-backed source of truth for whether
 * the reward system is currently active.
 *
 * An event must:
 *
 *   status = active
 *
 * and must currently be inside its start/end window.
 *
 * ============================================================
 */

export async function getRewardEvent(): Promise<
  RewardEvent | null
> {
  const now =
    new Date().toISOString();

  const {
    data,
    error,
  } =
    await supabase
      .from('events')
      .select(
        `
        id,
        starts_at,
        ends_at,
        status
        `
      )
      .eq(
        'status',
        'active'
      )
      .or(
        `starts_at.is.null,starts_at.lte.${now}`
      )
      .or(
        `ends_at.is.null,ends_at.gte.${now}`
      )
      .order(
        'starts_at',
        {
          ascending:
            false,
        }
      )
      .limit(1);

  if (error) {
    throw new Error(
      `Could not load reward event: ${error.message}`
    );
  }

  return (
    data?.[0] ??
    null
  );
}

/*
 * ============================================================
 * GET REWARD MODE
 * ============================================================
 *
 * Returns:
 *
 *   enabled = true
 *      when an active event exists.
 *
 *   enabled = false
 *      when there is no active event.
 *
 * ============================================================
 */

export async function getRewardMode(): Promise<RewardMode> {
  const event =
    await getRewardEvent();

  return {
    enabled:
      !!event,

    eventId:
      event?.id ??
      null,
  };
}

/*
 * ============================================================
 * FIND EVENT TO ACTIVATE
 * ============================================================
 *
 * When the admin turns the reward system ON, find the most
 * recent event that:
 *
 *   - is not already active
 *   - has started, or has no start date
 *   - has not expired, or has no end date
 *
 * ============================================================
 */

async function findActivatableRewardEvent(): Promise<
  RewardEvent | null
> {
  const now =
    new Date().toISOString();

  const {
    data,
    error,
  } =
    await supabase
      .from('events')
      .select(
        `
        id,
        starts_at,
        ends_at,
        status
        `
      )
      .neq(
        'status',
        'active'
      )
      .or(
        `starts_at.is.null,starts_at.lte.${now}`
      )
      .or(
        `ends_at.is.null,ends_at.gte.${now}`
      )
      .order(
        'starts_at',
        {
          ascending:
            false,
        }
      )
      .limit(1);

  if (error) {
    throw new Error(
      `Could not find a reward event to activate: ${error.message}`
    );
  }

  return (
    data?.[0] ??
    null
  );
}

/*
 * ============================================================
 * SET REWARD MODE
 * ============================================================
 *
 * ENABLED = true
 *
 *   Activates an existing usable reward event.
 *
 * ENABLED = false
 *
 *   Deactivates the currently active reward event.
 *
 * Nothing is deleted.
 * Existing rewards and spin history remain untouched.
 *
 * ============================================================
 */

export async function setRewardMode(
  enabled: boolean
): Promise<RewardMode> {
  /*
   * ==========================================================
   * TURN OFF
   * ==========================================================
   */

  if (
    !enabled
  ) {
    const activeEvent =
      await getRewardEvent();

    /*
     * Already OFF.
     */

    if (
      !activeEvent
    ) {
      return {
        enabled:
          false,

        eventId:
          null,
      };
    }

    /*
     * Deactivate event.
     */

    const {
      error,
    } =
      await supabase
        .from('events')
        .update({
          status:
            'inactive',
        })
        .eq(
          'id',
          activeEvent.id
        );

    if (error) {
      throw new Error(
        `Could not disable reward event: ${error.message}`
      );
    }

    return {
      enabled:
        false,

      eventId:
        activeEvent.id,
    };
  }

  /*
   * ==========================================================
   * TURN ON
   * ==========================================================
   */

  /*
   * Check whether something is already active.
   */

  const existingActive =
    await getRewardEvent();

  if (
    existingActive
  ) {
    return {
      enabled:
        true,

      eventId:
        existingActive.id,
    };
  }

  /*
   * Find a usable inactive event.
   */

  const event =
    await findActivatableRewardEvent();

  if (
    !event
  ) {
    throw new Error(
      'There is no available reward event to activate.'
    );
  }

  /*
   * Activate it.
   */

  const {
    error:
      updateError,
  } =
    await supabase
      .from('events')
      .update({
        status:
          'active',
      })
      .eq(
        'id',
        event.id
      );

  if (
    updateError
  ) {
    throw new Error(
      `Could not activate reward event: ${updateError.message}`
    );
  }

  return {
    enabled:
      true,

    eventId:
      event.id,
  };
}

/*
 * ============================================================
 * TOGGLE REWARD MODE
 * ============================================================
 */

export async function toggleRewardMode(): Promise<RewardMode> {
  const current =
    await getRewardMode();

  return setRewardMode(
    !current.enabled
  );
}
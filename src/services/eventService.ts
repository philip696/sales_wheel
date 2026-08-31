import { supabase } from '@/src/lib/supabase';
import type { EntityStatus, Event } from '@/src/types';

export interface EventInput {
  name: string;
  description?: string;
  status: EntityStatus;
  starts_at?: string | null;
  ends_at?: string | null;
}

export async function listEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

/**
 * The event the sales-facing spin wheel should use. Today there is no
 * event-picker UI for reps, so this just returns the most recently created
 * active event -- if admins want the wheel to reflect a specific
 * promotion, keep only that one event active at a time.
 */
export async function getActiveEvent(): Promise<Event | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getEvent(eventId: string): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

function normalizeEventInput(input: EventInput) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    status: input.status,
    starts_at: input.starts_at || null,
    ends_at: input.ends_at || null,
  };
}

export async function createEvent(input: EventInput): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .insert(normalizeEventInput(input))
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateEvent(
  eventId: string,
  input: EventInput
): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .update(normalizeEventInput(input))
    .eq('id', eventId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function setEventStatus(
  eventId: string,
  status: EntityStatus
): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', eventId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Thrown by `deleteEvent` when the event still owns rewards -- rewards.event_id
 * is ON DELETE CASCADE, so a delete never actually fails at the database
 * level for that reason alone, but this is kept for callers who want to
 * warn the admin before cascading away reward configuration.
 */
export class EventHasRewardsError extends Error {
  constructor() {
    super('This event still has rewards configured.');
    this.name = 'EventHasRewardsError';
  }
}

export async function deleteEvent(eventId: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', eventId);

  if (error) {
    throw new Error(error.message);
  }
}
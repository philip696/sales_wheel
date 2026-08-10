import { supabase } from '@/src/lib/supabase';
import type {
  RequestSpinPayload,
  RequestSpinResult,
  Spin,
} from '@/src/types';

/**
 * Requests a spin from the backend. Reward selection and eligibility
 * are enforced server-side — never trust client-side randomization.
 */
export async function requestSpin(
  payload: RequestSpinPayload
): Promise<RequestSpinResult> {
  const { data, error } = await supabase.rpc('request_spin', {
    p_attendance_id: payload.attendanceId,
    p_store_id: payload.storeId,
    p_latitude: payload.latitude,
    p_longitude: payload.longitude,
  });

  if (error) {
    throw new Error(error.message);
  }

  const result = data?.[0];
  if (!result) {
    throw new Error('No spin result returned from server');
  }

  return {
    spinId: result.spin_id,
    status: result.status,
    reward:
      result.reward_id && result.reward_name
        ? {
            id: result.reward_id,
            name: result.reward_name,
            value: result.reward_value ?? '',
          }
        : null,
    rejectionReason: result.rejection_reason,
  };
}

export async function getMySpinHistory(limit = 20): Promise<Spin[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('spins')
    .select('*')
    .eq('sales_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

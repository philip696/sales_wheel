import { supabase } from '@/src/lib/supabase';
import type { AuditAction } from '@/src/types';
import type { Json } from '@/src/types/database';

export async function logAuditEvent(params: {
  action: AuditAction;
  storeId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('audit_logs').insert({
    sales_id: user?.id ?? null,
    action: params.action,
    store_id: params.storeId ?? null,
    metadata: (params.metadata ?? null) as Json | null,
  });

  if (error) {
    console.warn('Failed to write audit log:', error.message);
  }
}

// src/lib/tenantMembers.ts
// This tiny helper just loads members for a given tenant_id
// from the view v_tenant_user_memberships.

import { getSupabaseServer } from '@/lib/supabaseServer';

export type TenantMember = {
  tenant_id: string;
  tenant_name: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  is_platform_owner: boolean;
  role: string;
  created_at: string;
};

export async function getTenantMembers(
  tenantId: string
): Promise<TenantMember[]> {
  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from('v_tenant_user_memberships')
    .select(
      'tenant_id, tenant_name, user_id, full_name, email, is_platform_owner, role, created_at'
    )
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('[getTenantMembers] error loading members', error);
    return [];
  }

  return (data ?? []) as TenantMember[];
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_ROLES = ['viewer','crew','crew_leader','dispatcher','admin','owner'] as const;

export async function POST(req: Request) {
  const { tenantId, userId, role } = await req.json().catch(() => ({}));
  if (!tenantId || !userId || !role) {
    return NextResponse.json({ error: 'tenantId, userId, and role are required' }, { status: 400 });
  }
  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: () => cookies() }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: me } = await supabase
    .from('profiles')
    .select('is_platform_owner')
    .eq('id', user.id)
    .single();

  if (!me?.is_platform_owner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Prevent demoting the last owner
  const { data: owners, error: ownersErr } = await admin
    .from('tenant_memberships')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .eq('role', 'owner');

  if (ownersErr) return NextResponse.json({ error: ownersErr.message }, { status: 400 });

  const ownerCount = owners?.length ?? 0;
  const isTargetOwner = owners?.some(o => o.user_id === userId) ?? false;
  if (isTargetOwner && ownerCount <= 1 && role !== 'owner') {
    return NextResponse.json({ error: 'Cannot change role: this is the last owner.' }, { status: 409 });
  }

  const { error: updErr } = await admin
    .from('tenant_memberships')
    .update({ role })
    .eq('tenant_id', tenantId)
    .eq('user_id', userId);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

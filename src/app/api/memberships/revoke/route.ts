export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const { tenantId, userId } = await req.json().catch(() => ({}));
  if (!tenantId || !userId) {
    return NextResponse.json({ error: 'tenantId and userId required' }, { status: 400 });
  }

  // Cookie adapter that works across @supabase/ssr versions
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: any) {
          cookieStore.set({ name, value, ...(options || {}) });
          return;
        },
        remove(name: string, options?: any) {
          cookieStore.set({ name, value: '', ...(options || {}), maxAge: 0 });
          return;
        },
      } as any,
    } as any
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

  // protect against removing last owner
  const { data: owners, error: ownersErr } = await admin
    .from('tenant_memberships')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .eq('role', 'owner');
  if (ownersErr) return NextResponse.json({ error: ownersErr.message }, { status: 400 });

  const ownerCount = owners?.length ?? 0;
  const isTargetOwner = owners?.some(o => o.user_id === userId) ?? false;
  if (isTargetOwner && ownerCount <= 1) {
    return NextResponse.json({ error: 'Cannot revoke the last owner of this tenant' }, { status: 409 });
  }

  const { error: delErr } = await admin
    .from('tenant_memberships')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('user_id', userId);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

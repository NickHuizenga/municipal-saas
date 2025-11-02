import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const { tenantId, userId } = await req.json().catch(() => ({}));
  if (!tenantId || !userId) return NextResponse.json({ error: 'tenantId and userId required' }, { status: 400 });

  // Auth + owner check
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n: string) => cookieStore.get(n)?.value,
        set: (n: string, v: string, o: CookieOptions) => cookieStore.set({ name: n, value: v, ...o }),
        remove: (n: string, o: CookieOptions) => cookieStore.set({ name: n, value: '', ...o, maxAge: 0 }),
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: me } = await supabase.from('profiles').select('is_platform_owner').eq('id', user.id).single();
  if (!me?.is_platform_owner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Prevent removing the last owner
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

  // Revoke membership
  const { error: delErr } = await admin
    .from('tenant_memberships')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('user_id', userId);

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

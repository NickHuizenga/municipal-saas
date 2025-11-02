export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  // ✅ works with both old/new @supabase/ssr
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...(options || {}) });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...(options || {}), maxAge: 0 });
        },
      } as any,
    } as any
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_owner')
    .eq('id', user.id)
    .single();
  if (!profile?.is_platform_owner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = (body.email ?? '').trim().toLowerCase();
  const tenantId: string | null = body.tenantId ?? null;
  const role: string = body.role ?? 'viewer';
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: inviteRes, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email);
  if (inviteErr && !inviteErr.message.toLowerCase().includes('already registered')) {
    return NextResponse.json({ error: inviteErr.message }, { status: 400 });
  }

  let userId = inviteRes?.user?.id ?? null;
  if (!userId) {
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) return NextResponse.json({ error: listErr.message }, { status: 400 });
    userId = list.users.find(u => (u.email ?? '').toLowerCase() === email)?.id ?? null;
  }
  if (!userId) return NextResponse.json({ error: 'Could not resolve user id after invite' }, { status: 500 });

  if (tenantId) {
    const { error: memErr } = await admin
      .from('tenant_memberships')
      .upsert({ tenant_id: tenantId, user_id: userId, role }, { onConflict: 'tenant_id,user_id' });
    if (memErr) {
      return NextResponse.json({ error: `Invited, but membership failed: ${memErr.message}`, userId }, { status: 207 });
    }
  }

  return NextResponse.json({ ok: true, userId, invited: !!inviteRes?.user, email, tenantId, role });
}

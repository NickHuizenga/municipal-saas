export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenantId = url.searchParams.get('tenantId');
  if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 });

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

  const { data: me } = await supabase.from('profiles').select('is_platform_owner').eq('id', user.id).single();
  if (!me?.is_platform_owner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: memberships, error: memErr } = await admin
    .from('tenant_memberships')
    .select('user_id, role')
    .eq('tenant_id', tenantId);
  if (memErr) return NextResponse.json({ error: memErr.message }, { status: 400 });

  const { data: usersList, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 400 });

  const emailById = new Map(usersList.users.map(u => [u.id, (u.email ?? '').toLowerCase()]));
  const rows = (memberships ?? []).map(m => ({
    user_id: m.user_id,
    email: emailById.get(m.user_id) ?? null,
    role: (m as any).role,
  }));

  return NextResponse.json({ members: rows });
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  // 1) Verify caller is signed in and is platform owner
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_owner')
    .eq('id', user.id)
    .single();

  if (!profile?.is_platform_owner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2) Parse payload
  const body = await req.json().catch(() => ({}));
  const email = (body.email ?? '').trim().toLowerCase();
  const tenantId = body.tenantId ?? null; // optional
  const role = body.role ?? 'viewer';     // default

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // 3) Use Service Role admin client (server only!)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // NEVER expose to client
  );

  // 4) Send an invite (user sets password via email)
  const { data: inviteRes, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email);
  if (inviteErr) {
    // If user already exists, we can proceed to membership step
    if (inviteErr.message?.toLowerCase().includes('already registered')) {
      // continue
    } else {
      return NextResponse.json({ error: inviteErr.message }, { status: 400 });
    }
  }

  // figure out user id whether newly invited or existing
  let userId = inviteRes?.user?.id ?? null;

  if (!userId) {
    // fetch existing user by email
    const { data: got, error: getErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (getErr) {
      return NextResponse.json({ error: getErr.message }, { status: 400 });
    }
    userId = got.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
  }

  if (!userId) {
    return NextResponse.json({ error: 'Could not resolve user id after invite' }, { status: 500 });
  }

  // 5) (Optional) attach them to a tenant with a role
  if (tenantId) {
    // Service role bypasses RLS for this insert
    const { error: memErr } = await admin
      .from('tenant_memberships')
      .upsert({ tenant_id: tenantId, user_id: userId, role }, { onConflict: 'tenant_id,user_id' });

    if (memErr) {
      return NextResponse.json({ error: `Invited, but membership failed: ${memErr.message}`, userId }, { status: 207 });
    }
  }

  return NextResponse.json({ ok: true, userId, invited: !!inviteRes?.user, email, tenantId, role });
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const form = await req.formData();
  const tenant_id = String(form.get('tenant_id') ?? '');
  const next = String(form.get('next') ?? '/tenant/resolve');

  if (!tenant_id) return NextResponse.redirect(new URL('/tenant/select', req.url));

  cookies().set('tenant_id', tenant_id, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 });
  return NextResponse.redirect(new URL(next, req.url));
}

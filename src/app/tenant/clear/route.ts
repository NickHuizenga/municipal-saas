import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  cookies().set('tenant_id', '', { path: '/', maxAge: 0 });
  return NextResponse.redirect(new URL('/tenant/select', req.url));
}

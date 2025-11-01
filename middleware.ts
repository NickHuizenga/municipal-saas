import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/dashboard', '/work-orders', '/sampling', '/mft', '/grants'];
const PUBLIC = ['/', '/login', '/tenant/select', '/tenant/resolve', '/api', '/auth'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always let /login through
  if (pathname === '/login' || pathname.startsWith('/login/')) return NextResponse.next();

  // Allow all public paths
  if (PUBLIC.some(p => pathname === p || pathname.startsWith(p + '/'))) return NextResponse.next();

  // Protect module routes if no tenant cookie
  if (PROTECTED_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    const tenantId = req.cookies.get('tenant_id')?.value;
    if (!tenantId) {
      const url = req.nextUrl.clone();
      url.pathname = '/tenant/select';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next|favicon.ico|images|fonts).*)'] };

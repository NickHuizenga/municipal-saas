// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    // This exchanges the code for a logged-in session cookie
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Send the user to home (or to whatever ?next= says)
  return NextResponse.redirect(new URL(next, request.url));
}

// middleware.ts
// Temporary no-op middleware so auth routing doesn't blow up.

export function middleware() {
  // Do nothing; let the app handle routing.
  return;
}

// Apply to no routes (effectively disabled)
export const config = {
  matcher: [],
};

// src/app/settings/members/page.tsx
import MembersClient from "./members-client";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  // Client component will fetch with user cookies to your API routes.
  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Manage roles and remove members.
      </p>
      <MembersClient />
    </main>
  );
}

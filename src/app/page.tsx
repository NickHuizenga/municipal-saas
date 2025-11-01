import Link from "next/link";

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Welcome</h1>
      <p className="text-neutral-400 mb-6">Start by choosing a tenant.</p>
      <Link href="/tenant/select" className="rounded-2xl bg-white/10 hover:bg-white/15 px-4 py-2">
        Go to Tenant Select
      </Link>
    </main>
  );
}

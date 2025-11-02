// src/app/page.tsx
export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-lg p-8 text-center border border-gray-700 rounded-2xl shadow-md bg-gray-800">
        <h1 className="text-3xl font-bold mb-4">Municipal SaaS Platform</h1>
        <p className="mb-6 text-gray-400">
          Multi-tenant management platform powered by Next.js and Supabase.
        </p>
        <a
          href="/login"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition"
        >
          Go to Login
        </a>
      </div>
    </main>
  );
}

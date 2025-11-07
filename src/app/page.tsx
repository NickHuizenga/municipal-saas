// src/app/page.tsx

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#020617",
        color: "#e5e7eb",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        padding: "2rem",
      }}
    >
      <div
        style={{
          padding: "1.5rem 2rem",
          borderRadius: "1rem",
          border: "1px solid #27272a",
          backgroundColor: "#09090b",
          maxWidth: "32rem",
        }}
      >
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 600,
            marginBottom: "0.5rem",
          }}
        >
          Municipal SaaS Platform
        </h1>
        <p
          style={{
            fontSize: "0.9rem",
            color: "#a1a1aa",
            marginBottom: "0.75rem",
          }}
        >
          This is a temporary home page to keep the app stable while we fix
          auth routing.
        </p>
        <p style={{ fontSize: "0.8rem", color: "#71717a" }}>
          You&apos;re signed in if Supabase accepted your credentials, but this
          page does not run any server-side Supabase code. From here you can
          manually open:
        </p>
        <ul
          style={{
            marginTop: "0.5rem",
            fontSize: "0.8rem",
            color: "#e5e7eb",
            paddingLeft: "1rem",
            listStyleType: "disc",
          }}
        >
          <li>
            <code>/owner</code> – Platform Owner Dashboard
          </li>
          <li>
            <code>/tenant/select</code> – Tenant selection
          </li>
          <li>
            <code>/login</code> – Login page
          </li>
        </ul>
      </div>
    </main>
  );
}

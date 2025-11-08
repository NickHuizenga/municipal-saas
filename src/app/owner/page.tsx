// src/app/owner/page.tsx

export default function OwnerPlaceholderPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem",
        backgroundColor: "#020617",
        color: "#e5e7eb",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          padding: "1.5rem 2rem",
          borderRadius: "1rem",
          border: "1px solid #27272a",
          backgroundColor: "#09090b",
        }}
      >
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 600,
            marginBottom: "0.5rem",
          }}
        >
          Platform Owner Dashboard (Temporary)
        </h1>
        <p
          style={{
            fontSize: "0.95rem",
            color: "#a1a1aa",
            marginBottom: "0.75rem",
          }}
        >
          This is a placeholder for <code>/owner</code> so the route renders
          without server errors while we reconnect Supabase and the real
          dashboard UI.
        </p>
        <p style={{ fontSize: "0.85rem", color: "#71717a" }}>
          You are successfully hitting the owner route. Once this page is
          stable, we&apos;ll bring back:
        </p>
        <ul
          style={{
            marginTop: "0.5rem",
            fontSize: "0.85rem",
            color: "#e5e7eb",
            paddingLeft: "1.25rem",
            listStyleType: "disc",
          }}
        >
          <li>Tenant cards with module chips</li>
          <li>&ldquo;Manage Tenant&rdquo; / &ldquo;Module Settings&rdquo; buttons</li>
          <li>Member counts and feature flags per tenant</li>
        </ul>
      </div>
    </main>
  );
}

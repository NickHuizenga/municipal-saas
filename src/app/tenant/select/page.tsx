// src/app/tenant/select/page.tsx

export default function TenantSelectPlaceholderPage() {
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
          Select a Tenant (Temporary)
        </h1>
        <p
          style={{
            fontSize: "0.95rem",
            color: "#a1a1aa",
            marginBottom: "0.75rem",
          }}
        >
          This is a placeholder for <code>/tenant/select</code> so the route
          renders without server errors while we rewire the real tenant
          selection grid.
        </p>
        <p style={{ fontSize: "0.85rem", color: "#71717a" }}>
          You are successfully hitting the tenant selection route. Soon this
          page will show:
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
          <li>All tenants you can access</li>
          <li>Module chips and membership role per tenant</li>
          <li>&ldquo;Continue&rdquo; buttons that set the tenant cookie</li>
        </ul>
      </div>
    </main>
  );
}

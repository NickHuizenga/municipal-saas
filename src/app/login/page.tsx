// src/app/login/page.tsx

export default function LoginPage() {
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
      }}
    >
      <div
        style={{
          padding: "1.5rem 2rem",
          borderRadius: "1rem",
          border: "1px solid #27272a",
          backgroundColor: "#09090b",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          Temporary Login Page
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#a1a1aa" }}>
          This is a placeholder just to make sure the <code>/login</code> route
          renders without errors.
        </p>
        <p style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "#71717a" }}>
          Once you can see this screen on <code>/login</code>, we&apos;ll wire Supabase
          sign-in back in.
        </p>
      </div>
    </main>
  );
}

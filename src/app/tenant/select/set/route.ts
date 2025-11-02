// src/app/tenant/select/set/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const ct = request.headers.get("content-type") || "";
  let tenant_id: string | null = null;

  if (ct.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    tenant_id = body?.tenant_id ?? null;
  } else if (ct.includes("application/x-www-form-urlencoded")) {
    const body = await request.formData().catch(() => null);
    tenant_id = (body?.get("tenant_id") as string) ?? null;
  }

  if (!tenant_id) {
    return NextResponse.json({ ok: false, error: "tenant_id required" }, { status: 400 });
  }

  const name = process.env.TENANT_COOKIE_NAME || "tenant_id";
  cookies().set(name, tenant_id, { path: "/", httpOnly: true, sameSite: "lax" });
  return NextResponse.json({ ok: true });
}

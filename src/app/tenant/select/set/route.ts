// src/app/tenant/select/set/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { tenant_id } = await req.json();
  if (!tenant_id) return NextResponse.json({ ok: false }, { status: 400 });

  const name = process.env.TENANT_COOKIE_NAME || "tenant_id";
  cookies().set(name, tenant_id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });

  return NextResponse.json({ ok: true });
}

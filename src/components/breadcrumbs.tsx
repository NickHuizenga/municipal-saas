// src/components/breadcrumbs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  tenantName?: string | null;
};

/**
 * Breadcrumbs
 * - Tenant-aware: shows the active tenant name first (if available), otherwise "Home"
 * - URL-aware: builds clickable crumbs from the current path
 * - Smart labels: maps known segments to friendly names; prettifies unknowns
 * - ID handling: hides noisy IDs or renders nicer tokens (e.g., "Ticket #42")
 */
export default function Breadcrumbs({ tenantName }: Props) {
  const pathname = usePathname() || "/";
  const segments = pathname.split("/").filter(Boolean);

  // Map route segments to friendly labels
  const LABELS: Record<string, string> = {
    // Top-level
    "": "Home",
    "work-orders": "Work Orders",
    "sampling": "Sampling & Compliance",
    "mft": "MFT Tracker",
    "grants": "Grants",
    "settings": "Settings",
    "tenant": "Tenant",
    // Subpaths
    "members": "Members",
    "invite": "Invite",
    "select": "Select",
    "resolve": "Resolve",
    "login": "Login",
  };

  // Heuristics to detect IDs and make them pleasant
  const isUUID = (s: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      s
    );
  const isLikelyId = (s: string) =>
    isUUID(s) || /^[A-Za-z0-9_-]{16,}$/.test(s); // long tokens (ksuid, cuid, etc.)

  const toTitle = (s: string) =>
    s
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();

  const buildCrumbs = () => {
    const crumbs: { href: string; label: string }[] = [];

    // First crumb: tenant or home
    crumbs.push({
      href: "/",
      label: tenantName?.trim() ? tenantName.trim() : "Home",
    });

    // Build the rest from segments
    let accum = "";
    segments.forEach((seg, i) => {
      accum += `/${seg}`;

      // Skip if first segment is empty (root)
      if (!seg) return;

      // Friendly label mapping or fallback
      let label =
        LABELS[seg] ??
        (isLikelyId(seg)
          ? // If it follows a known module, render a nicer token:
            // e.g., /work-orders/42 => "Ticket #42"
            (segments[i - 1] === "work-orders" && /^\d+$/.test(seg)
              ? `Ticket #${seg}`
              : "Details")
          : toTitle(seg));

      crumbs.push({ href: accum, label });
    });

    // Collapse duplicate first crumb if tenantName is shown and the first segment is ""
    // (handled naturally above)

    // De-duplicate simple cases (e.g., when "/" only)
    return crumbs.filter((c, idx, arr) => {
      if (idx === 0) return true;
      const prev = arr[idx - 1];
      return !(c.href === prev.href && c.label === prev.label);
    });
  };

  const crumbs = buildCrumbs();

  if (crumbs.length <= 1) {
    // Only "Home/Tenant" – keep UI tidy; show nothing on pure dashboard
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="w-full overflow-x-auto text-sm text-muted-foreground"
    >
      <ol className="flex items-center gap-2 py-2">
        {crumbs.map((c, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <li key={c.href} className="flex items-center gap-2">
              {isLast ? (
                <span className="font-medium text-foreground">{c.label}</span>
              ) : (
                <Link
                  href={c.href}
                  className="hover:underline whitespace-nowrap"
                >
                  {c.label}
                </Link>
              )}
              {!isLast && <span className="text-muted-foreground">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

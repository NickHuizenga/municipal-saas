"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-[rgb(var(--border))] px-3 py-1 text-sm text-[rgb(var(--muted-foreground))] ${className}`}
    >
      {children}
    </span>
  );
}

function Dropdown({
  label,
  items,
}: {
  label: string;
  items: { label: string; href: string; disabled?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center rounded-full border border-[rgb(var(--border))] px-3 py-1 text-sm text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))] focus:outline-none"
      >
        {label}
        <svg
          className={`ml-2 h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.106l3.71-3.875a.75.75 0 111.08 1.04l-4.24 4.43a.75.75 0 01-1.08 0l-4.24-4.43a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--popover))] shadow-xl">
          <nav className="flex flex-col py-1">
            {items.map((item) =>
              item.disabled ? (
                <div
                  key={item.label}
                  className="px-3 py-2 text-sm text-[rgb(var(--popover-foreground))] opacity-50 cursor-not-allowed select-none"
                >
                  {item.label}
                </div>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="px-3 py-2 text-sm text-[rgb(var(--popover-foreground))] hover:bg-[rgb(var(--muted))]"
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const name = "Nick";
  const isPlatformOwner = true;
  const role = "owner";

  const viewItems = [
    { href: "/", label: "Dashboard" },
    { href: "/tenant/select", label: "Tenants" },
    { href: "/owner", label: "Owner Dashboard" },
  ];

  const moduleItems = [
    { href: "/work-orders", label: "Work Orders" },
    { href: "/sampling", label: "Sampling & Compliance" },
    { href: "/mft", label: "MFT Tracker" },
    { href: "/grants", label: "Grants" },
  ];

  return (
    <header className="mx-auto mb-4 mt-2 w-full max-w-6xl rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Left side: Account info */}
        <div className="flex items-center gap-3">
          <Pill>{isPlatformOwner ? "Platform Owner" : role}</Pill>
          <span className="text-sm text-[rgb(var(--muted-foreground))]">{name}</span>
        </div>

        {/* Right side: Dropdowns */}
        <div className="flex items-center gap-3">
          <Dropdown label="View" items={viewItems} />
          <Dropdown label="Module" items={moduleItems} />
        </div>
      </div>
    </header>
  );
}

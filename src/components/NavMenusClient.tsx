"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type MenuItem = { label: string; href: string; disabled?: boolean };

function Dropdown({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // click-outside to close
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
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
                  className="cursor-not-allowed select-none px-3 py-2 text-sm text-[rgb(var(--popover-foreground))] opacity-50"
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

export default function NavMenusClient({
  viewItems,
  moduleItems,
  addItems,
  showAddWhenPathStartsWith = "/owner",
}: {
  viewItems: MenuItem[];
  moduleItems: MenuItem[];
  addItems?: MenuItem[]; // only for platform owners
  showAddWhenPathStartsWith?: string; // render Add only on /owner*
}) {
  const showAdd = useMemo(() => {
    if (!addItems || addItems.length === 0) return false;
    if (typeof window === "undefined") return false;
    return window.location.pathname.startsWith(showAddWhenPathStartsWith);
  }, [addItems, showAddWhenPathStartsWith]);

  return (
    <div className="flex items-center gap-3">
      <Dropdown label="View" items={viewItems} />
      <Dropdown label="Module" items={moduleItems} />
      {showAdd ? <Dropdown label="Add" items={addItems!} /> : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type DropdownItem = {
  href: string;
  label: string;
};

type HeaderDropdownProps = {
  label: string;
  items: DropdownItem[];
};

export function HeaderDropdown({ label, items }: HeaderDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex cursor-pointer items-center rounded-full border border-[rgb(var(--border))] px-3 py-1.5 text-xs text-[rgb(var(--foreground))] hover:bg-[rgb(var(--muted))]"
      >
        <span>{label}</span>
        <span
          className={`ml-1 text-[0.7rem] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-44 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--popover))] py-1 shadow-lg">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-1.5 text-xs text-[rgb(var(--foreground))] hover:bg-[rgb(var(--muted))]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

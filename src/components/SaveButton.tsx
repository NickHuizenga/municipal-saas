"use client";

import { useEffect, useState } from "react";

type Props = {
  formId: string;
  label: string;
  className?: string;
};

export default function SaveButton({ formId, label, className }: Props) {
  const [dirty, setDirty] = useState(false);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    const handleChange = () => setDirty(true);

    form.addEventListener("input", handleChange);
    form.addEventListener("change", handleChange);

    return () => {
      form.removeEventListener("input", handleChange);
      form.removeEventListener("change", handleChange);
    };
  }, [formId]);

  const handleClick = () => {
    // user clicked submit
    setFlashing(true);
    setDirty(false);
    setTimeout(() => setFlashing(false), 350);
  };

  const base =
    "inline-flex items-center rounded-lg border border-[rgb(var(--border))] px-3 py-1.5 text-sm transition-colors";
  const neutral =
    "bg-transparent text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))]";
  const active = "bg-blue-500 text-white hover:bg-blue-600";
  const success = "bg-green-500 text-white";

  const stateClass = flashing ? success : dirty ? active : neutral;

  return (
    <button
      type="submit"
      onClick={handleClick}
      className={`${base} ${stateClass} ${className ?? ""}`}
    >
      {label}
    </button>
  );
}

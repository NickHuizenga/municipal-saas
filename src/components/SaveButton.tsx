"use client";

import { useState, useEffect } from "react";

export default function SaveButton({
  label = "Save",
  formSelector,
}: {
  label?: string;
  formSelector: string; // CSS selector or name attribute of the form
}) {
  const [changed, setChanged] = useState(false);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>(formSelector);
    if (!form) return;

    const handleInput = () => setChanged(true);
    form.addEventListener("input", handleInput);
    return () => form.removeEventListener("input", handleInput);
  }, [formSelector]);

  const handleClick = () => {
    setFlashing(true);
    setChanged(false);
    setTimeout(() => setFlashing(false), 400);
  };

  const base =
    "rounded-lg border border-[rgb(var(--border))] px-3 py-1.5 text-sm transition-colors";

  const normal =
    "bg-transparent text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))]";
  const active = "bg-blue-500 text-white hover:bg-blue-600";
  const flash = "bg-green-500 text-white";

  return (
    <button
      type="submit"
      onClick={handleClick}
      className={`${base} ${
        flashing ? flash : changed ? active : normal
      }`}
    >
      {label}
    </button>
  );
}

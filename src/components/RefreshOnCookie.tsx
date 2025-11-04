"use client";

import { useEffect } from "react";

type Props = {
  cookieName?: string;
  intervalMs?: number;
};

export default function RefreshOnCookie({
  cookieName = "owner_refresh",
  intervalMs = 400,
}: Props) {
  useEffect(() => {
    const check = () => {
      if (typeof document === "undefined") return;
      const has = document.cookie
        .split("; ")
        .some((c) => c.startsWith(`${cookieName}=`));
      if (has) {
        // Clear the cookie so this only fires once
        document.cookie = `${cookieName}=; Max-Age=0; path=/`;
        window.location.reload();
      }
    };

    const id = window.setInterval(check, intervalMs);
    return () => window.clearInterval(id);
  }, [cookieName, intervalMs]);

  return null;
}

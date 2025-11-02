"use client";
import { useTransition } from "react";

export default function SmartForm({
  action,
  children,
  className,
}: {
  action: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          await action(fd);
          // 🔄 flash-reload effect
          document.body.style.transition = "opacity 0.2s";
          document.body.style.opacity = "0.3";
          setTimeout(() => {
            window.location.reload();
          }, 180);
        });
      }}
    >
      {children}
      {pending && (
        <div className="mt-2 text-xs text-[rgb(var(--muted-foreground))]">
          Saving…
        </div>
      )}
    </form>
  );
}

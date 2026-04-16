"use client";

import { cn } from "@/lib/utils";

const ENFORCEMENT_DATE = "2026-08-02";

function daysUntilEnforcement(): number {
  const target = new Date(ENFORCEMENT_DATE);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

interface EnforcementCountdownProps {
  variant?: "badge" | "hero";
  className?: string;
}

export function EnforcementCountdown({ variant = "badge", className }: EnforcementCountdownProps) {
  const daysLeft = daysUntilEnforcement();

  const urgencyClass =
    daysLeft <= 30
      ? "bg-red-950 border-red-800 text-red-300"
      : daysLeft <= 90
        ? "bg-amber-950 border-amber-800 text-amber-300"
        : "bg-green-950 border-green-800 text-green-300";

  const dotClass =
    daysLeft <= 30
      ? "bg-red-400"
      : daysLeft <= 90
        ? "bg-amber-400"
        : "bg-green-400";

  if (variant === "badge") {
    return (
      <div
        className={cn("flex items-center gap-2 rounded-full border px-3 py-1", urgencyClass, className)}
        role="status"
        aria-live="polite"
      >
        <div className={cn("h-2 w-2 rounded-full motion-safe:animate-pulse", dotClass)} />
        <span className="text-xs font-medium">{daysLeft}d to enforcement</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-gradient-to-br from-primary/20 to-card p-8 text-center",
        "border-primary/30",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <p className="text-sm text-muted-foreground mb-2">EU AI Act Full Enforcement</p>
      <div className="text-7xl font-semibold tabular-nums text-foreground mb-1">{daysLeft}</div>
      <p className="text-lg font-semibold text-primary">days remaining</p>
      <p className="text-sm text-muted-foreground mt-2">
        August 2, 2026 — Act now to avoid fines up to €35M
      </p>
    </div>
  );
}

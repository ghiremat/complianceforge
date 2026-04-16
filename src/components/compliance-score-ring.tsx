"use client";

import { cn } from "@/lib/utils";

interface ComplianceScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}

export function ComplianceScoreRing({
  score,
  size = 120,
  strokeWidth = 8,
  label,
  className,
}: ComplianceScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(Math.max(score, 0), 100) / 100) * circumference;

  const scoreColor =
    score >= 80
      ? "text-green-400 stroke-green-500"
      : score >= 50
        ? "text-yellow-400 stroke-yellow-500"
        : "text-red-400 stroke-red-500";

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      role="img"
      aria-label={`Compliance score: ${score}%`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={scoreColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.8s ease-out",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-semibold tabular-nums", scoreColor.split(" ")[0], {
          "text-2xl": size >= 100,
          "text-lg": size >= 60 && size < 100,
          "text-sm": size < 60,
        })}>
          {score}%
        </span>
        {label && (
          <span className="text-xs text-muted-foreground mt-0.5">{label}</span>
        )}
      </div>
    </div>
  );
}

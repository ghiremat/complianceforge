import { cn } from "@/lib/utils";

interface ScoreBarProps {
  score: number;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function ScoreBar({ score, className, showLabel = true, size = "md" }: ScoreBarProps) {
  const barColor =
    score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500";

  const textColor =
    score >= 80 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400";

  const heights = { sm: "h-1.5", md: "h-2", lg: "h-3" };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("flex-1 rounded-full bg-muted", heights[size])}>
        <div
          className={cn("rounded-full transition-all duration-500", barColor, heights[size])}
          style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Compliance: ${score}%`}
        />
      </div>
      {showLabel && (
        <span className={cn("text-xs font-semibold tabular-nums w-8 text-right", textColor)}>
          {score}%
        </span>
      )}
    </div>
  );
}

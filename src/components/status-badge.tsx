import { Badge } from "@/src/components/ui/badge";
import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize transition-colors",
  {
    variants: {
      variant: {
        // Risk levels
        "risk-unacceptable": "bg-red-900/80 text-red-300 border border-red-700/50",
        "risk-high": "bg-orange-900/80 text-orange-300 border border-orange-700/50",
        "risk-limited": "bg-yellow-900/80 text-yellow-300 border border-yellow-700/50",
        "risk-minimal": "bg-green-900/80 text-green-300 border border-green-700/50",
        "risk-unassessed": "bg-muted text-muted-foreground border border-border",
        // Document status
        "status-draft": "bg-muted text-muted-foreground border border-border",
        "status-in-review": "bg-blue-900/80 text-blue-300 border border-blue-700/50",
        "status-approved": "bg-green-900/80 text-green-300 border border-green-700/50",
        "status-expired": "bg-red-900/80 text-red-300 border border-red-700/50",
        // Compliance status
        "compliant": "bg-green-900/80 text-green-300 border border-green-700/50",
        "in-progress": "bg-yellow-900/80 text-yellow-300 border border-yellow-700/50",
        "non-compliant": "bg-red-900/80 text-red-300 border border-red-700/50",
        "not-applicable": "bg-muted text-muted-foreground border border-border",
        // Priority/severity
        "priority-high": "bg-red-900/80 text-red-300 border border-red-700/50",
        "priority-medium": "bg-amber-900/80 text-amber-300 border border-amber-700/50",
        "priority-low": "bg-green-900/80 text-green-300 border border-green-700/50",
      },
    },
    defaultVariants: {
      variant: "risk-unassessed",
    },
  }
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  label?: string;
}

export function StatusBadge({ className, variant, label, children, ...props }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ variant }), className)} {...props}>
      {label ?? children}
    </span>
  );
}

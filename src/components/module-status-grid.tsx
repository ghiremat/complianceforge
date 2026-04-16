"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";

interface ModuleStatus {
  name: string;
  article: string;
  status: "approved" | "in_review" | "draft" | "not_started" | "expired";
  lastUpdated?: string;
}

const DEFAULT_MODULES: ModuleStatus[] = [
  { name: "Risk Classification", article: "Art. 6", status: "not_started" },
  { name: "Risk Management", article: "Art. 9", status: "not_started" },
  { name: "Technical Docs", article: "Art. 11", status: "not_started" },
  { name: "Data Governance", article: "Art. 10", status: "not_started" },
  { name: "Human Oversight", article: "Art. 14", status: "not_started" },
  { name: "Quality Mgmt", article: "Art. 17", status: "not_started" },
  { name: "Post-Market", article: "Art. 72", status: "not_started" },
  { name: "Incident Reports", article: "Art. 73", status: "not_started" },
  { name: "Conformity", article: "Art. 43", status: "not_started" },
  { name: "EU Registration", article: "Art. 71", status: "not_started" },
];

const STATUS_CONFIG = {
  approved: { bg: "bg-green-900/60", border: "border-green-700/50", dot: "bg-green-400", label: "Approved" },
  in_review: { bg: "bg-blue-900/60", border: "border-blue-700/50", dot: "bg-blue-400", label: "In Review" },
  draft: { bg: "bg-yellow-900/60", border: "border-yellow-700/50", dot: "bg-yellow-400", label: "Draft" },
  not_started: { bg: "bg-muted/50", border: "border-border", dot: "bg-muted-foreground/40", label: "Not Started" },
  expired: { bg: "bg-red-900/60", border: "border-red-700/50", dot: "bg-red-400", label: "Expired" },
};

interface ModuleStatusGridProps {
  modules?: ModuleStatus[];
  className?: string;
}

export function ModuleStatusGrid({ modules = DEFAULT_MODULES, className }: ModuleStatusGridProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-5", className)}>
        {modules.map((mod) => {
          const cfg = STATUS_CONFIG[mod.status];
          return (
            <Tooltip key={mod.article}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "rounded-lg border p-3 transition-all duration-200",
                    "hover:shadow-md hover:-translate-y-0.5 cursor-default",
                    cfg.bg,
                    cfg.border
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot)} />
                    <span className="text-[10px] font-mono font-medium text-muted-foreground">
                      {mod.article}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-foreground leading-tight truncate">
                    {mod.name}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{mod.name}</p>
                <p className="text-xs text-muted-foreground">
                  {cfg.label}
                  {mod.lastUpdated && ` · ${mod.lastUpdated}`}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

"use client";

import { useEffect, useState } from "react";

interface TraceRecord {
  trace_id: string;
  prompt: string;
  output: string;
  explanation: string;
  confidence_score: number;
  top_features: { name: string; attribution: number }[];
  art13_compliant: boolean;
  created_at: string;
}

interface Props {
  systemId: string;
}

export function ExplainabilityEvidence({ systemId }: Props) {
  const [traces, setTraces] = useState<TraceRecord[]>([]);
  const [explainabilityScore, setExplainabilityScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch(`/api/passport/${systemId}/traces?limit=5`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load traces");
        return r.json();
      })
      .then((data) => {
        const traceList: TraceRecord[] = data.traces ?? [];
        setTraces(traceList);
        const total = data.total ?? traceList.length;
        const compliant = traceList.filter((t) => t.art13_compliant).length;
        setExplainabilityScore(
          total > 0 ? Math.round((compliant / total) * 100) : 0
        );
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to load explainability data.");
        setLoading(false);
      });
  }, [systemId]);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/passport/${systemId}/traces/export`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `art13-evidence-${systemId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* export error — silently handled */
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <ExplainabilityEvidenceSkeleton />;
  if (error) return null;

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900/90 p-6 shadow-2xl shadow-black/50 backdrop-blur-sm sm:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
          Explainability Evidence
        </h2>
        <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-950/80 px-3 py-1 text-[10px] font-semibold text-emerald-200">
          Art. 13 EU AI Act
        </span>
      </div>

      {/* Score bar */}
      <div className="mt-6">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Explainability Score</span>
          <span className="font-semibold tabular-nums text-white">
            {explainabilityScore}%
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-700"
            style={{ width: `${explainabilityScore}%` }}
          />
        </div>
      </div>

      {/* Trace cards */}
      <div className="mt-6">
        {traces.length === 0 ? (
          <p className="text-sm text-gray-500">
            No inference traces yet. Integrate the SDK to start logging
            decisions.
          </p>
        ) : (
          <>
            <p className="mb-3 text-xs font-medium text-gray-500">
              Last {traces.length} decisions explained
            </p>
            <div className="space-y-3">
              {traces.map((trace) => (
                <TraceCard key={trace.trace_id} trace={trace} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Export */}
      {traces.length > 0 && (
        <button
          onClick={handleExportPDF}
          disabled={exporting}
          className="mt-6 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-200 transition hover:border-gray-600 hover:bg-gray-750 hover:text-white disabled:opacity-50"
        >
          {exporting ? "Exporting…" : "Export Art. 13 PDF Bundle"}
        </button>
      )}
    </section>
  );
}

function TraceCard({ trace }: { trace: TraceRecord }) {
  const topFeature = trace.top_features?.[0];
  const timeAgo = getTimeAgo(trace.created_at);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium text-gray-200">
          &ldquo;{trace.prompt.slice(0, 60)}
          {trace.prompt.length > 60 ? "…" : ""}&rdquo;
        </span>
        <span className="shrink-0 text-xs text-gray-500">{timeAgo}</span>
      </div>

      {topFeature && (
        <p className="mt-1.5 text-xs text-gray-400">
          Top feature:{" "}
          <span className="font-mono text-gray-200">{topFeature.name}</span>{" "}
          <span className="text-gray-500">
            ({(topFeature.attribution * 100).toFixed(0)}%)
          </span>
        </p>
      )}

      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">
        {trace.explanation}
      </p>

      <div className="mt-2">
        {trace.art13_compliant ? (
          <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
            ✓ Art. 13 Compliant
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-950/60 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300">
            ⚠ Needs Review
          </span>
        )}
      </div>
    </div>
  );
}

function ExplainabilityEvidenceSkeleton() {
  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900/90 p-6 shadow-2xl shadow-black/50 sm:p-8">
      <div className="animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-3 w-40 rounded bg-gray-800" />
          <div className="h-5 w-28 rounded-full bg-gray-800" />
        </div>
        <div className="mt-6 space-y-2">
          <div className="h-3 w-32 rounded bg-gray-800" />
          <div className="h-2 w-full rounded-full bg-gray-800" />
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-20 rounded-xl bg-gray-800/60" />
          <div className="h-20 rounded-xl bg-gray-800/60" />
        </div>
      </div>
    </section>
  );
}

function getTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

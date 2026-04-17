'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Clock, X, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { SystemData } from '@/src/types/dashboard'
import type { Obligation } from '@/lib/eu-ai-act'
import { ComplianceScoreRing } from '@/src/components/compliance-score-ring'
import { Skeleton } from '@/src/components/ui/skeleton'
import { Button } from '@/src/components/ui/button'

export interface GapAnalysisProps {
  systems: SystemData[]
}

type ObligationStatus = 'met' | 'partial' | 'not_started' | 'not_applicable'

type ObligationRow = Obligation & {
  status: ObligationStatus
  evidence: string[]
}

type ObligationsApiResponse = {
  systemId: string
  systemName: string
  riskTier: string
  role: string
  obligations: ObligationRow[]
  summary: {
    total: number
    met: number
    partial: number
    notStarted: number
    compliancePercentage: number
  }
}

const CATEGORY_LABEL: Record<string, string> = {
  documentation: 'Documentation',
  'risk-management': 'Risk Management',
  governance: 'Governance',
  transparency: 'Transparency',
  'human-oversight': 'Human Oversight',
  monitoring: 'Monitoring',
  registration: 'Registration',
  assessment: 'Assessment',
  data: 'Data',
  incident: 'Incident Reporting',
}

function obligationAction(ob: ObligationRow): { tab: string; label: string } {
  if (ob.id === 'accuracy') {
    return { tab: 'scanner', label: 'Open GitHub Scanner' }
  }
  if (ob.id === 'fria') {
    return { tab: 'fria', label: 'Open FRIA' }
  }
  switch (ob.category) {
    case 'monitoring':
    case 'incident':
      return { tab: 'incidents', label: 'View incidents' }
    case 'registration':
      return { tab: 'settings', label: 'Open settings' }
    case 'assessment':
      return { tab: 'inventory', label: 'View AI Inventory' }
    case 'governance':
      return { tab: 'settings', label: 'Open settings' }
    default:
      return { tab: 'tracker', label: 'Open Compliance Tracker' }
  }
}

function StatusIcon({ status }: { status: ObligationStatus }) {
  if (status === 'met') {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-950 border border-emerald-700">
        <Check className="size-4 text-emerald-400" aria-hidden />
      </span>
    )
  }
  if (status === 'partial') {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-950 border border-amber-700">
        <Clock className="size-4 text-amber-400" aria-hidden />
      </span>
    )
  }
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-950 border border-red-800">
      <X className="size-4 text-red-400" aria-hidden />
    </span>
  )
}

function statusBadgeClass(status: ObligationStatus) {
  if (status === 'met') return 'bg-emerald-950/80 text-emerald-200 border-emerald-800'
  if (status === 'partial') return 'bg-amber-950/80 text-amber-200 border-amber-800'
  if (status === 'not_applicable') return 'bg-slate-800 text-slate-400 border-slate-700'
  return 'bg-red-950/80 text-red-200 border-red-900'
}

function riskTierBadgeClass(tier: string) {
  const t = tier.toLowerCase()
  if (t === 'high') return 'bg-orange-950 text-orange-200 border-orange-800'
  if (t === 'limited') return 'bg-blue-950 text-blue-200 border-blue-800'
  if (t === 'minimal') return 'bg-slate-800 text-slate-200 border-slate-700'
  if (t === 'unacceptable' || t === 'prohibited') return 'bg-red-950 text-red-200 border-red-800'
  return 'bg-slate-800 text-slate-300 border-slate-700'
}

export function GapAnalysis({ systems }: GapAnalysisProps) {
  const router = useRouter()
  const [selectedSystemId, setSelectedSystemId] = useState<string>('')
  const [data, setData] = useState<ObligationsApiResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (id: string) => {
    if (!id) {
      setData(null)
      return
    }
    setLoading(true)
    setData(null)
    try {
      const res = await fetch(`/api/systems/${id}/obligations`)
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(err.error ?? 'Failed to load obligations')
        return
      }
      setData((await res.json()) as ObligationsApiResponse)
    } catch {
      toast.error('Failed to load obligations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedSystemId) {
      void load(selectedSystemId)
    } else {
      setData(null)
    }
  }, [selectedSystemId, load])

  const grouped = useMemo(() => {
    if (!data?.obligations.length) return []
    const map = new Map<string, ObligationRow[]>()
    for (const ob of data.obligations) {
      const list = map.get(ob.category) ?? []
      list.push(ob)
      map.set(ob.category, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [data])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <label className="mb-1.5 block text-xs text-slate-400">Select AI system</label>
        <select
          value={selectedSystemId}
          onChange={(e) => setSelectedSystemId(e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
        >
          <option value="">Choose a system…</option>
          {systems.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.org_name}
            </option>
          ))}
        </select>
      </div>

      {!selectedSystemId && (
        <p className="text-center text-sm text-slate-500">Select a system to analyze regulatory gaps against documented evidence.</p>
      )}

      {selectedSystemId && loading && (
        <div className="space-y-4">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 md:flex-row md:items-center">
            <Skeleton className="size-[120px] shrink-0 rounded-full bg-slate-800" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48 bg-slate-800" />
              <Skeleton className="h-4 w-full max-w-md bg-slate-800" />
              <Skeleton className="h-4 w-32 bg-slate-800" />
            </div>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
              <Skeleton className="h-5 w-40 bg-slate-800" />
              <Skeleton className="h-16 w-full bg-slate-800" />
            </div>
          ))}
        </div>
      )}

      {selectedSystemId && !loading && data && (
        <>
          {(data.riskTier === 'unacceptable' || data.riskTier === 'prohibited') && (
            <div
              role="alert"
              className="rounded-xl border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-100"
            >
              This system is classified as using prohibited practices under Article 5. It must be withdrawn from the EU
              market.
            </div>
          )}

          {data.riskTier === 'unassessed' && (
            <div className="rounded-xl border border-indigo-900/60 bg-indigo-950/40 px-4 py-3 text-sm text-indigo-100">
              Classify this system first to see applicable obligations.
            </div>
          )}

          <div className="flex flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:flex-row lg:items-center">
            <ComplianceScoreRing score={data.summary.compliancePercentage} size={120} strokeWidth={8} />
            <div className="min-w-0 flex-1 space-y-2">
              <h2 className="text-lg font-semibold text-white">{data.systemName}</h2>
              <p className="text-sm text-slate-400">
                {data.summary.met} of {data.summary.total} obligations met ({data.summary.compliancePercentage}%)
              </p>
              <div className="flex flex-wrap gap-2">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                    riskTierBadgeClass(data.riskTier)
                  )}
                >
                  Risk: {data.riskTier}
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-200">
                  Role: {data.role}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Partial: {data.summary.partial} · Not started: {data.summary.notStarted}
              </p>
            </div>
          </div>

          {data.summary.total === 0 && data.riskTier !== 'unacceptable' && data.riskTier !== 'prohibited' && (
            <p className="text-center text-sm text-slate-500">
              No obligations matched this tier and role yet. Update classification if this system should fall under the EU AI
              Act.
            </p>
          )}

          <div className="space-y-8">
            {grouped.map(([category, rows]) => (
              <section key={category} className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  {CATEGORY_LABEL[category] ?? category}
                </h3>
                <ul className="space-y-3">
                  {rows.map((ob) => {
                    const action = obligationAction(ob)
                    return (
                      <li
                        key={ob.id}
                        className="flex gap-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4 transition-colors hover:border-slate-700"
                      >
                        <StatusIcon status={ob.status} />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-indigo-300">{ob.article}</span>
                            <span
                              className={cn(
                                'rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                                statusBadgeClass(ob.status)
                              )}
                            >
                              {ob.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="font-medium text-white">{ob.title}</p>
                          <p className="text-sm text-slate-400">{ob.description}</p>
                          {ob.evidence.length > 0 && (
                            <ul className="list-inside list-disc text-xs text-slate-500">
                              {ob.evidence.map((e) => (
                                <li key={e}>{e}</li>
                              ))}
                            </ul>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-1 border-slate-600 bg-slate-800/50 text-slate-200 hover:bg-slate-800 hover:text-white"
                            onClick={() => router.push(`/dashboard?tab=${action.tab}`)}
                          >
                            {action.label}
                            <ExternalLink className="ml-1 size-3.5 opacity-70" aria-hidden />
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

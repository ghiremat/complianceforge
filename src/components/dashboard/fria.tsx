'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Scale, ChevronDown, Loader2 } from 'lucide-react'
import { Skeleton } from '@/src/components/ui/skeleton'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { SystemData } from '@/src/types/dashboard'

const STATUS_OPTIONS = ['not_started', 'in_progress', 'completed'] as const
type SectionStatus = (typeof STATUS_OPTIONS)[number]

interface FriaSectionPayload {
  id: string
  title: string
  article: string
  questions: string[]
  sectionNumber: number
  status: string
  content: string
  updatedAt: string | null
}

interface FriaResponse {
  systemId: string
  systemName: string
  riskTier: string
  role?: string
  required: boolean
  sections: FriaSectionPayload[]
}

export interface FRIAProps {
  systems: SystemData[]
}

function isHighRisk(tier: string | undefined): boolean {
  return (tier ?? '').toLowerCase() === 'high'
}

export function FRIA({ systems }: FRIAProps) {
  const { highRiskSystems, otherSystems } = useMemo(() => {
    const high: SystemData[] = []
    const rest: SystemData[] = []
    for (const s of systems) {
      if (isHighRisk(s.risk_tier)) high.push(s)
      else rest.push(s)
    }
    high.sort((a, b) => a.name.localeCompare(b.name))
    rest.sort((a, b) => a.name.localeCompare(b.name))
    return { highRiskSystems: high, otherSystems: rest }
  }, [systems])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [payload, setPayload] = useState<FriaResponse | null>(null)
  const [drafts, setDrafts] = useState<Record<number, { content: string; status: SectionStatus }>>({})
  const [savingSection, setSavingSection] = useState<number | null>(null)

  useEffect(() => {
    if (!selectedId) {
      setPayload(null)
      setDrafts({})
      return
    }

    let cancelled = false
    setLoading(true)
    setPayload(null)

    ;(async () => {
      try {
        const r = await fetch(`/api/systems/${selectedId}/fria`)
        if (!r.ok) {
          const err = (await r.json().catch(() => ({ error: 'Failed to load' }))) as { error?: string }
          if (!cancelled) toast.error(err.error ?? 'Failed to load FRIA')
          return
        }
        const data = (await r.json()) as FriaResponse
        if (cancelled) return
        setPayload(data)
        const next: Record<number, { content: string; status: SectionStatus }> = {}
        for (const s of data.sections) {
          const st = STATUS_OPTIONS.includes(s.status as SectionStatus)
            ? (s.status as SectionStatus)
            : 'not_started'
          next[s.sectionNumber] = { content: s.content ?? '', status: st }
        }
        setDrafts(next)
      } catch {
        if (!cancelled) toast.error('Failed to load FRIA')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [selectedId])

  const selectedSystem = systems.find((s) => s.id === selectedId)

  const completionPct = useMemo(() => {
    if (!payload?.sections.length) return 0
    let done = 0
    for (const s of payload.sections) {
      const d = drafts[s.sectionNumber]
      if (d?.status === 'completed') done += 1
    }
    return Math.round((done / payload.sections.length) * 100)
  }, [payload, drafts])

  const updateDraft = useCallback((sectionNumber: number, patch: Partial<{ content: string; status: SectionStatus }>) => {
    setDrafts((prev) => ({
      ...prev,
      [sectionNumber]: {
        content: patch.content ?? prev[sectionNumber]?.content ?? '',
        status: patch.status ?? prev[sectionNumber]?.status ?? 'not_started',
      },
    }))
  }, [])

  const saveSection = useCallback(
    async (sectionNumber: number) => {
      if (!selectedId) return
      const d = drafts[sectionNumber]
      if (!d) {
        toast.info('Nothing to save')
        return
      }
      setSavingSection(sectionNumber)
      try {
        const r = await fetch(`/api/systems/${selectedId}/fria`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionNumber,
            content: d.content,
            status: d.status,
          }),
        })
        if (r.ok) {
          toast.success('FRIA section saved')
          setPayload((p) =>
            p
              ? {
                  ...p,
                  sections: p.sections.map((sec) =>
                    sec.sectionNumber === sectionNumber
                      ? { ...sec, content: d.content, status: d.status, updatedAt: new Date().toISOString() }
                      : sec
                  ),
                }
              : p
          )
        } else {
          const err = (await r.json().catch(() => ({ error: 'Save failed' }))) as { error?: string }
          toast.error(err.error ?? 'Failed to save')
        }
      } catch {
        toast.error('Failed to save section')
      } finally {
        setSavingSection(null)
      }
    },
    [selectedId, drafts]
  )

  const required = payload?.required ?? (selectedSystem ? isHighRisk(selectedSystem.risk_tier) : false)

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-white mb-1">
            <Scale className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold">Fundamental Rights Impact Assessment (FRIA)</h2>
          </div>
          <p className="text-sm text-slate-400 max-w-xl">
            Article 27 — assess impact on fundamental rights before deployment. High-risk systems must complete an FRIA;
            other systems may use this template voluntarily.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">AI system</label>
        <div className="relative">
          <select
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(e.target.value || null)}
            className={cn(
              'w-full cursor-pointer appearance-none rounded-lg border border-slate-700 bg-[#0a0a0f] px-3 py-2.5 pr-10 text-sm text-white',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500'
            )}
          >
            <option value="">Select a system…</option>
            {highRiskSystems.length > 0 && (
              <optgroup label="High-risk — FRIA required (Article 27)">
                {highRiskSystems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            )}
            {otherSystems.length > 0 && (
              <optgroup label="Other risk tiers — FRIA optional">
                {otherSystems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
        <p className="text-xs text-slate-500">
          The list is grouped: high-risk systems (where FRIA is mandatory) first, then all other systems you can still
          assess voluntarily.
        </p>
      </div>

      {selectedId && selectedSystem && (
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border',
              required
                ? 'bg-amber-950/50 text-amber-200 border-amber-800'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            )}
          >
            {required ? 'Required under Article 27' : 'Optional'}
          </span>
          {payload?.role != null && (
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-indigo-800 bg-indigo-950/40 text-indigo-200">
              Role: {payload.role === 'deployer' ? 'Deployer' : 'Provider'}
            </span>
          )}
        </div>
      )}

      {selectedId && loading && (
        <div className="space-y-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <Skeleton className="h-full w-1/3 rounded-full bg-indigo-900/80" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/30 p-4">
              <Skeleton className="h-4 w-2/3 rounded bg-slate-800" />
              <Skeleton className="h-3 w-full rounded bg-slate-800/80" />
              <Skeleton className="h-20 w-full rounded bg-slate-800/60" />
            </div>
          ))}
        </div>
      )}

      {selectedId && !loading && payload && (
        <>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex justify-between items-center gap-4 mb-2">
              <span className="text-sm text-slate-300">Overall progress</span>
              <span className="text-sm font-medium text-indigo-300">{completionPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500 transition-all duration-300"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>

          <div className="space-y-6">
            {payload.sections.map((sec) => {
              const d = drafts[sec.sectionNumber] ?? { content: '', status: 'not_started' as const }
              return (
                <section
                  key={sec.id}
                  className="rounded-xl border border-slate-800 bg-[#0a0a0f] p-5 shadow-lg shadow-black/20"
                >
                  <div className="mb-4">
                    <p className="text-xs font-medium text-indigo-400 mb-1">{sec.article}</p>
                    <h3 className="text-base font-semibold text-white">{sec.title}</h3>
                    <ul className="mt-3 space-y-1.5 text-sm text-slate-400 list-disc list-inside">
                      {sec.questions.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </div>

                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Response / evidence
                  </label>
                  <textarea
                    value={d.content}
                    onChange={(e) => updateDraft(sec.sectionNumber, { content: e.target.value })}
                    rows={5}
                    className={cn(
                      'w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100',
                      'placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30'
                    )}
                    placeholder="Document your assessment for this section…"
                  />

                  <div className="mt-4 flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                        Status
                      </label>
                      <select
                        value={d.status}
                        onChange={(e) =>
                          updateDraft(sec.sectionNumber, { status: e.target.value as SectionStatus })
                        }
                        className={cn(
                          'w-full cursor-pointer sm:w-56 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white',
                          'focus:outline-none focus:ring-2 focus:ring-indigo-500/40'
                        )}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => saveSection(sec.sectionNumber)}
                      disabled={savingSection === sec.sectionNumber}
                      className={cn(
                        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium',
                        'bg-indigo-600 text-white transition-colors duration-200 hover:bg-indigo-500 disabled:opacity-60 disabled:pointer-events-none',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
                      )}
                    >
                      {savingSection === sec.sectionNumber ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        'Save section'
                      )}
                    </button>
                  </div>
                  {sec.updatedAt && (
                    <p className="mt-3 text-xs text-slate-600">
                      Last updated {new Date(sec.updatedAt).toLocaleString()}
                    </p>
                  )}
                </section>
              )
            })}
          </div>
        </>
      )}

      {selectedId && !loading && !payload && (
        <p className="text-sm text-slate-500">Could not load FRIA for this system.</p>
      )}
    </div>
  )
}

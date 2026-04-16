'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Shield, ArrowLeft, RefreshCw, ExternalLink, FileText, AlertTriangle, GitBranch } from 'lucide-react'
import { cn, scoreColor, riskBadgeColor, scoreBarColor } from '@/lib/utils'

interface ScoreCriterion {
  id: string
  label: string
  earned: number
  max: number
}

interface SystemDetail {
  id: string
  name: string
  description: string | null
  sector: string
  useCase: string
  provider: string | null
  version: string | null
  deploymentRegion: string
  riskTier: string
  complianceScore: number
  complianceGrade: string
  complianceStatus: string
  sourceRepo: string | null
  orgName: string
  orgSlug: string | null
  createdAt: string
  updatedAt: string
  scoreCriteria: ScoreCriterion[]
  assessments: {
    id: string
    type: string
    riskTier: string
    confidence: number
    justification: string
    createdAt: string
  }[]
  documents: {
    id: string
    title: string
    type: string
    section: number
    status: string
    updatedAt: string
  }[]
  incidents: {
    id: string
    title: string
    severity: string
    status: string
    createdAt: string
  }[]
  scanResults: {
    id: string
    repository: string
    totalFindings: number
    scanDate: string
  }[]
  passport: { enabled: boolean; customSlug: string | null } | null
}

type TabId = 'overview' | 'score' | 'assessments' | 'documents' | 'incidents' | 'scans'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'score', label: 'Compliance Score' },
  { id: 'assessments', label: 'Assessments' },
  { id: 'documents', label: 'Documents' },
  { id: 'incidents', label: 'Incidents' },
  { id: 'scans', label: 'Scan Results' },
]

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return '—'
  }
}

function documentStatusClass(status: string) {
  const s = status.toLowerCase()
  if (s === 'approved') return 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
  if (s === 'draft') return 'bg-slate-800 text-slate-300 border-slate-700'
  if (s === 'in_review' || s === 'review') return 'bg-amber-950/80 text-amber-200 border-amber-800'
  return 'bg-slate-800 text-slate-300 border-slate-700'
}

function incidentSeverityClass(severity: string) {
  const s = severity.toLowerCase()
  if (s === 'critical') return 'text-red-400'
  if (s === 'high') return 'text-orange-400'
  if (s === 'medium') return 'text-amber-300'
  return 'text-slate-400'
}

export default function SystemDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? ''

  const [detail, setDetail] = useState<SystemDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabId>('overview')
  const [classifying, setClassifying] = useState(false)

  useEffect(() => {
    router.prefetch('/dashboard')
  }, [router])

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setLoadError('Invalid system')
      return
    }
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const r = await fetch(`/api/systems/${id}`)
        if (!r.ok) {
          const body = (await r.json().catch(() => ({}))) as { error?: string }
          if (!cancelled) setLoadError(body.error ?? `Error ${r.status}`)
          return
        }
        const data = (await r.json()) as SystemDetail
        if (!cancelled) setDetail(data)
      } catch {
        if (!cancelled) setLoadError('Failed to load system')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id])

  async function classify() {
    if (!id) return
    setClassifying(true)
    try {
      const r = await fetch(`/api/systems/${id}/classify`, { method: 'POST' })
      if (r.ok) {
        const data = (await r.json()) as {
          assessment: { riskTier: string; confidence: number }
        }
        toast.success(
          `Classified as ${data.assessment.riskTier} risk (${Math.round(data.assessment.confidence * 100)}% confidence)`
        )
        const refresh = await fetch(`/api/systems/${id}`)
        if (refresh.ok) setDetail((await refresh.json()) as SystemDetail)
      } else {
        const err = (await r.json().catch(() => ({ error: 'Classification failed' }))) as { error?: string }
        toast.error(err.error ?? 'Classification failed')
      }
    } catch {
      toast.error('Failed to classify system')
    } finally {
      setClassifying(false)
    }
  }

  const score = detail?.complianceScore ?? 0
  const ringR = 44
  const circumference = 2 * Math.PI * ringR
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white" id="main-content">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-slate-800 bg-[#0a0a0f]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-indigo-400"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {loading && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center text-slate-400">
            Loading system…
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-red-400">{loadError}</p>
            <Link
              href="/dashboard"
              className="mt-4 inline-block text-sm text-indigo-400 hover:text-indigo-300"
            >
              Return to dashboard
            </Link>
          </div>
        )}

        {!loading && detail && (
          <>
            <div className="mb-8 flex flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                <div className="relative mx-auto flex h-28 w-28 shrink-0 items-center justify-center sm:mx-0">
                  <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100" aria-hidden>
                    <circle
                      cx="50"
                      cy="50"
                      r={ringR}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-slate-800"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r={ringR}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      className={
                        score >= 80
                          ? 'text-green-500'
                          : score >= 50
                            ? 'text-yellow-500'
                            : 'text-red-500'
                      }
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn('text-xl font-bold tabular-nums', scoreColor(score))}>{score}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">score</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <div className="mb-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <h1 className="text-2xl font-bold tracking-tight text-white">{detail.name}</h1>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
                        riskBadgeColor(detail.riskTier)
                      )}
                    >
                      {detail.riskTier || 'unknown'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">
                    {detail.orgName}
                    {detail.orgSlug ? (
                      <span className="text-slate-600"> · {detail.orgSlug}</span>
                    ) : null}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-1.5">
                      <Shield className="h-4 w-4 text-indigo-400" aria-hidden />
                      <span className="text-xs text-slate-400">Grade</span>
                      <span className="text-lg font-bold text-white">{detail.complianceGrade}</span>
                    </div>
                    <div className="h-2 flex-1 min-w-[120px] max-w-xs rounded-full bg-slate-800 sm:max-w-sm">
                      <div
                        className={cn('h-2 rounded-full transition-all', scoreBarColor(score))}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <button
                  type="button"
                  onClick={() => void classify()}
                  disabled={classifying}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
                >
                  {classifying ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Classifying…
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Classify
                    </>
                  )}
                </button>
                {detail.passport?.enabled && detail.orgSlug ? (
                  <Link
                    href={`/trust/${detail.orgSlug}/${detail.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-700/50 bg-indigo-600/10 px-4 py-2 text-sm font-medium text-indigo-300 transition-colors hover:bg-indigo-600/20"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Passport
                  </Link>
                ) : detail.passport?.enabled && !detail.orgSlug ? (
                  <p className="text-center text-xs text-amber-400/90 sm:text-right">
                    Passport is on; set an organization slug to link the public page.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-800 pb-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    tab === t.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              {tab === 'overview' && (
                <div className="space-y-4 text-sm">
                  <div>
                    <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Description
                    </h3>
                    <p className="text-slate-300">{detail.description?.trim() || '—'}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Sector</h3>
                      <p className="text-slate-200">{detail.sector || '—'}</p>
                    </div>
                    <div>
                      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Use case</h3>
                      <p className="text-slate-200">{detail.useCase || '—'}</p>
                    </div>
                    <div>
                      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Deployment region
                      </h3>
                      <p className="text-slate-200">{detail.deploymentRegion || '—'}</p>
                    </div>
                    <div>
                      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</h3>
                      <p className="capitalize text-slate-200">
                        {String(detail.complianceStatus || '').replace(/_/g, ' ') || '—'}
                      </p>
                    </div>
                    {detail.provider ? (
                      <div>
                        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Provider
                        </h3>
                        <p className="text-slate-200">{detail.provider}</p>
                      </div>
                    ) : null}
                    {detail.version ? (
                      <div>
                        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Version</h3>
                        <p className="text-slate-200">{detail.version}</p>
                      </div>
                    ) : null}
                    {detail.sourceRepo ? (
                      <div className="sm:col-span-2">
                        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Source repo
                        </h3>
                        <a
                          href={detail.sourceRepo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                        >
                          <GitBranch className="h-3.5 w-3.5" />
                          {detail.sourceRepo}
                        </a>
                      </div>
                    ) : null}
                  </div>
                  <div className="grid gap-2 border-t border-slate-800 pt-4 sm:grid-cols-2">
                    <p className="text-slate-500">
                      Created <span className="text-slate-300">{formatDate(detail.createdAt)}</span>
                    </p>
                    <p className="text-slate-500">
                      Updated <span className="text-slate-300">{formatDate(detail.updatedAt)}</span>
                    </p>
                  </div>
                </div>
              )}

              {tab === 'score' && (
                <div className="space-y-5">
                  <p className="text-sm text-slate-400">
                    Maturity breakdown (earned vs. maximum points per criterion).
                  </p>
                  {detail.scoreCriteria.length === 0 ? (
                    <p className="text-slate-500">No criteria available.</p>
                  ) : (
                    <ul className="space-y-4">
                      {detail.scoreCriteria.map((c) => {
                        const pct = c.max > 0 ? Math.round((c.earned / c.max) * 100) : 0
                        return (
                          <li key={c.id}>
                            <div className="mb-1 flex justify-between gap-2 text-sm">
                              <span className="font-medium text-slate-200">{c.label}</span>
                              <span className="shrink-0 tabular-nums text-slate-400">
                                {c.earned} / {c.max}
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className={cn('h-2 rounded-full transition-all', scoreBarColor(pct))}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )}

              {tab === 'assessments' && (
                <ul className="space-y-4">
                  {detail.assessments.length === 0 ? (
                    <li className="text-slate-500">No assessments yet.</li>
                  ) : (
                    detail.assessments.map((a) => (
                      <li
                        key={a.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold uppercase text-slate-500">{a.type}</span>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-semibold capitalize',
                              riskBadgeColor(a.riskTier)
                            )}
                          >
                            {a.riskTier}
                          </span>
                          <span className="text-xs text-slate-500">
                            {Math.round(a.confidence * 100)}% confidence
                          </span>
                          <span className="text-xs text-slate-600">{formatDate(a.createdAt)}</span>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-300">{a.justification}</p>
                      </li>
                    ))
                  )}
                </ul>
              )}

              {tab === 'documents' && (
                <ul className="space-y-3">
                  {detail.documents.length === 0 ? (
                    <li className="flex items-center gap-2 text-slate-500">
                      <FileText className="h-4 w-4 shrink-0" />
                      No documents.
                    </li>
                  ) : (
                    detail.documents.map((d) => (
                      <li
                        key={d.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-white">{d.title}</p>
                          <p className="text-xs text-slate-500">
                            {d.type}
                            {d.section ? ` · section ${d.section}` : ''} · {formatDate(d.updatedAt)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium capitalize',
                            documentStatusClass(d.status)
                          )}
                        >
                          {d.status}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              )}

              {tab === 'incidents' && (
                <ul className="space-y-3">
                  {detail.incidents.length === 0 ? (
                    <li className="flex items-center gap-2 text-slate-500">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      No incidents recorded.
                    </li>
                  ) : (
                    detail.incidents.map((i) => (
                      <li
                        key={i.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-white">{i.title}</p>
                          <span className={cn('text-xs font-semibold uppercase', incidentSeverityClass(i.severity))}>
                            {i.severity}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(i.createdAt)} ·{' '}
                          <span className="capitalize">{i.status}</span>
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              )}

              {tab === 'scans' && (
                <ul className="space-y-3">
                  {detail.scanResults.length === 0 ? (
                    <li className="flex items-center gap-2 text-slate-500">
                      <GitBranch className="h-4 w-4 shrink-0" />
                      No scan results.
                    </li>
                  ) : (
                    detail.scanResults.map((s) => (
                      <li
                        key={s.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3"
                      >
                        <p className="font-mono text-sm text-indigo-200">{s.repository}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {s.totalFindings} findings · {formatDate(s.scanDate)}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

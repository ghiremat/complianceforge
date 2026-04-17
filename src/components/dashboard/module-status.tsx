'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Shield,
  AlertTriangle,
  Database,
  FileText,
  ClipboardList,
  Eye,
  Users,
  Crosshair,
  CheckSquare,
  Award,
  Globe,
  Activity,
  AlertOctagon,
  Scale,
  CheckCircle2,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/src/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select'
import { Card, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card'
import type { SystemData } from '@/src/types/dashboard'

const MODULES = [
  {
    id: 'classification',
    title: 'Risk Classification',
    article: 'Article 6',
    icon: 'Shield',
    description: 'AI system classified under Article 6 risk framework',
  },
  {
    id: 'risk-mgmt',
    title: 'Risk Management',
    article: 'Article 9',
    icon: 'AlertTriangle',
    description: 'Risk management system established per Article 9',
  },
  {
    id: 'data-gov',
    title: 'Data Governance',
    article: 'Article 10',
    icon: 'Database',
    description: 'Data and data governance per Article 10',
  },
  {
    id: 'tech-doc',
    title: 'Technical Documentation',
    article: 'Article 11',
    icon: 'FileText',
    description: 'Annex IV technical documentation',
  },
  {
    id: 'logging',
    title: 'Record-Keeping',
    article: 'Article 12',
    icon: 'ClipboardList',
    description: 'Automatic event logging enabled',
  },
  {
    id: 'transparency',
    title: 'Transparency',
    article: 'Article 13',
    icon: 'Eye',
    description: 'Information provision to deployers',
  },
  {
    id: 'oversight',
    title: 'Human Oversight',
    article: 'Article 14',
    icon: 'Users',
    description: 'Human oversight measures in place',
  },
  {
    id: 'accuracy',
    title: 'Accuracy & Robustness',
    article: 'Article 15',
    icon: 'Crosshair',
    description: 'Accuracy, robustness, cybersecurity',
  },
  {
    id: 'qms',
    title: 'Quality Management',
    article: 'Article 17',
    icon: 'CheckSquare',
    description: 'Quality management system',
  },
  {
    id: 'conformity',
    title: 'Conformity Assessment',
    article: 'Article 43',
    icon: 'Award',
    description: 'Conformity assessment completed',
  },
  {
    id: 'registration',
    title: 'EU Database',
    article: 'Article 71',
    icon: 'Globe',
    description: 'Registered in EU database',
  },
  {
    id: 'pms',
    title: 'Post-Market Monitoring',
    article: 'Article 72',
    icon: 'Activity',
    description: 'Post-market monitoring system',
  },
  {
    id: 'incidents',
    title: 'Incident Reporting',
    article: 'Article 73',
    icon: 'AlertOctagon',
    description: 'Serious incident reporting',
  },
  {
    id: 'fria',
    title: 'Fundamental Rights',
    article: 'Article 27',
    icon: 'Scale',
    description: 'Fundamental rights impact assessment',
  },
] as const

const ICONS: Record<string, LucideIcon> = {
  Shield,
  AlertTriangle,
  Database,
  FileText,
  ClipboardList,
  Eye,
  Users,
  Crosshair,
  CheckSquare,
  Award,
  Globe,
  Activity,
  AlertOctagon,
  Scale,
}

/** Maps UI module id to obligation ids returned by `/api/systems/[id]/obligations` */
const MODULE_TO_OBLIGATION_IDS: Record<string, string[]> = {
  classification: [],
  'risk-mgmt': ['rm-system'],
  'data-gov': ['data-governance'],
  'tech-doc': ['tech-doc'],
  logging: ['record-keeping'],
  transparency: ['transparency-hr', 'transparency-limited'],
  oversight: ['human-oversight'],
  accuracy: ['accuracy'],
  qms: ['qms'],
  conformity: ['conformity', 'eu-doc', 'ce-marking'],
  registration: ['registration'],
  pms: ['pms'],
  incidents: ['incidents'],
  fria: ['fria'],
}

type UiStatus = 'select_system' | 'done' | 'in_progress' | 'not_started' | 'not_applicable'

function aggregateObligationStatuses(statuses: string[]): Exclude<UiStatus, 'select_system'> {
  if (statuses.length === 0) return 'not_applicable'
  if (statuses.includes('met')) return 'done'
  if (statuses.includes('partial')) return 'in_progress'
  if (statuses.every((s) => s === 'not_applicable')) return 'not_applicable'
  return 'not_started'
}

function resolveModuleUiStatus(
  moduleId: string,
  obligationMap: Map<string, string>,
  riskTier: string
): Exclude<UiStatus, 'select_system'> {
  if (moduleId === 'classification') {
    const t = riskTier.toLowerCase()
    if (t === 'unassessed' || !t) return 'not_started'
    return 'done'
  }

  const ids = MODULE_TO_OBLIGATION_IDS[moduleId] ?? []
  const present = ids.filter((id) => obligationMap.has(id)).map((id) => obligationMap.get(id)!)

  if (ids.length > 0 && present.length === 0) {
    return 'not_applicable'
  }

  return aggregateObligationStatuses(present)
}

function StatusIndicator({ status }: { status: UiStatus }) {
  if (status === 'select_system') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-slate-500">
        <span className="size-2 rounded-full bg-slate-600" />
        Select a system
      </span>
    )
  }
  if (status === 'done') {
    return <CheckCircle2 className="size-5 text-emerald-500 shrink-0" aria-hidden />
  }
  if (status === 'in_progress') {
    return <span className="size-3 rounded-full bg-amber-400 shrink-0" title="In progress" />
  }
  if (status === 'not_applicable') {
    return <span className="size-3 rounded-full bg-slate-600 shrink-0" title="Not applicable" />
  }
  return <span className="size-3 rounded-full bg-red-500 shrink-0" title="Not started" />
}

export interface ModuleStatusProps {
  systems: SystemData[]
}

export function ModuleStatus({ systems }: ModuleStatusProps) {
  const [selectedId, setSelectedId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [riskTier, setRiskTier] = useState<string>('unassessed')
  const [obligationMap, setObligationMap] = useState<Map<string, string>>(new Map())

  const loadObligations = useCallback(async (systemId: string) => {
    setLoading(true)
    try {
      const r = await fetch(`/api/systems/${systemId}/obligations`)
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to load obligations')
      }
      const data = (await r.json()) as {
        riskTier: string
        obligations: Array<{ id: string; status: string }>
      }
      setRiskTier(data.riskTier ?? 'unassessed')
      const m = new Map<string, string>()
      for (const o of data.obligations ?? []) {
        m.set(o.id, o.status)
      }
      setObligationMap(m)
    } catch (e) {
      setObligationMap(new Map())
      toast.error(e instanceof Error ? e.message : 'Could not load module status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setObligationMap(new Map())
      setRiskTier('unassessed')
      return
    }
    void loadObligations(selectedId)
  }, [selectedId, loadObligations])

  const moduleStatuses = useMemo(() => {
    return MODULES.map((mod) => {
      const ui: UiStatus = !selectedId
        ? 'select_system'
        : resolveModuleUiStatus(mod.id, obligationMap, riskTier)
      return { ...mod, ui }
    })
  }, [selectedId, obligationMap, riskTier])

  return (
    <div className="space-y-6">
      <Card className="border-slate-800 bg-slate-900/80">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400">
              <LayoutGrid className="size-5" />
            </div>
            <div>
              <CardTitle className="text-white">EU AI Act compliance modules</CardTitle>
              <CardDescription className="text-slate-400">
                Per-article status from your obligations assessment. Choose a system to view live status.
              </CardDescription>
            </div>
          </div>
          <div className="w-full sm:max-w-xs">
            <Select value={selectedId || undefined} onValueChange={setSelectedId}>
              <SelectTrigger className="border-slate-700 bg-[#0a0a0f] text-slate-200">
                <SelectValue placeholder="Select a system" />
              </SelectTrigger>
              <SelectContent className="border-slate-800 bg-slate-900">
                {systems.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {systems.length === 0 && (
        <p className="text-center text-sm text-slate-500">Add AI systems in AI Inventory to track modules.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {moduleStatuses.map((mod) => {
          const Icon = ICONS[mod.icon] ?? Shield
          const showSkeleton = loading && !!selectedId
          return (
            <div
              key={mod.id}
              className={cn(
                'flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-colors',
                selectedId && 'hover:border-indigo-800/60'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-950/50 text-indigo-400">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-white text-sm leading-tight truncate">{mod.title}</p>
                    <p className="text-xs text-indigo-400/90">{mod.article}</p>
                  </div>
                </div>
                {showSkeleton ? (
                  <Skeleton className="size-5 shrink-0 rounded-full bg-slate-800" />
                ) : (
                  <StatusIndicator status={mod.ui} />
                )}
              </div>
              <p className="text-xs text-slate-500 leading-snug">{mod.description}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { cn, daysUntil } from '@/lib/utils'
import { EU_AI_ACT_TIMELINE, getUpcomingMilestones } from '@/lib/eu-ai-act'
import { Skeleton } from '@/src/components/ui/skeleton'
import type { CalendarItem, StatsData, SystemData } from '@/src/types/dashboard'

const ENFORCEMENT_DATE = '2026-08-02'

function normalizeTier(tier: string | undefined | null): string {
  const t = (tier ?? '').toLowerCase()
  if (['unacceptable', 'high', 'limited', 'minimal', 'unassessed'].includes(t)) return t
  return 'unassessed'
}

function milestoneDeadlineStyle(days: number): { border: string; label: string; accent: string } {
  if (days < 90) {
    return {
      border: 'border-red-800/80 bg-red-950/20',
      label: 'text-red-400',
      accent: 'text-red-300',
    }
  }
  if (days < 180) {
    return {
      border: 'border-amber-800/80 bg-amber-950/20',
      label: 'text-amber-400',
      accent: 'text-amber-300',
    }
  }
  return {
    border: 'border-emerald-800/60 bg-emerald-950/15',
    label: 'text-emerald-400',
    accent: 'text-emerald-300',
  }
}

function complianceGrade(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

export interface CommandCenterProps {
  stats: StatsData | null
  systems: SystemData[]
  calendar: CalendarItem[]
  statsLoading: boolean
  calendarLoading: boolean
}

export function CommandCenter({
  stats,
  systems,
  calendar,
  statsLoading,
  calendarLoading,
}: CommandCenterProps) {
  const daysLeft = daysUntil(ENFORCEMENT_DATE)

  const prohibitedCount = systems.filter((s) => normalizeTier(s.risk_tier) === 'unacceptable').length

  const readinessScores = systems.map((s) => s.compliance_score).filter((n) => typeof n === 'number' && !Number.isNaN(n))
  const avgReadiness =
    readinessScores.length > 0 ? Math.round(readinessScores.reduce((a, b) => a + b, 0) / readinessScores.length) : 0
  const grade = complianceGrade(avgReadiness)

  const riskData = [
    { name: 'Unacceptable', value: systems.filter((s) => normalizeTier(s.risk_tier) === 'unacceptable').length, color: '#ef4444' },
    { name: 'High Risk', value: systems.filter((s) => normalizeTier(s.risk_tier) === 'high').length, color: '#f97316' },
    { name: 'Limited', value: systems.filter((s) => normalizeTier(s.risk_tier) === 'limited').length, color: '#eab308' },
    { name: 'Minimal', value: systems.filter((s) => normalizeTier(s.risk_tier) === 'minimal').length, color: '#22c55e' },
    {
      name: 'Unassessed',
      value: systems.filter((s) => normalizeTier(s.risk_tier) === 'unassessed').length,
      color: '#6b7280',
    },
  ].filter((d) => d.value > 0)

  const upcomingMilestones = getUpcomingMilestones()
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3)

  return (
    <div className="space-y-6">
      {prohibitedCount > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-100"
        >
          ⚠ {prohibitedCount} system(s) classified as prohibited under Article 5. Immediate action required.
        </div>
      )}

      <div className="bg-gradient-to-br from-indigo-950 to-slate-900 border border-indigo-800 rounded-2xl p-8 text-center">
        <p className="text-slate-400 text-sm mb-2">EU AI Act Full Enforcement</p>
        <div className="text-7xl font-black text-white mb-1">{daysLeft}</div>
        <p className="text-indigo-400 font-semibold text-lg">days remaining</p>
        <p className="text-slate-500 text-sm mt-2">August 2, 2026 — Act now to avoid fines up to €35M</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="border border-slate-800 rounded-xl p-5 bg-slate-900/50">
                <Skeleton className="h-3 w-24 mb-3 bg-slate-800" />
                <Skeleton className="h-9 w-16 bg-slate-800" />
              </div>
            ))}
          </>
        ) : (
          [
            {
              label: 'AI Systems',
              value: stats?.total_systems ?? systems.length,
              color: 'text-blue-400',
              bg: 'bg-blue-950/30 border-blue-900',
            },
            {
              label: 'Avg Score',
              value: `${stats?.avg_compliance_score ?? 0}%`,
              color: 'text-green-400',
              bg: 'bg-green-950/30 border-green-900',
            },
            {
              label: 'High Risk',
              value: stats?.high_risk_systems ?? 0,
              color: 'text-orange-400',
              bg: 'bg-orange-950/30 border-orange-900',
            },
            {
              label: 'Scans Done',
              value: stats?.total_scans ?? 0,
              color: 'text-purple-400',
              bg: 'bg-purple-950/30 border-purple-900',
            },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={cn('border rounded-xl p-5', bg)}>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
              <p className={cn('text-3xl font-bold', color)}>{value}</p>
            </div>
          ))
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between mb-4">
          <div>
            <h3 className="font-semibold text-white">Regulatory Status</h3>
            <p className="text-xs text-slate-500 mt-1">
              Next milestones from EU AI Act timeline ({EU_AI_ACT_TIMELINE.length} tracked)
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {upcomingMilestones.map((m) => {
            const d = daysUntil(m.date)
            const st = milestoneDeadlineStyle(d)
            return (
              <div key={m.id} className={cn('rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2', st.border)}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-indigo-400/90">{m.article}</p>
                  <p className="text-sm font-medium text-white truncate">{m.title}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn('text-xs font-semibold tabular-nums', st.label)}>
                    {d >= 0 ? `${d} days` : 'Due'}
                  </span>
                  <span className={cn('text-[10px] uppercase tracking-wide', st.accent)}>
                    {d < 90 ? 'Critical' : d < 180 ? 'Soon' : 'Planned'}
                  </span>
                </div>
              </div>
            )
          })}
          {upcomingMilestones.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-2">No upcoming milestones</p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4">System risk distribution</h3>
          {systems.length > 0 && riskData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={riskData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {riskData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                  }}
                />
                <Legend formatter={(value) => <span className="text-slate-300 text-xs">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
              Add AI systems to see risk distribution
            </div>
          )}
          {systems.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1.5 text-xs text-slate-400">
              {[
                { label: 'Unacceptable', key: 'unacceptable' as const },
                { label: 'High', key: 'high' as const },
                { label: 'Limited', key: 'limited' as const },
                { label: 'Minimal', key: 'minimal' as const },
                { label: 'Unassessed', key: 'unassessed' as const },
              ].map(({ label, key }) => (
                <li key={key} className="flex justify-between gap-2">
                  <span>{label}</span>
                  <span className="text-slate-300 tabular-nums">
                    {systems.filter((s) => normalizeTier(s.risk_tier) === key).length}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center">
          <h3 className="font-semibold text-white mb-2">Compliance readiness</h3>
          <p className="text-xs text-slate-500 mb-6">Average compliance score across all systems</p>
          {systems.length === 0 ? (
            <p className="text-slate-500 text-sm">Add systems to calculate readiness.</p>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="text-6xl font-black text-indigo-400 tabular-nums">{grade}</div>
              <p className="text-3xl font-bold text-white tabular-nums">{avgReadiness}%</p>
              <p className="text-xs text-slate-500 text-center max-w-xs">
                Letter grade from average score (90+ A, 80+ B, 70+ C, 60+ D, below F)
              </p>
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4">Upcoming Deadlines</h3>
          <div className="flex flex-col gap-3">
            {calendarLoading ? (
              <>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-xl p-3 border border-slate-800">
                    <Skeleton className="h-4 w-full max-w-[200px] mb-2 bg-slate-800" />
                    <Skeleton className="h-3 w-32 bg-slate-800" />
                  </div>
                ))}
              </>
            ) : (
              <>
                {calendar.slice(0, 5).map((d) => {
                  const st = milestoneDeadlineStyle(d.days_left)
                  return (
                    <div key={d.id} className={cn('rounded-xl p-3 border', st.border)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{d.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{d.dueDate}</p>
                        </div>
                        <span className={cn('text-xs font-bold flex-shrink-0 tabular-nums', st.label)}>
                          {d.days_left > 0 ? `${d.days_left}d` : 'Due'}
                        </span>
                      </div>
                    </div>
                  )
                })}
                {calendar.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-4">No deadlines to show</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

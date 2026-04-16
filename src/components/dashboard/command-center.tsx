'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { cn, daysUntil, urgencyColor, urgencyBg } from '@/lib/utils'
import { Skeleton } from '@/src/components/ui/skeleton'
import type { CalendarItem, StatsData, SystemData } from '@/src/types/dashboard'

const ENFORCEMENT_DATE = '2026-08-02'

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

  const riskData = [
    { name: 'High Risk', value: systems.filter((s) => s.risk_tier === 'high').length, color: '#f97316' },
    { name: 'Limited', value: systems.filter((s) => s.risk_tier === 'limited').length, color: '#eab308' },
    { name: 'Minimal', value: systems.filter((s) => s.risk_tier === 'minimal').length, color: '#22c55e' },
    {
      name: 'Unknown',
      value: systems.filter((s) => !['high', 'limited', 'minimal', 'unacceptable'].includes(s.risk_tier)).length,
      color: '#6b7280',
    },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-6">
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

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4">Risk Distribution</h3>
          {riskData.length > 0 ? (
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
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4">Upcoming Deadlines</h3>
          <div className="space-y-3">
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
                {calendar.slice(0, 5).map((d) => (
                  <div key={d.id} className={cn('rounded-xl p-3 border', urgencyBg(d.days_left))}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{d.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{d.deadline_date}</p>
                      </div>
                      <span className={cn('text-xs font-bold flex-shrink-0', urgencyColor(d.days_left))}>
                        {d.days_left > 0 ? `${d.days_left}d` : 'Due'}
                      </span>
                    </div>
                  </div>
                ))}
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

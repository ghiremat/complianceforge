'use client'

import { cn, urgencyColor, urgencyBg } from '@/lib/utils'
import { Skeleton } from '@/src/components/ui/skeleton'
import type { CalendarItem } from '@/src/types/dashboard'

export interface DeadlinesProps {
  calendar: CalendarItem[]
  loading: boolean
}

export function Deadlines({ calendar, loading }: DeadlinesProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">
          {loading ? '…' : `${calendar.length} compliance deadlines tracked`}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border border-slate-800 rounded-2xl p-5">
              <Skeleton className="h-5 w-64 mb-2 bg-slate-800" />
              <Skeleton className="h-4 w-40 bg-slate-800" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {calendar.map((d) => (
            <div key={d.id} className={cn('border rounded-2xl p-5', urgencyBg(d.days_left))}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn('text-xs font-bold px-2 py-0.5 rounded-full uppercase', {
                        'bg-red-800 text-red-200': d.priority === 'high',
                        'bg-amber-800 text-amber-200': d.priority === 'medium',
                        'bg-green-800 text-green-200': d.priority === 'low',
                      })}
                    >
                      {d.priority}
                    </span>
                    {d.status === 'completed' && (
                      <span className="text-xs bg-green-800 text-green-200 px-2 py-0.5 rounded-full">Completed</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-white">{d.title}</h3>
                  {d.description && <p className="text-sm text-slate-400 mt-1">{d.description}</p>}
                  <p className="text-xs text-slate-500 mt-2">
                    Deadline: <span className="text-slate-300">{d.deadline_date}</span>
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={cn('text-3xl font-black', urgencyColor(d.days_left))}>
                    {d.days_left > 0 ? d.days_left : '—'}
                  </div>
                  <div className={cn('text-xs', urgencyColor(d.days_left))}>
                    {d.days_left > 0 ? 'days left' : d.days_left === 0 ? 'TODAY' : 'passed'}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {calendar.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-8">No deadlines tracked yet</p>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/src/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table'
import type { SystemData } from '@/src/types/dashboard'

export interface IncidentsProps {
  systems: SystemData[]
}

type IncidentRow = {
  id: string
  title: string
  description: string | null
  severity: string
  status: string
  systemId: string
  systemName: string
  reportedBy: string
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

function severityBadgeClass(severity: string) {
  const s = severity?.toLowerCase()
  if (s === 'critical') return 'bg-red-900/80 text-red-200 border border-red-700'
  if (s === 'high') return 'bg-orange-900/80 text-orange-200 border border-orange-700'
  if (s === 'medium') return 'bg-amber-900/80 text-amber-200 border border-amber-700'
  if (s === 'low') return 'bg-emerald-900/80 text-emerald-200 border border-emerald-700'
  return 'bg-slate-800 text-slate-300 border border-slate-700'
}

function statusBadgeClass(status: string) {
  const s = status?.toLowerCase()
  if (s === 'open') return 'bg-red-900/80 text-red-200 border border-red-700'
  if (s === 'investigating') return 'bg-amber-900/80 text-amber-200 border border-amber-700'
  if (s === 'resolved') return 'bg-emerald-900/80 text-emerald-200 border border-emerald-700'
  return 'bg-slate-800 text-slate-300 border border-slate-700'
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function Incidents({ systems }: IncidentsProps) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<IncidentRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    severity: 'medium',
    systemId: systems[0]?.id ?? '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/incidents')
      if (!r.ok) {
        const err = (await r.json().catch(() => ({}))) as { error?: string }
        toast.error(err.error ?? 'Failed to load incidents')
        setRows([])
        return
      }
      const data = (await r.json()) as IncidentRow[] | { incidents?: IncidentRow[] }
      setRows(Array.isArray(data) ? data : data.incidents ?? [])
    } catch {
      toast.error('Failed to load incidents')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!form.systemId && systems[0]?.id) {
      setForm((f) => ({ ...f, systemId: systems[0].id }))
    }
  }, [systems, form.systemId])

  async function submitIncident() {
    if (!form.title.trim() || !form.systemId) {
      toast.error('Title and system are required')
      return
    }
    setSubmitting(true)
    try {
      const r = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          severity: form.severity,
          aiSystemId: form.systemId,
        }),
      })
      if (r.ok) {
        toast.success('Incident reported')
        setShowForm(false)
        setForm({ title: '', description: '', severity: 'medium', systemId: systems[0]?.id ?? '' })
        await load()
      } else {
        const err = (await r.json().catch(() => ({}))) as { error?: string }
        toast.error(err.error ?? 'Failed to report incident')
      }
    } catch {
      toast.error('Failed to report incident')
    } finally {
      setSubmitting(false)
    }
  }

  async function patchStatus(id: string, status: string) {
    try {
      const r = await fetch(`/api/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (r.ok) {
        toast.success('Status updated')
        await load()
      } else {
        const err = (await r.json().catch(() => ({}))) as { error?: string }
        toast.error(err.error ?? 'Update failed')
      }
    } catch {
      toast.error('Update failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-950 border border-red-900 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Incidents</h2>
            <p className="text-sm text-slate-400">Track and triage AI system incidents</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          {showForm ? 'Cancel' : 'Report Incident'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <p className="text-sm text-slate-400">Log a new incident for one of your AI systems.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-lg border border-slate-700 bg-[#0a0a0f] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Short summary"
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-slate-700 bg-[#0a0a0f] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y min-h-[88px]"
                placeholder="What happened?"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Severity</label>
              <select
                value={form.severity}
                onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
                className="w-full cursor-pointer rounded-lg border border-slate-700 bg-[#0a0a0f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">System</label>
              <select
                value={form.systemId}
                onChange={(e) => setForm((f) => ({ ...f, systemId: e.target.value }))}
                className="w-full cursor-pointer rounded-lg border border-slate-700 bg-[#0a0a0f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {systems.length === 0 ? (
                  <option value="">No systems</option>
                ) : (
                  systems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="cursor-pointer rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition-colors duration-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting || systems.length === 0}
              onClick={() => void submitIncident()}
              className="cursor-pointer rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-[#0a0a0f] overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-10 flex-1 bg-slate-800" />
                <Skeleton className="h-10 w-24 bg-slate-800" />
                <Skeleton className="h-10 w-24 bg-slate-800" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400">Title</TableHead>
                <TableHead className="text-slate-400">System</TableHead>
                <TableHead className="text-slate-400">Severity</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Reported</TableHead>
                <TableHead className="text-slate-400">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableCell colSpan={6} className="text-center text-slate-500 py-10">
                    No incidents yet
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((i) => (
                  <TableRow key={i.id} className="border-slate-800">
                    <TableCell className="font-medium text-white max-w-[200px]">
                      <span className="line-clamp-2">{i.title}</span>
                    </TableCell>
                    <TableCell className="text-slate-300">{i.systemName}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'text-xs font-semibold uppercase px-2 py-0.5 rounded-full inline-block',
                          severityBadgeClass(i.severity)
                        )}
                      >
                        {i.severity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <span
                          className={cn(
                            'text-xs font-semibold uppercase px-2 py-0.5 rounded-full inline-block w-fit',
                            statusBadgeClass(i.status)
                          )}
                        >
                          {i.status}
                        </span>
                        <select
                          value={i.status}
                          onChange={(e) => void patchStatus(i.id, e.target.value)}
                          className="cursor-pointer rounded-lg border border-slate-700 bg-slate-900 text-xs text-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[160px]"
                          aria-label="Update incident status"
                        >
                          <option value="open">open</option>
                          <option value="investigating">investigating</option>
                          <option value="resolved">resolved</option>
                        </select>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">{i.reportedBy}</TableCell>
                    <TableCell className="text-slate-400 text-sm whitespace-nowrap">
                      {formatDate(i.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Shield } from 'lucide-react'
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

type AuditLogEntry = {
  id: string
  action: string
  resource: string
  resourceId: string | null
  userName: string
  systemName: string | null
  details: string | null
  ipAddress: string | null
  timestamp: string
}

function actionBadgeClass(action: string) {
  const a = action?.toLowerCase()
  if (a === 'create') return 'bg-emerald-900/80 text-emerald-200 border border-emerald-700'
  if (a === 'update') return 'bg-blue-900/80 text-blue-200 border border-blue-700'
  if (a === 'delete') return 'bg-red-900/80 text-red-200 border border-red-700'
  if (a === 'classify') return 'bg-indigo-900/80 text-indigo-200 border border-indigo-700'
  return 'bg-slate-800 text-slate-300 border border-slate-700'
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function DetailsCell({ details }: { details: string | null }) {
  const [open, setOpen] = useState(false)
  const parsed = useMemo(() => {
    if (!details?.trim()) return null as string | Record<string, unknown> | unknown[] | null
    try {
      return JSON.parse(details) as unknown
    } catch {
      return details
    }
  }, [details])

  const text = useMemo(() => {
    if (parsed === null) return '—'
    if (typeof parsed === 'string') return parsed
    return JSON.stringify(parsed, null, 2)
  }, [parsed])

  const previewLen = 120
  const needsTruncate = text.length > previewLen
  const shown = open || !needsTruncate ? text : `${text.slice(0, previewLen)}…`

  if (parsed === null) {
    return <span className="text-slate-500">—</span>
  }

  return (
    <div className="max-w-xs sm:max-w-md">
      <pre className="text-xs text-slate-300 whitespace-pre-wrap break-words font-mono bg-slate-950/50 rounded-lg p-2 border border-slate-800">
        {shown}
      </pre>
      {needsTruncate && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-1 inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
        >
          {open ? (
            <>
              <ChevronUp className="w-3 h-3" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" /> Expand
            </>
          )}
        </button>
      )}
    </div>
  )
}

export function AuditLog() {
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    setForbidden(false)
    try {
      const r = await fetch(`/api/audit-logs?page=${page}&limit=${limit}`)
      if (r.status === 403) {
        setForbidden(true)
        setLogs([])
        return
      }
      if (!r.ok) {
        setLogs([])
        return
      }
      const data = (await r.json()) as {
        logs: AuditLogEntry[]
        total: number
        page: number
        pages: number
      }
      setLogs(data.logs)
      setTotal(data.total)
      setPages(data.pages)
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-900 flex items-center justify-center">
          <Shield className="w-5 h-5 text-indigo-300" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Audit Logs</h2>
          <p className="text-sm text-slate-400">Organization activity trail</p>
        </div>
      </div>

      {forbidden && (
        <div className="rounded-2xl border border-amber-900/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
          Admin access is required to view audit logs. Ask an organization admin to grant you the admin role.
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-[#0a0a0f] overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 w-40 bg-slate-800" />
                <Skeleton className="h-8 flex-1 bg-slate-800" />
                <Skeleton className="h-8 w-24 bg-slate-800" />
              </div>
            ))}
          </div>
        ) : forbidden ? null : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Time</TableHead>
                  <TableHead className="text-slate-400">User</TableHead>
                  <TableHead className="text-slate-400">Action</TableHead>
                  <TableHead className="text-slate-400">Resource</TableHead>
                  <TableHead className="text-slate-400">System</TableHead>
                  <TableHead className="text-slate-400">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableCell colSpan={6} className="text-center text-slate-500 py-10">
                      No audit entries yet
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((l) => (
                    <TableRow key={l.id} className="border-slate-800">
                      <TableCell className="text-slate-400 text-sm whitespace-nowrap">
                        {formatTime(l.timestamp)}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm">{l.userName}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'text-xs font-semibold uppercase px-2 py-0.5 rounded-full inline-block',
                            actionBadgeClass(l.action)
                          )}
                        >
                          {l.action}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm">
                        {l.resource}
                        {l.resourceId ? (
                          <span className="block text-xs text-slate-500 truncate max-w-[140px]">{l.resourceId}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">{l.systemName ?? '—'}</TableCell>
                      <TableCell>
                        <DetailsCell details={l.details} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-slate-800 bg-slate-900/50">
              <p className="text-xs text-slate-500">
                Page {page} of {pages} · {total} total
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

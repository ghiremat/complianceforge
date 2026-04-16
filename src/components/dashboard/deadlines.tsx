'use client'

import { useState } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn, urgencyColor, urgencyBg } from '@/lib/utils'
import { Skeleton } from '@/src/components/ui/skeleton'
import type { CalendarItem } from '@/src/types/dashboard'

const BUILTIN_DEADLINE_IDS = new Set(['eu-enforcement', 'gpai-deadline', 'prohibited-deadline'])

export interface DeadlinesProps {
  calendar: CalendarItem[]
  loading: boolean
  onRefresh?: () => void | Promise<void>
}

const PRIORITIES = ['high', 'medium', 'low'] as const
const CATEGORIES = ['general', 'regulatory', 'assessment', 'documentation'] as const
const STATUSES = ['pending', 'completed', 'overdue'] as const

function isCustomDeadline(id: string) {
  return !BUILTIN_DEADLINE_IDS.has(id)
}

export function Deadlines({ calendar, loading, onRefresh }: DeadlinesProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [newRow, setNewRow] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as string,
    category: 'general' as string,
  })
  const [editRow, setEditRow] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as string,
    category: 'general' as string,
    status: 'pending' as string,
  })

  async function refresh() {
    await onRefresh?.()
  }

  async function addDeadline() {
    if (!newRow.title.trim() || !newRow.dueDate) {
      toast.error('Title and due date are required')
      return
    }
    setAdding(true)
    try {
      const r = await fetch('/api/deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newRow.title.trim(),
          description: newRow.description.trim() || undefined,
          dueDate: newRow.dueDate,
          priority: newRow.priority,
          category: newRow.category,
        }),
      })
      if (r.ok) {
        toast.success('Deadline added')
        setShowAdd(false)
        setNewRow({ title: '', description: '', dueDate: '', priority: 'medium', category: 'general' })
        await refresh()
      } else {
        const err = (await r.json().catch(() => ({}))) as { error?: string }
        toast.error(err.error ?? 'Failed to add deadline')
      }
    } catch {
      toast.error('Failed to add deadline')
    } finally {
      setAdding(false)
    }
  }

  function startEdit(d: CalendarItem) {
    setEditingId(d.id)
    setEditRow({
      title: d.title,
      description: d.description ?? '',
      dueDate: d.deadline_date,
      priority: d.priority,
      category: d.category ?? 'general',
      status: d.status,
    })
  }

  async function saveEdit(id: string) {
    try {
      const r = await fetch(`/api/deadlines/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editRow.title.trim(),
          description: editRow.description,
          dueDate: editRow.dueDate,
          priority: editRow.priority,
          category: editRow.category,
          status: editRow.status,
        }),
      })
      if (r.ok) {
        toast.success('Deadline updated')
        setEditingId(null)
        await refresh()
      } else {
        const err = (await r.json().catch(() => ({}))) as { error?: string }
        toast.error(err.error ?? 'Update failed')
      }
    } catch {
      toast.error('Update failed')
    }
  }

  async function deleteDeadline(id: string) {
    if (!window.confirm('Delete this deadline? This cannot be undone.')) return
    setDeletingId(id)
    try {
      const r = await fetch(`/api/deadlines/${id}`, { method: 'DELETE' })
      if (r.ok) {
        toast.success('Deadline removed')
        if (editingId === id) setEditingId(null)
        await refresh()
      } else {
        const err = (await r.json().catch(() => ({}))) as { error?: string }
        toast.error(err.error ?? 'Delete failed')
      }
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-slate-400 text-sm">
          {loading ? '…' : `${calendar.length} compliance deadlines tracked`}
        </p>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2.5 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          {showAdd ? 'Close' : 'Add Deadline'}
        </button>
      </div>

      {showAdd && (
        <div className="border border-slate-800 rounded-2xl p-5 bg-slate-900/80 space-y-4">
          <p className="text-sm text-slate-400">Create a custom compliance deadline for your organization.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase">Title</label>
              <input
                value={newRow.title}
                onChange={(e) => setNewRow((r) => ({ ...r, title: e.target.value }))}
                className="w-full rounded-lg border border-slate-700 bg-[#0a0a0f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase">Description</label>
              <textarea
                value={newRow.description}
                onChange={(e) => setNewRow((r) => ({ ...r, description: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-slate-700 bg-[#0a0a0f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase">Due date</label>
              <input
                type="date"
                value={newRow.dueDate}
                onChange={(e) => setNewRow((r) => ({ ...r, dueDate: e.target.value }))}
                className="w-full rounded-lg border border-slate-700 bg-[#0a0a0f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase">Priority</label>
              <select
                value={newRow.priority}
                onChange={(e) => setNewRow((r) => ({ ...r, priority: e.target.value }))}
                className="w-full rounded-lg border border-slate-700 bg-[#0a0a0f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase">Category</label>
              <select
                value={newRow.category}
                onChange={(e) => setNewRow((r) => ({ ...r, category: e.target.value }))}
                className="w-full rounded-lg border border-slate-700 bg-[#0a0a0f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={adding}
              onClick={() => void addDeadline()}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white"
            >
              {adding ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

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
          {calendar.map((d) => {
            const custom = isCustomDeadline(d.id)
            const isEditing = editingId === d.id

            return (
              <div key={d.id} className={cn('border rounded-2xl p-5', urgencyBg(d.days_left))}>
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Edit deadline</p>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80"
                        aria-label="Cancel edit"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-xs text-slate-500">Title</label>
                        <input
                          value={editRow.title}
                          onChange={(e) => setEditRow((r) => ({ ...r, title: e.target.value }))}
                          className="w-full rounded-lg border border-slate-700 bg-[#0a0a0f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-xs text-slate-500">Description</label>
                        <textarea
                          value={editRow.description}
                          onChange={(e) => setEditRow((r) => ({ ...r, description: e.target.value }))}
                          rows={2}
                          className="w-full rounded-lg border border-slate-700 bg-[#0a0a0f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-500">Due date</label>
                        <input
                          type="date"
                          value={editRow.dueDate}
                          onChange={(e) => setEditRow((r) => ({ ...r, dueDate: e.target.value }))}
                          className="w-full rounded-lg border border-slate-700 bg-[#0a0a0f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-500">Priority</label>
                        <select
                          value={editRow.priority}
                          onChange={(e) => setEditRow((r) => ({ ...r, priority: e.target.value }))}
                          className="w-full rounded-lg border border-slate-700 bg-[#0a0a0f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {PRIORITIES.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-500">Category</label>
                        <select
                          value={editRow.category}
                          onChange={(e) => setEditRow((r) => ({ ...r, category: e.target.value }))}
                          className="w-full rounded-lg border border-slate-700 bg-[#0a0a0f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-500">Status</label>
                        <select
                          value={editRow.status}
                          onChange={(e) => setEditRow((r) => ({ ...r, status: e.target.value }))}
                          className="w-full rounded-lg border border-slate-700 bg-[#0a0a0f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveEdit(d.id)}
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-white"
                      >
                        Save changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                        {d.category && (
                          <span className="text-xs text-slate-500 border border-slate-700 rounded-full px-2 py-0.5">
                            {d.category}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-white">{d.title}</h3>
                      {d.description && <p className="text-sm text-slate-400 mt-1">{d.description}</p>}
                      <p className="text-xs text-slate-500 mt-2">
                        Deadline: <span className="text-slate-300">{d.deadline_date}</span>
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                      <div className={cn('text-3xl font-black', urgencyColor(d.days_left))}>
                        {d.days_left > 0 ? d.days_left : '—'}
                      </div>
                      <div className={cn('text-xs', urgencyColor(d.days_left))}>
                        {d.days_left > 0 ? 'days left' : d.days_left === 0 ? 'TODAY' : 'passed'}
                      </div>
                      {custom && (
                        <div className="flex gap-1 pt-1">
                          <button
                            type="button"
                            onClick={() => startEdit(d)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === d.id}
                            onClick={() => void deleteDeadline(d.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-900/60 bg-red-950/40 px-2 py-1 text-xs text-red-200 hover:bg-red-950/70 disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {deletingId === d.id ? '…' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {calendar.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-8">No deadlines tracked yet</p>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { CheckSquare, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { cn, scoreColor, scoreBarColor } from '@/lib/utils'
import type { SystemData } from '@/src/types/dashboard'
import { ANNEX_IV_SECTIONS } from '@/types'

interface TrackerItem {
  id: number
  article: string
  article_title: string
  status: string
  requirement: string
  evidence?: string
}

export interface ComplianceTrackerProps {
  systems: SystemData[]
}

function buildComplianceItems(system: SystemData): TrackerItem[] {
  return ANNEX_IV_SECTIONS.map((s) => ({
    id: s.id,
    article: `Annex IV §${s.id}`,
    article_title: s.title,
    status: system.compliance_score > 0 ? 'in_progress' : 'non_compliant',
    requirement: `Provide documentation for: ${s.title}`,
  }))
}

export function ComplianceTracker({ systems }: ComplianceTrackerProps) {
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null)
  const [expandedItem, setExpandedItem] = useState<number | null>(null)
  const [complianceItems, setComplianceItems] = useState<TrackerItem[]>([])
  const [itemUpdates, setItemUpdates] = useState<Record<number, { status: string; evidence: string }>>({})
  const [saving, setSaving] = useState<number | null>(null)

  const selectedSystem = systems.find((s) => s.id === selectedSystemId) ?? null

  useEffect(() => {
    if (!selectedSystemId) {
      setComplianceItems([])
      return
    }
    const sys = systems.find((s) => s.id === selectedSystemId)
    if (!sys) {
      setComplianceItems([])
      return
    }

    const id = selectedSystemId
    setComplianceItems(buildComplianceItems(sys))
    setItemUpdates({})

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/systems/${id}/compliance-items`)
        if (!res.ok || cancelled) return
        const saved = (await res.json()) as Array<{
          section: number | null
          status: string
          content: string | null
          updatedAt: string
        }>
        setComplianceItems((prev) =>
          prev.map((item) => {
            const match = saved.find((s) => s.section === item.id)
            if (match) {
              return {
                ...item,
                status: match.status,
                evidence: match.content?.trim() ? match.content : item.evidence,
              }
            }
            return item
          })
        )
      } catch {
        /* hydration is best-effort */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [selectedSystemId, systems])

  async function saveComplianceItem(itemId: number) {
    if (!selectedSystemId) return
    setSaving(itemId)
    try {
      const update = itemUpdates[itemId]
      const item = complianceItems.find((i) => i.id === itemId)
      if (!update || !item) {
        toast.info('No changes to save')
        setSaving(null)
        return
      }
      const r = await fetch(`/api/systems/${selectedSystemId}/compliance-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: itemId,
          title: item.article_title,
          status: update.status ?? item.status,
          evidence: update.evidence ?? '',
        }),
      })
      if (r.ok) {
        toast.success('Compliance item saved')
      } else {
        const err = (await r.json().catch(() => ({ error: 'Save failed' }))) as { error?: string }
        toast.error(err.error ?? 'Failed to save')
      }
    } catch {
      toast.error('Failed to save compliance item')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1.5">Select AI System to Track</label>
            <select
              value={selectedSystemId ?? ''}
              onChange={(e) => {
                const id = e.target.value || null
                setSelectedSystemId(id)
                setExpandedItem(null)
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="">Choose a system...</option>
              {systems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.org_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedSystem && (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-white">{selectedSystem.name}</span>
              <span className={cn('text-xl font-black', scoreColor(selectedSystem.compliance_score))}>
                {selectedSystem.compliance_score}%
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3">
              <div
                className={cn('h-3 rounded-full transition-all duration-500', scoreBarColor(selectedSystem.compliance_score))}
                style={{ width: `${selectedSystem.compliance_score}%` }}
              />
            </div>
            <div className="flex gap-4 mt-3 text-xs text-slate-500">
              <span>Risk tier: {selectedSystem.risk_tier || 'unassessed'}</span>
              <span>Status: {selectedSystem.compliance_status?.replace('_', ' ') || 'not started'}</span>
            </div>
          </div>

          <div className="space-y-2">
            {complianceItems.map((item) => (
              <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-800/50 transition-colors"
                  onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                >
                  <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded flex-shrink-0">
                    {item.article}
                  </span>
                  <span className="flex-1 text-sm font-medium text-white">{item.article_title}</span>
                  <span
                    className={cn('text-xs px-2 py-1 rounded-full flex-shrink-0', {
                      'bg-green-900 text-green-300': itemUpdates[item.id]?.status === 'compliant' || item.status === 'compliant',
                      'bg-red-900 text-red-300': (itemUpdates[item.id]?.status ?? item.status) === 'non_compliant',
                      'bg-yellow-900 text-yellow-300': (itemUpdates[item.id]?.status ?? item.status) === 'in_progress',
                      'bg-gray-800 text-gray-400': (itemUpdates[item.id]?.status ?? item.status) === 'not_applicable',
                    })}
                  >
                    {(itemUpdates[item.id]?.status ?? item.status).replace('_', ' ')}
                  </span>
                  {expandedItem === item.id ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  )}
                </button>

                {expandedItem === item.id && (
                  <div className="border-t border-slate-800 p-4 space-y-3">
                    <p className="text-slate-400 text-sm">{item.requirement}</p>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Status</label>
                        <select
                          value={itemUpdates[item.id]?.status ?? item.status}
                          onChange={(e) =>
                            setItemUpdates((u) => ({
                              ...u,
                              [item.id]: { status: e.target.value, evidence: u[item.id]?.evidence ?? '' },
                            }))
                          }
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                        >
                          <option value="compliant">Compliant</option>
                          <option value="in_progress">In Progress</option>
                          <option value="non_compliant">Non-Compliant</option>
                          <option value="not_applicable">Not Applicable</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Due Date</label>
                        <input
                          type="date"
                          defaultValue="2026-08-02"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Evidence / Notes</label>
                      <textarea
                        value={itemUpdates[item.id]?.evidence ?? item.evidence ?? ''}
                        onChange={(e) =>
                          setItemUpdates((u) => ({
                            ...u,
                            [item.id]: { status: u[item.id]?.status ?? item.status, evidence: e.target.value },
                          }))
                        }
                        placeholder="Add evidence, documentation links, or notes..."
                        rows={2}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => saveComplianceItem(item.id)}
                      disabled={saving === item.id}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      {saving === item.id ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {!selectedSystemId && (
        <div className="text-center py-16 text-slate-500">
          <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Select an AI system above to track compliance items</p>
        </div>
      )}
    </div>
  )
}

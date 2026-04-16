'use client'

import { useState } from 'react'
import type { Session } from 'next-auth'
import Link from 'next/link'
import { Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { cn, riskBadgeColor, scoreColor, scoreBarColor } from '@/lib/utils'
import { Skeleton } from '@/src/components/ui/skeleton'
import type { SystemData } from '@/src/types/dashboard'

export interface AiInventoryProps {
  systems: SystemData[]
  systemsLoading: boolean
  session: Session | null
  onSystemsChanged: () => Promise<void>
}

export function AiInventory({ systems, systemsLoading, session, onSystemsChanged }: AiInventoryProps) {
  const [showAddSystem, setShowAddSystem] = useState(false)
  const [newSystem, setNewSystem] = useState({ org_id: '', name: '', description: '', use_case: '', sector: '' })
  const [classifyingId, setClassifyingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  async function classifySystem(id: string) {
    setClassifyingId(id)
    try {
      const r = await fetch(`/api/systems/${id}/classify`, { method: 'POST' })
      if (r.ok) {
        const data = (await r.json()) as {
          assessment: { riskTier: string; confidence: number }
        }
        toast.success(
          `Classified as ${data.assessment.riskTier} risk (${Math.round(data.assessment.confidence * 100)}% confidence)`
        )
        await onSystemsChanged()
      } else {
        const err = (await r.json().catch(() => ({ error: 'Classification failed' }))) as { error?: string }
        toast.error(err.error ?? 'Classification failed')
      }
    } catch {
      toast.error('Failed to classify system')
    } finally {
      setClassifyingId(null)
    }
  }

  async function addSystem() {
    if (!newSystem.name.trim()) return
    setAdding(true)
    try {
      const r = await fetch('/api/systems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSystem.name,
          description: newSystem.description,
          use_case: newSystem.use_case,
          sector: newSystem.sector,
        }),
      })
      if (r.ok) {
        toast.success('System registered')
        await onSystemsChanged()
        setShowAddSystem(false)
        setNewSystem({ org_id: '', name: '', description: '', use_case: '', sector: '' })
      } else {
        const err = (await r.json().catch(() => ({ error: 'Failed to register' }))) as { error?: string }
        toast.error(err.error ?? 'Failed to register system')
      }
    } catch {
      toast.error('Failed to register system')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">
          {systemsLoading ? '…' : `${systems.length} AI systems registered`}
        </p>
        <button
          type="button"
          onClick={() => setShowAddSystem(!showAddSystem)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add System
        </button>
      </div>

      {showAddSystem && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4">Register New AI System</h3>
          {session?.user && 'organizationName' in session.user && session.user.organizationName && (
            <p className="text-sm text-slate-400 mb-4">
              Adding to{' '}
              <span className="text-indigo-400 font-medium">{String(session.user.organizationName)}</span>
            </p>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">System Name *</label>
              <input
                value={newSystem.name}
                onChange={(e) => setNewSystem((s) => ({ ...s, name: e.target.value }))}
                placeholder="e.g. Customer Churn Predictor"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Sector</label>
              <input
                value={newSystem.sector}
                onChange={(e) => setNewSystem((s) => ({ ...s, sector: e.target.value }))}
                placeholder="e.g. Healthcare, Finance"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Use Case</label>
              <input
                value={newSystem.use_case}
                onChange={(e) => setNewSystem((s) => ({ ...s, use_case: e.target.value }))}
                placeholder="e.g. Automate hiring screening"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Description</label>
              <textarea
                value={newSystem.description}
                onChange={(e) => setNewSystem((s) => ({ ...s, description: e.target.value }))}
                placeholder="Describe what this AI system does..."
                rows={2}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={addSystem}
              disabled={adding}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              {adding ? 'Saving…' : 'Register System'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddSystem(false)}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">System</th>
                <th className="text-left p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Sector</th>
                <th className="text-left p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Risk Tier</th>
                <th className="text-left p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider w-48">
                  Compliance
                </th>
                <th className="text-left p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {systemsLoading ? (
                [0, 1, 2].map((i) => (
                  <tr key={i} className="border-b border-slate-800/50">
                    <td className="p-4" colSpan={5}>
                      <Skeleton className="h-10 w-full bg-slate-800" />
                    </td>
                  </tr>
                ))
              ) : (
                <>
                  {systems.map((sys) => (
                    <tr key={sys.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="p-4">
                        <Link
                          href={`/dashboard/systems/${sys.id}`}
                          className="font-medium text-white text-sm hover:text-indigo-400 transition-colors"
                        >
                          {sys.name}
                        </Link>
                        <p className="text-slate-500 text-xs">{sys.org_name}</p>
                      </td>
                      <td className="p-4 text-slate-300 text-sm">{sys.sector || '—'}</td>
                      <td className="p-4">
                        <span
                          className={cn(
                            'px-2 py-1 rounded-full text-xs font-semibold capitalize',
                            riskBadgeColor(sys.risk_tier)
                          )}
                        >
                          {sys.risk_tier || 'unknown'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-800 rounded-full h-2">
                            <div
                              className={cn('h-2 rounded-full transition-all', scoreBarColor(sys.compliance_score))}
                              style={{ width: `${sys.compliance_score}%` }}
                            />
                          </div>
                          <span className={cn('text-xs font-semibold w-8', scoreColor(sys.compliance_score))}>
                            {sys.compliance_score}%
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => classifySystem(sys.id)}
                          disabled={classifyingId === sys.id}
                          className="flex items-center gap-1 text-xs bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-700/50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {classifyingId === sys.id ? (
                            <>
                              <span className="w-3 h-3 border border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />{' '}
                              Classifying...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3" /> Classify AI
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {systems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        No AI systems registered yet
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

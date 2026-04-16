'use client'

import { useState } from 'react'
import { FileText, Shield, Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { cn, scoreColor, riskBadgeColor } from '@/lib/utils'
import type { SystemData } from '@/src/types/dashboard'
import { ANNEX_IV_SECTIONS } from '@/types'

interface ReportView {
  system: SystemData
  generatedAt: string
  sections: Array<{ id: number; title: string; status: string }>
}

export interface ReportsProps {
  systems: SystemData[]
}

function buildReport(system: SystemData): ReportView {
  return {
    system,
    generatedAt: new Date().toISOString(),
    sections: ANNEX_IV_SECTIONS.map((s) => ({
      id: s.id,
      title: s.title,
      status: system.compliance_score > 50 ? 'in_progress' : 'non_compliant',
    })),
  }
}

export function Reports({ systems }: ReportsProps) {
  const [reportSystemId, setReportSystemId] = useState('')
  const [report, setReport] = useState<ReportView | null>(null)
  const [copyMsg, setCopyMsg] = useState('')

  const reportSystem = systems.find((s) => s.id === reportSystemId)
  const reportTrustPath =
    reportSystemId && reportSystem?.org_slug ? `/trust/${reportSystem.org_slug}/${reportSystemId}` : null

  function generateReport() {
    const system = systems.find((s) => s.id === reportSystemId)
    if (!system) return
    const r = buildReport(system)
    setReport(r)
    toast.success('Report generated')
  }

  function copyReportUrl() {
    const selectedSys = systems.find((s) => s.id === reportSystemId)
    const slug = selectedSys?.org_slug
    if (!slug) {
      toast.error('Organization slug not set — configure it in settings')
      return
    }
    const url = `${window.location.origin}/trust/${slug}/${reportSystemId}`
    navigator.clipboard.writeText(url)
    setCopyMsg('Copied!')
    setTimeout(() => setCopyMsg(''), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-6 h-6 text-white" />
          <h2 className="text-lg font-semibold text-white">Compliance Reports</h2>
        </div>
        <p className="text-slate-400 text-sm mb-6">
          Generate shareable compliance reports for any AI system. Share the public URL with stakeholders, auditors, or
          regulators.
        </p>

        <div className="flex gap-3">
          <select
            value={reportSystemId}
            onChange={(e) => {
              setReportSystemId(e.target.value)
              setReport(null)
            }}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">Select AI system...</option>
            {systems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={generateReport}
            disabled={!reportSystemId}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-medium text-sm transition-colors"
          >
            Generate Report
          </button>
        </div>

        {reportSystemId && (
          <div className="mt-4 flex items-center gap-2 bg-slate-800 rounded-xl p-3">
            <p className="flex-1 text-xs text-slate-400 font-mono truncate">
              {reportTrustPath ?? 'Set organization slug in settings to build a share URL'}
            </p>
            <button
              type="button"
              onClick={copyReportUrl}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex-shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              {copyMsg || 'Copy URL'}
            </button>
            <a
              href={reportTrustPath ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!reportTrustPath) {
                  e.preventDefault()
                  toast.error('Organization slug not set — configure it in settings')
                }
              }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors flex-shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {report && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-950 to-slate-900 p-6 border-b border-slate-800">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-indigo-400" />
                  <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">
                    EU AI Act Compliance Report
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">{report.system.name}</h3>
                <p className="text-slate-400 text-sm">{report.system.org_name}</p>
              </div>
              <div className="text-right">
                <div className={cn('text-4xl font-black', scoreColor(report.system.compliance_score))}>
                  {report.system.compliance_score}%
                </div>
                <span
                  className={cn('text-xs px-2 py-1 rounded-full capitalize', riskBadgeColor(report.system.risk_tier))}
                >
                  {report.system.risk_tier || 'unknown'} risk
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Generated: {new Date(report.generatedAt).toLocaleString()}
            </p>
          </div>

          <div className="grid grid-cols-3 divide-x divide-slate-800 border-b border-slate-800">
            {[
              { label: 'Compliance', value: `${report.system.compliance_score}%`, color: scoreColor(report.system.compliance_score) },
              { label: 'Risk Tier', value: report.system.risk_tier || 'unknown', color: 'text-white' },
              { label: 'Sections', value: `${report.sections.length}`, color: 'text-white' },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-4 text-center">
                <p className={cn('text-2xl font-bold capitalize', color)}>{value}</p>
                <p className="text-slate-500 text-xs">{label}</p>
              </div>
            ))}
          </div>

          <div className="p-4">
            <h4 className="text-sm font-semibold text-slate-300 mb-3">Annex IV Documentation Checklist</h4>
            <div className="space-y-1.5">
              {report.sections.map((section) => (
                <div key={section.id} className="flex items-center gap-3 py-1.5 border-b border-slate-800/50">
                  <span
                    className={cn('w-2 h-2 rounded-full flex-shrink-0', {
                      'bg-green-500': section.status === 'compliant',
                      'bg-red-500': section.status === 'non_compliant',
                      'bg-yellow-500': section.status === 'in_progress',
                      'bg-gray-500': section.status === 'not_applicable',
                    })}
                  />
                  <span className="text-xs font-mono text-slate-500 w-12 flex-shrink-0">§{section.id}</span>
                  <span className="text-sm text-slate-300 flex-1 truncate">{section.title}</span>
                  <span className="text-xs text-slate-500 capitalize">{section.status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { GitBranch, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { cn, scoreColor, scoreBarColor } from '@/lib/utils'
import { Skeleton } from '@/src/components/ui/skeleton'
import type { SystemData } from '@/src/types/dashboard'

interface ArticleFinding {
  article: string
  title: string
  score: number
  finding: string
}

interface ScanResponse {
  scan: {
    id: string
    repository: string
    branch: string
    totalFindings: number
    reviewRequired: number
    findings: Array<{
      name: string
      framework: string
      files: string[]
      dependencies: string[]
      suggestedRiskTier: string
      confidence: number
    }>
    aiAnalysis: {
      overallScore: number
      aiFrameworks: string[]
      articleFindings: ArticleFinding[]
      priorityFixes: string[]
    }
  }
}

export interface GitHubScannerProps {
  systems: SystemData[]
}

export function GitHubScanner({ systems }: GitHubScannerProps) {
  const [scanUrl, setScanUrl] = useState('')
  const [scanLoading, setScanLoading] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResponse['scan'] | null>(null)
  const [scanSystemId, setScanSystemId] = useState('')

  async function runScan() {
    if (!scanUrl) return
    setScanLoading(true)
    setScanResult(null)
    try {
      const r = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: scanUrl, systemId: scanSystemId || undefined }),
      })
      if (r.ok) {
        const data = (await r.json()) as ScanResponse
        setScanResult(data.scan)
        toast.success(`Scan complete: ${data.scan.totalFindings} findings`)
      } else {
        const err = (await r.json().catch(() => ({ error: 'Scan failed' }))) as { error?: string }
        toast.error(err.error ?? 'Scan failed')
      }
    } catch {
      toast.error('Failed to scan repository')
    } finally {
      setScanLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <GitBranch className="w-6 h-6 text-white" />
          <h2 className="text-lg font-semibold text-white">GitHub Repository Scanner</h2>
        </div>
        <p className="text-slate-400 text-sm mb-6">
          Scan any public GitHub repository for EU AI Act compliance gaps. Detects AI frameworks and analyzes against
          Articles 9-14.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">GitHub Repository URL</label>
            <input
              value={scanUrl}
              onChange={(e) => setScanUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Link to AI System (optional)</label>
            <select
              value={scanSystemId}
              onChange={(e) => setScanSystemId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="">Save scan to system...</option>
              {systems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={runScan}
            disabled={scanLoading || !scanUrl}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-medium text-sm transition-colors"
          >
            {scanLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{' '}
                Scanning...
              </>
            ) : (
              <>
                <GitBranch className="w-4 h-4" /> Scan for Compliance
              </>
            )}
          </button>
        </div>
      </div>

      {scanLoading && !scanResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <Skeleton className="h-6 w-48 bg-slate-800" />
          <Skeleton className="h-16 w-full bg-slate-800" />
          <Skeleton className="h-24 w-full bg-slate-800" />
        </div>
      )}

      {scanResult && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Scan Results</h3>
              <a
                href={scanResult.repository}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-indigo-400 text-sm hover:text-indigo-300"
              >
                <ExternalLink className="w-3 h-3" /> View Repo
              </a>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className={cn('text-5xl font-black', scoreColor(scanResult.aiAnalysis.overallScore))}>
                {scanResult.aiAnalysis.overallScore}
              </div>
              <div>
                <p className="text-white font-medium">Overall Compliance Score</p>
                <p className="text-slate-400 text-sm">
                  {scanResult.aiAnalysis.aiFrameworks.length > 0
                    ? `AI frameworks: ${scanResult.aiAnalysis.aiFrameworks.join(', ')}`
                    : 'No AI frameworks detected'}
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  {scanResult.totalFindings} findings · {scanResult.reviewRequired} need review · branch:{' '}
                  {scanResult.branch}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {scanResult.aiAnalysis.articleFindings.map((f) => (
                <div key={f.article} className="bg-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300 font-mono">
                        {f.article}
                      </span>
                      <span className="text-sm font-medium text-white">{f.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-700 rounded-full h-1.5">
                        <div
                          className={cn('h-1.5 rounded-full', scoreBarColor(f.score))}
                          style={{ width: `${f.score}%` }}
                        />
                      </div>
                      <span className={cn('text-xs font-bold w-8 text-right', scoreColor(f.score))}>{f.score}%</span>
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs">{f.finding}</p>
                </div>
              ))}
            </div>
          </div>

          {scanResult.aiAnalysis.priorityFixes.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-4">Priority Fixes</h3>
              <ol className="space-y-2">
                {scanResult.aiAnalysis.priorityFixes.map((fix, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="flex-shrink-0 w-6 h-6 bg-red-900 text-red-300 rounded-full flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    {fix}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {scanResult.findings.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-4">Detected AI Components</h3>
              <div className="space-y-2">
                {scanResult.findings.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-800 rounded-xl p-3">
                    <div>
                      <p className="text-sm font-medium text-white">{f.name}</p>
                      <p className="text-xs text-slate-400">
                        {f.framework} · {f.files.length} file(s) · {f.dependencies.length} dep(s)
                      </p>
                    </div>
                    <span
                      className={cn(
                        'text-xs px-2 py-1 rounded-full font-semibold capitalize',
                        f.suggestedRiskTier === 'high'
                          ? 'bg-orange-900 text-orange-300'
                          : f.suggestedRiskTier === 'limited'
                            ? 'bg-yellow-900 text-yellow-300'
                            : 'bg-green-900 text-green-300'
                      )}
                    >
                      {f.suggestedRiskTier}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

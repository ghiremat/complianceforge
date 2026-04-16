'use client'

import { useEffect } from 'react'
import { Shield, RefreshCw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-6 h-6 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
        <p className="text-slate-400 text-sm mb-6">
          An unexpected error occurred. This has been logged for investigation.
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    </div>
  )
}

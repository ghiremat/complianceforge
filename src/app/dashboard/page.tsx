'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Shield, LayoutDashboard, Server, GitBranch, CheckSquare, Calendar, FileText, LogOut, Menu, X, Settings as SettingsIcon, AlertTriangle, ClipboardList, Users } from 'lucide-react'
import { cn, daysUntil } from '@/lib/utils'
import type { StatsData, SystemData, CalendarItem } from '@/src/types/dashboard'
import { CommandCenter } from '@/src/components/dashboard/command-center'
import { AiInventory } from '@/src/components/dashboard/ai-inventory'
import { GitHubScanner } from '@/src/components/dashboard/github-scanner'
import { ComplianceTracker } from '@/src/components/dashboard/compliance-tracker'
import { Deadlines } from '@/src/components/dashboard/deadlines'
import { Incidents } from '@/src/components/dashboard/incidents'
import { AuditLog } from '@/src/components/dashboard/audit-log'
import { Reports } from '@/src/components/dashboard/reports'
import { Settings } from '@/src/components/dashboard/settings'
import { Team } from '@/src/components/dashboard/team'

const ENFORCEMENT_DATE = '2026-08-02'
const TABS = [
  { id: 'command', label: 'Command Center', icon: LayoutDashboard },
  { id: 'inventory', label: 'AI Inventory', icon: Server },
  { id: 'scanner', label: 'GitHub Scanner', icon: GitBranch },
  { id: 'tracker', label: 'Compliance Tracker', icon: CheckSquare },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
  { id: 'calendar', label: 'Deadlines', icon: Calendar },
  { id: 'audit', label: 'Audit Log', icon: ClipboardList },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
] as const

type TabId = (typeof TABS)[number]['id']

function parseTabParam(tab: string | null): TabId {
  const id = (tab || 'command') as TabId
  return TABS.some((t) => t.id === id) ? id : 'command'
}

function DashboardInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = parseTabParam(searchParams.get('tab'))

  const { data: session, status } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const user = session?.user ? { email: session.user.email ?? '', name: session.user.name ?? '' } : null

  const [stats, setStats] = useState<StatsData | null>(null)
  const [systems, setSystems] = useState<SystemData[]>([])
  const [calendar, setCalendar] = useState<CalendarItem[]>([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [systemsLoading, setSystemsLoading] = useState(true)
  const [calendarLoading, setCalendarLoading] = useState(true)

  const setTab = useCallback(
    (tabId: TabId) => {
      router.replace(`/dashboard?tab=${tabId}`, { scroll: false })
    },
    [router]
  )

  const loadStats = useCallback(async () => {
    try {
      const r = await fetch('/api/stats')
      if (r.ok) setStats(await r.json())
    } catch { /* handled by null state */ } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadSystems = useCallback(async () => {
    try {
      const r = await fetch('/api/systems')
      if (r.ok) setSystems(await r.json())
    } catch { /* handled by empty array */ } finally {
      setSystemsLoading(false)
    }
  }, [])

  const loadCalendar = useCallback(async () => {
    try {
      const r = await fetch('/api/calendar')
      if (r.ok) setCalendar(await r.json())
    } catch { /* handled by empty array */ } finally {
      setCalendarLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in')
      return
    }
    if (status === 'authenticated') {
      loadStats()
      loadSystems()
      loadCalendar()
    }
  }, [status, router, loadStats, loadSystems, loadCalendar])

  async function handleSystemsChanged() {
    await Promise.all([loadSystems(), loadStats()])
  }

  const daysLeft = daysUntil(ENFORCEMENT_DATE)

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex items-center gap-3 p-6 border-b border-slate-800">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">
              ComplianceForge<span className="text-indigo-400">.ai</span>
            </p>
            <p className="text-slate-500 text-xs">EU AI Act Platform</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id)
                setSidebarOpen(false)
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                activeTab === id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          {user && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">
                {user.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/sign-in' })}
            className="w-full flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm transition-colors px-2 py-1.5 rounded-lg hover:bg-red-950/30"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-30 bg-[#0a0a0f]/90 border-b border-slate-800 backdrop-blur-sm px-4 py-3 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <h1 className="font-semibold text-white flex-1">
            {TABS.find((t) => t.id === activeTab)?.label}
          </h1>
          <div className="flex items-center gap-2 bg-red-950 border border-red-900 rounded-full px-3 py-1">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
            <span className="text-xs text-red-300 font-medium">{daysLeft}d to enforcement</span>
          </div>
        </header>

        <main className="p-6">
          {activeTab === 'command' && (
            <CommandCenter
              stats={stats}
              systems={systems}
              calendar={calendar}
              statsLoading={statsLoading}
              calendarLoading={calendarLoading}
            />
          )}
          {activeTab === 'inventory' && (
            <AiInventory
              systems={systems}
              systemsLoading={systemsLoading}
              session={session}
              onSystemsChanged={handleSystemsChanged}
            />
          )}
          {activeTab === 'scanner' && <GitHubScanner systems={systems} />}
          {activeTab === 'tracker' && <ComplianceTracker systems={systems} />}
          {activeTab === 'incidents' && <Incidents systems={systems} />}
          {activeTab === 'calendar' && (
            <Deadlines calendar={calendar} loading={calendarLoading} onRefresh={loadCalendar} />
          )}
          {activeTab === 'audit' && <AuditLog />}
          {activeTab === 'reports' && <Reports systems={systems} />}
          {activeTab === 'team' && <Team />}
          {activeTab === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  )
}

function DashboardFallback() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-400 flex items-center justify-center">
      <div className="flex items-center gap-3 text-sm">
        <span className="h-5 w-5 motion-safe:animate-spin rounded-full border-2 border-slate-600 border-t-indigo-500" />
        Loading dashboard…
      </div>
    </div>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardInner />
    </Suspense>
  )
}

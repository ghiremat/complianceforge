'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Shield, LayoutDashboard, Server, GitBranch, CheckSquare, Calendar, FileText, LogOut, Menu, X, Plus, ChevronDown, ChevronUp, Copy, ExternalLink, RefreshCw } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { cn, daysUntil, urgencyColor, urgencyBg, riskBadgeColor, scoreColor, scoreBarColor } from '@/lib/utils'

const ENFORCEMENT_DATE = '2026-08-02'
const TABS = [
  { id: 'command', label: 'Command Center', icon: LayoutDashboard },
  { id: 'inventory', label: 'AI Inventory', icon: Server },
  { id: 'scanner', label: 'GitHub Scanner', icon: GitBranch },
  { id: 'tracker', label: 'Compliance Tracker', icon: CheckSquare },
  { id: 'calendar', label: 'Deadlines', icon: Calendar },
  { id: 'reports', label: 'Reports', icon: FileText },
]

export default function Dashboard() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [activeTab, setActiveTab] = useState('command')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const user = session?.user ? { email: session.user.email ?? '', name: session.user.name ?? '' } : null

  // Data states
  const [stats, setStats] = useState<any>(null)
  const [systems, setSystems] = useState<any[]>([])
  const [orgs, setOrgs] = useState<any[]>([])
  const [calendar, setCalendar] = useState<any[]>([])

  // Scanner state
  const [scanUrl, setScanUrl] = useState('')
  const [scanLoading, setScanLoading] = useState(false)
  const [scanResult, setScanResult] = useState<any>(null)
  const [scanSystemId, setScanSystemId] = useState<string>('')

  // AI Inventory state
  const [showAddSystem, setShowAddSystem] = useState(false)
  const [newSystem, setNewSystem] = useState({ org_id: '', name: '', description: '', use_case: '', sector: '' })
  const [classifyingId, setClassifyingId] = useState<number | null>(null)

  // Tracker state
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null)
  const [systemDetail, setSystemDetail] = useState<any>(null)
  const [expandedItem, setExpandedItem] = useState<number | null>(null)
  const [itemUpdates, setItemUpdates] = useState<Record<number, { status: string; evidence: string }>>({})

  // Reports state
  const [reportSystemId, setReportSystemId] = useState<string>('')
  const [report, setReport] = useState<any>(null)
  const [copyMsg, setCopyMsg] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/sign-in'); return }
    if (status === 'authenticated') {
      loadStats()
      loadSystems()
      loadOrgs()
      loadCalendar()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  async function loadStats() {
    try {
      const r = await fetch('/api/stats')
      if (r.ok) setStats(await r.json())
    } catch {}
  }

  async function loadSystems() {
    try {
      const r = await fetch('/api/systems')
      if (r.ok) setSystems(await r.json())
    } catch {}
  }

  async function loadOrgs() {
    try {
      const r = await fetch('/api/organizations')
      if (r.ok) setOrgs(await r.json())
    } catch {}
  }

  async function loadCalendar() {
    try {
      const r = await fetch('/api/calendar')
      if (r.ok) setCalendar(await r.json())
    } catch {}
  }

  async function loadSystemDetail(id: string) {
    // placeholder — detail view will be built with per-system pages
    setSystemDetail(null)
  }

  async function classifySystem(id: string) {
    setClassifyingId(id as any)
    // AI classification will be wired to Gemini in the next phase
    setTimeout(() => setClassifyingId(null), 1000)
  }

  async function addSystem() {
    if (!newSystem.name) return
    try {
      const r = await fetch('/api/systems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSystem.name,
          description: newSystem.description,
          use_case: newSystem.use_case,
          sector: newSystem.sector,
        })
      })
      if (r.ok) {
        await loadSystems()
        setShowAddSystem(false)
        setNewSystem({ org_id: '', name: '', description: '', use_case: '', sector: '' })
      }
    } catch {}
  }

  async function runScan() {
    if (!scanUrl) return
    setScanLoading(true)
    setScanResult(null)
    // GitHub scanner will be wired in the next phase
    setTimeout(() => setScanLoading(false), 1000)
  }

  async function saveComplianceItem(itemId: number) {
    // Compliance item updates will be wired in the per-system pages phase
  }

  async function loadReport() {
    // Reports will be wired in the next phase
  }

  function handleLogout() {
    signOut({ callbackUrl: '/sign-in' })
  }

  function copyReportUrl() {
    const url = `${window.location.origin}/api/systems/${reportSystemId}/report`
    navigator.clipboard.writeText(url)
    setCopyMsg('Copied!')
    setTimeout(() => setCopyMsg(''), 2000)
  }

  const daysLeft = daysUntil(ENFORCEMENT_DATE)

  // Risk distribution data for chart
  const riskData = [
    { name: 'High Risk', value: systems.filter(s => s.risk_tier === 'high').length, color: '#f97316' },
    { name: 'Limited', value: systems.filter(s => s.risk_tier === 'limited').length, color: '#eab308' },
    { name: 'Minimal', value: systems.filter(s => s.risk_tier === 'minimal').length, color: '#22c55e' },
    { name: 'Unknown', value: systems.filter(s => !['high','limited','minimal','unacceptable'].includes(s.risk_tier)).length, color: '#6b7280' },
  ].filter(d => d.value > 0)

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 p-6 border-b border-slate-800">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">ComplianceForge<span className="text-indigo-400">.ai</span></p>
            <p className="text-slate-500 text-xs">EU AI Act Platform</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setSidebarOpen(false) }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                activeTab === id
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* User */}
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
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm transition-colors px-2 py-1.5 rounded-lg hover:bg-red-950/30"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-[#0a0a0f]/90 border-b border-slate-800 backdrop-blur-sm px-4 py-3 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-slate-400 hover:text-white">
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <h1 className="font-semibold text-white flex-1">
            {TABS.find(t => t.id === activeTab)?.label}
          </h1>
          <div className="flex items-center gap-2 bg-red-950 border border-red-900 rounded-full px-3 py-1">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
            <span className="text-xs text-red-300 font-medium">{daysLeft}d to enforcement</span>
          </div>
        </header>

        <main className="p-6">
          {/* TAB 1: Command Center */}
          {activeTab === 'command' && (
            <div className="space-y-6">
              {/* Hero countdown */}
              <div className="bg-gradient-to-br from-indigo-950 to-slate-900 border border-indigo-800 rounded-2xl p-8 text-center">
                <p className="text-slate-400 text-sm mb-2">EU AI Act Full Enforcement</p>
                <div className="text-7xl font-black text-white mb-1">{daysLeft}</div>
                <p className="text-indigo-400 font-semibold text-lg">days remaining</p>
                <p className="text-slate-500 text-sm mt-2">August 2, 2026 — Act now to avoid fines up to €35M</p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'AI Systems', value: stats?.total_systems ?? systems.length, color: 'text-blue-400', bg: 'bg-blue-950/30 border-blue-900' },
                  { label: 'Avg Score', value: `${stats?.avg_compliance_score ?? 0}%`, color: 'text-green-400', bg: 'bg-green-950/30 border-green-900' },
                  { label: 'High Risk', value: stats?.high_risk_systems ?? 0, color: 'text-orange-400', bg: 'bg-orange-950/30 border-orange-900' },
                  { label: 'Scans Done', value: stats?.total_scans ?? 0, color: 'text-purple-400', bg: 'bg-purple-950/30 border-purple-900' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={cn("border rounded-xl p-5", bg)}>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
                    <p className={cn("text-3xl font-bold", color)}>{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Risk distribution chart */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="font-semibold text-white mb-4">Risk Distribution</h3>
                  {riskData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={riskData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                          {riskData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
                        <Legend formatter={(value) => <span className="text-slate-300 text-xs">{value}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
                      Add AI systems to see risk distribution
                    </div>
                  )}
                </div>

                {/* Upcoming deadlines */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="font-semibold text-white mb-4">Upcoming Deadlines</h3>
                  <div className="space-y-3">
                    {calendar.slice(0, 5).map((d: any) => (
                      <div key={d.id} className={cn("rounded-xl p-3 border", urgencyBg(d.days_left))}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{d.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{d.deadline_date}</p>
                          </div>
                          <span className={cn("text-xs font-bold flex-shrink-0", urgencyColor(d.days_left))}>
                            {d.days_left > 0 ? `${d.days_left}d` : 'Due'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {calendar.length === 0 && (
                      <p className="text-slate-500 text-sm text-center py-4">Loading deadlines...</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI Inventory */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-sm">{systems.length} AI systems registered</p>
                <button
                  onClick={() => setShowAddSystem(!showAddSystem)}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add System
                </button>
              </div>

              {/* Add System Modal */}
              {showAddSystem && (
                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
                  <h3 className="font-semibold text-white mb-4">Register New AI System</h3>
                  {session?.user?.organizationName && (
                    <p className="text-sm text-slate-400 mb-4">
                      Adding to <span className="text-indigo-400 font-medium">{session.user.organizationName}</span>
                    </p>
                  )}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">System Name *</label>
                      <input
                        value={newSystem.name}
                        onChange={e => setNewSystem(s => ({ ...s, name: e.target.value }))}
                        placeholder="e.g. Customer Churn Predictor"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Sector</label>
                      <input
                        value={newSystem.sector}
                        onChange={e => setNewSystem(s => ({ ...s, sector: e.target.value }))}
                        placeholder="e.g. Healthcare, Finance"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Use Case</label>
                      <input
                        value={newSystem.use_case}
                        onChange={e => setNewSystem(s => ({ ...s, use_case: e.target.value }))}
                        placeholder="e.g. Automate hiring screening"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-slate-400 mb-1">Description</label>
                      <textarea
                        value={newSystem.description}
                        onChange={e => setNewSystem(s => ({ ...s, description: e.target.value }))}
                        placeholder="Describe what this AI system does..."
                        rows={2}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={addSystem} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">Register System</button>
                    <button onClick={() => setShowAddSystem(false)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">Cancel</button>
                  </div>
                </div>
              )}

              {/* Systems table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">System</th>
                        <th className="text-left p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Sector</th>
                        <th className="text-left p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Risk Tier</th>
                        <th className="text-left p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider w-48">Compliance</th>
                        <th className="text-left p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {systems.map((sys: any) => (
                        <tr key={sys.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                          <td className="p-4">
                            <p className="font-medium text-white text-sm">{sys.name}</p>
                            <p className="text-slate-500 text-xs">{sys.org_name}</p>
                          </td>
                          <td className="p-4 text-slate-300 text-sm">{sys.sector || '—'}</td>
                          <td className="p-4">
                            <span className={cn("px-2 py-1 rounded-full text-xs font-semibold capitalize", riskBadgeColor(sys.risk_tier))}>
                              {sys.risk_tier || 'unknown'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-800 rounded-full h-2">
                                <div
                                  className={cn("h-2 rounded-full transition-all", scoreBarColor(sys.compliance_score))}
                                  style={{ width: `${sys.compliance_score}%` }}
                                />
                              </div>
                              <span className={cn("text-xs font-semibold w-8", scoreColor(sys.compliance_score))}>
                                {sys.compliance_score}%
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => classifySystem(sys.id)}
                              disabled={classifyingId === sys.id}
                              className="flex items-center gap-1 text-xs bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-700/50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {classifyingId === sys.id ? (
                                <><span className="w-3 h-3 border border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" /> Classifying...</>
                              ) : (
                                <><RefreshCw className="w-3 h-3" /> Classify AI</>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {systems.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500">No AI systems registered yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GitHub Scanner */}
          {activeTab === 'scanner' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <GitBranch className="w-6 h-6 text-white" />
                  <h2 className="text-lg font-semibold text-white">GitHub Repository Scanner</h2>
                </div>
                <p className="text-slate-400 text-sm mb-6">Scan any public GitHub repository for EU AI Act compliance gaps. Detects AI frameworks and analyzes against Articles 9-14.</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">GitHub Repository URL</label>
                    <input
                      value={scanUrl}
                      onChange={e => setScanUrl(e.target.value)}
                      placeholder="https://github.com/owner/repo"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Link to AI System (optional)</label>
                    <select
                      value={scanSystemId}
                      onChange={e => setScanSystemId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Save scan to system...</option>
                      {systems.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <button
                    onClick={runScan}
                    disabled={scanLoading || !scanUrl}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-medium text-sm transition-colors"
                  >
                    {scanLoading ? (
                      <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Scanning...</>
                    ) : (
                      <><GitBranch className="w-4 h-4" /> Scan for Compliance</>
                    )}
                  </button>
                </div>
              </div>

              {/* Scan results */}
              {scanResult && (
                <div className="space-y-4">
                  {/* Overall score */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-white">Scan Results</h3>
                      <a href={scanResult.repo_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-400 text-sm hover:text-indigo-300">
                        <ExternalLink className="w-3 h-3" /> View Repo
                      </a>
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                      <div className={cn("text-5xl font-black", scoreColor(scanResult.overall_score))}>
                        {scanResult.overall_score}
                      </div>
                      <div>
                        <p className="text-white font-medium">Overall Compliance Score</p>
                        <p className="text-slate-400 text-sm">
                          {scanResult.ai_frameworks?.length > 0
                            ? `AI frameworks: ${scanResult.ai_frameworks.join(', ')}`
                            : 'No AI frameworks detected'}
                        </p>
                      </div>
                    </div>

                    {/* Per-article breakdown */}
                    <div className="space-y-3">
                      {scanResult.article_findings?.map((f: any) => (
                        <div key={f.article} className="bg-slate-800 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300 font-mono">{f.article}</span>
                              <span className="text-sm font-medium text-white">{f.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-slate-700 rounded-full h-1.5">
                                <div className={cn("h-1.5 rounded-full", scoreBarColor(f.score))} style={{ width: `${f.score}%` }} />
                              </div>
                              <span className={cn("text-xs font-bold w-8 text-right", scoreColor(f.score))}>{f.score}%</span>
                            </div>
                          </div>
                          <p className="text-slate-400 text-xs">{f.finding}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Priority fixes */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="font-semibold text-white mb-4">Priority Fixes</h3>
                    <ol className="space-y-2">
                      {scanResult.priority_fixes?.map((fix: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                          <span className="flex-shrink-0 w-6 h-6 bg-red-900 text-red-300 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                          {fix}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Compliance Tracker */}
          {activeTab === 'tracker' && (
            <div className="space-y-6">
              {/* System selector */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-slate-400 mb-1.5">Select AI System to Track</label>
                    <select
                      value={selectedSystemId ?? ''}
                      onChange={e => {
                        const id = e.target.value || null
                        setSelectedSystemId(id as any)
                        if (id) loadSystemDetail(id)
                        setExpandedItem(null)
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Choose a system...</option>
                      {systems.map((s: any) => <option key={s.id} value={s.id}>{s.name} — {s.org_name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {systemDetail && (
                <>
                  {/* Progress bar */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-white">{systemDetail.name}</span>
                      <span className={cn("text-xl font-black", scoreColor(systemDetail.compliance_score))}>
                        {systemDetail.compliance_score}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3">
                      <div
                        className={cn("h-3 rounded-full transition-all duration-500", scoreBarColor(systemDetail.compliance_score))}
                        style={{ width: `${systemDetail.compliance_score}%` }}
                      />
                    </div>
                    <div className="flex gap-4 mt-3 text-xs text-slate-500">
                      <span>{systemDetail.compliance_items?.filter((i: any) => i.status === 'compliant').length} compliant</span>
                      <span>{systemDetail.compliance_items?.filter((i: any) => i.status === 'in_progress').length} in progress</span>
                      <span>{systemDetail.compliance_items?.filter((i: any) => i.status === 'non_compliant').length} non-compliant</span>
                    </div>
                  </div>

                  {/* Compliance items accordion */}
                  <div className="space-y-2">
                    {systemDetail.compliance_items?.map((item: any) => (
                      <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <button
                          className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-800/50 transition-colors"
                          onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                        >
                          <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded flex-shrink-0">{item.article}</span>
                          <span className="flex-1 text-sm font-medium text-white">{item.article_title}</span>
                          <span className={cn("text-xs px-2 py-1 rounded-full flex-shrink-0", {
                            'bg-green-900 text-green-300': item.status === 'compliant',
                            'bg-red-900 text-red-300': item.status === 'non_compliant',
                            'bg-yellow-900 text-yellow-300': item.status === 'in_progress',
                            'bg-gray-800 text-gray-400': item.status === 'not_applicable',
                          }[item.status as string] || 'bg-gray-800 text-gray-400')}>
                            {item.status?.replace('_', ' ')}
                          </span>
                          {expandedItem === item.id ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                        </button>

                        {expandedItem === item.id && (
                          <div className="border-t border-slate-800 p-4 space-y-3">
                            <p className="text-slate-400 text-sm">{item.requirement}</p>
                            <div className="grid md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-slate-400 mb-1">Status</label>
                                <select
                                  value={itemUpdates[item.id]?.status ?? item.status}
                                  onChange={e => setItemUpdates(u => ({ ...u, [item.id]: { ...u[item.id], status: e.target.value } }))}
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
                                  defaultValue={item.due_date}
                                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Evidence / Notes</label>
                              <textarea
                                value={itemUpdates[item.id]?.evidence ?? item.evidence ?? ''}
                                onChange={e => setItemUpdates(u => ({ ...u, [item.id]: { ...u[item.id], evidence: e.target.value } }))}
                                placeholder="Add evidence, documentation links, or notes..."
                                rows={2}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
                              />
                            </div>
                            <button
                              onClick={() => saveComplianceItem(item.id)}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                              Save
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
          )}

          {/* TAB 5: Deadlines Calendar */}
          {activeTab === 'calendar' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-sm">{calendar.length} compliance deadlines tracked</p>
              </div>

              {/* Timeline */}
              <div className="space-y-3">
                {calendar.map((d: any) => (
                  <div key={d.id} className={cn("border rounded-2xl p-5", urgencyBg(d.days_left))}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full uppercase", {
                            'bg-red-800 text-red-200': d.priority === 'high',
                            'bg-amber-800 text-amber-200': d.priority === 'medium',
                            'bg-green-800 text-green-200': d.priority === 'low',
                          }[d.priority as string] || 'bg-gray-700 text-gray-300')}>
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
                        <div className={cn("text-3xl font-black", urgencyColor(d.days_left))}>
                          {d.days_left > 0 ? d.days_left : '—'}
                        </div>
                        <div className={cn("text-xs", urgencyColor(d.days_left))}>
                          {d.days_left > 0 ? 'days left' : d.days_left === 0 ? 'TODAY' : 'passed'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: Reports */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-6 h-6 text-white" />
                  <h2 className="text-lg font-semibold text-white">Compliance Reports</h2>
                </div>
                <p className="text-slate-400 text-sm mb-6">Generate shareable compliance reports for any AI system. Share the public URL with stakeholders, auditors, or regulators.</p>

                <div className="flex gap-3">
                  <select
                    value={reportSystemId}
                    onChange={e => setReportSystemId(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select AI system...</option>
                    {systems.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button
                    onClick={loadReport}
                    disabled={!reportSystemId}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-medium text-sm transition-colors"
                  >
                    Generate Report
                  </button>
                </div>

                {reportSystemId && (
                  <div className="mt-4 flex items-center gap-2 bg-slate-800 rounded-xl p-3">
                    <p className="flex-1 text-xs text-slate-400 font-mono truncate">
                      /api/systems/{reportSystemId}/report
                    </p>
                    <button
                      onClick={copyReportUrl}
                      className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex-shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copyMsg || 'Copy URL'}
                    </button>
                    <a
                      href={`/api/systems/${reportSystemId}/report`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors flex-shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* Report preview */}
              {report && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  {/* Report header */}
                  <div className="bg-gradient-to-r from-indigo-950 to-slate-900 p-6 border-b border-slate-800">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-5 h-5 text-indigo-400" />
                          <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">EU AI Act Compliance Report</span>
                        </div>
                        <h3 className="text-xl font-bold text-white">{report.system?.name}</h3>
                        <p className="text-slate-400 text-sm">{report.system?.org_name} · {report.system?.country}</p>
                      </div>
                      <div className="text-right">
                        <div className={cn("text-4xl font-black", scoreColor(report.summary?.score))}>
                          {report.summary?.score}%
                        </div>
                        <span className={cn("text-xs px-2 py-1 rounded-full capitalize", riskBadgeColor(report.system?.risk_tier))}>
                          {report.system?.risk_tier || 'unknown'} risk
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-3">
                      Generated: {new Date(report.summary?.generated_at).toLocaleString()}
                    </p>
                  </div>

                  {/* Summary stats */}
                  <div className="grid grid-cols-3 divide-x divide-slate-800 border-b border-slate-800">
                    {[
                      { label: 'Compliant', value: report.summary?.compliant, color: 'text-green-400' },
                      { label: 'Total Items', value: report.summary?.total_items, color: 'text-white' },
                      { label: 'Score', value: `${report.summary?.score}%`, color: scoreColor(report.summary?.score) },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="p-4 text-center">
                        <p className={cn("text-2xl font-bold", color)}>{value}</p>
                        <p className="text-slate-500 text-xs">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Compliance items list */}
                  <div className="p-4">
                    <h4 className="text-sm font-semibold text-slate-300 mb-3">Compliance Checklist</h4>
                    <div className="space-y-1.5">
                      {report.compliance_items?.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-3 py-1.5 border-b border-slate-800/50">
                          <span className={cn("w-2 h-2 rounded-full flex-shrink-0", {
                            'bg-green-500': item.status === 'compliant',
                            'bg-red-500': item.status === 'non_compliant',
                            'bg-yellow-500': item.status === 'in_progress',
                            'bg-gray-500': item.status === 'not_applicable',
                          }[item.status as string] || 'bg-gray-500')} />
                          <span className="text-xs font-mono text-slate-500 w-20 flex-shrink-0">{item.article}</span>
                          <span className="text-sm text-slate-300 flex-1 truncate">{item.article_title}</span>
                          <span className="text-xs text-slate-500 capitalize">{item.status?.replace('_', ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

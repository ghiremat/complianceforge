export interface SystemData {
  id: string
  name: string
  description: string | null
  sector: string
  use_case: string
  risk_tier: string
  compliance_score: number
  compliance_status: string
  org_name: string
  source_repo: string | null
  created_at: string
}

export interface StatsData {
  total_systems: number
  avg_compliance_score: number
  high_risk_systems: number
  total_scans: number
  open_incidents: number
}

export interface CalendarItem {
  id: string
  title: string
  description: string | null
  deadline_date: string
  days_left: number
  priority: string
  status: string
}

export interface ScanResultData {
  id: string
  repository: string
  totalFindings: number
  reviewRequired: number
  analysis: {
    overallScore: number
    aiFrameworks: string[]
    articleFindings: Array<{ article: string; title: string; score: number; finding: string }>
    priorityFixes: string[]
  }
}

/** Built client-side for Compliance Tracker when only session `/api/systems` is available */
export interface ComplianceItemRow {
  id: string
  article: string
  article_title: string
  status: string
  requirement?: string
  due_date?: string
  evidence?: string | null
}

export interface SystemDetailView extends SystemData {
  compliance_items: ComplianceItemRow[]
}

/** Report preview built from systems list + optional refresh fetch */
export interface DashboardReportView {
  system: {
    name: string
    org_name: string
    risk_tier: string
    country: string
  }
  summary: {
    score: number
    compliant: number | string
    total_items: number | string
    generated_at: string
  }
  compliance_items: Array<{
    id: string
    article: string
    article_title: string
    status: string
  }>
}

export interface OrganizationData {
  id: string
  name: string
  slug: string
  plan: string
}

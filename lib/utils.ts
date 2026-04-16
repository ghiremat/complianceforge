import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://intelliforge-complianceforge-api.fly.dev'

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = target.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function urgencyColor(daysLeft: number): string {
  if (daysLeft < 0) return 'text-muted-foreground'
  if (daysLeft < 30) return 'text-red-400'
  if (daysLeft < 90) return 'text-amber-400'
  return 'text-green-400'
}

export function urgencyBg(daysLeft: number): string {
  if (daysLeft < 0) return 'bg-muted border-border'
  if (daysLeft < 30) return 'bg-red-950 border-red-800'
  if (daysLeft < 90) return 'bg-amber-950 border-amber-800'
  return 'bg-green-950 border-green-800'
}

export function riskBadgeColor(tier: string): string {
  const t = tier?.toLowerCase()
  if (t === 'unacceptable') return 'bg-red-900 text-red-300 border border-red-700'
  if (t === 'high') return 'bg-orange-900 text-orange-300 border border-orange-700'
  if (t === 'limited') return 'bg-yellow-900 text-yellow-300 border border-yellow-700'
  if (t === 'minimal') return 'bg-green-900 text-green-300 border border-green-700'
  return 'bg-muted text-muted-foreground border border-border'
}

export function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-400'
  if (score >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

export function scoreBarColor(score: number): string {
  if (score >= 80) return 'bg-green-500'
  if (score >= 50) return 'bg-yellow-500'
  return 'bg-red-500'
}

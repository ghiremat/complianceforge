'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Building2, Key, Plus, Trash2, Copy, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/src/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog'
import { Input } from '@/src/components/ui/input'
import { Label } from '@/src/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table'

type ApiKeyRow = {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt: string | null
  createdAt: string
}

type CreateKeyResponse = {
  id: string
  name: string
  key: string
}

type OrgSettingsResponse = {
  id: string
  name: string
  slug: string | null
  plan: string
  maxSystems: number
  _count: { aiSystems: number; users: number }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function Settings() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'

  const [org, setOrg] = useState<OrgSettingsResponse | null>(null)
  const [orgLoading, setOrgLoading] = useState(true)
  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [orgSaving, setOrgSaving] = useState(false)

  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [showFullKey, setShowFullKey] = useState(true)
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyRow | null>(null)
  const [revoking, setRevoking] = useState(false)

  const loadOrg = useCallback(async () => {
    setOrgLoading(true)
    try {
      const r = await fetch('/api/organizations/settings')
      if (!r.ok) {
        const err = (await r.json()) as { error?: string }
        throw new Error(err.error ?? 'Failed to load organization')
      }
      const data = (await r.json()) as OrgSettingsResponse
      setOrg(data)
      setOrgName(data.name)
      setOrgSlug(data.slug ?? '')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load organization')
      setOrg(null)
    } finally {
      setOrgLoading(false)
    }
  }, [])

  const loadKeys = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/api-keys')
      if (!r.ok) {
        const err = (await r.json()) as { error?: string }
        throw new Error(err.error ?? 'Failed to load API keys')
      }
      const data = (await r.json()) as ApiKeyRow[]
      setKeys(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load API keys')
      setKeys([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadOrg()
  }, [loadOrg])

  useEffect(() => {
    void loadKeys()
  }, [loadKeys])

  async function handleSaveOrg() {
    if (!isAdmin) {
      toast.error('Admin access required')
      return
    }
    setOrgSaving(true)
    try {
      const r = await fetch('/api/organizations/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName.trim() || undefined,
          slug: orgSlug.trim() || undefined,
        }),
      })
      const data = (await r.json()) as { id?: string; name?: string; slug?: string | null; error?: string }
      if (!r.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Save failed')
      }
      toast.success('Organization updated')
      await loadOrg()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setOrgSaving(false)
    }
  }

  async function handleCreate() {
    if (!isAdmin) {
      toast.error('Admin access required')
      return
    }
    setCreating(true)
    try {
      const r = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName || undefined }),
      })
      const data = (await r.json()) as CreateKeyResponse | { error?: string }
      if (!r.ok) {
        const msg = 'error' in data && typeof data.error === 'string' ? data.error : 'Create failed'
        throw new Error(msg)
      }
      if (!('key' in data) || typeof data.key !== 'string') throw new Error('Invalid response')
      setNewlyCreatedKey(data.key)
      setShowFullKey(true)
      setCreateOpen(false)
      setNewKeyName('')
      toast.success('API key created')
      await loadKeys()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create key')
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return
    if (!isAdmin) {
      toast.error('Admin access required')
      return
    }
    setRevoking(true)
    try {
      const r = await fetch(`/api/api-keys?id=${encodeURIComponent(revokeTarget.id)}`, {
        method: 'DELETE',
      })
      if (!r.ok) {
        const err = (await r.json()) as { error?: string }
        throw new Error(err.error ?? 'Revoke failed')
      }
      toast.success('API key revoked')
      setRevokeTarget(null)
      await loadKeys()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to revoke key')
    } finally {
      setRevoking(false)
    }
  }

  async function copyKey(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Could not copy')
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-xl font-semibold text-white tracking-tight">Settings</h2>
        <p className="text-sm text-slate-500 mt-1">
          Organization profile and API keys for the public REST API.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/20">
            <Building2 className="h-5 w-5 text-emerald-400" aria-hidden />
          </div>
          <h2 className="text-lg font-semibold text-white tracking-tight">Organization</h2>
        </div>
        {orgLoading ? (
          <p className="text-sm text-slate-500">Loading organization…</p>
        ) : org ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="org-name" className="text-slate-300">
                  Organization name
                </Label>
                <Input
                  id="org-name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={!isAdmin}
                  className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug" className="text-slate-300">
                  Organization slug
                </Label>
                <Input
                  id="org-slug"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  disabled={!isAdmin}
                  placeholder="acme-corp"
                  className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600"
                />
                <p className="text-xs text-slate-500">
                  lowercase, hyphens, min 3 chars after normalization
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1 text-xs font-medium capitalize text-slate-200">
                  Plan: {org.plan}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1 text-xs font-medium text-slate-200">
                  Systems: {org._count.aiSystems} / {org.maxSystems}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1 text-xs font-medium text-slate-200">
                  Team: {org._count.users}{' '}
                  {org._count.users === 1 ? 'member' : 'members'}
                </span>
              </div>
              <Button
                type="button"
                disabled={!isAdmin || orgSaving}
                className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
                onClick={() => void handleSaveOrg()}
              >
                {orgSaving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
            {!isAdmin ? (
              <p className="text-xs text-slate-500">Only admins can change organization details.</p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-slate-500">Could not load organization.</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-white tracking-tight mb-6">API Keys</h2>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">API Keys</h3>
              <p className="text-xs text-slate-500">Use with <code className="text-indigo-300">Authorization: Bearer …</code></p>
            </div>
          </div>
          <Button
            type="button"
            disabled={!isAdmin}
            onClick={() => {
              setNewlyCreatedKey(null)
              setCreateOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Create API Key
          </Button>
        </div>
        {!isAdmin ? (
          <p className="mb-4 text-xs text-slate-500">Creating and revoking API keys requires admin access.</p>
        ) : null}

        {newlyCreatedKey && (
          <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-950/30 p-4 space-y-3">
            <p className="text-sm text-amber-200/90 font-medium">New API key</p>
            <p className="text-xs text-amber-200/70">
              This key will only be shown once. Store it securely.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <code
                className={cn(
                  'flex-1 rounded-lg bg-black/40 px-3 py-2 text-sm font-mono break-all border border-slate-700',
                  showFullKey ? 'text-slate-200 select-all' : 'text-slate-500 tracking-widest select-none',
                )}
              >
                {showFullKey ? newlyCreatedKey : '•'.repeat(48)}
              </code>
              <div className="flex gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
                  onClick={() => setShowFullKey((v) => !v)}
                  aria-label={showFullKey ? 'Hide key' : 'Show key'}
                >
                  {showFullKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
                  onClick={() => void copyKey(newlyCreatedKey)}
                  aria-label="Copy key"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white"
              onClick={() => setNewlyCreatedKey(null)}
            >
              Dismiss
            </Button>
          </div>
        )}

        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400">Name</TableHead>
                <TableHead className="text-slate-400">Prefix</TableHead>
                <TableHead className="text-slate-400">Last used</TableHead>
                <TableHead className="text-slate-400">Created</TableHead>
                <TableHead className="text-slate-400 w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="border-slate-800 hover:bg-slate-900/50">
                  <TableCell colSpan={5} className="text-slate-500 text-center py-8">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : keys.length === 0 ? (
                <TableRow className="border-slate-800 hover:bg-slate-900/50">
                  <TableCell colSpan={5} className="text-slate-500 text-center py-8">
                    No API keys yet. Create one to use the REST API.
                  </TableCell>
                </TableRow>
              ) : (
                keys.map((k) => (
                  <TableRow key={k.id} className="border-slate-800 hover:bg-slate-800/40">
                    <TableCell className="text-white font-medium">{k.name}</TableCell>
                    <TableCell>
                      <code className="text-xs text-indigo-300 bg-indigo-950/50 px-2 py-1 rounded">
                        {k.keyPrefix}…
                      </code>
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">{formatDate(k.lastUsedAt)}</TableCell>
                    <TableCell className="text-slate-400 text-sm">{formatDate(k.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!isAdmin}
                        className="text-red-400 hover:text-red-300 hover:bg-red-950/40 gap-1 disabled:opacity-40"
                        onClick={() => setRevokeTarget(k)}
                      >
                        <Trash2 className="w-4 h-4" />
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Create API Key</DialogTitle>
            <DialogDescription className="text-slate-400">
              Give this key a label so you can recognize it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="api-key-name" className="text-slate-300">
              Name
            </Label>
            <Input
              id="api-key-name"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. CI / Production"
              className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              className="text-slate-400"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={creating}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
              onClick={() => void handleCreate()}
            >
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Revoke API key?</DialogTitle>
            <DialogDescription className="text-slate-400">
              {revokeTarget
                ? `“${revokeTarget.name}” (${revokeTarget.keyPrefix}…) will stop working immediately. This cannot be undone.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" className="text-slate-400" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={revoking}
              className="bg-red-600 hover:bg-red-500 text-white"
              onClick={() => void handleRevoke()}
            >
              {revoking ? 'Revoking…' : 'Revoke key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

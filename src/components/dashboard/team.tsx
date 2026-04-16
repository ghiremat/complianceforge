'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Copy, Mail, UserMinus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'
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
import { Skeleton } from '@/src/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table'

type TeamMember = {
  id: string
  name: string | null
  email: string
  role: string
  createdAt: string
}

type TeamInvitation = {
  id: string
  email: string
  role: string
  createdAt: string
  expiresAt: string
  token?: string
}

const DASH_ROLES = ['admin', 'member', 'viewer'] as const

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function inviteUrl(token: string): string {
  if (typeof window === 'undefined') return `/sign-up?invite=${token}`
  return `${window.location.origin}/sign-up?invite=${token}`
}

function roleBadgeClass(role: string): string {
  switch (role) {
    case 'admin':
      return 'bg-indigo-950 text-indigo-200 border-indigo-800'
    case 'viewer':
      return 'bg-slate-800 text-slate-300 border-slate-700'
    default:
      return 'bg-slate-800 text-slate-200 border-slate-700'
  }
}

export function Team() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'
  const currentUserId = session?.user?.id

  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [loading, setLoading] = useState(true)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<string>('member')
  const [inviting, setInviting] = useState(false)

  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null)
  const [removing, setRemoving] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<TeamInvitation | null>(null)
  const [revoking, setRevoking] = useState(false)

  const loadTeam = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/team')
      if (!r.ok) {
        const err = (await r.json()) as { error?: string }
        throw new Error(err.error ?? 'Failed to load team')
      }
      const data = (await r.json()) as { members: TeamMember[]; invitations: TeamInvitation[] }
      setMembers(data.members)
      setInvitations(data.invitations)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load team')
      setMembers([])
      setInvitations([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTeam()
  }, [loadTeam])

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault()
    const email = inviteEmail.trim().toLowerCase()
    if (!email) {
      toast.error('Email is required')
      return
    }
    setInviting(true)
    try {
      const r = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: inviteRole }),
      })
      const data = (await r.json()) as { error?: string; token?: string }
      if (!r.ok) {
        throw new Error(data.error ?? 'Invite failed')
      }
      toast.success('Invitation created')
      if (data.token) {
        const url = inviteUrl(data.token)
        await navigator.clipboard.writeText(url)
        toast.info('Invite link copied to clipboard')
      }
      setInviteEmail('')
      setInviteRole('member')
      setInviteOpen(false)
      await loadTeam()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Invite failed')
    } finally {
      setInviting(false)
    }
  }

  async function updateRole(userId: string, role: string) {
    try {
      const r = await fetch(`/api/team/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const data = (await r.json()) as { error?: string }
      if (!r.ok) throw new Error(data.error ?? 'Update failed')
      toast.success('Role updated')
      await loadTeam()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed')
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return
    setRemoving(true)
    try {
      const r = await fetch(`/api/team/${removeTarget.id}`, { method: 'DELETE' })
      const data = (await r.json()) as { error?: string }
      if (!r.ok) throw new Error(data.error ?? 'Remove failed')
      toast.success('Member removed from organization')
      setRemoveTarget(null)
      await loadTeam()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Remove failed')
    } finally {
      setRemoving(false)
    }
  }

  async function confirmRevoke() {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      const r = await fetch(`/api/team/${revokeTarget.id}`, { method: 'DELETE' })
      const data = (await r.json()) as { error?: string }
      if (!r.ok) throw new Error(data.error ?? 'Revoke failed')
      toast.success('Invitation revoked')
      setRevokeTarget(null)
      await loadTeam()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Revoke failed')
    } finally {
      setRevoking(false)
    }
  }

  function copyInviteLink(token: string) {
    void navigator.clipboard.writeText(inviteUrl(token)).then(
      () => toast.success('Invite link copied'),
      () => toast.error('Could not copy link')
    )
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-white font-semibold text-lg">
            <Users className="w-5 h-5 text-indigo-400" />
            Team
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {isAdmin
              ? 'Invite colleagues, manage roles, and revoke access.'
              : 'Members and pending invitations in your organization.'}
          </p>
        </div>
        {isAdmin && (
          <Button
            type="button"
            onClick={() => setInviteOpen((o) => !o)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
          >
            <Mail className="w-4 h-4 mr-2" />
            {inviteOpen ? 'Cancel' : 'Invite Member'}
          </Button>
        )}
      </div>

      {isAdmin && inviteOpen && (
        <form
          onSubmit={submitInvite}
          className="border border-slate-800 rounded-2xl p-5 bg-slate-900/50 space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email" className="text-slate-300">
                Email
              </Label>
              <Input
                id="invite-email"
                type="email"
                autoComplete="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  {DASH_ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="focus:bg-slate-800">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Invites use link-based onboarding. Share the copied link with your teammate (email delivery is not wired
            yet).
          </p>
          <Button type="submit" disabled={inviting} className="bg-indigo-600 hover:bg-indigo-500">
            {inviting ? 'Sending…' : 'Create invitation'}
          </Button>
        </form>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-300 uppercase tracking-wide">Members</h2>
        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/30">
          {loading ? (
            <div className="p-5 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 flex-1 bg-slate-800" />
                  <Skeleton className="h-10 w-24 bg-slate-800" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Name</TableHead>
                  <TableHead className="text-slate-400">Email</TableHead>
                  <TableHead className="text-slate-400">Role</TableHead>
                  <TableHead className="text-slate-400">Joined</TableHead>
                  {isAdmin && <TableHead className="text-slate-400 w-[140px] text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id} className="border-slate-800">
                    <TableCell className="text-white font-medium">{m.name || '—'}</TableCell>
                    <TableCell className="text-slate-300">{m.email}</TableCell>
                    <TableCell>
                      {isAdmin && m.id !== currentUserId ? (
                        <Select value={m.role} onValueChange={(role) => void updateRole(m.id, role)}>
                          <SelectTrigger
                            className={cn(
                              'h-8 w-[120px] border-slate-700 bg-slate-950 text-white text-xs',
                              roleBadgeClass(m.role)
                            )}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            {DASH_ROLES.map((r) => (
                              <SelectItem key={r} value={r} className="focus:bg-slate-800 text-sm">
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className={cn('capitalize border', roleBadgeClass(m.role))}>
                          {m.role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">{formatDate(m.createdAt)}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        {m.id !== currentUserId ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-950/40"
                            onClick={() => setRemoveTarget(m)}
                          >
                            <UserMinus className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        ) : (
                          <span className="text-slate-600 text-xs">You</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!loading && members.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-8">No members found</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-300 uppercase tracking-wide">Pending invitations</h2>
        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/30">
          {loading ? (
            <div className="p-5 space-y-3">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-12 w-full bg-slate-800" />
              ))}
            </div>
          ) : invitations.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No pending invitations</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Email</TableHead>
                  <TableHead className="text-slate-400">Role</TableHead>
                  <TableHead className="text-slate-400">Expires</TableHead>
                  {isAdmin && <TableHead className="text-slate-400 text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id} className="border-slate-800">
                    <TableCell className="text-white">{inv.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('capitalize border', roleBadgeClass(inv.role))}>
                        {inv.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">{formatDate(inv.expiresAt)}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right space-x-2">
                        {inv.token && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-slate-700 text-slate-200 hover:bg-slate-800"
                            onClick={() => copyInviteLink(inv.token!)}
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Copy link
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => setRevokeTarget(inv)}
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      <Dialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Remove member</DialogTitle>
            <DialogDescription className="text-slate-400">
              {removeTarget
                ? `${removeTarget.email} will lose access to this organization. They can no longer sign in until invited again.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" className="text-slate-300" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-500"
              disabled={removing}
              onClick={() => void confirmRemove()}
            >
              {removing ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Revoke invitation</DialogTitle>
            <DialogDescription className="text-slate-400">
              {revokeTarget ? `The invite sent to ${revokeTarget.email} will no longer work.` : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" className="text-slate-300" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-500"
              disabled={revoking}
              onClick={() => void confirmRevoke()}
            >
              {revoking ? 'Revoking…' : 'Revoke'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

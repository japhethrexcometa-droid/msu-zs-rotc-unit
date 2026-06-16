import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { useArchivedUsers, useReactivateUser } from '@/hooks/queries/useUsers'
import { useState } from 'react'
import { toast } from 'sonner'
import { RotateCcw } from 'lucide-react'
import { format } from 'date-fns'

export default function ArchivesPage() {
  const session = useSession()
  const { data: archivedUsers, isLoading } = useArchivedUsers()
  const reactivateMutation = useReactivateUser()

  const [roleFilter, setRoleFilter] = useState<string>('All')
  const [restoreId, setRestoreId] = useState<string | null>(null)

  if (!session) return null

  const filtered = (archivedUsers ?? []).filter(u =>
    roleFilter === 'All' || u.role === roleFilter.toLowerCase()
  )

  const handleRestore = async () => {
    if (!restoreId) return
    try {
      await reactivateMutation.mutateAsync(restoreId)
      toast.success('User reactivated')
      setRestoreId(null)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <AppLayout title="Archives">
      <Card>
        <CardHeader title="Deactivated Users">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 bg-rotc-bg border border-rotc-border rounded-lg text-sm text-rotc-text focus:outline-none focus:border-rotc-accent"
          >
            <option value="All">All Roles</option>
            <option value="Cadet">Cadets</option>
            <option value="Officer">Officers</option>
          </select>
        </CardHeader>
        <CardContent className="p-0">
          <Table
            headers={['Name', 'ID Number', 'Role', 'Platoon', 'Deactivated', 'Actions']}
            isLoading={isLoading}
            data={filtered}
            keyExtractor={(u) => u.id}
            renderRow={(u) => (
              <>
                <td className="p-4 text-sm font-medium text-rotc-text">{u.full_name}</td>
                <td className="p-4 text-sm text-rotc-textMuted">{u.id_number}</td>
                <td className="p-4">
                  <Badge status="default" label={u.role} />
                </td>
                <td className="p-4 text-sm text-rotc-textMuted">{u.platoon || '—'}</td>
                <td className="p-4 text-sm text-rotc-textMuted">
                  {u.updated_at ? format(new Date(u.updated_at), 'MMM d, yyyy') : '—'}
                </td>
                <td className="p-4">
                  <button
                    onClick={() => setRestoreId(u.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rotc-accent hover:bg-rotc-accent/10 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Restore
                  </button>
                </td>
              </>
            )}
          />
        </CardContent>
      </Card>

      <Modal isOpen={!!restoreId} onClose={() => setRestoreId(null)} title="Confirm Restore">
        <p className="text-sm text-rotc-text mt-4">Are you sure you want to reactivate this user? They will regain access to the system.</p>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={() => setRestoreId(null)}>Cancel</Button>
          <Button onClick={handleRestore} isLoading={reactivateMutation.isPending}>Restore User</Button>
        </div>
      </Modal>
    </AppLayout>
  )
}

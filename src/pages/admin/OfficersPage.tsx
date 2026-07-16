import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { useAllOfficers, useUpdateUser, useHardDeleteUsers, useResetUserPassword } from '@/hooks/queries/useUsers'
import { useState } from 'react'
import { Search, Edit, Trash2, Key, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import type { Database } from '@/lib/database.types'

type User = Database['public']['Tables']['users']['Row']

export default function OfficersPage() {
  const session = useSession()
  const [search, setSearch] = useState('')
  const [platoonFilter, setPlatoonFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const { data: result, isLoading, isFetching } = useAllOfficers(page, pageSize, search)
  const officers = result?.data ?? []
  const totalCount = result?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const updateMutation = useUpdateUser()
  const hardDeleteMutation = useHardDeleteUsers()

  const [editUser, setEditUser] = useState<User | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)

  const resetMutation = useResetUserPassword()

  if (!session) return null

  const platoons = ['All', 'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'HQ']

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editUser) return
    const formData = new FormData(e.currentTarget)
    try {
      await updateMutation.mutateAsync({
        id: editUser.id,
        updates: {
          full_name: formData.get('full_name') as string,
          platoon: formData.get('platoon') as string,
          designation: formData.get('designation') as string,
          photo_url: formData.get('photo_url') as string,
        }
      })
      toast.success('Officer updated successfully')
      setEditUser(null)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleHardDelete = async () => {
    if (!deleteId) return
    try {
      const result = await hardDeleteMutation.mutateAsync([deleteId])
      toast.success(result.message || 'Officer permanently deleted')
      setDeleteId(null)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    try {
      const result = await hardDeleteMutation.mutateAsync(selectedIds)
      toast.success(result.message || `${selectedIds.length} officer(s) permanently deleted`)
      setSelectedIds([])
      setIsBulkDeleteModalOpen(false)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!resetPasswordUser || !newPassword) return
    try {
      await resetMutation.mutateAsync({ id: resetPasswordUser.id, newPassword })
      toast.success('Password reset successfully')
      setResetPasswordUser(null)
      setNewPassword('')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === officers.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(officers.map(o => o.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  return (
    <AppLayout title="Officers Management">
      <Card>
        <CardHeader title="All Officers">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rotc-textMuted" />
              <input
                type="text"
                placeholder="Search name or ID..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="pl-9 pr-4 py-2 bg-rotc-bg border border-rotc-border rounded-lg text-sm text-rotc-text focus:outline-none focus:border-rotc-accent w-full sm:w-64"
              />
            </div>
            <select
              value={platoonFilter}
              onChange={e => { setPlatoonFilter(e.target.value); setPage(1) }}
              className="px-3 py-2 bg-rotc-bg border border-rotc-border rounded-lg text-sm text-rotc-text focus:outline-none focus:border-rotc-accent"
            >
              {platoons.map(p => <option key={p} value={p}>{p === 'All' || p === 'HQ' ? p : `${p} Platoon`}</option>)}
            </select>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
              className="px-3 py-2 bg-rotc-bg border border-rotc-border rounded-lg text-sm text-rotc-text focus:outline-none focus:border-rotc-accent"
            >
              {[20, 50, 100].map(s => <option key={s} value={s}>{s} per page</option>)}
            </select>
            {selectedIds.length > 0 && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsBulkDeleteModalOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete Selected ({selectedIds.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table
            data={officers}
            keyExtractor={(o) => o.id}
            headers={[
              <div className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-rotc-border bg-rotc-bg text-rotc-accent focus:ring-rotc-accent cursor-pointer"
                  checked={selectedIds.length === officers.length && officers.length > 0}
                  onChange={toggleSelectAll}
                />
              </div>,
              'Photo', 'ID Number', 'Full Name', 'Platoon', 'Designation', 'Status', 'Actions'
            ]}
            isLoading={isLoading}
            renderRow={(o) => (
              <>
                <td className="p-4">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-rotc-border bg-rotc-bg text-rotc-accent focus:ring-rotc-accent cursor-pointer"
                    checked={selectedIds.includes(o.id)}
                    onChange={() => toggleSelect(o.id)}
                  />
                </td>
                <td className="p-4">
                  <div className="w-8 h-8 rounded-full bg-rotc-bg overflow-hidden flex items-center justify-center">
                    {o.photo_url ? <img src={o.photo_url} className="w-full h-full object-cover" alt="" /> : <span className="text-xs text-rotc-textMuted">{o.full_name.charAt(0)}</span>}
                  </div>
                </td>
                <td className="p-4 text-sm font-medium text-rotc-text">{o.id_number}</td>
                <td className="p-4 text-sm text-rotc-text">{o.full_name}</td>
                <td className="p-4 text-sm text-rotc-textMuted">{o.platoon || '—'}</td>
                <td className="p-4 text-sm text-rotc-textMuted">{o.designation || '—'}</td>
                <td className="p-4">
                  <Badge status={o.is_active ? 'success' : 'danger'} label={o.is_active ? 'Active' : 'Inactive'} />
                </td>
                <td className="p-4 flex items-center gap-2">
                  <button onClick={() => setEditUser(o)} className="p-1.5 text-rotc-textMuted hover:text-rotc-accent rounded-md hover:bg-rotc-cardHover transition-colors" title="Edit">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => { setResetPasswordUser(o); setNewPassword(''); }} className="p-1.5 text-rotc-textMuted hover:text-rotc-accent rounded-md hover:bg-rotc-cardHover transition-colors" title="Reset Password">
                    <Key className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteId(o.id)} className="p-1.5 text-rotc-textMuted hover:text-rotc-danger rounded-md hover:bg-rotc-cardHover transition-colors" title="Delete Permanently">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </>
            )}
          />
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-rotc-border">
              <p className="text-sm text-rotc-textMuted">
                Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount} officers
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <span className="text-sm text-rotc-text">Page {page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Edit Officer">
        {editUser && (
          <form onSubmit={handleUpdate} className="space-y-4 mt-4">
            <Input label="ID Number" value={editUser.id_number} readOnly disabled />
            <Input label="Full Name" name="full_name" defaultValue={editUser.full_name} required />
            <div className="space-y-1">
              <label className="text-sm font-medium text-rotc-textMuted">Platoon/Unit</label>
              <select name="platoon" defaultValue={editUser.platoon || ''} className="w-full px-3 py-2 bg-rotc-bg border border-rotc-border rounded-lg text-sm text-rotc-text focus:outline-none focus:border-rotc-accent">
                <option value="">Select Unit</option>
                {platoons.filter(p => p !== 'All').map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <Input label="Designation" name="designation" defaultValue={editUser.designation || ''} placeholder="Enter designation" />
            <Input label="Photo URL (Optional)" name="photo_url" defaultValue={editUser.photo_url || ''} />
            <div className="flex justify-end gap-3 pt-4 border-t border-rotc-border">
              <Button type="button" variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button type="submit" isLoading={updateMutation.isPending}>Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Single Delete Confirmation Modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Permanently Delete Officer">
        <p className="text-sm text-rotc-text mt-4">
          Are you sure you want to <strong className="text-rotc-danger">permanently delete</strong> this officer? This will remove their account, enrollment data, and archives. <strong>This cannot be undone.</strong>
        </p>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleHardDelete} isLoading={hardDeleteMutation.isPending}>Delete Permanently</Button>
        </div>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal isOpen={isBulkDeleteModalOpen} onClose={() => setIsBulkDeleteModalOpen(false)} title="Bulk Delete Officers">
        <p className="text-sm text-rotc-text mt-4">
          Are you sure you want to <strong className="text-rotc-danger">permanently delete {selectedIds.length} officer(s)</strong>? This will remove their accounts, enrollment data, and archives. <strong>This cannot be undone.</strong>
        </p>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={() => setIsBulkDeleteModalOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleBulkDelete} isLoading={hardDeleteMutation.isPending}>Delete {selectedIds.length} Officer(s)</Button>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={!!resetPasswordUser} onClose={() => setResetPasswordUser(null)} title="Reset Password">
        {resetPasswordUser && (
          <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
            <p className="text-sm text-rotc-textMuted mb-2">
              Set a new password for <strong className="text-rotc-text">{resetPasswordUser.full_name}</strong>.
            </p>
            <Input 
              label="New Password" 
              name="newPassword" 
              type="text" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter password"
              required 
            />
            <div className="flex justify-end gap-3 pt-4 border-t border-rotc-border">
              <Button type="button" variant="outline" onClick={() => setResetPasswordUser(null)}>Cancel</Button>
              <Button type="submit" isLoading={resetMutation.isPending}>Reset Password</Button>
            </div>
          </form>
        )}
      </Modal>
    </AppLayout>
  )
}

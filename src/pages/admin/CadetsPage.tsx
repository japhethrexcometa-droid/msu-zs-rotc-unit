import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { useAllCadets, useUpdateUser, useHardDeleteUsers, useResetUserPassword } from '@/hooks/queries/useUsers'
import { useState } from 'react'
import { Search, Edit, Trash2, Key, Users, ChevronLeft, ChevronRight, Activity } from 'lucide-react'
import { toast } from 'sonner'
import type { Database } from '@/lib/database.types'

type User = Database['public']['Tables']['users']['Row']

export default function CadetsPage() {
  const session = useSession()
  const [search, setSearch] = useState('')
  const [platoonFilter, setPlatoonFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const { data: result, isLoading, isFetching } = useAllCadets(page, pageSize, search, platoonFilter)
  const cadets = result?.data ?? []
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
  const [ghostData, setGhostData] = useState<{stats: any, ghosts: any[]} | null>(null)
  const [isRecovering, setIsRecovering] = useState<string | null>(null)
  const [isCheckingGhosts, setIsCheckingGhosts] = useState(false)

  const resetMutation = useResetUserPassword()

  if (!session) return null

  const platoons = ['All', 'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo']

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
      toast.success('Cadet updated successfully')
      setEditUser(null)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleHardDelete = async () => {
    if (!deleteId) return
    try {
      const result = await hardDeleteMutation.mutateAsync([deleteId])
      toast.success(result.message || 'Cadet permanently deleted')
      setDeleteId(null)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    try {
      const result = await hardDeleteMutation.mutateAsync(selectedIds)
      toast.success(result.message || `${selectedIds.length} cadet(s) permanently deleted`)
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

  const findGhosts = async () => {
    setIsCheckingGhosts(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error("Unauthorized: Session expired. Please log in again.")

      const res = await fetch('/api/admin/enrollment-archives?diagnostic=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!res.ok) {
        let errMessage = `Error ${res.status}: `
        try {
          const errData = await res.json()
          errMessage += errData.error || errData.message
        } catch(e) {
          errMessage += await res.text()
        }
        throw new Error(errMessage)
      }
      const json = await res.json()
      setGhostData(json)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsCheckingGhosts(false)
    }
  }

  const handleRecoverGhost = async (id_number: string) => {
    setIsRecovering(id_number)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error("Unauthorized: Session expired.")

      const res = await fetch('/api/admin/recover-ghost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id_number })
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to recover account')
      
      toast.success(`Account recovered successfully! ID: ${id_number} is now the default password.`)
      setGhostData(prev => prev ? { ...prev, ghosts: prev.ghosts.filter((g: any) => g.id_number !== id_number) } : null)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsRecovering(null)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === cadets.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(cadets.map(c => c.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  return (
    <AppLayout title="Cadets Management">
      <Card>
        <CardHeader title="All Cadets">
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
              {platoons.map(p => <option key={p} value={p}>{p} Platoon</option>)}
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
            <Button
              variant="outline"
              size="sm"
              onClick={findGhosts}
              disabled={isCheckingGhosts}
              className="ml-auto flex items-center border-rotc-accent text-rotc-accent hover:bg-rotc-accent hover:text-white"
            >
              <Activity className="h-4 w-4 mr-2" /> 
              {isCheckingGhosts ? 'Scanning...' : 'Find Ghost Accounts'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table
            headers={[
              <div className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-rotc-border bg-rotc-bg text-rotc-accent focus:ring-rotc-accent cursor-pointer"
                  checked={selectedIds.length === cadets.length && cadets.length > 0}
                  onChange={toggleSelectAll}
                />
              </div>,
              'Photo', 'ID Number', 'Full Name', 'Platoon', 'Status', 'Actions'
            ]}
            isLoading={isLoading}
            data={cadets}
            keyExtractor={(c) => c.id}
            renderRow={(c) => (
              <>
                <td className="p-4">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-rotc-border bg-rotc-bg text-rotc-accent focus:ring-rotc-accent cursor-pointer"
                    checked={selectedIds.includes(c.id)}
                    onChange={() => toggleSelect(c.id)}
                  />
                </td>
                <td className="p-4">
                  <div className="w-8 h-8 rounded-full bg-rotc-bg overflow-hidden flex items-center justify-center">
                    {c.photo_url ? <img src={c.photo_url} className="w-full h-full object-cover" alt="" /> : <Users className="h-4 w-4 text-rotc-textMuted" />}
                  </div>
                </td>
                <td className="p-4 text-sm font-medium text-rotc-text">{c.id_number}</td>
                <td className="p-4 text-sm text-rotc-text">{c.full_name}</td>
                <td className="p-4 text-sm text-rotc-textMuted">{c.platoon || '—'}</td>
                <td className="p-4">
                  <Badge status={c.is_active ? 'success' : 'danger'} label={c.is_active ? 'Active' : 'Inactive'} />
                </td>
                <td className="p-4 flex items-center gap-2">
                  <button onClick={() => setEditUser(c)} className="p-1.5 text-rotc-textMuted hover:text-rotc-accent rounded-md hover:bg-rotc-cardHover transition-colors" title="Edit">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => { setResetPasswordUser(c); setNewPassword(''); }} className="p-1.5 text-rotc-textMuted hover:text-rotc-accent rounded-md hover:bg-rotc-cardHover transition-colors" title="Reset Password">
                    <Key className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteId(c.id)} className="p-1.5 text-rotc-textMuted hover:text-rotc-danger rounded-md hover:bg-rotc-cardHover transition-colors" title="Delete Permanently">
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
                Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount} cadets
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
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Edit Cadet">
        {editUser && (
          <form onSubmit={handleUpdate} className="space-y-4 mt-4">
            <Input label="ID Number" value={editUser.id_number} readOnly disabled />
            <Input label="Full Name" name="full_name" defaultValue={editUser.full_name} required />
            <div className="space-y-1">
              <label className="text-sm font-medium text-rotc-textMuted">Platoon</label>
              <select name="platoon" defaultValue={editUser.platoon || ''} className="w-full px-3 py-2 bg-rotc-bg border border-rotc-border rounded-lg text-sm text-rotc-text focus:outline-none focus:border-rotc-accent">
                <option value="">Select Platoon</option>
                {platoons.filter(p => p !== 'All').map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <Input label="Designation (Optional)" name="designation" defaultValue={editUser.designation || ''} />
            <Input label="Photo URL (Optional)" name="photo_url" defaultValue={editUser.photo_url || ''} />
            <div className="flex justify-end gap-3 pt-4 border-t border-rotc-border">
              <Button type="button" variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button type="submit" isLoading={updateMutation.isPending}>Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Single Delete Confirmation Modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Permanently Delete Cadet">
        <p className="text-sm text-rotc-text mt-4">
          Are you sure you want to <strong className="text-rotc-danger">permanently delete</strong> this cadet? This will remove their account, enrollment data, and archives. <strong>This cannot be undone.</strong>
        </p>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleHardDelete} isLoading={hardDeleteMutation.isPending}>Delete Permanently</Button>
        </div>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal isOpen={isBulkDeleteModalOpen} onClose={() => setIsBulkDeleteModalOpen(false)} title="Bulk Delete Cadets">
        <p className="text-sm text-rotc-text mt-4">
          Are you sure you want to <strong className="text-rotc-danger">permanently delete {selectedIds.length} cadet(s)</strong>? This will remove their accounts, enrollment data, and archives. <strong>This cannot be undone.</strong>
        </p>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={() => setIsBulkDeleteModalOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleBulkDelete} isLoading={hardDeleteMutation.isPending}>Delete {selectedIds.length} Cadet(s)</Button>
        </div>
      </Modal>

      <Modal
        isOpen={!!ghostData}
        onClose={() => setGhostData(null)}
        title="Ghost Records Diagnostic Tool"
        maxWidth="max-w-4xl"
      >
        {ghostData && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-rotc-bg p-4 rounded-lg border border-rotc-border">
                <p className="text-sm text-rotc-textMuted">Archives (Approved)</p>
                <p className="text-xl font-semibold text-rotc-text">{ghostData.stats.archives}</p>
              </div>
              <div className="bg-rotc-bg p-4 rounded-lg border border-rotc-border">
                <p className="text-sm text-rotc-textMuted">Requests (Approved)</p>
                <p className="text-xl font-semibold text-rotc-text">{ghostData.stats.requests}</p>
              </div>
              <div className="bg-rotc-bg p-4 rounded-lg border border-rotc-border">
                <p className="text-sm text-rotc-textMuted">Registered Accounts</p>
                <p className="text-xl font-semibold text-rotc-text">{ghostData.stats.users}</p>
              </div>
              <div className="bg-rotc-bg p-4 rounded-lg border border-rotc-border">
                <p className="text-sm text-rotc-textMuted">Officers</p>
                <p className="text-xl font-semibold text-rotc-text">{ghostData.stats.officers}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-rotc-border">
              <h3 className={`text-lg font-medium mb-4 ${ghostData.ghosts.length > 0 ? 'text-rotc-danger' : 'text-emerald-500'}`}>
                {ghostData.ghosts.length > 0 
                  ? `Found ${ghostData.ghosts.length} Missing "Ghost" Records` 
                  : 'No missing records found! Everyone is perfectly synced.'}
              </h3>
              
              {ghostData.ghosts.length > 0 && (
                <div className="bg-rotc-bg border border-rotc-border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-rotc-cardHover border-b border-rotc-border text-rotc-textMuted">
                      <tr>
                        <th className="px-4 py-3 font-medium">ID Number</th>
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium">School</th>
                        <th className="px-4 py-3 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rotc-border text-rotc-text">
                      {ghostData.ghosts.map((ghost: any) => (
                        <tr key={ghost.id_number} className="hover:bg-rotc-cardHover/50">
                          <td className="px-4 py-3">{ghost.id_number}</td>
                          <td className="px-4 py-3">{ghost.first_name} {ghost.last_name}</td>
                          <td className="px-4 py-3">{ghost.school}</td>
                          <td className="px-4 py-3 text-right">
                            <Button 
                              size="sm" 
                              onClick={() => handleRecoverGhost(ghost.id_number)}
                              isLoading={isRecovering === ghost.id_number}
                              disabled={!!isRecovering}
                            >
                              Recover Account
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
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

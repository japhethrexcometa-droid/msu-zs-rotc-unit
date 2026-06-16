import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { useAllOfficers, useUpdateUser, useDeactivateUser } from '@/hooks/queries/useUsers'
import { useState } from 'react'
import { Search, Edit, UserX } from 'lucide-react'
import { toast } from 'sonner'
import type { Database } from '@/lib/database.types'

type User = Database['public']['Tables']['users']['Row']

export default function OfficersPage() {
  const session = useSession()
  const { data: officers, isLoading } = useAllOfficers()
  const updateMutation = useUpdateUser()
  const deactivateMutation = useDeactivateUser()

  const [search, setSearch] = useState('')
  const [platoonFilter, setPlatoonFilter] = useState('All')
  const [editUser, setEditUser] = useState<User | null>(null)
  const [deactivateId, setDeactivateId] = useState<string | null>(null)

  if (!session) return null

  const platoons = ['All', 'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'HQ']

  const filteredOfficers = (officers ?? []).filter(o => {
    const matchesSearch = o.full_name.toLowerCase().includes(search.toLowerCase()) || 
                          o.id_number.toLowerCase().includes(search.toLowerCase())
    const matchesPlatoon = platoonFilter === 'All' || o.platoon === platoonFilter
    return matchesSearch && matchesPlatoon
  })

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

  const handleDeactivate = async () => {
    if (!deactivateId) return
    try {
      await deactivateMutation.mutateAsync(deactivateId)
      toast.success('Officer deactivated')
      setDeactivateId(null)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <AppLayout title="Officers Management">
      <Card>
        <CardHeader title="All Officers">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rotc-textMuted" />
              <input
                type="text"
                placeholder="Search name or ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-rotc-bg border border-rotc-border rounded-lg text-sm text-rotc-text focus:outline-none focus:border-rotc-accent w-full sm:w-64"
              />
            </div>
            <select
              value={platoonFilter}
              onChange={e => setPlatoonFilter(e.target.value)}
              className="px-3 py-2 bg-rotc-bg border border-rotc-border rounded-lg text-sm text-rotc-text focus:outline-none focus:border-rotc-accent"
            >
              {platoons.map(p => <option key={p} value={p}>{p === 'All' || p === 'HQ' ? p : `${p} Platoon`}</option>)}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table
            headers={['Photo', 'ID Number', 'Full Name', 'Platoon', 'Designation', 'Status', 'Actions']}
            isLoading={isLoading}
            data={filteredOfficers}
            keyExtractor={(o) => o.id}
            renderRow={(o) => (
              <>
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
                  <button onClick={() => setEditUser(o)} className="p-1.5 text-rotc-textMuted hover:text-rotc-accent rounded-md hover:bg-rotc-cardHover transition-colors">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeactivateId(o.id)} className="p-1.5 text-rotc-textMuted hover:text-rotc-danger rounded-md hover:bg-rotc-cardHover transition-colors">
                    <UserX className="h-4 w-4" />
                  </button>
                </td>
              </>
            )}
          />
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
            <Input label="Designation" name="designation" defaultValue={editUser.designation || ''} placeholder="e.g. Platoon Leader" />
            <Input label="Photo URL (Optional)" name="photo_url" defaultValue={editUser.photo_url || ''} />
            <div className="flex justify-end gap-3 pt-4 border-t border-rotc-border">
              <Button type="button" variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button type="submit" isLoading={updateMutation.isPending}>Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Deactivate Modal */}
      <Modal isOpen={!!deactivateId} onClose={() => setDeactivateId(null)} title="Confirm Deactivation">
        <p className="text-sm text-rotc-text mt-4">Are you sure you want to deactivate this officer?</p>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={() => setDeactivateId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeactivate} isLoading={deactivateMutation.isPending}>Deactivate</Button>
        </div>
      </Modal>
    </AppLayout>
  )
}

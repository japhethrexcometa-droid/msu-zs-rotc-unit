import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import {
  useAnnouncements, useCreateAnnouncement,
  useUpdateAnnouncement, useDeleteAnnouncement, useTogglePin
} from '@/hooks/queries/useAnnouncements'
import { useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Pin, PinOff } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type Announcement = Database['public']['Tables']['announcements']['Row']

export default function AnnouncementsPage() {
  const session = useSession()
  const { data: announcements, isLoading } = useAnnouncements()
  const createMutation = useCreateAnnouncement()
  const updateMutation = useUpdateAnnouncement()
  const deleteMutation = useDeleteAnnouncement()
  const togglePinMutation = useTogglePin()

  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem] = useState<Announcement | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  if (!session) return null

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      await createMutation.mutateAsync({
        title: fd.get('title') as string,
        content: fd.get('content') as string,
        target_role: fd.get('target_role') as string,
        is_pinned: fd.get('is_pinned') === 'on',
        created_by: session.id,
      })
      toast.success('Announcement created')
      setShowCreate(false)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editItem) return
    const fd = new FormData(e.currentTarget)
    try {
      await updateMutation.mutateAsync({
        id: editItem.id,
        updates: {
          title: fd.get('title') as string,
          content: fd.get('content') as string,
          target_role: fd.get('target_role') as string,
          is_pinned: fd.get('is_pinned') === 'on',
        }
      })
      toast.success('Announcement updated')
      setEditItem(null)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteMutation.mutateAsync(deleteId)
      toast.success('Deleted')
      setDeleteId(null)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <AppLayout title="Announcements">
      <Card>
        <CardHeader title="All Announcements">
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Announcement
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-rotc-textMuted">Loading...</div>
          ) : !announcements?.length ? (
            <div className="p-8 text-center text-rotc-textMuted">No announcements yet.</div>
          ) : (
            <div className="divide-y divide-rotc-border">
              {announcements.map(a => (
                <div key={a.id} className="p-5 hover:bg-rotc-cardHover transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-sm font-semibold text-rotc-text">{a.title}</h3>
                        {a.is_pinned && <Badge status="warning" label="Pinned" />}
                        <Badge
                          status={a.target_role === 'all' ? 'info' : a.target_role === 'officer' ? 'success' : 'default'}
                          label={a.target_role === 'all' ? 'All' : a.target_role === 'officer' ? 'Officers' : 'Cadets'}
                        />
                      </div>
                      <p className="text-xs text-rotc-textMuted line-clamp-2">{a.content}</p>
                      <p className="text-[10px] text-rotc-textMuted mt-2">{format(new Date(a.created_at), 'MMM d, yyyy · h:mm a')}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => togglePinMutation.mutate({ id: a.id, current: a.is_pinned })}
                        className="p-1.5 rounded-md text-rotc-textMuted hover:text-rotc-warning hover:bg-rotc-cardHover transition-colors"
                        title={a.is_pinned ? 'Unpin' : 'Pin'}
                      >
                        {a.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      </button>
                      <button onClick={() => setEditItem(a)} className="p-1.5 rounded-md text-rotc-textMuted hover:text-rotc-accent hover:bg-rotc-cardHover transition-colors">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteId(a.id)} className="p-1.5 rounded-md text-rotc-textMuted hover:text-rotc-danger hover:bg-rotc-cardHover transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Announcement">
        <AnnouncementForm onSubmit={handleCreate} isLoading={createMutation.isPending} onCancel={() => setShowCreate(false)} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Announcement">
        {editItem && (
          <AnnouncementForm
            onSubmit={handleUpdate}
            isLoading={updateMutation.isPending}
            onCancel={() => setEditItem(null)}
            defaults={editItem}
          />
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Announcement">
        <p className="text-sm text-rotc-text mt-4">Are you sure you want to delete this announcement? This action cannot be undone.</p>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} isLoading={deleteMutation.isPending}>Delete</Button>
        </div>
      </Modal>
    </AppLayout>
  )
}

function AnnouncementForm({
  onSubmit, isLoading, onCancel, defaults
}: {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  isLoading: boolean
  onCancel: () => void
  defaults?: Partial<Announcement>
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 mt-4">
      <Input label="Title" name="title" defaultValue={defaults?.title || ''} required />
      <div className="space-y-1">
        <label className="text-sm font-medium text-rotc-textMuted">Content</label>
        <textarea
          name="content"
          defaultValue={defaults?.content || ''}
          rows={4}
          required
          className="w-full px-3 py-2 bg-rotc-bg border border-rotc-border rounded-lg text-sm text-rotc-text focus:outline-none focus:border-rotc-accent resize-none"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-rotc-textMuted">Target Audience</label>
        <select
          name="target_role"
          defaultValue={defaults?.target_role || 'all'}
          className="w-full px-3 py-2 bg-rotc-bg border border-rotc-border rounded-lg text-sm text-rotc-text focus:outline-none focus:border-rotc-accent"
        >
          <option value="all">All</option>
          <option value="officer">Officers Only</option>
          <option value="cadet">Cadets Only</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-rotc-text cursor-pointer">
        <input type="checkbox" name="is_pinned" defaultChecked={defaults?.is_pinned ?? false} className="accent-rotc-accent" />
        Pin this announcement
      </label>
      <div className="flex justify-end gap-3 pt-4 border-t border-rotc-border">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" isLoading={isLoading}>Save</Button>
      </div>
    </form>
  )
}

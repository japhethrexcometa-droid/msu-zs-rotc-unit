import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { useAllSessions, useCreateSession, useEndSession, useDeleteSession } from '@/hooks/queries/useAttendance'
import { useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Trash2, StopCircle } from 'lucide-react'

export default function SessionsPage() {
  const session = useSession()
  const { data: sessions, isLoading } = useAllSessions()
  const createMutation = useCreateSession()
  const endMutation = useEndSession()
  const deleteMutation = useDeleteSession()

  const [isCreating, setIsCreating] = useState(false)

  if (!session) return null

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    try {
      await createMutation.mutateAsync({
        title: formData.get('title') as string,
        session_date: formData.get('session_date') as string,
        location: formData.get('location') as string,
        created_by: session.id,
        is_active: true
      })
      toast.success('Session created successfully')
      setIsCreating(false)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <AppLayout title="Sessions Management">
      <Card>
        <CardHeader title="Attendance Sessions">
          <Button onClick={() => setIsCreating(true)}>Create Session</Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table
            headers={['Date', 'Title', 'Location', 'Status', 'Actions']}
            isLoading={isLoading}
            data={sessions ?? []}
            keyExtractor={(s) => s.id}
            renderRow={(s) => (
              <>
                <td className="p-4 text-sm text-rotc-text">{format(new Date(s.session_date), 'MMM d, yyyy')}</td>
                <td className="p-4 text-sm font-medium text-rotc-text">{s.title}</td>
                <td className="p-4 text-sm text-rotc-textMuted">{s.location || '—'}</td>
                <td className="p-4">
                  <Badge status={s.is_active ? 'success' : 'default'} label={s.is_active ? 'Active' : 'Ended'} />
                </td>
                <td className="p-4 flex items-center gap-2">
                  {s.is_active ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => endMutation.mutate(s.id, { onSuccess: () => toast.success('Session ended') })}
                      isLoading={endMutation.isPending}
                    >
                      <StopCircle className="h-4 w-4 mr-1" /> End
                    </Button>
                  ) : (
                    <button 
                      onClick={() => {
                        if (confirm('Delete this session?')) {
                          deleteMutation.mutate(s.id, { onSuccess: () => toast.success('Deleted') })
                        }
                      }}
                      className="p-1.5 text-rotc-textMuted hover:text-rotc-danger rounded-md hover:bg-rotc-cardHover transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </>
            )}
          />
        </CardContent>
      </Card>

      <Modal isOpen={isCreating} onClose={() => setIsCreating(false)} title="Create Session">
        <form onSubmit={handleCreate} className="space-y-4 mt-4">
          <Input label="Title" name="title" placeholder="Enter session title" required />
          <Input label="Date" name="session_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
          <Input label="Location" name="location" placeholder="Enter location" />
          <Input label="Started By" value={session.full_name} disabled readOnly />
          
          <div className="flex justify-end gap-3 pt-4 border-t border-rotc-border">
            <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Create Session</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}

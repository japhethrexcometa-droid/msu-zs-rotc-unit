import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { approveEnrollment, rejectEnrollment } from '@/services/enrollment.service'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Check, X } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type EnrollmentRequest = Database['public']['Tables']['enrollment_requests']['Row']

export default function EnrollmentPage() {
  const session = useSession()
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [requests, setRequests] = useState<EnrollmentRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [approveItem, setApproveItem] = useState<EnrollmentRequest | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [tempPassword, setTempPassword] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchRequests = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('enrollment_requests')
      .select('*')
      .eq('status', tab)
      .order('created_at', { ascending: tab === 'pending' })

    if (!error) setRequests(data ?? [])
    setIsLoading(false)
  }

  useEffect(() => { fetchRequests() }, [tab])

  if (!session) return null

  const handleApprove = async () => {
    if (!approveItem || !tempPassword) return
    setActionLoading(true)
    try {
      await approveEnrollment(approveItem.id, session.id, tempPassword)
      toast.success('Enrollment approved')
      setApproveItem(null)
      setTempPassword('')
      fetchRequests()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectId) return
    setActionLoading(true)
    try {
      await rejectEnrollment(rejectId, session.id)
      toast.success('Enrollment rejected')
      setRejectId(null)
      fetchRequests()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const tabs = ['pending', 'approved', 'rejected'] as const

  return (
    <AppLayout title="Enrollment Requests">
      <Card>
        <CardHeader title="Enrollment">
          <div className="flex border border-rotc-border rounded-lg overflow-hidden">
            {tabs.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 text-xs font-medium capitalize transition-colors ${
                  tab === t ? 'bg-rotc-accent text-white' : 'text-rotc-textMuted hover:bg-rotc-cardHover'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table
            headers={['ID Number', 'Full Name', 'Role', 'Platoon', 'Submitted', ...(tab === 'pending' ? ['Actions'] : [])]}
            isLoading={isLoading}
            data={requests}
            keyExtractor={(r) => r.id}
            renderRow={(r) => (
              <>
                <td className="p-4 text-sm font-medium text-rotc-text">{r.id_number}</td>
                <td className="p-4 text-sm text-rotc-text">{r.full_name}</td>
                <td className="p-4">
                  <Badge status="default" label={r.role ?? 'cadet'} />
                </td>
                <td className="p-4 text-sm text-rotc-textMuted">{r.platoon || '—'}</td>
                <td className="p-4 text-sm text-rotc-textMuted">{format(new Date(r.created_at), 'MMM d, yyyy')}</td>
                {tab === 'pending' && (
                  <td className="p-4 flex items-center gap-2">
                    <button
                      onClick={() => setApproveItem(r)}
                      className="p-1.5 rounded-md text-rotc-success hover:bg-green-900/20 transition-colors"
                      title="Approve"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setRejectId(r.id)}
                      className="p-1.5 rounded-md text-rotc-danger hover:bg-red-900/20 transition-colors"
                      title="Reject"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </>
            )}
          />
        </CardContent>
      </Card>

      {/* Approve Modal */}
      <Modal isOpen={!!approveItem} onClose={() => { setApproveItem(null); setTempPassword('') }} title="Approve Enrollment">
        {approveItem && (
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-rotc-bg rounded-lg border border-rotc-border space-y-1">
              <p className="text-sm text-rotc-text"><strong>Name:</strong> {approveItem.full_name}</p>
              <p className="text-sm text-rotc-text"><strong>ID:</strong> {approveItem.id_number}</p>
              <p className="text-sm text-rotc-text"><strong>Platoon:</strong> {approveItem.platoon || '—'}</p>
            </div>
            <Input
              label="Set Temporary Password"
              value={tempPassword}
              onChange={e => setTempPassword(e.target.value)}
              placeholder="e.g. ChangeMe123"
              required
            />
            <div className="flex justify-end gap-3 pt-4 border-t border-rotc-border">
              <Button variant="outline" onClick={() => { setApproveItem(null); setTempPassword('') }}>Cancel</Button>
              <Button onClick={handleApprove} isLoading={actionLoading} disabled={!tempPassword}>Approve & Create Account</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={!!rejectId} onClose={() => setRejectId(null)} title="Reject Enrollment">
        <p className="text-sm text-rotc-text mt-4">Are you sure you want to reject this enrollment request?</p>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleReject} isLoading={actionLoading}>Reject</Button>
        </div>
      </Modal>
    </AppLayout>
  )
}

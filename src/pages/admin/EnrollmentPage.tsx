import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { useState, useEffect, useMemo } from 'react'
import { approveEnrollment, rejectEnrollment, getAllEnrollmentRequests } from '@/services/enrollment.service'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Check, X, Download, UserCheck, AlertCircle } from 'lucide-react'

export default function EnrollmentPage() {
  const session = useSession()
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [allRequests, setAllRequests] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [approveItem, setApproveItem] = useState<any | null>(null)
  const [rejectItem, setRejectItem] = useState<any | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchRequests = async () => {
    setIsLoading(true)
    try {
      const data = await getAllEnrollmentRequests()
      setAllRequests(data)
    } catch (err: any) {
      toast.error('Failed to load requests: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchRequests() }, [])

  const currentRequests = useMemo(() => {
    return allRequests.filter(r => r.status === tab).sort((a, b) => {
      return tab === 'pending' 
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [allRequests, tab])

  // Dynamic stats
  const statsBySchool = useMemo(() => {
    return currentRequests.reduce((acc, req) => {
      const school = req.school || 'Unknown'
      if (!acc[school]) acc[school] = { Male: 0, Female: 0, Total: 0 }
      if (req.gender === 'Male') acc[school].Male++
      if (req.gender === 'Female') acc[school].Female++
      acc[school].Total++
      return acc
    }, {} as Record<string, { Male: number, Female: number, Total: number }>)
  }, [currentRequests])

  const exportCSV = () => {
    if (currentRequests.length === 0) return toast.error('No records to export in this tab.')

    const headers = [
      'ID Number', 'School', 'Last Name', 'First Name', 'MI', 'Suffix', 'Gender', 
      'DOB', 'Course & Year', 'Contact', 'Email', 'Address', 'Status', 'Date Submitted'
    ]

    const rows = currentRequests.map(r => [
      r.id_number, r.school, r.last_name, r.first_name, r.middle_initial || '', r.suffix || '', r.gender,
      r.date_of_birth, r.course_year, r.contact_number, r.email, `"${r.home_address}"`, r.status, r.created_at
    ])

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `ROTC_Enrollments_${tab}_${format(new Date(), 'yyyyMMdd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!session) return null

  const handleApprove = async () => {
    if (!approveItem) return
    setActionLoading(true)
    try {
      await approveEnrollment(approveItem, session.id)
      toast.success('Enrollment approved! Account created and email sent.')
      setApproveItem(null)
      fetchRequests()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectItem || !rejectReason.trim()) return toast.error('Rejection reason is required')
    setActionLoading(true)
    try {
      await rejectEnrollment(rejectItem, session.id, rejectReason)
      toast.success('Enrollment rejected and email sent.')
      setRejectItem(null)
      setRejectReason('')
      fetchRequests()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const ProfileDetails = ({ data }: { data: any }) => (
    <div className="bg-rotc-bg border border-rotc-border rounded-xl p-4 text-sm space-y-3 max-h-[50vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-y-2">
        <span className="text-rotc-textMuted">ID Number:</span><span className="text-rotc-text font-medium">{data.id_number}</span>
        <span className="text-rotc-textMuted">School:</span><span className="text-rotc-text font-medium">{data.school}</span>
        <span className="text-rotc-textMuted">Name:</span><span className="text-rotc-text font-medium">{data.first_name} {data.middle_initial} {data.last_name} {data.suffix !== 'N/A' ? data.suffix : ''}</span>
        <span className="text-rotc-textMuted">Gender:</span><span className="text-rotc-text font-medium">{data.gender}</span>
        <span className="text-rotc-textMuted">DOB:</span><span className="text-rotc-text font-medium">{data.date_of_birth}</span>
        <span className="text-rotc-textMuted">Course:</span><span className="text-rotc-text font-medium">{data.course_year}</span>
        
        <span className="col-span-2 border-t border-rotc-border my-2"></span>
        
        <span className="text-rotc-textMuted">Contact:</span><span className="text-rotc-text font-medium">{data.contact_number}</span>
        <span className="text-rotc-textMuted">Email:</span><span className="text-rotc-text font-medium">{data.email}</span>
        <span className="text-rotc-textMuted">Address:</span><span className="text-rotc-text font-medium col-span-2 mt-1">{data.home_address}</span>
        
        <span className="col-span-2 border-t border-rotc-border my-2"></span>

        <span className="text-rotc-textMuted">Blood Type:</span><span className="text-rotc-text font-medium">{data.blood_type}</span>
        <span className="text-rotc-textMuted">Height:</span><span className="text-rotc-text font-medium">{data.height_feet} ft</span>
        
        <span className="col-span-2 border-t border-rotc-border my-2"></span>

        <span className="text-rotc-textMuted">Beneficiary:</span><span className="text-rotc-text font-medium">{data.beneficiary_name} ({data.beneficiary_relationship})</span>
        <span className="text-rotc-textMuted">Emergency:</span><span className="text-rotc-text font-medium">{data.emergency_name} ({data.emergency_relationship}) - {data.emergency_contact}</span>
      </div>
    </div>
  )

  const tabs = ['pending', 'approved', 'rejected'] as const

  return (
    <AppLayout title="Enrollment Management">
      <div className="space-y-6">
        
        {/* Dynamic Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(statsBySchool).map(([school, stats]) => (
            <Card key={school} className="bg-rotc-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-rotc-textMuted">{school}</p>
                  <p className="text-2xl font-bold text-rotc-text">{stats.Total}</p>
                </div>
                <div className="text-right text-xs text-rotc-textMuted">
                  <p>Male: <span className="text-rotc-text font-medium">{stats.Male}</span></p>
                  <p>Female: <span className="text-rotc-text font-medium">{stats.Female}</span></p>
                </div>
              </CardContent>
            </Card>
          ))}
          {Object.keys(statsBySchool).length === 0 && !isLoading && (
            <div className="col-span-full p-4 bg-rotc-bg rounded-xl border border-rotc-border text-center text-rotc-textMuted text-sm">
              No data for this status.
            </div>
          )}
        </div>

        <Card>
          <CardHeader title="Enrollment Requests">
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
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
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table
              headers={['ID Number', 'Name', 'School', 'Gender', 'Submitted', 'Email Status', 'Actions']}
              isLoading={isLoading}
              data={currentRequests}
              keyExtractor={(r) => r.id}
              renderRow={(r) => (
                <>
                  <td className="p-4 text-sm font-medium text-rotc-text">{r.id_number}</td>
                  <td className="p-4 text-sm text-rotc-text">{r.first_name} {r.last_name}</td>
                  <td className="p-4 text-sm text-rotc-textMuted">{r.school}</td>
                  <td className="p-4 text-sm text-rotc-textMuted">{r.gender}</td>
                  <td className="p-4 text-sm text-rotc-textMuted">{format(new Date(r.created_at), 'MMM d, yyyy')}</td>
                  <td className="p-4">
                    {r.email_sent ? (
                      <Badge status="success" label="Sent" />
                    ) : (
                      <Badge status="warning" label="Pending" />
                    )}
                  </td>
                  <td className="p-4 flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setApproveItem(r)}>Review</Button>
                  </td>
                </>
              )}
            />
          </CardContent>
        </Card>
      </div>

      {/* Approve/Review Modal */}
      <Modal isOpen={!!approveItem} onClose={() => setApproveItem(null)} title="Review Enrollment">
        {approveItem && (
          <div className="space-y-4 mt-4">
            <ProfileDetails data={approveItem} />
            
            {tab === 'pending' && (
              <div className="flex justify-between items-center pt-4 border-t border-rotc-border">
                <Button 
                  variant="danger" 
                  onClick={() => { setRejectItem(approveItem); setApproveItem(null); }}
                >
                  <X className="h-4 w-4 mr-2" /> Reject
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setApproveItem(null)}>Cancel</Button>
                  <Button onClick={handleApprove} isLoading={actionLoading}>
                    <Check className="h-4 w-4 mr-2" /> Approve & Create Account
                  </Button>
                </div>
              </div>
            )}
            {tab !== 'pending' && (
              <div className="flex justify-end pt-4 border-t border-rotc-border">
                <Button variant="outline" onClick={() => setApproveItem(null)}>Close</Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={!!rejectItem} onClose={() => { setRejectItem(null); setRejectReason(''); }} title="Reject Enrollment">
        <div className="space-y-4 mt-4">
          <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-rotc-danger/10 border border-rotc-danger/20 text-sm text-rotc-danger">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>This will send a rejection email to the applicant. Please provide a reason for the rejection.</span>
          </div>
          
          <Input
            label="Rejection Reason"
            placeholder="e.g. Invalid ID format, please go to the office."
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-6">
            <Button variant="outline" onClick={() => { setRejectItem(null); setRejectReason(''); }}>Cancel</Button>
            <Button variant="danger" onClick={handleReject} isLoading={actionLoading} disabled={!rejectReason.trim()}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}

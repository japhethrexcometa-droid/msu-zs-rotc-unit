import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { supabase } from '@/lib/supabase'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { useState, useMemo } from 'react'
import { 
  useEnrollmentRequests, 
  useApproveEnrollment, 
  useRejectEnrollment 
} from '@/hooks/queries/useEnrollment'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Check, X, Download, AlertCircle, RefreshCw } from 'lucide-react'

function ProfileDetails({ data }: { data: any }) {
  return (
    <div className="bg-rotc-bg border border-rotc-border rounded-xl p-4 text-sm space-y-3 max-h-[50vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-y-2">
        <span className="text-rotc-textMuted">ID Number:</span><span className="text-rotc-text font-medium">{data.id_number}</span>
        <span className="text-rotc-textMuted">School:</span><span className="text-rotc-text font-medium">{data.school}</span>
        <span className="text-rotc-textMuted">Name:</span><span className="text-rotc-text font-medium">{data.first_name} {data.middle_initial} {data.last_name} {data.suffix !== 'N/A' ? data.suffix : ''}</span>
        <span className="text-rotc-textMuted">Gender:</span><span className="text-rotc-text font-medium">{data.gender}</span>
        <span className="text-rotc-textMuted">DOB:</span><span className="text-rotc-text font-medium">{data.date_of_birth}</span>
        <span className="text-rotc-textMuted">Course:</span><span className="text-rotc-text font-medium">{data.course_year}</span>
        <span className="text-rotc-textMuted">Academic Year:</span><span className="text-rotc-text font-medium">{data.year_level}</span>
        <span className="text-rotc-textMuted">MS Class:</span><span className="text-rotc-text font-medium">{data.ms_title} ({data.ms_subject})</span>
        <span className="text-rotc-textMuted">Semester:</span><span className="text-rotc-text font-medium">{data.semester}</span>
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
}

export default function EnrollmentPage() {
  const session = useSession()
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  
  const { data: allRequests = [], isLoading, isFetching, dataUpdatedAt, refetch } = useEnrollmentRequests()

  const approveMutation = useApproveEnrollment()
  const rejectMutation = useRejectEnrollment()

  const [approveItem, setApproveItem] = useState<any | null>(null)
  const [rejectItem, setRejectItem] = useState<any | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const [isRetryingEmails, setIsRetryingEmails] = useState(false)

  const handleRetryEmails = async () => {
    setIsRetryingEmails(true)
    try {
      const { data, error } = await supabase.rpc('retry_failed_emails')
      if (error) throw error
      if (data && !data.success) {
        throw new Error(data.error || "Failed to retry emails")
      }

      const count = data?.retried_count ?? 0
      toast.success(data?.message || `Successfully retried ${count} failed email(s)!`)

      if (count > 0) {
        // Trigger queue processing in background securely
        const sessionToken = (await supabase.auth.getSession()).data.session?.access_token
        if (sessionToken) {
          fetch('/api/cron/process-emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${sessionToken}`
            }
          })
          .then(res => res.json())
          .then(result => {
            console.log('[EMAIL] Auto-triggered queue processing after retry:', result)
            if (result.success && result.sent > 0) {
              toast.info(`Sent ${result.sent} email(s) immediately.`)
            }
          })
          .catch(err => console.error('[EMAIL] Auto-trigger fetch failed after retry:', err.message))
        }
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsRetryingEmails(false)
    }
  }

  const currentRequests = useMemo(() => {
    return allRequests.filter(r => r.status === tab).sort((a, b) => {
      if (tab === 'pending') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      // Approved/Rejected: newest processed first
      const aDate = a.reviewed_at ? new Date(a.reviewed_at).getTime() : 0
      const bDate = b.reviewed_at ? new Date(b.reviewed_at).getTime() : 0
      return bDate - aDate
    })
  }, [allRequests, tab])

  // Count per tab for badges
  const tabCounts = useMemo(() => ({
    pending: allRequests.filter(r => r.status === 'pending').length,
    approved: allRequests.filter(r => r.status === 'approved').length,
    rejected: allRequests.filter(r => r.status === 'rejected').length,
  }), [allRequests])

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

  if (isLoading) {
    return (
      <AppLayout title="Enrollment Management">
        <div className="space-y-6">
          {/* Skeleton stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="bg-rotc-card animate-pulse">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="h-3.5 bg-rotc-border rounded w-28 mb-2" />
                    <div className="h-8 bg-rotc-border rounded w-16" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-rotc-border rounded w-16" />
                    <div className="h-3 bg-rotc-border rounded w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Skeleton table */}
          <Card>
            <CardContent className="p-6">
              <div className="h-4 bg-rotc-border rounded w-48 mb-6 animate-pulse" />
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-12 bg-rotc-border/30 rounded animate-pulse" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const exportCSV = () => {
    if (currentRequests.length === 0) return toast.error('No records to export in this tab.')

    // CSV field sanitizer: wraps in quotes and escapes inner quotes if needed
    const sanitize = (value: string | number | null | undefined): string => {
      const str = String(value ?? '')
      // If contains comma, newline, or double-quote, wrap in quotes and escape
      if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    // Sort by school, then gender (Female first, Male second) for organized export
    const sorted = [...currentRequests].sort((a, b) => {
      const schoolCompare = (a.school || '').localeCompare(b.school || '')
      if (schoolCompare !== 0) return schoolCompare
      // Female first, Male second within each school
      return (a.gender || '').localeCompare(b.gender || '')
    })

    // Column order matches the online enrollment form exactly
    const headers = [
      'ID Number', 'School', 'Last Name', 'First Name', 'MI', 'Suffix',
      'Gender', 'DOB', 'Course & Year', 'Academic Year', 'MS Class', 'Semester', 'Contact', 'Address',
      'Religion', 'Blood Type', 'Height',
      'Beneficiary', 'Relationship',
      'Email',
      'Emergency Contact Name', 'Relationship', 'Contact Number',
      'Status', 'Date Submitted',
      ...(tab !== 'pending' ? ['Date Processed'] : [])
    ]

    const rows: string[][] = []
    let currentSchool = ''
    let schoolMale = 0, schoolFemale = 0

    sorted.forEach((r, i) => {
      // Add school separator header
      if (r.school !== currentSchool) {
        if (currentSchool) {
          rows.push([`--- ${currentSchool} Total: Male=${schoolMale} Female=${schoolFemale} ---`])
          rows.push([])
          schoolMale = 0
          schoolFemale = 0
        }
        currentSchool = r.school
      }
      if (r.gender === 'Male') schoolMale++
      if (r.gender === 'Female') schoolFemale++

      const row = [
        sanitize(r.id_number),
        sanitize(r.school),
        sanitize(r.last_name),
        sanitize(r.first_name),
        sanitize(r.middle_initial),
        sanitize(r.suffix),
        sanitize(r.gender),
        sanitize(r.date_of_birth),
        sanitize(r.course_year),
        sanitize(r.year_level),
        sanitize(r.ms_title ? `${r.ms_title} (${r.ms_subject})` : ''),
        sanitize(r.semester),
        sanitize(r.contact_number),
        sanitize(r.home_address),
        sanitize(r.religion),
        sanitize(r.blood_type),
        sanitize(r.height_feet),
        sanitize(r.beneficiary_name),
        sanitize(r.beneficiary_relationship),
        sanitize(r.email),
        sanitize(r.emergency_name),
        sanitize(r.emergency_relationship),
        sanitize(r.emergency_contact),
        sanitize(r.status),
        sanitize(r.created_at ? format(new Date(r.created_at), 'MMM d, yyyy h:mm a') : ''),
        ...(tab !== 'pending' ? [sanitize(r.reviewed_at ? format(new Date(r.reviewed_at), 'MMM d, yyyy h:mm a') : '')] : [])
      ]
      rows.push(row)

      // Last item — close the final school group
      if (i === sorted.length - 1) {
        rows.push([`--- ${currentSchool} Total: Male=${schoolMale} Female=${schoolFemale} ---`])
      }
    })

    // Grand total
    const totalMale = sorted.filter(r => r.gender === 'Male').length
    const totalFemale = sorted.filter(r => r.gender === 'Female').length
    rows.push([])
    rows.push([`GRAND TOTAL: ${sorted.length} (Male=${totalMale} Female=${totalFemale}) — Exported ${format(new Date(), 'MMM d, yyyy h:mm a')}`])

    // UTF-8 BOM ensures Excel opens special characters correctly
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `ROTC_Enrollments_${tab}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!session) return null

  const handleApprove = async () => {
    if (!approveItem) return
    try {
      await approveMutation.mutateAsync({ request: approveItem, adminId: session.id })
      toast.success('Enrollment approved! Account created and email sent.')
      setApproveItem(null)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleReject = async () => {
    if (!rejectItem || !rejectReason.trim()) return toast.error('Rejection reason is required')
    try {
      await rejectMutation.mutateAsync({ request: rejectItem, adminId: session.id, reason: rejectReason })
      toast.success('Enrollment rejected and email sent.')
      setRejectItem(null)
      setRejectReason('')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

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
          {Object.keys(statsBySchool).length === 0 && (isLoading || isFetching) && (
            [...Array(3)].map((_, i) => (
              <Card key={i} className="bg-rotc-card animate-pulse">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="h-3.5 bg-rotc-border rounded w-28 mb-2" />
                    <div className="h-8 bg-rotc-border rounded w-16" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-rotc-border rounded w-16" />
                    <div className="h-3 bg-rotc-border rounded w-20" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          {Object.keys(statsBySchool).length === 0 && !isLoading && !isFetching && (
            <div className="col-span-full p-4 bg-rotc-bg rounded-xl border border-rotc-border text-center text-rotc-textMuted text-sm">
              No data for this status.
            </div>
          )}
        </div>

        <Card>
          <CardHeader title="Enrollment Requests">
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-rotc-textMuted">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Live
                  {dataUpdatedAt > 0 && (
                    <span className="hidden sm:inline">· {new Date(dataUpdatedAt).toLocaleTimeString()}</span>
                  )}
                </div>
                <button
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="p-1.5 rounded-lg text-rotc-textMuted hover:bg-rotc-cardHover hover:text-rotc-text transition-colors disabled:opacity-50"
                  title="Refresh now"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryEmails}
                isLoading={isRetryingEmails}
                className="border-yellow-600/30 text-yellow-600 hover:bg-yellow-600/10"
              >
                <RefreshCw className="h-4.5 w-4.5 mr-2 text-yellow-600" /> Retry Failed Emails
              </Button>
              <div className="flex border border-rotc-border rounded-lg overflow-hidden">
                {tabs.map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-4 py-1.5 text-xs font-medium capitalize transition-colors flex items-center gap-1.5 ${
                      tab === t ? 'bg-rotc-accent text-white' : 'text-rotc-textMuted hover:bg-rotc-cardHover'
                    }`}
                  >
                    {t}
                    {tabCounts[t] > 0 && (
                      <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                        tab === t ? 'bg-white/20 text-white' : t === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-rotc-border text-rotc-textMuted'
                      }`}>
                        {tabCounts[t]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table
              headers={tab === 'pending' 
                ? ['ID Number', 'Name', 'School', 'Role', 'MS Class', 'Submitted', 'Actions']
                : tab === 'rejected'
                  ? ['ID Number', 'Name', 'School', 'Role', 'MS Class', 'Submitted', 'Reason', 'Processed']
                  : ['ID Number', 'Name', 'School', 'Role', 'MS Class', 'Submitted', 'Processed', 'Actions']
              }
              isLoading={isLoading}
              data={currentRequests}
              keyExtractor={(r) => r.id}
              renderRow={(r) => (
                <>
                  <td className="p-4 text-sm font-medium text-rotc-text">{r.id_number}</td>
                  <td className="p-4 text-sm text-rotc-text">
                    {r.first_name} {r.middle_initial ? r.middle_initial + '.' : ''} {r.last_name}{r.suffix && r.suffix !== 'N/A' ? ' ' + r.suffix : ''}
                  </td>
                  <td className="p-4 text-sm text-rotc-textMuted">{r.school}</td>
                  <td className="p-4">
                    <Badge status={r.role === 'officer' ? 'info' : 'default'} label={r.role === 'officer' ? 'Officer' : 'Cadet'} />
                  </td>
                  <td className="p-4 text-sm text-rotc-textMuted">{r.ms_subject || '—'}</td>
                  <td className="p-4 text-sm text-rotc-textMuted">{format(new Date(r.created_at), 'MMM d, yyyy')}</td>
                  {tab === 'pending' ? (
                    <>
                      <td className="p-4">
                        <Button variant="outline" size="sm" onClick={() => setApproveItem(r)}>Review</Button>
                      </td>
                    </>
                  ) : tab === 'rejected' ? (
                    <>
                      <td className="p-4 text-sm text-rotc-danger max-w-[200px] truncate" title={r.rejection_reason || ''}>
                        {r.rejection_reason || '—'}
                      </td>
                      <td className="p-4 text-sm text-rotc-textMuted">
                        {r.reviewed_at ? format(new Date(r.reviewed_at), 'MMM d, yyyy h:mm a') : '—'}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-4 text-sm text-rotc-textMuted">
                        {r.reviewed_at ? format(new Date(r.reviewed_at), 'MMM d, yyyy h:mm a') : '—'}
                      </td>
                      <td className="p-4">
                        <Button variant="outline" size="sm" onClick={() => setApproveItem(r)}>View</Button>
                      </td>
                    </>
                  )}
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
                  <Button onClick={handleApprove} isLoading={approveMutation.isPending}>
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
            <Button variant="danger" onClick={handleReject} isLoading={rejectMutation.isPending} disabled={!rejectReason.trim()}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}

import { useSession } from '@/hooks/useSession'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { useState, useMemo, useEffect } from 'react'
import { 
  useEnrollmentRequests, 
  useApproveEnrollment, 
  useRejectEnrollment,
  useBulkApproveEnrollments,
  useBulkRejectEnrollments,
  useExportEnrollments,
  useArchiveEnrollments
} from '@/hooks/queries/useEnrollment'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Check, X, Download, AlertCircle, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react'

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
  const [schoolFilter, setSchoolFilter] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [sort, setSort] = useState<{ by: string, order: 'asc' | 'desc' }>({
    by: 'created_at',
    order: 'asc'
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const {
    data: {
      data: requests = [],
      count = 0,
      summary = { pending: 0, approved: 0, rejected: 0 },
      duplicates = [],
      existingAccounts = [],
      statsBySchool = {},
      allSchools = [],
      emailQueueCount = 0
    } = {
      data: [],
      count: 0,
      summary: { pending: 0, approved: 0, rejected: 0 },
      duplicates: [],
      existingAccounts: [],
      statsBySchool: {},
      allSchools: [],
      emailQueueCount: 0
    },
    isLoading,
    isFetching,
    dataUpdatedAt,
    refetch
  } = useEnrollmentRequests(tab, debouncedSearch, page, pageSize, sort.by, sort.order, schoolFilter)

  const [isProcessingEmails, setIsProcessingEmails] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const approveMutation = useApproveEnrollment()
  const rejectMutation = useRejectEnrollment()
  const bulkApproveMutation = useBulkApproveEnrollments()
  const bulkRejectMutation = useBulkRejectEnrollments()
  const archiveMutation = useArchiveEnrollments()

  const [approveItem, setApproveItem] = useState<any | null>(null)
  const [rejectItem, setRejectItem] = useState<any | null>(null)
  const [isBulkRejectModalOpen, setIsBulkRejectModalOpen] = useState(false)
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false)
  const [academicYear, setAcademicYear] = useState(format(new Date(), 'yyyy') + '-' + (parseInt(format(new Date(), 'yyyy')) + 1))
  const [rejectReason, setRejectReason] = useState('')

  // Clear selection when tab or page changes
  useEffect(() => {
    setSelectedIds([])
  }, [tab, page, debouncedSearch, sort, schoolFilter])

  const exportMutation = useExportEnrollments()

  const exportCSV = async () => {
    toast.info(`Preparing full export for ${tab}...`)

    let allData = []
    try {
      allData = await exportMutation.mutateAsync({ status: tab, search: debouncedSearch })
    } catch (err: any) {
      return toast.error("Failed to fetch full data: " + err.message)
    }

    if (allData.length === 0) return toast.error('No records to export in this tab.')

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
    const sorted = [...allData].sort((a, b) => {
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

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return
    try {
      const result = await bulkApproveMutation.mutateAsync(selectedIds)
      toast.success(`Successfully approved ${result.success} requests! ${result.failed} failed.`)
      setSelectedIds([])
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleBulkReject = async () => {
    if (selectedIds.length === 0 || !rejectReason.trim()) return
    try {
      const result = await bulkRejectMutation.mutateAsync({ requestIds: selectedIds, reason: rejectReason })
      toast.success(`Successfully rejected ${result.success} requests! ${result.failed} failed.`)
      setSelectedIds([])
      setRejectReason('')
      setIsBulkRejectModalOpen(false)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleArchive = async (allProcessed = false) => {
    if (!academicYear.trim()) return toast.error('Academic Year is required')
    if (!allProcessed && selectedIds.length === 0) return

    try {
      const result = await archiveMutation.mutateAsync({
        requestIds: allProcessed ? undefined : selectedIds,
        academicYear,
        archiveAllProcessed: allProcessed
      })
      toast.success(result.message)
      setSelectedIds([])
      setIsArchiveModalOpen(false)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === requests.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(requests.map(r => r.id))
    }
  }

  const handleSort = (field: string) => {
    setSort(prev => ({
      by: field,
      order: prev.by === field && prev.order === 'asc' ? 'desc' : 'asc'
    }))
    setPage(1)
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sort.by !== field) return null
    return sort.order === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const tabs = ['pending', 'approved', 'rejected'] as const

  // Global counts for stats card
  const globalTotal = summary.pending + summary.approved + summary.rejected

  return (
    <AppLayout title="Enrollment Management">
      <div className="space-y-6">
        
        {/* Global Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-rotc-card border-rotc-accent/30">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-rotc-textMuted uppercase tracking-wider">Total Enrollment</p>
              <p className="text-3xl font-bold text-rotc-accent mt-1">{globalTotal}</p>
            </CardContent>
          </Card>
          <Card className="bg-rotc-card">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-rotc-textMuted uppercase tracking-wider">Pending Approval</p>
              <p className="text-3xl font-bold text-yellow-500 mt-1">{summary.pending}</p>
            </CardContent>
          </Card>
          <Card className="bg-rotc-card">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-rotc-textMuted uppercase tracking-wider">Approved Cadets</p>
              <p className="text-3xl font-bold text-green-500 mt-1">{summary.approved}</p>
            </CardContent>
          </Card>
          <Card className="bg-rotc-card">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-rotc-textMuted uppercase tracking-wider">Rejected Requests</p>
              <p className="text-3xl font-bold text-rotc-danger mt-1">{summary.rejected}</p>
            </CardContent>
          </Card>
        </div>

        {/* Global Stats by School */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(statsBySchool).map(([school, stats]: [string, any]) => (
            <Card key={school} className="bg-rotc-card border-rotc-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-rotc-text">{school}</p>
                  <p className="text-2xl font-black text-rotc-accent">{stats.Total}</p>
                </div>
                <div className="text-right text-xs text-rotc-textMuted space-y-0.5">
                  <p>Male: <span className="text-rotc-text font-medium">{stats.Male}</span></p>
                  <p>Female: <span className="text-rotc-text font-medium">{stats.Female}</span></p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="relative overflow-hidden">
          {/* Performance Loading Bar */}
          {isFetching && (
            <div className="absolute top-0 left-0 w-full h-0.5 bg-rotc-accent/20">
              <div className="h-full bg-rotc-accent animate-progress-fast" style={{ width: '30%' }} />
            </div>
          )}
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full">
              <h3 className="text-base font-semibold text-rotc-text shrink-0">Enrollment Requests</h3>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <div className="flex items-center gap-2 text-xs text-rotc-textMuted whitespace-nowrap bg-rotc-bg/50 px-2 py-1 rounded-lg border border-rotc-border">
                  <select
                    value={pageSize}
                    onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                    className="bg-transparent border-none p-0 text-rotc-text focus:ring-0 cursor-pointer font-bold"
                  >
                    {[10, 20, 50, 100, 200].map(sz => <option key={sz} value={sz} className="bg-rotc-bg text-rotc-text">{sz}</option>)}
                  </select>
                </div>

                <div className="relative flex-1 min-w-[200px]">
                  <Input
                    placeholder="Search name or ID..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                    className={`h-9 pr-8 transition-opacity ${isFetching ? 'opacity-70' : 'opacity-100'}`}
                  />
                  {isFetching && <RefreshCw className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-rotc-accent" />}
                </div>

                <select
                  value={schoolFilter}
                  onChange={(e) => {
                    setSchoolFilter(e.target.value)
                    setPage(1)
                  }}
                  className="h-9 px-3 text-xs font-medium bg-rotc-bg border border-rotc-border rounded-lg text-rotc-text focus:outline-none focus:ring-1 focus:ring-rotc-accent cursor-pointer"
                >
                  <option value="">All Schools</option>
                  {(allSchools.length > 0 ? allSchools : Object.keys(statsBySchool)).sort().map((s: string) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                {(search || schoolFilter) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSearch(''); setSchoolFilter(''); setPage(1); }}
                    className="h-9 text-xs"
                  >
                    Reset
                  </Button>
                )}
              </div>
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
              <Button
                variant="outline"
                size="sm"
                className="relative"
                onClick={async () => {
                  setIsProcessingEmails(true);
                  try {
                    const { data: sessionData } = await supabase.auth.getSession();
                    const token = sessionData.session?.access_token;
                    const res = await fetch('/api/cron/process-emails', {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const result = await res.json();
                    if (res.ok) {
                      if ((result.sent ?? 0) === 0 && (result.failed ?? 0) === 0) {
                        toast.success("Email queue is currently empty.");
                      } else {
                        toast.success(`Email queue processed: ${result.sent ?? 0} sent, ${result.failed ?? 0} failed.`);
                      }
                    } else {
                      toast.error(result.error || "Failed to process emails");
                    }
                  } catch (err: any) {
                    toast.error(err.message);
                  } finally {
                    setIsProcessingEmails(false);
                  }
                }}
                isLoading={isProcessingEmails}
                title="Manually trigger email sending"
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Process Emails
                {emailQueueCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rotc-danger text-[10px] font-bold text-white ring-2 ring-rotc-card">
                    {emailQueueCount > 99 ? '99+' : emailQueueCount}
                  </span>
                )}
              </Button>
              {tab === 'pending' && (selectedIds?.length ?? 0) > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleBulkApprove}
                    isLoading={bulkApproveMutation.isPending}
                    disabled={bulkRejectMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-2" /> Approve ({selectedIds.length})
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setIsBulkRejectModalOpen(true)}
                    isLoading={bulkRejectMutation.isPending}
                    disabled={bulkApproveMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-2" /> Reject ({selectedIds.length})
                  </Button>
                </div>
              )}
              {tab !== 'pending' && (
                <div className="flex gap-2">
                  {selectedIds.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsArchiveModalOpen(true)}
                    >
                      Archive Selected ({selectedIds.length})
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsArchiveModalOpen(true)}
                    title="Move all approved/rejected records to historical archives"
                  >
                    Archive All {tab}
                  </Button>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={exportCSV}
                isLoading={exportMutation.isPending}
              >
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
              <div className="flex border border-rotc-border rounded-lg overflow-hidden">
                {tabs.map(t => (
                  <button
                    key={t}
                    onClick={() => {
                      setTab(t)
                      setPage(1)
                      setSearch('')
                    }}
                    className={`px-4 py-1.5 text-xs font-medium capitalize transition-colors flex items-center gap-1.5 ${
                      tab === t ? 'bg-rotc-accent text-white' : 'text-rotc-textMuted hover:bg-rotc-cardHover'
                    }`}
                  >
                    {t}
                    <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                      tab === t ? 'bg-white/20 text-white' : 'bg-rotc-border text-rotc-textMuted'
                    }`}>
                      {summary[t as keyof typeof summary]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table
              headers={tab !== 'archived' // reusing archived tab name logic elsewhere if needed
                ? [
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-rotc-border bg-rotc-bg text-rotc-accent focus:ring-rotc-accent cursor-pointer"
                      checked={selectedIds.length === (requests?.length ?? 0) && (requests?.length ?? 0) > 0}
                        onChange={toggleSelectAll}
                      />
                    </div>,
                    <button onClick={() => handleSort('id_number')} className="flex items-center gap-1 hover:text-rotc-text transition-colors">ID Number <SortIcon field="id_number" /></button>,
                    <button onClick={() => handleSort('last_name')} className="flex items-center gap-1 hover:text-rotc-text transition-colors">Name <SortIcon field="last_name" /></button>,
                    <button onClick={() => handleSort('school')} className="flex items-center gap-1 hover:text-rotc-text transition-colors">School <SortIcon field="school" /></button>,
                    'Role',
                    'MS Class',
                    <button onClick={() => handleSort('created_at')} className="flex items-center gap-1 hover:text-rotc-text transition-colors">Submitted <SortIcon field="created_at" /></button>,
                    'Actions'
                  ]
                : tab === 'rejected'
                  ? [
                      <button onClick={() => handleSort('id_number')} className="flex items-center gap-1 hover:text-rotc-text transition-colors">ID Number <SortIcon field="id_number" /></button>,
                      <button onClick={() => handleSort('last_name')} className="flex items-center gap-1 hover:text-rotc-text transition-colors">Name <SortIcon field="last_name" /></button>,
                      <button onClick={() => handleSort('school')} className="flex items-center gap-1 hover:text-rotc-text transition-colors">School <SortIcon field="school" /></button>,
                      'Role', 'MS Class',
                      <button onClick={() => handleSort('created_at')} className="flex items-center gap-1 hover:text-rotc-text transition-colors">Submitted <SortIcon field="created_at" /></button>,
                      'Reason',
                      <button onClick={() => handleSort('reviewed_at')} className="flex items-center gap-1 hover:text-rotc-text transition-colors">Processed <SortIcon field="reviewed_at" /></button>
                    ]
                  : [
                      <button onClick={() => handleSort('id_number')} className="flex items-center gap-1 hover:text-rotc-text transition-colors">ID Number <SortIcon field="id_number" /></button>,
                      <button onClick={() => handleSort('last_name')} className="flex items-center gap-1 hover:text-rotc-text transition-colors">Name <SortIcon field="last_name" /></button>,
                      <button onClick={() => handleSort('school')} className="flex items-center gap-1 hover:text-rotc-text transition-colors">School <SortIcon field="school" /></button>,
                      'Role', 'MS Class',
                      <button onClick={() => handleSort('created_at')} className="flex items-center gap-1 hover:text-rotc-text transition-colors">Submitted <SortIcon field="created_at" /></button>,
                      <button onClick={() => handleSort('reviewed_at')} className="flex items-center gap-1 hover:text-rotc-text transition-colors">Processed <SortIcon field="reviewed_at" /></button>,
                      'Actions'
                    ]
              }
              isLoading={isLoading}
              data={requests}
              keyExtractor={(r) => r.id}
              rowClassName={(r) => duplicates.includes(r.id_number) ? 'bg-yellow-500/10' : ''}
              renderRow={(r) => (
                <>
                  <td className="p-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-rotc-border bg-rotc-bg text-rotc-accent focus:ring-rotc-accent cursor-pointer"
                        checked={selectedIds.includes(r.id)}
                        onChange={() => toggleSelect(r.id)}
                      />
                    </div>
                  </td>
                  <td className="p-4 text-sm font-medium text-rotc-text">
                    <div className="flex items-center gap-2">
                      {r.id_number}
                      {existingAccounts.includes(r.id_number) ? (
                        <span className="flex h-2 w-2 rounded-full bg-green-500" title="Account already exists" />
                      ) : duplicates.includes(r.id_number) ? (
                        <span className="flex h-2 w-2 rounded-full bg-yellow-500 animate-pulse" title="Potential duplicate submission" />
                      ) : null}
                    </div>
                  </td>
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

          {/* Pagination Controls */}
          {count > pageSize && (
            <div className="px-6 py-4 border-t border-rotc-border flex items-center justify-between bg-rotc-card/30">
              <p className="text-xs text-rotc-textMuted">
                Showing <span className="text-rotc-text font-medium">{requests?.length ?? 0}</span> of <span className="text-rotc-text font-medium">{count}</span> results
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1 || isFetching}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <div className="flex items-center px-4 text-xs font-medium text-rotc-text">
                  Page {page} of {Math.ceil(count / pageSize)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= Math.ceil(count / pageSize) || isFetching}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Approve/Review Modal */}
      <Modal isOpen={!!approveItem} onClose={() => setApproveItem(null)} title="Review Enrollment">
        {approveItem && (
          <div className="space-y-4 mt-4">
            {existingAccounts.includes(approveItem.id_number) ? (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex gap-2 items-start text-xs text-green-600 font-medium">
                <Check className="h-4 w-4 flex-shrink-0" />
                <p>This user already has an active account. Approving again will re-send credentials but will not create a duplicate user profile.</p>
              </div>
            ) : duplicates.includes(approveItem.id_number) ? (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex gap-2 items-start text-xs text-yellow-600">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p><strong>Warning:</strong> This ID Number has multiple submissions. Please verify which one is correct before approving.</p>
              </div>
            ) : null}

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
            placeholder="Enter reason for rejection"
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

      {/* Archive Modal */}
      <Modal isOpen={isArchiveModalOpen} onClose={() => setIsArchiveModalOpen(false)} title="Move to Historical Archives">
        <div className="space-y-4 mt-4">
          <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-rotc-accent/10 border border-rotc-accent/20 text-sm text-rotc-accent">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>Archiving moves processed records to historical storage for CHED compliance. They will no longer appear in the active dashboard.</span>
          </div>

          <Input
            label="Folder Name"
            placeholder="Enter Folder Name"
            value={academicYear}
            onChange={e => setAcademicYear(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-6">
            <Button variant="outline" onClick={() => setIsArchiveModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => handleArchive(selectedIds.length === 0)} isLoading={archiveMutation.isPending} disabled={!academicYear.trim()}>
              Move to Archive {selectedIds.length > 0 ? `(${selectedIds.length})` : `All ${tab}`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Reject Modal */}
      <Modal isOpen={isBulkRejectModalOpen} onClose={() => { setIsBulkRejectModalOpen(false); setRejectReason(''); }} title={`Reject ${selectedIds.length} Enrollments`}>
        <div className="space-y-4 mt-4">
          <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-rotc-danger/10 border border-rotc-danger/20 text-sm text-rotc-danger">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>This will send rejection emails to all {selectedIds.length} selected applicants.</span>
          </div>

          <Input
            label="Rejection Reason (Applied to all)"
            placeholder="Enter reason for rejection"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-6">
            <Button variant="outline" onClick={() => { setIsBulkRejectModalOpen(false); setRejectReason(''); }}>Cancel</Button>
            <Button variant="danger" onClick={handleBulkReject} isLoading={bulkRejectMutation.isPending} disabled={!rejectReason.trim()}>
              Confirm Bulk Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}

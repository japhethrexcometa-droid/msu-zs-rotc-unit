import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent } from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useAttendanceByUser } from '@/hooks/queries/useAttendance'
import { useState, useMemo } from 'react'
import { format, isSameMonth } from 'date-fns'
import { exportAttendanceReport } from '@/lib/export'
import { Check, X, Clock, AlertCircle, FileDown } from 'lucide-react'

export default function AttendancePage() {
  const session = useSession()
  const { data: attendance, isLoading } = useAttendanceByUser(session?.id || '')
  
  const [statusFilter, setStatusFilter] = useState('All')
  const [monthFilter, setMonthFilter] = useState('All')

  if (!session) return null

  const records = attendance ?? []

  // Extract unique months for the dropdown
  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    records.forEach((r: any) => {
      const d = new Date(r.sessions.session_date)
      months.add(format(d, 'yyyy-MM'))
    })
    return Array.from(months).sort().reverse()
  }, [records])

  const filteredRecords = records.filter((r: any) => {
    const statusMatch = statusFilter === 'All' || r.status === statusFilter.toLowerCase()
    
    let monthMatch = true
    if (monthFilter !== 'All') {
      const rDate = new Date(r.sessions.session_date)
      const [y, m] = monthFilter.split('-').map(Number)
      monthMatch = rDate.getFullYear() === y && rDate.getMonth() + 1 === m
    }
    
    return statusMatch && monthMatch
  })

  // Stats over the ENTIRE dataset (not just filtered)
  const stats = {
    present: records.filter(r => r.status === 'present').length,
    late: records.filter(r => r.status === 'late').length,
    absent: records.filter(r => r.status === 'absent').length,
    excused: records.filter(r => r.status === 'excused').length,
  }

  const handleExport = () => {
    // Transform into a flat format for export
    const exportData = filteredRecords.map((r: any) => ({
      'Date': format(new Date(r.sessions.session_date), 'MMM d, yyyy'),
      'Session Title': r.sessions.title,
      'Location': r.sessions.location || '',
      'Status': r.status.toUpperCase(),
      'Scan Time': r.scanned_at ? format(new Date(r.scanned_at), 'h:mm a') : 'N/A',
      'Notes': r.notes || ''
    }))
    exportAttendanceReport(exportData, `My_Attendance_${format(new Date(), 'yyyy-MM-dd')}`)
  }

  return (
    <AppLayout title="My Attendance History">
      <div className="space-y-6">
        
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat value={stats.present} label="Present" icon={<Check className="h-4 w-4 text-rotc-success" />} />
          <Stat value={stats.late} label="Late" icon={<Clock className="h-4 w-4 text-rotc-warning" />} />
          <Stat value={stats.absent} label="Absent" icon={<X className="h-4 w-4 text-rotc-danger" />} />
          <Stat value={stats.excused} label="Excused" icon={<AlertCircle className="h-4 w-4 text-rotc-info" />} />
        </div>

        {/* Filters & Table */}
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row gap-4 border-b border-rotc-border">
            <div className="flex-1">
              <label className="text-xs font-medium text-rotc-textMuted mb-1 block">Filter by Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-rotc-bg border border-rotc-border rounded-lg text-sm text-rotc-text focus:outline-none focus:border-rotc-accent"
              >
                <option value="All">All</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
                <option value="Excused">Excused</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-rotc-textMuted mb-1 block">Filter by Month</label>
              <select
                value={monthFilter}
                onChange={e => setMonthFilter(e.target.value)}
                className="w-full px-3 py-2 bg-rotc-bg border border-rotc-border rounded-lg text-sm text-rotc-text focus:outline-none focus:border-rotc-accent"
              >
                <option value="All">All Months</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{format(new Date(m + '-01'), 'MMMM yyyy')}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleExport} disabled={filteredRecords.length === 0}>
                <FileDown className="h-4 w-4 mr-2" /> Export
              </Button>
            </div>
          </CardContent>
          <CardContent className="p-0">
            <Table
              headers={['Date', 'Session Name', 'Location', 'Status', 'Scan Time', 'Notes']}
              isLoading={isLoading}
              data={filteredRecords}
              emptyMessage="No attendance records found matching filters."
              keyExtractor={(r: any) => r.id}
              renderRow={(r: any) => (
                <>
                  <td className="p-4 text-sm font-medium text-rotc-text whitespace-nowrap">
                    {format(new Date(r.sessions.session_date), 'MMM d, yyyy')}
                  </td>
                  <td className="p-4 text-sm text-rotc-text">{r.sessions.title}</td>
                  <td className="p-4 text-sm text-rotc-textMuted">{r.sessions.location || '—'}</td>
                  <td className="p-4">
                    <Badge 
                      status={r.status === 'present' ? 'success' : r.status === 'late' ? 'warning' : r.status === 'absent' ? 'danger' : 'info'} 
                      label={r.status.charAt(0).toUpperCase() + r.status.slice(1)} 
                    />
                  </td>
                  <td className="p-4 text-sm text-rotc-textMuted whitespace-nowrap">
                    {r.scanned_at ? format(new Date(r.scanned_at), 'h:mm a') : '—'}
                  </td>
                  <td className="p-4 text-sm text-rotc-textMuted">{r.notes || '—'}</td>
                </>
              )}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

function Stat({ value, label, icon }: { value: number; label: string; icon: React.ReactNode }) {
  return (
    <div className="bg-rotc-card border border-rotc-border p-4 rounded-xl flex items-center justify-between">
      <div>
        <p className="text-2xl font-bold text-rotc-text">{value}</p>
        <p className="text-xs font-medium text-rotc-textMuted uppercase">{label}</p>
      </div>
      <div className="w-8 h-8 rounded-lg bg-rotc-bg flex items-center justify-center">
        {icon}
      </div>
    </div>
  )
}

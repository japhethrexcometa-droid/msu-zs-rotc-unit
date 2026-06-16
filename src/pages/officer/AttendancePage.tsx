import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useAllSessions, useAttendanceBySession, useUpdateAttendanceStatus } from '@/hooks/queries/useAttendance'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { exportAttendanceReport } from '@/lib/export'
import { Check, X, Clock, AlertCircle } from 'lucide-react'

export default function AttendancePage() {
  const session = useSession()
  const { data: sessions, isLoading: loadingSessions } = useAllSessions()
  
  const [selectedSession, setSelectedSession] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('All')

  // Wait until sessions are loaded, then default to the first one
  useEffect(() => {
    if (sessions && sessions.length > 0 && !selectedSession) {
      setSelectedSession(sessions[0].id)
    }
  }, [sessions, selectedSession])

  const { data: records, isLoading: loadingRecords } = useAttendanceBySession(selectedSession)
  const updateStatusMutation = useUpdateAttendanceStatus()

  if (!session) return null

  // Filter records to ONLY show cadets from the officer's platoon
  const myPlatoonRecords = (records ?? []).filter(r => {
    const user = r.users as unknown as { platoon: string }
    return user.platoon === session.platoon
  })

  const filteredRecords = myPlatoonRecords.filter(r => {
    return statusFilter === 'All' || r.status === statusFilter.toLowerCase()
  })

  const stats = {
    present: myPlatoonRecords.filter(r => r.status === 'present').length,
    late: myPlatoonRecords.filter(r => r.status === 'late').length,
    absent: myPlatoonRecords.filter(r => r.status === 'absent').length,
    excused: myPlatoonRecords.filter(r => r.status === 'excused').length,
  }

  const handleUpdateStatus = (recordId: string, status: any) => {
    updateStatusMutation.mutate({ recordId, status }, {
      onSuccess: () => toast.success('Status updated')
    })
  }

  return (
    <AppLayout title={`${session.platoon} Platoon Attendance`}>
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-xs font-medium text-rotc-textMuted mb-1 block">Select Session</label>
              <select
                value={selectedSession}
                onChange={e => setSelectedSession(e.target.value)}
                className="w-full px-3 py-2 bg-rotc-bg border border-rotc-border rounded-lg text-sm text-rotc-text focus:outline-none focus:border-rotc-accent"
              >
                {!sessions?.length && <option value="">Loading...</option>}
                {sessions?.map(s => (
                  <option key={s.id} value={s.id}>{format(new Date(s.session_date), 'MMM d, yyyy')} - {s.title}</option>
                ))}
              </select>
            </div>
            {selectedSession && (
              <>
                <div className="w-full sm:w-48">
                  <label className="text-xs font-medium text-rotc-textMuted mb-1 block">Filter Status</label>
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
                <div className="flex items-end">
                  <Button onClick={() => exportAttendanceReport(filteredRecords, `${session.platoon}_Attendance_${selectedSession}`)}>
                    Export
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {selectedSession && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat value={stats.present} label="Present" icon={<Check className="h-4 w-4 text-rotc-success" />} />
              <Stat value={stats.late} label="Late" icon={<Clock className="h-4 w-4 text-rotc-warning" />} />
              <Stat value={stats.absent} label="Absent" icon={<X className="h-4 w-4 text-rotc-danger" />} />
              <Stat value={stats.excused} label="Excused" icon={<AlertCircle className="h-4 w-4 text-rotc-info" />} />
            </div>

            <Card>
              <CardContent className="p-0">
                <Table
                  headers={['ID Number', 'Full Name', 'Time', 'Notes', 'Status', 'Change Status']}
                  isLoading={loadingRecords}
                  data={filteredRecords}
                  keyExtractor={(r) => r.id}
                  renderRow={(r) => {
                    const user = r.users as unknown as { id_number: string, full_name: string }
                    return (
                      <>
                        <td className="p-4 text-sm font-medium text-rotc-text">{user.id_number}</td>
                        <td className="p-4 text-sm text-rotc-text">{user.full_name}</td>
                        <td className="p-4 text-sm text-rotc-textMuted">{r.scanned_at ? format(new Date(r.scanned_at), 'h:mm a') : '—'}</td>
                        <td className="p-4 text-sm text-rotc-textMuted">{r.notes || '—'}</td>
                        <td className="p-4">
                          <Badge 
                            status={r.status === 'present' ? 'success' : r.status === 'late' ? 'warning' : r.status === 'absent' ? 'danger' : 'info'} 
                            label={r.status.toUpperCase()} 
                          />
                        </td>
                        <td className="p-4">
                          <select
                            value={r.status}
                            onChange={(e) => handleUpdateStatus(r.id, e.target.value)}
                            className="px-2 py-1 bg-rotc-bg border border-rotc-border rounded text-xs text-rotc-text focus:outline-none"
                            disabled={updateStatusMutation.isPending}
                          >
                            <option value="present">Present</option>
                            <option value="late">Late</option>
                            <option value="absent">Absent</option>
                            <option value="excused">Excused</option>
                          </select>
                        </td>
                      </>
                    )
                  }}
                />
              </CardContent>
            </Card>
          </>
        )}
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

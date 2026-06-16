import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useAllSessions, useAttendanceBySession, useUpdateAttendanceStatus, useMarkAbsent } from '@/hooks/queries/useAttendance'
import { useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { exportAttendanceReport } from '@/lib/export'
import { Check, X, Clock, AlertCircle } from 'lucide-react'

export default function AttendancePage() {
  const session = useSession()
  const { data: sessions, isLoading: loadingSessions } = useAllSessions()
  
  const [selectedSession, setSelectedSession] = useState<string>('')
  const [platoonFilter, setPlatoonFilter] = useState<string>('All')

  const { data: records, isLoading: loadingRecords } = useAttendanceBySession(selectedSession)
  const updateStatusMutation = useUpdateAttendanceStatus()
  const markAbsentMutation = useMarkAbsent()

  if (!session) return null

  const platoons = ['All', 'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo']

  const filteredRecords = (records ?? []).filter(r => {
    // Note: r.users actually contains user info due to Supabase join
    const user = r.users as unknown as { id_number: string, full_name: string, platoon: string }
    return platoonFilter === 'All' || user.platoon === platoonFilter
  })

  const stats = {
    present: filteredRecords.filter(r => r.status === 'present').length,
    late: filteredRecords.filter(r => r.status === 'late').length,
    absent: filteredRecords.filter(r => r.status === 'absent').length,
    excused: filteredRecords.filter(r => r.status === 'excused').length,
  }

  const handleUpdateStatus = (recordId: string, status: any) => {
    updateStatusMutation.mutate({ recordId, status }, {
      onSuccess: () => toast.success('Status updated')
    })
  }

  return (
    <AppLayout title="Attendance Records">
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
                <option value="">-- Choose a Session --</option>
                {sessions?.map(s => (
                  <option key={s.id} value={s.id}>{format(new Date(s.session_date), 'MMM d, yyyy')} - {s.title}</option>
                ))}
              </select>
            </div>
            {selectedSession && (
              <>
                <div className="w-full sm:w-48">
                  <label className="text-xs font-medium text-rotc-textMuted mb-1 block">Filter Platoon</label>
                  <select
                    value={platoonFilter}
                    onChange={e => setPlatoonFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-rotc-bg border border-rotc-border rounded-lg text-sm text-rotc-text focus:outline-none focus:border-rotc-accent"
                  >
                    {platoons.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm('Mark all missing cadets as absent?')) {
                        markAbsentMutation.mutate(selectedSession, { onSuccess: () => toast.success('Marked absent') })
                      }
                    }}
                    isLoading={markAbsentMutation.isPending}
                  >
                    Mark Absents
                  </Button>
                  <Button onClick={() => exportAttendanceReport(filteredRecords, `Attendance_${selectedSession}`)}>
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
                  headers={['ID Number', 'Full Name', 'Platoon', 'Time', 'Status', 'Change Status']}
                  isLoading={loadingRecords}
                  data={filteredRecords}
                  keyExtractor={(r) => r.id}
                  renderRow={(r) => {
                    const user = r.users as unknown as { id_number: string, full_name: string, platoon: string }
                    return (
                      <>
                        <td className="p-4 text-sm font-medium text-rotc-text">{user.id_number}</td>
                        <td className="p-4 text-sm text-rotc-text">{user.full_name}</td>
                        <td className="p-4 text-sm text-rotc-textMuted">{user.platoon || '—'}</td>
                        <td className="p-4 text-sm text-rotc-textMuted">{r.scanned_at ? format(new Date(r.scanned_at), 'h:mm a') : '—'}</td>
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

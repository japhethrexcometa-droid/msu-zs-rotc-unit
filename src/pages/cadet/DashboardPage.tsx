import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import AttendanceRateGauge from '@/components/cadet/AttendanceRateGauge'
import { useAttendanceByUser, useActiveSessions } from '@/hooks/queries/useAttendance'
import { useAnnouncements } from '@/hooks/queries/useAnnouncements'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, differenceInMinutes } from 'date-fns'
import { Pin, QrCode, Bell } from 'lucide-react'

export default function DashboardPage() {
  const session = useSession()
  const navigate = useNavigate()

  const { data: attendance, isLoading: loadingAttendance } = useAttendanceByUser(session?.id || '')
  const { data: activeSessions } = useActiveSessions()
  const { data: announcements, isLoading: loadingAnnouncements } = useAnnouncements()

  const [activeSessionElapsed, setActiveSessionElapsed] = useState<number>(0)

  useEffect(() => {
    if (activeSessions && activeSessions.length > 0) {
      const start = new Date(activeSessions[0].session_date)
      const updateElapsed = () => setActiveSessionElapsed(differenceInMinutes(new Date(), start))
      updateElapsed()
      const interval = setInterval(updateElapsed, 60000)
      return () => clearInterval(interval)
    }
  }, [activeSessions])

  if (!session) return null

  const activeSession = activeSessions?.[0]
  const records = attendance ?? []
  
  const stats = {
    present: records.filter(r => r.status === 'present').length,
    late: records.filter(r => r.status === 'late').length,
    absent: records.filter(r => r.status === 'absent').length,
    excused: records.filter(r => r.status === 'excused').length,
  }
  const total = stats.present + stats.late + stats.absent
  const rate = total === 0 ? 100 : ((stats.present + (stats.late * 0.5)) / total) * 100

  const myAnnouncements = announcements?.filter(a => ['all', 'cadet'].includes(a.target_role)) ?? []

  return (
    <AppLayout title="My Dashboard">
      <div className="space-y-6">
        
        {/* Active Session Alert */}
        {activeSession && (
          <div className="bg-rotc-success/10 border border-rotc-success rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse-slow shadow-[0_0_15px_rgba(76,175,80,0.2)]">
            <div>
              <h3 className="text-lg font-bold text-rotc-success flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rotc-success animate-ping" />
                Session Active — Scan Now!
              </h3>
              <p className="text-sm text-rotc-text mt-1">{activeSession.title} · Opened {activeSessionElapsed} mins ago</p>
            </div>
            <Button onClick={() => navigate('/cadet/digital-id')} variant="primary" className="bg-rotc-success hover:bg-green-600 text-white shadow-lg shadow-rotc-success/30 w-full sm:w-auto">
              <QrCode className="h-4 w-4 mr-2" /> Show My ID
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attendance Summary */}
          <Card className="lg:col-span-2">
            <CardHeader title="My Attendance Summary" />
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center justify-around gap-8 py-4">
                <AttendanceRateGauge rate={loadingAttendance ? 100 : rate} />
                
                <div className="grid grid-cols-2 gap-4 flex-1 w-full">
                  <StatBox label="Present" value={stats.present} color="text-rotc-success" bg="bg-rotc-success/10" />
                  <StatBox label="Late" value={stats.late} color="text-rotc-warning" bg="bg-rotc-warning/10" />
                  <StatBox label="Absent" value={stats.absent} color="text-rotc-danger" bg="bg-rotc-danger/10" />
                  <StatBox label="Excused" value={stats.excused} color="text-rotc-info" bg="bg-rotc-info/10" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card className="flex flex-col h-full">
            <CardHeader title="Announcements" icon={<Bell className="h-5 w-5 text-rotc-textMuted" />} />
            <CardContent className="flex-1 overflow-auto max-h-[300px]">
              {loadingAnnouncements ? (
                <div className="p-4 text-center text-rotc-textMuted text-sm">Loading...</div>
              ) : !myAnnouncements.length ? (
                <div className="flex flex-col items-center justify-center h-full opacity-50 py-8">
                  <Bell className="h-8 w-8 mb-2" />
                  <p className="text-sm">No announcements</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myAnnouncements.slice(0, 3).map(a => (
                    <div key={a.id} className="p-3 bg-rotc-bg rounded-lg border border-rotc-border">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-rotc-text flex items-center gap-1.5 leading-tight">
                          {a.is_pinned && <Pin className="h-3 w-3 text-rotc-warning fill-rotc-warning flex-shrink-0" />}
                          <span className="line-clamp-1">{a.title}</span>
                        </h4>
                        <span className="text-[10px] text-rotc-textMuted flex-shrink-0">{format(new Date(a.created_at), 'MMM d')}</span>
                      </div>
                      <p className="text-xs text-rotc-textMuted line-clamp-2">{a.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Attendance */}
        <Card>
          <CardHeader 
            title="Recent Attendance" 
            action={<Button variant="ghost" size="sm" onClick={() => navigate('/cadet/attendance')}>View All</Button>} 
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-rotc-bg/60 border-y border-rotc-border text-left text-rotc-textMuted">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Session</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Scan Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rotc-border">
                {loadingAttendance ? (
                  <tr><td colSpan={4} className="p-5 text-center text-rotc-textMuted">Loading...</td></tr>
                ) : !records.length ? (
                  <tr><td colSpan={4} className="p-5 text-center text-rotc-textMuted">No attendance records</td></tr>
                ) : (
                  records.slice(0, 5).map((r: any) => (
                    <tr key={r.id} className="hover:bg-rotc-cardHover transition-colors">
                      <td className="px-5 py-3 text-rotc-text">{format(new Date(r.attendance_sessions.session_date), 'MMM d, yyyy')}</td>
                      <td className="px-5 py-3 text-rotc-text font-medium">{r.attendance_sessions.title}</td>
                      <td className="px-5 py-3">
                        <Badge 
                          status={r.status === 'present' ? 'success' : r.status === 'late' ? 'warning' : r.status === 'absent' ? 'danger' : 'info'} 
                          label={r.status} 
                        />
                      </td>
                      <td className="px-5 py-3 text-rotc-textMuted">{r.scanned_at ? format(new Date(r.scanned_at), 'h:mm a') : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </AppLayout>
  )
}

function StatBox({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`p-4 rounded-xl border border-rotc-border text-center ${bg}`}>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs font-medium text-rotc-textMuted mt-1 uppercase tracking-wider">{label}</div>
    </div>
  )
}

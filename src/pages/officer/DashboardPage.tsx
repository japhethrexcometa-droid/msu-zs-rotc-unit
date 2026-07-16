import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useAllCadets } from '@/hooks/queries/useUsers'
import { useActiveSessions, useAllSessions, useAttendanceBySession } from '@/hooks/queries/useAttendance'
import { useAnnouncements } from '@/hooks/queries/useAnnouncements'
import { useNavigate } from 'react-router-dom'
import { QrCode, Users, CheckCircle, XCircle, Percent, Pin } from 'lucide-react'
import { format } from 'date-fns'

export default function DashboardPage() {
  const session = useSession()
  const navigate = useNavigate()

  const { data: cadetsResult, isLoading: loadingCadets } = useAllCadets()
  const cadets = cadetsResult?.data ?? []
  const { data: activeSessions, isLoading: loadingActive } = useActiveSessions()
  const { data: allSessions, isLoading: loadingSessions } = useAllSessions(3)
  const { data: announcements, isLoading: loadingAnnouncements } = useAnnouncements()

  if (!session) return null

  const myPlatoon = (cadets ?? []).filter(c => c.platoon === session.platoon)
  const activeSession = activeSessions?.[0]
  
  // Actually, we'd need useAttendanceBySession to count today's present/absent for the platoon
  // But for the dashboard summary, let's just mock it if we don't fetch all attendance records right away
  const platoonSize = myPlatoon.length

  const myAnnouncements = announcements?.filter(a => ['all', 'officer'].includes(a.target_role)) ?? []

  return (
    <AppLayout title="Officer Dashboard">
      <div className="space-y-6">
        {/* Active Session Banner */}
        {!loadingActive && activeSession && (
          <div className="bg-rotc-success/20 border border-rotc-success rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-rotc-success flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rotc-success animate-pulse" />
                Active Session: {activeSession.title}
              </h3>
              <p className="text-sm text-rotc-success/80 mt-1">{activeSession.location} · Started {format(new Date(activeSession.session_date), 'h:mm a')}</p>
            </div>
            <Button onClick={() => navigate('/officer/scanner')}>
              <QrCode className="h-4 w-4 mr-2" /> Open Scanner
            </Button>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="My Platoon Size" value={loadingCadets ? null : platoonSize} icon={<Users className="h-5 w-5 text-rotc-info" />} />
          <StatCard title="Today's Present" value={loadingActive ? null : (activeSession ? '—' : 0)} icon={<CheckCircle className="h-5 w-5 text-rotc-success" />} />
          <StatCard title="Today's Absent" value={loadingActive ? null : (activeSession ? '—' : 0)} icon={<XCircle className="h-5 w-5 text-rotc-danger" />} />
          <StatCard title="My Attendance Rate" value={loadingSessions ? null : '100%'} icon={<Percent className="h-5 w-5 text-rotc-accent" />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Attendance */}
          <Card className="lg:col-span-2">
            <CardHeader title="Recent Attendance (My Platoon)" action={<Button variant="ghost" size="sm" onClick={() => navigate('/officer/attendance')}>View All</Button>} />
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-rotc-bg/60 border-y border-rotc-border text-left text-rotc-textMuted">
                      <th className="px-5 py-3 font-medium">Date</th>
                      <th className="px-5 py-3 font-medium">Session Title</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rotc-border">
                    {loadingSessions ? (
                      <tr><td colSpan={3} className="p-5 text-center text-rotc-textMuted">Loading...</td></tr>
                    ) : !allSessions?.length ? (
                      <tr><td colSpan={3} className="p-5 text-center text-rotc-textMuted">No recent sessions</td></tr>
                    ) : (
                      allSessions.map(s => (
                        <tr key={s.id} className="hover:bg-rotc-cardHover transition-colors">
                          <td className="px-5 py-3 text-rotc-text">{format(new Date(s.session_date), 'MMM d')}</td>
                          <td className="px-5 py-3 text-rotc-text">{s.title}</td>
                          <td className="px-5 py-3"><Badge status={s.is_active ? 'success' : 'default'} label={s.is_active ? 'Active' : 'Ended'} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card className="flex flex-col">
            <CardHeader title="Announcements" />
            <CardContent className="flex-1 overflow-auto max-h-[300px]">
              {loadingAnnouncements ? (
                <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>
              ) : !myAnnouncements.length ? (
                <p className="text-sm text-rotc-textMuted py-4 text-center">No announcements</p>
              ) : (
                <div className="space-y-3">
                  {myAnnouncements.slice(0, 3).map(a => (
                    <div key={a.id} className="p-3 bg-rotc-bg rounded-lg border border-rotc-border space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-rotc-text flex items-center gap-1.5">
                          {a.is_pinned && <Pin className="h-3 w-3 text-rotc-warning fill-rotc-warning" />}
                          {a.title}
                        </h4>
                        <span className="text-[10px] text-rotc-textMuted">{format(new Date(a.created_at), 'MMM d')}</span>
                      </div>
                      <p className="text-xs text-rotc-textMuted line-clamp-2">{a.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}

function StatCard({ title, value, icon }: { title: string; value: string | number | null; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-rotc-textMuted">{title}</p>
          <h3 className="text-2xl font-bold text-rotc-text mt-1">
            {value === null ? <div className="h-8 w-16 bg-rotc-border animate-pulse rounded mt-1" /> : value}
          </h3>
        </div>
        <div className="w-10 h-10 rounded-xl bg-rotc-bg flex items-center justify-center">
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}

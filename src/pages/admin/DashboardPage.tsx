import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useUserCounts, useAllCadets } from '@/hooks/queries/useUsers'
import { useActiveSessions, useAllSessions } from '@/hooks/queries/useAttendance'
import { useAnnouncements } from '@/hooks/queries/useAnnouncements'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Users, UserCheck, CalendarCheck, FileText, Pin } from 'lucide-react'
import { format } from 'date-fns'

const COLORS = ['#4caf50', '#ff9800', '#ef5350', '#42a5f5', '#9c27b0', '#00bcd4']

export default function DashboardPage() {
  const session = useSession()
  const { data: counts, isLoading: loadingCounts } = useUserCounts()
  const { data: cadetsResult, isLoading: loadingCadets } = useAllCadets()
  const cadets = cadetsResult?.data ?? []
  const { data: activeSessions, isLoading: loadingActive } = useActiveSessions()
  const { data: allSessions, isLoading: loadingSessions } = useAllSessions(7)
  const { data: announcements, isLoading: loadingAnnouncements } = useAnnouncements()
  const [pendingCount, setPendingCount] = useState<number | null>(null)

  useEffect(() => {
    supabase.from('enrollment_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(({ count }) => setPendingCount(count ?? 0))
  }, [])

  if (!session) return null

  // Platoon stats for pie chart
  const platoonData = Object.entries(
    cadets.reduce((acc, cadet) => {
      const p = cadet.platoon ?? 'Unassigned'
      acc[p] = (acc[p] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }))

  return (
    <AppLayout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Cadets"
            value={loadingCounts ? null : counts?.cadet ?? 0}
            icon={<Users className="h-5 w-5 text-rotc-accent" />}
          />
          <StatCard
            title="Total Officers"
            value={loadingCounts ? null : counts?.officer ?? 0}
            icon={<UserCheck className="h-5 w-5 text-rotc-info" />}
          />
          <StatCard
            title="Active Sessions"
            value={loadingActive ? null : activeSessions?.length ?? 0}
            icon={<CalendarCheck className="h-5 w-5 text-rotc-success" />}
          />
          <StatCard
            title="Pending Enrollments"
            value={pendingCount}
            icon={<FileText className="h-5 w-5 text-rotc-warning" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart area */}
          <Card className="lg:col-span-2">
            <CardHeader title="Cadet Distribution by Platoon" />
            <CardContent>
              {loadingCadets ? (
                <div className="h-64 flex items-center justify-center"><div className="animate-pulse w-32 h-32 bg-rotc-border rounded-full" /></div>
              ) : platoonData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-rotc-textMuted">No data</div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={platoonData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {platoonData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#2d5a3d', borderColor: '#3d6b4a', borderRadius: '8px' }}
                        itemStyle={{ color: '#e8f5e9' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Announcements preview */}
          <Card className="flex flex-col">
            <CardHeader title="Recent Announcements" />
            <CardContent className="flex-1 overflow-auto max-h-[300px]">
              {loadingAnnouncements ? (
                <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>
              ) : !announcements?.length ? (
                <p className="text-sm text-rotc-textMuted py-4 text-center">No announcements</p>
              ) : (
                <div className="space-y-3">
                  {announcements.slice(0, 3).map(a => (
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

        {/* Recent Sessions */}
        <Card>
          <CardHeader title="Recent Attendance Sessions" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-rotc-bg/60 border-y border-rotc-border text-left text-rotc-textMuted">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Title</th>
                  <th className="px-5 py-3 font-medium">Location</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rotc-border">
                {loadingSessions ? (
                  <tr><td colSpan={4} className="p-5 text-center text-rotc-textMuted">Loading...</td></tr>
                ) : !allSessions?.length ? (
                  <tr><td colSpan={4} className="p-5 text-center text-rotc-textMuted">No recent sessions</td></tr>
                ) : (
                  allSessions.map(session => (
                    <tr key={session.id} className="hover:bg-rotc-cardHover transition-colors">
                      <td className="px-5 py-3 text-rotc-text">{format(new Date(session.session_date), 'MMM d, yyyy')}</td>
                      <td className="px-5 py-3 text-rotc-text font-medium">{session.title}</td>
                      <td className="px-5 py-3 text-rotc-textMuted">{session.location || '—'}</td>
                      <td className="px-5 py-3">
                        <Badge status={session.is_active ? 'present' : 'default'} label={session.is_active ? 'Active' : 'Ended'} />
                      </td>
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

function StatCard({ title, value, icon }: { title: string; value: number | null; icon: React.ReactNode }) {
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

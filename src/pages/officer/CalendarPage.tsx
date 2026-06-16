import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import { useAllSessions } from '@/hooks/queries/useAttendance'
import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type Session = Database['public']['Tables']['attendance_sessions']['Row']

export default function CalendarPage() {
  const session = useSession()
  const { data: sessions, isLoading } = useAllSessions(100) // Fetch enough for the calendar
  
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)

  if (!session) return null

  // Generate calendar grid
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

  // Map sessions to dates
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Session[]>()
    if (sessions) {
      sessions.forEach(s => {
        const dateStr = format(new Date(s.session_date), 'yyyy-MM-dd')
        const existing = map.get(dateStr) || []
        map.set(dateStr, [...existing, s])
      })
    }
    return map
  }, [sessions])

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

  return (
    <AppLayout title="Attendance Calendar">
      <Card className="min-h-[600px] flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-rotc-text flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-rotc-accent" />
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-2 rounded-lg text-rotc-textMuted hover:bg-rotc-cardHover hover:text-rotc-text transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-sm font-medium text-rotc-text rounded-lg hover:bg-rotc-cardHover transition-colors">
                Today
              </button>
              <button onClick={nextMonth} className="p-2 rounded-lg text-rotc-textMuted hover:bg-rotc-cardHover hover:text-rotc-text transition-colors">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-5">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-rotc-textMuted">Loading calendar...</div>
          ) : (
            <>
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-semibold text-rotc-textMuted uppercase tracking-wider py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div className="grid grid-cols-7 gap-1 flex-1">
                {calendarDays.map((day, i) => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const daySessions = sessionsByDate.get(dateStr) || []
                  const isCurrentMonth = isSameMonth(day, monthStart)
                  const isToday = isSameDay(day, new Date())
                  
                  return (
                    <div 
                      key={day.toISOString()} 
                      className={`min-h-[80px] p-1 border rounded-lg transition-colors ${
                        !isCurrentMonth ? 'bg-rotc-bg/30 border-transparent' : 
                        isToday ? 'bg-rotc-accent/10 border-rotc-accent/50' : 
                        'bg-rotc-card border-rotc-border hover:border-rotc-accent/30'
                      }`}
                    >
                      <div className={`text-right text-xs p-1 font-medium ${isToday ? 'text-rotc-accent' : isCurrentMonth ? 'text-rotc-text' : 'text-rotc-textMuted'}`}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1 px-1">
                        {daySessions.map(s => (
                          <button
                            key={s.id}
                            onClick={() => setSelectedSession(s)}
                            className="w-full text-left truncate text-[10px] bg-rotc-success/20 text-rotc-success px-1.5 py-0.5 rounded border border-rotc-success/30 hover:bg-rotc-success/30 transition-colors"
                          >
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-rotc-success mr-1" />
                            {s.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 flex items-center gap-4 text-xs text-rotc-textMuted border-t border-rotc-border pt-4">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rotc-success" /> Session</div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Session Modal */}
      <Modal isOpen={!!selectedSession} onClose={() => setSelectedSession(null)} title={selectedSession?.title}>
        {selectedSession && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2 text-sm text-rotc-textMuted">
              <CalendarIcon className="h-4 w-4" /> {format(new Date(selectedSession.session_date), 'EEEE, MMMM d, yyyy')}
            </div>
            {selectedSession.location && (
              <div className="flex items-center gap-2 text-sm text-rotc-textMuted">
                <MapPin className="h-4 w-4" /> {selectedSession.location}
              </div>
            )}
            
            <div className="bg-rotc-bg border border-rotc-border rounded-lg p-4 mt-6">
              <h4 className="text-sm font-semibold text-rotc-text mb-3">Your Platoon's Attendance Overview</h4>
              <p className="text-xs text-rotc-textMuted italic mb-4">Detailed aggregate view coming soon.</p>
              
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center p-2 rounded bg-rotc-card border border-rotc-border">
                  <div className="text-rotc-success font-bold">N/A</div><div className="text-[10px]">Present</div>
                </div>
                <div className="text-center p-2 rounded bg-rotc-card border border-rotc-border">
                  <div className="text-rotc-warning font-bold">N/A</div><div className="text-[10px]">Late</div>
                </div>
                <div className="text-center p-2 rounded bg-rotc-card border border-rotc-border">
                  <div className="text-rotc-danger font-bold">N/A</div><div className="text-[10px]">Absent</div>
                </div>
                <div className="text-center p-2 rounded bg-rotc-card border border-rotc-border">
                  <div className="text-rotc-info font-bold">N/A</div><div className="text-[10px]">Excused</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}

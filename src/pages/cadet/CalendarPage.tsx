import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { useAllSessions, useAttendanceByUser } from '@/hooks/queries/useAttendance'
import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type Session = Database['public']['Tables']['sessions']['Row']
type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused' | 'missed'

export default function CalendarPage() {
  const session = useSession()
  const { data: sessions, isLoading: loadingSessions } = useAllSessions(100)
  const { data: attendance, isLoading: loadingAttendance } = useAttendanceByUser(session?.id || '')
  
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedSession, setSelectedSession] = useState<{ session: Session, status: AttendanceStatus, notes?: string, scanTime?: string } | null>(null)

  if (!session) return null

  // Generate calendar grid
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

  // Map attendance records
  const attendanceMap = useMemo(() => {
    const map = new Map<string, any>()
    if (attendance) {
      attendance.forEach((r: any) => {
        map.set(r.session_id, r)
      })
    }
    return map
  }, [attendance])

  // Map sessions to dates
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Array<{ session: Session, status: AttendanceStatus, notes?: string, scanTime?: string }>>()
    if (sessions) {
      sessions.forEach(s => {
        const dateStr = format(new Date(s.session_date), 'yyyy-MM-dd')
        const record = attendanceMap.get(s.id)
        
        let status: AttendanceStatus = 'missed'
        if (record) status = record.status as AttendanceStatus
        else if (new Date(s.session_date) > new Date()) status = 'missed' // Future session
        else if (s.is_active) status = 'missed' // Currently active but not scanned yet

        const entry = { 
          session: s, 
          status, 
          notes: record?.notes || undefined,
          scanTime: record?.scanned_at ? format(new Date(record.scanned_at), 'h:mm a') : undefined
        }

        const existing = map.get(dateStr) || []
        map.set(dateStr, [...existing, entry])
      })
    }
    return map
  }, [sessions, attendanceMap])

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

  const isLoading = loadingSessions || loadingAttendance

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return 'bg-rotc-success'
      case 'late': return 'bg-rotc-warning'
      case 'absent': return 'bg-rotc-danger'
      case 'excused': return 'bg-rotc-info'
      case 'missed': return 'bg-rotc-border'
    }
  }

  return (
    <AppLayout title="My Calendar">
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
                      className={`min-h-[80px] p-1 border rounded-lg transition-colors flex flex-col ${
                        !isCurrentMonth ? 'bg-rotc-bg/30 border-transparent' : 
                        isToday ? 'bg-rotc-accent/10 border-rotc-accent/50' : 
                        'bg-rotc-card border-rotc-border hover:border-rotc-accent/30'
                      }`}
                    >
                      <div className={`text-right text-xs p-1 font-medium ${isToday ? 'text-rotc-accent' : isCurrentMonth ? 'text-rotc-text' : 'text-rotc-textMuted'}`}>
                        {format(day, 'd')}
                      </div>
                      <div className="flex-1 flex flex-wrap gap-1 px-1 content-start justify-end">
                        {daySessions.map(entry => (
                          <button
                            key={entry.session.id}
                            onClick={() => setSelectedSession(entry)}
                            title={entry.session.title}
                            className={`w-3 h-3 rounded-full cursor-pointer hover:scale-125 transition-transform ${getStatusColor(entry.status)}`}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-rotc-textMuted border-t border-rotc-border pt-4">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rotc-success" /> Present</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rotc-warning" /> Late</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rotc-info" /> Excused</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rotc-danger" /> Absent</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rotc-border" /> Missed / No Record</div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Session Modal */}
      <Modal isOpen={!!selectedSession} onClose={() => setSelectedSession(null)} title={selectedSession?.session.title}>
        {selectedSession && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2 text-sm text-rotc-textMuted">
              <CalendarIcon className="h-4 w-4" /> {format(new Date(selectedSession.session.session_date), 'EEEE, MMMM d, yyyy')}
            </div>
            {selectedSession.session.location && (
              <div className="flex items-center gap-2 text-sm text-rotc-textMuted">
                <MapPin className="h-4 w-4" /> {selectedSession.session.location}
              </div>
            )}
            
            <div className="bg-rotc-bg border border-rotc-border rounded-lg p-5 mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-rotc-text">My Status</h4>
                {selectedSession.status === 'missed' ? (
                  <Badge status="default" label="No Record" />
                ) : (
                  <Badge 
                    status={selectedSession.status === 'present' ? 'success' : selectedSession.status === 'late' ? 'warning' : selectedSession.status === 'absent' ? 'danger' : 'info'} 
                    label={selectedSession.status.charAt(0).toUpperCase() + selectedSession.status.slice(1)} 
                  />
                )}
              </div>

              {selectedSession.scanTime && (
                <div className="flex items-center gap-2 text-sm text-rotc-text">
                  <Clock className="h-4 w-4 text-rotc-textMuted" />
                  Scanned at: <span className="font-medium">{selectedSession.scanTime}</span>
                </div>
              )}

              {selectedSession.notes && (
                <div className="pt-3 border-t border-rotc-border">
                  <p className="text-xs font-medium text-rotc-textMuted mb-1">Notes from Admin/Officer:</p>
                  <p className="text-sm text-rotc-text bg-rotc-card p-2 rounded border border-rotc-border">
                    {selectedSession.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}

import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useNavigate } from 'react-router-dom'
import { logoutUser } from '@/lib/auth'
import { toast } from 'sonner'
import { Settings, LogOut } from 'lucide-react'
import { useEnrollmentOpen, useToggleEnrollment } from '@/hooks/queries/useSettings'

export default function SettingsPage() {
  const session = useSession()
  const navigate = useNavigate()


  const { data: enrollmentOpen = true, isLoading: isLoadingSettings } = useEnrollmentOpen()
  const toggleMutation = useToggleEnrollment()

  const handleToggleEnrollment = async () => {
    try {
      await toggleMutation.mutateAsync(!enrollmentOpen)
      toast.success(`Enrollment is now ${!enrollmentOpen ? 'OPEN' : 'CLOSED'}`)
    } catch (err: any) {
      toast.error('Failed to update settings')
    }
  }

  if (!session) return null


  const handleSignOut = () => {
    logoutUser()
    navigate('/', { replace: true })
  }

  return (
    <AppLayout title="Settings">
      <div className="space-y-6 max-w-2xl">
        {/* System Settings */}
        {session.role === 'admin' && (
          <Card>
            <CardHeader title="System Settings">
              <Settings className="h-5 w-5 text-rotc-textMuted" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-rotc-bg rounded-xl border border-rotc-border">
                <div>
                  <p className="font-medium text-rotc-text">Public Enrollment</p>
                  <p className="text-sm text-rotc-textMuted mt-1">Allow cadets to submit enrollment requests via the public QR code link.</p>
                </div>
                <Button 
                  onClick={handleToggleEnrollment} 
                  isLoading={toggleMutation.isPending || isLoadingSettings}
                  variant={enrollmentOpen ? 'default' : 'outline'}
                  className={enrollmentOpen ? 'bg-rotc-success hover:bg-rotc-success/90' : 'text-rotc-danger border-rotc-danger'}
                >
                  {enrollmentOpen ? 'OPEN' : 'CLOSED'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sign Out */}
        <Card>
          <CardContent className="p-5">
            <Button variant="danger" onClick={handleSignOut} className="w-full sm:w-auto">
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

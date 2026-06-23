import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { logoutUser } from '@/lib/auth'
import { toast } from 'sonner'
import { Settings, User, LogOut, Info } from 'lucide-react'
import { Lock, Unlock, Shield, Bell, Save } from 'lucide-react'
import { useEnrollmentOpen, useToggleEnrollment } from '@/hooks/queries/useSettings'
import { format } from 'date-fns'

export default function SettingsPage() {
  const session = useSession()
  const navigate = useNavigate()

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setChangingPassword(true)
    try {
      const { error } = await supabase.rpc('change_password' as any, {
        p_user_id: session.id,
        p_old_password: oldPassword,
        p_new_password: newPassword
      })
      if (error) throw error
      toast.success('Password changed successfully')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleSignOut = () => {
    logoutUser()
    navigate('/', { replace: true })
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  const maskedUrl = supabaseUrl ? supabaseUrl.replace(/https?:\/\//, '').split('.')[0] + '.***' : 'Not configured'

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

        {/* Change Password */}
        <Card>
          <CardHeader title="Change Password">
            <Settings className="h-5 w-5 text-rotc-textMuted" />
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                required
              />
              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
              <Button type="submit" isLoading={changingPassword}>Update Password</Button>
            </form>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader title="System Information">
            <Info className="h-5 w-5 text-rotc-textMuted" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="App Version" value="1.0.0-beta" />
              <InfoRow label="Supabase Project" value={maskedUrl} />
              <InfoRow label="Academic Year" value={`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`} />
              <InfoRow label="Environment" value={import.meta.env.MODE} />
            </div>
          </CardContent>
        </Card>

        {/* Session Info */}
        <Card>
          <CardHeader title="Current Session">
            <User className="h-5 w-5 text-rotc-textMuted" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="Logged In As" value={session.full_name} />
              <InfoRow label="Role" value={session.role} />
              <InfoRow label="User ID" value={session.id.slice(0, 8) + '...'} />
              <InfoRow label="Session Expires" value={format(new Date(session.expires_at), 'MMM d, yyyy h:mm a')} />
            </div>
          </CardContent>
        </Card>

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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-rotc-textMuted uppercase tracking-wider">{label}</p>
      <p className="text-sm text-rotc-text mt-0.5 capitalize">{value}</p>
    </div>
  )
}

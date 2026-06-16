import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { logoutUser } from '@/lib/auth'
import { toast } from 'sonner'
import { Settings, User as UserIcon, LogOut } from 'lucide-react'

export default function ProfilePage() {
  const session = useSession()
  const navigate = useNavigate()

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  if (!session) return null

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
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

  return (
    <AppLayout title="My Profile">
      <div className="space-y-6 max-w-2xl">
        
        {/* Profile Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="w-24 h-24 rounded-full bg-rotc-bg overflow-hidden flex items-center justify-center border-2 border-rotc-border flex-shrink-0">
                {session.photo_url ? (
                  <img src={session.photo_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="text-3xl font-bold text-rotc-accent">
                    {session.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="text-center sm:text-left flex-1 min-w-0">
                <h2 className="text-xl font-bold text-rotc-text truncate">{session.full_name}</h2>
                <p className="text-sm text-rotc-accent font-medium mb-4">{session.id_number}</p>
                
                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                  <InfoRow label="Role" value="Cadet" />
                  <InfoRow label="Platoon" value={session.platoon || '—'} />
                  <div>
                    <p className="text-xs font-medium text-rotc-textMuted uppercase tracking-wider mb-1">Status</p>
                    <Badge status={session.is_active ? 'success' : 'danger'} label={session.is_active ? 'Active' : 'Inactive'} />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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

        {/* Sign Out */}
        <Card>
          <CardHeader title="Account Actions">
            <UserIcon className="h-5 w-5 text-rotc-textMuted" />
          </CardHeader>
          <CardContent>
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
      <p className="text-sm text-rotc-text mt-0.5 capitalize truncate">{value}</p>
    </div>
  )
}

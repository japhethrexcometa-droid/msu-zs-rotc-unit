import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { logoutUser } from '@/lib/auth'
import { toast } from 'sonner'
import { Settings, User as UserIcon, LogOut, Camera } from 'lucide-react'
import { format } from 'date-fns'

export default function ProfilePage() {
  const session = useSession()
  const navigate = useNavigate()

  const [photoUrl, setPhotoUrl] = useState(session?.photo_url || '')
  const [updatingPhoto, setUpdatingPhoto] = useState(false)

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  if (!session) return null

  const handleUpdatePhoto = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdatingPhoto(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ photo_url: photoUrl })
        .eq('id', session.id)
      
      if (error) throw error
      toast.success('Photo URL updated. Please log in again to see changes.')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update photo')
    } finally {
      setUpdatingPhoto(false)
    }
  }

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
      // Step 1: Verify old password using Supabase native auth
      const dummyEmail = `${session.id_number.trim().toUpperCase()}@rotc.msubuug.edu.ph`
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: dummyEmail,
        password: oldPassword
      })
      if (verifyError) throw new Error('Current password is incorrect.')

      // Step 2: Update to new password using Supabase native auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (updateError) throw updateError

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
                  <UserIcon className="h-10 w-10 text-rotc-textMuted" />
                )}
              </div>
              <div className="text-center sm:text-left flex-1 min-w-0">
                <h2 className="text-xl font-bold text-rotc-text truncate">{session.full_name}</h2>
                <p className="text-sm text-rotc-accent font-medium mb-4">{session.id_number}</p>
                
                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                  <InfoRow label="Role" value={session.role} />
                  <InfoRow label="Platoon" value={session.platoon || '—'} />
                  <InfoRow label="Designation" value={session.designation || '—'} />
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-rotc-border">
              <form onSubmit={handleUpdatePhoto} className="flex gap-3 items-end">
                <div className="flex-1">
                  <Input 
                    label="Update Photo URL" 
                    value={photoUrl} 
                    onChange={e => setPhotoUrl(e.target.value)} 
                    placeholder="https://example.com/photo.jpg"
                  />
                </div>
                <Button type="submit" isLoading={updatingPhoto} variant="secondary">
                  <Camera className="h-4 w-4 mr-2" /> Save Photo
                </Button>
              </form>
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

        {/* Session Info & Logout */}
        <Card>
          <CardHeader title="Active Session">
            <UserIcon className="h-5 w-5 text-rotc-textMuted" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-rotc-text mb-4">
              Your current session will expire on {format(new Date(session.expires_at), 'MMM d, yyyy h:mm a')}.
            </p>
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

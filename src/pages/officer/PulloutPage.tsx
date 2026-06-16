import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Send, FileText } from 'lucide-react'

// Dummy type for pullouts until proper schema is added if it's missing.
// The prompt implies a pull-out request table. We'll use supabase direct.
type PulloutRequest = {
  id: string
  user_id: string
  reason: string
  request_date: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export default function PulloutPage() {
  const session = useSession()
  const [requests, setRequests] = useState<PulloutRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchRequests = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('pullout_requests')
      .select('*')
      .eq('user_id', session!.id)
      .order('created_at', { ascending: false })
      .catch(() => ({ data: null, error: true })) // catch missing table

    // Mock if table doesn't exist yet
    if (error || !data) {
      console.warn('pullout_requests table might be missing')
      setRequests([])
    } else {
      setRequests(data as any)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (session) fetchRequests()
  }, [session])

  if (!session) return null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const reason = fd.get('reason') as string
    const request_date = fd.get('request_date') as string

    if (reason.length < 20) {
      toast.error('Reason must be at least 20 characters')
      return
    }

    if (!confirm('Submit this pull-out request? It cannot be edited once submitted.')) return

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('pullout_requests')
        .insert({
          user_id: session.id,
          reason,
          request_date,
          status: 'pending'
        })
      
      if (error) throw error
      toast.success('Pull-out request submitted')
      e.currentTarget.reset()
      fetchRequests()
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit request. (Table might be missing)')
    } finally {
      setSubmitting(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <AppLayout title="Pull-out Requests">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Submit Form */}
        <Card>
          <CardHeader title="Submit Pull-out Request" />
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input 
                label="Date of Pull-out" 
                name="request_date" 
                type="date" 
                min={today}
                defaultValue={today} 
                required 
              />
              <div className="space-y-1">
                <label className="text-sm font-medium text-rotc-textMuted flex items-center justify-between">
                  Reason
                  <span className="text-xs font-normal opacity-70">Min 20 chars</span>
                </label>
                <textarea
                  name="reason"
                  rows={5}
                  placeholder="Detailed explanation for the pull-out request..."
                  required
                  minLength={20}
                  className="w-full px-3 py-2 bg-rotc-bg border border-rotc-border rounded-lg text-sm text-rotc-text focus:outline-none focus:border-rotc-accent resize-none"
                />
              </div>
              <Button type="submit" isLoading={submitting} className="w-full">
                <Send className="h-4 w-4 mr-2" /> Submit Request
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader title="My Requests" />
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-rotc-textMuted">Loading requests...</div>
            ) : !requests.length ? (
              <div className="p-8 text-center text-rotc-textMuted flex flex-col items-center">
                <FileText className="h-8 w-8 mb-2 opacity-50" />
                <p>No pull-out requests found.</p>
              </div>
            ) : (
              <div className="divide-y divide-rotc-border">
                {requests.map(req => (
                  <div key={req.id} className="p-5 hover:bg-rotc-cardHover transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-rotc-text">
                        {format(new Date(req.request_date), 'MMMM d, yyyy')}
                      </h4>
                      <Badge 
                        status={req.status === 'pending' ? 'pending' : req.status === 'approved' ? 'success' : 'danger'} 
                        label={req.status} 
                      />
                    </div>
                    <p className="text-xs text-rotc-textMuted bg-rotc-bg p-3 rounded border border-rotc-border">
                      {req.reason}
                    </p>
                    <p className="text-[10px] text-rotc-textMuted mt-2 text-right">
                      Submitted: {format(new Date(req.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  )
}

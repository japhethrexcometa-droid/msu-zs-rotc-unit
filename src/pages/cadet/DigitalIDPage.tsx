import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useRef } from 'react'
import { Download, Share2, Shield, User as UserIcon } from 'lucide-react'
import { exportAsPng } from '@/lib/export'
import { toast } from 'sonner'

export default function DigitalIDPage() {
  const session = useSession()
  const cardRef = useRef<HTMLDivElement>(null)

  if (!session) return null

  const currentYear = new Date().getFullYear()
  const academicYear = `A.Y. ${currentYear}-${currentYear + 1}`

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My ROTC Digital ID',
          text: `Digital ID for ${session.full_name} (${session.id_number})`,
          url: window.location.href, // If we had public profile links
        })
      } catch (err) {
        console.error('Share failed', err)
      }
    } else {
      navigator.clipboard.writeText(`ROTC ID: ${session.id_number} - ${session.full_name}`)
      toast.success('ID info copied to clipboard')
    }
  }

  return (
    <AppLayout title="My Digital ID">
      <div className="max-w-md mx-auto space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div
              ref={cardRef}
              className="mx-auto w-full rounded-2xl overflow-hidden shadow-2xl relative"
              style={{ background: 'linear-gradient(135deg, #1a3a2a 0%, #2d5a3d 50%, #1a3a2a 100%)' }}
            >
              {/* Background watermark effect */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                <Shield className="w-64 h-64" />
              </div>

              {/* Header */}
              <div className="bg-rotc-accent/10 px-6 py-4 border-b border-rotc-border relative z-10">
                <div className="flex items-center gap-2 justify-center">
                  <Shield className="h-5 w-5 text-rotc-accent" />
                  <span className="text-sm font-bold text-rotc-accent tracking-widest uppercase">MSU-ZS ROTC UNIT</span>
                </div>
              </div>

              {/* Photo */}
              <div className="flex justify-center py-8 relative z-10">
                <div className="w-32 h-32 rounded-full border-4 border-rotc-accent/40 overflow-hidden bg-rotc-bg flex items-center justify-center shadow-lg">
                  {session.photo_url ? (
                    <img src={session.photo_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span className="text-4xl font-bold text-rotc-accent">
                      {session.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="text-center px-6 pb-6 space-y-1.5 relative z-10">
                <h2 className="text-xl font-bold text-rotc-text tracking-tight">{session.full_name}</h2>
                <p className="text-base font-medium text-rotc-accent tracking-widest font-mono">{session.id_number}</p>
                <div className="flex items-center justify-center gap-2 text-sm text-rotc-textMuted mt-2">
                  <span className="uppercase tracking-wider font-semibold">CADET</span>
                  {session.platoon && (
                    <>
                      <span className="text-rotc-border">|</span>
                      <span>{session.platoon} Platoon</span>
                    </>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-rotc-accent/10 px-6 py-3 border-t border-rotc-border text-center relative z-10">
                <p className="text-[10px] text-rotc-textMuted uppercase tracking-widest">
                  ROTC MSU-Zamboanga Sibugay · {academicYear}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button className="flex-1" onClick={() => { if (cardRef.current) exportAsPng(cardRef.current, `My_ROTC_ID_${session.id_number}`) }}>
            <Download className="h-4 w-4 mr-2" /> Download PNG
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" /> Share
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}

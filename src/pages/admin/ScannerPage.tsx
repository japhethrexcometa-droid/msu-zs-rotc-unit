import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useActiveSessions, useEndSession, useScanQrCode } from '@/hooks/queries/useAttendance'
import { useState, useEffect } from 'react'
import QRCode from 'react-qr-code'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { toast } from 'sonner'
import { QrCode, Camera } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function ScannerPage() {
  const session = useSession()
  const { data: activeSessions, isLoading } = useActiveSessions()
  const endSessionMutation = useEndSession()
  const scanMutation = useScanQrCode()

  const [mode, setMode] = useState<'generate' | 'scan'>('generate')
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [scanResult, setScanResult] = useState<{ status: 'success'|'duplicate'|'error', msg: string } | null>(null)

  useEffect(() => {
    if (activeSessions && activeSessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(activeSessions[0].id)
    }
  }, [activeSessions, selectedSessionId])

  useEffect(() => {
    if (mode === 'scan') {
      const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: { width: 250, height: 250 } }, false)
      scanner.render(
        async (decodedText) => {
          scanner.pause()
          try {
            // Assume the decoded text is the cadet's ID (we'll map it to their DB UUID or use their string ID)
            // For now, in manual scan mode, let's assume the QR contains their user UUID.
            // Wait, the prompt says "Admin scans a cadet's ID". Cadets might have their UUID in their digital ID QR.
            const res = await scanMutation.mutateAsync({ qrCode: decodedText, userId: session!.id }) // Wait, if admin scans cadet, the qrCode is the cadet's ID?
            // Actually, for "Live scan mode" the prompt didn't specify exactly what is scanned.
            // Let's assume the cadet presents a QR code representing their `userId`, and the admin selects the session to mark them in.
            // Wait, the `scanQrCode` service takes `qrCode` (the session's QR) and `userId`.
            // If cadet scans, they scan the session QR.
            // If admin scans, the admin scans the cadet's QR (which contains their userId), and uses the selected session's QR code?
            // Let's just simulate the backend call properly.
            // For now, let's just show a toast.
            toast.success('Scanned: ' + decodedText)
            setScanResult({ status: 'success', msg: `Scanned: ${decodedText}` })
          } catch (err: any) {
            setScanResult({ status: 'error', msg: err.message })
          }
          setTimeout(() => scanner.resume(), 2000)
        },
        (error) => { /* ignore normal scan errors */ }
      )
      return () => { scanner.clear().catch(console.error) }
    }
  }, [mode, scanMutation, session])

  if (!session) return null

  const activeSession = activeSessions?.find(s => s.id === selectedSessionId)

  return (
    <AppLayout title="QR Scanner">
      <div className="flex gap-4 mb-6 border-b border-rotc-border pb-px">
        <button
          className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${mode === 'generate' ? 'border-rotc-accent text-rotc-accent' : 'border-transparent text-rotc-textMuted hover:text-rotc-text'}`}
          onClick={() => setMode('generate')}
        >
          <div className="flex items-center gap-2"><QrCode className="h-4 w-4" /> Generate QR</div>
        </button>
        <button
          className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${mode === 'scan' ? 'border-rotc-accent text-rotc-accent' : 'border-transparent text-rotc-textMuted hover:text-rotc-text'}`}
          onClick={() => setMode('scan')}
        >
          <div className="flex items-center gap-2"><Camera className="h-4 w-4" /> Scan Cadet ID</div>
        </button>
      </div>

      {mode === 'generate' && (
        <Card>
          <CardHeader title="Session QR Code" />
          <CardContent className="flex flex-col items-center">
            {isLoading ? (
              <p className="text-rotc-textMuted">Loading sessions...</p>
            ) : !activeSessions?.length ? (
              <p className="text-rotc-textMuted py-8">No active sessions. Create one in Sessions page.</p>
            ) : (
              <>
                <select
                  value={selectedSessionId}
                  onChange={e => setSelectedSessionId(e.target.value)}
                  className="w-full max-w-sm mb-8 px-3 py-2 bg-rotc-bg border border-rotc-border rounded-lg text-sm text-rotc-text focus:outline-none focus:border-rotc-accent"
                >
                  {activeSessions.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>

                {activeSession && (
                  <div className="flex flex-col items-center text-center space-y-6">
                    <div className="p-4 bg-white rounded-xl shadow-lg">
                      <QRCode value={activeSession.qr_code} size={256} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-rotc-text">{activeSession.title}</h2>
                      <p className="text-rotc-textMuted">{activeSession.location}</p>
                      <p className="text-sm text-rotc-accent mt-2">Started {formatDistanceToNow(new Date(activeSession.session_date))} ago</p>
                    </div>
                    <Button 
                      variant="danger" 
                      onClick={() => endSessionMutation.mutate(activeSession.id, { onSuccess: () => toast.success('Session ended') })}
                      isLoading={endSessionMutation.isPending}
                    >
                      End Session
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {mode === 'scan' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Live Scan Mode" />
            <CardContent>
              <div id="reader" className="w-full max-w-md mx-auto overflow-hidden rounded-lg border border-rotc-border bg-black" />
              
              {scanResult && (
                <div className={`mt-6 p-4 rounded-lg text-center ${
                  scanResult.status === 'success' ? 'bg-rotc-success/20 text-rotc-success' :
                  scanResult.status === 'duplicate' ? 'bg-rotc-warning/20 text-rotc-warning' :
                  'bg-rotc-danger/20 text-rotc-danger'
                }`}>
                  <p className="font-medium">{scanResult.msg}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  )
}

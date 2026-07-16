import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Download, Printer, Key, ShieldX, Trash2 } from 'lucide-react'
import { useAccessCodes, useGenerateAccessCodes, useRevokeAccessCode, useWipeAccessCodes, AccessCode } from '@/hooks/queries/useAccessCodes'
import AccessCodePrint from '@/components/print/AccessCodePrint'

export default function AccessCodesPage() {
  const { data: codes = [], isLoading } = useAccessCodes()
  const generateMutation = useGenerateAccessCodes()
  const revokeMutation = useRevokeAccessCode()
  const wipeMutation = useWipeAccessCodes()
  
  const [isPrinting, setIsPrinting] = useState(false)
  
  const [batchSize, setBatchSize] = useState(100)

  // Stats
  const stats = useMemo(() => {
    return {
      active: codes.filter(c => c.status === 'active').length,
      used: codes.filter(c => c.status === 'used').length,
      expired: codes.filter(c => c.status === 'expired').length,
      revoked: codes.filter(c => c.status === 'revoked').length,
      total: codes.length
    }
  }, [codes])

  const handleGenerate = () => {
    if (batchSize < 1 || batchSize > 500) {
      toast.error('Please enter a number between 1 and 500')
      return
    }

    const toastId = toast.loading(`Generating ${batchSize} access codes...`)
    generateMutation.mutate(batchSize, {
      onSuccess: (newCodes) => {
        toast.success(`Successfully generated ${batchSize} codes!`, { id: toastId })
        if (newCodes && newCodes.length > 0) {
          setPrintBatchId(newCodes[0].batch_id)
          setIsPrinting(true)
        }
      },
      onError: (err) => {
        toast.error('Failed to generate codes: ' + err.message, { id: toastId })
      }
    })
  }

  const handleRevoke = (id: string) => {
    if (confirm('Are you sure you want to revoke this code? It will no longer be usable.')) {
      revokeMutation.mutate(id, {
        onSuccess: () => toast.success('Code revoked successfully'),
        onError: (err) => toast.error('Failed to revoke code: ' + err.message)
      })
    }
  }

  const handlePrintUnused = () => {
    setIsPrinting(true)
  }

  const handleWipeAll = () => {
    const input = prompt('This will permanently delete all access codes. This action cannot be undone. Type RESET to confirm:')
    if (input === 'RESET') {
      const toastId = toast.loading('Wiping all codes...')
      wipeMutation.mutate(undefined, {
        onSuccess: () => toast.success('All codes have been wiped and reset to zero.', { id: toastId }),
        onError: (err) => toast.error('Failed to wipe codes: ' + err.message, { id: toastId })
      })
    } else if (input !== null) {
      toast.error('Deletion cancelled. You must type exactly RESET.')
    }
  }

  if (isPrinting) {
    const activeCodes = codes.filter(c => c.status === 'active')
    return (
      <AccessCodePrint 
        codes={activeCodes} 
        onClose={() => setIsPrinting(false)} 
      />
    )
  }

  return (
    <AppLayout title="Access Codes">
      <div className="space-y-6">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-rotc-textMuted">Active</p>
                <p className="text-2xl font-bold text-green-500">{stats.active}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-rotc-textMuted">Used</p>
                <p className="text-2xl font-bold text-rotc-text">{stats.used}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-rotc-textMuted">Expired</p>
                <p className="text-2xl font-bold text-rotc-textMuted">{stats.expired}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-rotc-textMuted">Total Generated</p>
                <p className="text-2xl font-bold text-rotc-text">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Generate Card */}
        <Card>
          <CardHeader title="Generate Codes">
            <p className="text-sm text-rotc-textMuted mb-4">
              Generate one-time-use access codes to give to students after they pay at the registrar.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-rotc-bg border border-rotc-border rounded-lg px-3 py-1.5 w-32">
                <span className="text-rotc-textMuted text-sm mr-2">Count:</span>
                <input 
                  type="number" 
                  min="1" max="500" 
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value) || 0)}
                  className="bg-transparent border-none outline-none text-rotc-text font-medium w-full text-right"
                />
              </div>
              <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
                <Key className="w-4 h-4 mr-2" />
                {generateMutation.isPending ? 'Generating...' : 'Generate Codes'}
              </Button>
              <Button onClick={handlePrintUnused} variant="outline" className="text-rotc-accent border-rotc-accent hover:bg-rotc-accent hover:text-black transition-colors" disabled={stats.active === 0}>
                <Printer className="w-4 h-4 mr-2" />
                Print {stats.active} Unused Codes
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Codes Table */}
        <Card>
          <CardHeader title="All Access Codes" />
          <CardContent className="p-0">
            <Table
              headers={['Code', 'Status', 'Batch ID', 'Used By (ID Number)', 'Generated', 'Expires', 'Actions']}
              isLoading={isLoading}
              data={codes}
              keyExtractor={(r) => r.id}
              renderRow={(r: AccessCode) => (
                <>
                  <td className="p-4 text-sm font-bold font-mono text-rotc-text tracking-wider">{r.code}</td>
                  <td className="p-4">
                    <Badge 
                      status={r.status === 'active' ? 'success' : r.status === 'used' ? 'default' : 'warning'} 
                      label={r.status} 
                    />
                  </td>
                  <td className="p-4 text-sm text-rotc-textMuted">{r.batch_id || '—'}</td>
                  <td className="p-4 text-sm text-rotc-text font-medium">{r.used_by_id_number || '—'}</td>
                  <td className="p-4 text-sm text-rotc-textMuted">{format(new Date(r.created_at), 'MMM d, yyyy h:mm a')}</td>
                  <td className="p-4 text-sm text-rotc-textMuted">
                    {new Date(r.expires_at) < new Date() && r.status === 'active' 
                      ? <span className="text-rotc-danger">Expired</span>
                      : format(new Date(r.expires_at), 'MMM d, yyyy')
                    }
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {r.status === 'active' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleRevoke(r.id)}
                          disabled={revokeMutation.isPending}
                          className="text-rotc-danger hover:text-rotc-danger hover:bg-rotc-danger/10 border-rotc-danger/20"
                        >
                          <ShieldX className="w-4 h-4 mr-1" /> Revoke
                        </Button>
                      )}
                    </div>
                  </td>
                </>
              )}
            />
          </CardContent>
        </Card>

        {/* Wipe All Codes */}
        <div className="flex justify-end pt-4 border-t border-rotc-border/50">
          <Button 
            variant="outline" 
            onClick={handleWipeAll} 
            disabled={wipeMutation.isPending || codes.length === 0}
            className="text-rotc-danger border-rotc-danger/50 hover:bg-rotc-danger hover:text-white transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Wipe All Codes (Factory Reset)
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}

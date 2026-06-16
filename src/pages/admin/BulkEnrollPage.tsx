import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import { useState, useRef } from 'react'
import { read, utils, writeFile } from 'xlsx'
import { bulkImportCadets } from '@/services/enrollment.service'
import { toast } from 'sonner'
import { Download, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react'

interface ImportRow {
  id_number: string
  full_name: string
  platoon?: string
  contact_number?: string
  email?: string
  valid: boolean
  error?: string
}

export default function BulkEnrollPage() {
  const session = useSession()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null)

  if (!session) return null

  const downloadTemplate = () => {
    const ws = utils.json_to_sheet([
      { 'ID Number': '', 'Full Name': '', 'Platoon': '', 'Contact': '', 'Email': '' }
    ])
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Template')
    writeFile(wb, 'ROTC_Enrollment_Template.xlsx')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = evt.target?.result
      const workbook = read(data, { type: 'binary' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = utils.sheet_to_json<Record<string, string>>(sheet)

      const parsed: ImportRow[] = json.map(row => {
        const id_number = (row['ID Number'] || row['id_number'] || '').toString().trim()
        const full_name = (row['Full Name'] || row['full_name'] || '').toString().trim()
        const platoon = (row['Platoon'] || row['platoon'] || '').toString().trim()
        const contact_number = (row['Contact'] || row['contact_number'] || '').toString().trim()
        const email = (row['Email'] || row['email'] || '').toString().trim()

        let valid = true
        let error = ''
        if (!id_number) { valid = false; error = 'Missing ID Number' }
        if (!full_name) { valid = false; error += (error ? ', ' : '') + 'Missing Full Name' }

        return { id_number, full_name, platoon, contact_number, email, valid, error }
      })

      setRows(parsed)
      setResult(null)
    }
    reader.readAsBinaryString(file)
  }

  const handleImport = async () => {
    const validRows = rows.filter(r => r.valid)
    if (!validRows.length) {
      toast.error('No valid rows to import')
      return
    }

    setImporting(true)
    try {
      const res = await bulkImportCadets(
        validRows.map(r => ({
          id_number: r.id_number,
          full_name: r.full_name,
          platoon: r.platoon || null,
          contact_number: r.contact_number || null,
          email: r.email || null,
          role: 'cadet',
        }))
      )
      setResult(res)
      toast.success(`${res.success} imported successfully`)
      if (res.errors.length) toast.error(`${res.errors.length} errors`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setImporting(false)
    }
  }

  const validCount = rows.filter(r => r.valid).length
  const invalidCount = rows.filter(r => !r.valid).length

  return (
    <AppLayout title="Bulk Enrollment">
      <div className="space-y-6">
        <Card>
          <CardHeader title="Import Cadets from XLSX" />
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" /> Download Template
              </Button>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Upload XLSX File
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {rows.length > 0 && (
          <Card>
            <CardHeader title={`Preview (${validCount} valid, ${invalidCount} invalid)`}>
              <Button onClick={handleImport} isLoading={importing} disabled={!validCount}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Import {validCount} Valid Rows
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table
                headers={['#', 'ID Number', 'Full Name', 'Platoon', 'Contact', 'Email', 'Status']}
                data={rows}
                keyExtractor={(_, i) => String(i)}
                renderRow={(r, i) => (
                  <>
                    <td className="p-3 text-sm text-rotc-textMuted">{(i ?? 0) + 1}</td>
                    <td className="p-3 text-sm font-medium text-rotc-text">{r.id_number || '—'}</td>
                    <td className="p-3 text-sm text-rotc-text">{r.full_name || '—'}</td>
                    <td className="p-3 text-sm text-rotc-textMuted">{r.platoon || '—'}</td>
                    <td className="p-3 text-sm text-rotc-textMuted">{r.contact_number || '—'}</td>
                    <td className="p-3 text-sm text-rotc-textMuted">{r.email || '—'}</td>
                    <td className="p-3">
                      {r.valid ? (
                        <span className="text-xs font-medium text-rotc-success">Valid</span>
                      ) : (
                        <span className="text-xs font-medium text-rotc-danger flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> {r.error}
                        </span>
                      )}
                    </td>
                  </>
                )}
              />
            </CardContent>
          </Card>
        )}

        {result && (
          <Card>
            <CardHeader title="Import Results" />
            <CardContent>
              <p className="text-sm text-rotc-success mb-2">{result.success} rows imported successfully.</p>
              {result.errors.length > 0 && (
                <div className="space-y-1 mt-2">
                  <p className="text-sm text-rotc-danger font-medium">{result.errors.length} errors:</p>
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-rotc-danger/80 pl-4">{err}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}

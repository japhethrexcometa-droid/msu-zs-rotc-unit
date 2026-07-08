import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { useEnrollmentArchives, useImportEnrollmentArchives } from '@/hooks/queries/useEnrollment'
import { useState } from 'react'
import { toast } from 'sonner'
import { Folder as FolderIcon, Search as SearchIcon, FileText as FileIcon, Upload as UploadIcon, AlertCircle as AlertIcon } from 'lucide-react'
import { format } from 'date-fns'

export default function ArchivesPage() {
  const session = useSession()

  // Enrollment Archive State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string | undefined>(undefined)
  const [archivePage, setArchivePage] = useState(1)
  const archivePageSize = 20

  const { data: archives, isLoading: loadingArchives } = useEnrollmentArchives({
    searchQuery,
    academicYear: selectedFolder, // Backend still uses academicYear parameter but we treat it as Folder Name
    page: archivePage,
    pageSize: archivePageSize
  })

  const importMutation = useImportEnrollmentArchives()
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [folderName, setFolderName] = useState('')

  if (!session) return null

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !folderName) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n')
      if (lines.length < 1) return

      const headers = lines[0].split(',').map(h => h.trim())

      const records = lines.slice(1).filter(l => l.trim()).map(line => {
        const values = line.split(',')
        const obj: any = {}
        headers.forEach((h, i) => {
          const key = h.toLowerCase().replace(/ /g, '_')
          obj[key] = values[i]?.trim()
        })
        return obj
      })

      try {
        await importMutation.mutateAsync({ records, academicYear: folderName })
        toast.success(`Successfully imported ${records.length} records into folder: ${folderName}`)
        setIsImportModalOpen(false)
        setFolderName('')
      } catch (err: any) {
        toast.error(err.message)
      }
    }
    reader.readAsText(file)
  }

  return (
    <AppLayout title="Archives (Historical Enrollment)">
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Folder-like Selection */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <h3 className="text-sm font-bold text-rotc-text flex items-center gap-2">
                  <FolderIcon className="h-4 w-4 text-rotc-accent" /> Folders
                </h3>
              </CardHeader>
              <CardContent className="px-2 py-2">
                <div className="space-y-1">
                  <button
                    onClick={() => { setSelectedFolder(undefined); setArchivePage(1); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      !selectedFolder ? 'bg-rotc-accent/10 text-rotc-accent font-medium' : 'text-rotc-textMuted hover:bg-rotc-cardHover'
                    }`}
                  >
                    All Historical Records
                  </button>
                  {archives?.academicYears?.map((year: string) => (
                    <button
                      key={year}
                      onClick={() => { setSelectedFolder(year); setArchivePage(1); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                        selectedFolder === year ? 'bg-rotc-accent/10 text-rotc-accent font-medium' : 'text-rotc-textMuted hover:bg-rotc-cardHover'
                      }`}
                    >
                      <span className="truncate max-w-[150px]">{year}</span>
                      <FileIcon className="h-3.5 w-3.5 opacity-40 shrink-0" />
                    </button>
                  ))}
                  {(!archives?.academicYears || archives.academicYears.length === 0) && !loadingArchives && (
                    <div className="p-4 text-center text-xs text-rotc-textMuted">No archive folders found</div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-rotc-border px-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setIsImportModalOpen(true)}
                  >
                    <UploadIcon className="h-3 w-3 mr-2" /> Import Legacy CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Records Table */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                  <h3 className="text-sm font-bold text-rotc-text">
                    {selectedFolder ? `Folder: ${selectedFolder}` : 'All Historical Records'}
                  </h3>
                  <div className="relative max-w-xs w-full">
                    <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-rotc-textMuted" />
                    <Input
                      placeholder="Search name or ID..."
                      className="pl-9 h-9 text-xs"
                      value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); setArchivePage(1); }}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table
                  headers={['Name', 'ID Number', 'Gender', 'School', 'Folder', 'Status', 'Archived']}
                  isLoading={loadingArchives}
                  data={archives?.data || []}
                  keyExtractor={(r) => r.id}
                  renderRow={(r) => (
                    <>
                      <td className="p-4 text-sm font-medium text-rotc-text">
                        {r.first_name} {r.last_name}
                      </td>
                      <td className="p-4 text-sm text-rotc-textMuted">{r.id_number}</td>
                      <td className="p-4 text-sm text-rotc-textMuted">{r.gender}</td>
                      <td className="p-4 text-sm text-rotc-textMuted">{r.school}</td>
                      <td className="p-4 text-sm text-rotc-textMuted truncate max-w-[120px]" title={r.academic_year}>
                        {r.academic_year}
                      </td>
                      <td className="p-4">
                        <Badge
                          status={r.status === 'approved' ? 'success' : 'danger'}
                          label={r.status === 'approved' ? 'Approved' : 'Rejected'}
                        />
                      </td>
                      <td className="p-4 text-sm text-rotc-textMuted">
                        {r.archived_at ? format(new Date(r.archived_at), 'MMM d, yyyy') : '—'}
                      </td>
                    </>
                  )}
                />
                {/* Pagination */}
                {archives?.count > archivePageSize && (
                  <div className="p-4 flex items-center justify-between border-t border-rotc-border">
                    <span className="text-xs text-rotc-textMuted">Total: {archives.count}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={archivePage === 1} onClick={() => setArchivePage(p => p - 1)}>Prev</Button>
                      <div className="flex items-center px-4 text-xs font-medium text-rotc-text">
                        Page {archivePage} of {Math.ceil(archives.count / archivePageSize)}
                      </div>
                      <Button variant="outline" size="sm" disabled={archivePage * archivePageSize >= archives.count} onClick={() => setArchivePage(p => p + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Historical Records">
        <div className="space-y-4 mt-4">
          <div className="p-3 bg-rotc-accent/10 border border-rotc-accent/20 rounded-lg flex gap-2 text-xs text-rotc-accent">
            <FolderIcon className="h-4 w-4 flex-shrink-0" />
            <p>Digitize and organize your past records. Simply provide a <strong>Folder Name</strong> to group these historical entries (e.g., <i>AER & ASR 2024-2025</i>) for instant retrieval and professional CHED reporting.</p>
          </div>
          <Input
            label="Folder Name"
            placeholder="e.g. AER & ASR 2024-2025"
            value={folderName}
            onChange={e => setFolderName(e.target.value)}
            required
          />
          <div className="pt-2">
            <label className="block text-xs font-medium text-rotc-textMuted mb-1">Upload CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              disabled={!folderName}
              className="w-full text-xs text-rotc-textMuted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-rotc-accent file:text-white hover:file:bg-rotc-accent/80 cursor-pointer disabled:opacity-50"
            />
          </div>
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}

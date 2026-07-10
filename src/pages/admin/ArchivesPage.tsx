import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { useEnrollmentArchives, useImportEnrollmentArchives } from '@/hooks/queries/useEnrollment'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Folder as FolderIcon,
  Search as SearchIcon,
  ShieldCheck as ShieldCheckIcon,
  ShieldAlert as ShieldAlertIcon,
  FileText as FileIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Trash2 as TrashIcon,
  Archive as ArchiveIcon,
  Edit3 as RenameIcon,
  Database as DatabaseIcon,
  RotateCcw as RotateCcwIcon
} from 'lucide-react'
import { format } from 'date-fns'
import { getAdminDocuments, uploadDocument, deleteDocument, getDownloadUrl, DocumentRecord, initStorage } from '@/services/documents.service'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

export default function ArchivesPage() {
  const session = useSession()
  const [activeTab, setActiveTab] = useState<'records' | 'vault'>('records')

  // Records State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string | undefined>(undefined)
  const [archivePage, setArchivePage] = useState(1)
  const archivePageSize = 20
  const [folderDocs, setFolderDocs] = useState<DocumentRecord[]>([])
  const [isLoadingFolderDocs, setIsLoadingFolderDocs] = useState(false)

  // Vault State
  const [vaultSearch, setVaultSearch] = useState('')
  const [vaultFolder, setVaultFolder] = useState<string | undefined>(undefined)
  const [vaultPage, setVaultPage] = useState(1)
  const [vaultPageSize, setVaultPageSize] = useState(20)
  const [vaultData, setVaultData] = useState<{ data: DocumentRecord[], count: number, folders: string[] }>({ data: [], count: 0, folders: [] })
  const [isVaultLoading, setIsVaultLoading] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null)
  const [newDocName, setNewDocName] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadFolder, setUploadFolder] = useState('')
  const [customFilename, setCustomFilename] = useState('')
  const [storageStatus, setStorageStatus] = useState<'checking' | 'ready' | 'error'>('checking')
  const [storageError, setStorageError] = useState('')

  const { data: archives, isLoading: loadingArchives } = useEnrollmentArchives({
    searchQuery,
    academicYear: selectedFolder,
    page: archivePage,
    pageSize: archivePageSize
  })

  const importMutation = useImportEnrollmentArchives()
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [folderName, setFolderName] = useState('')

  // Load Vault Data
  const loadVault = async () => {
    if (activeTab !== 'vault') return
    setIsVaultLoading(true)
    try {
      const result = await getAdminDocuments({
        search: vaultSearch,
        folder: vaultFolder,
        page: vaultPage,
        pageSize: vaultPageSize
      })
      setVaultData(result)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsVaultLoading(false)
    }
  }

  const loadFolderDocs = async () => {
    if (activeTab !== 'records' || !selectedFolder) {
      setFolderDocs([])
      return
    }
    setIsLoadingFolderDocs(true)
    try {
      const result = await getAdminDocuments({ folder: selectedFolder, pageSize: 100 })
      setFolderDocs(result.data || [])
    } catch (err: any) {
      console.error("Failed to load folder documents:", err)
    } finally {
      setIsLoadingFolderDocs(false)
    }
  }

  const checkStorage = async () => {
    setStorageStatus('checking')
    try {
      const res = await initStorage()
      if (res.schemaStale) {
        setStorageStatus('error')
        setStorageError(res.message)
      } else {
        setStorageStatus('ready')
      }
    } catch (err: any) {
      setStorageStatus('error')
      setStorageError(err.message)
    }
  }

  useEffect(() => {
    loadVault()
    loadFolderDocs()
    // Auto-init storage on first load
    checkStorage()
  }, [activeTab, vaultSearch, vaultFolder, vaultPage, vaultPageSize, selectedFolder])

  if (!session) return null

  const handleDownload = async (doc: DocumentRecord) => {
    try {
      const url = await getDownloadUrl(doc.storage_path)
      const link = document.createElement('a')
      link.href = url
      link.download = doc.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err: any) {
      toast.error("Failed to download: " + err.message)
    }
  }

  const handleDelete = async (doc: DocumentRecord) => {
    if (!confirm(`Are you sure you want to delete "${doc.filename}"?`)) return
    try {
      await deleteDocument(doc.id, doc.storage_path)
      toast.success("Document deleted")
      loadVault()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile || !uploadFolder) return
    try {
      await uploadDocument(uploadFile, uploadFolder, false, customFilename)
      toast.success("Document uploaded successfully")
      setIsUploadModalOpen(false)
      setUploadFile(null)
      setUploadFolder('')
      setCustomFilename('')
      loadVault()
    } catch (err: any) {
      if (err.message.includes("row-level security policy")) {
        toast.error("Upload failed: Storage permissions are currently restricted. Please try clicking 'Retry Repair' in the sidebar.")
      } else {
        toast.error(err.message)
      }
    }
  }

  const handleRename = async () => {
    if (!selectedDoc || !newDocName) return
    try {
      const res = await fetch('/api/admin/documents', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ id: selectedDoc.id, newFilename: newDocName })
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      toast.success("Document renamed")
      setIsRenameModalOpen(false)
      loadVault()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !folderName) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        let records: any[] = []

        if (file.name.endsWith('.csv')) {
          const text = event.target?.result as string
          const lines = text.split('\n')
          if (lines.length < 1) return

          const headers = lines[0].split(',').map(h => h.trim())
          records = lines.slice(1).filter(l => l.trim()).map(line => {
            const values = line.split(',')
            const obj: any = {}
            headers.forEach((h, i) => {
              const key = h.toLowerCase().replace(/ /g, '_')
              obj[key] = values[i]?.trim()
            })
            return obj
          })
        } else {
          // Excel Support
          const data = new Uint8Array(event.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          records = XLSX.utils.sheet_to_json(firstSheet)
        }

        if (records.length === 0) throw new Error("No records found in file")

        await importMutation.mutateAsync({ records, academicYear: folderName })
        toast.success(`Successfully imported ${records.length} records into folder: ${folderName}`)
        setIsImportModalOpen(false)
        setFolderName('')
      } catch (err: any) {
        if (err.message.includes("not find table")) {
          toast.error("Import failed: Database schema is still syncing. Please wait 10 seconds and try again.")
        } else {
          toast.error("Import failed: " + err.message)
        }
      }
    }

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file)
    } else {
      reader.readAsArrayBuffer(file)
    }
  }

  return (
    <AppLayout title="Archives & Document Vault">
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex gap-1 bg-rotc-card p-1 rounded-xl border border-rotc-border max-w-fit">
          <button
            onClick={() => setActiveTab('records')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'records' ? 'bg-rotc-accent text-white shadow-lg' : 'text-rotc-textMuted hover:bg-rotc-cardHover'}`}
          >
            <DatabaseIcon className="h-4 w-4" /> Enrollment Records
          </button>
          <button
            onClick={() => setActiveTab('vault')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'vault' ? 'bg-rotc-accent text-white shadow-lg' : 'text-rotc-textMuted hover:bg-rotc-cardHover'}`}
          >
            <ArchiveIcon className="h-4 w-4" /> Document Vault
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Folders Sidebar */}
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
                    onClick={() => { activeTab === 'records' ? setSelectedFolder(undefined) : setVaultFolder(undefined); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      (activeTab === 'records' ? !selectedFolder : !vaultFolder) ? 'bg-rotc-accent/10 text-rotc-accent font-medium' : 'text-rotc-textMuted hover:bg-rotc-cardHover'
                    }`}
                  >
                    All {activeTab === 'records' ? 'Historical Records' : 'Documents'}
                  </button>

                  {(activeTab === 'records' ? archives?.academicYears : vaultData.folders)?.map((folder: string) => (
                    <button
                      key={folder}
                      onClick={() => { activeTab === 'records' ? setSelectedFolder(folder) : setVaultFolder(folder); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                        (activeTab === 'records' ? selectedFolder === folder : vaultFolder === folder) ? 'bg-rotc-accent/10 text-rotc-accent font-medium' : 'text-rotc-textMuted hover:bg-rotc-cardHover'
                      }`}
                    >
                      <span className="truncate max-w-[150px]">{folder}</span>
                      <FileIcon className="h-3.5 w-3.5 opacity-40 shrink-0" />
                    </button>
                  ))}
                </div>

                {/* Storage Health Check */}
                <div className="mt-4 pt-4 border-t border-rotc-border px-2">
                  <div className={`p-3 rounded-lg flex items-center justify-between mb-4 ${
                    storageStatus === 'ready' ? 'bg-green-500/10 text-green-500' :
                    storageStatus === 'checking' ? 'bg-rotc-bg text-rotc-textMuted' : 'bg-rotc-danger/10 text-rotc-danger'
                  }`}>
                    <div className="flex items-center gap-2">
                      {storageStatus === 'ready' ? <ShieldCheckIcon className="h-4 w-4" /> :
                       storageStatus === 'checking' ? <RotateCcwIcon className="h-4 w-4 animate-spin" /> :
                       <ShieldAlertIcon className="h-4 w-4" />}
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        Storage {storageStatus}
                      </span>
                    </div>
                    {storageStatus === 'error' && (
                      <button onClick={checkStorage} className="p-1 hover:bg-rotc-danger/20 rounded transition-colors" title="Retry Repair">
                        <RotateCcwIcon className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {storageStatus === 'error' && (
                    <p className="text-[10px] text-rotc-danger mb-4 px-1 italic">
                      Error: {storageError}. Please ensure the "vault" bucket exists in Supabase Storage.
                    </p>
                  )}

                  {activeTab === 'records' ? (
                    <>
                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setIsImportModalOpen(true)}>
                        <UploadIcon className="h-3 w-3 mr-2" /> Import Legacy CSV
                      </Button>
                      <Button variant="primary" size="sm" className="w-full text-xs" onClick={() => {
                        setUploadFolder(selectedFolder || '');
                        setIsUploadModalOpen(true);
                      }}>
                        <UploadIcon className="h-3 w-3 mr-2" /> Upload Folder Doc
                      </Button>
                    </>
                  ) : (
                    <Button variant="primary" size="sm" className="w-full text-xs" onClick={() => setIsUploadModalOpen(true)}>
                      <UploadIcon className="h-3 w-3 mr-2" /> Upload Document
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Folder Documents Quick Access (When a folder is selected) */}
            {activeTab === 'records' && selectedFolder && (
              <Card className="bg-rotc-accent/5 border-rotc-accent/20">
                <CardHeader>
                  <div className="flex items-center justify-between w-full">
                    <h3 className="text-sm font-bold text-rotc-accent flex items-center gap-2">
                      <FileIcon className="h-4 w-4" /> Folder Documents ({folderDocs.length})
                    </h3>
                    <Button variant="primary" size="sm" onClick={() => {
                      setUploadFolder(selectedFolder);
                      setIsUploadModalOpen(true);
                    }}>
                      <UploadIcon className="h-3 w-3 mr-2" /> Upload New Doc
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {isLoadingFolderDocs ? (
                    <div className="animate-pulse flex gap-4">
                      {[1,2,3].map(i => <div key={i} className="h-12 w-32 bg-rotc-border rounded-lg" />)}
                    </div>
                  ) : folderDocs.length === 0 ? (
                    <p className="text-xs text-rotc-textMuted italic">No documents uploaded to this folder yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {folderDocs.map(doc => (
                        <div key={doc.id} className="group relative bg-rotc-card border border-rotc-border p-3 rounded-xl flex items-center gap-3 hover:border-rotc-accent transition-all cursor-pointer shadow-sm">
                          <div className="p-2 bg-rotc-accent/10 rounded-lg text-rotc-accent">
                            <FileIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 pr-8">
                            <p className="text-xs font-bold text-rotc-text truncate max-w-[150px]">{doc.display_name || doc.filename}</p>
                            <p className="text-[10px] text-rotc-textMuted">{(doc.file_size / 1024).toFixed(1)} KB</p>
                          </div>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleDownload(doc)} className="p-1 hover:text-rotc-accent"><DownloadIcon className="h-3 w-3" /></button>
                            <button onClick={() => handleDelete(doc)} className="p-1 hover:text-rotc-danger"><TrashIcon className="h-3 w-3" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                  <h3 className="text-sm font-bold text-rotc-text flex items-center gap-2">
                    {activeTab === 'records' ? (selectedFolder || 'All Records') : (vaultFolder || 'All Documents')}
                  </h3>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {activeTab === 'vault' && (
                      <div className="flex items-center gap-2 text-xs text-rotc-textMuted whitespace-nowrap">
                        <select
                          value={vaultPageSize}
                          onChange={e => { setVaultPageSize(Number(e.target.value)); setVaultPage(1); }}
                          className="bg-rotc-bg border border-rotc-border rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-rotc-accent"
                        >
                          {[10, 20, 50, 100].map(sz => <option key={sz} value={sz}>{sz}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="relative max-w-xs w-full">
                      <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-rotc-textMuted" />
                      <Input
                        placeholder="Search..."
                        className="pl-9 h-9 text-xs"
                        value={activeTab === 'records' ? searchQuery : vaultSearch}
                        onChange={e => activeTab === 'records' ? setSearchQuery(e.target.value) : setVaultSearch(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {activeTab === 'records' ? (
                  /* Records Table */
                  <>
                    <Table
                      headers={['Name', 'ID Number', 'Gender', 'School', 'Folder', 'Status', 'Archived']}
                      isLoading={loadingArchives}
                      data={archives?.data || []}
                      keyExtractor={(r) => r.id}
                      renderRow={(r) => (
                        <>
                          <td className="p-4 text-sm font-medium text-rotc-text">{r.first_name} {r.last_name}</td>
                          <td className="p-4 text-sm text-rotc-textMuted">{r.id_number}</td>
                          <td className="p-4 text-sm text-rotc-textMuted">{r.gender}</td>
                          <td className="p-4 text-sm text-rotc-textMuted">{r.school}</td>
                          <td className="p-4 text-sm text-rotc-textMuted truncate max-w-[120px]" title={r.academic_year}>{r.academic_year}</td>
                          <td className="p-4"><Badge status={r.status === 'approved' ? 'success' : 'danger'} label={r.status === 'approved' ? 'Approved' : 'Rejected'} /></td>
                          <td className="p-4 text-sm text-rotc-textMuted">{r.archived_at ? format(new Date(r.archived_at), 'MMM d, yyyy') : '—'}</td>
                        </>
                      )}
                    />
                    {(archives?.count ?? 0) > archivePageSize && (
                      <div className="p-4 flex items-center justify-between border-t border-rotc-border bg-rotc-bg/30">
                        <span className="text-xs text-rotc-textMuted">Showing {archives?.data?.length || 0} of {archives?.count || 0} entries</span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" disabled={archivePage === 1} onClick={() => setArchivePage(p => p - 1)}>Prev</Button>
                          <Button variant="outline" size="sm" disabled={archivePage * archivePageSize >= (archives?.count ?? 0)} onClick={() => setArchivePage(p => p + 1)}>Next</Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Vault Table */
                  <>
                    <Table
                      headers={['File Name', 'Folder', 'Type', 'Size', 'Date Added', 'Actions']}
                      isLoading={isVaultLoading}
                      emptyMessage={storageStatus === 'error' ? "Cannot access documents. Please check your Storage Health status in the sidebar." : "No documents available."}
                      data={vaultData?.data || []}
                      keyExtractor={(d) => d.id}
                      renderRow={(d) => (
                        <>
                          <td className="p-4 text-sm font-medium text-rotc-text flex items-center gap-2">
                            <FileIcon className="h-4 w-4 text-rotc-accent" /> {d.display_name || d.filename}
                          </td>
                          <td className="p-4 text-sm text-rotc-textMuted">{d.folder_name}</td>
                          <td className="p-4 text-sm text-rotc-textMuted uppercase">{d.mime_type?.split('/')[1] || 'FILE'}</td>
                          <td className="p-4 text-sm text-rotc-textMuted">{(d.file_size / 1024).toFixed(1)} KB</td>
                          <td className="p-4 text-sm text-rotc-textMuted">{format(new Date(d.created_at), 'MMM d, yyyy')}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleDownload(d)} className="p-2 hover:bg-rotc-accent/10 rounded-lg text-rotc-accent transition-colors" title="Download"><DownloadIcon className="h-4 w-4" /></button>
                              <button onClick={() => { setSelectedDoc(d); setNewDocName(d.display_name || d.filename); setIsRenameModalOpen(true); }} className="p-2 hover:bg-blue-500/10 rounded-lg text-blue-500 transition-colors" title="Rename"><RenameIcon className="h-4 w-4" /></button>
                              <button onClick={() => handleDelete(d)} className="p-2 hover:bg-rotc-danger/10 rounded-lg text-rotc-danger transition-colors" title="Delete"><TrashIcon className="h-4 w-4" /></button>
                            </div>
                          </td>
                        </>
                      )}
                    />
                    {(vaultData?.count ?? 0) > vaultPageSize && (
                      <div className="p-4 flex items-center justify-between border-t border-rotc-border bg-rotc-bg/30">
                        <span className="text-xs text-rotc-textMuted">Showing {vaultData?.data?.length || 0} of {vaultData?.count || 0} entries</span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" disabled={vaultPage === 1} onClick={() => setVaultPage(p => p - 1)}>Prev</Button>
                          <Button variant="outline" size="sm" disabled={vaultPage * vaultPageSize >= (vaultData?.count ?? 0)} onClick={() => setVaultPage(p => p + 1)}>Next</Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Historical Records">
        <div className="space-y-4 mt-4">
          <Input label="Folder Name" placeholder="e.g. AER & ASR 2023-2024" value={folderName} onChange={e => setFolderName(e.target.value)} required />
          <div className="pt-2">
            <label className="block text-xs font-medium text-rotc-textMuted mb-1">Upload Records (CSV or Excel)</label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleImportFile}
              disabled={!folderName}
              className="w-full text-xs file:bg-rotc-accent file:text-white file:border-0 file:rounded-lg file:px-4 file:py-2"
            />
            <p className="text-[10px] text-rotc-textMuted mt-2">Column headers should match database fields (id_number, last_name, first_name, etc.)</p>
          </div>
          <div className="flex justify-end pt-4"><Button variant="outline" onClick={() => setIsImportModalOpen(false)}>Close</Button></div>
        </div>
      </Modal>

      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Upload to Document Vault">
        <div className="space-y-4 mt-4">
          <Input label="Folder Name" placeholder="e.g. Manuals, Memos, 2024-2025" value={uploadFolder} onChange={e => setUploadFolder(e.target.value)} required />
          <Input label="Display Name (Optional)" placeholder="Custom filename (leave blank to keep original)" value={customFilename} onChange={e => setCustomFilename(e.target.value)} />
          <div className="pt-2">
            <label className="block text-xs font-medium text-rotc-textMuted mb-1">Choose File (Excel, PDF, PPT, Word)</label>
            <input
              type="file"
              accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.csv"
              onChange={e => {
                const file = e.target.files?.[0] || null;
                setUploadFile(file);
                if (file && !uploadFolder && activeTab === 'records' && selectedFolder) {
                  setUploadFolder(selectedFolder);
                }
              }}
              className="w-full text-xs file:bg-rotc-accent file:text-white file:border-0 file:rounded-lg file:px-4 file:py-2"
            />
          </div>
          <div className="flex justify-end pt-4 gap-3">
            <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={!uploadFile || !uploadFolder}>Upload</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isRenameModalOpen} onClose={() => setIsRenameModalOpen(false)} title="Rename Document">
        <div className="space-y-4 mt-4">
          <Input label="New Filename" value={newDocName} onChange={e => setNewDocName(e.target.value)} required />
          <div className="flex justify-end pt-4 gap-3">
            <Button variant="outline" onClick={() => setIsRenameModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRename}>Save Rename</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}

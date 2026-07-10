import { useState, useEffect } from 'react'
import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { toast } from 'sonner'
import {
  Folder as FolderIcon,
  FolderPlus as FolderPlusIcon,
  Plus as PlusIcon,
  Loader2 as LoaderIcon,
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

export default function ArchivesPage() {
  const session = useSession()

  // Vault State
  const [vaultSearch, setVaultSearch] = useState('')
  const [vaultFolder, setVaultFolder] = useState<string | undefined>(undefined)
  const [vaultPage, setVaultPage] = useState(1)
  const [vaultPageSize, setVaultPageSize] = useState(20)
  const [vaultData, setVaultData] = useState<{ data: DocumentRecord[], count: number, folders: string[] }>({ data: [], count: 0, folders: [] })
  const [isVaultLoading, setIsVaultLoading] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false)
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null)
  const [newDocName, setNewDocName] = useState('')

  // Bulk upload states
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadFolder, setUploadFolder] = useState('')
  const [customFilename, setCustomFilename] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  // Create Folder states
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)

  // Downloading All status
  const [isDownloadingAll, setIsDownloadingAll] = useState(false)

  const [storageStatus, setStorageStatus] = useState<'checking' | 'ready' | 'error'>('checking')
  const [storageError, setStorageError] = useState('')

  // Load Vault Data
  const loadVault = async () => {
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
    // Auto-init storage on first load
    checkStorage()
  }, [vaultSearch, vaultFolder, vaultPage, vaultPageSize])

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

  const handleDownloadAll = async () => {
    if (!vaultFolder || !vaultData?.data?.length) return
    setIsDownloadingAll(true)
    toast.info("Preparing bulk download of all folder files...")

    // Filter out the placeholder keep file if downloading all
    const filesToDownload = vaultData.data.filter(
      d => d.filename !== 'empty_folder_placeholder.keep' && !d.filename.endsWith('_empty_folder_placeholder.keep')
    )

    if (filesToDownload.length === 0) {
      toast.error("No download-eligible files in this folder.")
      setIsDownloadingAll(false)
      return
    }

    try {
      for (let i = 0; i < filesToDownload.length; i++) {
        const doc = filesToDownload[i]
        try {
          const url = await getDownloadUrl(doc.storage_path)
          const link = document.createElement('a')
          link.href = url
          link.download = doc.filename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          // Small delay between trigger downloads to prevent browser blockages
          await new Promise(resolve => setTimeout(resolve, 600))
        } catch (err) {
          console.error(`Failed to download ${doc.filename}:`, err)
        }
      }
      toast.success("Bulk download complete")
    } catch (err: any) {
      toast.error("Download failed: " + err.message)
    } finally {
      setIsDownloadingAll(false)
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
    if (uploadFiles.length === 0 || !uploadFolder) return
    setIsUploading(true)
    let successCount = 0
    let failCount = 0

    for (const file of uploadFiles) {
      try {
        const displayName = uploadFiles.length === 1 && customFilename ? customFilename : file.name
        await uploadDocument(file, uploadFolder, false, displayName)
        successCount++
      } catch (err: any) {
        console.error(`Failed to upload ${file.name}:`, err)
        failCount++
      }
    }

    setIsUploading(false)
    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} document(s)`)
    }
    if (failCount > 0) {
      toast.error(`Failed to upload ${failCount} document(s)`)
    }

    setIsUploadModalOpen(false)
    setUploadFiles([])
    setUploadFolder('')
    setCustomFilename('')
    loadVault()
  }

  const handleCreateFolder = async () => {
    const trimmed = newFolderName.trim()
    if (!trimmed) return
    setIsCreatingFolder(true)
    try {
      const dummyFile = new File(["placeholder"], "empty_folder_placeholder.keep", { type: "text/plain" })
      await uploadDocument(dummyFile, trimmed, false, "empty_folder_placeholder.keep")
      toast.success(`Folder "${trimmed}" created successfully`)
      setIsCreateFolderModalOpen(false)
      setNewFolderName('')
      // Set active folder to the newly created folder
      setVaultFolder(trimmed)
      loadVault()
    } catch (err: any) {
      toast.error("Failed to create folder: " + err.message)
    } finally {
      setIsCreatingFolder(false)
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

  const renderBreadcrumbs = () => {
    if (!vaultFolder) return <h3 className="text-sm font-bold text-rotc-text">All Documents</h3>;
    const parts = vaultFolder.split('/');
    return (
      <div className="flex items-center gap-1.5 text-xs text-rotc-textMuted">
        <button
          onClick={() => setVaultFolder(undefined)}
          className="hover:text-rotc-accent transition-colors font-medium hover:underline"
        >
          All Documents
        </button>
        {parts.map((part, index) => {
          const folderPath = parts.slice(0, index + 1).join('/');
          const isLast = index === parts.length - 1;
          return (
            <span key={folderPath} className="flex items-center gap-1.5">
              <span>/</span>
              {isLast ? (
                <span className="text-rotc-text font-bold max-w-[150px] truncate">{part}</span>
              ) : (
                <button
                  onClick={() => setVaultFolder(folderPath)}
                  className="hover:text-rotc-accent transition-colors font-medium hover:underline max-w-[120px] truncate"
                >
                  {part}
                </button>
              )}
            </span>
          );
        })}
      </div>
    );
  };

  const displayedFiles = (vaultData?.data || []).filter(
    d => d.filename !== 'empty_folder_placeholder.keep' && !d.filename.endsWith('_empty_folder_placeholder.keep')
  )

  return (
    <AppLayout title="Document Vault">
      <div className="space-y-6">

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Folders Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <h3 className="text-sm font-bold text-rotc-text flex items-center gap-2">
                    <FolderIcon className="h-4 w-4 text-rotc-accent" /> Folders
                  </h3>
                  <button
                    onClick={() => setIsCreateFolderModalOpen(true)}
                    className="p-1 hover:bg-rotc-accent/10 rounded text-rotc-accent transition-colors"
                    title="Create Folder"
                  >
                    <FolderPlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="px-2 py-2">
                <div className="space-y-1">
                  <button
                    onClick={() => { setVaultFolder(undefined); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      !vaultFolder ? 'bg-rotc-accent/10 text-rotc-accent font-medium' : 'text-rotc-textMuted hover:bg-rotc-cardHover'
                    }`}
                  >
                    All Documents
                  </button>

                  {vaultData.folders?.map((folder: string) => {
                    const parts = folder.split('/')
                    const depth = parts.length - 1
                    const displayName = parts[parts.length - 1]
                    return (
                      <button
                        key={folder}
                        onClick={() => { setVaultFolder(folder); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                          vaultFolder === folder ? 'bg-rotc-accent/10 text-rotc-accent font-medium' : 'text-rotc-textMuted hover:bg-rotc-cardHover'
                        }`}
                        style={{ paddingLeft: `${12 + depth * 12}px` }}
                      >
                        <span className="truncate flex items-center gap-1.5 max-w-[150px]">
                          <FolderIcon className="h-3.5 w-3.5 shrink-0 opacity-60 text-rotc-accent" />
                          {displayName}
                        </span>
                        <FileIcon className="h-3.5 w-3.5 opacity-40 shrink-0" />
                      </button>
                    )
                  })}
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

                  <div className="space-y-2">
                    <Button variant="primary" size="sm" className="w-full text-xs" onClick={() => setIsUploadModalOpen(true)}>
                      <UploadIcon className="h-3 w-3 mr-2" /> Upload Document
                    </Button>
                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setIsCreateFolderModalOpen(true)}>
                      <PlusIcon className="h-3 w-3 mr-2 text-rotc-accent" /> Create Folder
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {renderBreadcrumbs()}
                    {vaultFolder && displayedFiles.length > 0 && (
                      <Button
                        variant="outline"
                        size="xs"
                        className="text-[10px] h-7 px-2.5 flex items-center gap-1 text-rotc-accent hover:bg-rotc-accent/10 border-rotc-accent/30"
                        onClick={handleDownloadAll}
                        isLoading={isDownloadingAll}
                      >
                        <DownloadIcon className="h-3 w-3" /> Download Folder Files
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 text-xs text-rotc-textMuted whitespace-nowrap">
                      <select
                        value={vaultPageSize}
                        onChange={e => { setVaultPageSize(Number(e.target.value)); setVaultPage(1); }}
                        className="bg-rotc-bg border border-rotc-border rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-rotc-accent"
                      >
                        {[10, 20, 50, 100].map(sz => <option key={sz} value={sz}>{sz}</option>)}
                      </select>
                    </div>
                    <div className="relative max-w-xs w-full">
                      <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-rotc-textMuted" />
                      <Input
                        placeholder="Search..."
                        className="pl-9 h-9 text-xs"
                        value={vaultSearch}
                        onChange={e => setVaultSearch(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table
                      headers={['File Name', 'Folder', 'Type', 'Size', 'Date Added', 'Actions']}
                      isLoading={isVaultLoading}
                      emptyMessage={storageStatus === 'error' ? "Cannot access documents. Please check your Storage Health status in the sidebar." : "No documents available."}
                      data={displayedFiles}
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
                        <span className="text-xs text-rotc-textMuted">Showing {displayedFiles.length} of {vaultData?.count || 0} entries</span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" disabled={vaultPage === 1} onClick={() => setVaultPage(p => p - 1)}>Prev</Button>
                          <Button variant="outline" size="sm" disabled={vaultPage * vaultPageSize >= (vaultData?.count ?? 0)} onClick={() => setVaultPage(p => p + 1)}>Next</Button>
                        </div>
                      </div>
                    )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Upload to Document Vault">
        <div className="space-y-4 mt-4">
          <Input label="Folder Name" placeholder="e.g. Manuals, Memos, 2024-2025" value={uploadFolder} onChange={e => setUploadFolder(e.target.value)} required />
          {uploadFiles.length <= 1 && (
            <Input label="Display Name (Optional)" placeholder="Custom filename (leave blank to keep original)" value={customFilename} onChange={e => setCustomFilename(e.target.value)} />
          )}
          <div className="pt-2">
            <label className="block text-xs font-medium text-rotc-textMuted mb-1">Choose Files (Excel, PDF, PPT, Word, CSV)</label>
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.csv"
              onChange={e => {
                const files = e.target.files ? Array.from(e.target.files) : [];
                setUploadFiles(files);
              }}
              className="w-full text-xs file:bg-rotc-accent file:text-white file:border-0 file:rounded-lg file:px-4 file:py-2"
            />
          </div>

          {uploadFiles.length > 0 && (
            <div className="bg-rotc-bg/40 border border-rotc-border rounded-lg p-3 max-h-40 overflow-y-auto space-y-1.5">
              <span className="text-xs font-semibold text-rotc-text block mb-1">Selected Files ({uploadFiles.length})</span>
              {uploadFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs text-rotc-textMuted bg-rotc-bg/65 p-1.5 rounded border border-rotc-border/40">
                  <span className="truncate max-w-[250px]">{file.name}</span>
                  <span>{(file.size / 1024).toFixed(1)} KB</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4 gap-3">
            <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} isLoading={isUploading} disabled={uploadFiles.length === 0 || !uploadFolder}>Upload</Button>
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

      <Modal isOpen={isCreateFolderModalOpen} onClose={() => setIsCreateFolderModalOpen(false)} title="Create Folder">
        <div className="space-y-4 mt-4">
          <Input
            label="Folder Name"
            placeholder="e.g. 2020 AER & ASR, 2020 AER & ASR/First Semester"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            required
          />
          <p className="text-[10px] text-rotc-textMuted italic">
            Tip: You can use slashes (e.g. "Folder/Subfolder") to automatically structure folders hierarchically!
          </p>
          <div className="flex justify-end pt-4 gap-3">
            <Button variant="outline" onClick={() => setIsCreateFolderModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateFolder} isLoading={isCreatingFolder} disabled={!newFolderName.trim()}>
              Create Folder
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}

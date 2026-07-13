import { useState, useEffect } from 'react'
import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { toast } from 'sonner'
import {
  Folder as FolderIcon,
  FolderPlus as FolderPlusIcon,
  Search as SearchIcon,
  ShieldAlert as ShieldAlertIcon,
  FileText as FileIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Trash2 as TrashIcon,
  Edit3 as RenameIcon,
  RotateCcw as RotateCcwIcon,
  ChevronRight as ChevronRightIcon,
  Home as HomeIcon,
  Database as DatabaseIcon,
  X as XIcon
} from 'lucide-react'
import { format } from 'date-fns'
import { getAdminDocuments, uploadDocument, deleteDocument, getDownloadUrl, DocumentRecord, initStorage, createFolder } from '@/services/documents.service'
import { deleteEnrollmentArchiveYear } from '@/services/enrollment.service'
import { supabase } from '@/lib/supabase'

export default function ArchivesPage() {
  const session = useSession()

  // Google Drive Style State
  const [currentPath, setCurrentPath] = useState<string>('')
  const [vaultSearch, setVaultSearch] = useState('')
  const [vaultPage, setVaultPage] = useState(1)
  const [vaultPageSize, setVaultPageSize] = useState(50)
  const [vaultData, setVaultData] = useState<{ data: DocumentRecord[], count: number, folders: string[] }>({ data: [], count: 0, folders: [] })
  const [isVaultLoading, setIsVaultLoading] = useState(false)

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false)
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null)
  const [newDocName, setNewDocName] = useState('')

  // Bulk upload states
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)

  // Create Folder states
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)

  // Downloading All status
  const [isDownloadingAll, setIsDownloadingAll] = useState(false)

  // Compiled CSV download status
  const [isCompilingCSV, setIsCompilingCSV] = useState(false)
  const [isExportCSVModalOpen, setIsExportCSVModalOpen] = useState(false)
  const [availableAcademicYears, setAvailableAcademicYears] = useState<string[]>([])
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('')
  const [isFetchingYears, setIsFetchingYears] = useState(false)

  const [storageStatus, setStorageStatus] = useState<'checking' | 'ready' | 'error'>('checking')
  const [storageError, setStorageError] = useState('')

  // Load Vault Data
  const loadVault = async () => {
    setIsVaultLoading(true)
    try {
      const result = await getAdminDocuments({
        search: vaultSearch,
        folder: currentPath,
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
  }, [currentPath, vaultSearch, vaultPage, vaultPageSize])

  useEffect(() => {
    checkStorage()
  }, [])

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
    const filesToDownload = (vaultData.data || []).filter(
      d => d.mime_type !== 'application/vnd.rotc.folder' && d.filename !== 'empty_folder_placeholder.keep' && !d.filename.endsWith('_empty_folder_placeholder.keep')
    )

    if (filesToDownload.length === 0) {
      toast.error("No files in this folder to download.")
      return
    }

    setIsDownloadingAll(true)
    toast.info(`Preparing download for ${filesToDownload.length} file(s)...`)

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
          await new Promise(resolve => setTimeout(resolve, 600))
        } catch (err) {
          console.error(`Failed to download ${doc.filename}:`, err)
        }
      }
      toast.success("Download tasks started successfully")
    } catch (err: any) {
      toast.error("Download failed: " + err.message)
    } finally {
      setIsDownloadingAll(false)
    }
  }

  // NEW FEATURE: Download Compiled Historical CSV from enrollment_archives
  const handleOpenExportModal = async () => {
    setIsFetchingYears(true)
    setIsExportCSVModalOpen(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error("Unauthorized")

      const response = await fetch('/api/admin/enrollment-archives?pageSize=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await response.json()
      if (response.ok && result.success && result.academicYears) {
        setAvailableAcademicYears(result.academicYears)
        if (result.academicYears.length > 0) {
          setSelectedAcademicYear(result.academicYears[0])
        }
      }
    } catch (err) {
      console.error("Failed to fetch academic years", err)
    } finally {
      setIsFetchingYears(false)
    }
  }

  const handleDeleteAcademicYear = async (year: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete all archived enrollment records for ${year}? This cannot be undone.`)) {
      return
    }
    
    try {
      toast.info(`Deleting records for ${year}...`)
      await deleteEnrollmentArchiveYear(year)
      toast.success(`Successfully deleted archived records for ${year}`)
      
      // Update the available years list
      const updatedYears = availableAcademicYears.filter(y => y !== year)
      setAvailableAcademicYears(updatedYears)
      
      // Clear selection if it was the deleted one
      if (selectedAcademicYear === year) {
        setSelectedAcademicYear(updatedYears.length > 0 ? updatedYears[0] : '')
      }
    } catch (err: any) {
      toast.error(`Failed to delete records: ${err.message}`)
    }
  }

  const executeCSVExport = async () => {
    if (!selectedAcademicYear) return toast.error("Please select an academic year")
    
    setIsExportCSVModalOpen(false)
    setIsCompilingCSV(true)
    toast.info(`Compiling records for Academic Year: ${selectedAcademicYear}...`)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error("Unauthorized")

      // Fetch ALL enrollment archives for the selected year
      const response = await fetch(`/api/admin/enrollment-archives?pageSize=100000&academicYear=${encodeURIComponent(selectedAcademicYear)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to fetch archives")

      const records = result.data || []
      if (records.length === 0) {
        toast.error(`No archived enrollment records found for ${selectedAcademicYear}.`)
        setIsCompilingCSV(false)
        return
      }

      // Build CSV
      const csvHeaders = [
        'ID Number', 'School', 'Last Name', 'First Name', 'MI', 'Suffix',
        'Gender', 'DOB', 'Course & Year', 'Contact No.', 'Home Address', 'Religion',
        'Blood Type', 'Height', 'Beneficiary', 'Relationship', 'Email Add',
        'Emergency Contact Name', 'Relationship', 'Contact Number', 'Status', 'Semester', 'MS Class', 'Role', 'Archived Date'
      ]

      let grandTotalMale = 0;
      let grandTotalFemale = 0;
      const schoolStats: Record<string, { male: number, female: number }> = {};

      const csvRows = records.map((r: any) => {
        const gender = (r.gender || '').toUpperCase();
        const school = r.school || 'Unknown';
        
        if (!schoolStats[school]) schoolStats[school] = { male: 0, female: 0 };
        
        if (gender === 'MALE' || gender === 'M') {
          schoolStats[school].male++;
          grandTotalMale++;
        } else if (gender === 'FEMALE' || gender === 'F') {
          schoolStats[school].female++;
          grandTotalFemale++;
        }

        const msClass = r.ms_title && r.ms_subject ? `${r.ms_title} (${r.ms_subject})` : (r.ms_title || r.ms_subject || '');

        return [
          r.id_number, r.school, r.last_name, r.first_name, r.middle_initial, r.suffix,
          r.gender, 
          r.date_of_birth ? format(new Date(r.date_of_birth + 'T00:00:00'), 'MMMM d, yyyy') : '', 
          r.course_year, r.contact_number, r.home_address, r.religion,
          r.blood_type, r.height_feet, r.beneficiary_name, r.beneficiary_relationship, r.email,
          r.emergency_name, r.emergency_relationship, r.emergency_contact, r.status, r.semester, 
          msClass, r.role, 
          r.reviewed_at ? format(new Date(r.reviewed_at), 'MMMM d, yyyy') : ''
        ].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',')
      });

      const footerRows = ['', '']; // Empty rows for padding
      
      Object.entries(schoolStats).forEach(([school, stats]) => {
        const total = stats.male + stats.female;
        footerRows.push(`"${school} Total: Male=${stats.male} Female=${stats.female} =${total}"`);
      });

      const grandTotal = grandTotalMale + grandTotalFemale;
      const dateStrDetailed = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
      footerRows.push(`"GRAND TOTAL: ${grandTotal} (Male=${grandTotalMale} Female=${grandTotalFemale}) - Exported ${dateStrDetailed}"`);

      const csvContent = '\uFEFF' + [csvHeaders.join(','), ...csvRows, ...footerRows].join('\n')

      // Trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const dateStr = new Date().toISOString().split('T')[0]
      link.href = url
      link.download = `${dateStr}_Compiled_${selectedAcademicYear}_Enrollment_Archives.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`Successfully compiled ${records.length} records into CSV!`)
    } catch (err: any) {
      toast.error("Failed to compile CSV: " + err.message)
    } finally {
      setIsCompilingCSV(false)
    }
  }

  const handleDelete = async (doc: DocumentRecord) => {
    const isFolder = doc.mime_type === 'application/vnd.rotc.folder'
    const msg = isFolder
      ? `Are you sure you want to delete folder "${doc.display_name}" and ALL its nested contents permanently? This cannot be undone.`
      : `Are you sure you want to delete file "${doc.display_name || doc.filename}"?`

    if (!confirm(msg)) return

    try {
      if (isFolder) {
        // Use doc's actual database folder_name rather than currentPath
        const folderFullPath = doc.folder_name ? `${doc.folder_name}/${doc.display_name}` : (doc.display_name || '')
        await deleteDocument(doc.id, doc.storage_path, true, folderFullPath)
        toast.success(`Folder "${doc.display_name}" and its files deleted`)
      } else {
        await deleteDocument(doc.id, doc.storage_path, false)
        toast.success("Document deleted")
      }
      loadVault()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return
    setIsUploading(true)
    let successCount = 0
    let failCount = 0

    for (const file of uploadFiles) {
      try {
        await uploadDocument(file, currentPath, false, file.name)
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
    loadVault()
  }

  const handleCreateFolder = async () => {
    const trimmed = newFolderName.trim().replace(/[\/\\]+$/, '')
    if (!trimmed) return

    setIsCreatingFolder(true)
    try {
      await createFolder(trimmed, currentPath)
      toast.success(`Folder "${trimmed}" created successfully`)
      setIsCreateFolderModalOpen(false)
      setNewFolderName('')
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
      const isFolder = selectedDoc.mime_type === 'application/vnd.rotc.folder'

      if (isFolder) {
        // Rename folder: update all documents in this folder to the new folder name
        // Use the selectedDoc's actual database folder_name rather than currentPath
        const oldFolderPath = selectedDoc.folder_name ? `${selectedDoc.folder_name}/${selectedDoc.display_name}` : (selectedDoc.display_name || '')
        const newFolderPath = selectedDoc.folder_name ? `${selectedDoc.folder_name}/${newDocName}` : newDocName

        const res = await fetch('/api/admin/documents', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({
            id: selectedDoc.id,
            newFilename: newDocName,
            oldFolderName: oldFolderPath,
            newFolderName: newFolderPath
          })
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error)
      } else {
        // Rename file display name
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
      }

      toast.success("Renamed successfully")
      setIsRenameModalOpen(false)
      loadVault()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Filter out any virtual .keep placeholders
  const displayedItems = (vaultData?.data || []).filter(
    d => d.filename !== '.keep' || d.mime_type === 'application/vnd.rotc.folder'
  )

  // Sort: folders first, then files alphabetically
  const sortedItems = [...displayedItems].sort((a, b) => {
    const isFolderA = a.mime_type === 'application/vnd.rotc.folder'
    const isFolderB = b.mime_type === 'application/vnd.rotc.folder'
    if (isFolderA && !isFolderB) return -1
    if (!isFolderA && isFolderB) return 1
    return (a.display_name || a.filename).localeCompare(b.display_name || b.filename)
  })

  // Breadcrumbs Generator
  const renderBreadcrumbs = () => {
    const parts = currentPath ? currentPath.split('/') : []
    return (
      <div className="flex items-center gap-1.5 text-sm text-rotc-textMuted bg-rotc-bg/40 px-3 py-1.5 rounded-lg border border-rotc-border/40">
        <button
          onClick={() => { setCurrentPath(''); setVaultPage(1); setVaultSearch(''); }}
          className="hover:text-rotc-accent transition-colors font-medium flex items-center gap-1 hover:underline"
        >
          <HomeIcon className="h-4 w-4" />
          <span>Home</span>
        </button>
        {parts.map((part, index) => {
          const folderPath = parts.slice(0, index + 1).join('/')
          const isLast = index === parts.length - 1
          return (
            <div key={folderPath} className="flex items-center gap-1.5">
              <ChevronRightIcon className="h-3.5 w-3.5 opacity-60" />
              {isLast ? (
                <span className="text-rotc-text font-bold max-w-[150px] truncate">{part}</span>
              ) : (
                <button
                  onClick={() => { setCurrentPath(folderPath); setVaultPage(1); setVaultSearch(''); }}
                  className="hover:text-rotc-accent transition-colors font-medium hover:underline max-w-[120px] truncate"
                >
                  {part}
                </button>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <AppLayout title="Document Vault">
      <div className="space-y-6">

        {/* Top Control Bar with breadcrumbs and primary actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {renderBreadcrumbs()}

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="primary" size="sm" onClick={() => setIsUploadModalOpen(true)}>
              <UploadIcon className="h-4 w-4 mr-1.5" /> Upload File
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsCreateFolderModalOpen(true)} className="border-rotc-accent/30 text-rotc-accent hover:bg-rotc-accent/10">
              <FolderPlusIcon className="h-4 w-4 mr-1.5" /> Create Folder
            </Button>
            {currentPath && sortedItems.filter(d => d.mime_type !== 'application/vnd.rotc.folder').length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadAll}
                isLoading={isDownloadingAll}
                className="border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
              >
                <DownloadIcon className="h-4 w-4 mr-1.5" /> Download Folder
              </Button>
            )}
            {/* NEW: Compiled Historical CSV Export */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenExportModal}
              isLoading={isCompilingCSV}
              className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
            >
              <DatabaseIcon className="h-4 w-4 mr-1.5" /> Export All Enrollees CSV
            </Button>
          </div>
        </div>

        {/* Storage Health Alert */}
        {storageStatus === 'error' && (
          <div className="p-4 rounded-lg bg-rotc-danger/10 border border-rotc-danger/30 text-rotc-danger flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldAlertIcon className="h-5 w-5" />
              <span>Storage Error: {storageError}. Run manual recovery SQL or verify storage configuration.</span>
            </div>
            <button onClick={checkStorage} className="flex items-center gap-1.5 text-xs bg-rotc-danger/20 hover:bg-rotc-danger/30 px-2.5 py-1.5 rounded transition-colors">
              <RotateCcwIcon className="h-3.5 w-3.5" /> Retry Repair
            </button>
          </div>
        )}

        {/* Main Explorer View */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
              <h3 className="text-sm font-bold text-rotc-text flex items-center gap-2">
                📂 {currentPath ? currentPath.split('/').pop() : 'Root Folder'}
              </h3>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-2 text-xs text-rotc-textMuted whitespace-nowrap">
                  <select
                    value={vaultPageSize}
                    onChange={e => { setVaultPageSize(Number(e.target.value)); setVaultPage(1); }}
                    className="bg-rotc-bg border border-rotc-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-rotc-accent"
                  >
                    {[20, 50, 100].map(sz => <option key={sz} value={sz}>{sz} per page</option>)}
                  </select>
                </div>
                <div className="relative max-w-xs w-full">
                  <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-rotc-textMuted" />
                  <Input
                    placeholder="Search in this folder..."
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
              headers={['Name', 'Type', 'Size', 'Date Added', 'Actions']}
              isLoading={isVaultLoading}
              emptyMessage={storageStatus === 'error' ? "Storage error occurred. Please check the sidebar status." : "This folder is empty. Click Upload File or Create Folder to add content."}
              data={sortedItems}
              keyExtractor={(d) => d.id}
              renderRow={(d) => {
                const isFolder = d.mime_type === 'application/vnd.rotc.folder'
                return (
                  <>
                    <td
                      className={`p-4 text-sm font-medium ${isFolder ? 'cursor-pointer hover:bg-rotc-accent/5' : ''}`}
                      onClick={() => {
                        if (isFolder) {
                          const target = d.folder_name ? `${d.folder_name}/${d.display_name}` : (d.display_name || '');
                          setCurrentPath(target);
                          setVaultPage(1);
                          setVaultSearch('');
                        }
                      }}
                    >
                      {isFolder ? (
                        <div className="flex items-center gap-2.5 text-rotc-accent hover:underline font-semibold">
                          <FolderIcon className="h-5 w-5 shrink-0 text-rotc-accent" />
                          <span>{d.display_name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 text-rotc-text">
                          <FileIcon className="h-5 w-5 shrink-0 opacity-60" />
                          <span>{d.display_name || d.filename}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-sm text-rotc-textMuted uppercase">
                      {isFolder ? 'Folder' : d.mime_type?.split('/')[1] || 'File'}
                    </td>
                    <td className="p-4 text-sm text-rotc-textMuted">
                      {isFolder ? '—' : `${(d.file_size / 1024).toFixed(1)} KB`}
                    </td>
                    <td className="p-4 text-sm text-rotc-textMuted">
                      {format(new Date(d.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        {!isFolder && (
                          <button
                            onClick={() => handleDownload(d)}
                            className="p-1.5 hover:bg-rotc-accent/10 rounded-lg text-rotc-accent transition-colors"
                            title="Download"
                          >
                            <DownloadIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => { setSelectedDoc(d); setNewDocName(d.display_name || d.filename); setIsRenameModalOpen(true); }}
                          className="p-1.5 hover:bg-blue-500/10 rounded-lg text-blue-500 transition-colors"
                          title="Rename"
                        >
                          <RenameIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(d)}
                          className="p-1.5 hover:bg-rotc-danger/10 rounded-lg text-rotc-danger transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </>
                )
              }}
            />
            {(vaultData?.count ?? 0) > vaultPageSize && (
              <div className="p-4 flex items-center justify-between border-t border-rotc-border bg-rotc-bg/30">
                <span className="text-xs text-rotc-textMuted">Showing {sortedItems.length} of {vaultData?.count || 0} entries</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={vaultPage === 1} onClick={() => setVaultPage(p => p - 1)}>Prev</Button>
                  <Button variant="outline" size="sm" disabled={vaultPage * vaultPageSize >= (vaultData?.count ?? 0)} onClick={() => setVaultPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload Modal */}
      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Upload files to Document Vault">
        <div className="space-y-4 mt-4">
          <div className="p-3 bg-rotc-bg/60 border border-rotc-border/60 rounded-lg text-xs text-rotc-textMuted">
            Uploading files to folder: <span className="text-rotc-text font-bold">{currentPath || 'Root Folder'}</span>
          </div>
          <div className="pt-2">
            <label className="block text-xs font-medium text-rotc-textMuted mb-2">Choose Files (Excel, PDF, Word, CSV, PPT)</label>
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.csv"
              onChange={e => {
                const files = e.target.files ? Array.from(e.target.files) : []
                setUploadFiles(files)
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
            <Button onClick={handleUpload} isLoading={isUploading} disabled={uploadFiles.length === 0}>Upload</Button>
          </div>
        </div>
      </Modal>

      {/* Rename Modal */}
      <Modal isOpen={isRenameModalOpen} onClose={() => setIsRenameModalOpen(false)} title="Rename Item">
        <div className="space-y-4 mt-4">
          <Input label="Name" value={newDocName} onChange={e => setNewDocName(e.target.value)} required />
          <div className="flex justify-end pt-4 gap-3">
            <Button variant="outline" onClick={() => setIsRenameModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRename}>Save Name</Button>
          </div>
        </div>
      </Modal>

      {/* Create Folder Modal */}
      <Modal isOpen={isCreateFolderModalOpen} onClose={() => setIsCreateFolderModalOpen(false)} title="Create Folder">
        <div className="space-y-4 mt-4">
          <div className="p-3 bg-rotc-bg/60 border border-rotc-border/60 rounded-lg text-xs text-rotc-textMuted">
            Creating folder in parent path: <span className="text-rotc-text font-bold">{currentPath || 'Root Folder'}</span>
          </div>
          <Input
            label="Folder Name"
            placeholder="e.g. 2026-2027, graduation_memos"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            required
          />
          <div className="flex justify-end pt-4 gap-3">
            <Button variant="outline" onClick={() => setIsCreateFolderModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateFolder} isLoading={isCreatingFolder} disabled={!newFolderName.trim()}>
              Create Folder
            </Button>
          </div>
        </div>
      </Modal>
      {/* Dynamic Academic Year Export Modal */}
      <Modal isOpen={isExportCSVModalOpen} onClose={() => setIsExportCSVModalOpen(false)} title="Export Enrollment Archives">
        <div className="space-y-4 mt-4">
          <p className="text-sm text-rotc-text">Select the Academic Year you want to export. This list is automatically populated from your existing records.</p>
          
          <div className="space-y-3">
            <label className="text-sm font-medium text-rotc-textMuted">Academic Year / File Name</label>
            <div className="relative">
              <input 
                type="text"
                value={selectedAcademicYear} 
                onChange={e => setSelectedAcademicYear(e.target.value)}
                placeholder="e.g. 2026-2027 or custom name"
                className="w-full px-3 py-2 bg-rotc-bg border border-rotc-border rounded-lg text-sm text-rotc-text focus:outline-none focus:border-rotc-accent"
              />
              {selectedAcademicYear && (
                <button 
                  type="button" 
                  onClick={() => setSelectedAcademicYear('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-rotc-textMuted hover:text-rotc-danger transition-colors"
                  title="Clear input"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            {isFetchingYears ? (
              <div className="text-sm text-rotc-textMuted py-2">Loading available years...</div>
            ) : availableAcademicYears.length > 0 && (
              <div className="pt-2">
                <p className="text-xs text-rotc-textMuted mb-2 font-medium">Or select from existing archives:</p>
                <div className="flex flex-wrap gap-2">
                  {availableAcademicYears.map(year => (
                    <div key={year} className="flex items-center bg-rotc-bg/60 border border-rotc-border rounded-lg overflow-hidden">
                      <button 
                        type="button"
                        onClick={() => setSelectedAcademicYear(year)}
                        className={`px-3 py-1.5 text-xs transition-colors hover:bg-rotc-cardHover ${selectedAcademicYear === year ? 'text-rotc-accent font-bold bg-rotc-accent/10' : 'text-rotc-text'}`}
                      >
                        {year}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAcademicYear(year)}
                        className="p-1.5 text-rotc-textMuted hover:text-rotc-danger hover:bg-rotc-danger/10 transition-colors border-l border-rotc-border"
                        title="Delete this entire academic year archive"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-rotc-border">
            <Button type="button" variant="outline" onClick={() => setIsExportCSVModalOpen(false)}>Cancel</Button>
            <Button onClick={executeCSVExport} disabled={isFetchingYears || availableAcademicYears.length === 0}>Export CSV</Button>
          </div>
        </div>
      </Modal>

    </AppLayout>
  )
}

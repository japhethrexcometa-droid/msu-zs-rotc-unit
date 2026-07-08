import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { useArchivedUsers, useReactivateUser } from '@/hooks/queries/useUsers'
import { useEnrollmentArchives, useImportEnrollmentArchives } from '@/hooks/queries/useEnrollment'
import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { RotateCcw, Folder, Search, FileText, Download, Upload, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

export default function ArchivesPage() {
  const session = useSession()

  // Tabs: 'users' (Deactivated Accounts) vs 'enrollment' (Historical Enrollment)
  const [activeTab, setActiveTab] = useState<'users' | 'enrollment'>('users')

  // Deactivated Users State
  const { data: archivedUsers, isLoading: loadingUsers } = useArchivedUsers()
  const reactivateMutation = useReactivateUser()
  const [roleFilter, setRoleFilter] = useState<string>('All')
  const [restoreId, setRestoreId] = useState<string | null>(null)

  // Enrollment Archive State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedYear, setSelectedYear] = useState<string | undefined>(undefined)
  const [archivePage, setArchivePage] = useState(1)
  const archivePageSize = 20

  const { data: archives, isLoading: loadingArchives } = useEnrollmentArchives({
    searchQuery,
    academicYear: selectedYear,
    page: archivePage,
    pageSize: archivePageSize
  })

  const importMutation = useImportEnrollmentArchives()
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importYear, setImportYear] = useState('')

  if (!session) return null

  const filteredUsers = (archivedUsers ?? []).filter(u =>
    roleFilter === 'All' || u.role === roleFilter.toLowerCase()
  )

  const handleRestore = async () => {
    if (!restoreId) return
    try {
      await reactivateMutation.mutateAsync(restoreId)
      toast.success('User reactivated')
      setRestoreId(null)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !importYear) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n')
      const headers = lines[0].split(',').map(h => h.trim())

      const records = lines.slice(1).filter(l => l.trim()).map(line => {
        const values = line.split(',')
        const obj: any = {}
        headers.forEach((h, i) => {
          // Normalize common CSV headers to our schema
          const key = h.toLowerCase().replace(/ /g, '_')
          obj[key] = values[i]?.trim()
        })
        return obj
      })

      try {
        await importMutation.mutateAsync({ records, academicYear: importYear })
        toast.success(`Successfully imported ${records.length} records into ${importYear}`)
        setIsImportModalOpen(false)
        setImportYear('')
      } catch (err: any) {
        toast.error(err.message)
      }
    }
    reader.readAsText(file)
  }

  return (
    <AppLayout title="Archives">
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex bg-rotc-card p-1 rounded-xl border border-rotc-border w-fit">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'users' ? 'bg-rotc-accent text-white shadow-lg' : 'text-rotc-textMuted hover:text-rotc-text'
            }`}
          >
            Deactivated Users
          </button>
          <button
            onClick={() => setActiveTab('enrollment')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'enrollment' ? 'bg-rotc-accent text-white shadow-lg' : 'text-rotc-textMuted hover:text-rotc-text'
            }`}
          >
            Historical Enrollment
          </button>
        </div>

        {activeTab === 'users' ? (
          <Card>
            <CardHeader title="Deactivated Accounts">
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 bg-rotc-bg border border-rotc-border rounded-lg text-sm text-rotc-text focus:outline-none focus:border-rotc-accent"
              >
                <option value="All">All Roles</option>
                <option value="Cadet">Cadets</option>
                <option value="Officer">Officers</option>
              </select>
            </CardHeader>
            <CardContent className="p-0">
              <Table
                headers={['Name', 'ID Number', 'Role', 'Platoon', 'Deactivated', 'Actions']}
                isLoading={loadingUsers}
                data={filteredUsers}
                keyExtractor={(u) => u.id}
                renderRow={(u) => (
                  <>
                    <td className="p-4 text-sm font-medium text-rotc-text">{u.full_name}</td>
                    <td className="p-4 text-sm text-rotc-textMuted">{u.id_number}</td>
                    <td className="p-4">
                      <Badge status="default" label={u.role} />
                    </td>
                    <td className="p-4 text-sm text-rotc-textMuted">{u.platoon || '—'}</td>
                    <td className="p-4 text-sm text-rotc-textMuted">
                      {u.updated_at ? format(new Date(u.updated_at), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setRestoreId(u.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rotc-accent hover:bg-rotc-accent/10 transition-colors"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restore
                      </button>
                    </td>
                  </>
                )}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Folder-like Year Selection */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <h3 className="text-sm font-bold text-rotc-text flex items-center gap-2">
                    <Folder className="h-4 w-4 text-rotc-accent" /> Academic Years
                  </h3>
                </CardHeader>
                <CardContent className="px-2 py-2">
                  <div className="space-y-1">
                    <button
                      onClick={() => setSelectedYear(undefined)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        !selectedYear ? 'bg-rotc-accent/10 text-rotc-accent font-medium' : 'text-rotc-textMuted hover:bg-rotc-cardHover'
                      }`}
                    >
                      All Records
                    </button>
                    {archives?.academicYears?.map((year: string) => (
                      <button
                        key={year}
                        onClick={() => setSelectedYear(year)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                          selectedYear === year ? 'bg-rotc-accent/10 text-rotc-accent font-medium' : 'text-rotc-textMuted hover:bg-rotc-cardHover'
                        }`}
                      >
                        {year}
                        <FileText className="h-3.5 w-3.5 opacity-40" />
                      </button>
                    ))}
                    {(!archives?.academicYears || archives.academicYears.length === 0) && !loadingArchives && (
                      <div className="p-4 text-center text-xs text-rotc-textMuted">No archives found</div>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-rotc-border px-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setIsImportModalOpen(true)}
                    >
                      <Upload className="h-3 w-3 mr-2" /> Import Legacy CSV
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
                      {selectedYear ? `Records for AY ${selectedYear}` : 'All Historical Records'}
                    </h3>
                    <div className="relative max-w-xs w-full">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-rotc-textMuted" />
                      <Input
                        placeholder="Search name or ID..."
                        className="pl-9 h-9 text-xs"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table
                    headers={['Name', 'ID Number', 'Gender', 'School', 'Year', 'Archived']}
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
                        <td className="p-4 text-sm text-rotc-textMuted">{r.academic_year}</td>
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
                        <Button variant="outline" size="sm" disabled={archivePage * archivePageSize >= archives.count} onClick={() => setArchivePage(p => p + 1)}>Next</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Import Modal */}
      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Historical Records">
        <div className="space-y-4 mt-4">
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex gap-2 text-xs text-yellow-600">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p>Ensure your CSV headers match: id_number, first_name, last_name, school, gender, date_of_birth, course_year.</p>
          </div>
          <Input
            label="Target Academic Year"
            placeholder="e.g. 2020-2021"
            value={importYear}
            onChange={e => setImportYear(e.target.value)}
          />
          <div className="pt-2">
            <label className="block text-xs font-medium text-rotc-textMuted mb-1">Upload CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              disabled={!importYear}
              className="w-full text-xs text-rotc-textMuted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-rotc-accent file:text-white hover:file:bg-rotc-accent/80 cursor-pointer disabled:opacity-50"
            />
          </div>
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>

      {/* Restore User Modal */}
      <Modal isOpen={!!restoreId} onClose={() => setRestoreId(null)} title="Confirm Restore">
        <p className="text-sm text-rotc-text mt-4">Are you sure you want to reactivate this user? They will regain access to the system.</p>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={() => setRestoreId(null)}>Cancel</Button>
          <Button onClick={handleRestore} isLoading={reactivateMutation.isPending}>Restore User</Button>
        </div>
      </Modal>
    </AppLayout>
  )
}

import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { useAllCadets } from '@/hooks/queries/useUsers'
import { useState } from 'react'
import { Search, FileDown, User as UserIcon } from 'lucide-react'
import { exportToExcel } from '@/lib/export'
import type { Database } from '@/lib/database.types'

type User = Database['public']['Tables']['users']['Row']

export default function PlatoonPage() {
  const session = useSession()
  const { data: cadets, isLoading } = useAllCadets()
  const [search, setSearch] = useState('')
  const [selectedCadet, setSelectedCadet] = useState<User | null>(null)

  if (!session) return null

  const myPlatoon = (cadets ?? []).filter(c => c.platoon === session.platoon)
  
  const filteredCadets = myPlatoon.filter(c => 
    c.full_name.toLowerCase().includes(search.toLowerCase()) || 
    c.id_number.toLowerCase().includes(search.toLowerCase())
  )

  const handleExport = () => {
    const exportData = myPlatoon.map(c => ({
      'ID Number': c.id_number,
      'Full Name': c.full_name,
      'Attendance Rate': '100%', // Mocked until we have aggregate view
      'Status': c.is_active ? 'Active' : 'Inactive'
    }))
    exportToExcel(exportData, `${session.platoon}_Platoon_List`)
  }

  return (
    <AppLayout title={`${session.platoon} Platoon`}>
      <Card>
        <CardHeader title="Platoon Roster">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rotc-textMuted" />
              <input
                type="text"
                placeholder="Search cadet..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-rotc-bg border border-rotc-border rounded-lg text-sm text-rotc-text focus:outline-none focus:border-rotc-accent w-full sm:w-64"
              />
            </div>
            <Button variant="outline" onClick={handleExport}>
              <FileDown className="h-4 w-4 mr-2" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table
            headers={['Photo', 'ID Number', 'Full Name', 'Attendance', 'Status']}
            isLoading={isLoading}
            data={filteredCadets}
            keyExtractor={(c) => c.id}
            renderRow={(c) => (
              <>
                <td className="p-4" onClick={() => setSelectedCadet(c)}>
                  <div className="w-8 h-8 rounded-full bg-rotc-bg overflow-hidden flex items-center justify-center cursor-pointer">
                    {c.photo_url ? <img src={c.photo_url} className="w-full h-full object-cover" alt="" /> : <UserIcon className="h-4 w-4 text-rotc-textMuted" />}
                  </div>
                </td>
                <td className="p-4 text-sm font-medium text-rotc-text cursor-pointer" onClick={() => setSelectedCadet(c)}>{c.id_number}</td>
                <td className="p-4 text-sm text-rotc-text cursor-pointer" onClick={() => setSelectedCadet(c)}>{c.full_name}</td>
                <td className="p-4 text-sm text-rotc-success font-medium">100%</td>
                <td className="p-4">
                  <Badge status={c.is_active ? 'success' : 'danger'} label={c.is_active ? 'Active' : 'Inactive'} />
                </td>
              </>
            )}
          />
        </CardContent>
      </Card>

      {/* Cadet Detail Modal */}
      <Modal isOpen={!!selectedCadet} onClose={() => setSelectedCadet(null)} title="Cadet Details">
        {selectedCadet && (
          <div className="mt-4 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-rotc-bg overflow-hidden flex items-center justify-center">
                {selectedCadet.photo_url ? <img src={selectedCadet.photo_url} className="w-full h-full object-cover" alt="" /> : <UserIcon className="h-8 w-8 text-rotc-textMuted" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-rotc-text">{selectedCadet.full_name}</h3>
                <p className="text-sm text-rotc-textMuted">{selectedCadet.id_number} · {selectedCadet.platoon} Platoon</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <StatBox label="Present" value="5" color="text-rotc-success" />
              <StatBox label="Late" value="0" color="text-rotc-warning" />
              <StatBox label="Absent" value="0" color="text-rotc-danger" />
              <StatBox label="Excused" value="0" color="text-rotc-info" />
            </div>

            <div>
              <h4 className="text-sm font-semibold text-rotc-text mb-2">Recent Attendance</h4>
              <div className="border border-rotc-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-rotc-border bg-rotc-card">
                    <tr><td className="p-3 text-rotc-textMuted text-center">Data pending aggregate view</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-rotc-bg border border-rotc-border rounded-lg p-2 text-center">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-rotc-textMuted">{label}</div>
    </div>
  )
}

import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import { useAllCadets } from '@/hooks/queries/useUsers'
import { exportToExcel } from '@/lib/export'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { FileDown } from 'lucide-react'

export default function ReportsPage() {
  const session = useSession()
  const { data: cadetsResult, isLoading } = useAllCadets()
  const cadets = cadetsResult?.data ?? []
  if (!session) return null

  const handleExportCadets = () => {
    if (!cadets) return
    const exportData = cadets.map(c => ({
      'ID Number': c.id_number,
      'Full Name': c.full_name,
      'Platoon': c.platoon,
      'Status': c.is_active ? 'Active' : 'Inactive',
      'Role': c.role
    }))
    exportToExcel(exportData, 'Cadets_List')
  }

  // Mock data for charts since we need complex aggregation for real data (would ideally be done in a DB view)
  const platoonData = [
    { name: 'Alpha', rate: 92 },
    { name: 'Bravo', rate: 88 },
    { name: 'Charlie', rate: 95 },
    { name: 'Delta', rate: 85 },
    { name: 'Echo', rate: 90 },
  ]

  return (
    <AppLayout title="Reports & Analytics">
      <div className="space-y-6">
        <div className="flex gap-3">
          <Button onClick={handleExportCadets}>
            <FileDown className="h-4 w-4 mr-2" /> Export Cadets List
          </Button>
          <Button variant="outline" onClick={() => alert('Exporting full attendance... (Not yet implemented)')}>
            <FileDown className="h-4 w-4 mr-2" /> Export All Attendance
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader title="Platoon Attendance Rates (%)" />
            <CardContent>
              <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platoonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3d6b4a" vertical={false} />
                    <XAxis dataKey="name" stroke="#a5d6a7" tick={{ fill: '#a5d6a7' }} />
                    <YAxis stroke="#a5d6a7" tick={{ fill: '#a5d6a7' }} domain={[0, 100]} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: '#2d5a3d', borderColor: '#3d6b4a', borderRadius: '8px', color: '#e8f5e9' }}
                    />
                    <Bar dataKey="rate" fill="#4caf50" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Attendance Summary Preview (Top 10)" />
            <CardContent className="p-0">
              <Table
                headers={['Name', 'Platoon', 'Present', 'Absent']}
                isLoading={isLoading}
                data={cadets?.slice(0, 10) ?? []}
                keyExtractor={(c) => c.id}
                renderRow={(c) => (
                  <>
                    <td className="p-4 text-sm font-medium text-rotc-text">{c.full_name}</td>
                    <td className="p-4 text-sm text-rotc-textMuted">{c.platoon || '—'}</td>
                    <td className="p-4 text-sm text-rotc-success">N/A</td>
                    <td className="p-4 text-sm text-rotc-danger">N/A</td>
                  </>
                )}
              />
              <div className="p-4 border-t border-rotc-border text-center">
                <p className="text-xs text-rotc-textMuted italic">Note: Aggregated cadet attendance requires SQL views (pending implementation).</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}

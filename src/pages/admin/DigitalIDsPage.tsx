import { useSession } from '@/hooks/useSession'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useAllCadets, useAllOfficers } from '@/hooks/queries/useUsers'
import { useState, useRef, useMemo } from 'react'
import { Search, Download, Printer, Shield } from 'lucide-react'
import { exportAsPng } from '@/lib/export'
import type { Database } from '@/lib/database.types'

type User = Database['public']['Tables']['users']['Row']

export default function DigitalIDsPage() {
  const session = useSession()
  const { data: cadets } = useAllCadets()
  const { data: officers } = useAllOfficers()
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  if (!session) return null

  const allUsers = useMemo(() => [...(cadets ?? []), ...(officers ?? [])], [cadets, officers])

  const filteredUsers = search.length >= 2
    ? allUsers.filter(u =>
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.id_number.toLowerCase().includes(search.toLowerCase())
      )
    : []

  const currentYear = new Date().getFullYear()
  const academicYear = `A.Y. ${currentYear}-${currentYear + 1}`

  return (
    <AppLayout title="Digital IDs">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search panel */}
        <Card>
          <CardHeader title="Search User" />
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rotc-textMuted" />
              <input
                type="text"
                placeholder="Search by name or ID number..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-rotc-bg border border-rotc-border rounded-lg text-sm text-rotc-text focus:outline-none focus:border-rotc-accent transition-colors"
              />
            </div>

            {filteredUsers.length > 0 ? (
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {filteredUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      selectedUser?.id === u.id
                        ? 'bg-rotc-accent/15 border border-rotc-accent/30'
                        : 'hover:bg-rotc-cardHover border border-transparent'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-rotc-bg flex items-center justify-center overflow-hidden flex-shrink-0">
                      {u.photo_url
                        ? <img src={u.photo_url} className="w-full h-full object-cover" alt="" />
                        : <span className="text-xs font-semibold text-rotc-accent">{u.full_name.charAt(0)}</span>
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-rotc-text truncate">{u.full_name}</p>
                      <p className="text-xs text-rotc-textMuted">{u.id_number} · {u.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : search.length >= 2 ? (
              <p className="text-sm text-rotc-textMuted text-center py-6">No users found.</p>
            ) : (
              <p className="text-sm text-rotc-textMuted text-center py-6">Type at least 2 characters to search.</p>
            )}
          </CardContent>
        </Card>

        {/* ID Card Preview */}
        <div className="space-y-4">
          {selectedUser ? (
            <>
              <div
                ref={cardRef}
                className="mx-auto w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #1a3a2a 0%, #2d5a3d 50%, #1a3a2a 100%)' }}
              >
                {/* Header */}
                <div className="bg-rotc-accent/10 px-6 py-4 border-b border-rotc-border">
                  <div className="flex items-center gap-2 justify-center">
                    <Shield className="h-5 w-5 text-rotc-accent" />
                    <span className="text-sm font-bold text-rotc-accent tracking-widest uppercase">MSU-ZS ROTC UNIT</span>
                  </div>
                </div>

                {/* Photo */}
                <div className="flex justify-center py-6">
                  <div className="w-28 h-28 rounded-full border-4 border-rotc-accent/40 overflow-hidden bg-rotc-bg flex items-center justify-center">
                    {selectedUser.photo_url ? (
                      <img src={selectedUser.photo_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span className="text-3xl font-bold text-rotc-accent">{selectedUser.full_name.charAt(0)}</span>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="text-center px-6 pb-4 space-y-1.5">
                  <h2 className="text-lg font-bold text-rotc-text">{selectedUser.full_name}</h2>
                  <p className="text-sm font-medium text-rotc-accent">{selectedUser.id_number}</p>
                  <div className="flex items-center justify-center gap-2 text-xs text-rotc-textMuted">
                    <span className="capitalize">{selectedUser.role}</span>
                    {selectedUser.platoon && (
                      <>
                        <span className="text-rotc-border">·</span>
                        <span>{selectedUser.platoon} Platoon</span>
                      </>
                    )}
                    {selectedUser.designation && (
                      <>
                        <span className="text-rotc-border">·</span>
                        <span>{selectedUser.designation}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-rotc-accent/10 px-6 py-3 border-t border-rotc-border text-center">
                  <p className="text-[10px] text-rotc-textMuted uppercase tracking-widest">
                    ROTC MSU-Zamboanga Sibugay · {academicYear}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-center gap-3">
                <Button onClick={() => { if (cardRef.current) exportAsPng(cardRef.current, `ROTC_ID_${selectedUser.id_number}`) }}>
                  <Download className="h-4 w-4 mr-2" /> Download PNG
                </Button>
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" /> Print
                </Button>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Shield className="h-12 w-12 text-rotc-border mb-4" />
                <p className="text-sm text-rotc-textMuted">Select a user to preview their Digital ID card.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

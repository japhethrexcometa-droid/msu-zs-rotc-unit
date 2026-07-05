import { Printer, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import { AccessCode } from '@/hooks/queries/useAccessCodes'
import { format } from 'date-fns'

interface AccessCodePrintProps {
  codes: AccessCode[]
  onClose: () => void
}

export default function AccessCodePrint({ codes, onClose }: AccessCodePrintProps) {
  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      {/* Non-printable top bar */}
      <div className="print:hidden sticky top-0 bg-rotc-bg border-b border-rotc-border p-4 flex items-center justify-between shadow-sm z-10">
        <div>
          <h2 className="font-bold text-rotc-text">Print Access Codes</h2>
          <p className="text-sm text-rotc-textMuted">{codes.length} codes ready to print.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" /> Cancel
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Print Now
          </Button>
        </div>
      </div>

      {/* Printable Area */}
      {/* We use A4 sizing roughly, and a grid of cards */}
      <div className="bg-white p-8 max-w-[210mm] mx-auto min-h-[297mm]">
        <div className="print:block mb-6 hidden">
          <h1 className="text-2xl font-bold text-center">MSU-ZS ROTC Enrollment Access Codes</h1>
          <p className="text-center text-gray-500 text-sm mt-1">
            Batch: {codes[0]?.batch_id} • Generated: {format(new Date(codes[0]?.created_at || new Date()), 'MMM d, yyyy')}
          </p>
        </div>

        {/* Grid of cut-out cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 print:grid-cols-3 print:gap-4">
          {codes.map((code, index) => (
            <div 
              key={code.id} 
              className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-center page-break-inside-avoid"
            >
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Access Code #{index + 1}
              </div>
              <div className="text-3xl font-black font-mono text-gray-900 tracking-widest my-2">
                {code.code}
              </div>
              <div className="text-xs text-gray-600 font-medium">
                MSU-ZS ROTC Enrollment
              </div>
              <div className="text-[10px] text-gray-400 mt-2">
                Valid until: {format(new Date(code.expires_at), 'MMM d, yyyy')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Print-specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed.inset-0, .fixed.inset-0 * {
            visibility: visible;
          }
          .fixed.inset-0 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            margin: 0.5cm;
          }
        }
      `}</style>
    </div>
  )
}

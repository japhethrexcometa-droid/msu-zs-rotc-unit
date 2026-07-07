import { Printer, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import { AccessCode } from '@/hooks/queries/useAccessCodes'
import { format } from 'date-fns'

interface AccessCodePrintProps {
  codes: AccessCode[]
  onClose: () => void
}

const CODES_PER_PAGE = 18

function chunkCodes(codes: AccessCode[]) {
  const pages: AccessCode[][] = []
  for (let i = 0; i < codes.length; i += CODES_PER_PAGE) {
    pages.push(codes.slice(i, i + CODES_PER_PAGE))
  }
  return pages
}

export default function AccessCodePrint({ codes, onClose }: AccessCodePrintProps) {
  const pages = chunkCodes(codes)
  const generatedAt = codes[0]?.created_at ? new Date(codes[0].created_at) : new Date()

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto print:static print:inset-auto print:block print:overflow-visible">
      <div className="print:hidden sticky top-0 bg-rotc-bg border-b border-rotc-border p-4 flex items-center justify-between shadow-sm z-10">
        <div>
          <h2 className="font-bold text-rotc-text">Print Access Codes</h2>
          <p className="text-sm text-rotc-textMuted">
            {codes.length} codes ready to print across {pages.length || 1} page{pages.length === 1 ? '' : 's'}.
          </p>
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

      <main className="bg-gray-100 print:bg-white py-6 print:py-0">
        {pages.map((pageCodes, pageIndex) => (
          <section
            key={pageIndex}
            className="access-code-print-page bg-white mx-auto mb-6 p-8 shadow print:shadow-none print:mb-0"
          >
            <header className="mb-5 text-center">
              <h1 className="text-xl font-bold text-gray-900">MSU-ZS ROTC Enrollment Access Codes</h1>
              <p className="text-gray-500 text-xs mt-1">
                Batch: {codes[0]?.batch_id || 'N/A'} - Generated: {format(generatedAt, 'MMM d, yyyy')} - Page {pageIndex + 1} of {pages.length}
              </p>
            </header>

            <div className="grid grid-cols-3 gap-3">
              {pageCodes.map((code, itemIndex) => (
                <div
                  key={code.id}
                  className="access-code-card border-2 border-dashed border-gray-300 rounded-lg px-3 py-3 flex flex-col items-center justify-center text-center"
                >
                  <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Access Code #{pageIndex * CODES_PER_PAGE + itemIndex + 1}
                  </div>
                  <div className="text-2xl font-black font-mono text-gray-950 tracking-widest my-1">
                    {code.code}
                  </div>
                  <div className="text-[11px] text-gray-700 font-medium">
                    MSU-ZS ROTC Enrollment
                  </div>
                  <div className="text-[9px] text-gray-500 mt-1">
                    Valid until: {format(new Date(code.expires_at), 'MMM d, yyyy')}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>

      <style>{`
        .access-code-print-page {
          width: 210mm;
          min-height: 297mm;
          box-sizing: border-box;
        }

        .access-code-card {
          min-height: 29mm;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        @media print {
          html, body, #root {
            width: 210mm;
            min-height: 297mm;
            background: white !important;
          }

          body * {
            visibility: hidden;
          }

          .access-code-print-page,
          .access-code-print-page * {
            visibility: visible;
          }

          .access-code-print-page {
            width: auto;
            min-height: auto;
            padding: 0;
            page-break-after: always;
            break-after: page;
          }

          .access-code-print-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  )
}

import * as XLSX from 'xlsx'

export function exportToExcel(data: Record<string, unknown>[], filename: string, sheetName = 'Sheet1') {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function exportAttendanceReport(sessions: unknown[], filename = 'attendance_report') {
  exportToExcel(sessions as Record<string, unknown>[], filename, 'Attendance')
}

// Export a DOM element as PNG using html-to-image
export async function exportAsPng(element: HTMLElement, filename: string) {
  const { toPng } = await import('html-to-image')
  const dataUrl = await toPng(element, { quality: 0.95 })
  const link = document.createElement('a')
  link.download = `${filename}.png`
  link.href = dataUrl
  link.click()
}

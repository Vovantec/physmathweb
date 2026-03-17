// app/api/admin/heatmap/export/route.ts
// Путь: app/api/admin/heatmap/export/route.ts
// POST { courseId, studentIds[], from?, to? }
// Возвращает .xlsx файл

import { NextResponse }   from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { buildHeatmap }   from '@/app/api/admin/heatmap/route'

export async function POST(request: Request) {
  const isAdmin = await checkAdminAuth()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { courseId, studentIds, from, to } = await request.json()
  if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 })

  const dateFilter: any = {}
  if (from) dateFilter.gte = new Date(from)
  if (to)   dateFilter.lte = new Date(new Date(to).setHours(23, 59, 59, 999))

  const heatmap = await buildHeatmap(
    parseInt(courseId),
    studentIds?.length ? studentIds.map(Number) : null,
    Object.keys(dateFilter).length ? dateFilter : undefined
  ) as any

  if (heatmap.error) return NextResponse.json({ error: heatmap.error }, { status: 404 })

  // Build XLSX in memory using exceljs (installed via npm install exceljs)
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'ФизМат by Шевелев'
  wb.created = new Date()

  const ws = wb.addWorksheet('Тепловая карта', {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 2 }],
  })

  // ── PALETTE ──────────────────────────────────────────────
  const COLORS = {
    perfect:     { fill: 'FF22C55E', font: 'FF14532D' },  // green
    perfectLate: { fill: 'FF3B82F6', font: 'FF1E3A5F' },  // blue
    partial:     { fill: 'FFFBBF24', font: 'FF78350F' },  // amber
    partialLate: { fill: 'FFF97316', font: 'FF7C2D12' },  // orange
    failed:      { fill: 'FFEF4444', font: 'FF7F1D1D' },  // red
    notStarted:  { fill: 'FFE5E7EB', font: 'FF6B7280' },  // gray
    header:      { fill: 'FF1A1A1A', font: 'FFFFFFFF' },  // dark header
    subheader:   { fill: 'FF374151', font: 'FFD1D5DB' },
    rowEven:     { fill: 'FFF9FAFB' },
    rowOdd:      { fill: 'FFFFFFFF' },
  }

  const boldFont   = (color = 'FF111827') => ({ bold: true,  color: { argb: color }, name: 'Calibri', size: 11 })
  const normalFont = (color = 'FF374151') => ({ bold: false, color: { argb: color }, name: 'Calibri', size: 10 })
  const centerAlign = { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true }
  const leftAlign   = { horizontal: 'left'   as const, vertical: 'middle' as const, wrapText: true }

  // ── ROW 1: Course title ───────────────────────────────────
  ws.addRow([`Курс: ${heatmap.courseTitle}`])
  ws.getRow(1).height = 28
  ws.getCell('A1').font  = boldFont('FFFFFFFF')
  ws.getCell('A1').fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header.fill } }
  ws.getCell('A1').alignment = leftAlign
  if (heatmap.lessons.length > 0) {
    ws.mergeCells(1, 1, 1, heatmap.lessons.length + 1)
  }

  const periodStr = from || to
    ? `Период: ${from ? new Date(from).toLocaleDateString('ru-RU') : '—'} → ${to ? new Date(to).toLocaleDateString('ru-RU') : '—'}`
    : 'Период: всё время'
  ws.addRow([`${periodStr}   Учеников: ${heatmap.students.length}   Уроков: ${heatmap.lessons.length}`])
  ws.getRow(2).height = 20
  ws.getCell('A2').font  = normalFont(COLORS.subheader.font)
  ws.getCell('A2').fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subheader.fill } }
  ws.getCell('A2').alignment = leftAlign
  if (heatmap.lessons.length > 0) {
    ws.mergeCells(2, 1, 2, heatmap.lessons.length + 1)
  }

  // ── ROW 3: Column headers ─────────────────────────────────
  const headerRow = ws.addRow([
    'Ученик',
    ...heatmap.lessons.map((l: any) => `${l.taskTitle}\n${l.lessonTitle}`),
  ])
  headerRow.height = 52
  headerRow.eachCell((cell, colIdx) => {
    cell.font      = boldFont(COLORS.header.font)
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header.fill } }
    cell.alignment = colIdx === 1 ? leftAlign : centerAlign
    cell.border    = { bottom: { style: 'medium', color: { argb: 'FF4B5563' } } }
  })

  // ── ROW 4: Average row ────────────────────────────────────
  const avgRow = ws.addRow([
    'Средний % по уроку',
    ...heatmap.lessons.map((l: any) => l.avgPercent !== null ? `${l.avgPercent}%` : '—'),
  ])
  avgRow.height = 22
  avgRow.eachCell((cell, colIdx) => {
    cell.font      = boldFont('FF111827')
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }
    cell.alignment = colIdx === 1 ? leftAlign : centerAlign
    cell.border    = { bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } } }
  })

  // ── DATA ROWS ─────────────────────────────────────────────
  heatmap.students.forEach((student: any, sIdx: number) => {
    const rowFill = sIdx % 2 === 0 ? COLORS.rowEven.fill : COLORS.rowOdd.fill
    const cells: any[] = [student.firstName ?? student.username ?? `ID: ${student.telegramId}`]

    heatmap.lessons.forEach((lesson: any) => {
      const result = lesson.studentResults.find((r: any) => r.studentId === student.id)
      const status  = result?.status  ?? 'not_started'
      const percent = result?.percent ?? null
      const isLate  = result?.isLate  ?? false

      cells.push(percent !== null ? `${percent}%${isLate ? ' ⏰' : ''}` : '—')
    })

    const dataRow = ws.addRow(cells)
    dataRow.height = 22

    dataRow.eachCell((cell, colIdx) => {
      if (colIdx === 1) {
        cell.font      = normalFont('FF111827')
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowFill } }
        cell.alignment = leftAlign
        return
      }

      const lesson  = heatmap.lessons[colIdx - 2]
      const result  = lesson?.studentResults.find((r: any) => r.studentId === student.id)
      const status  = result?.status  ?? 'not_started'
      const isLate  = result?.isLate  ?? false

      let palette = COLORS.notStarted
      if (status === 'perfect' && !isLate) palette = COLORS.perfect
      else if (status === 'perfect' &&  isLate) palette = COLORS.perfectLate
      else if (status === 'partial' && !isLate) palette = COLORS.partial
      else if (status === 'partial' &&  isLate) palette = COLORS.partialLate
      else if (status === 'failed') palette = COLORS.failed

      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.fill } }
      cell.font      = normalFont(palette.font)
      cell.alignment = centerAlign
      cell.border    = {
        top:    { style: 'hair', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        left:   { style: 'hair', color: { argb: 'FFE5E7EB' } },
        right:  { style: 'hair', color: { argb: 'FFE5E7EB' } },
      }
    })
  })

  // ── COLUMN WIDTHS ─────────────────────────────────────────
  ws.getColumn(1).width = 22
  for (let c = 2; c <= heatmap.lessons.length + 1; c++) {
    ws.getColumn(c).width = 16
  }

  // ── LEGEND SHEET ─────────────────────────────────────────
  const legend = wb.addWorksheet('Легенда')
  legend.getColumn(1).width = 24
  legend.getColumn(2).width = 40
  const legendRows = [
    ['Цвет', 'Значение'],
    ['Зелёный', '100% — отлично, в срок'],
    ['Синий', '100% — отлично, с опозданием ⏰'],
    ['Жёлтый', '50–99% — частично, в срок'],
    ['Оранжевый', '50–99% — частично, с опозданием ⏰'],
    ['Красный', 'Менее 50% — слабо'],
    ['Серый', 'Не выполнено'],
  ]
  const legendArgb = [
    COLORS.header.fill,
    COLORS.perfect.fill,
    COLORS.perfectLate.fill,
    COLORS.partial.fill,
    COLORS.partialLate.fill,
    COLORS.failed.fill,
    COLORS.notStarted.fill,
  ]
  legendRows.forEach((row, idx) => {
    const r = legend.addRow(row)
    r.height = 22
    r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: legendArgb[idx] } }
    r.getCell(1).font = idx === 0 ? boldFont('FFFFFFFF') : normalFont()
    r.getCell(2).font = idx === 0 ? boldFont()           : normalFont()
    r.eachCell(c => { c.alignment = leftAlign })
  })

  // ── SEND ──────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const filename = `heatmap_${heatmap.courseTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`

  return new Response(buffer, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  })
}
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import type { Delegate, Group } from '../types'
import { CHURCHES, getChurchName } from '../types'

/**
 * Generates a clean Excel workbook with one sheet per church.
 * - Payment column: conditional formatting (Green = PAID, Red = UNPAID)
 * - T-Shirt Printed column: conditional formatting (Green = Printed, Red = Not Printed)
 * - Every download reflects the latest delegate data.
 */
export const generateChurchListExcel = async (delegates: Delegate[], groups: Group[]) => {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Youth Camp 2026'
  wb.created = new Date()

  // Build delegate -> group lookup
  const delegateGroupMap: Record<string, string> = {}
  groups.forEach(g => {
    g.delegateIds.forEach(id => { delegateGroupMap[id] = g.name })
  })

  // Group delegates by church
  const churchDelegates: Record<string, Delegate[]> = {}
  delegates.forEach(d => {
    if (!churchDelegates[d.church]) churchDelegates[d.church] = []
    churchDelegates[d.church].push(d)
  })

  const churchOrder = CHURCHES.map(c => c.id)
  const allChurchIds = new Set([...churchOrder, ...Object.keys(churchDelegates)])

  // Column config
  const columns: Partial<ExcelJS.Column>[] = [
    { header: '#', key: 'num', width: 5 },
    { header: 'Last Name', key: 'lastName', width: 17 },
    { header: 'First Name', key: 'firstName', width: 17 },
    { header: 'Preferred Name', key: 'preferredName', width: 15 },
    { header: 'Age', key: 'age', width: 6 },
    { header: 'Gender', key: 'gender', width: 9 },
    { header: 'Category', key: 'category', width: 21 },
    { header: 'T-Shirt Size', key: 'tshirtSize', width: 12 },
    { header: 'T-Shirt Printed', key: 'tshirtPrinted', width: 14 },
    { header: 'Group', key: 'group', width: 15 },
    { header: 'Role', key: 'role', width: 12 },
    { header: 'Payment', key: 'payment', width: 11 },
    { header: 'Payment Method', key: 'paymentMethod', width: 15 },
    { header: 'Reference #', key: 'referenceNumber', width: 13 },
    { header: 'Registered', key: 'registered', width: 19 },
  ]

  const paymentColIdx = 12   // L column (1-based)
  const printedColIdx = 9    // I column (1-based)
  const paymentColLetter = 'L'
  const printedColLetter = 'I'

  let hasAnySheet = false

  allChurchIds.forEach(churchId => {
    const members = churchDelegates[churchId]
    if (!members || members.length === 0) return

    const sorted = [...members].sort((a, b) => a.lastName.localeCompare(b.lastName))
    const churchName = getChurchName(churchId)

    const ws = wb.addWorksheet(churchId.substring(0, 31))
    ws.columns = columns

    // Clean header style — dark text on light gray
    const headerRow = ws.getRow(1)
    headerRow.font = { bold: true, size: 10, color: { argb: 'FF333333' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } }
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
    headerRow.height = 20

    // Bottom border on header
    headerRow.eachCell(cell => {
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFBBBBBB' } } }
    })

    // Add data rows
    sorted.forEach((m, idx) => {
      const groupName = delegateGroupMap[m.id] || 'Unassigned'
      const roleLabel = m.role === 'Leader' ? 'Leader' : m.role === 'Assistant Leader' ? 'Asst. Leader' : 'Delegate'

      const row = ws.addRow({
        num: idx + 1,
        lastName: m.lastName,
        firstName: m.firstName,
        preferredName: m.preferredName || '',
        age: m.age,
        gender: m.gender,
        category: m.category,
        tshirtSize: m.tshirtSize,
        tshirtPrinted: 'Not Printed',
        group: groupName,
        role: roleLabel,
        payment: m.paymentStatus,
        paymentMethod: m.paymentMethod,
        referenceNumber: m.referenceNumber || '',
        registered: m.createdAt ? new Date(m.createdAt).toLocaleString() : '',
      })

      row.font = { size: 10 }
      row.alignment = { vertical: 'middle' }

      // Light bottom border for clean separation
      row.eachCell(cell => {
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFDDDDDD' } } }
      })

      // Data validation: Payment dropdown
      row.getCell(paymentColIdx).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"PAID,UNPAID"'],
        showErrorMessage: true,
        errorTitle: 'Invalid',
        error: 'Select PAID or UNPAID',
      }

      // Data validation: T-Shirt Printed dropdown
      row.getCell(printedColIdx).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"Printed,Not Printed"'],
        showErrorMessage: true,
        errorTitle: 'Invalid',
        error: 'Select Printed or Not Printed',
      }
    })

    const lastDataRow = sorted.length + 1

    // --- CONDITIONAL FORMATTING: Payment column ---
    // PAID = green background + green text
    ws.addConditionalFormatting({
      ref: `${paymentColLetter}2:${paymentColLetter}${lastDataRow}`,
      rules: [
        {
          type: 'cellIs',
          operator: 'equal',
          priority: 1,
          formulae: ['"PAID"'],
          style: {
            font: { bold: true, color: { argb: 'FF15803D' } },
            fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFDCFCE7' } },
          },
        },
        {
          type: 'cellIs',
          operator: 'equal',
          priority: 2,
          formulae: ['"UNPAID"'],
          style: {
            font: { bold: true, color: { argb: 'FFDC2626' } },
            fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFEE2E2' } },
          },
        },
      ],
    })

    // --- CONDITIONAL FORMATTING: T-Shirt Printed column ---
    ws.addConditionalFormatting({
      ref: `${printedColLetter}2:${printedColLetter}${lastDataRow}`,
      rules: [
        {
          type: 'cellIs',
          operator: 'equal',
          priority: 3,
          formulae: ['"Printed"'],
          style: {
            font: { bold: true, color: { argb: 'FF15803D' } },
            fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFDCFCE7' } },
          },
        },
        {
          type: 'cellIs',
          operator: 'equal',
          priority: 4,
          formulae: ['"Not Printed"'],
          style: {
            font: { bold: true, color: { argb: 'FFDC2626' } },
            fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFEE2E2' } },
          },
        },
      ],
    })

    // Freeze header row
    ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }]

    // Auto-filter
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: lastDataRow, column: columns.length },
    }

    // Footer: total count
    const footerRow = ws.addRow({})
    footerRow.getCell(1).value = `Total: ${sorted.length}`
    footerRow.getCell(1).font = { bold: true, size: 10, color: { argb: 'FF555555' } }

    hasAnySheet = true
  })

  // --- Summary sheet ---
  const summaryWs = wb.addWorksheet('Summary')
  summaryWs.columns = [
    { header: 'Church', key: 'church', width: 40 },
    { header: 'Code', key: 'code', width: 10 },
    { header: 'Total', key: 'total', width: 8 },
    { header: 'Males', key: 'males', width: 8 },
    { header: 'Females', key: 'females', width: 9 },
    { header: 'Leaders', key: 'leaders', width: 9 },
    { header: 'Paid', key: 'paid', width: 8 },
    { header: 'Unpaid', key: 'unpaid', width: 9 },
  ]

  const sHeader = summaryWs.getRow(1)
  sHeader.font = { bold: true, size: 10, color: { argb: 'FF333333' } }
  sHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } }
  sHeader.alignment = { horizontal: 'center', vertical: 'middle' }
  sHeader.height = 20
  sHeader.eachCell(cell => {
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFBBBBBB' } } }
  })

  let gTotal = 0, gMales = 0, gFemales = 0, gLeaders = 0, gPaid = 0, gUnpaid = 0

  Array.from(allChurchIds)
    .filter(id => churchDelegates[id] && churchDelegates[id].length > 0)
    .forEach(churchId => {
      const members = churchDelegates[churchId] || []
      const paid = members.filter(m => m.paymentStatus === 'PAID').length
      const unpaid = members.filter(m => m.paymentStatus === 'UNPAID').length
      const leaders = members.filter(m => m.role === 'Leader' || m.role === 'Assistant Leader').length
      const males = members.filter(m => m.gender === 'Male').length
      const females = members.filter(m => m.gender === 'Female').length

      gTotal += members.length; gMales += males; gFemales += females
      gLeaders += leaders; gPaid += paid; gUnpaid += unpaid

      const row = summaryWs.addRow({
        church: getChurchName(churchId), code: churchId,
        total: members.length, males, females, leaders, paid, unpaid,
      })

      row.font = { size: 10 }
      row.eachCell(cell => {
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFDDDDDD' } } }
      })

      // Paid green, Unpaid red
      row.getCell(7).font = { size: 10, bold: true, color: { argb: 'FF15803D' } }
      row.getCell(8).font = { size: 10, bold: true, color: { argb: 'FFDC2626' } }
    })

  // Totals row
  const tRow = summaryWs.addRow({
    church: 'TOTAL', code: '', total: gTotal,
    males: gMales, females: gFemales, leaders: gLeaders, paid: gPaid, unpaid: gUnpaid,
  })
  tRow.font = { bold: true, size: 11 }
  tRow.eachCell(cell => {
    cell.border = { top: { style: 'thin', color: { argb: 'FF999999' } } }
  })
  tRow.getCell(7).font = { bold: true, size: 11, color: { argb: 'FF15803D' } }
  tRow.getCell(8).font = { bold: true, size: 11, color: { argb: 'FFDC2626' } }

  // Move Summary to front
  const sheetNames = wb.worksheets.map(s => s.name)
  const summaryIdx = sheetNames.indexOf('Summary')
  if (summaryIdx > 0) {
    wb.worksheets[summaryIdx].orderNo = 0
    wb.worksheets.forEach((s, i) => {
      if (i !== summaryIdx) s.orderNo = i + 1
    })
    wb.worksheets.sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0))
  }

  if (!hasAnySheet) {
    const emptyWs = wb.addWorksheet('No Data')
    emptyWs.addRow(['No delegates registered yet.'])
  }

  // Generate and download
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, 'Youth_Camp_2026_Churches.xlsx')
}

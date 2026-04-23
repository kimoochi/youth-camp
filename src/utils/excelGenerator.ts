import * as XLSX from 'xlsx'
import type { Delegate, Group } from '../types'
import { CHURCHES, getChurchName } from '../types'

/**
 * Generates an Excel workbook with one sheet per church.
 * Each sheet contains all delegates from that church, sorted by last name.
 * Every download always reflects the latest delegate data (auto-updates).
 */
export const generateChurchListExcel = (delegates: Delegate[], groups: Group[]) => {
  const wb = XLSX.utils.book_new()

  // Build a lookup: delegateId -> group name
  const delegateGroupMap: Record<string, string> = {}
  groups.forEach(g => {
    g.delegateIds.forEach(id => {
      delegateGroupMap[id] = g.name
    })
  })

  // Group delegates by church
  const churchDelegates: Record<string, Delegate[]> = {}
  delegates.forEach(d => {
    if (!churchDelegates[d.church]) {
      churchDelegates[d.church] = []
    }
    churchDelegates[d.church].push(d)
  })

  // Use CHURCHES order so sheets appear in a consistent order
  const churchOrder = CHURCHES.map(c => c.id)

  // Also include any churches not in the CHURCHES list (edge case)
  const allChurchIds = new Set([...churchOrder, ...Object.keys(churchDelegates)])

  let hasAnySheet = false

  allChurchIds.forEach(churchId => {
    const members = churchDelegates[churchId]
    if (!members || members.length === 0) return

    // Sort by last name
    const sorted = [...members].sort((a, b) => a.lastName.localeCompare(b.lastName))

    // Build rows for this church
    const rows = sorted.map((m, idx) => {
      const groupName = delegateGroupMap[m.id] || 'Unassigned'
      const roleLabel = m.role === 'Leader' ? 'Leader' : m.role === 'Assistant Leader' ? 'Asst. Leader' : 'Delegate'

      return {
        '#': idx + 1,
        'Last Name': m.lastName,
        'First Name': m.firstName,
        'Preferred Name': m.preferredName || '',
        'Age': m.age,
        'Gender': m.gender,
        'Category': m.category,
        'T-Shirt Size': m.tshirtSize,
        'Group': groupName,
        'Role': roleLabel,
        'Payment': m.paymentStatus,
        'Payment Method': m.paymentMethod,
        'Reference #': m.referenceNumber || '',
        'Registered': m.createdAt ? new Date(m.createdAt).toLocaleString() : '',
      }
    })

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(rows)

    // Auto-width columns
    const colWidths = Object.keys(rows[0] || {}).map(key => {
      const maxLen = Math.max(
        key.length,
        ...rows.map(r => String((r as Record<string, unknown>)[key] || '').length)
      )
      return { wch: Math.min(maxLen + 2, 30) }
    })
    ws['!cols'] = colWidths

    // Sheet name: use church acronym (max 31 chars for Excel)
    const sheetName = churchId.substring(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    hasAnySheet = true
  })

  // Add a "Summary" sheet at the beginning with all churches overview
  const summaryRows = Array.from(allChurchIds)
    .filter(id => churchDelegates[id] && churchDelegates[id].length > 0)
    .map(churchId => {
      const members = churchDelegates[churchId] || []
      const paid = members.filter(m => m.paymentStatus === 'PAID').length
      const unpaid = members.filter(m => m.paymentStatus === 'UNPAID').length
      const leaders = members.filter(m => m.role === 'Leader' || m.role === 'Assistant Leader').length
      const males = members.filter(m => m.gender === 'Male').length
      const females = members.filter(m => m.gender === 'Female').length

      return {
        'Church': getChurchName(churchId),
        'Code': churchId,
        'Total Delegates': members.length,
        'Males': males,
        'Females': females,
        'Leaders/Asst': leaders,
        'Paid': paid,
        'Unpaid': unpaid,
      }
    })

  // Add totals row
  const totalRow = {
    'Church': 'TOTAL',
    'Code': '',
    'Total Delegates': summaryRows.reduce((s, r) => s + r['Total Delegates'], 0),
    'Males': summaryRows.reduce((s, r) => s + r['Males'], 0),
    'Females': summaryRows.reduce((s, r) => s + r['Females'], 0),
    'Leaders/Asst': summaryRows.reduce((s, r) => s + r['Leaders/Asst'], 0),
    'Paid': summaryRows.reduce((s, r) => s + r['Paid'], 0),
    'Unpaid': summaryRows.reduce((s, r) => s + r['Unpaid'], 0),
  }
  summaryRows.push(totalRow)

  if (summaryRows.length > 0) {
    const summaryWs = XLSX.utils.json_to_sheet(summaryRows)
    const sumColWidths = Object.keys(summaryRows[0]).map(key => {
      const maxLen = Math.max(
        key.length,
        ...summaryRows.map(r => String((r as Record<string, unknown>)[key] || '').length)
      )
      return { wch: Math.min(maxLen + 2, 40) }
    })
    summaryWs['!cols'] = sumColWidths

    // Insert Summary as the first sheet
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

    // Move Summary to index 0
    const sheetNames = wb.SheetNames
    const summaryIdx = sheetNames.indexOf('Summary')
    if (summaryIdx > 0) {
      sheetNames.splice(summaryIdx, 1)
      sheetNames.unshift('Summary')
    }
  }

  if (!hasAnySheet) {
    // If no delegates at all, create a placeholder
    const emptyWs = XLSX.utils.aoa_to_sheet([['No delegates registered yet.']])
    XLSX.utils.book_append_sheet(wb, emptyWs, 'No Data')
  }

  // Generate and download
  XLSX.writeFile(wb, 'Youth_Camp_2026_Churches.xlsx')
}

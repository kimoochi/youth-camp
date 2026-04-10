import jsPDF from 'jspdf'
import type { Delegate, Group } from '../types'
import { getChurchName } from '../types'

export const generateGroupListPDF = (group: Group, delegates: Delegate[]) => {
  const doc = new jsPDF()
  const members = group.delegateIds
    .map(id => delegates.find(d => d.id === id))
    .filter((d): d is Delegate => !!d)

  // Title
  doc.setFontSize(18)
  doc.text('YOUTH CAMP 2026', 14, 20)
  doc.setFontSize(14)
  doc.text(`Group: ${group.name}`, 14, 30)
  doc.setFontSize(10)
  doc.text(`Total Members: ${members.length}`, 14, 36)

  // Table Header
  let y = 45
  doc.setFont('helvetica', 'bold')
  doc.text('Name', 14, y)
  doc.text('Church', 70, y)
  doc.text('Age', 160, y)
  doc.text('Size', 180, y)
  
  // Line
  doc.line(14, y + 2, 196, y + 2)
  y += 10

  // Rows
  doc.setFont('helvetica', 'normal')
  members.forEach((m) => {
    if (y > 280) { doc.addPage(); y = 20; }
    
    // Label Leaders/Assistants differently
    const isStaff = m.role === 'Leader' || m.role === 'Assistant Leader'
    const roleLabel = m.role === 'Leader' ? ' (LEADER)' : m.role === 'Assistant Leader' ? ' (ASST)' : ''
    
    doc.setFont('helvetica', isStaff ? 'bold' : 'normal')
    doc.text(`${m.lastName}, ${m.firstName}${roleLabel}`, 14, y)
    
    // Use acronym (m.church) instead of full name to save space
    doc.text(m.church, 70, y)
    
    // Remove age and size for staff
    if (!isStaff) {
      doc.text(m.age.toString(), 160, y)
      doc.text(m.tshirtSize, 180, y)
    } else {
      doc.text('---', 160, y)
      doc.text('---', 180, y)
    }
    
    y += 8
  })

  doc.save(`${group.name.replace(/\s+/g, '_')}_Members.pdf`)
}

type IdCardRole = 'GROUP LEADER' | 'ASSISTANT LEADER' | null

interface IdCardEntry {
  delegate: Delegate
  role: IdCardRole
  groupName: string
}

export const generateIDCards = (delegates: Delegate[], groups: Group[], groupId?: string) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  
  const targetGroups = groupId ? groups.filter(g => g.id === groupId) : groups

  const toPrint: IdCardEntry[] = []
  targetGroups.forEach(g => {
    const members = g.delegateIds
      .map(id => delegates.find(d => d.id === id))
      .filter((d): d is Delegate => !!d)

    members.forEach((d, idx) => {
      let role: IdCardRole = null
      if (idx === 0) role = 'GROUP LEADER'
      else if (idx === 1 || idx === 2) role = 'ASSISTANT LEADER'
      toPrint.push({ delegate: d, role, groupName: g.name })
    })
  })

  if (toPrint.length === 0) {
    alert('No delegates found to print.')
    return
  }

  const w = 85, h = 55, mx = 15, my = 10, gx = 10, gy = 10
  let x = mx, y = my, count = 0

  toPrint.forEach(({ delegate: d, role, groupName }) => {
    doc.setDrawColor(0); doc.setLineWidth(0.5); doc.rect(x, y, w, h)
    doc.setFillColor(37, 99, 235); doc.rect(x, y, w, 12, 'F') // Primary Blue Header
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10); doc.setFont('helvetica', 'bold')
    doc.text('YOUTH CAMP 2026', x + w/2, y + 6, { align: 'center' })
    doc.setFontSize(7)
    doc.text(groupName.toUpperCase(), x + w/2, y + 10, { align: 'center' })

    doc.setTextColor(31, 41, 55)
    doc.setFontSize(14); doc.text(d.firstName.toUpperCase(), x + w/2, y + 24, { align: 'center' })
    doc.setFontSize(16); doc.text(d.lastName.toUpperCase(), x + w/2, y + 31, { align: 'center' })

    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 128)
    const cName = getChurchName(d.church)
    doc.text(cName.length > 30 ? cName.substring(0,30)+'...' : cName, x + w/2, y + 41, { align: 'center' })
    doc.text(`${d.category} • Age: ${d.age}`, x + w/2, y + 46, { align: 'center' })

    if (role) {
      doc.setFillColor(role === 'GROUP LEADER' ? 234 : 250, role === 'GROUP LEADER' ? 88 : 204, 12)
      doc.rect(x, y + h - 8, w, 8, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8); doc.setFont('helvetica', 'bold')
      doc.text(role, x + w/2, y + h - 3, { align: 'center' })
    }

    count++
    if (count % 2 === 1) { x += w + gx } else { x = mx; y += h + gy }
    if (count % 8 === 0 && count < toPrint.length) { doc.addPage(); x = mx; y = my }
  })

  const name = groupId ? `Group_${groupId}_IDs` : 'All_Camp_IDs'
  doc.save(`${name}.pdf`)
}
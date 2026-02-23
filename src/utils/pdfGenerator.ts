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
  doc.text('Category', 120, y)
  doc.text('Age', 170, y)
  doc.text('Size', 185, y)
  
  // Line
  doc.line(14, y + 2, 196, y + 2)
  y += 10

  // Rows
  doc.setFont('helvetica', 'normal')
  members.forEach((m) => {
    if (y > 280) { doc.addPage(); y = 20; }
    
    doc.text(`${m.lastName}, ${m.firstName}`, 14, y)
    // Truncate long church names for PDF list
    const churchName = getChurchName(m.church).substring(0, 25)
    doc.text(churchName, 70, y)
    doc.text(m.category, 120, y)
    doc.text(m.age.toString(), 170, y)
    doc.text(m.tshirtSize, 185, y)
    
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

  const toPrint: IdCardEntry[] = targetGroups.flatMap(g => {
    const members = g.delegateIds
      .map(id => delegates.find(d => d.id === id))
      .filter((d): d is Delegate => !!d)

    return members.map(d => ({ delegate: d, role: null, groupName: g.name }))
  })

  let count = 0, x = 15, y = 20
  const mx = 15, my = 20, w = 88, h = 55, gx = 4, gy = 4

  toPrint.forEach(({ delegate: d, groupName }) => {
    doc.setDrawColor(209, 213, 219); doc.setLineWidth(0.5)
    doc.rect(x, y, w, h)

    doc.setFillColor(255, 229, 153); doc.rect(x, y, w, 15, 'F')
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0)
    doc.text('YOUTH CAMP 2026', x + w/2, y + 6, { align: 'center' })
    doc.setFontSize(7); doc.setFont('helvetica', 'normal')
    doc.text('Mactan Independent Baptist Church', x + w/2, y + 11, { align: 'center' })

    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0)
    const name = `${d.firstName} ${d.lastName}`.trim()
    doc.text(name, x + w/2, y + 25, { align: 'center' })

    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(55, 65, 81)
    doc.text(groupName.toUpperCase(), x + w/2, y + 33, { align: 'center' })

    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 128)
    const cName = getChurchName(d.church)
    doc.text(cName.length > 30 ? cName.substring(0,30)+'...' : cName, x + w/2, y + 41, { align: 'center' })
    doc.text(`${d.category} • Age: ${d.age}`, x + w/2, y + 46, { align: 'center' })

    count++
    if (count % 2 === 1) { x += w + gx } else { x = mx; y += h + gy }
    if (count % 8 === 0 && count < toPrint.length) { doc.addPage(); x = mx; y = my }
  })

  const name = groupId ? `Group_${groupId}_IDs` : 'All_Camp_IDs'
  doc.save(`${name}.pdf`)
}

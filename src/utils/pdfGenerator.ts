import jsPDF from 'jspdf'
import type { Delegate, Group } from '../types'
import { getChurchName } from '../types'

// Import layouts
import BereansImg from '../assets/Bereans.png'
import DavidImg from '../assets/David.png'
import JohnImg from '../assets/John.png'
import PeterImg from '../assets/Peter.png'

const GROUP_LAYOUTS: Record<string, string> = {
  'Bereans': BereansImg,
  'David': DavidImg,
  'John': JohnImg,
  'Peter': PeterImg,
}

const getLayoutForGroup = (groupName: string): string => {
  const name = groupName.toLowerCase()
  const key = Object.keys(GROUP_LAYOUTS).find(k => name.includes(k.toLowerCase()))
  return key || 'Bereans'
}

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

    // Show tshirt size for all members (including leaders)
    doc.text(m.age.toString(), 160, y)
    doc.text(m.tshirtSize, 180, y)

    y += 8
  })

  doc.save(`${group.name.replace(/\s+/g, '_')}_Members.pdf`)
}

export const generateChurchListPDF = (delegates: Delegate[], groups: Group[]) => {
  const doc = new jsPDF()

  const churchDelegates: Record<string, Delegate[]> = {}
  delegates.forEach(d => {
    if (!churchDelegates[d.church]) {
      churchDelegates[d.church] = []
    }
    churchDelegates[d.church].push(d)
  })

  doc.setFontSize(18)
  doc.text('YOUTH CAMP 2026', 14, 20)
  doc.setFontSize(14)
  doc.text('Delegates by Church', 14, 30)

  let y = 45
  const churches = Object.keys(churchDelegates).sort()

  churches.forEach(churchId => {
    if (y > 270) { doc.addPage(); y = 20 }

    const churchName = getChurchName(churchId)
    const members = churchDelegates[churchId].sort((a, b) => a.lastName.localeCompare(b.lastName))

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`${churchName} (${members.length})`, 14, y)
    y += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Name', 14, y)
    doc.text('Age', 130, y)
    doc.text('Size', 160, y)
    doc.text('Group', 180, y)
    y += 2
    doc.line(14, y, 196, y)
    y += 6

    doc.setFont('helvetica', 'normal')
    members.forEach(m => {
      if (y > 280) { doc.addPage(); y = 20 }

      const group = groups.find(g => g.delegateIds.includes(m.id))
      const groupName = group ? group.name : 'Unassigned'
      const isStaff = m.role === 'Leader' || m.role === 'Assistant Leader'
      const roleLabel = isStaff ? ` (${m.role})` : ''

      doc.text(`${m.lastName}, ${m.firstName}${roleLabel}`, 14, y)
      doc.text(m.age.toString(), 130, y)
      doc.text(m.tshirtSize, 160, y)
      doc.text(groupName, 180, y)

      y += 7
    })

    y += 8
  })

  doc.save('Churches_Delegates.pdf')
}

/**
 * Loads an image into jsPDF and returns completion
 */
const addImageToDoc = (doc: jsPDF, imgUrl: string, x: number, y: number, w: number, h: number): Promise<void> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.src = imgUrl
    img.onload = () => {
      doc.addImage(img, 'PNG', x, y, w, h)
      resolve()
    }
    img.onerror = () => {
      // Fallback: draw a border if image fails
      doc.setDrawColor(200)
      doc.rect(x, y, w, h)
      resolve()
    }
  })
}

export const generateIDCards = async (delegates: Delegate[], groups: Group[], groupId?: string, autoPrint: boolean = false, manualEntries?: { firstName: string, church: string, groupName: string }[]) => {
  // Target dimensions for the ID card
  const cardW = 100
  const cardH = 135

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  let toPrint: { firstName: string, church: string, groupName: string }[] = []

  if (manualEntries) {
    toPrint = manualEntries
  } else {
    const targetGroups = groupId ? groups.filter(g => g.id === groupId) : groups
    targetGroups.forEach(g => {
      const members = g.delegateIds
        .map(id => delegates.find(d => d.id === id))
        .filter((d): d is Delegate => !!d)

      members.forEach((d) => {
        toPrint.push({ firstName: d.preferredName || d.firstName, church: d.church, groupName: g.name })
      })
    })
  }

  if (toPrint.length === 0) {
    alert('No delegates found to print.')
    return
  }

  // A4 Layout math (210 x 297)
  const marginX = (210 - (cardW * 2)) / 2
  const marginY = (297 - (cardH * 2)) / 2
  const gapX = 0
  const gapY = 0

  for (let i = 0; i < toPrint.length; i++) {
    const { firstName, church, groupName } = toPrint[i]

    // Page handling (4 IDs per page)
    const cardIndexOnPage = i % 4

    if (i > 0 && cardIndexOnPage === 0) {
      doc.addPage('a4', 'portrait')
    }

    const col = cardIndexOnPage % 2
    const row = Math.floor(cardIndexOnPage / 2)

    const x = marginX + col * (cardW + gapX)
    const y = marginY + row * (cardH + gapY)

    // Draw Background
    const layoutKey = getLayoutForGroup(groupName)
    const layoutImg = GROUP_LAYOUTS[layoutKey] || null
    if (layoutImg) {
      await addImageToDoc(doc, layoutImg, x, y, cardW, cardH)
    } else {
      doc.setDrawColor(200); doc.rect(x, y, cardW, cardH)
      doc.setFillColor(37, 99, 235); doc.rect(x, y, cardW, 15, 'F')
      doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont('helvetica', 'bold')
      doc.text('YOUTH CAMP 2026', x + cardW / 2, y + 8, { align: 'center' })
      doc.text(groupName.toUpperCase(), x + cardW / 2, y + 12, { align: 'center' })
    }

    // Draw black outline for safe cutting
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.1)
    doc.rect(x, y, cardW, cardH)

    // Coordinates: Name sitting on Middle Line (63%), Church sitting on Bottom Line (75%)
    const centerX = x + cardW / 2
    const nameY = y + (cardH * 0.60)
    const churchY = y + (cardH * 0.69)

    // Text constraint width (approx 58% of card width for magnifying lens safety)
    const maxWidth = cardW * 0.55

    // Draw Name - sitting on line
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')
    let nameFontSize = 25 // approx 24px
    doc.setFontSize(nameFontSize)
    const upperName = firstName.toUpperCase()
    let nameTextWidth = doc.getTextWidth(upperName)
    while (nameTextWidth > maxWidth && nameFontSize > 8) {
      nameFontSize -= 0.5
      doc.setFontSize(nameFontSize)
      nameTextWidth = doc.getTextWidth(upperName)
    }
    doc.text(upperName, centerX, nameY, { align: 'center' })

    // Draw Church - sitting on line
    doc.setFont('helvetica', 'normal')
    let churchFontSize = 13 // approx 17px
    doc.setFontSize(churchFontSize)
    const cName = getChurchName(church)
    let churchTextWidth = doc.getTextWidth(cName)

    while (churchTextWidth > maxWidth && churchFontSize > 6) {
      churchFontSize -= 0.5
      doc.setFontSize(churchFontSize)
      churchTextWidth = doc.getTextWidth(cName)
    }
    doc.text(cName, centerX, churchY, { align: 'center' })
  }

  if (autoPrint) {
    doc.autoPrint()
    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  } else {
    const fileName = groupId ? `Group_${groupId}_IDs` : 'Camp_IDs'
    doc.save(`${fileName}.pdf`)
  }
}

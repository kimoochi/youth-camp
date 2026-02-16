import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import jsPDF from 'jspdf'
import './App.css'
import RegistrationPage from './components/RegistrationPage'
import AdminPage from './components/AdminPage'
import type {
  ChurchId,
  Delegate,
  Group,
  DelegateCategory,
  TShirtSize,
  Mode,
  StoredState,
} from './types'
import { CHURCHES, STORAGE_KEY } from './types'

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function App() {
  const [mode, setMode] = useState<Mode>('registration')

  // Registration side
  const [selectedChurch, setSelectedChurch] = useState<ChurchId | null>(null)
  const [expectedCount, setExpectedCount] = useState<number | ''>('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [registrationDone, setRegistrationDone] = useState(false)
  const [hasConfirmedCount, setHasConfirmedCount] = useState(false)

  const [form, setForm] = useState({
    lastName: '',
    firstName: '',
    age: '',
    birthday: '',
    category: 'Young People' as DelegateCategory,
    tshirtSize: 'M' as TShirtSize,
  })

  // Shared data
  const [delegates, setDelegates] = useState<Delegate[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [hydrated, setHydrated] = useState(false)

  // Admin side
  const [adminChurchFilter, setAdminChurchFilter] = useState<ChurchId | 'ALL'>('ALL')
  const [groupCount, setGroupCount] = useState(4)
  const [draggedDelegateId, setDraggedDelegateId] = useState<string | null>(null)
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false)
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [adminPasswordInput, setAdminPasswordInput] = useState('')
  const [adminPasswordError, setAdminPasswordError] = useState('')

  // Load from localStorage on first mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as StoredState
        if (Array.isArray(parsed.delegates) && Array.isArray(parsed.groups)) {
          setDelegates(parsed.delegates)
          setGroups(parsed.groups)
        }
      }
    } catch {
      // ignore bad data
    } finally {
      setHydrated(true)
    }
  }, [])

  // Persist to localStorage when data changes
  useEffect(() => {
    if (!hydrated) return
    const state: StoredState = { delegates, groups }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore storage errors
    }
  }, [delegates, groups, hydrated])

  const handleStartRegistration = () => {
    if (!selectedChurch || !expectedCount || expectedCount <= 0 || expectedCount > 50) return
    setCurrentIndex(0)
    setRegistrationDone(false)
    setHasConfirmedCount(true)
  }

  const handleSubmitDelegate = (e: FormEvent) => {
    e.preventDefault()
    if (!selectedChurch || !expectedCount) return

    const ageNumber = Number(form.age)
    if (
      !form.lastName.trim() ||
      !form.firstName.trim() ||
      !form.birthday ||
      !ageNumber ||
      ageNumber <= 0 ||
      !form.tshirtSize
    ) {
      return
    }

    const newDelegate: Delegate = {
      id: createId('delegate'),
      church: selectedChurch,
      lastName: form.lastName.trim(),
      firstName: form.firstName.trim(),
      age: ageNumber,
      birthday: form.birthday,
      category: form.category,
      tshirtSize: form.tshirtSize,
      createdAt: new Date().toISOString(),
    }

    setDelegates((prev) => [...prev, newDelegate])

    const nextIndex = currentIndex + 1
    if (nextIndex >= expectedCount) {
      setRegistrationDone(true)
    } else {
      setCurrentIndex(nextIndex)
    }

    setForm({
      lastName: '',
      firstName: '',
      age: '',
      birthday: '',
      category: 'Young People',
      tshirtSize: 'M',
    })
  }

  const resetRegistration = () => {
    setSelectedChurch(null)
    setExpectedCount('')
    setCurrentIndex(0)
    setRegistrationDone(false)
    setHasConfirmedCount(false)
    setForm({
      lastName: '',
      firstName: '',
      age: '',
      birthday: '',
      category: 'Young People',
      tshirtSize: 'M',
    })
  }

  // Derived admin data
  const delegatesByChurch = useMemo(() => {
    const map: Record<ChurchId, Delegate[]> = {
      MIBC: [],
      QIBBC: [],
      CBBC: [],
      GCBC: [],
    }
    for (const d of delegates) {
      map[d.church].push(d)
    }
    return map
  }, [delegates])

  const adminChurch: ChurchId | null = adminChurchFilter === 'ALL' ? null : adminChurchFilter

  const adminDelegates = useMemo(() => {
    if (!adminChurch) return delegates
    return delegatesByChurch[adminChurch]
  }, [adminChurch, delegates, delegatesByChurch])

  // Groups are now global (not per church)
  const groupsForAdminChurch = useMemo(() => groups, [groups])

  const assignedDelegateIds = useMemo(() => {
    const ids = new Set<string>()
    for (const g of groupsForAdminChurch) {
      for (const id of g.delegateIds) {
        ids.add(id)
      }
    }
    return ids
  }, [groupsForAdminChurch])

  const lateDelegates = useMemo(
    () => adminDelegates.filter((d) => !assignedDelegateIds.has(d.id)),
    [adminDelegates, assignedDelegateIds],
  )

  const handleGenerateGroups = () => {
    const safeGroupCount = Math.max(1, Math.min(groupCount, 4))
    if (!delegates.length || safeGroupCount <= 0) return

    // Sort by age (oldest first) so each group gets a fair age mix
    const sorted = [...delegates].sort((a, b) => b.age - a.age)

    const newGroups: Group[] = []
    for (let i = 0; i < safeGroupCount; i++) {
      newGroups.push({
        id: createId(`group_all_${i + 1}`),
        // church field is kept for type compatibility but no longer used for filtering
        church: sorted[0]?.church ?? CHURCHES[0].id,
        name: `Group ${i + 1}`,
        delegateIds: [],
      })
    }

    // Round-robin distribution for perfectly balanced groups:
    // if delegates = 16 and groups = 4, each group will have exactly 4 members.
    // In other cases, group sizes differ by at most 1.
    sorted.forEach((d, idx) => {
      const targetIndex = idx % safeGroupCount
      newGroups[targetIndex].delegateIds.push(d.id)
    })

    // Replace existing groups with new global groups
    setGroups(newGroups)
  }

  const handleDragStart = (delegateId: string) => {
    setDraggedDelegateId(delegateId)
  }

  const handleDropToGroup = (groupId: string) => {
    if (!draggedDelegateId) return
    setGroups((prev) =>
      prev.map((g) => {
        // Remove from all groups of this church first
        let delegateIds = g.delegateIds.filter((id) => id !== draggedDelegateId)
        if (g.id === groupId) {
          if (!delegateIds.includes(draggedDelegateId)) {
            delegateIds = [...delegateIds, draggedDelegateId]
          }
        }
        return { ...g, delegateIds }
      }),
    )
    setDraggedDelegateId(null)
  }

  const handleDropToLate = () => {
    if (!draggedDelegateId) return
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        delegateIds: g.delegateIds.filter((id) => id !== draggedDelegateId),
      })),
    )
    setDraggedDelegateId(null)
  }

  const handleGoToAdmin = () => {
    if (isAdminUnlocked) {
      setMode('admin')
      return
    }

    setShowAdminLogin(true)
    setAdminPasswordInput('')
    setAdminPasswordError('')
  }

  const handleSubmitAdminPassword = (e: FormEvent) => {
    e.preventDefault()
    if (adminPasswordInput === 'Daddymooch123') {
      setIsAdminUnlocked(true)
      setShowAdminLogin(false)
      setAdminPasswordError('')
      setMode('admin')
    } else {
      setAdminPasswordError('Incorrect password. Please try again.')
    }
  }

  const handleDownloadMembersPdf = () => {
    if (!delegates.length) {
      return
    }

    const doc = new jsPDF()
    let y = 10

    doc.setFontSize(16)
    doc.text('Youth Camp 2026 – Group Members', 10, y)
    y += 8

    doc.setFontSize(11)
    doc.text(adminChurch ? `Church: ${adminChurch}` : 'All churches', 10, y)
    y += 6

    doc.setFontSize(9)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 10, y)
    y += 6

    const groupsToUse = groupsForAdminChurch
    const unassigned = lateDelegates

    if (!groupsToUse.length && !unassigned.length) {
      doc.text('No groups or delegates yet.', 10, y)
      doc.save('youth-camp-members.pdf')
      return
    }

    const addLine = (text: string, indent = 0) => {
      if (y > 280) {
        doc.addPage()
        y = 10
      }
      doc.text(text, 10 + indent, y)
      y += 5
    }

    groupsToUse.forEach((g) => {
      const groupMembers = g.delegateIds
        .map((id) => delegates.find((d) => d.id === id))
        .filter((d): d is Delegate => Boolean(d))

      addLine(`${g.name} (${groupMembers.length})`, 0)

      groupMembers.forEach((m, index) => {
        addLine(
          `${index + 1}. ${m.lastName}, ${m.firstName} – age ${m.age} – ${m.category} – ${m.church} – size ${
            m.tshirtSize ?? '-'
          }`,
          4,
        )
      })

      y += 2
    })

    if (unassigned.length) {
      addLine('Unassigned / late delegates', 0)
      unassigned.forEach((m, index) => {
        addLine(
          `${index + 1}. ${m.lastName}, ${m.firstName} – age ${m.age} – ${m.category} – ${m.church} – size ${
            m.tshirtSize ?? '-'
          }`,
          4,
        )
      })
    }

    doc.save('youth-camp-members.pdf')
  }

  const handleDownloadGroupPdf = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId)
    if (!group) return

    const members = group.delegateIds
      .map((id) => delegates.find((d) => d.id === id))
      .filter((d): d is Delegate => Boolean(d))

    if (!members.length) return

    const doc = new jsPDF()
    let y = 10

    doc.setFontSize(16)
    doc.text('Youth Camp 2026 – Group Members', 10, y)
    y += 8

    doc.setFontSize(12)
    doc.text(`Group: ${group.name}`, 10, y)
    y += 6

    doc.setFontSize(9)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 10, y)
    y += 6

    const addLine = (text: string, indent = 0) => {
      if (y > 280) {
        doc.addPage()
        y = 10
      }
      doc.text(text, 10 + indent, y)
      y += 5
    }

    members.forEach((m, index) => {
      addLine(
        `${index + 1}. ${m.lastName}, ${m.firstName} – age ${m.age} – ${m.category} – ${m.church} – size ${
          m.tshirtSize ?? '-'
        }`,
        0,
      )
    })

    const safeName = group.name.trim() || 'group'
    doc.save(`${safeName.replace(/[^a-z0-9_-]+/gi, '_')}-members.pdf`)
  }

  if (!hydrated) {
    return (
      <div className="page">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  return mode === 'registration' ? (
    <RegistrationPage
      selectedChurch={selectedChurch}
      expectedCount={expectedCount}
      currentIndex={currentIndex}
      registrationDone={registrationDone}
      hasConfirmedCount={hasConfirmedCount}
      form={form}
      onSetSelectedChurch={setSelectedChurch}
      onSetExpectedCount={setExpectedCount}
      onStartRegistration={handleStartRegistration}
      onSubmitDelegate={handleSubmitDelegate}
      onResetRegistration={resetRegistration}
      onUpdateForm={setForm}
      onGoToAdmin={handleGoToAdmin}
      showAdminLogin={showAdminLogin}
      adminPasswordInput={adminPasswordInput}
      adminPasswordError={adminPasswordError}
      onAdminPasswordChange={setAdminPasswordInput}
      onSubmitAdminPassword={handleSubmitAdminPassword}
      onCancelAdminLogin={() => {
        setShowAdminLogin(false)
        setAdminPasswordInput('')
        setAdminPasswordError('')
      }}
    />
  ) : (
    <AdminPage
      delegates={delegates}
      adminDelegates={adminDelegates}
      lateDelegates={lateDelegates}
      groupsForAdminChurch={groupsForAdminChurch}
      adminChurchFilter={adminChurchFilter}
      adminChurch={adminChurch}
      groupCount={groupCount}
      onSetAdminChurchFilter={setAdminChurchFilter}
      onSetGroupCount={setGroupCount}
      onGenerateGroups={handleGenerateGroups}
      onDropToLate={handleDropToLate}
      onDropToGroup={handleDropToGroup}
      onDragStart={handleDragStart}
      onDownloadMembersPdf={handleDownloadMembersPdf}
      onDownloadGroupPdf={handleDownloadGroupPdf}
      onRenameGroup={(groupId, name) =>
        setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, name } : g)))
      }
      onGoToRegistration={() => setMode('registration')}
    />
  )
}

export default App

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import jsPDF from 'jspdf'
import './App.css'
import RegistrationPage from './components/RegistrationPage'
import AdminPage from './components/AdminPage'
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore'
import { db } from './firebase.ts'
import type {
  ChurchId,
  Delegate,
  Group,
  DelegateCategory,
  TShirtSize,
  Mode,
} from './types'
import { CHURCHES } from './types'

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

  // Shared data (synced from Firestore)
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

  // Real-time sync from Firestore
  useEffect(() => {
    const unsubDelegates = onSnapshot(collection(db, 'delegates'), (snapshot) => {
      const loaded: Delegate[] = []
      snapshot.forEach((docSnap) => {
        loaded.push({ id: docSnap.id, ...docSnap.data() } as Delegate)
      })
      setDelegates(loaded)
    }, (error) => {
      console.error('Error listening to delegates:', error)
      alert('Failed to load delegates. Check your internet or Firebase config.')
    })

    const unsubGroups = onSnapshot(collection(db, 'groups'), (snapshot) => {
      const loaded: Group[] = []
      snapshot.forEach((docSnap) => {
        loaded.push({ id: docSnap.id, ...docSnap.data() } as Group)
      })
      setGroups(loaded)
    }, (error) => {
      console.error('Error listening to groups:', error)
    })

    setHydrated(true)

    return () => {
      unsubDelegates()
      unsubGroups()
    }
  }, [])

  const handleStartRegistration = () => {
    if (!selectedChurch || !expectedCount || expectedCount <= 0 || expectedCount > 50) return
    setCurrentIndex(0)
    setRegistrationDone(false)
    setHasConfirmedCount(true)
  }

  const handleSubmitDelegate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedChurch || !expectedCount) return

    const ageNumber = Number(form.age)
    if (
      !form.lastName.trim() ||
      !form.firstName.trim() ||
      !form.birthday ||
      isNaN(ageNumber) ||
      ageNumber <= 0 ||
      !form.tshirtSize
    ) {
      return
    }

    try {
      const delegatesCol = collection(db, 'delegates')
      const churchQuery = query(delegatesCol, where('church', '==', selectedChurch))
      const currentSnap = await getDocs(churchQuery)

      if (currentSnap.size >= 50) {
        alert('Maximum of 50 delegates per church has been reached.')
        return
      }

      const newDelegate = {
        church: selectedChurch,
        lastName: form.lastName.trim(),
        firstName: form.firstName.trim(),
        age: ageNumber,
        birthday: form.birthday,
        category: form.category,
        tshirtSize: form.tshirtSize,
        createdAt: new Date().toISOString(),
      }

      await addDoc(delegatesCol, newDelegate)

      const nextIndex = currentIndex + 1
      if (nextIndex >= Number(expectedCount)) {
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
    } catch (err) {
      console.error('Error adding delegate:', err)
      alert('Failed to save delegate. Please check your internet connection.')
    }
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

  const handleGenerateGroups = async () => {
    const safeGroupCount = Math.max(1, Math.min(groupCount, 4))
    if (!delegates.length || safeGroupCount <= 0) return

    const sorted = [...delegates].sort((a, b) => b.age - a.age)

    const newGroupsData: Omit<Group, 'id'>[] = []
    for (let i = 0; i < safeGroupCount; i++) {
      newGroupsData.push({
        name: `Group ${i + 1}`,
        delegateIds: [],
        church: sorted[0]?.church ?? CHURCHES[0].id,
      })
    }

    sorted.forEach((d, idx) => {
      const targetIndex = idx % safeGroupCount
      newGroupsData[targetIndex].delegateIds.push(d.id)
    })

    try {
      const groupsCol = collection(db, 'groups')
      const snap = await getDocs(groupsCol)
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))

      await Promise.all(newGroupsData.map((data) => addDoc(groupsCol, data)))
    } catch (err) {
      console.error('Error generating groups:', err)
      alert('Failed to generate groups.')
    }
  }

  const handleDragStart = (delegateId: string) => {
    setDraggedDelegateId(delegateId)
  }

  const handleDropToGroup = async (groupId: string) => {
    if (!draggedDelegateId) return

    try {
      const groupsCol = collection(db, 'groups')
      const snap = await getDocs(groupsCol)

      const updatePromises = snap.docs.map(async (gDoc) => {
        let delegateIds: string[] = gDoc.data().delegateIds ?? []
        const originalLength = delegateIds.length

        delegateIds = delegateIds.filter((id: string) => id !== draggedDelegateId)

        if (gDoc.id === groupId && !delegateIds.includes(draggedDelegateId)) {
          delegateIds.push(draggedDelegateId)
        }

        if (delegateIds.length !== originalLength) {
          await updateDoc(gDoc.ref, { delegateIds })
        }
      })

      await Promise.all(updatePromises)
    } catch (err) {
      console.error('Error moving delegate:', err)
    } finally {
      setDraggedDelegateId(null)
    }
  }

  const handleDropToLate = async () => {
    if (!draggedDelegateId) return

    try {
      const groupsCol = collection(db, 'groups')
      const snap = await getDocs(groupsCol)

      const updatePromises = snap.docs.map(async (gDoc) => {
        const delegateIds: string[] = gDoc.data().delegateIds ?? []
        const filtered = delegateIds.filter((id: string) => id !== draggedDelegateId)

        if (filtered.length !== delegateIds.length) {
          await updateDoc(gDoc.ref, { delegateIds: filtered })
        }
      })

      await Promise.all(updatePromises)
    } catch (err) {
      console.error('Error removing from group:', err)
    } finally {
      setDraggedDelegateId(null)
    }
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
    if (!delegates.length) return

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
          `${index + 1}. ${m.lastName}, ${m.firstName} – age ${m.age} – ${m.category} – ${m.church} – size ${m.tshirtSize ?? '-'}`,
          4,
        )
      })

      y += 2
    })

    if (unassigned.length) {
      addLine('Unassigned / late delegates', 0)
      unassigned.forEach((m, index) => {
        addLine(
          `${index + 1}. ${m.lastName}, ${m.firstName} – age ${m.age} – ${m.category} – ${m.church} – size ${m.tshirtSize ?? '-'}`,
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
        `${index + 1}. ${m.lastName}, ${m.firstName} – age ${m.age} – ${m.category} – ${m.church} – size ${m.tshirtSize ?? '-'}`,
        0,
      )
    })

    const safeName = group.name.trim() || 'group'
    doc.save(`${safeName.replace(/[^a-z0-9_-]+/gi, '_')}-members.pdf`)
  }

  if (!hydrated) {
    return (
      <div className="page">
        <div className="loading">Loading data from cloud...</div>
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
      onUpdateForm={(updater) => setForm(updater)}
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
      onRenameGroup={async (groupId, name) => {
        try {
          await updateDoc(doc(db, 'groups', groupId), { name })
        } catch (err) {
          console.error('Error renaming group:', err)
        }
      }}
      onGoToRegistration={() => setMode('registration')}
    />
  )
}

export default App
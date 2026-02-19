import { useEffect, useMemo, useState } from 'react'
import './App.css'
import RegistrationPage from './components/RegistrationPage'
import AdminPage from './components/AdminPage'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import type { ChurchId, Delegate, Group, DelegateCategory, TShirtSize, Mode, PaymentMethod, Gender } from './types'
import { generateIDCards } from './utils/pdfGenerator'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { 
  addDelegateToFirestore, 
  toggleDelegatePayment, 
  performAutoGrouping, 
  moveDelegateToGroup, 
  removeDelegateFromGroup, 
  renameGroupInFirestore 
} from './services/firestoreService'

export interface RegistrationFormState {
  lastName: string
  firstName: string
  age: string
  gender: Gender // New Field
  birthday: string
  category: DelegateCategory
  tshirtSize: TShirtSize
}

type ToastType = { message: string, type: 'success' | 'error' | 'info', id: number }

function App() {
  const navigate = useNavigate()
  const [, setMode] = useState<Mode>('registration')
  const [selectedChurch, setSelectedChurch] = useState<ChurchId | null>(null)
  const [regView, setRegView] = useState<'CHURCH_SELECT' | 'LIST' | 'SETUP_BULK' | 'BULK_FORM' | 'SUCCESS'>('CHURCH_SELECT')
  
  const [bulkCount, setBulkCount] = useState(1)
  const [bulkForms, setBulkForms] = useState<RegistrationFormState[]>([])
  const [bulkPaymentMethod, setBulkPaymentMethod] = useState<PaymentMethod>('ONSITE')
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false)

  const [delegates, setDelegates] = useState<Delegate[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [hydrated, setHydrated] = useState(false)

  const [adminChurchFilter, setAdminChurchFilter] = useState<ChurchId | 'ALL'>('ALL')
  const groupCount = 4
  
  const [draggedDelegateId, setDraggedDelegateId] = useState<string | null>(null)
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false)
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [adminPasswordInput, setAdminPasswordInput] = useState('')
  const [adminPasswordError, setAdminPasswordError] = useState('')

  const [toasts, setToasts] = useState<ToastType[]>([])

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { message, type, id }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }

  useEffect(() => {
    let gotDelegates = false
    let gotGroups = false
    let hasHydrated = false

    const maybeHydrate = () => {
      if (!hasHydrated && gotDelegates && gotGroups) {
        hasHydrated = true
        setHydrated(true)
      }
    }

    const unsubDel = onSnapshot(collection(db, 'delegates'), snap => {
      setDelegates(snap.docs.map(d => ({ id: d.id, ...d.data() } as Delegate)))
      gotDelegates = true
      maybeHydrate()
    })
    const unsubGrp = onSnapshot(collection(db, 'groups'), snap => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as Group)))
      gotGroups = true
      maybeHydrate()
    })

    return () => { unsubDel(); unsubGrp() }
  }, [])

  // Keep "/" as Home. Only use "/register" for the bulk registration flow.

  const handleStartBulk = () => { setBulkCount(1); setRegView('SETUP_BULK') }
  const handleConfirmBulkCount = (count: number) => {
    setBulkForms(Array(count).fill(null).map(() => ({
      lastName: '', firstName: '', age: '', gender: 'Male', birthday: '', category: 'High School (JHS)', tshirtSize: 'M',
    })))
    setBulkPaymentMethod('ONSITE')
    setRegView('BULK_FORM')
  }
  const handleUpdateBulkForm = (index: number, field: keyof RegistrationFormState, value: RegistrationFormState[keyof RegistrationFormState]) => {
    setBulkForms(prev => { const copy = [...prev]; copy[index] = { ...copy[index], [field]: value }; return copy })
  }
  
  const handleSubmitBulk = async (e: React.FormEvent): Promise<string[]> => {
    e.preventDefault()
    if (isBulkSubmitting) return []
    if (!selectedChurch) return []
    setIsBulkSubmitting(true)
    try {
      const docRefs = await Promise.all(
        bulkForms.map(form =>
          addDelegateToFirestore({
            church: selectedChurch,
            lastName: form.lastName,
            firstName: form.firstName,
            age: Number(form.age),
            gender: form.gender, // Include gender
            birthday: form.birthday,
            category: form.category,
            tshirtSize: form.tshirtSize,
            createdAt: new Date().toISOString(),
            paymentStatus: 'UNPAID',
            paymentMethod: bulkPaymentMethod,
          })
        )
      )

      setRegView('SUCCESS')
      showToast(`Successfully registered ${bulkForms.length} delegates!`, 'success')
      return docRefs.map(ref => ref.id)
    } catch {
      showToast('Failed to save delegates.', 'error')
      return []
    } finally {
      setIsBulkSubmitting(false)
    }
  }

  const adminDelegates = useMemo(() => adminChurchFilter === 'ALL' ? delegates : delegates.filter(d => d.church === adminChurchFilter), [adminChurchFilter, delegates])
  const paidDelegates = useMemo(() => adminDelegates.filter(d => d.paymentStatus === 'PAID'), [adminDelegates])
  const unpaidDelegates = useMemo(() => adminDelegates.filter(d => d.paymentStatus === 'UNPAID'), [adminDelegates])
  const assignedIds = useMemo(() => { const s = new Set<string>(); groups.forEach(g => g.delegateIds.forEach(id => s.add(id))); return s }, [groups])
  const unassignedPaidDelegates = useMemo(() => paidDelegates.filter(d => !assignedIds.has(d.id)), [paidDelegates, assignedIds])

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (adminPasswordInput === 'Daddymooch123') { 
      setIsAdminUnlocked(true); setShowAdminLogin(false); setMode('admin'); setAdminPasswordError('');
      navigate('/admin')
      showToast('Welcome back, Admin', 'success')
    }
    else { setAdminPasswordError('Incorrect.'); showToast('Incorrect password', 'error') }
  }

  const handleAutoGroup = async () => {
    const result = await performAutoGrouping(delegates, groups, groupCount)
    showToast(result.message, result.success ? 'success' : 'info')
  }

  const handlePrintIDs = (gid?: string) => {
    try {
      generateIDCards(delegates, groups, gid) 
      showToast('ID PDF generated', 'success')
    } catch { showToast('No delegates to print', 'error') }
  }

  return (
    <div className="page">
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'success' && '✅'}{t.type === 'error' && '⚠️'}{t.type === 'info' && 'ℹ️'} {t.message}
          </div>
        ))}
      </div>

      {!hydrated && (
        <div className="initial-loader-overlay">
          <div className="initial-loader-card">
            <div className="spinner" />
            <p>Loading camp data...</p>
          </div>
        </div>
      )}

      <Routes>
        <Route
          path="/"
          element={
            <RegistrationPage
              view={regView === 'SETUP_BULK' || regView === 'BULK_FORM' ? 'LIST' : regView}
              selectedChurch={selectedChurch}
              delegates={delegates}
              bulkCount={bulkCount}
              setBulkCount={setBulkCount}
              bulkForms={bulkForms}
              bulkPaymentMethod={bulkPaymentMethod}
              setBulkPaymentMethod={setBulkPaymentMethod}
              isBulkSubmitting={isBulkSubmitting}
              onUpdateBulkForm={handleUpdateBulkForm}
              onConfirmBulkCount={(count) => {
                handleConfirmBulkCount(count)
                navigate('/register')
              }}
              onStartBulk={() => {
                handleStartBulk()
                navigate('/register')
              }}
              onSubmitBulk={handleSubmitBulk}
              onSelectChurch={(c) => {
                setSelectedChurch(c)
                setRegView('LIST')
              }}
              onBackToChurches={() => {
                setSelectedChurch(null)
                setRegView('CHURCH_SELECT')
              }}
              onFinishRegistration={() => {
                setRegView('LIST')
              }}
              onGoHome={() => {
                setSelectedChurch(null)
                setRegView('CHURCH_SELECT')
                navigate('/')
              }}
              onGoToAdmin={() => {
                if (isAdminUnlocked) {
                  setMode('admin')
                  navigate('/admin')
                } else {
                  setShowAdminLogin(true)
                }
              }}
              showAdminLogin={showAdminLogin}
              adminPasswordInput={adminPasswordInput}
              adminPasswordError={adminPasswordError}
              onAdminPasswordChange={setAdminPasswordInput}
              onSubmitAdminPassword={handleAdminLogin}
              onCancelAdminLogin={() => setShowAdminLogin(false)}
              showToast={showToast}
            />
          }
        />

        <Route
          path="/register"
          element={
            regView === 'SETUP_BULK' || regView === 'BULK_FORM' || regView === 'SUCCESS' ? (
              <RegistrationPage
                view={regView}
                selectedChurch={selectedChurch}
                delegates={delegates}
                bulkCount={bulkCount}
                setBulkCount={setBulkCount}
                bulkForms={bulkForms}
                bulkPaymentMethod={bulkPaymentMethod}
                setBulkPaymentMethod={setBulkPaymentMethod}
                isBulkSubmitting={isBulkSubmitting}
                onUpdateBulkForm={handleUpdateBulkForm}
                onConfirmBulkCount={handleConfirmBulkCount}
                onStartBulk={handleStartBulk}
                onSubmitBulk={handleSubmitBulk}
                onSelectChurch={(c) => {
                  setSelectedChurch(c)
                  setRegView('LIST')
                  navigate('/')
                }}
                onBackToChurches={() => {
                  setSelectedChurch(null)
                  setRegView('CHURCH_SELECT')
                  navigate('/')
                }}
                onFinishRegistration={() => {
                  setRegView('LIST')
                  navigate('/')
                }}
                onGoHome={() => {
                  setSelectedChurch(null)
                  setRegView('CHURCH_SELECT')
                  navigate('/')
                }}
                onGoToAdmin={() => {
                  if (isAdminUnlocked) {
                    setMode('admin')
                    navigate('/admin')
                  } else {
                    setShowAdminLogin(true)
                  }
                }}
                showAdminLogin={showAdminLogin}
                adminPasswordInput={adminPasswordInput}
                adminPasswordError={adminPasswordError}
                onAdminPasswordChange={setAdminPasswordInput}
                onSubmitAdminPassword={handleAdminLogin}
                onCancelAdminLogin={() => setShowAdminLogin(false)}
                showToast={showToast}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/admin"
          element={
            isAdminUnlocked ? (
              <AdminPage
                delegates={delegates}
                paidDelegates={paidDelegates}
                unpaidDelegates={unpaidDelegates}
                groups={groups}
                unassignedPaidDelegates={unassignedPaidDelegates}
                adminChurchFilter={adminChurchFilter}
                groupCount={groupCount}
                onSetAdminChurchFilter={setAdminChurchFilter}
                onAutoGroup={handleAutoGroup}
                onTogglePayment={(id, status) => { toggleDelegatePayment(id, status, groups); showToast(`Status updated to ${status === 'PAID' ? 'UNPAID' : 'PAID'}`, 'info') }}
                onDropToLate={async () => { if(draggedDelegateId) { await removeDelegateFromGroup(draggedDelegateId); setDraggedDelegateId(null); showToast('Removed from group', 'info') }}}
                onDropToGroup={async (gid) => { if(draggedDelegateId) { await moveDelegateToGroup(draggedDelegateId, gid, delegates); setDraggedDelegateId(null); showToast('Moved to group', 'success') }}}
                onDragStart={setDraggedDelegateId}
                onPrintIDs={handlePrintIDs}
                onRenameGroup={renameGroupInFirestore}
                onGoToRegistration={() => {
                  setMode('registration')
                  navigate('/')
                }}
                showToast={showToast}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
export default App
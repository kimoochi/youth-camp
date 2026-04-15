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
  renameGroupInFirestore,
  setGroupGender,
  changeDelegateRole,
  createAndAssignLeader,
  deleteDelegate,
  updateDelegate,
  toggleGroupLock,
  clearAllGroups
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
  const [previousGroupsState, setPreviousGroupsState] = useState<Group[] | null>(null)

  const [adminChurchFilter, setAdminChurchFilter] = useState<ChurchId | 'ALL'>('ALL')
  const groupCount = 4
  
  const [draggedDelegateId, setDraggedDelegateId] = useState<string | null>(null)
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false)
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
  const unassignedPaidDelegates = useMemo(() => adminDelegates.filter(d => d.paymentStatus === 'PAID' && !assignedIds.has(d.id) && d.role !== 'Leader' && d.role !== 'Assistant Leader'), [adminDelegates, assignedIds])

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (adminPasswordInput === 'Daddymooch123') { 
      setIsAdminUnlocked(true); setMode('admin'); setAdminPasswordError('');
      navigate('/admin')
      showToast('Welcome back, Admin', 'success')
    }
    else { setAdminPasswordError('Incorrect.'); showToast('Incorrect password', 'error') }
  }

  const handleAutoGroup = async () => {
    setPreviousGroupsState([...groups])
    const result = await performAutoGrouping(delegates, groups, groupCount)
    showToast(result.message, result.success ? 'success' : 'info')
  }

  const handleUndoAutoGroup = async () => {
    if (!previousGroupsState) return
    const { updateDoc, doc } = await import('firebase/firestore')
    try {
      const updates = previousGroupsState.map(g => updateDoc(doc(db, 'groups', g.id), { delegateIds: g.delegateIds }))
      await Promise.all(updates)
      setPreviousGroupsState(null)
      showToast('Auto-group undone', 'info')
    } catch {
      showToast('Failed to undo', 'error')
    }
  }

  const handleClearAllGroups = async () => {
    if (!window.confirm('Clear all member assignments? Leaders/Assistants will stay in their groups.')) return
    try {
      await clearAllGroups(groups, delegates)
      showToast('Members cleared from groups', 'success')
    } catch {
      showToast('Failed to clear groups', 'error')
    }
  }

  const handleToggleGroupLock = async (groupId: string, locked: boolean) => {
    try {
      await toggleGroupLock(groupId, locked)
      showToast(locked ? 'Group locked' : 'Group unlocked', 'success')
    } catch {
      showToast('Failed to update lock status', 'error')
    }
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
              view={regView}
              selectedChurch={selectedChurch}
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
              onSubmitBulk={handleSubmitBulk}
              onSelectChurch={(c) => {
                setSelectedChurch(c)
                setRegView('SETUP_BULK')
              }}
              onFinishRegistration={() => {
                setSelectedChurch(null)
                setRegView('CHURCH_SELECT')
              }}
              onGoHome={() => {
                setSelectedChurch(null)
                setRegView('CHURCH_SELECT')
                navigate('/')
              }}
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
                bulkCount={bulkCount}
                setBulkCount={setBulkCount}
                bulkForms={bulkForms}
                bulkPaymentMethod={bulkPaymentMethod}
                setBulkPaymentMethod={setBulkPaymentMethod}
                isBulkSubmitting={isBulkSubmitting}
                onUpdateBulkForm={handleUpdateBulkForm}
                onConfirmBulkCount={handleConfirmBulkCount}
                onSubmitBulk={handleSubmitBulk}
                onSelectChurch={(c) => {
                  setSelectedChurch(c)
                  setRegView('SETUP_BULK')
                  navigate('/register')
                }}
                onFinishRegistration={() => {
                  setSelectedChurch(null)
                  setRegView('CHURCH_SELECT')
                  navigate('/')
                }}
                onGoHome={() => {
                  setSelectedChurch(null)
                  setRegView('CHURCH_SELECT')
                  navigate('/')
                }}
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
                onUndoAutoGroup={handleUndoAutoGroup}
                hasUndoAutoGroup={!!previousGroupsState}
                onClearAllGroups={handleClearAllGroups}
                onToggleGroupLock={handleToggleGroupLock}
                onTogglePayment={(id, status) => { toggleDelegatePayment(id, status, groups, delegates); showToast(`Status updated to ${status === 'PAID' ? 'UNPAID' : 'PAID'}`, 'info') }}
                onDropToLate={async () => { if(draggedDelegateId) { await removeDelegateFromGroup(draggedDelegateId); setDraggedDelegateId(null); showToast('Removed from group', 'info') }}}
                onDropToGroup={async (gid) => { 
                  if(draggedDelegateId) { 
                    try {
                      await moveDelegateToGroup(draggedDelegateId, gid); 
                      setDraggedDelegateId(null); 
                      showToast('Moved to group', 'success') 
                    } catch (err: any) {
                      showToast(err.message, 'error')
                    }
                  }
                }}
                onDragStart={setDraggedDelegateId}
                onPrintIDs={handlePrintIDs}
                onCreateLeadership={async (data, gid) => {
                  try {
                    await createAndAssignLeader(data, gid);
                    showToast('Leadership registered', 'success');
                  } catch (err: any) {
                    showToast(err.message, 'error');
                  }
                }}
                onAssignExistingLeadership={async (delegateId, gid, role) => {
                  try {
                    await moveDelegateToGroup(delegateId, gid);
                    await changeDelegateRole(delegateId, role);
                    showToast('Assigned successfully', 'success');
                  } catch (err: any) {
                    showToast(err.message, 'error');
                  }
                }}
                onRemoveLeadership={async (id) => {
                  try {
                    await changeDelegateRole(id, 'Delegate');
                    showToast('Leadership role removed', 'info');
                  } catch (err: any) {
                    showToast(err.message, 'error');
                  }
                }}
                onDeleteDelegate={async (id) => {
                  if (window.confirm('Are you sure you want to delete this delegate?')) {
                    try {
                      await deleteDelegate(id, groups);
                      showToast('Delegate deleted', 'success');
                    } catch (err: any) {
                      showToast(err.message, 'error');
                    }
                  }
                }}
                onUpdateDelegate={updateDelegate}
                onRenameGroup={renameGroupInFirestore}
                onSetGroupGender={setGroupGender}
                onGoToRegistration={() => {
                  setMode('registration')
                  navigate('/')
                }}
                showToast={showToast}
              />
            ) : (
              <div className="page" style={{minHeight:'100vh', display:'flex', justifyContent:'center', alignItems:'center'}}>
                <section className="card modal-card" style={{width: '100%', maxWidth: '400px'}}>
                  <h2>Admin Login</h2>
                  <form onSubmit={handleAdminLogin}>
                    <input type="password" value={adminPasswordInput} onChange={e=>setAdminPasswordInput(e.target.value)} autoFocus placeholder="Enter Password" className="input-large" />
                    {adminPasswordError && <p className="error-text">{adminPasswordError}</p>}
                    <div className="actions right">
                       <button type="submit" className="primary large">Login</button>
                    </div>
                  </form>
                </section>
              </div>
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
export default App
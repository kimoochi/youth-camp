import type { FormEvent } from 'react'
import { CHURCHES, getChurchName } from '../types'
import type { ChurchId, Delegate, PaymentMethod } from '../types'
import type { RegistrationFormState } from '../App'

interface RegistrationPageProps {
  view: 'CHURCH_SELECT' | 'LIST' | 'SETUP_BULK' | 'BULK_FORM' | 'SUCCESS'
  selectedChurch: ChurchId | null
  delegates: Delegate[]
  bulkCount: number
  setBulkCount: (n: number) => void
  bulkForms: RegistrationFormState[]
  bulkPaymentMethod: PaymentMethod
  setBulkPaymentMethod: (m: PaymentMethod) => void
  isBulkSubmitting: boolean
  onUpdateBulkForm: (
    index: number,
    field: keyof RegistrationFormState,
    value: RegistrationFormState[keyof RegistrationFormState]
  ) => void
  onConfirmBulkCount: (n: number) => void
  onStartBulk: () => void
  onSubmitBulk: (e: FormEvent) => Promise<string[]> 
  onSelectChurch: (church: ChurchId) => void
  onBackToChurches: () => void
  onFinishRegistration: () => void
  onGoToAdmin: () => void
  onGoHome: () => void
  showAdminLogin: boolean
  adminPasswordInput: string
  adminPasswordError: string
  onAdminPasswordChange: (v: string) => void
  onSubmitAdminPassword: (e: FormEvent) => void
  onCancelAdminLogin: () => void
  showToast: (msg: string, type: 'success'|'error'|'info') => void
}

function RegistrationPage({
  view,
  selectedChurch,
  delegates,
  bulkCount,
  setBulkCount,
  bulkForms,
  bulkPaymentMethod,
  setBulkPaymentMethod,
  isBulkSubmitting,
  onUpdateBulkForm,
  onConfirmBulkCount,
  onStartBulk,
  onSubmitBulk,
  onSelectChurch,
  onBackToChurches,
  onFinishRegistration,
  onGoToAdmin,
  onGoHome,
  showAdminLogin,
  adminPasswordInput,
  adminPasswordError,
  onAdminPasswordChange,
  onSubmitAdminPassword,
  onCancelAdminLogin,
  showToast
}: RegistrationPageProps) {

  const churchDelegates = delegates.filter(d => d.church === selectedChurch)
  const currentChurchName = getChurchName(selectedChurch)

  const GCASH_NUMBER = '09619605811'

  const isValidName = (v: string) => {
    const s = v.trim()
    if (s.length < 2 || s.length > 40) return false
    return /^[A-Za-zÑñ][A-Za-zÑñ' -]*$/.test(s)
  }

  const getAgeFromBirthday = (birthdayIso: string) => {
    const d = new Date(birthdayIso)
    if (Number.isNaN(d.getTime())) return null
    const today = new Date()
    let age = today.getFullYear() - d.getFullYear()
    const m = today.getMonth() - d.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1
    return age
  }

  const validateBulkForms = () => {
    for (let i = 0; i < bulkForms.length; i++) {
      const f = bulkForms[i]
      if (!isValidName(f.firstName)) return `Delegate ${i + 1}: First name must be letters only.`
      if (!isValidName(f.lastName)) return `Delegate ${i + 1}: Last name must be letters only.`

      const ageNum = Number(f.age)
      if (!Number.isInteger(ageNum)) return `Delegate ${i + 1}: Age must be a whole number.`
      if (ageNum < 0 || ageNum > 60) return `Delegate ${i + 1}: Age must be between 0 and 60.`

      const bd = new Date(f.birthday)
      const today = new Date()
      if (Number.isNaN(bd.getTime())) return `Delegate ${i + 1}: Birthday is invalid.`
      if (bd > today) return `Delegate ${i + 1}: Birthday cannot be in the future.`
      if (bd.getFullYear() < 1950) return `Delegate ${i + 1}: Birthday year looks invalid.`

      const computedAge = getAgeFromBirthday(f.birthday)
      if (computedAge !== null && Math.abs(computedAge - ageNum) > 1) {
        return `Delegate ${i + 1}: Age doesn't match birthday.`
      }
    }
    return null
  }

  const sanitizeNameInput = (value: string) =>
    value.replace(/[^A-Za-zÑñ' -]/g, '')

  const sanitizeAgeInput = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 2)
    if (!digits) return ''
    let n = Number(digits)
    if (Number.isNaN(n)) return ''
    if (n < 0) n = 0
    if (n > 60) n = 60
    return String(n)
  }

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (isBulkSubmitting) return
    const validationError = validateBulkForms()
    if (validationError) {
      showToast(validationError, 'error')
      return
    }

    await onSubmitBulk(e)
  }

  return (
    <div className="page" style={{minHeight:'100vh'}}>
      <header className="topbar">
        <button type="button" className="topbar-home" onClick={onGoHome}>
          <div className="camp-title">Youth Camp 2026</div>
          <div className="camp-subtitle">Registration Portal</div>
        </button>
        <button className="topbar-button" onClick={onGoToAdmin}>Admin Access</button>
      </header>

      <main className="content">
        {/* LOGIN MODAL */}
        {showAdminLogin && (
          <div className="modal-overlay">
            <section className="card modal-card">
              <h2>Admin Login</h2>
              <form onSubmit={onSubmitAdminPassword}>
                <input type="password" value={adminPasswordInput} onChange={e=>onAdminPasswordChange(e.target.value)} autoFocus placeholder="Enter Password" className="input-large" />
                {adminPasswordError && <p className="error-text">{adminPasswordError}</p>}
                <div className="actions right">
                   <button type="button" className="ghost" onClick={onCancelAdminLogin}>Cancel</button>
                   <button type="submit" className="primary">Login</button>
                </div>
              </form>
            </section>
          </div>
        )}

        {/* QR / reference modal removed – online payments handled via simple instructions only */}

        {/* STEP 1 & 2 & 3 (Same as before) */}
        {view === 'CHURCH_SELECT' && !showAdminLogin && (
          <section className="card">
            <h2>Select your Church</h2>
            <p className="helper-text">Please select your participating church.</p>
            <div className="church-grid">
              {CHURCHES.map(c => (
                <button key={c.id} className="church-tile" onClick={() => onSelectChurch(c.id)}>
                  <span className="church-code" style={{fontSize: '1.2rem', color: '#1f2937'}}>{c.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {view === 'LIST' && selectedChurch && !showAdminLogin && (
          <section className="card">
            <div className="card-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
              <div><h2>{currentChurchName}</h2><p className="helper-text" style={{marginBottom:0}}>{churchDelegates.length} Registered Delegates</p></div>
              <button className="ghost small" onClick={onBackToChurches}>Change Church</button>
            </div>
            <div className="table-wrapper">
               {churchDelegates.length === 0 ? (<div style={{padding:'2rem', textAlign:'center', color:'#6b7280'}}><p>No delegates registered yet.</p></div>) : (
                 <table>
                   <thead><tr><th>Name</th><th>Category</th><th>Status</th></tr></thead>
                   <tbody>{churchDelegates.map(d => (<tr key={d.id}><td>{d.lastName}, {d.firstName}</td><td>{d.category}</td><td>{d.paymentStatus === 'PAID' ? <span className="badge success">PAID</span> : <span className="badge warn">UNPAID</span>}</td></tr>))}</tbody>
                 </table>
               )}
            </div>
            <div className="actions centered" style={{marginTop:'2rem'}}><button className="primary" style={{padding:'0.8rem 2rem', fontSize:'1rem'}} onClick={onStartBulk}>+ Register Delegates</button></div>
          </section>
        )}

        {view === 'SETUP_BULK' && !showAdminLogin && (
          <section className="card centered-card">
            <h2>Registration Count</h2><p className="helper-text">How many delegates are you registering now?</p>
            <div className="counter-input"><button className="counter-btn" onClick={() => setBulkCount(Math.max(1, bulkCount - 1))}>-</button><span className="counter-val">{bulkCount}</span><button className="counter-btn" onClick={() => setBulkCount(Math.min(10, bulkCount + 1))}>+</button></div>
            <div className="actions centered"><button className="ghost" onClick={onFinishRegistration}>Cancel</button><button className="primary" onClick={() => onConfirmBulkCount(bulkCount)}>Next Step</button></div>
          </section>
        )}

        {/* STEP 4: BULK FORM (UPDATED WITH GENDER) */}
        {view === 'BULK_FORM' && selectedChurch && !showAdminLogin && (
          <form onSubmit={handleFormSubmit} className="bulk-container">
             <div className="card" style={{position:'sticky', top: '80px', zIndex:40, borderLeft: '4px solid var(--primary)'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                   <div style={{display:'flex', alignItems:'center', gap:'10px'}}><h2 style={{margin:0}}>Registering {bulkForms.length} Delegates</h2><span className="badge" style={{background:'var(--black)', color:'var(--primary)'}}>BATCH ENTRY</span></div>
                   <button type="button" className="ghost small" onClick={onFinishRegistration}>Cancel</button>
                </div>
                <div style={{marginTop: '1rem', padding: '1rem', background: '#FFFBEB', borderRadius: '6px', border: '1px solid #FCD34D'}}>
                  <h3 style={{fontSize: '1rem', marginBottom: '0.5rem', color: '#B45309'}}>Registration Fee: ₱600.00 / head</h3>
                  <p style={{margin:0, fontSize: '0.9rem', color: '#78350F'}}>Includes accommodation, meals, materials, and a <strong>free T-Shirt (valued at ₱180)</strong>.</p>
                </div>
             </div>

             <div className="bulk-forms-grid">
               {bulkForms.map((form, index) => (
                 <div key={index} className="delegate-form-card">
                    <div className="form-card-title">Delegate {index + 1}</div>
                    <div className="form-grid-compact">
                      <div className="field-group half">
                        <label>First Name</label>
                        <input
                          required
                          value={form.firstName}
                          onChange={e=>onUpdateBulkForm(index, 'firstName', sanitizeNameInput(e.target.value))}
                          placeholder="First Name"
                          autoComplete="given-name"
                          inputMode="text"
                        />
                      </div>
                      <div className="field-group half">
                        <label>Last Name</label>
                        <input
                          required
                          value={form.lastName}
                          onChange={e=>onUpdateBulkForm(index, 'lastName', sanitizeNameInput(e.target.value))}
                          placeholder="Last Name"
                          autoComplete="family-name"
                          inputMode="text"
                        />
                      </div>
                      <div className="field-group quarter">
                        <label>Age</label>
                        <input
                          type="number"
                          required
                          min={0}
                          max={60}
                          step={1}
                          value={form.age}
                          onChange={e=>onUpdateBulkForm(index, 'age', sanitizeAgeInput(e.target.value))}
                          placeholder="0"
                          inputMode="numeric"
                        />
                      </div>
                      {/* ADDED GENDER FIELD HERE */}
                      <div className="field-group quarter">
                        <label>Gender</label>
                        <select value={form.gender} onChange={e=>onUpdateBulkForm(index, 'gender', e.target.value)}>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                      <div className="field-group third">
                        <label>Birthday</label>
                        <input
                          type="date"
                          required
                          value={form.birthday}
                          max={new Date().toISOString().slice(0, 10)}
                          min="1950-01-01"
                          onFocus={(e) => (e.target as HTMLInputElement & { showPicker?: () => void }).showPicker?.()}
                          onChange={e=>onUpdateBulkForm(index, 'birthday', e.target.value)}
                        />
                      </div>
                      <div className="field-group third">
                        <label>Category</label>
                        <select value={form.category} onChange={e=>onUpdateBulkForm(index, 'category', e.target.value)}>
                          <option>High School (JHS)</option>
                          <option>High School (SHS)</option>
                          <option>College</option>
                          <option>Young Professional</option>
                        </select>
                      </div>
                      <div className="field-group quarter">
                        <label>Size</label>
                        <select value={form.tshirtSize} onChange={e=>onUpdateBulkForm(index, 'tshirtSize', e.target.value)}>
                          <option>XS</option><option>S</option><option>M</option><option>L</option><option>XL</option><option>XXL</option>
                        </select>
                      </div>
                    </div>
                 </div>
               ))}
             </div>

             <div className="card payment-card">
               <h3>Payment Method</h3>
               <p className="helper-text" style={{marginBottom:'0.5rem'}}>Select a payment method for this entire batch.</p>
               <div className="radio-group">
                  <label className={`radio-tile ${bulkPaymentMethod === 'ONLINE' ? 'selected' : ''}`}><input type="radio" name="pay" checked={bulkPaymentMethod === 'ONLINE'} onChange={() => setBulkPaymentMethod('ONLINE')} /><span>Pay Online (GCash)</span></label>
                  <label className={`radio-tile ${bulkPaymentMethod === 'ONSITE' ? 'selected' : ''}`}><input type="radio" name="pay" checked={bulkPaymentMethod === 'ONSITE'} onChange={() => setBulkPaymentMethod('ONSITE')} /><span>Pay On-Site (Cash)</span></label>
               </div>
             </div>

             <div className="actions right fixed-footer">
               <button type="submit" className="primary large" disabled={isBulkSubmitting}>
                 {isBulkSubmitting ? 'Submitting...' : `Submit All ${bulkForms.length} Registrations`}
               </button>
             </div>
          </form>
        )}

        {view === 'SUCCESS' && !showAdminLogin && (
          <section className="card centered-card">
            <div style={{fontSize:'3rem', marginBottom:'1rem'}}>✅</div>
            <h2>Registration Successful!</h2>
            <p style={{marginBottom:'2rem'}}>Successfully registered {bulkForms.length} delegates.</p>
            {bulkPaymentMethod === 'ONLINE' ? (
              <div style={{background:'#f9fafb', padding:'1.5rem', borderRadius:'8px', marginBottom:'2rem'}}>
                <p><strong>Online Payment Instructions</strong></p>
                <p style={{marginBottom:'0.5rem'}}>
                  Total amount is <strong>₱{bulkForms.length * 600}</strong> according to the delegates you registered.
                </p>
                <p style={{marginBottom:'0.5rem'}}>
                  Please send your payment to GCash number <strong>{GCASH_NUMBER}</strong>.
                </p>
                <p className="helper-text">
                  After paying, send a message on Messenger to <strong>Aldo Yu</strong> with your church name and number of delegates.
                </p>
              </div>
            ) : (
              <p className="helper-text">Your total payment is: ₱{bulkForms.length * 600}.</p>
            )}
            <button className="primary" onClick={onFinishRegistration}>Back to Delegate List</button>
          </section>
        )}
      </main>
    </div>
  )
}

export default RegistrationPage
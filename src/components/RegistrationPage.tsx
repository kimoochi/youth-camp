import { CHURCHES, getChurchName } from '../types'
import type { ChurchId, Delegate, Gender, DelegateCategory, TShirtSize, PaymentMethod } from '../types'
import type { RegistrationFormState } from '../App'

interface RegistrationPageProps {
  view: 'CHURCH_SELECT' | 'LIST' | 'SETUP_BULK' | 'BULK_FORM' | 'SUCCESS'
  selectedChurch: ChurchId | null
  delegates: Delegate[]
  bulkCount: number
  setBulkCount: (count: number) => void
  bulkForms: RegistrationFormState[]
  bulkPaymentMethod: PaymentMethod
  setBulkPaymentMethod: (method: PaymentMethod) => void
  isBulkSubmitting: boolean
  onUpdateBulkForm: (index: number, field: keyof RegistrationFormState, value: any) => void
  onConfirmBulkCount: (count: number) => void
  onStartBulk: () => void
  onSubmitBulk: (e: React.FormEvent) => void
  onSelectChurch: (id: ChurchId) => void
  onBackToChurches: () => void
  onFinishRegistration: () => void
  onGoHome: () => void
  onGoToAdmin: () => void
  showAdminLogin: boolean
  adminPasswordInput: string
  adminPasswordError: string
  onAdminPasswordChange: (val: string) => void
  onSubmitAdminPassword: (e: React.FormEvent) => void
  onCancelAdminLogin: () => void
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void
}

const MONTHS = [
  { val: '01', label: 'January' }, { val: '02', label: 'February' }, { val: '03', label: 'March' },
  { val: '04', label: 'April' }, { val: '05', label: 'May' }, { val: '06', label: 'June' },
  { val: '07', label: 'July' }, { val: '08', label: 'August' }, { val: '09', label: 'September' },
  { val: '10', label: 'October' }, { val: '11', label: 'November' }, { val: '12', label: 'December' }
]

const range = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => start + i)
const DAYS = range(1, 31).map(d => d.toString().padStart(2, '0'))
const currentYear = new Date().getFullYear()

const previousYears = range(currentYear - 60, currentYear - 5)
const additionalYears = range(2022, 2026)
const allYears = [...new Set([...previousYears, ...additionalYears])].sort((a, b) => b - a)
const YEARS = allYears.map(y => y.toString())

const calculateAge = (birthday: string): string => {
  if (!birthday || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return ''
  
  const birthDate = new Date(birthday)
  if (isNaN(birthDate.getTime())) return ''

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDifference = today.getMonth() - birthDate.getMonth()
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age >= 0 ? age.toString() : ''
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
  onGoHome,
  onGoToAdmin,
  showAdminLogin,
  adminPasswordInput,
  adminPasswordError,
  onAdminPasswordChange,
  onSubmitAdminPassword,
  onCancelAdminLogin,
}: RegistrationPageProps) {

  const churchDelegates = delegates.filter(d => d.church === selectedChurch)

  const BirthdayPicker = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
    const [y, m, d] = value.split('-')

    const handleUpdate = (part: 'y' | 'm' | 'd', val: string) => {
      const newDate = { y, m, d }
      if (part === 'y') newDate.y = val
      if (part === 'm') newDate.m = val
      if (part === 'd') newDate.d = val
      onChange(`${newDate.y || ''}-${newDate.m || ''}-${newDate.d || ''}`)
    }

    return (
      <div className="birthday-select-group">
        <select value={m || ''} onChange={e => handleUpdate('m', e.target.value)}>
          <option value="" disabled>Month</option>
          {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
        </select>
        <select value={d || ''} onChange={e => handleUpdate('d', e.target.value)}>
          <option value="" disabled>Day</option>
          {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={y || ''} onChange={e => handleUpdate('y', e.target.value)}>
          <option value="" disabled>Year</option>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="topbar">
        <button className="topbar-home" onClick={onGoHome}>
          <div className="camp-title">YOUTH CAMP 2026</div>
          <div className="camp-subtitle">REGISTRATION PORTAL</div>
        </button>
        <button className="topbar-button" onClick={onGoToAdmin}>ADMIN ACCESS</button>
      </header>

      <main className="content">
        {view === 'CHURCH_SELECT' && (
          <section className="centered-card">
            <h2>SELECT YOUR CHURCH</h2>
            <p className="helper-text">Please select your participating church.</p>
            <div className="church-grid">
              {CHURCHES.map(c => (
                <div key={c.id} className="church-tile" onClick={() => onSelectChurch(c.id)}>
                  <div className="church-code">{c.name}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {view === 'LIST' && selectedChurch && (
          <>
            <section className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>{getChurchName(selectedChurch)}</h2>
                <button className="ghost small" onClick={onBackToChurches}>Change Church</button>
              </div>
              <p className="helper-text">There are {churchDelegates.length} delegates registered from your church.</p>
              <button className="primary large" onClick={onStartBulk}>Register New Delegates</button>
            </section>

            {churchDelegates.length > 0 && (
              <section className="card">
                <h3>Registered Delegates</h3>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {churchDelegates.sort((a, b) => a.lastName.localeCompare(b.lastName)).map(d => (
                        <tr key={d.id}>
                          <td style={{ fontWeight: 700 }}>{d.lastName}, {d.firstName}</td>
                          <td>{d.category}</td>
                          <td>
                            <span className={`badge ${d.paymentStatus === 'PAID' ? 'success' : 'warn'}`}>
                              {d.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        {view === 'SETUP_BULK' && (
          <section className="card centered-card">
            <h2>How many delegates?</h2>
            <p className="helper-text">Enter the number of people you want to register at once.</p>

            <div className="counter-input">
              <button className="counter-btn" onClick={() => setBulkCount(Math.max(1, bulkCount - 1))}>−</button>
              <div className="counter-val">{bulkCount}</div>
              <button className="counter-btn" onClick={() => setBulkCount(Math.min(20, bulkCount + 1))}>+</button>
            </div>

            <div className="actions centered">
              <button className="ghost" onClick={() => onFinishRegistration()}>Cancel</button>
              <button className="primary" onClick={() => onConfirmBulkCount(bulkCount)}>Continue</button>
            </div>
          </section>
        )}

        {view === 'BULK_FORM' && (
          <form onSubmit={onSubmitBulk} className="bulk-container">
            <section className="card">
              <h2 style={{ margin: 0 }}>REGISTRATION FORM</h2>
              <p className="helper-text" style={{ lineHeight: 1.6 }}>
                Fill in the details for {bulkForms.length} delegate(s).
                <br /><br />
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Registration Fee: ₱600.00 / head</span><br />
                <small>Includes accommodation, meals, materials, and a free T-Shirt (valued at ₱180).</small>
              </p>
            </section>

            <div className="bulk-forms-grid">
              {bulkForms.map((form, idx) => (
                <div key={idx} className="delegate-form-card">
                  <div className="form-card-title">Delegate #{idx + 1}</div>
                  <div className="form-grid-compact">
                    <div className="field-group half">
                      <label>Last Name</label>
                      <input required value={form.lastName} onChange={e => onUpdateBulkForm(idx, 'lastName', e.target.value)} placeholder="e.g. Dela Cruz" />
                    </div>
                    <div className="field-group half">
                      <label>First Name</label>
                      <input required value={form.firstName} onChange={e => onUpdateBulkForm(idx, 'firstName', e.target.value)} placeholder="e.g. Juan" />
                    </div>

                    <div className="field-group third">
                      <label>Birthday</label>
                      <BirthdayPicker 
                        value={form.birthday} 
                        onChange={(val) => {
                          onUpdateBulkForm(idx, 'birthday', val)
                          const age = calculateAge(val)
                          if (age) {
                            onUpdateBulkForm(idx, 'age', age)
                          }
                        }}
                      />
                    </div>

                    <div className="field-group third">
                      <label>Age</label>
                      <input required type="number" value={form.age} onChange={()=>{}} placeholder="0" readOnly />
                    </div>

                    <div className="field-group third">
                      <label>Gender</label>
                      <select value={form.gender} onChange={e => onUpdateBulkForm(idx, 'gender', e.target.value as Gender)}>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>

                    <div className="field-group half">
                      <label>Category</label>
                      <select value={form.category} onChange={e => onUpdateBulkForm(idx, 'category', e.target.value as DelegateCategory)}>
                        <option value="High School (JHS)">High School (JHS)</option>
                        <option value="High School (SHS)">High School (SHS)</option>
                        <option value="College">College</option>
                        <option value="Young Professional">Young Professional</option>
                      </select>
                    </div>

                    <div className="field-group half">
                      <label>T-Shirt Size</label>
                      <select value={form.tshirtSize} onChange={e => onUpdateBulkForm(idx, 'tshirtSize', e.target.value as TShirtSize)}>
                        <option value="XS">Extra Small (XS)</option>
                        <option value="S">Small (S)</option>
                        <option value="M">Medium (M)</option>
                        <option value="L">Large (L)</option>
                        <option value="XL">Extra Large (XL)</option>
                        <option value="XXL">2XL</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <section className="card payment-card">
              <h3>Payment Method</h3>
              <p className="helper-text" style={{ marginBottom: '1.5rem' }}>Select how you'll pay for the registration fee.</p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className={`radio-tile ${bulkPaymentMethod === 'ONSITE' ? 'selected' : ''}`} onClick={() => setBulkPaymentMethod('ONSITE')}>
                  <input type="radio" checked={bulkPaymentMethod === 'ONSITE'} readOnly />
                  On-site (Upon Arrival)
                </div>
                <div className={`radio-tile ${bulkPaymentMethod === 'ONLINE' ? 'selected' : ''}`} onClick={() => setBulkPaymentMethod('ONLINE')}>
                  <input type="radio" checked={bulkPaymentMethod === 'ONLINE'} readOnly />
                  Online (GCash)
                </div>
              </div>
            </section>

            <div className="actions centered" style={{ padding: '2rem 0 4rem' }}>
              <button type="button" className="ghost" onClick={() => onFinishRegistration()}>Cancel</button>
              <button type="submit" className="primary" disabled={isBulkSubmitting}>
                {isBulkSubmitting ? 'Registering...' : `Submit ${bulkForms.length} Registration(s)`}
              </button>
            </div>
          </form>
        )}

        {view === 'SUCCESS' && (
          bulkPaymentMethod === 'ONLINE' ? (
            <section className="card centered-card" style={{ padding: '3rem 2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h2 style={{ textTransform: 'uppercase', fontWeight: 900, marginBottom: '0.5rem' }}>Registration Successful!</h2>
              <p className="helper-text" style={{ marginBottom: '2rem' }}>
                Successfully registered {bulkForms.length} delegate{bulkForms.length > 1 ? 's' : ''}.
              </p>
              
              <div className="online-payment-card">
                <h3 style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '1rem', marginBottom: '1.5rem' }}>Online Payment Instructions</h3>
                <p className="helper-text" style={{ margin: 0 }}>Total amount is <strong style={{ fontSize: '1.2em' }}>₱{bulkForms.length * 600}</strong> according to the delegates you registered.</p>
                <p className="helper-text" style={{ marginTop: '1.5rem' }}>Please send your payment to GCash number <strong style={{ fontSize: '1.2em', color: 'var(--accent)' }}>09619605811</strong>.</p>
                <p className="helper-text" style={{ marginTop: '1rem' }}>After paying, send a message on Messenger to <strong style={{ color: 'var(--accent)' }}>Aldo Yu</strong> with your church name and number of delegates.</p>
              </div>

              <button className="primary large" onClick={onFinishRegistration} style={{ marginTop: '2rem' }}>BACK TO DELEGATE LIST</button>
            </section>
          ) : (
            <section className="card centered-card" style={{ padding: '4rem 2rem' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
              <h2>Registration Submitted!</h2>
              <p className="helper-text">
                Thank you for registering. Please proceed to the payment counter to complete your registration.
              </p>
              <button className="primary large" onClick={onFinishRegistration}>Back to List</button>
            </section>
          )
        )}

      </main>

      {showAdminLogin && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Admin Access</h3>
            <p className="helper-text">Enter password to access dashboard.</p>
            <form onSubmit={onSubmitAdminPassword}>
              <input
                type="password"
                className="input-large"
                placeholder="••••••••"
                autoFocus
                value={adminPasswordInput}
                onChange={(e) => onAdminPasswordChange(e.target.value)}
              />
              {adminPasswordError && <p className="error-text">{adminPasswordError}</p>}
              <div className="actions centered">
                <button type="button" className="ghost" onClick={onCancelAdminLogin}>Cancel</button>
                <button type="submit" className="primary">Login</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default RegistrationPage
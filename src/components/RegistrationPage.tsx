import type { FormEvent } from 'react'
import { CHURCHES } from '../types'
import type { ChurchId, PaymentMethod } from '../types'
import type { RegistrationFormState } from '../App'

interface RegistrationPageProps {
  view: 'CHURCH_SELECT' | 'LIST' | 'SETUP_BULK' | 'BULK_FORM' | 'SUCCESS'
  selectedChurch: ChurchId | null
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
  onSubmitBulk: (e: FormEvent) => Promise<string[]> 
  onSelectChurch: (church: ChurchId) => void
  onFinishRegistration: () => void
  onGoHome: () => void
  showToast: (msg: string, type: 'success'|'error'|'info') => void
}

function RegistrationPage({
  view,
  selectedChurch,
  bulkCount,
  setBulkCount,
  bulkForms,
  bulkPaymentMethod,
  setBulkPaymentMethod,
  isBulkSubmitting,
  onUpdateBulkForm,
  onConfirmBulkCount,
  onSubmitBulk,
  onSelectChurch,
  onFinishRegistration,
  onGoHome,
  showToast
}: RegistrationPageProps) {

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

      const bd = new Date(f.birthday)
      const today = new Date()
      if (Number.isNaN(bd.getTime())) return `Delegate ${i + 1}: Birthday is invalid.`
      if (bd > today) return `Delegate ${i + 1}: Birthday cannot be in the future.`
      if (bd.getFullYear() < 1950) return `Delegate ${i + 1}: Birthday year looks invalid.`

      const computedAge = getAgeFromBirthday(f.birthday)
      if (computedAge === null || computedAge < 0 || computedAge > 60) {
        return `Delegate ${i + 1}: Age must be between 0 and 60.`
      }
    }
    return null
  }

  const sanitizeNameInput = (value: string) =>
    value.replace(/[^A-Za-zÑñ' -]/g, '')

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
    <div className="reg-page">
      <header className="reg-header">
        <button type="button" className="reg-home-btn" onClick={onGoHome}>
          <span className="reg-title">Youth Camp 2026</span>
          <span className="reg-subtitle">Registration</span>
        </button>
      </header>

      {view === 'CHURCH_SELECT' && (
        <div className="reg-hero">
          <div className="reg-hero-content">
            <span className="reg-badge">Registration Open</span>
            <h1 className="reg-hero-title">Youth Camp 2026</h1>
            <p className="reg-hero-text">Register your delegates for an unforgettable experience</p>
          </div>
        </div>
      )}

      <main className="reg-content">
        {view === 'CHURCH_SELECT' && (
          <>
            <section className="reg-card">
              <h2 className="reg-section-title">Select your Church</h2>
              <div className="reg-church-grid">
                {CHURCHES.map(c => (
                  <button key={c.id} className="reg-church-btn" onClick={() => onSelectChurch(c.id)}>
                    <span className="reg-church-name">{c.name}</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {view === 'SETUP_BULK' && (
          <section className="reg-card reg-card-center">
            <h2 className="reg-section-title">How Many Delegates?</h2>
            <p className="reg-helper">Select the number of delegates to register</p>
            <div className="reg-counter">
              <button className="reg-counter-btn" onClick={() => setBulkCount(Math.max(1, bulkCount - 1))}>-</button>
              <span className="reg-counter-val">{bulkCount}</span>
              <button className="reg-counter-btn" onClick={() => setBulkCount(Math.min(10, bulkCount + 1))}>+</button>
            </div>
            <div className="reg-actions">
              <button className="reg-btn reg-btn-ghost" onClick={onFinishRegistration}>Cancel</button>
              <button className="reg-btn reg-btn-primary" onClick={() => onConfirmBulkCount(bulkCount)}>Continue</button>
            </div>
          </section>
        )}

        {view === 'BULK_FORM' && selectedChurch && (
          <form onSubmit={handleFormSubmit} className="reg-form-container">
            <div className="reg-form-header">
              <div className="reg-form-info">
                <h2 className="reg-form-title">{bulkForms.length} Delegate{bulkForms.length > 1 ? 's' : ''}</h2>
                <span className="reg-batch-badge">Batch Entry</span>
              </div>
              <button type="button" className="reg-btn reg-btn-ghost reg-btn-sm" onClick={onFinishRegistration}>Cancel</button>
            </div>

            <div className="reg-fee-card">
              <div className="reg-fee-row">
                <span>Registration Fee</span>
                <strong>₱600.00 / head</strong>
              </div>
              <p className="reg-fee-note">Includes accommodation, meals, materials & free T-Shirt</p>
            </div>

            <div className="reg-forms-list">
              {bulkForms.map((form, index) => {
                const calculatedAge = getAgeFromBirthday(form.birthday)
                return (
                  <div key={index} className="reg-delegate-card">
                    <div className="reg-delegate-header">
                      <span className="reg-delegate-num">Delegate {index + 1}</span>
                    </div>
                    <div className="reg-form-grid">
                      <div className="reg-field">
                        <label>First Name</label>
                        <input
                          required
                          value={form.firstName}
                          onChange={e => onUpdateBulkForm(index, 'firstName', sanitizeNameInput(e.target.value))}
                          placeholder="First Name"
                        />
                      </div>
                      <div className="reg-field">
                        <label>Last Name</label>
                        <input
                          required
                          value={form.lastName}
                          onChange={e => onUpdateBulkForm(index, 'lastName', sanitizeNameInput(e.target.value))}
                          placeholder="Last Name"
                        />
                      </div>
                      <div className="reg-field reg-field-sm">
                        <label>Birthday</label>
                        <input
                          type="date"
                          required
                          value={form.birthday}
                          max={new Date().toISOString().slice(0, 10)}
                          onChange={e => {
                            const birthday = e.target.value;
                            onUpdateBulkForm(index, 'birthday', birthday);
                            const age = getAgeFromBirthday(birthday);
                            if (age !== null) {
                              onUpdateBulkForm(index, 'age', age.toString());
                            }
                          }}
                        />
                      </div>
                      <div className="reg-field reg-field-sm">
                        <label>Age</label>
                        <div className="reg-age-display">
                          {calculatedAge !== null && calculatedAge >= 0 && calculatedAge <= 60 ? calculatedAge : '—'}
                        </div>
                      </div>
                      <div className="reg-field reg-field-sm">
                        <label>Gender</label>
                        <select value={form.gender} onChange={e => onUpdateBulkForm(index, 'gender', e.target.value)}>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                      <div className="reg-field">
                        <label>Category</label>
                        <select value={form.category} onChange={e => onUpdateBulkForm(index, 'category', e.target.value)}>
                          <option>High School (JHS)</option>
                          <option>High School (SHS)</option>
                          <option>College</option>
                          <option>Young Professional</option>
                        </select>
                      </div>
                      <div className="reg-field reg-field-sm">
                        <label>Size</label>
                        <select value={form.tshirtSize} onChange={e => onUpdateBulkForm(index, 'tshirtSize', e.target.value)}>
                          <option value="10">10</option><option value="12">12</option><option value="14">14</option><option value="16">16</option><option value="18">18</option><option value="20">20</option>
                          <option value="XS">XS</option><option value="S">S</option><option value="M">M</option><option value="L">L</option><option value="XL">XL</option><option value="XXL">XXL</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="reg-payment-card">
              <h3 className="reg-payment-title">Payment Method</h3>
              <div className="reg-payment-options">
                <label className={`reg-payment-option ${bulkPaymentMethod === 'ONLINE' ? 'selected' : ''}`}>
                  <input type="radio" name="pay" checked={bulkPaymentMethod === 'ONLINE'} onChange={() => setBulkPaymentMethod('ONLINE')} />
                  <span>GCash Online</span>
                </label>
                <label className={`reg-payment-option ${bulkPaymentMethod === 'ONSITE' ? 'selected' : ''}`}>
                  <input type="radio" name="pay" checked={bulkPaymentMethod === 'ONSITE'} onChange={() => setBulkPaymentMethod('ONSITE')} />
                  <span>Pay On-Site</span>
                </label>
              </div>
            </div>

            <div className="reg-submit-bar">
              <button type="submit" className="reg-btn reg-btn-primary reg-btn-lg" disabled={isBulkSubmitting}>
                {isBulkSubmitting ? 'Submitting...' : `Submit ${bulkForms.length} Registration${bulkForms.length > 1 ? 's' : ''}`}
              </button>
            </div>
          </form>
        )}

        {view === 'SUCCESS' && (
          <section className="reg-card reg-card-center">
            <div className="reg-success-icon">✓</div>
            <h2 className="reg-success-title">Registration Complete!</h2>
            <p className="reg-success-text">{bulkForms.length} delegate{bulkForms.length > 1 ? 's' : ''} registered successfully.</p>
            
            {bulkPaymentMethod === 'ONLINE' ? (
              <div className="reg-payment-info">
                <p className="reg-total">Total: <strong>₱{bulkForms.length * 600}</strong></p>
                <p>Send payment to GCash: <strong>{GCASH_NUMBER}</strong></p>
                <p className="reg-helper">Message Aldo Yu on Messenger with church name and delegate count after payment.</p>
              </div>
            ) : (
              <p className="reg-payment-info">Pay ₱{bulkForms.length * 600} on-site during check-in.</p>
            )}
            
            <button className="reg-btn reg-btn-primary" onClick={onFinishRegistration}>Register More</button>
          </section>
        )}
      </main>
    </div>
  )
}

export default RegistrationPage

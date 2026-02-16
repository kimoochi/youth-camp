import type { FormEvent } from 'react'
import { CHURCHES } from '../types'
import type { ChurchId, DelegateCategory, TShirtSize } from '../types'

interface RegistrationFormState {
  lastName: string
  firstName: string
  age: string
  birthday: string
  category: DelegateCategory
  tshirtSize: TShirtSize
}

interface RegistrationPageProps {
  selectedChurch: ChurchId | null
  expectedCount: number | ''
  currentIndex: number
  registrationDone: boolean
  hasConfirmedCount: boolean
  form: RegistrationFormState
  onSetSelectedChurch: (church: ChurchId) => void
  onSetExpectedCount: (value: number | '') => void
  onStartRegistration: () => void
  onSubmitDelegate: (e: FormEvent<HTMLFormElement>) => void
  onResetRegistration: () => void
  onUpdateForm: (updater: (prev: RegistrationFormState) => RegistrationFormState) => void
  onGoToAdmin: () => void
  showAdminLogin: boolean
  adminPasswordInput: string
  adminPasswordError: string
  onAdminPasswordChange: (value: string) => void
  onSubmitAdminPassword: (e: FormEvent<HTMLFormElement>) => void
  onCancelAdminLogin: () => void
}

function RegistrationPage({
  selectedChurch,
  expectedCount,
  currentIndex,
  registrationDone,
  hasConfirmedCount,
  form,
  onSetSelectedChurch,
  onSetExpectedCount,
  onStartRegistration,
  onSubmitDelegate,
  onResetRegistration,
  onUpdateForm,
  onGoToAdmin,
  showAdminLogin,
  adminPasswordInput,
  adminPasswordError,
  onAdminPasswordChange,
  onSubmitAdminPassword,
  onCancelAdminLogin,
}: RegistrationPageProps) {
  return (
    <div className="page">
      <header className="topbar">
        <div>
          <div className="camp-title">Youth Camp 2026</div>
          <div className="camp-subtitle">Delegate Registration</div>
        </div>
        <button className="topbar-button" onClick={onGoToAdmin}>
          Admin
        </button>
      </header>

      <main className="content">
        {showAdminLogin && (
          <section className="card">
            <h2>Admin login</h2>
            <p className="helper">This area is locked. Please enter the admin password.</p>
            <form className="form-row" onSubmit={onSubmitAdminPassword}>
              <label>
                Password
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={(e) => onAdminPasswordChange(e.target.value)}
                  autoFocus
                />
              </label>
              <div className="actions" style={{ marginTop: '0.75rem' }}>
                <button type="button" className="ghost" onClick={onCancelAdminLogin}>
                  Cancel
                </button>
                <button type="submit" className="primary">
                  Login
                </button>
              </div>
            </form>
            {adminPasswordError && (
              <p className="helper" style={{ color: '#b91c1c', marginTop: '0.5rem' }}>
                {adminPasswordError}
              </p>
            )}
          </section>
        )}

        {!selectedChurch ? (
          <section className="card">
            <h2>Select your church</h2>
            <p className="helper">Please choose which church you are from.</p>
            <div className="church-grid">
              {CHURCHES.map((c) => (
                <button key={c.id} className="church-tile" onClick={() => onSetSelectedChurch(c.id)}>
                  <span className="church-code">{c.id}</span>
                </button>
              ))}
            </div>
          </section>
        ) : !hasConfirmedCount ? (
          <section className="card">
            <h2>How many delegates?</h2>
            <p className="helper">Church: {selectedChurch} • Up to 50 delegates per church</p>
            <div className="form-row">
              <label>
                Number of delegates
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={expectedCount}
                  onChange={(e) => {
                    const value = e.target.value
                    if (!value) {
                      onSetExpectedCount('')
                    } else {
                      const n = Number(value)
                      if (!Number.isNaN(n) && n >= 1 && n <= 50) {
                        onSetExpectedCount(n)
                      }
                    }
                  }}
                />
              </label>
            </div>
            <div className="actions">
              <button className="ghost" onClick={onResetRegistration}>
                Back
              </button>
              <button
                className="primary"
                onClick={onStartRegistration}
                disabled={!expectedCount || Number(expectedCount) <= 0}
              >
                Start registration
              </button>
            </div>
          </section>
        ) : (
          <section className="card">
            <div className="card-header">
              <div>
                <h2>Delegate {Math.min(currentIndex + 1, Number(expectedCount))}</h2>
                <p className="helper">
                  Church: {selectedChurch} • {currentIndex + 1} of {expectedCount}
                </p>
              </div>
              <button className="ghost small" onClick={onResetRegistration}>
                Change church / count
              </button>
            </div>

            {registrationDone ? (
              <div className="success-panel">
                <h3>Registration complete</h3>
                <p>All delegates for this church have been registered. Thank you!</p>
                <button className="primary" onClick={onResetRegistration}>
                  Register another church
                </button>
              </div>
            ) : (
              <form className="form-grid" onSubmit={onSubmitDelegate}>
                <label>
                  Last name
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => onUpdateForm((f) => ({ ...f, lastName: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  First name
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => onUpdateForm((f) => ({ ...f, firstName: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Age
                  <input
                    type="number"
                    min={1}
                    value={form.age}
                    onChange={(e) => onUpdateForm((f) => ({ ...f, age: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Birthday
                  <input
                    type="date"
                    value={form.birthday}
                    onChange={(e) => onUpdateForm((f) => ({ ...f, birthday: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Category
                  <select
                    value={form.category}
                    onChange={(e) =>
                      onUpdateForm((f) => ({ ...f, category: e.target.value as DelegateCategory }))
                    }
                  >
                    <option value="Young People">Young People</option>
                    <option value="Young Professional">Young Professional</option>
                    <option value="Bible Student">Bible Student</option>
                    <option value="Preacher">Preacher</option>
                  </select>
                </label>
                <label>
                  T-shirt size
                  <select
                    value={form.tshirtSize}
                    onChange={(e) =>
                      onUpdateForm((f) => ({ ...f, tshirtSize: e.target.value as TShirtSize }))
                    }
                  >
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                  </select>
                </label>

                <div className="form-actions">
                  <button type="submit" className="primary">
                    {currentIndex + 1 >= Number(expectedCount) ? 'Finish registration' : 'Save delegate'}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default RegistrationPage


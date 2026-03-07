import { useMemo } from 'react';
import { CHURCHES, getChurchName } from '../types';
import type { ChurchId, Delegate, RegistrationFormState, PaymentMethod } from '../types';
import DelegateForm from './DelegateForm';
import SuccessPage from './SuccessPage';

// Utility functions (can be moved to a utils file)
const calculateAge = (birthday: string): string => {
  if (!birthday || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return '';
  const birthDate = new Date(birthday);
  if (isNaN(birthDate.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age >= 0 ? age.toString() : '';
};

interface RegistrationPageProps {
  view: 'CHURCH_SELECT' | 'LIST' | 'SETUP_BULK' | 'BULK_FORM' | 'SUCCESS';
  selectedChurch: ChurchId | null;
  delegates: Delegate[];
  bulkCount: number;
  setBulkCount: (count: number) => void;
  bulkForms: RegistrationFormState[];
  bulkPaymentMethod: PaymentMethod;
  setBulkPaymentMethod: (method: PaymentMethod) => void;
  isBulkSubmitting: boolean;
  onUpdateBulkForm: (index: number, field: keyof RegistrationFormState, value: any) => void;
  onConfirmBulkCount: (count: number) => void;
  onStartBulk: () => void;
  onSubmitBulk: (e: React.FormEvent) => void;
  onSelectChurch: (id: ChurchId) => void;
  onBackToChurches: () => void;
  onFinishRegistration: () => void;
  onGoHome: () => void;
  onGoToAdmin: () => void;
  showAdminLogin: boolean;
  adminPasswordInput: string;
  adminPasswordError: string;
  onAdminPasswordChange: (val: string) => void;
  onSubmitAdminPassword: (e: React.FormEvent) => void;
  onCancelAdminLogin: () => void;
}

function RegistrationPage(props: RegistrationPageProps) {
  const {
    view, selectedChurch, delegates, bulkCount, setBulkCount, bulkForms,
    bulkPaymentMethod, setBulkPaymentMethod, isBulkSubmitting, onUpdateBulkForm,
    onConfirmBulkCount, onStartBulk, onSubmitBulk, onSelectChurch, onBackToChurches,
    onFinishRegistration, onGoHome, onGoToAdmin, showAdminLogin, adminPasswordInput,
    adminPasswordError, onAdminPasswordChange, onSubmitAdminPassword, onCancelAdminLogin,
  } = props;

  const churchDelegates = useMemo(() =>
    delegates.filter(d => d.church === selectedChurch).sort((a, b) => a.lastName.localeCompare(b.lastName)),
    [delegates, selectedChurch]
  );

  const renderView = () => {
    switch (view) {
      case 'CHURCH_SELECT':
        return (
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
        );

      case 'LIST':
        return selectedChurch && (
          <section className="card registration-card">
            <div className="registration-header">
              <h2>{getChurchName(selectedChurch)}</h2>
              <button className="ghost small" onClick={onBackToChurches}>Change Church</button>
            </div>
            <div className="actions centered">
              <button className="primary" onClick={onStartBulk}>Register New Delegates</button>
            </div>
          </section>
        );

      case 'SETUP_BULK':
        return (
          <section className="card centered-card">
            <h2>How many delegates?</h2>
            <p className="helper-text">Enter the number of people you want to register at once.</p>
            <div className="counter-input">
              <button className="counter-btn" onClick={() => setBulkCount(Math.max(1, bulkCount - 1))}>−</button>
              <div className="counter-val">{bulkCount}</div>
              <button className="counter-btn" onClick={() => setBulkCount(Math.min(20, bulkCount + 1))}>+</button>
            </div>
            <div className="actions centered">
              <button className="ghost" onClick={onFinishRegistration}>Cancel</button>
              <button className="primary" onClick={() => onConfirmBulkCount(bulkCount)}>Continue</button>
            </div>
          </section>
        );

      case 'BULK_FORM':
        return (
          <form onSubmit={onSubmitBulk} className="bulk-container">
            <section className="card">
              <h2>REGISTRATION FORM</h2>
              <p className="helper-text form-intro">
                Fill in the details for {bulkForms.length} delegate(s).
                <br /><br />
                <span className="fee-info">Registration Fee: ₱600.00 / head</span><br />
                <small>Includes accommodation, meals, materials, and a free T-Shirt (valued at ₱180).</small>
              </p>
            </section>

            <div className="bulk-forms-grid">
              {bulkForms.map((form, idx) => (
                <DelegateForm
                  key={idx}
                  form={form}
                  idx={idx}
                  onUpdateBulkForm={onUpdateBulkForm}
                  calculateAge={calculateAge}
                />
              ))}
            </div>

            <section className="card payment-card">
              <h3>Payment Method</h3>
              <p className="helper-text">Select how you'll pay for the registration fee.</p>
              <div className="radio-group">
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

            <div className="form-actions">
              <button type="button" className="ghost" onClick={onFinishRegistration}>Cancel</button>
              <button type="submit" className="primary" disabled={isBulkSubmitting}>
                {isBulkSubmitting ? 'Registering...' : `Submit ${bulkForms.length} Registration(s)`}
              </button>
            </div>
          </form>
        );

      case 'SUCCESS':
        return <SuccessPage bulkFormsLength={bulkForms.length} bulkPaymentMethod={bulkPaymentMethod} onFinishRegistration={onFinishRegistration} />;
    }
  };

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
        {renderView()}
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
  );
}

export default RegistrationPage;

import React, { useState } from 'react';
import type { Delegate } from '../types';
import { getChurchName } from '../types';

interface UnpaidViewProps {
  unpaidDelegates: Delegate[];
  onTogglePayment: (id: string, currentStatus: 'PAID' | 'UNPAID') => void;
  onEditDelegate: (delegate: Delegate) => void;
  onDeleteDelegate: (delegateId: string) => void;
  onMarkAllAsPaid: () => Promise<boolean>;
}

type ButtonState = 'idle' | 'loading' | 'success' | 'error';

const UnpaidView: React.FC<UnpaidViewProps> = ({ unpaidDelegates, onTogglePayment, onEditDelegate, onDeleteDelegate, onMarkAllAsPaid }) => {
  const [buttonState, setButtonState] = useState<ButtonState>('idle');

  const handleMarkAllClick = async () => {
    setButtonState('loading');
    const success = await onMarkAllAsPaid();
    if (success) {
      setButtonState('success');
      setTimeout(() => setButtonState('idle'), 2000); // Revert after 2s
    } else {
      setButtonState('error');
      setTimeout(() => setButtonState('idle'), 2000); // Revert after 2s
    }
  };

  const getButtonContent = () => {
    switch (buttonState) {
      case 'loading':
        return 'Marking...';
      case 'success':
        return 'Done! ✅';
      case 'error':
        return 'Error! ⚠️';
      default:
        return 'Mark All as Paid';
    }
  };

  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="view-title">Unpaid ({unpaidDelegates.length})</h3>
        {unpaidDelegates.length > 0 && (
          <button className="primary" onClick={handleMarkAllClick} disabled={buttonState !== 'idle'}>
            {getButtonContent()}
          </button>
        )}
      </div>
      <div className="table-wrapper-container">
        {unpaidDelegates.map(d => (
          <div key={d.id} className="delegate-card-unpaid">
            <div className="delegate-name-unpaid">{d.lastName}, {d.firstName}</div>
            <div className="delegate-church-unpaid">{getChurchName(d.church)}</div>
            <div className="delegate-actions-unpaid">
              <button className="ghost small" onClick={() => onEditDelegate(d)}>Edit</button>
              <button className="ghost small danger" onClick={() => onDeleteDelegate(d.id)}>Delete</button>
              <button className="primary small mark-paid-button" onClick={() => onTogglePayment(d.id, 'UNPAID')}>
                Mark as PAID
              </button>
            </div>
          </div>
        ))}
        {unpaidDelegates.length === 0 && <p className="helper-text empty-view-message">No unpaid delegates.</p>}
      </div>
    </section>
  );
};

export default React.memo(UnpaidView);

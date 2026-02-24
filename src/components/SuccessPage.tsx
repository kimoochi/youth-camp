import React from 'react';

interface SuccessPageProps {
  bulkFormsLength: number;
  bulkPaymentMethod: 'ONLINE' | 'ONSITE';
  onFinishRegistration: () => void;
}

function SuccessPage({ bulkFormsLength, bulkPaymentMethod, onFinishRegistration }: SuccessPageProps) {
  return (
    bulkPaymentMethod === 'ONLINE' ? (
      <section className="card centered-card success-card-online">
        <div className="success-icon">✅</div>
        <h2 className="success-title">Registration Successful!</h2>
        <p className="helper-text">
          Successfully registered {bulkFormsLength} delegate{bulkFormsLength > 1 ? 's' : ''}.
        </p>
        
        <div className="online-payment-card">
          <h3 className="online-payment-title">Online Payment Instructions</h3>
          <p className="helper-text">Total amount is <strong className="total-amount">₱{bulkFormsLength * 600}</strong> according to the delegates you registered.</p>
          <p className="helper-text">Please send your payment to GCash number <strong className="gcash-number">09619605811</strong>.</p>
          <p className="helper-text">After paying, send a message on Messenger to <strong className="messenger-name">Aldo Yu</strong> with your church name and number of delegates.</p>
        </div>

        <button className="primary large" onClick={onFinishRegistration} style={{ marginTop: '2rem' }}>BACK TO DELEGATE LIST</button>
      </section>
    ) : (
      <section className="card centered-card success-card-offline">
        <div className="success-icon">🎉</div>
        <h2>Registration Submitted!</h2>
        <p className="helper-text">
          Thank you for registering. Please proceed to the payment counter to complete your registration.
        </p>
        <button className="primary large" onClick={onFinishRegistration}>Back to List</button>
      </section>
    )
  );
}

export default React.memo(SuccessPage);

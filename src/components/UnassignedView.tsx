import React from 'react';
import type { Delegate } from '../types';
import { getChurchName } from '../types';

interface UnassignedViewProps {
  unassignedPaidDelegates: Delegate[];
  onDropToLate: () => void;
  onDragStart: (id: string) => void;
  onTogglePayment: (id: string, currentStatus: 'PAID' | 'UNPAID') => void;
}

const UnassignedView: React.FC<UnassignedViewProps> = ({ unassignedPaidDelegates, onDropToLate, onDragStart, onTogglePayment }) => {
  return (
    <section className="card" onDragOver={e => e.preventDefault()} onDrop={onDropToLate}>
      <h3 className="view-title">Late / Unassigned ({unassignedPaidDelegates.length})</h3>
      <div className="delegate-list-container">
        {unassignedPaidDelegates.map(d => (
          <div key={d.id} className="delegate-card" draggable onDragStart={() => onDragStart(d.id)}>
            <div>
              <div className="delegate-name">{d.lastName}, {d.firstName}</div>
              <div className="delegate-meta">{getChurchName(d.church)} • {d.age}yo</div>
            </div>
            <button className="ghost small" onClick={() => onTogglePayment(d.id, 'PAID')}>Undo</button>
          </div>
        ))}
        {unassignedPaidDelegates.length === 0 && <p className="helper-text empty-view-message">All paid delegates are grouped.</p>}
      </div>
    </section>
  );
};

export default React.memo(UnassignedView);

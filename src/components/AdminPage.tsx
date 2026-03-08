import { useState, useMemo } from 'react';
import { CHURCHES } from '../types';
import type { ChurchId, Delegate, Group } from '../types';
import GroupView from './GroupView';
import UnassignedView from './UnassignedView';
import UnpaidView from './UnpaidView';

interface AdminPageProps {
  delegates: Delegate[];
  unpaidDelegates: Delegate[];
  groups: Group[];
  unassignedPaidDelegates: Delegate[];
  adminChurchFilter: ChurchId | 'ALL';
  onSetAdminChurchFilter: (val: ChurchId | 'ALL') => void;
  onTogglePayment: (id: string, currentStatus: 'PAID' | 'UNPAID') => void;
  onDropToLate: () => void;
  onDropToGroup: (groupId: string) => void;
  onDragStart: (id: string) => void;
  onPrintIDs: (groupId?: string) => void;
  onPrintTShirts: () => void;
  onEditDelegate: (delegate: Delegate) => void;
  onDeleteDelegate: (delegateId: string) => void;
  onGoToRegistration: () => void;
  onRenameGroup: (groupId: string, newName: string) => void;
  onAutoGroup: () => void;
  onMoveToUnassigned: (delegateId: string) => void;
  onMarkAsUnpaid: (delegateId: string) => void;
  onMarkMultipleAsPaid: (delegates: Delegate[]) => Promise<boolean>;
}

type AdminView = 'groups' | 'unassigned' | 'unpaid';

function AdminPage(props: AdminPageProps) {
  const {
    delegates, unpaidDelegates, groups, unassignedPaidDelegates,
    adminChurchFilter, onSetAdminChurchFilter, onTogglePayment,
    onDropToLate, onDropToGroup, onDragStart, onPrintIDs, onPrintTShirts, onEditDelegate, onDeleteDelegate, onGoToRegistration,
    onRenameGroup, onAutoGroup, onMoveToUnassigned, onMarkAsUnpaid,
    onMarkMultipleAsPaid
  } = props;

  const [view, setView] = useState<AdminView>('groups');

  const visibleUnpaid = useMemo(() => {
    if (adminChurchFilter === 'ALL') return unpaidDelegates;
    return unpaidDelegates.filter(d => d.church === adminChurchFilter);
  }, [unpaidDelegates, adminChurchFilter]);

  const renderContent = () => {
    switch (view) {
      case 'groups':
        return <GroupView groups={groups} delegates={delegates} onDropToGroup={onDropToGroup} onDragStart={onDragStart} onPrintIDs={onPrintIDs} onRenameGroup={onRenameGroup} onEditDelegate={onEditDelegate} onDeleteDelegate={onDeleteDelegate} onMoveToUnassigned={onMoveToUnassigned} onMarkAsUnpaid={onMarkAsUnpaid} />;
      case 'unassigned':
        return <UnassignedView unassignedPaidDelegates={unassignedPaidDelegates} onDropToLate={onDropToLate} onDragStart={onDragStart} onTogglePayment={onTogglePayment} onEditDelegate={onEditDelegate} onDeleteDelegate={onDeleteDelegate} />;
      case 'unpaid':
        return <UnpaidView unpaidDelegates={visibleUnpaid} onTogglePayment={onTogglePayment} onEditDelegate={onEditDelegate} onDeleteDelegate={onDeleteDelegate} onMarkAllAsPaid={() => onMarkMultipleAsPaid(visibleUnpaid)} />;
      default:
        return null;
    }
  };

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <div className="camp-title">Youth Camp 2026</div>
          <div className="camp-subtitle">Admin Dashboard</div>
        </div>
        <button className="topbar-button" onClick={onGoToRegistration}>Back to Registration</button>
      </header>

      <main className="content">
        <section className="card">
          <div className="admin-filters">
            <div className="field-group">
              <label>Filter View</label>
              <select
                value={adminChurchFilter}
                onChange={e => onSetAdminChurchFilter(e.target.value as ChurchId | 'ALL')}
              >
                <option value="ALL">All Churches</option>
                {CHURCHES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="actions">
              <button className="ghost" onClick={onAutoGroup}>Auto Group (4)</button>
              <button className="primary" onClick={onPrintTShirts}>Print T-Shirts</button>
            </div>
          </div>
        </section>

        <nav className="tabs-container">
          <div className="tabs">
            <button onClick={() => setView('groups')} className={`tab-button ${view === 'groups' ? 'active' : ''}`}>
              Groups
            </button>
            <button onClick={() => setView('unassigned')} className={`tab-button ${view === 'unassigned' ? 'active' : ''}`}>
              Late/Unassigned <span className="notification-badge">{unassignedPaidDelegates.length}</span>
            </button>
            <button onClick={() => setView('unpaid')} className={`tab-button ${view === 'unpaid' ? 'active' : ''}`}>
              Unpaid <span className="notification-badge">{visibleUnpaid.length}</span>
            </button>
          </div>
        </nav>

        <div className="tab-content-area">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default AdminPage;

import { useState, type FormEvent } from 'react'
import { CHURCHES, getChurchName } from '../types'
import type { ChurchId, Delegate, Group, TShirtSize } from '../types'
import { generateGroupListPDF } from '../utils/pdfGenerator'
import { moveDelegateToGroup } from '../services/firestoreService'

interface AdminPageProps {
  delegates: Delegate[]
  paidDelegates: Delegate[]
  unpaidDelegates: Delegate[]
  groups: Group[]
  unassignedPaidDelegates: Delegate[]
  adminChurchFilter: ChurchId | 'ALL'
  groupCount: number
  onSetAdminChurchFilter: (val: ChurchId | 'ALL') => void
  onAutoGroup: () => void
  onUndoAutoGroup: () => void
  hasUndoAutoGroup: boolean
  onClearAllGroups: () => void
  onToggleGroupLock: (groupId: string, locked: boolean) => void
  onTogglePayment: (id: string, currentStatus: 'PAID' | 'UNPAID') => void
  onDropToLate: () => void
  onDropToGroup: (groupId: string) => void
  onDragStart: (id: string) => void
  onPrintIDs: (groupId?: string) => void
  onRenameGroup: (id: string, name: string) => void
  onCreateLeadership: (data: Omit<Delegate, 'id'>, groupId: string) => void
  onAssignExistingLeadership: (delegateId: string, groupId: string, role: 'Leader' | 'Assistant Leader') => void
  onRemoveLeadership: (delegateId: string) => void
  onDeleteDelegate: (id: string) => void
  onUpdateDelegate: (id: string, updates: Partial<Delegate>) => Promise<void>
  onGoToRegistration: () => void
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
}

type SidebarTab = 'unpaid' | 'late' | 'unassigned' | 'leaders'

function MemberTShirtSelect({ member, onUpdate, showToast }: {
  member: Delegate
  onUpdate: (id: string, updates: Partial<Delegate>) => Promise<void>
  showToast: (m: string, t: 'success' | 'error' | 'info') => void
}) {
  return (
    <select
      value={member.tshirtSize}
      aria-label={`T-shirt size for ${member.firstName} ${member.lastName}`}
      onChange={async (e) => {
        try {
          await onUpdate(member.id, { tshirtSize: e.target.value as TShirtSize })
          showToast('Size updated', 'success')
        } catch {
          showToast('Update failed', 'error')
        }
      }}
      className="tshirt-select"
    >
      <option value="10">10</option><option value="12">12</option><option value="14">14</option>
      <option value="16">16</option><option value="18">18</option><option value="20">20</option>
      <option value="XS">XS</option><option value="S">S</option><option value="M">M</option>
      <option value="L">L</option><option value="XL">XL</option><option value="XXL">XXL</option>
    </select>
  )
}

interface GroupCardProps {
  g: Group
  delegates: Delegate[]
  groups: Group[]
  locked: boolean
  onToggleGroupLock: (groupId: string, locked: boolean) => void
  onRenameGroup: (id: string, name: string) => void
  onDropToGroup: (groupId: string) => void
  onDragStart: (id: string) => void
  onPrintIDs: (groupId?: string) => void
  onTogglePayment: (id: string, currentStatus: 'PAID' | 'UNPAID') => void
  onRemoveLeadership: (id: string) => void
  onDeleteDelegate: (id: string) => void
  onUpdateDelegate: (id: string, updates: Partial<Delegate>) => Promise<void>
  onAddLeader: (groupId: string, role: 'Leader' | 'Assistant Leader') => void
  setSelectedDelegate: (d: Delegate | null) => void
  showToast: (m: string, t: 'success' | 'error' | 'info') => void
}

function GroupCard({
  g, delegates, groups, locked,
  onToggleGroupLock, onRenameGroup, onDropToGroup, onDragStart,
  onPrintIDs, onTogglePayment, onRemoveLeadership, onDeleteDelegate,
  onUpdateDelegate, onAddLeader, setSelectedDelegate, showToast
}: GroupCardProps) {
  const members = g.delegateIds.map(id => delegates.find(d => d.id === id)).filter((d): d is Delegate => !!d)
  const leader = members.find(m => m.role === 'Leader')
  const assistants = members.filter(m => m.role === 'Assistant Leader')
  const standard = members.filter(m => m.role !== 'Leader' && m.role !== 'Assistant Leader')

  return (
    <div
      className={`group-card ${locked ? 'locked' : 'active'}`}
      onDragOver={e => !locked && e.preventDefault()}
      onDrop={() => !locked && onDropToGroup(g.id)}
      aria-label={`Group: ${g.name}${locked ? ' (locked)' : ''}`}
      aria-disabled={locked}
    >
      <div className="group-card-header">
        <div className="group-header-left">
          {locked && (
            <span className="lock-badge" aria-hidden="true" title="This group is locked">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
              </svg>
            </span>
          )}
          <input
            value={g.name}
            onChange={e => onRenameGroup(g.id, e.target.value)}
            className="group-name-input"
            disabled={locked}
            aria-label={`Group name: ${g.name}`}
          />
          {locked && <span className="sr-only">This group is locked</span>}
        </div>
        <div className="group-header-right">
          <span className="member-count" aria-label={`${members.length} members`}>{members.length}</span>
          <button
            className={`lock-btn ${locked ? 'locked' : ''}`}
            onClick={() => onToggleGroupLock(g.id, !locked)}
            aria-label={locked ? 'Unlock this group' : 'Lock this group'}
            aria-pressed={locked}
            title={locked ? 'Unlock group' : 'Lock group'}
          >
            {locked ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1C9.24 1 7 3.24 7 6v1H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2h-1V6c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v1H9V6c0-1.66 1.34-3 3-3zm0 9c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {!locked && (
        <div className="group-card-actions">
          <button className="group-btn" onClick={() => generateGroupListPDF(g, delegates)} aria-label="Download PDF list">PDF</button>
          <button className="group-btn primary" onClick={() => onPrintIDs(g.id)} aria-label="Print ID cards">Print IDs</button>
        </div>
      )}

      {leader ? (
        <div className="role-section leader-section">
          <div className="role-header"><span>LEADER</span></div>
          <div className="member-card leader-card">
            <div className="member-info">
              <span className="member-name">{leader.lastName}, {leader.firstName} <span className="member-age">({leader.age})</span></span>
              <span className={`status-tag ${leader.paymentStatus.toLowerCase()}`}>{leader.paymentStatus}</span>
            </div>
            {!locked && (
              <>
                <div className="member-quick-edit">
                  <span className="quick-label">Size:</span>
                  <MemberTShirtSelect member={leader} onUpdate={onUpdateDelegate} showToast={showToast} />
                </div>
                <div className="member-actions">
                  <button className="member-btn" onClick={() => onTogglePayment(leader.id, leader.paymentStatus)}>{leader.paymentStatus === 'PAID' ? 'Unpaid' : 'Paid'}</button>
                  <button className="member-btn" onClick={() => onRemoveLeadership(leader.id)}>Demote</button>
                  <button className="member-btn danger" onClick={() => onDeleteDelegate(leader.id)}>Delete</button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="role-section leader-section empty">
          <div className="role-header">
            <span>LEADER</span>
            {!locked && <button className="add-role-btn" onClick={() => onAddLeader(g.id, 'Leader')}>+ Add</button>}
          </div>
        </div>
      )}

      <div className="role-section assistant-section">
        <div className="role-header">
          <span>ASSISTANT</span>
          {!locked && <button className="add-role-btn" onClick={() => onAddLeader(g.id, 'Assistant Leader')}>+ Add</button>}
        </div>
        {assistants.map(a => (
          <div key={a.id} className="member-card assistant-card">
            <div className="member-info">
              <span className="member-name">{a.lastName}, {a.firstName} <span className="member-age">({a.age})</span></span>
              <span className={`status-tag ${a.paymentStatus.toLowerCase()}`}>{a.paymentStatus}</span>
            </div>
            {!locked && (
              <>
                <div className="member-quick-edit">
                  <span className="quick-label">Size:</span>
                  <MemberTShirtSelect member={a} onUpdate={onUpdateDelegate} showToast={showToast} />
                </div>
                <div className="member-actions">
                  <button className="member-btn" onClick={() => onTogglePayment(a.id, a.paymentStatus)}>{a.paymentStatus === 'PAID' ? 'Unpaid' : 'Paid'}</button>
                  <button className="member-btn" onClick={() => onRemoveLeadership(a.id)}>Demote</button>
                  <button className="member-btn danger" onClick={() => onDeleteDelegate(a.id)}>Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="members-section">
        <span className="section-label male-label">MALE</span>
        {standard.filter(m => m.gender === 'Male').map(m => (
          <div key={m.id} className="member-card compact" draggable={!locked} onDragStart={() => !locked && onDragStart(m.id)}>
            <div className="member-info">
              <span className="member-name">{m.lastName}, {m.firstName} <span className="member-age">({m.age})</span></span>
              <span className={`status-tag ${m.paymentStatus.toLowerCase()}`}>{m.paymentStatus}</span>
            </div>
            {!locked && (
              <>
                <div className="member-quick-edit">
                  <span className="quick-label">Size:</span>
                  <MemberTShirtSelect member={m} onUpdate={onUpdateDelegate} showToast={showToast} />
                </div>
                <div className="member-actions">
                  <select
                    className="move-select"
                    onChange={async (e) => {
                      if (e.target.value) {
                        try { await moveDelegateToGroup(m.id, e.target.value); showToast('Moved to group', 'success') }
                        catch { showToast('Failed to move', 'error') }
                        e.target.value = ''
                      }
                    }}
                    defaultValue=""
                    aria-label={`Move ${m.firstName} to another group`}
                  >
                    <option value="" disabled>Move to...</option>
                    {groups.filter(gr => gr.id !== g.id).map(gr => (
                      <option key={gr.id} value={gr.id}>{gr.name}</option>
                    ))}
                  </select>
                  <button className="member-btn" onClick={() => setSelectedDelegate(m)}>Edit</button>
                  <button className="member-btn danger" onClick={() => onDeleteDelegate(m.id)}>Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
        <span className="section-label female-label">FEMALE</span>
        {standard.filter(m => m.gender === 'Female').map(m => (
          <div key={m.id} className="member-card compact" draggable={!locked} onDragStart={() => !locked && onDragStart(m.id)}>
            <div className="member-info">
              <span className="member-name">{m.lastName}, {m.firstName} <span className="member-age">({m.age})</span></span>
              <span className={`status-tag ${m.paymentStatus.toLowerCase()}`}>{m.paymentStatus}</span>
            </div>
            {!locked && (
              <>
                <div className="member-quick-edit">
                  <span className="quick-label">Size:</span>
                  <MemberTShirtSelect member={m} onUpdate={onUpdateDelegate} showToast={showToast} />
                </div>
                <div className="member-actions">
                  <select
                    className="move-select"
                    onChange={async (e) => {
                      if (e.target.value) {
                        try { await moveDelegateToGroup(m.id, e.target.value); showToast('Moved to group', 'success') }
                        catch { showToast('Failed to move', 'error') }
                        e.target.value = ''
                      }
                    }}
                    defaultValue=""
                    aria-label={`Move ${m.firstName} to another group`}
                  >
                    <option value="" disabled>Move to...</option>
                    {groups.filter(gr => gr.id !== g.id).map(gr => (
                      <option key={gr.id} value={gr.id}>{gr.name}</option>
                    ))}
                  </select>
                  <button className="member-btn" onClick={() => setSelectedDelegate(m)}>Edit</button>
                  <button className="member-btn danger" onClick={() => onDeleteDelegate(m.id)}>Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
        {!locked && standard.length === 0 && (
          <div className="drop-zone-hint" aria-label="Drop zone">Drop delegates here</div>
        )}
      </div>
    </div>
  )
}

function AdminPage({
  unpaidDelegates,
  groups,
  unassignedPaidDelegates,
  adminChurchFilter,
  delegates,
  onSetAdminChurchFilter,
  onAutoGroup,
  onUndoAutoGroup,
  hasUndoAutoGroup,
  onClearAllGroups,
  onToggleGroupLock,
  onTogglePayment,
  onDropToGroup,
  onDragStart,
  onPrintIDs,
  onRenameGroup,
  onCreateLeadership,
  onAssignExistingLeadership,
  onRemoveLeadership,
  onDeleteDelegate,
  onUpdateDelegate,
  onGoToRegistration,
  showToast
}: AdminPageProps) {

  const [creationModal, setCreationModal] = useState<{ groupId: string; role: 'Leader' | 'Assistant Leader' } | null>(null)
  const [modalTab, setModalTab] = useState<'create' | 'existing'>('create')
  const [existingDelegateId, setExistingDelegateId] = useState<string>('')
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('unpaid')
  const [selectedDelegate, setSelectedDelegate] = useState<Delegate | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [lockedPanelCollapsed, setLockedPanelCollapsed] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', church: 'MIBC', age: '', gender: 'Male' as 'Male' | 'Female',
    birthday: '', category: 'Young Professional', tshirtSize: 'M' as TShirtSize
  })

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!creationModal) return
    onCreateLeadership({
      firstName: formData.firstName,
      lastName: formData.lastName,
      church: formData.church as ChurchId,
      age: 0,
      gender: formData.gender,
      birthday: '2000-01-01',
      category: 'Young Professional',
      tshirtSize: 'M',
      paymentStatus: 'UNPAID',
      paymentMethod: 'ONSITE',
      role: creationModal.role,
      createdAt: new Date().toISOString()
    }, creationModal.groupId)
    setCreationModal(null)
    setFormData({ firstName: '', lastName: '', church: 'MIBC', age: '', gender: 'Male', birthday: '', category: 'Young Professional', tshirtSize: 'M' })
  }

  const filterByChurch = (list: Delegate[]) => {
    if (adminChurchFilter === 'ALL') return list
    return list.filter(d => d.church === adminChurchFilter)
  }

  const sortByLastName = (list: Delegate[]) =>
    [...list].sort((a, b) => a.lastName.localeCompare(b.lastName))

  const visibleUnpaid = sortByLastName(filterByChurch(unpaidDelegates))
  const lateDelegates = sortByLastName(unassignedPaidDelegates.filter(d => d.createdAt >= '2026-05-05'))
  const regularUnassigned = sortByLastName(unassignedPaidDelegates.filter(d => d.createdAt < '2026-05-05'))
  const visibleLeaders = sortByLastName(filterByChurch(delegates.filter(d => d.role === 'Leader' || d.role === 'Assistant Leader')))

  const sortedGroups = [...groups].sort((a, b) => {
    const num = (name: string) => { const m = name.match(/\d+/); return m ? Number(m[0]) : Number.POSITIVE_INFINITY }
    return num(a.name) - num(b.name)
  })

  const lockedGroups = sortedGroups.filter(g => g.locked)
  const activeGroups = sortedGroups.filter(g => !g.locked)

  const getSlideOffset = () => {
    if (activeSidebarTab === 'unpaid') return '0%'
    if (activeSidebarTab === 'late') return '-100%'
    if (activeSidebarTab === 'unassigned') return '-200%'
    if (activeSidebarTab === 'leaders') return '-300%'
    return '0%'
  }

  const sharedGroupCardProps = (g: Group) => ({
    g,
    delegates,
    groups: sortedGroups,
    locked: !!g.locked,
    onToggleGroupLock,
    onRenameGroup,
    onDropToGroup,
    onDragStart,
    onPrintIDs,
    onTogglePayment,
    onRemoveLeadership,
    onDeleteDelegate,
    onUpdateDelegate,
    onAddLeader: (groupId: string, role: 'Leader' | 'Assistant Leader') => setCreationModal({ groupId, role }),
    setSelectedDelegate,
    showToast
  })

  return (
    <div className="admin-viewport">
      <header className="admin-topbar">
        <div className="admin-topbar-left">
          <h1 className="admin-topbar-title">Youth Camp 2026</h1>
          <span className="admin-topbar-sub">Admin Dashboard</span>
        </div>
        <div className="admin-topbar-right">
          <select
            value={adminChurchFilter}
            onChange={(e) => {
              const v = e.target.value
              onSetAdminChurchFilter(v === 'ALL' ? 'ALL' : (v as ChurchId))
            }}
            className="admin-church-filter"
            aria-label="Filter by church"
          >
            <option value="ALL">All Churches</option>
            {CHURCHES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {hasUndoAutoGroup && (
            <button className="admin-undo-btn" onClick={onUndoAutoGroup} aria-label="Undo last auto-group">Undo</button>
          )}
          <button
            className="admin-clear-btn"
            onClick={onClearAllGroups}
            aria-label="Clear all active group assignments"
          >
            Clear Active
          </button>
          <button className="admin-exit-btn" onClick={onGoToRegistration} aria-label="Exit to registration">Exit</button>
        </div>
      </header>

      <div className="admin-layout">
        <aside className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`} aria-label="Delegate panel">
          <button
            className={`sidebar-toggle-btn ${sidebarCollapsed ? 'collapsed' : ''}`}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? 'Show delegate panel' : 'Hide delegate panel'}
            aria-expanded={!sidebarCollapsed}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
          {!sidebarCollapsed && (
            <>
              <div className="sidebar-tabs" role="tablist">
                <button role="tab" aria-selected={activeSidebarTab === 'unpaid'} className={`sidebar-tab ${activeSidebarTab === 'unpaid' ? 'active' : ''}`} onClick={() => setActiveSidebarTab('unpaid')}>
                  Unpaid <span className="tab-badge danger">{visibleUnpaid.length}</span>
                </button>
                <button role="tab" aria-selected={activeSidebarTab === 'late'} className={`sidebar-tab ${activeSidebarTab === 'late' ? 'active' : ''}`} onClick={() => setActiveSidebarTab('late')}>
                  Late <span className="tab-badge warning">{lateDelegates.length}</span>
                </button>
                <button role="tab" aria-selected={activeSidebarTab === 'unassigned'} className={`sidebar-tab ${activeSidebarTab === 'unassigned' ? 'active' : ''}`} onClick={() => setActiveSidebarTab('unassigned')}>
                  Ungrouped <span className="tab-badge info">{regularUnassigned.length}</span>
                </button>
                <button role="tab" aria-selected={activeSidebarTab === 'leaders'} className={`sidebar-tab ${activeSidebarTab === 'leaders' ? 'active' : ''}`} onClick={() => setActiveSidebarTab('leaders')}>
                  Leaders <span className="tab-badge purple">{visibleLeaders.length}</span>
                </button>
              </div>

              <div className="sidebar-content">
                <div className="sidebar-slides" style={{ transform: `translateX(${getSlideOffset()})` }}>
                  <div className="sidebar-pane" role="tabpanel">
                    {visibleUnpaid.length > 0 ? visibleUnpaid.map(d => (
                      <div key={d.id} className="delegate-row" draggable onDragStart={() => onDragStart(d.id)}>
                        <div className="delegate-row-main">
                          <span className="delegate-row-name">{d.lastName}, {d.firstName}</span>
                          <span className="delegate-row-church">{getChurchName(d.church)}</span>
                        </div>
                        <div className="delegate-row-actions">
                          <button className="action-btn paid-btn" onClick={() => onTogglePayment(d.id, 'UNPAID')} aria-label="Mark as paid">PAID</button>
                          <button className="action-btn edit-btn" onClick={() => setSelectedDelegate(d)} aria-label="Edit">Edit</button>
                          <button className="action-btn delete-btn" onClick={() => onDeleteDelegate(d.id)} aria-label="Delete">X</button>
                        </div>
                      </div>
                    )) : <div className="empty-state">No unpaid delegates</div>}
                  </div>

                  <div className="sidebar-pane" role="tabpanel">
                    {lateDelegates.length > 0 ? lateDelegates.map(d => (
                      <div key={d.id} className="delegate-row" draggable onDragStart={() => onDragStart(d.id)}>
                        <div className="delegate-row-main">
                          <span className="delegate-row-name">{d.lastName}, {d.firstName}</span>
                          <span className="delegate-row-church">{getChurchName(d.church)}</span>
                        </div>
                        <div className="delegate-row-actions">
                          <button className="action-btn undo-btn" onClick={() => onTogglePayment(d.id, 'PAID')} aria-label="Undo payment">Undo</button>
                          <button className="action-btn delete-btn" onClick={() => onDeleteDelegate(d.id)} aria-label="Delete">X</button>
                        </div>
                      </div>
                    )) : <div className="empty-state">No late registrations</div>}
                  </div>

                  <div className="sidebar-pane" role="tabpanel">
                    {regularUnassigned.length > 0 ? regularUnassigned.map(d => (
                      <div key={d.id} className="delegate-row" draggable onDragStart={() => onDragStart(d.id)}>
                        <div className="delegate-row-main">
                          <span className="delegate-row-name">{d.lastName}, {d.firstName}</span>
                          <span className="delegate-row-church">{getChurchName(d.church)}</span>
                        </div>
                        <div className="delegate-row-actions">
                          <button className="action-btn undo-btn" onClick={() => onTogglePayment(d.id, 'PAID')} aria-label="Undo payment">Undo</button>
                          <button className="action-btn delete-btn" onClick={() => onDeleteDelegate(d.id)} aria-label="Delete">X</button>
                        </div>
                      </div>
                    )) : <div className="empty-state">All paid delegates grouped</div>}
                  </div>

                  <div className="sidebar-pane" role="tabpanel">
                    {visibleLeaders.length > 0 ? visibleLeaders.map(d => (
                      <div key={d.id} className="delegate-row leader-row">
                        <div className="delegate-row-main">
                          <span className="delegate-row-name">{d.lastName}, {d.firstName}</span>
                          <span className="delegate-row-church">{getChurchName(d.church)}</span>
                          <span className={`role-tag ${d.role?.toLowerCase().replace(' ', '-')}`}>{d.role}</span>
                        </div>
                        <div className="delegate-row-actions">
                          <button
                            className={`action-btn ${d.paymentStatus === 'PAID' ? 'paid-btn' : 'unpaid-btn'}`}
                            onClick={() => onTogglePayment(d.id, d.paymentStatus)}
                            aria-label={`Payment: ${d.paymentStatus}`}
                          >
                            {d.paymentStatus}
                          </button>
                          <button className="action-btn edit-btn" onClick={() => setSelectedDelegate(d)} aria-label="Edit">Edit</button>
                          <button className="action-btn delete-btn" onClick={() => onDeleteDelegate(d.id)} aria-label="Delete">X</button>
                        </div>
                      </div>
                    )) : <div className="empty-state">No leaders registered</div>}
                  </div>
                </div>
              </div>
            </>
          )}
        </aside>

        <main className="admin-main" onDragOver={e => e.preventDefault()} onDrop={() => {}}>

          {lockedGroups.length > 0 && (
            <section className="groups-section locked-section" aria-label="Locked groups">
              <button
                className="groups-section-header locked-section-header"
                onClick={() => setLockedPanelCollapsed(!lockedPanelCollapsed)}
                aria-expanded={!lockedPanelCollapsed}
                aria-controls="locked-groups-panel"
              >
                <div className="groups-section-title-row">
                  <span className="groups-section-icon locked-icon" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                    </svg>
                  </span>
                  <span className="groups-section-title">Locked Groups</span>
                  <span className="groups-section-count locked-count">{lockedGroups.length}</span>
                  <span className="groups-section-hint">Frozen — not affected by Auto Group or Clear Active</span>
                </div>
                <span className="section-collapse-chevron" aria-hidden="true">{lockedPanelCollapsed ? '▼' : '▲'}</span>
              </button>
              {!lockedPanelCollapsed && (
                <div id="locked-groups-panel" className="groups-grid locked-grid">
                  {lockedGroups.map(g => <GroupCard key={g.id} {...sharedGroupCardProps(g)} />)}
                </div>
              )}
            </section>
          )}

          <section className="groups-section active-section" aria-label="Active groups">
            <div className="groups-section-header active-section-header">
              <div className="groups-section-title-row">
                <span className="groups-section-icon active-icon" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
                  </svg>
                </span>
                <span className="groups-section-title">Active Groups</span>
                <span className="groups-section-count active-count">{activeGroups.length}</span>
                <span className="groups-section-hint">Auto Group and Clear Active only apply here</span>
              </div>
            </div>
            <div className="groups-grid active-grid">
              {activeGroups.map(g => <GroupCard key={g.id} {...sharedGroupCardProps(g)} />)}
              {activeGroups.length === 0 && (
                <div className="empty-groups-hint">
                  No active groups yet. Press <strong>Auto Group</strong> to distribute remaining delegates.
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      <button
        className="fab-auto-group"
        onClick={onAutoGroup}
        aria-label="Auto group remaining delegates"
        title="Auto Group"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M16.24 7.76C15.07 6.59 13.54 6 12 6v6l-4.24 4.24c2.34 2.34 6.14 2.34 8.49 0 2.34-2.34 2.34-6.14-.01-8.48zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
        </svg>
        <span>Auto Group</span>
      </button>

      {creationModal && (
        <div className="modal-overlay" onClick={() => setCreationModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Add ${creationModal.role}`}>
            <h2 className="modal-title">{creationModal.role}</h2>
            <div className="modal-tabs">
              <button className={`modal-tab-btn ${modalTab === 'create' ? 'active' : ''}`} onClick={() => setModalTab('create')}>New</button>
              <button className={`modal-tab-btn ${modalTab === 'existing' ? 'active' : ''}`} onClick={() => setModalTab('existing')}>Existing</button>
            </div>

            {modalTab === 'create' ? (
              <form onSubmit={handleCreateSubmit} className="modal-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    <input required value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input required value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Church</label>
                    <select value={formData.church} onChange={e => setFormData({ ...formData, church: e.target.value })}>
                      {CHURCHES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Gender</label>
                    <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value as 'Male' | 'Female' })}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="modal-cancel" onClick={() => setCreationModal(null)}>Cancel</button>
                  <button type="submit" className="modal-submit">Create</button>
                </div>
              </form>
            ) : (
              <div className="modal-form">
                <div className="form-group">
                  <label>Select Delegate</label>
                  <select value={existingDelegateId} onChange={e => setExistingDelegateId(e.target.value)}>
                    <option value="">-- Choose --</option>
                    {visibleLeaders.map(d => (
                      <option key={d.id} value={d.id}>{d.lastName}, {d.firstName} ({d.role})</option>
                    ))}
                  </select>
                </div>
                <div className="modal-footer">
                  <button type="button" className="modal-cancel" onClick={() => setCreationModal(null)}>Cancel</button>
                  <button
                    type="button"
                    className="modal-submit"
                    disabled={!existingDelegateId}
                    onClick={() => {
                      onAssignExistingLeadership(existingDelegateId, creationModal.groupId, creationModal.role)
                      setCreationModal(null)
                      setExistingDelegateId('')
                    }}
                  >
                    Assign
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedDelegate && (
        <div className="modal-overlay" onClick={() => setSelectedDelegate(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Edit delegate">
            <div className="modal-header">
              <h2 className="modal-title">Edit Delegate</h2>
              <button className="modal-close" onClick={() => setSelectedDelegate(null)} aria-label="Close">X</button>
            </div>
            <form className="modal-form" onSubmit={async (e) => {
              e.preventDefault()
              const form = e.target as HTMLFormElement
              const updates = {
                firstName: (form.elements.namedItem('firstName') as HTMLInputElement).value,
                lastName: (form.elements.namedItem('lastName') as HTMLInputElement).value,
                age: Number((form.elements.namedItem('age') as HTMLInputElement).value),
                tshirtSize: (form.elements.namedItem('tshirtSize') as HTMLSelectElement).value as TShirtSize,
                category: (form.elements.namedItem('category') as HTMLSelectElement).value as Delegate['category'],
                gender: (form.elements.namedItem('gender') as HTMLSelectElement).value as 'Male' | 'Female',
              }
              try {
                await onUpdateDelegate(selectedDelegate.id, updates)
                setSelectedDelegate(null)
                showToast('Delegate updated', 'success')
              } catch {
                showToast('Update failed', 'error')
              }
            }}>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input name="firstName" defaultValue={selectedDelegate.firstName} required />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input name="lastName" defaultValue={selectedDelegate.lastName} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Age</label>
                  <input name="age" type="number" defaultValue={selectedDelegate.age} required />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select name="gender" defaultValue={selectedDelegate.gender}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>T-Shirt Size</label>
                  <select name="tshirtSize" defaultValue={selectedDelegate.tshirtSize}>
                    <option value="10">10</option><option value="12">12</option><option value="14">14</option>
                    <option value="16">16</option><option value="18">18</option><option value="20">20</option>
                    <option value="XS">XS</option><option value="S">S</option><option value="M">M</option>
                    <option value="L">L</option><option value="XL">XL</option><option value="XXL">XXL</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select name="category" defaultValue={selectedDelegate.category}>
                    <option>High School (JHS)</option><option>High School (SHS)</option>
                    <option>College</option><option>Young Professional</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-cancel" onClick={() => setSelectedDelegate(null)}>Close</button>
                <button type="submit" className="modal-submit">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPage

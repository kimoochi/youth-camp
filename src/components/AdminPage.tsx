import { useState, type FormEvent } from 'react'
import { CHURCHES, getChurchName } from '../types'
import type { ChurchId, Delegate, Group } from '../types'
import { generateGroupListPDF } from '../utils/pdfGenerator'

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
  onTogglePayment: (id: string, currentStatus: 'PAID'|'UNPAID') => void
  onDropToLate: () => void
  onDropToGroup: (groupId: string) => void
  onDragStart: (id: string) => void
  onPrintIDs: (groupId?: string) => void
  onRenameGroup: (id: string, name: string) => void
  onCreateLeadership: (data: Omit<Delegate, 'id'>, groupId: string) => void
  onAssignExistingLeadership: (delegateId: string, groupId: string, role: 'Leader'|'Assistant Leader') => void
  onRemoveLeadership: (delegateId: string) => void
  onDeleteDelegate: (id: string) => void
  onGoToRegistration: () => void
  showToast: (message: string, type: 'success'|'error'|'info') => void
}

type SidebarTab = 'unpaid' | 'late' | 'unassigned';

function AdminPage({
  unpaidDelegates,
  groups,
  unassignedPaidDelegates,
  adminChurchFilter,
  delegates,
  onSetAdminChurchFilter,
  onAutoGroup,
  onTogglePayment,
  onDropToLate,
  onDropToGroup,
  onDragStart,
  onPrintIDs,
  onRenameGroup,
  onCreateLeadership,
  onAssignExistingLeadership,
  onRemoveLeadership,
  onDeleteDelegate,
  onGoToRegistration
}: AdminPageProps) {
  
  const [creationModal, setCreationModal] = useState<{groupId: string, role: 'Leader'|'Assistant Leader'} | null>(null);
  const [modalTab, setModalTab] = useState<'create' | 'existing'>('create');
  const [existingDelegateId, setExistingDelegateId] = useState<string>('');
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('unpaid');
  const [formData, setFormData] = useState({ firstName: '', lastName: '', church: 'MIBC', age: '', gender: 'Male', birthday: '', category: 'Young Professional', tshirtSize: 'M' });

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!creationModal) return;
    onCreateLeadership({
      firstName: formData.firstName,
      lastName: formData.lastName,
      church: formData.church as ChurchId,
      age: 0,
      gender: formData.gender as "Male" | "Female",
      birthday: '2000-01-01',
      category: 'Young Professional',
      tshirtSize: 'M',
      paymentStatus: 'UNPAID',
      paymentMethod: 'ONSITE',
      role: creationModal.role,
      createdAt: new Date().toISOString()
    }, creationModal.groupId);
    setCreationModal(null);
    setFormData({ firstName: '', lastName: '', church: 'MIBC', age: '', gender: 'Male', birthday: '', category: 'Young Professional', tshirtSize: 'M' });
  }

  const filterByChurch = (list: Delegate[]) => {
    if (adminChurchFilter === 'ALL') return list
    return list.filter(d => d.church === adminChurchFilter)
  }

  const visibleUnpaid = filterByChurch(unpaidDelegates)
  
  // Late vs Unassigned Logic
  const lateDelegates = unassignedPaidDelegates.filter(d => d.createdAt >= '2026-05-05')
  const regularUnassigned = unassignedPaidDelegates.filter(d => d.createdAt < '2026-05-05')

  const sortedGroups = [...groups].sort((a, b) => {
    const num = (name: string) => {
      const m = name.match(/\d+/)
      return m ? Number(m[0]) : Number.POSITIVE_INFINITY
    }
    return num(a.name) - num(b.name)
  })

  const getSlideOffset = () => {
    if (activeSidebarTab === 'unpaid') return '0%';
    if (activeSidebarTab === 'late') return '-100%';
    if (activeSidebarTab === 'unassigned') return '-200%';
    return '0%';
  };

  return (
    <div className="dashboard-fixed-viewport">
      <header className="topbar">
        <div>
          <div className="camp-title">Youth Camp 2026</div>
          <div className="camp-subtitle">Admin Dashboard</div>
        </div>
        <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
           <select
             value={adminChurchFilter}
             onChange={(e) => {
               const v = e.target.value
               onSetAdminChurchFilter(v === 'ALL' ? 'ALL' : (v as ChurchId))
             }}
             style={{padding:'0.4rem', fontSize:'0.8rem', borderRadius:'4px'}}
           >
             <option value="ALL">All Churches</option>
             {CHURCHES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
           </select>
           <button className="primary small" onClick={onAutoGroup}>Auto Group</button>
           <button className="topbar-button" onClick={onGoToRegistration}>Exit</button>
        </div>
      </header>

      <div className="dashboard-container">
        {/* Sidebar */}
        <aside className="dashboard-sidebar" style={{display:'flex', flexDirection:'column'}}>
           <div className="sidebar-tabs">
              <button 
                className={`sidebar-tab ${activeSidebarTab === 'unpaid' ? 'active' : ''}`}
                onClick={() => setActiveSidebarTab('unpaid')}
              >
                Unpaid ({visibleUnpaid.length})
              </button>
              <button 
                className={`sidebar-tab ${activeSidebarTab === 'late' ? 'active' : ''}`}
                onClick={() => setActiveSidebarTab('late')}
              >
                Late ({lateDelegates.length})
              </button>
              <button 
                className={`sidebar-tab ${activeSidebarTab === 'unassigned' ? 'active' : ''}`}
                onClick={() => setActiveSidebarTab('unassigned')}
              >
                Ungrouped ({regularUnassigned.length})
              </button>
           </div>

           <div className="sidebar-content-wrapper">
              <div className="sidebar-slide-container" style={{ transform: `translateX(${getSlideOffset()})` }}>
                 
                 {/* PANE: UNPAID */}
                 <div className="sidebar-pane" onDragOver={e=>e.preventDefault()} onDrop={onDropToLate}>
                   <div className="delegate-list">
                     {visibleUnpaid.map(d => (
                       <div key={d.id} className="delegate-card" draggable onDragStart={() => onDragStart(d.id)}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                            <div style={{flex:1}}>
                              <div className="delegate-name">{d.lastName}, {d.firstName}</div>
                              <div className="delegate-meta">{getChurchName(d.church)}</div>
                            </div>
                            <button className="delete-btn" onClick={(e) => { e.stopPropagation(); onDeleteDelegate(d.id); }}>✕</button>
                          </div>
                          <button className="primary small" style={{marginTop:'0.5rem', width:'100%', fontSize:'0.65rem'}} onClick={() => onTogglePayment(d.id, 'UNPAID')}>
                            Mark as PAID
                          </button>
                       </div>
                     ))}
                     {visibleUnpaid.length === 0 && <p style={{textAlign:'center', padding:'2rem', color:'#999', fontSize:'0.8rem'}}>No unpaid delegates.</p>}
                   </div>
                 </div>

                 {/* PANE: LATE */}
                 <div className="sidebar-pane" onDragOver={e=>e.preventDefault()} onDrop={onDropToLate}>
                   <div className="delegate-list">
                     {lateDelegates.map(d => (
                       <div key={d.id} className="delegate-card" draggable onDragStart={() => onDragStart(d.id)}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                            <div style={{flex:1}}>
                              <div className="delegate-name">{d.lastName}, {d.firstName}</div>
                              <div className="delegate-meta">{getChurchName(d.church)}</div>
                            </div>
                            <button className="delete-btn" onClick={(e) => { e.stopPropagation(); onDeleteDelegate(d.id); }}>✕</button>
                          </div>
                          <button className="ghost small" style={{marginTop:'0.4rem', width:'100%', fontSize:'0.6rem'}} onClick={()=>onTogglePayment(d.id, 'PAID')}>Undo</button>
                       </div>
                     ))}
                     {lateDelegates.length === 0 && <p style={{textAlign:'center', padding:'2rem', color:'#999', fontSize:'0.8rem'}}>No late registrations.</p>}
                   </div>
                 </div>

                 {/* PANE: UNASSIGNED */}
                 <div className="sidebar-pane" onDragOver={e=>e.preventDefault()} onDrop={onDropToLate}>
                   <div className="delegate-list">
                     {regularUnassigned.map(d => (
                       <div key={d.id} className="delegate-card" draggable onDragStart={() => onDragStart(d.id)}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                            <div style={{flex:1}}>
                              <div className="delegate-name">{d.lastName}, {d.firstName}</div>
                              <div className="delegate-meta">{getChurchName(d.church)}</div>
                            </div>
                            <button className="delete-btn" onClick={(e) => { e.stopPropagation(); onDeleteDelegate(d.id); }}>✕</button>
                          </div>
                          <button className="ghost small" style={{marginTop:'0.4rem', width:'100%', fontSize:'0.6rem'}} onClick={()=>onTogglePayment(d.id, 'PAID')}>Undo</button>
                       </div>
                     ))}
                     {regularUnassigned.length === 0 && <p style={{textAlign:'center', padding:'2rem', color:'#999', fontSize:'0.8rem'}}>All regular delegates are assigned.</p>}
                   </div>
                 </div>

              </div>
           </div>
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
           {creationModal && (
             <div className="modal-overlay">
               <div className="modal-card">
                 <h2 style={{fontSize:'1.2rem', marginBottom:'1rem'}}>{creationModal.role}</h2>
                 <div style={{display:'flex', gap:'1rem', marginBottom:'1rem', borderBottom:'1px solid #eee', paddingBottom:'0.5rem'}}>
                    <button className={`ghost small ${modalTab==='create'?'primary':''}`} onClick={()=>setModalTab('create')}>New</button>
                    <button className={`ghost small ${modalTab==='existing'?'primary':''}`} onClick={()=>setModalTab('existing')}>Existing</button>
                 </div>
                 
                 {modalTab === 'create' ? (
                   <form onSubmit={handleCreateSubmit} className="form-grid-compact">
                      <div className="field-group half"><label>First</label><input required value={formData.firstName} onChange={e=>setFormData({...formData, firstName: e.target.value})} /></div>
                      <div className="field-group half"><label>Last</label><input required value={formData.lastName} onChange={e=>setFormData({...formData, lastName: e.target.value})} /></div>
                      <div className="field-group half"><label>Church</label><select value={formData.church} onChange={e=>setFormData({...formData, church: e.target.value})}>{CHURCHES.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                      <div className="field-group half"><label>Gender</label><select value={formData.gender} onChange={e=>setFormData({...formData, gender: e.target.value})}><option>Male</option><option>Female</option></select></div>
                      <div style={{gridColumn:'span 2', display:'flex', gap:'1rem', marginTop:'1rem'}}><button type="button" className="ghost large" onClick={()=>setCreationModal(null)}>Cancel</button><button type="submit" className="primary large">Create</button></div>
                   </form>
                 ) : (
                   <div>
                      <div className="field-group"><label>Select Delegate</label><select value={existingDelegateId} onChange={e=>setExistingDelegateId(e.target.value)}><option value="">-- Choose --</option>{delegates.filter(d=>d.role!=='Leader' && d.role!=='Assistant Leader').map(d=><option key={d.id} value={d.id}>{d.lastName}, {d.firstName}</option>)}</select></div>
                      <div style={{display:'flex', gap:'1rem', marginTop:'1.5rem'}}><button type="button" className="ghost large" onClick={()=>setCreationModal(null)}>Cancel</button><button type="button" className="primary large" disabled={!existingDelegateId} onClick={()=>{onAssignExistingLeadership(existingDelegateId, creationModal.groupId, creationModal.role); setCreationModal(null); setExistingDelegateId('');}}>Assign</button></div>
                   </div>
                 )}
               </div>
             </div>
           )}

           <div className="groups-grid">
              {sortedGroups.map(g => {
                const members = g.delegateIds.map(id => delegates.find(d => d.id === id)).filter((d): d is Delegate => !!d)
                const leader = members.find(m => m.role === 'Leader')
                const assistants = members.filter(m => m.role === 'Assistant Leader')
                const standard = members.filter(m => m.role !== 'Leader' && m.role !== 'Assistant Leader')

                return (
                  <div key={g.id} className="group-card shadow-sm" onDragOver={e=>e.preventDefault()} onDrop={()=>onDropToGroup(g.id)} style={{background:'white', padding:'0.75rem'}}>
                    <div className="group-header" style={{borderBottom:'1px solid #eee', paddingBottom:'0.25rem', marginBottom:'0.5rem'}}>
                      <input value={g.name} onChange={e=>onRenameGroup(g.id, e.target.value)} className="group-name-input" />
                      <span className="badge black">{members.length}</span>
                    </div>
                    
                    <div style={{display:'flex', gap:'0.25rem', marginBottom:'0.5rem'}}>
                      <button className="ghost small" style={{flex:1, fontSize:'0.6rem'}} onClick={()=>generateGroupListPDF(g, delegates)}>PDF</button>
                      <button className="primary small" style={{flex:1, fontSize:'0.6rem'}} onClick={()=>onPrintIDs(g.id)}>IDs</button>
                    </div>

                    <div style={{background:'#f9fafb', border:'1px dashed #ddd', padding:'0.4rem', borderRadius:'6px', marginBottom:'0.5rem'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <span style={{fontSize:'0.6rem', fontWeight:'900', color:'#ea580c'}}>LEADER</span>
                        {!leader && <button className="ghost small" style={{fontSize:'0.6rem', border:'none', padding:0}} onClick={()=>setCreationModal({groupId:g.id, role:'Leader'})}>+ ADD</button>}
                      </div>
                      {leader && (
                        <div className="delegate-card compact" style={{borderLeft:`4px solid ${leader.paymentStatus === 'PAID' ? '#16a34a' : '#ea580c'}`, margin:'0.2rem 0', padding:'0.3rem'}}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <div style={{fontSize:'0.75rem', fontWeight:'600'}}>
                              {leader.lastName}, {leader.firstName}
                              {leader.paymentStatus === 'PAID' && <span style={{marginLeft:'4px', color:'#16a34a', fontSize:'0.6rem'}}>● PAID</span>}
                            </div>
                            <div style={{display:'flex', gap:'2px'}}>
                              <button className="delete-btn" title="Delete Entirely" onClick={()=>onDeleteDelegate(leader.id)}>✕</button>
                            </div>
                          </div>
                          <div style={{display:'flex', gap:'0.25rem', marginTop:'0.2rem'}}>
                             <button className="ghost small" style={{fontSize:'0.5rem', padding:'1px 4px', border:'1px solid #ddd'}} onClick={()=>onTogglePayment(leader.id, leader.paymentStatus)}>
                               {leader.paymentStatus === 'PAID' ? 'Mark Unpaid' : 'Mark PAID'}
                             </button>
                             <button className="ghost small" style={{fontSize:'0.5rem', padding:'1px 4px', border:'1px solid #ddd', color:'#ef4444'}} onClick={()=>onRemoveLeadership(leader.id)}>Demote</button>
                          </div>
                        </div>
                      )}

                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'0.5rem'}}>
                        <span style={{fontSize:'0.6rem', fontWeight:'900', color:'#f59e0b'}}>ASST</span>
                        <button className="ghost small" style={{fontSize:'0.6rem', border:'none', padding:0}} onClick={()=>setCreationModal({groupId:g.id, role:'Assistant Leader'})}>+ ADD</button>
                      </div>
                      {assistants.map(a => (
                        <div key={a.id} className="delegate-card compact" style={{borderLeft:`4px solid ${a.paymentStatus === 'PAID' ? '#16a34a' : '#f59e0b'}`, margin:'0.2rem 0', padding:'0.3rem'}}>
                           <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <div style={{fontSize:'0.75rem', fontWeight:'600'}}>
                              {a.lastName}, {a.firstName}
                              {a.paymentStatus === 'PAID' && <span style={{marginLeft:'4px', color:'#16a34a', fontSize:'0.6rem'}}>● PAID</span>}
                            </div>
                            <button className="delete-btn" onClick={()=>onDeleteDelegate(a.id)}>✕</button>
                          </div>
                          <div style={{display:'flex', gap:'0.25rem', marginTop:'0.2rem'}}>
                             <button className="ghost small" style={{fontSize:'0.5rem', padding:'1px 4px', border:'1px solid #ddd'}} onClick={()=>onTogglePayment(a.id, a.paymentStatus)}>
                               {a.paymentStatus === 'PAID' ? 'Mark Unpaid' : 'Mark PAID'}
                             </button>
                             <button className="ghost small" style={{fontSize:'0.5rem', padding:'1px 4px', border:'1px solid #ddd', color:'#ef4444'}} onClick={()=>onRemoveLeadership(a.id)}>Demote</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{fontSize:'0.6rem', fontWeight:'800', color:'#999', marginBottom:'0.2rem'}}>MEMBERS</div>
                    <div className="delegate-list" style={{gap:'0.2rem'}}>
                      {standard.map(m => (
                        <div key={m.id} className="delegate-card" draggable onDragStart={()=>onDragStart(m.id)} style={{margin:0, padding:'0.3rem 0.5rem'}}>
                           <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                             <span style={{fontSize:'0.7rem'}}>{m.lastName}, {m.firstName}</span>
                             <button className="delete-btn" onClick={()=>onDeleteDelegate(m.id)}>✕</button>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
           </div>
        </main>
      </div>
    </div>
  )
}

export default AdminPage
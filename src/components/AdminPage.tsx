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
  onGoToRegistration: () => void
  showToast: (msg: string, type: 'success'|'error'|'info') => void // Added this
}

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
  onGoToRegistration
}: AdminPageProps) {

  const filterByChurch = (list: Delegate[]) => {
    if (adminChurchFilter === 'ALL') return list
    return list.filter(d => d.church === adminChurchFilter)
  }

  const visibleUnpaid = filterByChurch(unpaidDelegates)
  const sortedGroups = [...groups].sort((a, b) => {
    const num = (name: string) => {
      const m = name.match(/\d+/)
      return m ? Number(m[0]) : Number.POSITIVE_INFINITY
    }
    return num(a.name) - num(b.name)
  })

  return (
    <div className="page" style={{minHeight:'100vh'}}>
      <header className="topbar">
        <div>
          <div className="camp-title">Youth Camp 2026</div>
          <div className="camp-subtitle">Admin Dashboard</div>
        </div>
        <button className="topbar-button" onClick={onGoToRegistration}>Back to Registration</button>
      </header>

      <main className="content">
        
        {/* Controls */}
        <section className="card">
          <div style={{display:'flex', gap:'1.5rem', flexWrap:'wrap', alignItems:'end'}}>
             <div className="field-group">
               <label>Filter View</label>
               <select
                 value={adminChurchFilter}
                 onChange={(e) => {
                   const v = e.target.value
                   onSetAdminChurchFilter(v === 'ALL' ? 'ALL' : (v as ChurchId))
                 }}
               >
                 <option value="ALL">All Churches</option>
                 {CHURCHES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
             </div>
             
             <div className="actions" style={{margin:0}}>
               <button className="primary" onClick={onAutoGroup}>Auto Group (Fixed 4)</button>
             </div>
          </div>
        </section>

        {/* 3-Column Layout */}
        <div className="admin-dashboard-grid">
           
           {/* COL 1: UNPAID */}
           <section className="card" style={{padding:'1rem'}}>
             <h3 style={{marginBottom:'1rem', color:'#dc2626'}}>Unpaid ({visibleUnpaid.length})</h3>
             <div className="table-wrapper" style={{maxHeight:'600px', overflowY:'auto'}}>
               {visibleUnpaid.map(d => (
                 <div key={d.id} className="delegate-card" style={{marginBottom:'0.5rem', display:'block'}}>
                    <div style={{fontWeight:'800'}}>{d.lastName}, {d.firstName}</div>
                    <div style={{fontSize:'0.75rem', color:'#6b7280'}}>{getChurchName(d.church)}</div>
                    <button className="primary small" style={{marginTop:'0.5rem', width:'100%'}} onClick={() => onTogglePayment(d.id, 'UNPAID')}>
                      Mark as PAID
                    </button>
                 </div>
               ))}
               {visibleUnpaid.length === 0 && <p style={{fontSize:'0.8rem', color:'#9ca3af', textAlign:'center'}}>No unpaid delegates.</p>}
             </div>
           </section>

           {/* COL 2: PAID / UNASSIGNED (LATE) */}
           <section className="card" style={{padding:'1rem'}} onDragOver={e=>e.preventDefault()} onDrop={onDropToLate}>
              <h3 style={{marginBottom:'1rem', color:'#d97706'}}>Late / Unassigned ({unassignedPaidDelegates.length})</h3>
              <p className="helper-text" style={{fontSize:'0.75rem', marginBottom:'1rem'}}>Paid delegates not in any group.</p>
              
              <div className="delegate-list" style={{maxHeight:'600px', overflowY:'auto'}}>
                {unassignedPaidDelegates.map(d => (
                  <div key={d.id} className="delegate-card" draggable onDragStart={()=>onDragStart(d.id)}>
                    <div>
                      <div className="delegate-name">{d.lastName}, {d.firstName}</div>
                      <div className="delegate-meta">{getChurchName(d.church)} • {d.age}yo</div>
                    </div>
                    <button className="ghost small" onClick={()=>onTogglePayment(d.id, 'PAID')}>Undo</button>
                  </div>
                ))}
                {unassignedPaidDelegates.length === 0 && <p style={{fontSize:'0.8rem', color:'#9ca3af', textAlign:'center'}}>All paid delegates are grouped.</p>}
              </div>
           </section>

           {/* COL 3: GROUPS */}
           <section className="card" style={{padding:'1rem', background:'#f3f4f6', border:'none'}}>
              <h3 style={{marginBottom:'1rem', color:'#000'}}>Groups</h3>
              <div className="groups-grid">
                {sortedGroups.map(g => {
                   const members = g.delegateIds.map(id => delegates.find(d => d.id === id)).filter((d): d is Delegate => !!d)
                   return (
                     <div key={g.id} className="group-card" onDragOver={e=>e.preventDefault()} onDrop={()=>onDropToGroup(g.id)} style={{background:'white'}}>
                        <div className="group-header">
                          <input value={g.name} onChange={e=>onRenameGroup(g.id, e.target.value)} className="group-name-input" />
                          <span className="badge" style={{background:'var(--black)', color:'white'}}>{members.length}</span>
                        </div>
                        
                        {/* Group Actions */}
                        <div style={{display:'flex', gap:'0.5rem', marginBottom:'1rem'}}>
                           <button className="ghost small" style={{flex:1}} onClick={() => generateGroupListPDF(g, delegates)}>Download List</button>
                           <button className="primary small" style={{flex:1}} onClick={() => onPrintIDs(g.id)}>Print IDs</button>
                        </div>

                        <ul className="delegate-list compact">
                          {members.map(m => (
                            <li key={m.id} className="delegate-card" draggable onDragStart={()=>onDragStart(m.id)}>
                               <span className="delegate-name">{m.lastName}, {m.firstName}</span>
                            </li>
                          ))}
                        </ul>
                     </div>
                   )
                })}
              </div>
           </section>
        </div>

      </main>
    </div>
  )
}

export default AdminPage
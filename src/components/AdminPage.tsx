import { CHURCHES } from '../types'
import type { ChurchId, Delegate, Group } from '../types'

interface AdminPageProps {
  delegates: Delegate[]
  adminDelegates: Delegate[]
  lateDelegates: Delegate[]
  groupsForAdminChurch: Group[]
  adminChurchFilter: ChurchId | 'ALL'
  adminChurch: ChurchId | null
  groupCount: number
  onSetAdminChurchFilter: (value: ChurchId | 'ALL') => void
  onSetGroupCount: (value: number) => void
  onGenerateGroups: () => void
  onDropToLate: () => void
  onDropToGroup: (groupId: string) => void
  onDragStart: (delegateId: string) => void
  onDownloadMembersPdf: () => void
  onDownloadGroupPdf: (groupId: string) => void
  onRenameGroup: (groupId: string, name: string) => void
  onGoToRegistration: () => void
}

function AdminPage({
  delegates,
  adminDelegates,
  lateDelegates,
  groupsForAdminChurch,
  adminChurchFilter,
  adminChurch,
  groupCount,
  onSetAdminChurchFilter,
  onSetGroupCount,
  onGenerateGroups,
  onDropToLate,
  onDropToGroup,
  onDragStart,
  onDownloadMembersPdf,
  onDownloadGroupPdf,
  onRenameGroup,
  onGoToRegistration,
}: AdminPageProps) {
  return (
    <div className="page">
      <header className="topbar">
        <div>
          <div className="camp-title">Youth Camp 2026</div>
          <div className="camp-subtitle">Admin Dashboard</div>
        </div>
        <button className="topbar-button" onClick={onGoToRegistration}>
          Registration
        </button>
      </header>

      <main className="content">
        <section className="card">
          <div className="admin-controls">
            <div className="admin-row">
              <label>
                Church view (for table only)
                <select
                  value={adminChurchFilter}
                  onChange={(e) =>
                    onSetAdminChurchFilter(e.target.value === 'ALL' ? 'ALL' : (e.target.value as ChurchId))
                  }
                >
                  <option value="ALL">All churches</option>
                  {CHURCHES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Number of groups (max 4)
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={groupCount}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    if (!Number.isNaN(n) && n >= 1 && n <= 4) onSetGroupCount(n)
                  }}
                />
              </label>
              <button className="primary" onClick={onGenerateGroups} disabled={!delegates.length}>
                Auto-group by age (all churches)
              </button>
            </div>
            <p className="helper">
              Auto-grouping distributes delegates by age as evenly as possible across groups for the selected church.
            </p>
          </div>
        </section>

        <section className="layout-columns">
          <section
            className="card column"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDropToLate}
          >
            <h2>Late delegates / unassigned</h2>
            <p className="helper">
              These delegates do not belong to any group yet. Drag them into a group on the right.
            </p>
            {lateDelegates.length === 0 ? (
              <p className="empty">No late or unassigned delegates.</p>
            ) : (
              <ul className="delegate-list">
                {lateDelegates.map((d) => (
                  <li
                    key={d.id}
                    className="delegate-card"
                    draggable
                    onDragStart={() => onDragStart(d.id)}
                  >
                    <div className="delegate-main">
                      <span className="delegate-name">
                        {d.lastName}, {d.firstName}
                      </span>
                      <span className="delegate-meta">
                        {d.age} yrs • {d.category} • {d.church}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card column">
            <h2>Groups (all churches)</h2>
            {groupsForAdminChurch.length === 0 ? (
              <p className="empty">No groups yet. Choose a church and click &quot;Auto-group by age&quot;.</p>
            ) : (
              <div className="groups-grid">
                {groupsForAdminChurch.map((g) => {
                  const members = g.delegateIds
                    .map((id) => delegates.find((d) => d.id === id))
                    .filter((d): d is Delegate => Boolean(d))

                  return (
                    <div
                      key={g.id}
                      className="group-card"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => onDropToGroup(g.id)}
                    >
                      <div className="group-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1 }}>
                          <input
                            className="group-name-input"
                            value={g.name}
                            onChange={(e) => onRenameGroup(g.id, e.target.value)}
                          />
                          <span className="badge">{members.length}</span>
                        </div>
                        <button
                          type="button"
                          className="ghost small"
                          onClick={() => onDownloadGroupPdf(g.id)}
                          disabled={!members.length}
                        >
                          PDF
                        </button>
                      </div>
                      {members.length === 0 ? (
                        <p className="empty small">Drag delegates here.</p>
                      ) : (
                        <ul className="delegate-list compact">
                          {members.map((d) => (
                            <li
                              key={d.id}
                              className="delegate-card"
                              draggable
                              onDragStart={() => onDragStart(d.id)}
                            >
                              <div className="delegate-main">
                                <span className="delegate-name">
                                  {d.lastName}, {d.firstName}
                                </span>
                                <span className="delegate-meta">
                                  {d.age} yrs • {d.category}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </section>

        <section className="card">
          <h2>Delegates overview</h2>
          <p className="helper">
            Showing {adminDelegates.length} delegates
            {adminChurch ? ` from ${adminChurch}` : ' from all churches'}.
          </p>
          <div className="actions">
            <button
              type="button"
              className="ghost"
              onClick={onDownloadMembersPdf}
              disabled={!delegates.length}
            >
              Download members list (PDF)
            </button>
          </div>
          {adminDelegates.length === 0 ? (
            <p className="empty">No delegates registered yet.</p>
          ) : (
            <>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Church</th>
                      <th>Last name</th>
                      <th>First name</th>
                      <th>Age</th>
                      <th>Birthday</th>
                      <th>Category</th>
                      <th>T-shirt size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminDelegates.map((d) => (
                      <tr key={d.id}>
                        <td>{d.church}</td>
                        <td>{d.lastName}</td>
                        <td>{d.firstName}</td>
                        <td>{d.age}</td>
                        <td>{d.birthday}</td>
                        <td>{d.category}</td>
                        <td>{(d as Delegate).tshirtSize ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="admin-summary">
                <p className="helper">
                  <strong>Total delegates (all churches):</strong> {delegates.length} &nbsp;•&nbsp;
                  <strong>Total registration amount @ 500:</strong> {delegates.length * 500}
                </p>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}

export default AdminPage


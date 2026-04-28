import React, { useState, useMemo } from 'react'
import { generateIDCards } from '../utils/pdfGenerator'
import { getChurchName, CHURCHES } from '../types'
import type { Delegate } from '../types'
import BereansImg from '../assets/Bereans.png'
import DavidImg from '../assets/David.png'
import JohnImg from '../assets/John.png'
import PeterImg from '../assets/Peter.png'

import type { Group } from '../types'

interface IDPrinterToolProps {
  onGoBack: () => void
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void
  delegates: Delegate[]
  groups: Group[]
}

interface QueuedID {
  id: string
  firstName: string
  church: string
  groupName: string
}

const GROUP_LAYOUTS: Record<string, string> = {
  'Bereans': BereansImg,
  'David': DavidImg,
  'John': JohnImg,
  'Peter': PeterImg,
}

const getLayoutForGroup = (groupName: string): string => {
  const name = groupName.toLowerCase()
  const key = Object.keys(GROUP_LAYOUTS).find(k => name.includes(k.toLowerCase()))
  return key || 'Bereans'
}

const IDPrinterTool: React.FC<IDPrinterToolProps> = ({ onGoBack, showToast, delegates, groups }) => {
  const [selectedChurchId, setSelectedChurchId] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [selectedDelegateId, setSelectedDelegateId] = useState('')
  const [groupName, setGroupName] = useState('Bereans')
  const [queue, setQueue] = useState<QueuedID[]>([])

  // Derived: Active preview data
  const selectedDelegate = useMemo(() => 
    delegates.find(d => d.id === selectedDelegateId), 
    [delegates, selectedDelegateId]
  )

  const firstName = selectedDelegate?.preferredName || selectedDelegate?.firstName || ''
  const churchName = selectedDelegate ? getChurchName(selectedDelegate.church) : ''

  // Derived: Unique churches that have delegates
  const registeredChurches = useMemo(() => {
    const ids = Array.from(new Set(delegates.map(d => d.church)))
    return CHURCHES.filter(c => ids.includes(c.id)).sort((a,b) => a.name.localeCompare(b.name))
  }, [delegates])

  // Derived: Names for the selected church/group
  const filteredDelegates = useMemo(() => {
    let result = delegates
    if (selectedChurchId) {
      result = result.filter(d => d.church === selectedChurchId)
    }
    if (selectedGroupId) {
      result = result.filter(d => groups.find(g => g.id === selectedGroupId)?.delegateIds.includes(d.id))
    }
    return result.sort((a,b) => a.firstName.localeCompare(b.firstName))
  }, [delegates, selectedChurchId, selectedGroupId, groups])

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName || !churchName) {
      showToast('Please select a church and name', 'error')
      return
    }

    const newItem: QueuedID = {
      id: Date.now().toString(),
      firstName: firstName.trim(),
      church: churchName.trim(),
      groupName
    }

    setQueue(prev => [...prev, newItem])
    setSelectedDelegateId('')
    showToast('Added to queue!', 'success')
  }

  const handleRemove = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id))
  }

  const handlePrint = async () => {
    if (queue.length === 0) {
      showToast('Queue is empty', 'error')
      return
    }

    try {
      showToast('Generating A4 Print Layout...', 'info')
      await generateIDCards([], [], undefined, true, queue)
      setQueue([])
      showToast('Print dialog opened. Queue cleared.', 'success')
    } catch {
      showToast('Failed to generate IDs', 'error')
    }
  }

  const handleReset = () => {
    setSelectedChurchId('')
    setSelectedDelegateId('')
    setQueue([])
    showToast('Cleared all selections', 'info')
  }

  return (
    <div className="id-tool-page">
      <header className="reg-header">
        <button onClick={onGoBack} className="topbar-button">← Back to Admin</button>
        <div style={{ textAlign: 'right' }}>
          <span className="reg-title">Manual ID Printer</span>
          <span className="reg-subtitle">Seeking Jesus 2026</span>
        </div>
      </header>

      <div className="id-tool-container">
        {/* Left: Input Form */}
        <div className="id-tool-sidebar">
          <section className="card">
            <h3>Add Registered Attendee</h3>
            <form onSubmit={handleAdd} className="id-tool-form">
              <div className="reg-field">
                <label>Church / Congregation</label>
                <select 
                  value={selectedChurchId} 
                  onChange={e => {
                    setSelectedChurchId(e.target.value)
                    setSelectedDelegateId('')
                  }}
                  className="input-large"
                >
                  <option value="">-- All Churches --</option>
                  {registeredChurches.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="reg-field">
                <label>Group</label>
                <select 
                  value={selectedGroupId} 
                  onChange={e => {
                    setSelectedGroupId(e.target.value)
                    setSelectedDelegateId('')
                    const selectedGroup = groups.find(g => g.id === e.target.value)
                    if (selectedGroup) {
                      setGroupName(getLayoutForGroup(selectedGroup.name))
                    }
                  }}
                  className="input-large"
                >
                  <option value="">-- All Groups --</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="reg-field">
                <label>First Name</label>
                <select 
                  value={selectedDelegateId} 
                  onChange={e => {
                    setSelectedDelegateId(e.target.value)
                    const delegate = delegates.find(d => d.id === e.target.value)
                    if (delegate) {
                      setSelectedChurchId(delegate.church)
                      const delegateGroup = groups.find(g => g.delegateIds.includes(delegate.id))
                      if (delegateGroup) {
                        setGroupName(getLayoutForGroup(delegateGroup.name))
                      }
                    }
                  }}
                  className="input-large"
                  disabled={!selectedChurchId && !selectedGroupId}
                >
                  <option value="">-- Select Name --</option>
                  {filteredDelegates.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.firstName} {d.lastName} {d.preferredName ? `(ID: ${d.preferredName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="reg-field">
                <label>Target Group Layout</label>
                <select value={groupName} onChange={e => setGroupName(e.target.value)}>
                  {Object.keys(GROUP_LAYOUTS).map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              
              <div className="actions stack">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button type="submit" className="primary" disabled={!selectedDelegateId}>Add to Queue</button>
                  <button 
                    type="button" 
                    className="success"
                    disabled={!selectedDelegateId}
                    onClick={async () => {
                      if (!firstName || !churchName) { showToast('Select a delegate', 'error'); return }
                      const single = [{ id: 'single', firstName, church: churchName, groupName }]
                      await generateIDCards([], [], undefined, true, single)
                      setSelectedDelegateId('')
                      showToast('ID Sent to Printer', 'success')
                    }}
                  >
                    Print ID Now
                  </button>
                </div>
                <button type="button" onClick={handleReset} className="secondary">Reset All</button>
              </div>
            </form>
          </section>

          {queue.length > 0 && (
            <section className="card queue-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Print Queue ({queue.length})</h3>
                <button onClick={handlePrint} className="success btn-sm">Print All (A4)</button>
              </div>
              <div className="queue-list">
                {queue.map(item => (
                  <div key={item.id} className="queue-item">
                    <div>
                      <strong>{item.firstName}</strong>
                      <span className="queue-item-meta">{item.church} • {item.groupName}</span>
                    </div>
                    <button onClick={() => handleRemove(item.id)} className="remove-btn">×</button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right: Live Preview */}
        <div className="id-tool-preview-area">
          <h3>Live Preview (93mm x 128mm)</h3>
          <p className="preview-help">The output below shows exact line alignment for the selected delegate.</p>
          
          <div className="id-preview-container">
            <div className={`id-card-preview group-${groupName.toLowerCase()}`}>
              <img src={GROUP_LAYOUTS[groupName]} alt="ID Background" className="id-bg-img" />
              <div className="id-overlay-content">
                {firstName && (
                  <div className="id-name-text">
                    {firstName}
                  </div>
                )}
                {churchName && (
                  <div className="id-church-text">
                    {churchName}
                  </div>
                )}
              </div>
            </div>
          </div>
          <p className="resource-note">💡 We fit 4 of these on one A4 sheet to save paper.</p>
        </div>
      </div>

      <style>{`
        .id-tool-page {
          min-height: 100vh;
          background: #f8fafc;
        }
        .id-tool-container {
          display: grid;
          grid-template-columns: 400px 1fr;
          gap: 2rem;
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }
        .id-tool-sidebar {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .id-tool-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .actions.stack {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 1rem;
        }
        .queue-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 400px;
          overflow-y: auto;
        }
        .queue-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: #f1f5f9;
          border-radius: 8px;
          border-left: 4px solid var(--primary);
        }
        .queue-item-meta {
          display: block;
          font-size: 0.75rem;
          color: #64748b;
        }
        .remove-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #94a3b8;
          cursor: pointer;
          line-height: 1;
        }
        .remove-btn:hover { color: #ef4444; }

        .id-tool-preview-area {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .preview-help {
          color: #64748b;
          font-size: 0.85rem;
          margin-bottom: 2rem;
        }
        .id-preview-container {
          background: white;
          padding: 2rem;
          border-radius: 20px;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
          border: 1px solid #edf2f7;
        }
        .id-card-preview {
          width: 372px; /* 93mm @ 4px/mm */
          height: 512px; /* 128mm @ 4px/mm */
          position: relative;
          background: #eee;
          box-shadow: 0 0 10px rgba(0,0,0,0.2);
          overflow: hidden;
          border: 1px solid #000; /* Safe cutting guide */
        }
        .id-bg-img {
          width: 100%;
          height: 100%;
          object-fit: cover; /* Ensure no stretching, fill exactly */
        }
        .id-overlay-content {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .id-name-text {
          position: absolute;
          top: 60%;
          left: 50%;
          transform: translate(-50%, -100%); /* Baseline sits on line */
          width: 58%;
          text-align: center;
          font-family: 'Inter', sans-serif;
          font-weight: 800;
          font-size: 1.2rem;
          color: #000;
          text-transform: uppercase;
          line-height: 1;
        }
        .id-church-text {
          position: absolute;
          top: 69%;
          left: 50%;
          transform: translate(-50%, -100%); /* Baseline sits on line */
          width: 58%;
          text-align: center;
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          font-size: 0.85rem;
          color: #000;
          line-height: 1.1;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .resource-note {
          margin-top: 2rem;
          color: #92400e;
          font-weight: 600;
          background: #fffbeb;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          border: 1px solid #fcd34d;
        }
        
        @media (max-width: 1000px) {
          .id-tool-container {
            grid-template-columns: 1fr;
          }
          .id-tool-sidebar {
            order: 2;
          }
        }
      `}</style>
    </div>
  )
}

export default IDPrinterTool

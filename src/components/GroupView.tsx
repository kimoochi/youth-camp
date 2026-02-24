import React, { useState } from 'react';
import type { Delegate, Group } from '../types';

interface GroupViewProps {
  groups: Group[];
  delegates: Delegate[];
  onDropToGroup: (groupId: string) => void;
  onDragStart: (id: string) => void;
  onPrintIDs: (groupId?: string) => void;
  onRenameGroup: (groupId: string, newName: string) => void; // New prop
}

const GroupView: React.FC<GroupViewProps> = ({ groups, delegates, onDropToGroup, onDragStart, onPrintIDs, onRenameGroup }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');

  const getDelegate = (id: string) => delegates.find(d => d.id === id);

  const handleRename = (group: Group) => {
    setEditingGroupId(group.id);
    setNewGroupName(group.name);
  };

  const handleSaveRename = (groupId: string) => {
    if (newGroupName.trim()) {
      onRenameGroup(groupId, newGroupName.trim());
    }
    setEditingGroupId(null);
    setNewGroupName('');
  };

  return (
    <div className="accordion-view">
      {groups.map(g => (
        <div key={g.id} className={`accordion-item ${expanded === g.id ? 'expanded' : ''}`}>
          <div className="accordion-header" onClick={() => setExpanded(expanded === g.id ? null : g.id)}>
            <div className="group-name">
              {editingGroupId === g.id ? (
                <input 
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onBlur={() => handleSaveRename(g.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(g.id)}
                  autoFocus
                />
              ) : (
                g.name
              )}
            </div>
            <div className="header-right">
              <span className="badge dark">{g.delegateIds.length} members</span>
              <button className="ghost small" onClick={(e) => { e.stopPropagation(); handleRename(g); }}>Rename</button>
              <button className="primary small" onClick={(e) => { e.stopPropagation(); onPrintIDs(g.id); }}>Print IDs</button>
              <div className="chevron" />
            </div>
          </div>
          <div className="accordion-content">
            <div 
              className="accordion-content-inner"
              onDragOver={e => e.preventDefault()}
              onDrop={() => onDropToGroup(g.id)}
            >
              {g.delegateIds.length > 0 ? (
                <div className="delegate-list">
                  {g.delegateIds.map(id => {
                    const d = getDelegate(id);
                    return d ? (
                      <div key={d.id} className="delegate-card" draggable onDragStart={() => onDragStart(d.id)}>
                        <div>
                          <div className="delegate-name">{d.lastName}, {d.firstName}</div>
                          <div className="delegate-meta">{d.age} • {d.gender} • {d.church}</div>
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              ) : (
                <div className="empty-group-message">Drag a delegate here to start building the group.</div>
              )}
            </div>
          </div>
        </div>
      ))}
      {groups.length === 0 && <p className="helper-text empty-view-message">No groups yet. Use "Auto Group" to create groups.</p>}
    </div>
  );
};

export default GroupView;

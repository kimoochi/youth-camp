import { collection, addDoc, updateDoc, doc, getDocs, deleteDoc, DocumentReference } from 'firebase/firestore'
import { db } from '../firebase'
import type { Delegate, Group, PaymentStatus, DelegateRole } from '../types'

export const addDelegateToFirestore = async (delegateData: Omit<Delegate, 'id'>): Promise<DocumentReference> => {
  return await addDoc(collection(db, 'delegates'), delegateData)
}

export const deleteDelegate = async (id: string, delegates: Delegate[], groups: Group[]) => {
  // Find if in group
  const group = groups.find(g => g.delegateIds.includes(id))
  if (group) {
    const newIds = group.delegateIds.filter(gid => gid !== id)
    await updateDoc(doc(db, 'groups', group.id), { delegateIds: newIds })
  }
  await deleteDoc(doc(db, 'delegates', id))
}

export const createAndAssignLeader = async (delegateData: Omit<Delegate, 'id'>, groupId: string) => {
  const ref = await addDoc(collection(db, 'delegates'), delegateData)
  const groupDoc = await getDocs(collection(db, 'groups'))
  groupDoc.forEach(async (g) => {
    if (g.id === groupId) {
       const ids = g.data().delegateIds || []
       await updateDoc(g.ref, { delegateIds: [...ids, ref.id] })
    }
  })
}

export const changeDelegateRole = async (delegateId: string, role: DelegateRole) => {
  await updateDoc(doc(db, 'delegates', delegateId), { role })
}

export const toggleDelegatePayment = async (delegateId: string, currentStatus: PaymentStatus, groups: Group[], delegates: Delegate[]) => {
  const newStatus = currentStatus === 'PAID' ? 'UNPAID' : 'PAID'
  await updateDoc(doc(db, 'delegates', delegateId), { paymentStatus: newStatus })
  
  if (newStatus === 'UNPAID') {
    const delegate = delegates.find(d => d.id === delegateId)
    // Only remove from group if they are NOT a Leader/Assistant Leader
    if (delegate?.role !== 'Leader' && delegate?.role !== 'Assistant Leader') {
      const group = groups.find(g => g.delegateIds.includes(delegateId))
      if (group) {
        const newIds = group.delegateIds.filter(id => id !== delegateId)
        await updateDoc(doc(db, 'groups', group.id), { delegateIds: newIds })
      }
    }
  }
}

// --- UPDATED AUTO-GROUPING LOGIC (Gender & Age Balanced) ---
export const performAutoGrouping = async (delegates: Delegate[], groups: Group[], groupCount: number) => {
  // 1. Get Pool of PAID, UNASSIGNED delegates (excluding Leaders & Assistant Leaders)
  const allPaid = delegates.filter(d => d.paymentStatus === 'PAID' && d.role !== 'Leader' && d.role !== 'Assistant Leader')
  const allAssignedIds = new Set<string>()
  groups.forEach(g => g.delegateIds.forEach(id => allAssignedIds.add(id)))
  
  const pool = allPaid.filter(d => !allAssignedIds.has(d.id))

  if (pool.length === 0) return { success: false, message: 'No new paid delegates to group.' }

  // 2. Prepare Groups (Local clone)
  const workingGroups = groups.map(g => ({ ...g, delegateIds: [...g.delegateIds] })) // Deep clone ids

  // Create groups if they don't exist
  if (workingGroups.length === 0) {
    for (let i = 0; i < groupCount; i++) {
      const ref = await addDoc(collection(db, 'groups'), { name: `Group ${i + 1}`, delegateIds: [] })
      workingGroups.push({ id: ref.id, name: `Group ${i + 1}`, delegateIds: [] })
    }
  }

  // 3. Separation Strategy: Separate by Gender first
  const males = pool.filter(d => d.gender === 'Male').sort((a, b) => b.age - a.age) // Sort age desc (older first)
  const females = pool.filter(d => d.gender === 'Female').sort((a, b) => b.age - a.age)

  // Helper to find the group with FEWEST members of a specific gender
  // This ensures we don't dump all boys in Group 1
  const distribute = (list: Delegate[], gender: 'Male' | 'Female') => {
    list.forEach(delegate => {
      // Find current count of this gender in each group
      // We map groups to a score: { index, count }
      const groupGenderCounts = workingGroups.map((g, idx) => {
        const count = g.delegateIds.filter(id => {
          const d = delegates.find(x => x.id === id) || pool.find(x => x.id === id)
          return d?.gender === gender
        }).length
        return { idx, count }
      })

      // Sort by count ascending (find group with FEWEST of this gender)
      groupGenderCounts.sort((a, b) => a.count - b.count)
      
      // If counts equal, fallback to total group size to keep balance
      const targetGroupIndex = groupGenderCounts[0].idx
      workingGroups[targetGroupIndex].delegateIds.push(delegate.id)
    })
  }

  // Distribute Males and Females separately
  distribute(males, 'Male')
  distribute(females, 'Female')

  // 4. Save to Firestore
  try {
    const updates = workingGroups.map(g => updateDoc(doc(db, 'groups', g.id), { delegateIds: g.delegateIds }))
    await Promise.all(updates)
    return { success: true, message: `Successfully balanced & grouped ${pool.length} delegates.` }
  } catch {
    return { success: false, message: 'Database error during grouping.' }
  }
}

export const moveDelegateToGroup = async (delegateId: string, targetGroupId: string, delegates: Delegate[]) => {
  const delegate = delegates.find(d => d.id === delegateId)
  if (delegate?.paymentStatus !== 'PAID' && delegate?.role !== 'Leader' && delegate?.role !== 'Assistant Leader') {
    throw new Error('Only PAID delegates or Leaders can be grouped.')
  }

  const groupDocs = await getDocs(collection(db, 'groups'))
  const updates = groupDocs.docs.map(async (gDoc) => {
    let ids: string[] = gDoc.data().delegateIds || []
    if (ids.includes(delegateId)) {
       ids = ids.filter(id => id !== delegateId)
       await updateDoc(gDoc.ref, { delegateIds: ids })
    }
    if (gDoc.id === targetGroupId) {
      ids.push(delegateId)
      await updateDoc(gDoc.ref, { delegateIds: ids })
    }
  })
  await Promise.all(updates)
}

export const removeDelegateFromGroup = async (delegateId: string) => {
  const groupDocs = await getDocs(collection(db, 'groups'))
  const updates: Promise<void>[] = []
  groupDocs.forEach((gDoc) => {
    const ids: string[] = gDoc.data().delegateIds || []
    if (ids.includes(delegateId)) {
      const newIds = ids.filter(id => id !== delegateId)
      updates.push(updateDoc(gDoc.ref, { delegateIds: newIds }))
    }
  })
  await Promise.all(updates)
}

export const renameGroupInFirestore = async (groupId: string, newName: string) => {
  await updateDoc(doc(db, 'groups', groupId), { name: newName })
}
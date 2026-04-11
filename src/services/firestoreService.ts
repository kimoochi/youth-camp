import { collection, addDoc, updateDoc, doc, getDocs, deleteDoc, DocumentReference } from 'firebase/firestore'
import { db } from '../firebase'
import type { Delegate, Group, PaymentStatus, DelegateRole } from '../types'

export const updateDelegate = async (id: string, updates: Partial<Delegate>) => {
  await updateDoc(doc(db, 'delegates', id), updates)
}

export const addDelegateToFirestore = async (delegateData: Omit<Delegate, 'id'>): Promise<DocumentReference> => {
  return await addDoc(collection(db, 'delegates'), delegateData)
}

export const deleteDelegate = async (id: string, groups: Group[]) => {
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

// --- AUTO-GROUPING LOGIC (Age Balanced Distribution) ---
export const performAutoGrouping = async (delegates: Delegate[], groups: Group[], groupCount: number) => {
  // 1. Get Pool of UNASSIGNED delegates (excluding Leaders & Assistant Leaders)
  // Include BOTH paid and unpaid delegates
  const allUnassigned = delegates.filter(d => d.role !== 'Leader' && d.role !== 'Assistant Leader')
  
  const allAssignedIds = new Set<string>()
  groups.forEach(g => g.delegateIds.forEach(id => allAssignedIds.add(id)))
  
  const pool = allUnassigned.filter(d => !allAssignedIds.has(d.id))

  if (pool.length === 0) return { success: false, message: 'No unassigned delegates to group.' }

  // 2. Prepare Groups (Local clone)
  const workingGroups = groups.map(g => ({ ...g, delegateIds: [...g.delegateIds] }))

  // Create groups if they don't exist
  if (workingGroups.length === 0) {
    for (let i = 0; i < groupCount; i++) {
      const ref = await addDoc(collection(db, 'groups'), { name: `Group ${i + 1}`, delegateIds: [] })
      workingGroups.push({ id: ref.id, name: `Group ${i + 1}`, delegateIds: [] })
    }
  }

  // 3. Age-balanced distribution using round-robin approach
  // Sort pool by age (oldest first), then distribute in round-robin
  const sortedPool = [...pool].sort((a, b) => b.age - a.age)

  // Helper to get average age of a group
  const getGroupAvgAge = (delegateIds: string[]): number => {
    if (delegateIds.length === 0) return 0
    const totalAge = delegateIds.reduce((sum, id) => {
      const d = delegates.find(x => x.id === id)
      return sum + (d?.age || 0)
    }, 0)
    return totalAge / delegateIds.length
  }

  // Helper to find group with lowest average age
  // This ensures balanced age distribution across groups
  const findGroupForDelegate = (): number => {
    let bestGroupIndex = 0
    let lowestAvgAge = Infinity

    workingGroups.forEach((g, idx) => {
      const avgAge = getGroupAvgAge(g.delegateIds)
      // Find group with lowest average age
      // This balances out - putting older people in groups with younger avg age
      if (avgAge < lowestAvgAge) {
        lowestAvgAge = avgAge
        bestGroupIndex = idx
      }
    })

    return bestGroupIndex
  }

  // Distribute delegates evenly by age
  sortedPool.forEach(delegate => {
    const targetIndex = findGroupForDelegate()
    workingGroups[targetIndex].delegateIds.push(delegate.id)
  })

  // 4. Save to Firestore
  try {
    const updates = workingGroups.map(g => updateDoc(doc(db, 'groups', g.id), { delegateIds: g.delegateIds }))
    await Promise.all(updates)
    return { success: true, message: `Successfully grouped ${pool.length} delegates with balanced ages.` }
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
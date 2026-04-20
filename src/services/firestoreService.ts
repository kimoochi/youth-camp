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

// --- AUTO-GROUPING LOGIC (Age & Gender Fair Distribution + Name Diversity) ---
export const performAutoGrouping = async (delegates: Delegate[], groups: Group[], groupCount: number) => {
  // 1. Get Pool of ALL UNASSIGNED delegates (excluding Leaders & Assistant Leaders)
  const allUnassigned = delegates.filter(d => 
    d.role !== 'Leader' && 
    d.role !== 'Assistant Leader'
  )

  const allAssignedIds = new Set<string>()
  groups.forEach(g => g.delegateIds.forEach(id => allAssignedIds.add(id)))

  const pool = allUnassigned.filter(d => !allAssignedIds.has(d.id))

  if (pool.length === 0) return { success: false, message: 'No unassigned delegates to group.' }

  // 2. Prepare Groups - INCLUDE ALL groups in the distribution for balancing
  const workingGroups = groups.map(g => ({ ...g, delegateIds: [...g.delegateIds] }))

  const effectivePool = [...pool]

  if (effectivePool.length === 0) return { success: false, message: 'All unassigned delegates are already grouped, or groups are locked.' }

  // Create groups if they don't exist
  if (workingGroups.length === 0) {
    for (let i = 0; i < groupCount; i++) {
      const gender = i % 2 === 0 ? 'Male' : 'Female'
      const ref = await addDoc(collection(db, 'groups'), { name: `Group ${i + 1}`, delegateIds: [], gender })
      workingGroups.push({ id: ref.id, name: `Group ${i + 1}`, delegateIds: [], gender })
    }
  }

  // Helper to get last names already in a group
  const getGroupLastNames = (delegateIds: string[]): Set<string> => {
    const lastNames = new Set<string>()
    delegateIds.forEach(id => {
      const d = delegates.find(x => x.id === id)
      if (d) lastNames.add(d.lastName.toLowerCase())
    })
    return lastNames
  }

  // Helper to get gender counts in a group
  const getGroupGenderCounts = (delegateIds: string[]): { male: number; female: number } => {
    let male = 0
    let female = 0
    delegateIds.forEach(id => {
      const d = delegates.find(x => x.id === id)
      if (d) {
        if (d.gender === 'Male') male++
        else female++
      }
    })
    return { male, female }
  }

  // Count total males and females: pool + existing unlocked group members
  const allMalesInScope = new Set<string>()
  const allFemalesInScope = new Set<string>()

  effectivePool.forEach(d => {
    if (d.gender === 'Male') allMalesInScope.add(d.id)
    else allFemalesInScope.add(d.id)
  })

  workingGroups.forEach(g => {
    g.delegateIds.forEach(id => {
      const d = delegates.find(x => x.id === id)
      if (d) {
        if (d.gender === 'Male') allMalesInScope.add(d.id)
        else allFemalesInScope.add(d.id)
      }
    })
  })

  // Calculate target male count per group based on total scope
  const targetMalesPerGroup = Math.ceil(allMalesInScope.size / workingGroups.length)

  // 3. Sort pool by age (oldest first)
  const sortedPool = [...effectivePool].sort((a, b) => b.age - a.age)

  // Separate by gender while maintaining age order within each gender
  const malePool = sortedPool.filter(d => d.gender === 'Male')
  const femalePool = sortedPool.filter(d => d.gender === 'Female')

  // Distribute each gender fairly across groups based on target counts
  const distributeByGender = (genderPool: Delegate[], targetPerGroup: number) => {
    let roundRobinIndex = 0

    genderPool.forEach((delegate) => {
      const delegateLastName = delegate.lastName.toLowerCase()

      // First, try to find a group that:
      // 1. Has room for this gender (under target)
      // 2. Doesn't have same last name
      // 3. Has smallest size among eligible groups
      let targetIndex = -1
      let smallestSize = Infinity

      workingGroups.forEach((g, idx) => {
        const genderCounts = getGroupGenderCounts(g.delegateIds)
        const isTargetGender = delegate.gender === 'Male'
          ? genderCounts.male < targetPerGroup
          : genderCounts.female < targetPerGroup
        const lastNames = getGroupLastNames(g.delegateIds)

        if (isTargetGender && !lastNames.has(delegateLastName)) {
          if (g.delegateIds.length < smallestSize) {
            smallestSize = g.delegateIds.length
            targetIndex = idx
          }
        }
      })

      // If no group found for last name diversity, find any group under target (with round-robin)
      if (targetIndex === -1) {
        for (let i = 0; i < workingGroups.length; i++) {
          const g = workingGroups[roundRobinIndex]
          const genderCounts = getGroupGenderCounts(g.delegateIds)
          const isTargetGender = delegate.gender === 'Male'
            ? genderCounts.male < targetPerGroup
            : genderCounts.female < targetPerGroup

          if (isTargetGender) {
            targetIndex = roundRobinIndex
            break
          }
          roundRobinIndex = (roundRobinIndex + 1) % workingGroups.length
        }
      }

      // Last resort: any group with smallest size
      if (targetIndex === -1) {
        smallestSize = Infinity
        for (let i = 0; i < workingGroups.length; i++) {
          const g = workingGroups[i]
          if (g.delegateIds.length < smallestSize) {
            smallestSize = g.delegateIds.length
            targetIndex = i
          }
        }
      }

      if (targetIndex !== -1) {
        workingGroups[targetIndex].delegateIds.push(delegate.id)
      }
      roundRobinIndex = (roundRobinIndex + 1) % workingGroups.length
    })
  }

  // Distribute males first, then females
  distributeByGender(malePool, targetMalesPerGroup)
  distributeByGender(femalePool, targetMalesPerGroup)

  // 4. Save to Firestore (Update groups and mark added delegates as 'new')
  try {
    const groupUpdates = workingGroups.map(g => updateDoc(doc(db, 'groups', g.id), { delegateIds: g.delegateIds }))
    
    // Track which delegates were just added to mark them as 'new'
    const addedDelegateIds = workingGroups.flatMap(g => {
      const originalGroup = groups.find(og => og.id === g.id)
      const originalIds = new Set(originalGroup?.delegateIds || [])
      return g.delegateIds.filter(id => !originalIds.has(id))
    })

    const delegateUpdates = addedDelegateIds.map(id => updateDoc(doc(db, 'delegates', id), { isNew: true }))
    
    await Promise.all([...groupUpdates, ...delegateUpdates])
    return { success: true, message: `Grouped ${effectivePool.length} new delegates across groups.` }
  } catch {
    return { success: false, message: 'Database error during grouping.' }
  }
}

export const moveDelegateToGroup = async (delegateId: string, targetGroupId: string) => {
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

export const setGroupGender = async (groupId: string, gender: 'Male' | 'Female' | null) => {
  await updateDoc(doc(db, 'groups', groupId), { gender })
}

export const toggleGroupLock = async (groupId: string, locked: boolean, delegateIds: string[] = []) => {
  const updates: Promise<void>[] = [
    updateDoc(doc(db, 'groups', groupId), { locked })
  ]

  // If locking the group, also clear 'isNew' status for all members
  if (locked) {
    delegateIds.forEach(id => {
      updates.push(updateDoc(doc(db, 'delegates', id), { isNew: false }))
    })
  }

  await Promise.all(updates)
}

export const clearUnlockedGroups = async (groups: Group[], delegates: Delegate[]) => {
  const updates = groups
    .filter(g => !g.locked)
    .map(g => {
      const fixedIds = g.delegateIds.filter(id => {
        const d = delegates.find(del => del.id === id)
        // Keep only Leaders and Assistants in unlocked groups
        return d?.role === 'Leader' || d?.role === 'Assistant Leader'
      })
      
      // For those being cleared, remove their 'isNew' status
      const removedIds = g.delegateIds.filter(id => !fixedIds.includes(id))
      const delUpdates = removedIds.map(id => updateDoc(doc(db, 'delegates', id), { isNew: false }))
      
      return Promise.all([
        updateDoc(doc(db, 'groups', g.id), { delegateIds: fixedIds }),
        ...delUpdates
      ])
    })
  await Promise.all(updates)
}
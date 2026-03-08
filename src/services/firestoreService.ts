import { collection, addDoc, updateDoc, doc, getDocs, deleteDoc, DocumentReference, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import type { Delegate, Group, PaymentStatus } from '../types'

export const addDelegateToFirestore = async (delegateData: Omit<Delegate, 'id'>): Promise<DocumentReference> => {
  return await addDoc(collection(db, 'delegates'), delegateData)
}

export const editDelegateInFirestore = async (delegateId: string, delegateData: Partial<Delegate>) => {
  await updateDoc(doc(db, 'delegates', delegateId), delegateData);
};

export const deleteDelegateFromFirestore = async (delegateId: string) => {
  await deleteDoc(doc(db, 'delegates', delegateId));
};

export const toggleDelegatePayment = async (delegateId: string, currentStatus: PaymentStatus, groups: Group[]) => {
  const newStatus = currentStatus === 'PAID' ? 'UNPAID' : 'PAID'
  await updateDoc(doc(db, 'delegates', delegateId), { paymentStatus: newStatus })
  
  if (newStatus === 'UNPAID') {
    const group = groups.find(g => g.delegateIds.includes(delegateId))
    if (group) {
      const newIds = group.delegateIds.filter(id => id !== delegateId)
      await updateDoc(doc(db, 'groups', group.id), { delegateIds: newIds })
    }
  }
}

export const moveDelegateToGroup = async (delegateId: string, targetGroupId: string, delegates: Delegate[]) => {
  const delegate = delegates.find(d => d.id === delegateId)
  if (delegate?.paymentStatus !== 'PAID') throw new Error('Only PAID delegates can be grouped.')

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

export const overwriteGroupsInFirestore = async (newGroups: { name: string, delegateIds: string[] }[]) => {
  const batch = writeBatch(db);

  // Delete all existing groups
  const groupDocs = await getDocs(collection(db, 'groups'));
  groupDocs.forEach(doc => {
      batch.delete(doc.ref);
  });

  // Add new groups
  newGroups.forEach(group => {
      const newGroupRef = doc(collection(db, 'groups'));
      batch.set(newGroupRef, group);
  });

  await batch.commit();
}
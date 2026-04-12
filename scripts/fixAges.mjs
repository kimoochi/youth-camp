import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCAwdVtEqVoFjS30XdzEuxATCGDm8GzXg8",
  authDomain: "youth-camp-praktis.firebaseapp.com",
  projectId: "youth-camp-praktis",
  storageBucket: "youth-camp-praktis.firebasestorage.app",
  messagingSenderId: "1044510556017",
  appId: "1:1044510556017:web:6cad02c049c5a89282c0d0",
  measurementId: "G-JBCVTZQRVF"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

function getAgeFromBirthday(birthdayIso) {
  const d = new Date(birthdayIso)
  if (isNaN(d.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1
  return age
}

async function fixAges() {
  console.log('Fetching delegates...')
  const snapshot = await getDocs(collection(db, 'delegates'))
  
  const updates = []
  let fixedCount = 0
  let skipCount = 0
  
  snapshot.forEach((docSnap) => {
    const data = docSnap.data()
    
    // Skip leaders and assistant leaders
    if (data.role === 'Leader' || data.role === 'Assistant Leader') {
      skipCount++
      return
    }
    
    if (data.age === 0 && data.birthday) {
      const calculatedAge = getAgeFromBirthday(data.birthday)
      if (calculatedAge !== null && calculatedAge >= 0 && calculatedAge <= 100) {
        updates.push({
          id: docSnap.id,
          name: `${data.firstName} ${data.lastName}`,
          oldAge: data.age,
          newAge: calculatedAge,
          birthday: data.birthday
        })
      } else {
        console.log(`Skipping ${data.firstName} ${data.lastName}: invalid birthday "${data.birthday}"`)
        skipCount++
      }
    } else if (!data.birthday) {
      console.log(`No birthday for ${data.firstName} ${data.lastName} - skipping`)
      skipCount++
    } else {
      skipCount++
    }
  })
  
  console.log(`\nFound ${updates.length} delegates with age=0 that have valid birthdays\n`)
  
  for (const update of updates) {
    console.log(`Updating: ${update.name} - Age ${update.oldAge} -> ${update.newAge} (birthday: ${update.birthday})`)
    await updateDoc(doc(db, 'delegates', update.id), { age: update.newAge })
    fixedCount++
  }
  
  console.log(`\nDone! Fixed ${fixedCount} delegate ages. Skipped ${skipCount} delegates.`)
}

fixAges().catch(console.error)

import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

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

export const db = getFirestore(app)

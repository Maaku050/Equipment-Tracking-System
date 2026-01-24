// firebase/firebaseConfig.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyB_KbN8BFrsb76Ijb1HgFAkqznslmQjPww",
  authDomain: "equipment-tracking-syste-65e94.firebaseapp.com",
  projectId: "equipment-tracking-syste-65e94",
  storageBucket: "equipment-tracking-syste-65e94.firebasestorage.app",
  messagingSenderId: "14851583957",
  appId: "1:14851583957:web:6b1c5abc4baaabcf6b575c",
  measurementId: "G-0YXXTQKNC8",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

export { auth, db, storage, functions };

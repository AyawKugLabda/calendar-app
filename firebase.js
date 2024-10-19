// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// Add imports for Firestore
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  addDoc
} from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDfcdbI056gskbMgM4ba9DsEW3eH2meDRk",
  authDomain: "calendar-app-fcdc4.firebaseapp.com",
  projectId: "calendar-app-fcdc4",
  storageBucket: "calendar-app-fcdc4.appspot.com",
  messagingSenderId: "7730783738",
  appId: "1:7730783738:web:e48d031b658a4223da3043"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Export the app, db, and Firestore functions
export { 
  app, 
  db, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  addDoc
};

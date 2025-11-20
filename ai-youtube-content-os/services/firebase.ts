import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- ACTION REQUIRED: PASTE YOUR FIREBASE CONFIG HERE ---
// 1. Go to console.firebase.google.com
// 2. Create a Project -> Create a Web App
// 3. Copy the config keys and paste them below (replace strings inside quotes)
const firebaseConfig = {
  apiKey: "AIzaSyDpMNUmAlbIBDokkxy16cVTp8tbvVlYbfY",
  authDomain: "os-c974a.firebaseapp.com",
  projectId: "os-c974a",
  storageBucket: "os-c974a.firebasestorage.app",
  messagingSenderId: "49362296000",
  appId: "1:49362296000:web:5baef8f06b3b4afca3e125",
  measurementId: "G-7BK279QZJ6"
};

// Validates that the config has been filled in (checks for basic presence of keys)
const isConfigValid = 
    firebaseConfig.apiKey && 
    firebaseConfig.apiKey.length > 10 && 
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== "YOUR_PROJECT_ID";

let db: any = null;

if (isConfigValid) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("✅ Firebase initialized successfully with Project ID:", firebaseConfig.projectId);
  } catch (error) {
    console.error("❌ Firebase initialization failed:", error);
  }
} else {
    console.log("⚠️ No valid Firebase config found. Running in LocalStorage Mode.");
}

export { db };
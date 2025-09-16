// scheduler-firebase.js

// --- Firebase Core Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";

// --- Scheduler Services ---
import { getAuth } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// --- Scheduler Project Config ---
const firebaseConfig = {
  apiKey: "AIzaSyBjo5LY4EsFlX8j_8NbLUObooUsCqJM8KM",
  authDomain: "tk-scheduler.firebaseapp.com",
  projectId: "tk-scheduler",
  storageBucket: "tk-scheduler.appspot.com", // FIXED: must end with .appspot.com
  messagingSenderId: "746606755052",
  appId: "1:746606755052:web:d7eae92976cb2f2fa9f9c9",
  measurementId: "G-Q5L607R3N7"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);

// Analytics will only work on authorized domains
let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.warn("Analytics not initialized. Likely running on unauthorized domain.", e);
}

// --- Export Scheduler Services ---
export const auth = getAuth(app);     // Handles login, signup, logout
export const db = getFirestore(app);  // Handles Firestore database

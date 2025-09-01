// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBQl-57DKd_bCJe24sWz78pG-bXfknPmx4",
  authDomain: "tklesson-website.firebaseapp.com",
  projectId: "tklesson-website",
  storageBucket: "tklesson-website.firebasestorage.app",
  messagingSenderId: "670316016464",
  appId: "1:670316016464:web:6f4c1f33a9f79a1f757255",
  measurementId: "G-5G0Z1G89LT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Utility function to enforce login on any page
export function requireAuth(redirectURL = "premium.html") {
  // Hide body immediately
  document.body.style.display = 'none';

  onAuthStateChanged(auth, (user) => {
    if (user) {
      // Show content for authorized user
      document.body.style.display = 'block';
    } else {
      // Redirect if not signed in
      window.location.replace(redirectURL);
    }
  });
}

// Optional: export a logout helper
export async function logout(redirectURL = "premium.html") {
  try {
    await signOut(auth);
    window.location.href = redirectURL;
  } catch (err) {
    console.error("Logout failed:", err);
  }
}

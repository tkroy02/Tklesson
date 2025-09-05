import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

// Your Firebase configuration
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
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Check for authentication state
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in, display the page content
        document.body.style.display = 'block';
    } else {
        // No user is logged in, redirect them
        window.location.replace("premium.html");
    }
});

const logoutButton = document.getElementById('logoutButton');

if (logoutButton) {
    logoutButton.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
            console.log("User signed out successfully.");
            // Redirect to the login page after logout
            window.location.href = "premium.html";
        } catch (error) {
            console.error("Logout error:", error);
        }
    });
}
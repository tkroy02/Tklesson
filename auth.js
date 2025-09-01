// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth();

// Hide the body by default to prevent a flicker.
document.body.style.display = 'none';

// Check for a logged-in user and show or hide content accordingly
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.body.style.display = 'block';
    } else {
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
            window.location.href = "premium.html";
        } catch (error) {
            console.error("Logout error:", error);
        }
    });
}

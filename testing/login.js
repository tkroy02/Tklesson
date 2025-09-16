import { auth, db } from './scheduler-firebase.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const loginBtn = document.getElementById("loginBtn");
const message = document.getElementById("loginMsg");

loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    message.style.color = "red";
    message.innerText = "Please fill in all fields.";
    return;
  }

  try {
    // 1. Sign in the user with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // 2. Get the user's role from Firestore
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    const role = docSnap.exists() ? docSnap.data().role : "student";

    // 3. Store role in localStorage for future use
    window.localStorage.setItem("userRole", role);

    message.style.color = "green";
    message.innerText = "Login successful! Redirecting...";

    // 4. Redirect based on the user's role
    setTimeout(() => {
      if (role === "tutor") {
        window.location.href = "tutor-dashboard.html";
      } else {
        window.location.href = "student-dashboard.html";
      }
    }, 1000);

  } catch (error) {
    console.error(error);
    message.style.color = "red";
    message.innerText = error.message;
  }
});
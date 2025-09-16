import { auth } from './scheduler-firebase.js';
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const resetBtn = document.getElementById("resetBtn");
const resetMsg = document.getElementById("resetMsg");

resetBtn.addEventListener("click", async () => {
  const email = document.getElementById("resetEmail").value.trim();

  if (!email) {
    resetMsg.style.color = "red";
    resetMsg.innerText = "Please enter your email.";
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    resetMsg.style.color = "green";
    resetMsg.innerText = `A password reset link has been sent to ${email}. Check your inbox.`;
  } catch (error) {
    console.error(error);
    resetMsg.style.color = "red";
    switch (error.code) {
      case 'auth/user-not-found':
        resetMsg.innerText = "No account found with this email.";
        break;
      default:
        resetMsg.innerText = error.message;
        break;
    }
  }
});

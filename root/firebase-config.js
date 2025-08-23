import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAaKun3buWr3xXH7DTC1aAMz2NMu4QxA1c",
  authDomain: "testerboys-31725.firebaseapp.com",
  projectId: "testerboys-31725",
  storageBucket: "testerboys-31725.firebasestorage.app",
  messagingSenderId: "486443361948",
  appId: "1:486443361948:web:99d07e60a4fcef240caf59"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export { app };

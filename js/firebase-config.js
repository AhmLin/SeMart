// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";

// Your web app's Firebase configuration - PAKAI CONFIG ANDA
const firebaseConfig = {
  apiKey: "AIzaSyApFkWDpEodKPHLzePFe0cc9z5kiMZbrS4",
  authDomain: "semart-5da85.firebaseapp.com",
  projectId: "semart-5da85",
  storageBucket: "semart-5da85.firebasestorage.app",
  messagingSenderId: "77585287575",
  appId: "1:77585287575:web:5f58edd85981264da25cd2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

console.log('🔥 Firebase initialized successfully!');
// ============================
//  🔐 FIREBASE AUTH HANDLER FINAL
// ============================
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";

import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";


// ============================
//  🔧 KONFIGURASI FIREBASE
// ============================
const firebaseConfig = {
  apiKey: "ISI_API_KEY_KAMU_DI_SINI",
  authDomain: "ISI_AUTH_DOMAIN_KAMU",
  projectId: "ISI_PROJECT_ID_KAMU",
  storageBucket: "ISI_STORAGE_BUCKET_KAMU",
  messagingSenderId: "ISI_MESSAGING_SENDER_ID",
  appId: "ISI_APP_ID_KAMU"
};

// ============================
//  🚀 INISIALISASI FIREBASE
// ============================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
setPersistence(auth, browserLocalPersistence);


// ============================
//  👤 AUTH SYSTEM CLASS
// ============================
class AuthSystem {
  constructor() {
    this.auth = auth;
    this.db = db;
    this.currentUser = null;
    this.init();
  }

  async init() {
    console.log('🚀 AuthSystem initialized');
    this.setupAuthStateListener();
    this.setupEventListeners();
    this.setupPasswordToggle();
  }

  // ============================
  // 🔍 Listener Perubahan Status Login
  // ============================
  setupAuthStateListener() {
    onAuthStateChanged(this.auth, async (user) => {
      const currentPage = window.location.pathname;

      if (user) {
        this.currentUser = user;
        console.log('✅ User signed in:', user.email);

        // Buat profil user kalau belum ada
        await this.checkAndCreateUserProfile(user);

        // Update navbar
        this.updateNavbarUI(true, user);

        // Redirect jika di halaman login/signup
        if (currentPage.includes('login.html') || currentPage.includes('signup.html')) {
          console.log('➡️ Redirect ke index.html setelah login');
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 1000);
        }
      } else {
        this.currentUser = null;
        console.log('🔐 User signed out');

        // Update navbar
        this.updateNavbarUI(false);

        // Redirect ke login kalau di halaman yang butuh login
        const restrictedPages = ['profile.html', 'orders.html', 'wishlist.html'];
        if (restrictedPages.some(p => currentPage.includes(p))) {
          console.log('➡️ Redirect ke login.html karena belum login');
          window.location.href = 'login.html';
        }
      }
    });
  }

  // ============================
  // 🧭 Update Navbar UI
  // ============================
  updateNavbarUI(isLoggedIn, user = null) {
    const navAuth = document.getElementById('nav-auth');
    const userMenu = document.getElementById('user-menu');
    const userEmail = document.getElementById('user-email');

    if (!navAuth || !userMenu) return;

    if (isLoggedIn) {
      navAuth.style.display = 'none';
      userMenu.style.display = 'block';
      if (userEmail) userEmail.textContent = user.email;
    } else {
      navAuth.style.display = 'flex';
      userMenu.style.display = 'none';
      if (userEmail) userEmail.textContent = '';
    }
  }

  // ============================
  // 🧱 Membuat Profil User di Firestore
  // ============================
  async checkAndCreateUserProfile(user) {
    const userRef = doc(this.db, "users", user.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        createdAt: new Date().toISOString(),
        displayName: user.displayName || user.email.split('@')[0],
      });
      console.log("🆕 Profil user dibuat di Firestore");
    } else {
      console.log("📄 Profil user sudah ada");
    }
  }

  // ============================
  // 🔑 Fungsi Login
  // ============================
  async handleLoginForm(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    try {
      await signInWithEmailAndPassword(this.auth, email, password);
      this.showCustomAlert('Login berhasil! 🎉', 'success');
      // Tidak perlu redirect manual — listener akan mengurusnya
    } catch (error) {
      console.error("❌ Login gagal:", error);
      if (error.code === "auth/user-not-found") {
        this.showCustomAlert("Akun tidak ditemukan. Silakan daftar dulu.", "error");
      } else if (error.code === "auth/wrong-password") {
        this.showCustomAlert("Password salah!", "error");
      } else if (error.code === "auth/invalid-email") {
        this.showCustomAlert("Format email tidak valid!", "error");
      } else {
        this.showCustomAlert("Terjadi kesalahan saat login.", "error");
      }
    }
  }

  // ============================
  // 📝 Fungsi Signup
  // ============================
  async handleSignupForm(e) {
    e.preventDefault();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value.trim();

    try {
      await createUserWithEmailAndPassword(this.auth, email, password);
      this.showCustomAlert('Pendaftaran berhasil! 🎉', 'success');
      // Redirect dihandle oleh listener
    } catch (error) {
      console.error("❌ Pendaftaran gagal:", error);
      this.showCustomAlert("Gagal mendaftar. Periksa data Anda.", "error");
    }
  }

  // ============================
  // 🚪 Logout
  // ============================
  async logout() {
    try {
      await signOut(this.auth);
      this.showCustomAlert('Berhasil logout ✅', 'success');
      setTimeout(() => (window.location.href = 'login.html'), 1000);
    } catch (error) {
      console.error("❌ Logout gagal:", error);
    }
  }

  // ============================
  // 👁️ Toggle Password
  // ============================
  setupPasswordToggle() {
    document.querySelectorAll('.password-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        const input = e.target.closest('.form-group').querySelector('input');
        if (input.type === 'password') {
          input.type = 'text';
          e.target.textContent = '🔒';
        } else {
          input.type = 'password';
          e.target.textContent = '👁️';
        }
      });
    });
  }

  // ============================
  // ⚡ Event Listener Form
  // ============================
  setupEventListeners() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginForm) loginForm.addEventListener('submit', (e) => this.handleLoginForm(e));
    if (signupForm) signupForm.addEventListener('submit', (e) => this.handleSignupForm(e));
    if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());
  }

  // ============================
  // 🪧 Alert Custom
  // ============================
  showCustomAlert(message, type = "info") {
    const alertBox = document.createElement("div");
    alertBox.className = `custom-alert ${type}`;
    alertBox.textContent = message;
    Object.assign(alertBox.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      background: type === "success" ? "#28a745" : (type === "error" ? "#dc3545" : "#007bff"),
      color: "#fff",
      padding: "10px 20px",
      borderRadius: "5px",
      boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
      zIndex: 10000,
      fontFamily: "Poppins, sans-serif"
    });
    document.body.appendChild(alertBox);
    setTimeout(() => alertBox.remove(), 3000);
  }
}

// ============================
//  🚀 INISIALISASI SISTEM AUTH
// ============================
document.addEventListener('DOMContentLoaded', () => {
  window.authSystem = new AuthSystem();
});
// ============================
//  🔐 FIREBASE AUTH HANDLER FINAL
// ============================
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";

import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";


// ============================
//  🔧 KONFIGURASI FIREBASE
// ============================
const firebaseConfig = {
  apiKey: "ISI_API_KEY_KAMU_DI_SINI",
  authDomain: "ISI_AUTH_DOMAIN_KAMU",
  projectId: "ISI_PROJECT_ID_KAMU",
  storageBucket: "ISI_STORAGE_BUCKET_KAMU",
  messagingSenderId: "ISI_MESSAGING_SENDER_ID",
  appId: "ISI_APP_ID_KAMU"
};

// ============================
//  🚀 INISIALISASI FIREBASE
// ============================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
setPersistence(auth, browserLocalPersistence);


// ============================
//  👤 AUTH SYSTEM CLASS
// ============================
class AuthSystem {
  constructor() {
    this.auth = auth;
    this.db = db;
    this.currentUser = null;
    this.init();
  }

  async init() {
    console.log('🚀 AuthSystem initialized');
    this.setupAuthStateListener();
    this.setupEventListeners();
    this.setupPasswordToggle();
  }

  // ============================
  // 🔍 Listener Perubahan Status Login
  // ============================
  setupAuthStateListener() {
    onAuthStateChanged(this.auth, async (user) => {
      const currentPage = window.location.pathname;

      if (user) {
        this.currentUser = user;
        console.log('✅ User signed in:', user.email);

        // Buat profil user kalau belum ada
        await this.checkAndCreateUserProfile(user);

        // Update navbar
        this.updateNavbarUI(true, user);

        // Redirect jika di halaman login/signup
        if (currentPage.includes('login.html') || currentPage.includes('signup.html')) {
          console.log('➡️ Redirect ke index.html setelah login');
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 1000);
        }
      } else {
        this.currentUser = null;
        console.log('🔐 User signed out');

        // Update navbar
        this.updateNavbarUI(false);

        // Redirect ke login kalau di halaman yang butuh login
        const restrictedPages = ['profile.html', 'orders.html', 'wishlist.html'];
        if (restrictedPages.some(p => currentPage.includes(p))) {
          console.log('➡️ Redirect ke login.html karena belum login');
          window.location.href = 'login.html';
        }
      }
    });
  }

  // ============================
  // 🧭 Update Navbar UI
  // ============================
  updateNavbarUI(isLoggedIn, user = null) {
    const navAuth = document.getElementById('nav-auth');
    const userMenu = document.getElementById('user-menu');
    const userEmail = document.getElementById('user-email');

    if (!navAuth || !userMenu) return;

    if (isLoggedIn) {
      navAuth.style.display = 'none';
      userMenu.style.display = 'block';
      if (userEmail) userEmail.textContent = user.email;
    } else {
      navAuth.style.display = 'flex';
      userMenu.style.display = 'none';
      if (userEmail) userEmail.textContent = '';
    }
  }

  // ============================
  // 🧱 Membuat Profil User di Firestore
  // ============================
  async checkAndCreateUserProfile(user) {
    const userRef = doc(this.db, "users", user.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        createdAt: new Date().toISOString(),
        displayName: user.displayName || user.email.split('@')[0],
      });
      console.log("🆕 Profil user dibuat di Firestore");
    } else {
      console.log("📄 Profil user sudah ada");
    }
  }

  // ============================
  // 🔑 Fungsi Login
  // ============================
  async handleLoginForm(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    try {
      await signInWithEmailAndPassword(this.auth, email, password);
      this.showCustomAlert('Login berhasil! 🎉', 'success');
      // Tidak perlu redirect manual — listener akan mengurusnya
    } catch (error) {
      console.error("❌ Login gagal:", error);
      if (error.code === "auth/user-not-found") {
        this.showCustomAlert("Akun tidak ditemukan. Silakan daftar dulu.", "error");
      } else if (error.code === "auth/wrong-password") {
        this.showCustomAlert("Password salah!", "error");
      } else if (error.code === "auth/invalid-email") {
        this.showCustomAlert("Format email tidak valid!", "error");
      } else {
        this.showCustomAlert("Terjadi kesalahan saat login.", "error");
      }
    }
  }

  // ============================
  // 📝 Fungsi Signup
  // ============================
  async handleSignupForm(e) {
    e.preventDefault();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value.trim();

    try {
      await createUserWithEmailAndPassword(this.auth, email, password);
      this.showCustomAlert('Pendaftaran berhasil! 🎉', 'success');
      // Redirect dihandle oleh listener
    } catch (error) {
      console.error("❌ Pendaftaran gagal:", error);
      this.showCustomAlert("Gagal mendaftar. Periksa data Anda.", "error");
    }
  }

  // ============================
  // 🚪 Logout
  // ============================
  async logout() {
    try {
      await signOut(this.auth);
      this.showCustomAlert('Berhasil logout ✅', 'success');
      setTimeout(() => (window.location.href = 'login.html'), 1000);
    } catch (error) {
      console.error("❌ Logout gagal:", error);
    }
  }

  // ============================
  // 👁️ Toggle Password
  // ============================
  setupPasswordToggle() {
    document.querySelectorAll('.password-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        const input = e.target.closest('.form-group').querySelector('input');
        if (input.type === 'password') {
          input.type = 'text';
          e.target.textContent = '🔒';
        } else {
          input.type = 'password';
          e.target.textContent = '👁️';
        }
      });
    });
  }

  // ============================
  // ⚡ Event Listener Form
  // ============================
  setupEventListeners() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginForm) loginForm.addEventListener('submit', (e) => this.handleLoginForm(e));
    if (signupForm) signupForm.addEventListener('submit', (e) => this.handleSignupForm(e));
    if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());
  }

  // ============================
  // 🪧 Alert Custom
  // ============================
  showCustomAlert(message, type = "info") {
    const alertBox = document.createElement("div");
    alertBox.className = `custom-alert ${type}`;
    alertBox.textContent = message;
    Object.assign(alertBox.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      background: type === "success" ? "#28a745" : (type === "error" ? "#dc3545" : "#007bff"),
      color: "#fff",
      padding: "10px 20px",
      borderRadius: "5px",
      boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
      zIndex: 10000,
      fontFamily: "Poppins, sans-serif"
    });
    document.body.appendChild(alertBox);
    setTimeout(() => alertBox.remove(), 3000);
  }
}

// ============================
//  🚀 INISIALISASI SISTEM AUTH
// ============================
document.addEventListener('DOMContentLoaded', () => {
  window.authSystem = new AuthSystem();
});

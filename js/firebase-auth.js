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
  apiKey: "AIzaSyApFkWDpEodKPHLzePFe0cc9z5kiMZbrS4",
  authDomain: "semart-5da85.firebaseapp.com",
  projectId: "semart-5da85",
  storageBucket: "semart-5da85.firebasestorage.app",
  messagingSenderId: "77585287575",
  appId: "1:77585287575:web:5f58edd85981264da25cd2"
};

// ============================
//  🚀 INISIALISASI FIREBASE - CEK SUDAH ADA ATAU BELUM
// ============================
let app, auth, db;

try {
  // Cek apakah Firebase sudah diinisialisasi
  if (!window.firebaseApp) {
    app = initializeApp(firebaseConfig);
    window.firebaseApp = app; // Simpan di global scope
    console.log('🔥 Firebase App initialized');
  } else {
    app = window.firebaseApp;
    console.log('🔥 Using existing Firebase App');
  }

  // Inisialisasi auth dan db
  auth = getAuth(app);
  db = getFirestore(app);
  
  // Set persistence
  setPersistence(auth, browserLocalPersistence);
  
  console.log('🔥 Auth & Firestore initialized');

} catch (error) {
  console.error('🔥 Firebase initialization error:', error);
}

// ============================
//  👤 AUTH SYSTEM CLASS
// ============================
class AuthSystem {
  constructor() {
    // Gunakan instance yang sudah diinisialisasi
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
      console.log('🔄 Auth state changed:', user ? 'User logged in' : 'User logged out');
      console.log('📄 Current page:', currentPage);

      if (user) {
        this.currentUser = user;
        console.log('✅ User signed in:', user.email);

        // Buat profil user kalau belum ada
        await this.checkAndCreateUserProfile(user);

        // Update navbar
        this.updateNavbarUI(true, user);

        // Trigger custom event untuk payment system
        this.triggerAuthStateChanged(user);

        // Redirect jika di halaman login/signup
        if (currentPage.includes('login.html') || currentPage.includes('signup.html')) {
          console.log('➡️ Redirect ke index.html setelah login');
          this.showCustomAlert('Login berhasil! 🎉', 'success');
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 1500);
        }
      } else {
        this.currentUser = null;
        console.log('🔐 User signed out');
        this.updateNavbarUI(false);
        
        // Trigger custom event untuk logout
        this.triggerAuthStateChanged(null);
      }
    });
  }

  /**
   * 🎯 Trigger custom event untuk auth state changes
   */
  triggerAuthStateChanged(user) {
    const event = new CustomEvent('authStateChanged', {
      detail: { user }
    });
    document.dispatchEvent(event);
    console.log('🎯 Auth state change event dispatched');
  }

  // ============================
  // 🧭 Update Navbar UI - UNIVERSAL
  // ============================
  updateNavbarUI(isLoggedIn, user = null) {
    const navAuth = document.getElementById('nav-auth');
    const userMenu = document.getElementById('user-menu');
    const userEmail = document.getElementById('user-email');
    const userName = document.getElementById('user-name');

    console.log('🔄 Updating navbar UI:', { isLoggedIn, user: user?.email });
    console.log('🔍 Elements found:', { navAuth: !!navAuth, userMenu: !!userMenu });

    if (!navAuth || !userMenu) {
      console.log('❌ Navbar elements not found - might be on payment page');
      return;
    }

    if (isLoggedIn && user) {
      navAuth.style.display = 'none';
      userMenu.style.display = 'block';

      if (userEmail) userEmail.textContent = user.email;

      if (userName) {
        const displayName = user.displayName || user.email.split('@')[0];
        userName.textContent = displayName;
      }

      console.log('✅ Navbar updated: User logged in');
    } else {
      navAuth.style.display = 'flex';
      userMenu.style.display = 'none';

      if (userEmail) userEmail.textContent = '';
      if (userName) userName.textContent = 'User';

      console.log('✅ Navbar updated: User logged out');
    }
  }

  // ============================
  // 🧱 Membuat Profil User di Firestore
  // ============================
  async checkAndCreateUserProfile(user) {
    try {
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
    } catch (error) {
      console.error("❌ Error membuat profil user:", error);
    }
  }

  // ============================
  // 🔑 Fungsi Login
  // ============================
  async handleLoginForm(e) {
    e.preventDefault();
    console.log('🔑 Attempting login...');
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!email || !password) {
      this.showCustomAlert('Harap isi email dan password!', 'error');
      return;
    }

    try {
      console.log('📧 Login attempt for:', email);
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      console.log('✅ Login successful for:', userCredential.user.email);
    } catch (error) {
      console.error("❌ Login gagal:", error);
      if (error.code === "auth/user-not-found") {
        this.showCustomAlert("Akun tidak ditemukan. Silakan daftar dulu.", "error");
      } else if (error.code === "auth/wrong-password") {
        this.showCustomAlert("Password salah!", "error");
      } else if (error.code === "auth/invalid-email") {
        this.showCustomAlert("Format email tidak valid!", "error");
      } else if (error.code === "auth/too-many-requests") {
        this.showCustomAlert("Terlalu banyak percobaan login. Coba lagi nanti.", "error");
      } else {
        this.showCustomAlert("Terjadi kesalahan saat login: " + error.message, "error");
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
    } catch (error) {
      console.error("❌ Pendaftaran gagal:", error);
      if (error.code === "auth/email-already-in-use") {
        this.showCustomAlert("Email sudah terdaftar. Silakan login.", "error");
      } else if (error.code === "auth/weak-password") {
        this.showCustomAlert("Password terlalu lemah. Minimal 6 karakter.", "error");
      } else {
        this.showCustomAlert("Gagal mendaftar: " + error.message, "error");
      }
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
      this.showCustomAlert("Logout gagal: " + error.message, "error");
    }
  }

  // ============================
  // 👁️ Toggle Password
  // ============================
  setupPasswordToggle() {
    document.querySelectorAll('.password-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        const input = e.target.closest('.password-wrapper').querySelector('input');
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
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signup-form');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginForm) {
      console.log('📝 Login form found, adding event listener');
      loginForm.addEventListener('submit', (e) => this.handleLoginForm(e));
    } else {
      console.log('❌ Login form not found');
    }
    
    if (signupForm) {
      console.log('📝 Signup form found, adding event listener');
      signupForm.addEventListener('submit', (e) => this.handleSignupForm(e));
    }
    
    if (logoutBtn) {
      console.log('🚪 Logout button found, adding event listener');
      logoutBtn.addEventListener('click', () => this.logout());
    }
  }

  // ============================
  // 🪧 Alert Custom
  // ============================
  showCustomAlert(message, type = "info") {
    const existingAlert = document.querySelector('.custom-alert');
    if (existingAlert) {
      existingAlert.remove();
    }

    const alertBox = document.createElement("div");
    alertBox.className = `custom-alert ${type}`;
    alertBox.textContent = message;
    Object.assign(alertBox.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      background: type === "success" ? "#28a745" : (type === "error" ? "#dc3545" : "#007bff"),
      color: "#fff",
      padding: "12px 24px",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      zIndex: 10000,
      fontFamily: "Poppins, sans-serif",
      fontSize: "14px",
      fontWeight: "500",
      maxWidth: "400px",
      wordWrap: "break-word"
    });
    document.body.appendChild(alertBox);
    setTimeout(() => alertBox.remove(), 4000);
  }
}

// ============================
//  🚀 INISIALISASI SISTEM AUTH
// ============================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔧 Initializing Auth System...');
  
  // Cek apakah auth system sudah diinisialisasi
  if (!window.authSystem) {
    window.authSystem = new AuthSystem();
    console.log('✅ Auth System initialized successfully');
  } else {
    console.log('✅ Auth System already initialized');
  }
});

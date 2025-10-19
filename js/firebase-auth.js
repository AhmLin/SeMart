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
    
    // Force update navbar saat pertama kali load
    setTimeout(() => {
      this.forceUpdateNavbar();
    }, 500);
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

        // Update navbar di semua halaman
        this.updateNavbarUI(true, user);

        // Redirect jika di halaman login/signup
        if (currentPage.includes('login.html') || currentPage.includes('signup.html')) {
          console.log('➡ Redirect ke index.html setelah login');
          this.showCustomAlert('Login berhasil! 🎉', 'success');
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 1500);
        }
      } else {
        this.currentUser = null;
        console.log('🔐 User signed out');

        // Update navbar di semua halaman
        this.updateNavbarUI(false);
        
        // Redirect ke login kalau di halaman yang butuh login
        const restrictedPages = ['profile.html', 'orders.html', 'wishlist.html'];
        if (restrictedPages.some(p => currentPage.includes(p))) {
          console.log('➡ Redirect ke login.html karena belum login');
          this.showCustomAlert('Harap login terlebih dahulu', 'error');
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 1000);
        }
      }
    });
  }

  // ============================
  // 🧭 Update Navbar UI - UNTUK SEMUA HALAMAN
  // ============================
  updateNavbarUI(isLoggedIn, user = null) {
    console.log('🔄 updateNavbarUI called:', { isLoggedIn, user: user?.email });
    
    // Cari semua kemungkinan element navbar di berbagai halaman
    const navAuth = document.getElementById('nav-auth');
    const userMenu = document.getElementById('user-menu');
    const userEmail = document.getElementById('user-email');
    const userName = document.getElementById('user-name');

    console.log('🔍 Navbar elements found:', {
      navAuth: !!navAuth,
      userMenu: !!userMenu,
      userEmail: !!userEmail,
      userName: !!userName
    });

    if (!navAuth || !userMenu) {
      console.log('❌ Navbar elements not found, mungkin halaman tidak memiliki navbar');
      return;
    }

    if (isLoggedIn && user) {
      // User sudah login - tampilkan user menu
      navAuth.style.display = 'none';
      userMenu.style.display = 'block';
      
      if (userEmail) {
        userEmail.textContent = user.email;
      }
      
      if (userName) {
        // Gunakan displayName jika ada, atau ambil dari email
        const displayName = user.displayName || user.email.split('@')[0];
        userName.textContent = displayName;
      }
      
      console.log('✅ Navbar updated: User logged in');
    } else {
      // User belum login - tampilkan tombol login/signup
      navAuth.style.display = 'flex';
      userMenu.style.display = 'none';
      
      if (userEmail) userEmail.textContent = '';
      if (userName) userName.textContent = 'User';
      
      console.log('✅ Navbar updated: User logged out');
    }
  }

  // ============================
  // 🔄 Force Update Navbar (untuk halaman yang sudah loaded)
  // ============================
  forceUpdateNavbar() {
    console.log('🔄 Force updating navbar...');
    
    if (this.currentUser) {
      console.log('🔍 Current user found, updating navbar to logged in state');
      this.updateNavbarUI(true, this.currentUser);
    } else {
      console.log('🔍 No current user, updating navbar to logged out state');
      this.updateNavbarUI(false);
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
          lastLogin: new Date().toISOString()
        });
        console.log("🆕 Profil user dibuat di Firestore");
      } else {
        // Update last login
        await setDoc(userRef, {
          lastLogin: new Date().toISOString()
        }, { merge: true });
        console.log("📄 Profil user sudah ada, lastLogin diperbarui");
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

    // Validasi input
    if (!email || !password) {
      this.showCustomAlert('Harap isi email dan password!', 'error');
      return;
    }

    try {
      console.log('📧 Login attempt for:', email);
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      console.log('✅ Login successful for:', userCredential.user.email);
      
      // Alert akan ditampilkan di auth state listener
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
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      console.log('✅ Signup successful for:', userCredential.user.email);
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
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
    } catch (error) {
      console.error("❌ Logout gagal:", error);
      this.showCustomAlert("Logout gagal: " + error.message, "error");
    }
  }

  // ============================
  // 👁 Toggle Password
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
          e.target.textContent = '👁';
        }
      });
    });
  }

  // ============================
  // ⚡ Event Listener Form - UNTUK SEMUA HALAMAN
  // ============================
  setupEventListeners() {
    // Login form - bisa di berbagai halaman
    const loginForm = document.getElementById('loginForm') || document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form') || document.getElementById('signupForm');
    const logoutBtn = document.getElementById('logout-btn');

    console.log('🔍 Setting up event listeners:', {
      loginForm: !!loginForm,
      signupForm: !!signupForm,
      logoutBtn: !!logoutBtn
    });

    if (loginForm) {
      console.log('📝 Login form found, adding event listener');
      loginForm.addEventListener('submit', (e) => this.handleLoginForm(e));
    }
    
    if (signupForm) {
      console.log('📝 Signup form found, adding event listener');
      signupForm.addEventListener('submit', (e) => this.handleSignupForm(e));
    }
    
    if (logoutBtn) {
      console.log('🚪 Logout button found, adding event listener');
      logoutBtn.addEventListener('click', () => this.logout());
    }

    // Tambahkan event listener untuk user profile dropdown
    this.setupUserDropdown();
  }

  // ============================
  // 🎯 Setup User Dropdown Behavior
  // ============================
  setupUserDropdown() {
    const userProfile = document.querySelector('.user-profile');
    if (userProfile) {
      userProfile.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = userProfile.querySelector('.user-dropdown');
        if (dropdown) {
          dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        }
      });

      // Close dropdown ketika klik di luar
      document.addEventListener('click', () => {
        const dropdown = document.querySelector('.user-dropdown');
        if (dropdown) {
          dropdown.style.display = 'none';
        }
      });
    }
  }

  // ============================
  // 🪧 Alert Custom
  // ============================
  showCustomAlert(message, type = "info") {
    // Hapus alert sebelumnya jika ada
    const existingAlert = document.querySelector('.custom-alert');
    if (existingAlert) {
      existingAlert.remove();
    }

    const alertBox = document.createElement("div");
    alertBox.className = custom-alert ${type};
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

  // ============================
  // 🔧 Utility Methods
  // ============================
  
  // Cek apakah user sudah login
  isLoggedIn() {
    return this.currentUser !== null;
  }

  // Dapatkan user data
  getUser() {
    return this.currentUser;
  }

  // Dapatkan user ID
  getUserId() {
    return this.currentUser ? this.currentUser.uid : null;
  }
}

// ============================
//  🚀 INISIALISASI SISTEM AUTH
// ============================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔧 Initializing Auth System...');
  window.authSystem = new AuthSystem();
});

// Export untuk penggunaan di file lain
export { AuthSystem, auth, db };

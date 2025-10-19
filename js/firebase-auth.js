import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

// 🔹 Konfigurasi Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCBVu1zFvBaFbItZYci9-R5mHzQkuEGadI",
    authDomain: "semart-login.firebaseapp.com",
    projectId: "semart-login",
    storageBucket: "semart-login.appspot.com",
    messagingSenderId: "986479825983",
    appId: "1:986479825983:web:cdb10a260e9d250a59a6ab"
};

// 🔹 Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

class UnifiedAuthSystem {
    constructor() {
        this.auth = auth;
        this.currentUser = null;
        this.init();
    }

    async init() {
        await this.clearFirebaseCacheIfNeeded(); // ✅ pastikan cache bersih dulu
        this.setupAuthStateListener();
        this.setupEventListeners();
    }

    // 🔧 Bersihkan cache Firebase agar tidak auto-login pakai sesi lama
    async clearFirebaseCacheIfNeeded() {
        // Jalankan hanya di login page agar tidak ganggu user aktif
        if (window.location.pathname.includes('login.html')) {
            try {
                console.log('🧹 Membersihkan cache Firebase...');
                Object.keys(localStorage).forEach((key) => {
                    if (key.includes('firebase') || key.includes('auth')) localStorage.removeItem(key);
                });
                sessionStorage.clear();

                if (window.indexedDB && window.indexedDB.databases) {
                    const dbs = await window.indexedDB.databases();
                    for (const db of dbs) {
                        if (db.name && db.name.includes('firebase')) {
                            await new Promise((resolve) => {
                                const req = window.indexedDB.deleteDatabase(db.name);
                                req.onsuccess = resolve;
                                req.onerror = resolve;
                                req.onblocked = resolve;
                            });
                        }
                    }
                }

                console.log('✅ Cache Firebase dibersihkan.');
            } catch (err) {
                console.warn('⚠️ Gagal hapus cache Firebase:', err);
            }
        }
    }

    // 🔹 Listener perubahan auth state
    setupAuthStateListener() {
        onAuthStateChanged(this.auth, async (user) => {
            if (user) {
                this.currentUser = user;
                console.log('✅ User signed in:', user.email);

                // Jangan redirect dari login page
                if (this.shouldRedirectToHome()) {
                    console.log('➡️ Redirect ke index.html');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 800);
                }

            } else {
                this.currentUser = null;
                console.log('🔐 User signed out');

                if (this.shouldRedirectToLogin()) {
                    console.log('➡️ Redirect ke login.html');
                    window.location.href = 'login.html';
                }
            }
        });
    }

    // 🔹 Setup semua event handler UI
    setupEventListeners() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLoginForm();
            });
        }

        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignupForm();
            });
        }

        const logoutButton = document.getElementById('logout-btn');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                this.logout();
            });
        }

        const resetButton = document.getElementById('reset-password-btn');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetPassword();
            });
        }
    }

    // 🔹 Login
    async handleLoginForm() {
        const email = document.getElementById('login-email')?.value.trim();
        const password = document.getElementById('login-password')?.value.trim();

        if (!email || !password) {
            alert('Masukkan email dan password!');
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            console.log('✅ Login berhasil:', userCredential.user.email);
            alert('Login berhasil!');
            setTimeout(() => (window.location.href = 'index.html'), 800);
        } catch (error) {
            console.error('❌ Login gagal:', error.message);
            alert('Login gagal: ' + error.message);
        }
    }

    // 🔹 Daftar akun baru
    async handleSignupForm() {
        const email = document.getElementById('signup-email')?.value.trim();
        const password = document.getElementById('signup-password')?.value.trim();

        if (!email || !password) {
            alert('Masukkan email dan password!');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            console.log('✅ Akun dibuat:', userCredential.user.email);
            alert('Akun berhasil dibuat!');
            setTimeout(() => (window.location.href = 'index.html'), 800);
        } catch (error) {
            console.error('❌ Signup gagal:', error.message);
            alert('Signup gagal: ' + error.message);
        }
    }

    // 🔹 Logout
    async logout() {
        try {
            await signOut(this.auth);
            console.log('👋 Logout berhasil');
            alert('Anda telah logout.');
            window.location.href = 'login.html';
        } catch (error) {
            console.error('❌ Gagal logout:', error.message);
        }
    }

    // 🔹 Reset password
    async resetPassword() {
        const email = document.getElementById('reset-email')?.value.trim();
        if (!email) {
            alert('Masukkan email untuk reset password!');
            return;
        }

        try {
            await sendPasswordResetEmail(this.auth, email);
            alert('Email reset password telah dikirim!');
        } catch (error) {
            console.error('❌ Gagal reset password:', error.message);
            alert('Gagal mengirim email reset password: ' + error.message);
        }
    }

    // 🔹 Redirect Logic
    shouldRedirectToHome() {
        // Hanya redirect dari halaman signup, bukan login
        return window.location.pathname.includes('signup.html');
    }

    shouldRedirectToLogin() {
        // Redirect hanya dari halaman terlindung
        return !window.location.pathname.includes('login.html') &&
               !window.location.pathname.includes('signup.html');
    }
}

// 🔹 Inisialisasi sistem auth
const unifiedAuth = new UnifiedAuthSystem();

export { unifiedAuth, auth };

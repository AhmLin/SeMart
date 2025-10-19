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

// Konfigurasi Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCBVu1zFvBaFbItZYci9-R5mHzQkuEGadI",
    authDomain: "semart-login.firebaseapp.com",
    projectId: "semart-login",
    storageBucket: "semart-login.appspot.com",
    messagingSenderId: "986479825983",
    appId: "1:986479825983:web:cdb10a260e9d250a59a6ab"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

class UnifiedAuthSystem {
    constructor() {
        this.auth = auth;
        this.currentUser = null;
        this.init();
    }

    init() {
        this.setupAuthStateListener();
        this.setupEventListeners();
    }

    setupAuthStateListener() {
        onAuthStateChanged(this.auth, async (user) => {
            if (user) {
                this.currentUser = user;
                console.log('✅ User signed in:', user.email);

                // Redirect hanya jika di signup page (bukan di login page)
                if (this.shouldRedirectToHome()) {
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);
                }

            } else {
                this.currentUser = null;
                console.log('🔐 User signed out');

                if (this.shouldRedirectToLogin()) {
                    window.location.href = 'login.html';
                }
            }
        });
    }

    setupEventListeners() {
        // Form login
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLoginForm();
            });
        }

        // Form signup
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignupForm();
            });
        }

        // Tombol logout
        const logoutButton = document.getElementById('logout-btn');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                this.logout();
            });
        }

        // Tombol reset password
        const resetButton = document.getElementById('reset-password-btn');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetPassword();
            });
        }
    }

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

            // Redirect ke halaman utama setelah login
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } catch (error) {
            console.error('❌ Login gagal:', error.message);
            alert('Login gagal: ' + error.message);
        }
    }

    async handleSignupForm() {
        const email = document.getElementById('signup-email')?.value.trim();
        const password = document.getElementById('signup-password')?.value.trim();

        if (!email || !password) {
            alert('Masukkan email dan password!');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            console.log('✅ Akun berhasil dibuat:', userCredential.user.email);
            alert('Akun berhasil dibuat!');

            // Redirect ke halaman utama setelah signup
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } catch (error) {
            console.error('❌ Signup gagal:', error.message);
            alert('Signup gagal: ' + error.message);
        }
    }

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

    // 🔧 Fungsi redirect — diperbaiki agar tidak auto-redirect dari login page
    shouldRedirectToHome() {
        // Hanya redirect dari halaman signup, bukan login
        return window.location.pathname.includes('signup.html');
    }

    shouldRedirectToLogin() {
        // Redirect ke login hanya jika bukan di login/signup
        return !window.location.pathname.includes('login.html') &&
               !window.location.pathname.includes('signup.html');
    }
}

// Inisialisasi sistem auth
const unifiedAuth = new UnifiedAuthSystem();

// Ekspor jika diperlukan oleh file lain
export { unifiedAuth, auth };

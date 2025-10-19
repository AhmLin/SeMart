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

// 🔥 IMPORT FIRESTORE
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";

// 🔹 Konfigurasi Firebase
const firebaseConfig = {
  apiKey: "AIzaSyApFkWDpEodKPHLzePFe0cc9z5kiMZbrS4",
  authDomain: "semart-5da85.firebaseapp.com",
  projectId: "semart-5da85",
  storageBucket: "semart-5da85.firebasestorage.app",
  messagingSenderId: "77585287575",
  appId: "1:77585287575:web:5f58edd85981264da25cd2"
};

// 🔹 Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // 🔥 INIT FIRESTORE

class UnifiedAuthSystem {
    constructor() {
        this.auth = auth;
        this.db = db; // 🔥 SIMPAN REFERENSI FIRESTORE
        this.currentUser = null;
        this.init();
    }

    async init() {
        await this.clearFirebaseCacheIfNeeded();
        this.setupAuthStateListener();
        this.setupEventListeners();
        this.setupPasswordToggle();
    }

    // 🔧 Bersihkan cache Firebase agar tidak auto-login pakai sesi lama
    async clearFirebaseCacheIfNeeded() {
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

                // 🔥 CEK DAN BUAT USER PROFILE DI FIRESTORE
                await this.checkAndCreateUserProfile(user);

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

    // 🔥 METHOD BARU: Cek dan buat profile user di Firestore
    async checkAndCreateUserProfile(user) {
        try {
            const userDocRef = doc(this.db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (!userDoc.exists()) {
                // User ada di Auth tapi tidak di Firestore, buat sekarang
                console.log('🔄 Creating user profile in Firestore...');
                
                const userData = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || '',
                    photoURL: user.photoURL || '',
                    createdAt: new Date().toISOString(),
                    lastLoginAt: new Date().toISOString(),
                    role: 'user',
                    isActive: true,
                    profileCompleted: false,
                    emailVerified: user.emailVerified,
                    preferences: {
                        theme: 'light',
                        notifications: true,
                        language: 'id'
                    },
                    statistics: {
                        loginCount: 1,
                        ordersCount: 0,
                        totalSpent: 0
                    }
                };
                
                await setDoc(userDocRef, userData);
                console.log('✅ User profile created in Firestore');
            } else {
                // Update last login time dan increment login count
                const currentData = userDoc.data();
                await updateDoc(userDocRef, {
                    lastLoginAt: new Date().toISOString(),
                    'statistics.loginCount': (currentData.statistics?.loginCount || 0) + 1
                });
                console.log('✅ Last login updated');
            }
        } catch (error) {
            console.error('❌ Error managing user profile:', error);
        }
    }

    // 🔥 METHOD: Buat user profile di Firestore (untuk signup)
    async createUserProfile(user, additionalData = {}) {
        const userData = {
            uid: user.uid,
            email: user.email,
            displayName: additionalData.displayName || '',
            photoURL: additionalData.photoURL || '',
            phoneNumber: additionalData.phoneNumber || '',
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            emailVerified: user.emailVerified,
            role: additionalData.role || 'user',
            isActive: true,
            profileCompleted: false,
            preferences: {
                theme: 'light',
                notifications: true,
                language: 'id'
            },
            statistics: {
                loginCount: 1,
                ordersCount: 0,
                totalSpent: 0
            }
        };
        
        await setDoc(doc(this.db, "users", user.uid), userData);
        return userData;
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

    // 👁️🔒 Setup toggle show/hide password
    setupPasswordToggle() {
        document.querySelectorAll('.password-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const input = e.target.closest('.form-group')?.querySelector('input[type="password"], input[type="text"]');
                if (!input) return;

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

    // 🔹 Login dengan error handling yang lebih baik
    async handleLoginForm() {
        const email = document.getElementById('login-email')?.value.trim();
        const password = document.getElementById('login-password')?.value.trim();
        const loginButton = document.querySelector('#login-form button[type="submit"]');

        const originalButtonText = loginButton?.textContent;

        try {
            // Show loading state
            if (loginButton) {
                loginButton.innerHTML = '🔄 Logging in...';
                loginButton.disabled = true;
            }

            if (!email || !password) {
                this.showCustomAlert('Masukkan email dan password!', 'error');
                return;
            }

            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;
            
            console.log('✅ Login berhasil:', user.email);

            // 🔥 UPDATE USER PROFILE DI FIRESTORE
            await this.checkAndCreateUserProfile(user);

            this.showCustomAlert('Login berhasil! 🎉', 'success');
            setTimeout(() => (window.location.href = 'index.html'), 1500);
            
        } catch (error) {
            console.error('❌ Login gagal:', error.code, error.message);
            
            let errorMessage = 'Terjadi kesalahan saat login';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = '❌ Akun tidak ditemukan\nEmail yang Anda masukkan belum terdaftar.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = '❌ Password salah\nSilakan periksa kembali password Anda.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = '❌ Format email tidak valid\nPastikan email ditulis dengan benar.';
                    break;
                case 'auth/invalid-credential':
                    errorMessage = '❌ Email atau password salah\nPeriksa kembali kredensial Anda.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = '❌ Terlalu banyak percobaan login\nAkses sementara diblokir. Coba lagi nanti.';
                    break;
                case 'auth/user-disabled':
                    errorMessage = '❌ Akun dinonaktifkan\nHubungi administrator untuk bantuan.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = '❌ Gagal terhubung ke internet\nPeriksa koneksi internet Anda.';
                    break;
                default:
                    errorMessage = `❌ Login gagal: ${error.message}`;
            }
            
            this.showCustomAlert(errorMessage, 'error');
        } finally {
            // Reset button state
            if (loginButton) {
                loginButton.textContent = originalButtonText;
                loginButton.disabled = false;
            }
        }
    }

    // 🔹 Daftar akun baru dengan save ke Firestore
    async handleSignupForm() {
        const email = document.getElementById('signup-email')?.value.trim();
        const password = document.getElementById('signup-password')?.value.trim();
        const signupButton = document.querySelector('#signup-form button[type="submit"]');

        const originalButtonText = signupButton?.textContent;

        try {
            // Show loading state
            if (signupButton) {
                signupButton.innerHTML = '🔄 Membuat Akun...';
                signupButton.disabled = true;
            }

            if (!email || !password) {
                this.showCustomAlert('Masukkan email dan password!', 'error');
                return;
            }

            // Validasi email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                this.showCustomAlert('Format email tidak valid!', 'error');
                return;
            }

            if (password.length < 6) {
                this.showCustomAlert('Password harus minimal 6 karakter!', 'error');
                return;
            }

            console.log('🔄 Creating user in Firebase Auth...');
            
            // 1. BUAT USER DI AUTHENTICATION
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;
            
            console.log('✅ Auth user created:', user.uid);

            // 2. SIMPAN DATA USER KE FIRESTORE
            console.log('💾 Saving user data to Firestore...');
            await this.createUserProfile(user);
            console.log('✅ User data saved to Firestore');

            this.showCustomAlert(
                '🎉 Akun berhasil dibuat!\n\n' +
                '✅ Email: ' + email + '\n' +
                '✅ User ID: ' + user.uid + '\n' +
                '✅ Data tersimpan di database\n\n' +
                'Mengarahkan ke login...',
                'success'
            );

            // Redirect ke login dengan auto-fill email
            setTimeout(() => {
                window.location.href = `login.html?prefill=${encodeURIComponent(email)}`;
            }, 3000);

        } catch (error) {
            console.error('❌ Signup error:', error.code, error.message);

            if (error.code === 'auth/email-already-in-use') {
                this.showCustomAlert(
                    '📧 Email sudah terdaftar!\n\n' +
                    'Silakan login atau gunakan email lain.',
                    'info'
                );

                // Tampilkan opsi untuk langsung login
                setTimeout(() => {
                    const goToLogin = confirm(
                        'Email sudah terdaftar. Mau langsung ke halaman login?'
                    );
                    if (goToLogin) {
                        window.location.href = `login.html?prefill=${encodeURIComponent(email)}`;
                    }
                }, 1500);

            } else {
                let errorMessage = 'Terjadi kesalahan saat mendaftar';
                
                switch (error.code) {
                    case 'auth/weak-password':
                        errorMessage = '❌ Password terlalu lemah\nPassword harus minimal 6 karakter.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = '❌ Format email tidak valid\nContoh: email@domain.com';
                        break;
                    case 'auth/network-request-failed':
                        errorMessage = '❌ Gagal terhubung ke internet\nPeriksa koneksi Anda.';
                        break;
                    case 'auth/operation-not-allowed':
                        errorMessage = '❌ Pendaftaran dinonaktifkan\nHubungi administrator untuk bantuan.';
                        break;
                    default:
                        errorMessage = `❌ Gagal mendaftar: ${error.message}`;
                }
                
                this.showCustomAlert(errorMessage, 'error');
            }
        } finally {
            // Reset button state
            if (signupButton) {
                signupButton.textContent = originalButtonText;
                signupButton.disabled = false;
            }
        }
    }

    // 🔹 Logout
    async logout() {
        try {
            await signOut(this.auth);
            console.log('👋 Logout berhasil');
            this.showCustomAlert('Anda telah logout. Sampai jumpa! 👋', 'info');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } catch (error) {
            console.error('❌ Gagal logout:', error.message);
            this.showCustomAlert('Gagal logout: ' + error.message, 'error');
        }
    }

    // 🔹 Reset password
    async resetPassword() {
        const email = document.getElementById('reset-email')?.value.trim();
        if (!email) {
            this.showCustomAlert('Masukkan email untuk reset password!', 'error');
            return;
        }

        try {
            await sendPasswordResetEmail(this.auth, email);
            this.showCustomAlert('📧 Email reset password telah dikirim!\nPeriksa inbox email Anda.', 'success');
        } catch (error) {
            console.error('❌ Gagal reset password:', error.code, error.message);
            
            let errorMessage = 'Gagal mengirim email reset password';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = '❌ Email tidak terdaftar\nEmail yang Anda masukkan tidak ditemukan.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = '❌ Format email tidak valid\nPastikan email ditulis dengan benar.';
                    break;
                default:
                    errorMessage = `❌ Gagal reset password: ${error.message}`;
            }
            
            this.showCustomAlert(errorMessage, 'error');
        }
    }

    // 🔹 Custom Alert yang lebih user-friendly
    showCustomAlert(message, type = 'info') {
        // Hapus alert sebelumnya jika ada
        const existingAlert = document.querySelector('.custom-auth-alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        // Buat element alert baru
        const alertDiv = document.createElement('div');
        alertDiv.className = `custom-auth-alert alert-${type}`;
        
        // Tentukan icon berdasarkan type
        let icon = '💡';
        let bgColor = '#007b5e';
        let borderColor = '#005f46';
        
        switch (type) {
            case 'success':
                icon = '✅';
                bgColor = '#28a745';
                borderColor = '#1e7e34';
                break;
            case 'error':
                icon = '❌';
                bgColor = '#dc3545';
                borderColor = '#c82333';
                break;
            case 'warning':
                icon = '⚠️';
                bgColor = '#ffc107';
                borderColor = '#e0a800';
                break;
            case 'info':
                icon = 'ℹ️';
                bgColor = '#007b5e';
                borderColor = '#005f46';
                break;
        }

        // Styling untuk alert
        alertDiv.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
            border-left: 4px solid ${borderColor};
            font-family: 'Poppins', sans-serif;
            font-size: 14px;
            line-height: 1.5;
            white-space: pre-line;
        `;

        alertDiv.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 10px;">
                <span style="font-size: 1.2rem; flex-shrink: 0;">${icon}</span>
                <span>${message}</span>
            </div>
        `;

        // Tambahkan animasi jika belum ada
        if (!document.querySelector('#alert-animations')) {
            const style = document.createElement('style');
            style.id = 'alert-animations';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(alertDiv);

        // Auto remove setelah 5 detik
        setTimeout(() => {
            alertDiv.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.parentNode.removeChild(alertDiv);
                }
            }, 300);
        }, 5000);
    }

    // 🔹 Redirect Logic
    shouldRedirectToHome() {
        return window.location.pathname.includes('signup.html') || 
               window.location.pathname.includes('login.html');
    }

    shouldRedirectToLogin() {
        return window.location.pathname.includes('profile.html') ||
               window.location.pathname.includes('orders.html') ||
               window.location.pathname.includes('wishlist.html');
    }

    // 🔥 METHOD TAMBAHAN: Get user data from Firestore
    async getUserData(uid) {
        try {
            const userDoc = await getDoc(doc(this.db, "users", uid));
            if (userDoc.exists()) {
                return userDoc.data();
            }
            return null;
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    }

    // 🔥 METHOD TAMBAHAN: Update user profile
    async updateUserProfile(uid, updateData) {
        try {
            await updateDoc(doc(this.db, "users", uid), updateData);
            console.log('✅ User profile updated');
            return true;
        } catch (error) {
            console.error('Error updating user profile:', error);
            return false;
        }
    }
}

// 🔹 Inisialisasi sistem auth
const unifiedAuth = new UnifiedAuthSystem();

// 🔥 AUTO-FILL EMAIL DI LOGIN PAGE
function autoFillEmailFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const prefillEmail = urlParams.get('prefill');
    
    if (prefillEmail) {
        const emailInput = document.getElementById('login-email');
        if (emailInput) {
            emailInput.value = decodeURIComponent(prefillEmail);
            // Focus ke password field
            document.getElementById('login-password')?.focus();
        }
    }
}

// Jalakan auto-fill ketika halaman dimuat
document.addEventListener('DOMContentLoaded', autoFillEmailFromURL);

export { unifiedAuth, auth, db };

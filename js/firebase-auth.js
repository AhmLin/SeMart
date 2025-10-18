// firebase-auth.js - SIMPLIFIED VERSION
import { 
    auth, 
    db 
} from './firebase-config.js';

import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    serverTimestamp,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";

class FirebaseAuthSystem {
    constructor() {
        this.currentUser = null;
        this.auth = auth;
        this.db = db;
        this.init();
    }

    init() {
        console.log('🔥 Firebase Auth System Initialized');
        this.setupAuthStateListener();
        this.setupEventListeners();
    }

    // 🔐 AUTH STATE LISTENER
    setupAuthStateListener() {
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                console.log('✅ User logged in:', user.email);
                this.currentUser = user;
                this.updateUI();
            } else {
                console.log('🔐 No user logged in');
                this.currentUser = null;
                this.updateUI();
            }
        });
    }

    // 📝 REGISTER NEW USER
    async register(userData) {
        try {
            console.log('👤 Attempting registration:', userData.email);

            // Validasi
            if (!this.validateEmail(userData.email)) {
                throw new Error('Format email tidak valid');
            }

            if (userData.password.length < 6) {
                throw new Error('Password harus minimal 6 karakter');
            }

            if (userData.password !== userData.confirmPassword) {
                throw new Error('Konfirmasi password tidak cocok');
            }

            // Create user di Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(
                this.auth,
                userData.email, 
                userData.password
            );
            const user = userCredential.user;

            console.log('✅ User auth created:', user.email);

            // Save user profile ke Firestore
            const userProfile = {
                name: userData.name,
                email: userData.email.toLowerCase().trim(),
                phone: userData.phone,
                birthDate: userData.birthDate,
                address: userData.address || '',
                role: 'customer',
                isActive: true,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                addresses: [{
                    id: 'addr_1',
                    name: 'Alamat Utama',
                    address: userData.address || 'Alamat belum diisi',
                    isPrimary: true,
                    createdAt: new Date().toISOString()
                }]
            };

            const userDoc = doc(this.db, 'users', user.uid);
            await setDoc(userDoc, userProfile);

            console.log('✅ User profile saved to Firestore');
            this.showToast('Registrasi berhasil! 🎉', 'success');
            
            // Redirect ke login setelah 2 detik
            setTimeout(() => {
                if (window.location.pathname.includes('signup.html')) {
                    window.location.href = 'login.html';
                }
            }, 2000);

            return user;

        } catch (error) {
            console.error('❌ Registration error:', error);
            const errorMessage = this.getFirebaseErrorMessage(error.code);
            this.showToast(errorMessage, 'error');
            throw error;
        }
    }

    // 🔐 LOGIN USER
    async login(email, password) {
        try {
            console.log('🔐 Attempting login:', email);

            const userCredential = await signInWithEmailAndPassword(
                this.auth, 
                email, 
                password
            );
            const user = userCredential.user;

            // Update last login
            const userDoc = doc(this.db, 'users', user.uid);
            await updateDoc(userDoc, {
                lastLogin: serverTimestamp()
            });

            console.log('✅ Login successful:', user.email);
            this.showToast(`Selamat datang kembali! 🎉`, 'success');

            // Redirect ke home setelah 1.5 detik
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);

            return user;

        } catch (error) {
            console.error('❌ Login error:', error);
            const errorMessage = this.getFirebaseErrorMessage(error.code);
            this.showToast(errorMessage, 'error');
            throw error;
        }
    }

    // 🚪 LOGOUT
    async logout() {
        try {
            await signOut(this.auth);
            this.showToast('Berhasil logout 👋', 'info');
            
            // Redirect ke home page
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
            
        } catch (error) {
            console.error('❌ Logout error:', error);
            this.showToast('Gagal logout', 'error');
        }
    }

    // ❓ FIREBASE ERROR MESSAGES
    getFirebaseErrorMessage(errorCode) {
        const errorMessages = {
            'auth/email-already-in-use': 'Email sudah terdaftar',
            'auth/invalid-email': 'Format email tidak valid',
            'auth/weak-password': 'Password terlalu lemah (minimal 6 karakter)',
            'auth/user-not-found': 'Email tidak terdaftar',
            'auth/wrong-password': 'Password salah',
            'auth/invalid-credential': 'Email atau password salah',
            'auth/too-many-requests': 'Terlalu banyak percobaan gagal. Coba lagi nanti',
            'auth/network-request-failed': 'Koneksi internet bermasalah'
        };
        
        return errorMessages[errorCode] || 'Terjadi kesalahan. Coba lagi.';
    }

    // ✅ VALIDATION
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // 🎨 UI METHODS
    setupEventListeners() {
        // Password toggle
        document.querySelectorAll('.password-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const formGroup = e.target.closest('.form-group');
                const passwordInput = formGroup.querySelector('input[type="password"], input[type="text"]');
                
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    e.target.textContent = '🔒';
                } else {
                    passwordInput.type = 'password';
                    e.target.textContent = '👁️';
                }
            });
        });

        // Setup birthdate limits
        this.setupBirthdateLimits();
    }

    setupBirthdateLimits() {
        const birthdateInput = document.getElementById('signup-birthdate');
        if (birthdateInput) {
            const maxDate = new Date();
            maxDate.setFullYear(maxDate.getFullYear() - 13);
            birthdateInput.max = maxDate.toISOString().split('T')[0];
            
            const minDate = new Date();
            minDate.setFullYear(minDate.getFullYear() - 100);
            birthdateInput.min = minDate.toISOString().split('T')[0];
        }
    }

    updateUI() {
        const navAuth = document.getElementById('nav-auth');
        const userMenu = document.getElementById('user-menu');
        const userGreeting = document.getElementById('user-greeting');

        if (this.currentUser) {
            if (navAuth) navAuth.style.display = 'none';
            if (userMenu) userMenu.style.display = 'block';
            if (userGreeting) {
                const userName = this.currentUser.email.split('@')[0];
                userGreeting.textContent = `Halo, ${userName}!`;
            }
        } else {
            if (navAuth) navAuth.style.display = 'flex';
            if (userMenu) userMenu.style.display = 'none';
        }
    }

    showToast(message, type = 'info') {
        // Remove existing toasts
        document.querySelectorAll('.auth-toast').forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `auth-toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-message">${message}</span>
            </div>
        `;
        
        toast.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${this.getToastColor(type)};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    getToastColor(type) {
        const colors = {
            success: '#28a745',
            error: '#dc3545', 
            warning: '#ffc107',
            info: '#007b5e'
        };
        return colors[type] || '#007b5e';
    }

    // 🔹 AUTH STATUS
    isLoggedIn() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// 🎯 PAGE HANDLERS
class PageAuthHandlers {
    constructor(authSystem) {
        this.auth = authSystem;
        this.setupPageHandlers();
    }

    setupPageHandlers() {
        // Login Page
        const loginForm = document.getElementById('loginForm');
        if (loginForm && window.location.pathname.includes('login.html')) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Signup Page  
        const signupForm = document.getElementById('signup-form');
        if (signupForm && window.location.pathname.includes('signup.html')) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignup();
            });
        }

        // Logout Handler
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.auth.logout();
            });
        }
    }

    async handleLogin() {
        const email = document.getElementById('email')?.value;
        const password = document.getElementById('password')?.value;
        const submitBtn = document.querySelector('#loginForm .btn-primary');

        if (!email || !password) {
            this.auth.showToast('Email dan password harus diisi', 'error');
            return;
        }

        const originalText = submitBtn?.textContent || 'Masuk';

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Memproses...';
            }

            await this.auth.login(email, password);
            
        } catch (error) {
            // Error sudah dihandle
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    }

    async handleSignup() {
        const formData = {
            name: document.getElementById('signup-name')?.value,
            email: document.getElementById('signup-email')?.value,
            phone: document.getElementById('signup-phone')?.value,
            birthDate: document.getElementById('signup-birthdate')?.value,
            address: document.getElementById('signup-address')?.value || '',
            password: document.getElementById('signup-password')?.value,
            confirmPassword: document.getElementById('signup-confirm-password')?.value
        };

        const submitBtn = document.querySelector('#signup-form .btn-primary');
        const originalText = submitBtn?.textContent || 'Daftar';

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Mendaftarkan...';
            }

            await this.auth.register(formData);
            
        } catch (error) {
            // Error sudah dihandle
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    }
}

// 🚀 INITIALIZE
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Auth System
    window.semartAuth = new FirebaseAuthSystem();
    window.pageAuth = new PageAuthHandlers(window.semartAuth);
    
    console.log('🔥 SeMart Firebase Auth Ready!');
});

// Export untuk penggunaan di file lain
export { FirebaseAuthSystem };

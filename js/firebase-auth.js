// 🔹 UNIFIED AUTH SYSTEM - FIREBASE VERSION
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

class UnifiedAuthSystem {
    constructor() {
        this.currentUser = null;
        this.auth = auth;
        this.db = db;
        this.isInitialized = false;
        this.init();
    }

    async init() {
        if (this.isInitialized) return;
        
        console.log('🔐 Initializing Unified Auth System...');
        
        try {
            // Setup Firebase auth state listener
            this.setupAuthStateListener();
            
            // Setup UI listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Unified Auth System initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize auth system:', error);
        }
    }

    setupAuthStateListener() {
        onAuthStateChanged(this.auth, async (user) => {
            if (user) {
                this.currentUser = user;
                console.log('✅ User signed in:', user.email);
                
                // Redirect jika di login/signup page
                if (this.shouldRedirectToHome()) {
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);
                }
            } else {
                this.currentUser = null;
                console.log('🔐 User signed out');
                
                // Redirect ke login jika di protected page
                if (this.shouldRedirectToLogin()) {
                    window.location.href = 'login.html';
                }
            }
            
            // Update UI setelah auth state berubah
            this.updateNavbarUI();
        });
    }

    setupEventListeners() {
        // Global logout handler
        document.addEventListener('click', (e) => {
            if (e.target.id === 'logout-btn' || e.target.closest('#logout-btn')) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🚪 Logout triggered');
                this.logout();
            }
        });

        // Page-specific form handlers
        this.setupPageSpecificHandlers();
        
        // Password toggle
        this.setupPasswordToggle();
    }

    setupPageSpecificHandlers() {
        // Login page handler
        const loginForm = document.getElementById('loginForm');
        if (loginForm && window.location.pathname.includes('login.html')) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLoginForm();
            });
        }

        // Signup page handler  
        const signupForm = document.getElementById('signup-form');
        if (signupForm && window.location.pathname.includes('signup.html')) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignupForm();
            });
        }
    }

    // 🔹 AUTH METHODS
    async register(userData) {
        const { name, email, phone, birthDate, address, password, confirmPassword } = userData;

        try {
            // Validation
            this.validateRegistrationData(userData);

            // Check email availability
            const existingUser = await this.getUserByEmail(email);
            if (existingUser) {
                throw new Error('Email sudah terdaftar');
            }

            // Create Firebase auth user
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;

            // Create user profile in Firestore
            const userProfile = {
                name: this.sanitizeInput(name),
                email: email.toLowerCase().trim(),
                phone: phone.replace(/\D/g, ''),
                birthDate,
                address: address ? this.sanitizeInput(address) : '',
                role: 'customer',
                isVerified: false,
                isActive: true,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            await this.saveUser(user.uid, userProfile);

            this.showToast('Registrasi berhasil! Silakan login.', 'success');
            
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            
            return user;

        } catch (error) {
            console.error('❌ Registration failed:', error);
            const errorMessage = this.getFirebaseErrorMessage(error.code) || error.message;
            this.showToast(errorMessage, 'error');
            throw error;
        }
    }

    async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;

            // Update last login
            await this.saveUser(user.uid, {
                lastLogin: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            this.showToast('Login berhasil!', 'success');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            
            return user;

        } catch (error) {
            console.error('❌ Login failed:', error);
            const errorMessage = this.getFirebaseErrorMessage(error.code);
            this.showToast(errorMessage, 'error');
            throw error;
        }
    }

    async logout() {
        try {
            await signOut(this.auth);
            this.currentUser = null;
            
            this.showToast('Berhasil logout!', 'info');
            
            // UI akan diupdate otomatis oleh auth state listener
            
        } catch (error) {
            console.error('❌ Logout failed:', error);
            this.showToast('Gagal logout', 'error');
        }
    }

    // 🔹 UI MANAGEMENT - SINGLE SOURCE OF TRUTH
    updateNavbarUI() {
        const navAuth = document.getElementById('nav-auth');
        const userMenu = document.getElementById('user-menu');
        const userGreeting = document.getElementById('user-greeting');

        if (!navAuth || !userMenu) {
            console.log('⚠️ Navbar elements not ready');
            return;
        }

        const isLoggedIn = this.isLoggedIn();
        
        console.log('🔄 Updating navbar - Logged in:', isLoggedIn);

        if (isLoggedIn) {
            // User logged in - show user menu
            navAuth.style.display = 'none';
            userMenu.style.display = 'block';
            
            // Update greeting
            if (userGreeting) {
                const userData = this.getUserData();
                userGreeting.textContent = `Halo, ${userData.name}!`;
            }
        } else {
            // User not logged in - show login button
            navAuth.style.display = 'flex';
            userMenu.style.display = 'none';
        }
    }

    // 🔹 FIREBASE FIRESTORE METHODS
    async getUsers() {
        try {
            const usersRef = collection(this.db, 'users');
            const querySnapshot = await getDocs(usersRef);
            const users = [];
            querySnapshot.forEach((doc) => {
                users.push({ id: doc.id, ...doc.data() });
            });
            return users;
        } catch (error) {
            console.error('❌ Error reading users data:', error);
            return [];
        }
    }

    async getUserByEmail(email) {
        try {
            const usersRef = collection(this.db, 'users');
            const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('❌ Error getting user by email:', error);
            return null;
        }
    }

    async saveUser(userId, userData) {
        try {
            const userRef = doc(this.db, 'users', userId);
            await setDoc(userRef, userData, { merge: true });
            console.log('💾 User saved:', userId);
        } catch (error) {
            console.error('❌ Error saving user:', error);
            throw error;
        }
    }

    // 🔹 VALIDATION METHODS
    validateRegistrationData(userData) {
        const { name, email, phone, birthDate, password, confirmPassword } = userData;

        if (!name?.trim()) throw new Error('Nama harus diisi');
        if (!email?.trim()) throw new Error('Email harus diisi');
        if (!this.validateEmail(email)) throw new Error('Format email tidak valid');
        if (!phone?.trim()) throw new Error('Nomor HP harus diisi');
        if (!this.validatePhone(phone)) throw new Error('Format nomor HP tidak valid');
        if (!birthDate) throw new Error('Tanggal lahir harus diisi');
        
        const age = this.calculateAge(birthDate);
        if (age < 13) throw new Error('Minimal usia 13 tahun');
        if (age > 100) throw new Error('Tanggal lahir tidak valid');
        
        if (!password) throw new Error('Password harus diisi');
        if (!this.validatePassword(password)) throw new Error('Password minimal 6 karakter');
        if (!confirmPassword) throw new Error('Konfirmasi password harus diisi');
        if (password !== confirmPassword) throw new Error('Konfirmasi password tidak cocok');

        const agreeTerms = document.getElementById('agree-terms');
        if (agreeTerms && !agreeTerms.checked) {
            throw new Error('Anda harus menyetujui Syarat & Ketentuan');
        }
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePhone(phone) {
        const cleanedPhone = phone.replace(/\D/g, '');
        return cleanedPhone.length >= 10 && cleanedPhone.length <= 13;
    }

    validatePassword(password) {
        return password.length >= 6;
    }

    calculateAge(birthDate) {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }

    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .trim();
    }

    // 🔹 PAGE HANDLERS
    async handleLoginForm() {
        const email = document.getElementById('email')?.value;
        const password = document.getElementById('password')?.value;
        const submitBtn = document.querySelector('#loginForm .btn-primary');

        if (!email || !password) {
            this.showToast('Email dan password harus diisi', 'error');
            return;
        }

        try {
            this.toggleButtonLoading(submitBtn, true, 'Memproses...');
            await this.login(email, password);
        } catch (error) {
            // Error already handled in login method
        } finally {
            this.toggleButtonLoading(submitBtn, false, 'Masuk');
        }
    }

    async handleSignupForm() {
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

        try {
            this.toggleButtonLoading(submitBtn, true, 'Mendaftarkan...');
            await this.register(formData);
        } catch (error) {
            // Error already handled in register method
        } finally {
            this.toggleButtonLoading(submitBtn, false, 'Daftar');
        }
    }

    // 🔹 UTILITY METHODS
    setupPasswordToggle() {
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
    }

    toggleButtonLoading(button, isLoading, originalText) {
        if (!button) return;
        
        if (isLoading) {
            button.disabled = true;
            button.textContent = 'Memproses...';
            button.classList.add('loading');
        } else {
            button.disabled = false;
            button.textContent = originalText;
            button.classList.remove('loading');
        }
    }

    shouldRedirectToHome() {
        return window.location.pathname.includes('login.html') || 
               window.location.pathname.includes('signup.html');
    }

    shouldRedirectToLogin() {
        // Add protected pages here
        return window.location.pathname.includes('profile.html') ||
               window.location.pathname.includes('orders.html');
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getUserData() {
        if (this.currentUser) {
            return {
                name: this.currentUser.displayName || this.currentUser.email.split('@')[0],
                email: this.currentUser.email
            };
        }
        return { name: 'User', email: '' };
    }

    // 🔹 ERROR HANDLING
    getFirebaseErrorMessage(errorCode) {
        const errorMessages = {
            'auth/email-already-in-use': 'Email sudah terdaftar',
            'auth/invalid-email': 'Format email tidak valid',
            'auth/weak-password': 'Password terlalu lemah',
            'auth/user-not-found': 'Email tidak terdaftar',
            'auth/wrong-password': 'Password salah',
            'auth/invalid-credential': 'Email atau password salah',
            'auth/too-many-requests': 'Terlalu banyak percobaan gagal',
            'auth/user-disabled': 'Akun dinonaktifkan',
            'auth/network-request-failed': 'Koneksi internet bermasalah'
        };
        
        return errorMessages[errorCode] || null;
    }

    // 🔹 NOTIFICATION SYSTEM
    showToast(message, type = 'info') {
        // Remove existing toasts
        document.querySelectorAll('.auth-toast').forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `auth-toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${this.getToastIcon(type)}</span>
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
            border-left: 4px solid ${this.getToastBorderColor(type)};
            font-family: 'Poppins', sans-serif;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }

    getToastIcon(type) {
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        return icons[type] || '💡';
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

    getToastBorderColor(type) {
        const colors = {
            success: '#1e7e34',
            error: '#c82333',
            warning: '#e0a800', 
            info: '#005f46'
        };
        return colors[type] || '#005f46';
    }
}

// 🔹 SINGLE GLOBAL INSTANCE
let unifiedAuth;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        unifiedAuth = new UnifiedAuthSystem();
        window.semartAuth = unifiedAuth; // SINGLE GLOBAL INSTANCE
        
        // Remove conflicting systems
        delete window.simpleAuthFix;
        delete window.globalAuth;
        
        console.log('✅ Unified Auth System loaded');
        
    } catch (error) {
        console.error('❌ Failed to load auth system:', error);
    }
});

export { UnifiedAuthSystem };

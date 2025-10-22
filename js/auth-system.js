// auth-system.js - FINAL VERSION
// 🔐 UNIFIED AUTHENTICATION SYSTEM FOR SEMART
// Support: Login, Register, Logout, Session Management

import { 
    auth, 
    db 
} from './firebase-config.js';

import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserSessionPersistence,
    updateProfile
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

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
        this.auth = auth;
        this.db = db;
        this.isInitialized = false;
        this.isLoggingOut = false;
        this.init();
    }

    async init() {
        if (this.isInitialized) return;
        
        console.log('🔐 Initializing Auth System...');
        
        try {
            // Set persistence to SESSION only (bukan LOCAL)
            await setPersistence(this.auth, browserSessionPersistence);
            console.log('✅ Auth persistence set to SESSION');
            
            // Setup auth state listener
            this.setupAuthStateListener();
            
            // Setup event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Auth System initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize auth system:', error);
        }
    }

    setupAuthStateListener() {
        onAuthStateChanged(this.auth, async (user) => {
            console.log('🔄 Auth state changed:', user ? user.email : 'No user');
            
            // Skip jika sedang proses logout
            if (this.isLoggingOut) {
                console.log('⏸️ Skipping auth change during logout');
                return;
            }

            if (user) {
                this.currentUser = user;
                console.log('✅ User authenticated:', user.email);
                
                // Load user profile dari Firestore
                await this.loadUserProfile(user.uid);
                
                // Redirect jika di login/signup page
                if (this.isAuthPage()) {
                    this.showToast('Anda sudah login!', 'info');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                    return;
                }
                
            } else {
                this.currentUser = null;
                this.userProfile = null;
                console.log('🔐 User signed out');
                
                // Redirect ke login jika di protected page
                if (this.isProtectedPage()) {
                    this.showToast('Silakan login terlebih dahulu', 'info');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 1500);
                    return;
                }
            }
            
            // Update UI
            this.updateUI();
        });
    }

    setupEventListeners() {
        // Global logout handler
        document.addEventListener('click', (e) => {
            const logoutBtn = e.target.closest('#logout-btn');
            if (logoutBtn) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🚪 Logout button clicked');
                this.logout();
            }
        });

        // Page-specific handlers
        this.setupPageHandlers();
        
        // Password toggle
        this.setupPasswordToggle();
    }

    setupPageHandlers() {
        // Login page
        const loginForm = document.getElementById('loginForm');
        if (loginForm && this.isLoginPage()) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Register page
        const registerForm = document.getElementById('signup-form');
        if (registerForm && this.isRegisterPage()) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }
    }

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

    // 🔹 AUTH METHODS
    async register(userData) {
        const { name, email, phone, birthDate, address, password, confirmPassword } = userData;

        console.log('👤 Registration attempt:', { email, name });

        try {
            // Validasi data
            this.validateRegistrationData(userData);

            // Cek email availability
            const existingUser = await this.getUserByEmail(email);
            if (existingUser) {
                throw new Error('Email sudah terdaftar');
            }

            // Buat user di Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;

            console.log('✅ User auth created:', user.email);

            // Update profile name
            await updateProfile(user, {
                displayName: name
            });

            // Buat user profile di Firestore
            const userProfile = {
                name: this.sanitizeInput(name),
                email: email.toLowerCase().trim(),
                phone: this.sanitizePhone(phone),
                birthDate,
                address: address ? this.sanitizeInput(address) : '',
                role: 'customer',
                isVerified: false,
                isActive: true,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                updatedAt: serverTimestamp(),
                preferences: {
                    newsletter: true,
                    promotions: true,
                    notifications: true
                }
            };

            await this.saveUserProfile(user.uid, userProfile);

            console.log('✅ User registered successfully');
            
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
        console.log('🔐 Login attempt:', email);
    
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;

            // Update last login
            await this.saveUserProfile(user.uid, {
                lastLogin: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            console.log('✅ Login successful:', user.email);
            this.showToast(`Selamat datang kembali! 🎉`, 'success');
            
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
        if (this.isLoggingOut) {
            console.log('⚠️ Logout already in progress');
            return;
        }

        this.isLoggingOut = true;
        console.log('🚪 Starting logout process...');

        try {
            // 1. Clear UI first
            this.forceLogoutUI();
            
            // 2. Clear local data
            this.clearLocalData();
            
            // 3. Firebase sign out
            await signOut(this.auth);
            console.log('✅ Firebase signOut successful');
            
            this.showToast('Berhasil logout! Sampai jumpa 👋', 'success');
            
            // 4. Redirect ke home
            setTimeout(() => {
                this.isLoggingOut = false;
                window.location.href = 'index.html';
            }, 1000);
            
        } catch (error) {
            console.error('❌ Logout failed:', error);
            this.isLoggingOut = false;
            this.showToast('Gagal logout', 'error');
        }
    }

    // 🔹 USER PROFILE METHODS
    async loadUserProfile(uid) {
        try {
            const userDoc = await getDoc(doc(this.db, 'users', uid));
            if (userDoc.exists()) {
                this.userProfile = { id: userDoc.id, ...userDoc.data() };
                console.log('✅ User profile loaded:', this.userProfile.name);
            } else {
                console.log('⚠️ User profile not found in Firestore');
            }
        } catch (error) {
            console.error('❌ Failed to load user profile:', error);
        }
    }

    async saveUserProfile(uid, userData) {
        try {
            const userRef = doc(this.db, 'users', uid);
            await setDoc(userRef, userData, { merge: true });
            console.log('💾 User profile saved:', uid);
        } catch (error) {
            console.error('❌ Failed to save user profile:', error);
            throw error;
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

    // 🔹 VALIDATION METHODS
    validateRegistrationData(userData) {
        const { name, email, phone, birthDate, password, confirmPassword } = userData;

        if (!name?.trim()) throw new Error('Nama harus diisi');
        if (!email?.trim()) throw new Error('Email harus diisi');
        if (!this.validateEmail(email)) throw new Error('Format email tidak valid');
        if (!phone?.trim()) throw new Error('Nomor HP harus diisi');
        if (!this.validatePhone(phone)) throw new Error('Format nomor HP tidak valid (10-13 digit)');
        if (!birthDate) throw new Error('Tanggal lahir harus diisi');
        
        const age = this.calculateAge(birthDate);
        if (age < 13) throw new Error('Anda harus berusia minimal 13 tahun');
        if (age > 100) throw new Error('Tanggal lahir tidak valid');
        
        if (!password) throw new Error('Password harus diisi');
        if (!this.validatePassword(password)) throw new Error('Password harus minimal 6 karakter');
        if (!confirmPassword) throw new Error('Konfirmasi password harus diisi');
        if (password !== confirmPassword) throw new Error('Konfirmasi password tidak cocok');

        // Cek terms agreement
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
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 13;
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

    sanitizePhone(phone) {
        return phone.replace(/\D/g, '');
    }

    // 🔹 PAGE HANDLERS
    async handleLogin() {
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
            // Error sudah dihandle di login method
        } finally {
            this.toggleButtonLoading(submitBtn, false, 'Masuk');
        }
    }

    async handleRegister() {
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
            // Error sudah dihandle di register method
        } finally {
            this.toggleButtonLoading(submitBtn, false, 'Daftar');
        }
    }

    // 🔹 UI METHODS
    updateUI() {
        this.updateNavbar();
        this.updateAuthPages();
    }

    updateNavbar() {
        const navAuth = document.getElementById('nav-auth');
        const userMenu = document.getElementById('user-menu');
        const userGreeting = document.getElementById('user-greeting');

        if (!navAuth || !userMenu) {
            console.log('⚠️ Navbar elements not found');
            return;
        }

        const isLoggedIn = this.isLoggedIn();
        
        if (isLoggedIn) {
            // User logged in
            navAuth.style.display = 'none';
            userMenu.style.display = 'block';
            
            // Update user greeting
            if (userGreeting) {
                const userName = this.userProfile?.name || this.currentUser?.displayName || 'User';
                userGreeting.textContent = `Halo, ${userName}!`;
            }
            
        } else {
            // User not logged in
            navAuth.style.display = 'flex';
            userMenu.style.display = 'none';
        }
    }

    updateAuthPages() {
        // Jika di auth page tapi sudah login, redirect
        if (this.isAuthPage() && this.isLoggedIn()) {
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    }

    forceLogoutUI() {
        const navAuth = document.getElementById('nav-auth');
        const userMenu = document.getElementById('user-menu');

        if (navAuth && userMenu) {
            navAuth.style.display = 'flex';
            userMenu.style.display = 'none';
            console.log('🔄 UI forced to logout state');
        }
    }

    clearLocalData() {
        // Clear app-specific data
        const appKeys = ['userLoggedIn', 'userName', 'userEmail'];
        appKeys.forEach(key => localStorage.removeItem(key));
        
        console.log('🧹 Local auth data cleared');
    }

    // 🔹 UTILITY METHODS
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

    isLoggedIn() {
        return this.currentUser !== null;
    }

    isAuthPage() {
        return this.isLoginPage() || this.isRegisterPage();
    }

    isLoginPage() {
        return window.location.pathname.includes('login.html');
    }

    isRegisterPage() {
        return window.location.pathname.includes('signup.html');
    }

    isProtectedPage() {
        return window.location.pathname.includes('profile.html') ||
               window.location.pathname.includes('orders.html') ||
               window.location.pathname.includes('wishlist.html');
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getUserProfile() {
        return this.userProfile;
    }

    requireAuth() {
        if (!this.isLoggedIn()) {
            this.showToast('Silakan login terlebih dahulu', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            throw new Error('Authentication required');
        }
        return this.currentUser;
    }

    // 🔹 ERROR HANDLING
    getFirebaseErrorMessage(errorCode) {
        const errorMessages = {
            // Auth errors
            'auth/email-already-in-use': 'Email sudah terdaftar',
            'auth/invalid-email': 'Format email tidak valid',
            'auth/weak-password': 'Password terlalu lemah (minimal 6 karakter)',
            'auth/user-not-found': 'Email tidak terdaftar',
            'auth/wrong-password': 'Password salah',
            'auth/invalid-credential': 'Email atau password salah',
            'auth/too-many-requests': 'Terlalu banyak percobaan gagal. Coba lagi nanti',
            'auth/user-disabled': 'Akun ini dinonaktifkan',
            'auth/network-request-failed': 'Koneksi internet bermasalah',
            'auth/internal-error': 'Terjadi kesalahan sistem'
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

        // Add animations if not exists
        if (!document.querySelector('#toast-animations')) {
            const style = document.createElement('style');
            style.id = 'toast-animations';
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

        document.body.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }

    getToastIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
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

    // 🔹 DEBUG METHODS
    async debugAuth() {
        console.log('=== AUTH DEBUG INFO ===');
        console.log('Current User:', this.currentUser);
        console.log('User Profile:', this.userProfile);
        console.log('Is Logged In:', this.isLoggedIn());
        console.log('Is Logging Out:', this.isLoggingOut);
        
        const users = await this.getUsers();
        console.log('All Users:', users);
        console.log('Total Users:', users.length);
    }

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
            console.error('❌ Error reading users:', error);
            return [];
        }
    }
        // 🔥 METHOD BARU: Cek jika ada pending redirect
    checkPendingRedirect() {
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect');
        
        if (redirect && this.currentUser) {
            console.log('🔑 Redirecting to:', redirect);
            
            switch(redirect) {
                case 'payment':
                    window.location.href = 'payment.html';
                    break;
                case 'checkout':
                    window.location.href = 'cart.html';
                    break;
                default:
                    break;
            }
        }
    }

    // 🔥 METHOD BARU: Simpan pending order setelah login
    async processPendingOrdersAfterLogin() {
        // Cari semua temporary orders
        const tempOrders = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('temp-order-')) {
                const orderData = JSON.parse(localStorage.getItem(key));
                tempOrders.push(orderData);
            }
        }

        // Process masing-masing temporary order
        for (const order of tempOrders) {
            try {
                console.log('🔑 Processing pending order:', order.orderId);
                await this.savePendingOrderToFirebase(order);
            } catch (error) {
                console.error('🔑 Error processing pending order:', error);
            }
        }
    }

    // 🔥 METHOD BARU: Save pending order ke Firebase
    async savePendingOrderToFirebase(orderData) {
        if (!this.currentUser) return;

        const completeOrderData = {
            ...orderData,
            userId: this.currentUser.uid,
            userEmail: this.currentUser.email,
            userName: this.currentUser.displayName || orderData.shippingInfo.recipientName,
            status: 'pending_payment',
            retried: true
        };

        if (typeof firebaseDB !== 'undefined' && firebaseDB.initialized) {
            await firebaseDB.saveOrder(completeOrderData);
            localStorage.removeItem(`temp-order-${orderData.orderId}`);
            console.log('🔑 Pending order saved to Firebase:', orderData.orderId);
        }
    }
}

// 🔹 GLOBAL INITIALIZATION
let authSystem;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        authSystem = new AuthSystem();
        window.semartAuth = authSystem;
        
        console.log('✅ Auth System loaded successfully');
        
        // Expose debug methods
        window.debugAuth = () => authSystem.debugAuth();
        window.forceLogout = () => authSystem.logout();
        
    } catch (error) {
        console.error('❌ Failed to load auth system:', error);
    }
});

export { AuthSystem };

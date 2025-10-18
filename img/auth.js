// Import Firebase Modular SDK
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

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.auth = auth;
        this.db = db;
        this.init();
    }

    init() {
        this.loadCurrentUser();
        this.setupEventListeners();
        this.updateUI();
        this.setupAuthListeners();
        this.setupPageSpecificHandlers();
    }

    // 🔹 FIREBASE AUTH METHODS - MENGgANTI localStorage
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
            console.log('💾 User saved successfully:', userId);
        } catch (error) {
            console.error('❌ Error saving user data:', error);
            this.showToast('Gagal menyimpan data pengguna', 'error');
        }
    }

    // 🔹 SECURITY & VALIDATION - TIDAK PERLU HASHING LAGI
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

    // 🔹 USER OPERATIONS
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

    // 🔹 AUTHENTICATION METHODS - FIREBASE VERSION
    async register(userData) {
        const {
            name, email, phone, birthDate, address, 
            password, confirmPassword
        } = userData;

        console.log('👤 Registration attempt:', { email, name });

        try {
            // 🔹 VALIDATION STEP BY STEP
            if (!name || name.trim() === '') {
                throw new Error('Nama harus diisi');
            }

            if (!email || email.trim() === '') {
                throw new Error('Email harus diisi');
            }

            if (!this.validateEmail(email)) {
                throw new Error('Format email tidak valid');
            }

            if (!phone || phone.trim() === '') {
                throw new Error('Nomor HP harus diisi');
            }

            if (!this.validatePhone(phone)) {
                throw new Error('Format nomor HP tidak valid (10-13 digit)');
            }

            if (!birthDate) {
                throw new Error('Tanggal lahir harus diisi');
            }

            const age = this.calculateAge(birthDate);
            if (age < 13) {
                throw new Error('Anda harus berusia minimal 13 tahun untuk mendaftar');
            }

            if (age > 100) {
                throw new Error('Tanggal lahir tidak valid');
            }

            if (!password) {
                throw new Error('Password harus diisi');
            }

            if (!this.validatePassword(password)) {
                throw new Error('Password harus minimal 6 karakter');
            }

            if (!confirmPassword) {
                throw new Error('Konfirmasi password harus diisi');
            }

            if (password !== confirmPassword) {
                throw new Error('Konfirmasi password tidak cocok');
            }

            // 🔹 CHECK EXISTING EMAIL - FIREBASE VERSION
            console.log('🔍 Checking email availability:', email);
            const existingUser = await this.getUserByEmail(email);
            
            if (existingUser) {
                console.log('❌ Email already exists:', existingUser.email);
                throw new Error('Email sudah terdaftar');
            }

            console.log('✅ Email is available, creating new user...');

            // 🔹 CREATE USER IN FIREBASE AUTH
            const userCredential = await createUserWithEmailAndPassword(
                this.auth,
                email, 
                password
            );
            const user = userCredential.user;

            console.log('✅ User auth created:', user.email);

            // 🔹 CREATE USER PROFILE IN FIRESTORE
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
                updatedAt: serverTimestamp(),
                orders: [],
                wishlist: [],
                addresses: [{
                    id: 'addr_1',
                    name: 'Alamat Utama',
                    address: address || 'Alamat belum diisi',
                    isPrimary: true,
                    createdAt: new Date().toISOString()
                }],
                preferences: {
                    newsletter: true,
                    promotions: true,
                    notifications: true
                }
            };

            await this.saveUser(user.uid, userProfile);

            console.log('✅ User registered successfully:', user.email);
            
            // 🔹 SUCCESS - REDIRECT TO LOGIN
            this.showToast('Registrasi berhasil! Silakan login.', 'success');
            
            setTimeout(() => {
                if (window.location.pathname.includes('signup.html')) {
                    window.location.href = 'login.html';
                }
            }, 2000);
            
            return user;

        } catch (error) {
            console.error('❌ Registration failed:', error);
            const errorMessage = this.getFirebaseErrorMessage(error.code);
            this.showToast(errorMessage, 'error');
            throw error;
        }
    }

    async login(email, password) {
        console.log('🔐 Login attempt:', email);

        try {
            const userCredential = await signInWithEmailAndPassword(
                this.auth,
                email, 
                password
            );
            const user = userCredential.user;

            // Update last login in Firestore
            await this.saveUser(user.uid, {
                lastLogin: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // Set current session
            this.currentUser = user;
            
            // Transfer cart if function exists
            if (typeof transferCartAfterLogin === 'function') {
                transferCartAfterLogin(user.uid);
            }

            this.updateUI();
            this.hideAuthModal();
            
            console.log('✅ Login successful:', user.email);
            this.showToast(`Selamat datang kembali! 🎉`, 'success');
            
            this.triggerEvent('userLogin', user);
            
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
            
            console.log('👋 Logout successful');
            this.currentUser = null;
            
            this.updateUI();
            
            this.showToast(`Berhasil logout! 👋`, 'info');
            this.triggerEvent('userLogout');
            
        } catch (error) {
            console.error('❌ Logout failed:', error);
            this.showToast('Gagal logout', 'error');
        }
    }

    // 🔹 SESSION MANAGEMENT - FIREBASE VERSION
    async loadCurrentUser() {
        return new Promise((resolve) => {
            onAuthStateChanged(this.auth, (user) => {
                if (user) {
                    this.currentUser = user;
                    console.log('✅ User loaded from Firebase:', user.email);
                } else {
                    this.currentUser = null;
                    console.log('🔐 No user logged in');
                }
                this.updateUI();
                resolve(user);
            });
        });
    }

    checkAuthStatus() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    // 🔹 FIREBASE ERROR HANDLING
    getFirebaseErrorMessage(errorCode) {
        const errorMessages = {
            // Registration errors
            'auth/email-already-in-use': 'Email sudah terdaftar',
            'auth/invalid-email': 'Format email tidak valid',
            'auth/weak-password': 'Password terlalu lemah (minimal 6 karakter)',
            'auth/operation-not-allowed': 'Operasi tidak diizinkan',
            
            // Login errors
            'auth/user-not-found': 'Email tidak terdaftar',
            'auth/wrong-password': 'Password salah',
            'auth/invalid-credential': 'Email atau password salah',
            'auth/too-many-requests': 'Terlalu banyak percobaan gagal. Coba lagi nanti',
            'auth/user-disabled': 'Akun ini dinonaktifkan',
            
            // General errors
            'auth/network-request-failed': 'Koneksi internet bermasalah',
            'auth/internal-error': 'Terjadi kesalahan sistem'
        };
        
        return errorMessages[errorCode] || 'Terjadi kesalahan. Coba lagi.';
    }

    // 🔹 UI MANAGEMENT - SAMA SEBELUMNYA
    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Auth modal toggle
        document.addEventListener('click', (e) => {
            const loginBtn = e.target.closest('.btn-login');
            if (loginBtn && !e.target.closest('#auth-modal')) {
                e.preventDefault();
                this.showAuthModal();
            }
        });

        // Close modal
        const closeBtn = document.getElementById('auth-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideAuthModal();
            });
        }

        // Tab switching
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchAuthTab(tab.dataset.tab);
            });
        });

        // Form submissions untuk modal auth
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.replaceWith(loginForm.cloneNode(true));
            document.getElementById('login-form').addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // Close modal when clicking outside
        const authModal = document.getElementById('auth-modal');
        if (authModal) {
            authModal.addEventListener('click', (e) => {
                if (e.target.id === 'auth-modal') {
                    this.hideAuthModal();
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAuthModal();
            }
        });
    }

    // METHOD: Setup handlers untuk halaman spesifik
    setupPageSpecificHandlers() {
        console.log('🔧 Setting up page specific handlers...');
        
        // Handle form di halaman login (login.html)
        const loginPageForm = document.getElementById('loginForm');
        if (loginPageForm && window.location.pathname.includes('login.html')) {
            console.log('🔧 Setting up login page form handler');
            loginPageForm.replaceWith(loginPageForm.cloneNode(true));
            document.getElementById('loginForm').addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePageLogin();
            });
        }

        // Handle form di halaman signup (signup.html)
        const signupPageForm = document.getElementById('signup-form');
        if (signupPageForm && window.location.pathname.includes('signup.html')) {
            console.log('🔧 Setting up signup page form handler');
            signupPageForm.replaceWith(signupPageForm.cloneNode(true));
            document.getElementById('signup-form').addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePageSignup();
            });
        }

        // Setup password toggle untuk semua halaman
        this.setupPasswordToggle();
        this.setupBirthdateLimits();
    }

    // METHOD: Setup birthdate limits
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

    // METHOD: Setup password toggle
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

    // METHOD: Handle login dari halaman login.html
    async handlePageLogin() {
        console.log('🔐 Handling page login...');
        const email = document.getElementById('email')?.value;
        const password = document.getElementById('password')?.value;
        const submitBtn = document.querySelector('#loginForm .btn-primary');

        if (!email || !password) {
            this.showToast('Email dan password harus diisi', 'error');
            return;
        }

        const originalText = submitBtn?.textContent || 'Masuk';

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Memproses...';
                submitBtn.classList.add('loading');
            }

            await this.login(email, password);
            
            this.showToast('Login berhasil! Mengalihkan...', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            
        } catch (error) {
            // Error sudah dihandle di login method
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                submitBtn.classList.remove('loading');
            }
        }
    }

    // METHOD: Handle signup dari halaman signup.html
    async handlePageSignup() {
        console.log('👤 Handling page signup...');
        const formData = {
            name: document.getElementById('signup-name')?.value,
            email: document.getElementById('signup-email')?.value,
            phone: document.getElementById('signup-phone')?.value,
            birthDate: document.getElementById('signup-birthdate')?.value,
            address: document.getElementById('signup-address')?.value || '',
            password: document.getElementById('signup-password')?.value,
            confirmPassword: document.getElementById('signup-confirm-password')?.value
        };

        console.log('📝 Signup form data:', formData);

        const submitBtn = document.querySelector('#signup-form .btn-primary');
        const originalText = submitBtn?.textContent || 'Daftar';

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Mendaftarkan...';
                submitBtn.classList.add('loading');
            }

            await this.register(formData);
            
        } catch (error) {
            // Error sudah dihandle di register method
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                submitBtn.classList.remove('loading');
            }
        }
    }

    setupAuthListeners() {
        // Firebase already handles auth state changes
        console.log('🔐 Firebase auth listeners active');
    }

    switchAuthTab(tab) {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

        const activeTab = document.querySelector(`.auth-tab[data-tab="${tab}"]`);
        const activeForm = document.getElementById(`${tab}-form`);

        if (activeTab && activeForm) {
            activeTab.classList.add('active');
            activeForm.classList.add('active');
        }
    }

    async handleLogin() {
        console.log('🔐 Handling modal login...');
        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        
        if (!emailInput || !passwordInput) {
            this.showToast('Form login tidak ditemukan', 'error');
            return;
        }

        const email = emailInput.value;
        const password = passwordInput.value;

        const submitBtn = document.querySelector('#login-form .btn-auth');
        const originalText = submitBtn.textContent;

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Memproses...';
            submitBtn.classList.add('loading');

            await this.login(email, password);
            
            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get('redirect');
            if (redirect) {
                window.location.href = redirect + '.html';
            }
        } catch (error) {
            // Error sudah dihandle di login method
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            submitBtn.classList.remove('loading');
        }
    }

    showAuthModal(defaultTab = 'login') {
        const authModal = document.getElementById('auth-modal');
        if (authModal) {
            this.switchAuthTab(defaultTab);
            authModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            
            setTimeout(() => {
                const firstInput = authModal.querySelector('input');
                if (firstInput) firstInput.focus();
            }, 300);
        }
    }

    hideAuthModal() {
        const authModal = document.getElementById('auth-modal');
        if (authModal) {
            authModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            this.clearForms();
        }
    }

    clearForms() {
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        
        if (loginForm) loginForm.reset();
        if (signupForm) signupForm.reset();
    }

    updateUI() {
        const navAuth = document.querySelector('.nav-auth');
        const userMenu = document.getElementById('user-menu');
        const userGreeting = document.getElementById('user-greeting');

        if (this.currentUser) {
            if (navAuth) navAuth.style.display = 'none';
            if (userMenu) userMenu.style.display = 'block';
            if (userGreeting) {
                userGreeting.textContent = `Halo, ${this.currentUser.email.split('@')[0]}!`;
                userGreeting.title = this.currentUser.email;
            }
        } else {
            if (navAuth) navAuth.style.display = 'flex';
            if (userMenu) userMenu.style.display = 'none';
        }
    }

    // 🔹 NOTIFICATION SYSTEM - SAMA
    showToast(message, type = 'info') {
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
        `;

        document.body.appendChild(toast);

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

    // 🔹 EVENT SYSTEM
    triggerEvent(eventName, data = null) {
        const event = new CustomEvent(eventName, { detail: data });
        window.dispatchEvent(event);
    }

    on(eventName, callback) {
        window.addEventListener(eventName, callback);
    }

    off(eventName, callback) {
        window.removeEventListener(eventName, callback);
    }

    // 🔹 UTILITY METHODS
    requireAuth() {
        if (!this.isLoggedIn()) {
            this.showAuthModal();
            throw new Error('Authentication required');
        }
        return this.currentUser;
    }

    isAdmin() {
        // You'll need to check this from Firestore user data
        return false; // Temporary
    }

    // 🔹 DEBUG METHODS
    async debugUsers() {
        const users = await this.getUsers();
        console.log('🐛 DEBUG Users:', users);
        console.log('📊 Total users:', users.length);
        return users;
    }

    clearAllData() {
        // With Firebase, we can't clear all data from client side
        this.showToast('Untuk reset data, gunakan Firebase Console', 'info');
    }

    // 🔹 NEW METHOD: Test email availability
    async testEmailAvailability(email) {
        const existingUser = await this.getUserByEmail(email);
        const available = !existingUser;
        
        console.log(`🔍 Test email "${email}": ${available ? 'AVAILABLE' : 'EXISTS'}`);
        return available;
    }
}

// Initialize auth system
let auth;

document.addEventListener('DOMContentLoaded', async () => {
    auth = new AuthSystem();
    
    // Wait for Firebase auth state to load
    await auth.loadCurrentUser();
    
    if (auth.checkAuthStatus()) {
        console.log('✅ User is logged in:', auth.getCurrentUser()?.email);
    } else {
        console.log('🔐 No user logged in');
    }

    window.semartAuth = auth;
    window.debugAuth = () => auth.debugUsers();
    window.clearAuthData = () => auth.clearAllData();
    window.testEmail = (email) => auth.testEmailAvailability(email);
});

export { AuthSystem };

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

    // 🔹 FIREBASE AUTH METHODS
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

    // 🔹 SECURITY & VALIDATION
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

            // Check terms agreement
            const agreeTerms = document.getElementById('agree-terms');
            if (agreeTerms && !agreeTerms.checked) {
                throw new Error('Anda harus menyetujui Syarat & Ketentuan');
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
                    newsletter: document.getElementById('newsletter')?.checked || true,
                    promotions: true,
                    notifications: true
                }
            };

            await this.saveUser(user.uid, userProfile);

            console.log('✅ User registered successfully:', user.email);
            
            // 🔹 SUCCESS - REDIRECT TO LOGIN
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
            
            this.updateUI();
            
            console.log('✅ Login successful:', user.email);
            this.showToast(`Selamat datang kembali! 🎉`, 'success');
            
            // 🔹 TRIGGER EVENT UNTUK UPDATE UI DI SEMUA PAGE
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
            
            // 🔹 TRIGGER EVENT UNTUK UPDATE UI DI SEMUA PAGE
            this.triggerEvent('userLogout');
            
            this.showToast(`Berhasil logout! 👋`, 'info');
            
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
                    
                    // Jika user sudah login dan berada di halaman login/signup, redirect ke home
                    if (window.location.pathname.includes('login.html') || 
                        window.location.pathname.includes('signup.html')) {
                        setTimeout(() => {
                            window.location.href = 'index.html';
                        }, 1000);
                    }
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
        
        return errorMessages[errorCode] || null;
    }

    // 🔹 UI MANAGEMENT
    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Setup password toggle untuk semua halaman
        this.setupPasswordToggle();
        this.setupBirthdateLimits();
    }

    // METHOD: Setup handlers untuk halaman spesifik
    setupPageSpecificHandlers() {
        console.log('🔧 Setting up page specific handlers...');
        
        // Handle form di halaman login (login.html)
        const loginPageForm = document.getElementById('loginForm');
        if (loginPageForm && window.location.pathname.includes('login.html')) {
            console.log('🔧 Setting up login page form handler');
            loginPageForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePageLogin();
            });
        }

        // Handle form di halaman signup (signup.html)
        const signupPageForm = document.getElementById('signup-form');
        if (signupPageForm && window.location.pathname.includes('signup.html')) {
            console.log('🔧 Setting up signup page form handler');
            signupPageForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePageSignup();
            });
        }
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

    updateUI() {
        // Untuk halaman login/signup, tidak perlu update UI navigasi
        // Method ini tetap ada untuk konsistensi dengan class utama
        console.log('🔄 Updating UI for auth pages');
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
        
        // Style untuk toast
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

        // Add CSS animation jika belum ada
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

        // Auto remove setelah 5 detik
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
            window.location.href = 'login.html';
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
let authSystem;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        authSystem = new AuthSystem();
        
        // Wait for Firebase auth state to load
        await authSystem.loadCurrentUser();
        
        if (authSystem.checkAuthStatus()) {
            console.log('✅ User is logged in:', authSystem.getCurrentUser()?.email);
        } else {
            console.log('🔐 No user logged in');
        }

        // Expose untuk debugging
        window.semartAuth = authSystem;
        window.debugAuth = () => authSystem.debugUsers();
        window.clearAuthData = () => authSystem.clearAllData();
        window.testEmail = (email) => authSystem.testEmailAvailability(email);
        
    } catch (error) {
        console.error('❌ Failed to initialize auth system:', error);
    }
});

export { AuthSystem };

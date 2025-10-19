// 🔹 UNIFIED AUTH SYSTEM - FIXED RACE CONDITION
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
    browserLocalPersistence,
    browserSessionPersistence
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
        this.isLoggingOut = false; // 🔹 FLAG UNTUK CEK LOGOUT PROCESS
        this.init();
    }

    async init() {
        if (this.isInitialized) return;
        
        console.log('🔐 Initializing Unified Auth System...');
        
        try {
            // Set persistence to SESSION instead of LOCAL
            await setPersistence(this.auth, browserSessionPersistence);
            console.log('✅ Auth persistence set to SESSION');
            
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
            // 🔹 IGNORE AUTH STATE CHANGES SELAMA LOGOUT PROCESS
            if (this.isLoggingOut) {
                console.log('🔐 Ignoring auth state change during logout');
                return;
            }

            if (user) {
                this.currentUser = user;
                console.log('✅ User signed in:', user.email);
                
                // 🔹 CEK JIKA DI LOGIN PAGE - REDIRECT KE HOME
                if (this.isLoginPage()) {
                    console.log('🔄 Redirecting from login to home...');
                    this.showToast('Anda sudah login!', 'info');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                    return;
                }
                
            } else {
                this.currentUser = null;
                console.log('🔐 User signed out');
                
                // 🔹 CEK JIKA DI PROTECTED PAGE - REDIRECT KE LOGIN
                if (this.isProtectedPage()) {
                    console.log('🔄 Redirecting to login from protected page...');
                    this.showToast('Silakan login terlebih dahulu', 'info');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 1500);
                    return;
                }
            }
            
            // Update UI
            this.updateNavbarUI();
        });
    }

    async logout() {
        if (this.isLoggingOut) {
            console.log('⚠️ Logout already in progress');
            return;
        }

        this.isLoggingOut = true; // 🔹 SET FLAG LOGOUT
        console.log('🚪 Starting logout process...');

        try {
            // 1. CLEAR UI FIRST - sebelum Firebase logout
            this.forceLogoutUI();
            
            // 2. Firebase sign out
            await signOut(this.auth);
            console.log('✅ Firebase signOut successful');
            
            // 3. CLEAR ALL LOCAL DATA secara manual
            await this.clearAllAuthData();
            
            // 4. Tampilkan success message
            this.showToast('Berhasil logout!', 'success');
            
            // 5. Redirect ke home setelah delay
            setTimeout(() => {
                this.isLoggingOut = false; // 🔹 RESET FLAG
                window.location.href = 'index.html';
            }, 1000);
            
        } catch (error) {
            console.error('❌ Logout failed:', error);
            this.isLoggingOut = false; // 🔹 RESET FLAG MESKI ERROR
            this.showToast('Gagal logout', 'error');
        }
    }

    async clearAllAuthData() {
        console.log('🧹 Clearing all auth data...');
        
        // A. Clear Firebase-related localStorage
        const firebaseKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('firebase')) {
                firebaseKeys.push(key);
            }
        }
        
        firebaseKeys.forEach(key => {
            localStorage.removeItem(key);
            console.log('🗑️ Removed Firebase key:', key);
        });

        // B. Clear app-specific auth data
        const appAuthKeys = [
            'userLoggedIn', 'userName', 'userEmail', 
            'semart-user', 'authToken'
        ];
        
        appAuthKeys.forEach(key => {
            localStorage.removeItem(key);
            console.log('🗑️ Removed app key:', key);
        });

        // C. Clear sessionStorage
        sessionStorage.clear();
        console.log('✅ sessionStorage cleared');

        // D. Clear cookies yang related to auth
        this.clearAuthCookies();

        console.log('✅ All auth data cleared');
    }

    clearAuthCookies() {
        const cookies = document.cookie.split(';');
        cookies.forEach(cookie => {
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            
            if (name.includes('auth') || name.includes('firebase') || name.includes('session')) {
                document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                console.log('🍪 Removed cookie:', name);
            }
        });
    }

    forceLogoutUI() {
        // 🔹 FORCE UPDATE UI TANPA MENUNGGU FIREBASE
        const navAuth = document.getElementById('nav-auth');
        const userMenu = document.getElementById('user-menu');

        if (navAuth && userMenu) {
            navAuth.style.display = 'flex';
            userMenu.style.display = 'none';
            
            console.log('🔄 UI forced to logout state');
        }
    }

    isLoginPage() {
        return window.location.pathname.includes('login.html') || 
               window.location.pathname.includes('signup.html');
    }

    isProtectedPage() {
        return window.location.pathname.includes('profile.html') ||
               window.location.pathname.includes('orders.html') ||
               window.location.pathname.includes('wishlist.html');
    }

    // ... (methods lainnya tetap sama - register, login, dll)

    updateNavbarUI() {
        // 🔹 JANGAN UPDATE UI SELAMA LOGOUT PROCESS
        if (this.isLoggingOut) {
            console.log('⏸️ Skipping UI update during logout');
            return;
        }

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
            navAuth.style.display = 'none';
            userMenu.style.display = 'block';
            
            if (userGreeting) {
                const userData = this.getUserData();
                userGreeting.textContent = `Halo, ${userData.name}!`;
            }
        } else {
            navAuth.style.display = 'flex';
            userMenu.style.display = 'none';
        }
    }
}

// 🔹 INITIALIZATION DENGAN ERROR HANDLING
let unifiedAuth;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        unifiedAuth = new UnifiedAuthSystem();
        window.semartAuth = unifiedAuth;
        
        console.log('✅ Unified Auth System loaded');
        
        // 🔹 MANUAL FIX: Jika di login page, force cek status
        if (window.location.pathname.includes('login.html')) {
            setTimeout(() => {
                if (unifiedAuth.isLoggedIn()) {
                    console.log('🔄 Manual redirect from login page');
                    window.location.href = 'index.html';
                }
            }, 1000);
        }
        
    } catch (error) {
        console.error('❌ Failed to load auth system:', error);
    }
});

export { UnifiedAuthSystem };

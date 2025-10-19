// 🔹 UNIFIED AUTH SYSTEM - FIXED AUTO LOGIN ISSUE
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
    inMemoryPersistence
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
        this.isLoggingOut = false;
        this.manualLogoutFlag = false; // 🔹 FLAG BARU UNTUK MANUAL LOGOUT
        this.init();
    }

    async init() {
        if (this.isInitialized) return;
        
        console.log('🔐 Initializing Unified Auth System...');
        
        try {
            // 🔹 SET PERSISTENCE KE SESSION (bukan LOCAL)
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
            console.log('🔄 Firebase Auth State Changed:', user ? user.email : 'NULL');
            
            // 🔹 JIKA SEDANG MANUAL LOGOUT, IGNORE SEMUA AUTH STATE CHANGES
            if (this.manualLogoutFlag) {
                console.log('🔐 Ignoring auth state change - manual logout in progress');
                return;
            }

            if (user) {
                this.currentUser = user;
                console.log('✅ User authenticated:', user.email);
                
                // 🔹 CEK JIKA DI LOGIN PAGE - REDIRECT KE HOME
                if (this.isLoginPage()) {
                    console.log('🔄 Redirecting from login to home...');
                    this.showToast('Anda sudah login! Mengarahkan ke beranda...', 'info');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);
                    return;
                }
                
            } else {
                this.currentUser = null;
                console.log('🔐 User not authenticated');
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

        this.isLoggingOut = true;
        this.manualLogoutFlag = true; // 🔹 SET FLAG MANUAL LOGOUT
        console.log('🚪 Starting MANUAL logout process...');

        try {
            // 1. CLEAR UI IMMEDIATELY - sebelum apapun
            this.forceLogoutUI();
            
            // 2. CLEAR ALL LOCAL DATA TERLEBIH DAHULU
            await this.nuclearDataClear();
            
            // 3. FIREBASE SIGNOUT
            await signOut(this.auth);
            console.log('✅ Firebase signOut completed');
            
            // 4. Tampilkan success message
            this.showToast('Berhasil logout!', 'success');
            
            // 5. Redirect setelah delay
            setTimeout(() => {
                this.isLoggingOut = false;
                this.manualLogoutFlag = false; // 🔹 RESET FLAG
                window.location.href = 'index.html';
            }, 1500);
            
        } catch (error) {
            console.error('❌ Logout failed:', error);
            this.isLoggingOut = false;
            this.manualLogoutFlag = false; // 🔹 RESET FLAG MESKI ERROR
            this.showToast('Gagal logout', 'error');
        }
    }

    async nuclearDataClear() {
        console.log('💣 NUCLEAR data clearance...');
        
        // A. CLEAR ALL FIREBASE LOCALSTORAGE
        const allKeys = Object.keys(localStorage);
        const firebaseKeys = allKeys.filter(key => 
            key.includes('firebase') || 
            key.includes('auth') ||
            key.includes('user') ||
            key.includes('token')
        );
        
        firebaseKeys.forEach(key => {
            console.log('🗑️ Removing:', key);
            localStorage.removeItem(key);
            // Double removal untuk memastikan
            localStorage.setItem(key, '');
            localStorage.removeItem(key);
        });

        // B. CLEAR SESSIONSTORAGE COMPLETELY
        sessionStorage.clear();
        
        // C. CLEAR COOKIES
        document.cookie.split(';').forEach(cookie => {
            const name = cookie.split('=')[0].trim();
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });

        // D. CLEAR INDEXEDDB FIREBASE
        await this.clearIndexedDB();
        
        console.log('✅ Nuclear data clearance completed');
    }

    async clearIndexedDB() {
        try {
            // Clear Firebase IndexedDB databases
            const databases = await window.indexedDB.databases();
            const firebaseDBs = databases.filter(db => 
                db.name.includes('firebase') || 
                db.name.includes('auth')
            );
            
            for (const dbInfo of firebaseDBs) {
                window.indexedDB.deleteDatabase(dbInfo.name);
                console.log('🗑️ Removed IndexedDB:', dbInfo.name);
            }
        } catch (error) {
            console.warn('⚠️ Cannot clear IndexedDB:', error);
        }
    }

    forceLogoutUI() {
        // 🔹 FORCE UI KE STATE LOGOUT TANPA MENUNGGU APAPUN
        const navAuth = document.getElementById('nav-auth');
        const userMenu = document.getElementById('user-menu');

        if (navAuth && userMenu) {
            navAuth.style.display = 'flex';
            navAuth.style.opacity = '1';
            navAuth.style.visibility = 'visible';
            
            userMenu.style.display = 'none';
            userMenu.style.opacity = '0';
            userMenu.style.visibility = 'hidden';
            
            console.log('🔄 UI forced to logout state');
        }
    }

    // 🔹 LOGIN METHOD YANG DISABLE AUTO-RELOGIN
    async login(email, password) {
        // 🔹 RESET MANUAL LOGOUT FLAG SEBELUM LOGIN
        this.manualLogoutFlag = false;
        
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

    // ... (methods lainnya tetap sama)

    isLoginPage() {
        return window.location.pathname.includes('login.html') || 
               window.location.pathname.includes('signup.html');
    }

    updateNavbarUI() {
        // 🔹 JANGAN UPDATE UI SELAMA MANUAL LOGOUT
        if (this.manualLogoutFlag) {
            console.log('⏸️ Skipping UI update - manual logout flag active');
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

// 🔹 ENHANCED INITIALIZATION
let unifiedAuth;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        unifiedAuth = new UnifiedAuthSystem();
        window.semartAuth = unifiedAuth;
        
        console.log('✅ Unified Auth System loaded');
        
        // 🔹 FORCE CHECK DI LOGIN PAGE
        if (window.location.pathname.includes('login.html')) {
            setTimeout(() => {
                // Clear any residual auth state
                if (unifiedAuth.isLoggedIn()) {
                    console.log('🔄 Force redirect from login page');
                    window.location.href = 'index.html';
                } else {
                    // Additional cleanup for login page
                    unifiedAuth.forceLogoutUI();
                }
            }, 500);
        }
        
    } catch (error) {
        console.error('❌ Failed to load auth system:', error);
    }
});

// 🔹 MANUAL OVERRIDE FUNCTIONS
window.forceLogout = async () => {
    if (window.semartAuth) {
        await window.semartAuth.logout();
    }
};

window.clearAllAuth = async () => {
    if (window.semartAuth) {
        await window.semartAuth.nuclearDataClear();
        alert('All auth data cleared!');
    }
};

export { UnifiedAuthSystem };

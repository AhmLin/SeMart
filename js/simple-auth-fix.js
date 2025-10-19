// simple-auth-fix.js
// 🔐 FIREBASE AUTH PERSISTENCE SYSTEM
// Status login tetap tersimpan walaupun browser ditutup

import {
    getAuth, 
    setPersistence, 
    browserLocalPersistence,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

// Import app instance dari firebase-auth.js jika sudah ada, atau inisialisasi baru
class FirebaseAuthPersistence {
    constructor() {
        this.auth = null;
        this.isInitialized = false;
        this.currentUser = null;
        this.init();
    }

    async init() {
        try {
            console.log('🔐 Initializing Firebase Auth Persistence...');
            
            // Tunggu sampai firebase-auth.js selesai load
            if (typeof auth !== 'undefined') {
                this.auth = auth;
                console.log('✅ Using existing auth instance');
            } else {
                console.log('❌ Auth instance not found, please ensure firebase-auth.js is loaded first');
                return;
            }

            // Set persistence to LOCAL (tetap tersimpan setelah browser ditutup)
            await setPersistence(this.auth, browserLocalPersistence);
            console.log('✅ Browser Local Persistence enabled');

            // Setup auth state listener
            this.setupAuthStateListener();
            this.isInitialized = true;

        } catch (error) {
            console.error('❌ Failed to initialize auth persistence:', error);
        }
    }

    setupAuthStateListener() {
        if (!this.auth) {
            console.error('❌ Auth not initialized');
            return;
        }

        console.log('👀 Setting up auth state listener...');
        
        onAuthStateChanged(this.auth, (user) => {
            console.log('🔄 Auth state changed:', user ? `User: ${user.email}` : 'No user');
            this.currentUser = user;
            this.updateUI();
            
            // Simpan user info untuk akses mudah (optional)
            if (user) {
                this.saveUserInfo(user);
            } else {
                this.clearUserInfo();
            }
        });
    }

    saveUserInfo(user) {
        // Hanya simpan info dasar untuk performa, bukan untuk auth check
        const userInfo = {
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL
        };
        sessionStorage.setItem('userInfo', JSON.stringify(userInfo));
    }

    clearUserInfo() {
        sessionStorage.removeItem('userInfo');
    }

    updateUI() {
        const navAuth = document.getElementById('nav-auth');
        const userMenu = document.getElementById('user-menu');
        const userEmailSpan = document.getElementById('user-email');
        const userNameSpan = document.getElementById('user-name');

        if (!navAuth || !userMenu) {
            console.log('⏳ UI elements not found yet, retrying...');
            setTimeout(() => this.updateUI(), 500);
            return;
        }

        if (this.currentUser) {
            // USER LOGGED IN - Show user menu, hide auth buttons
            console.log('👤 User is logged in, updating UI...');
            
            navAuth.style.display = 'none';
            userMenu.style.display = 'block';

            // Update user info in menu
            if (userEmailSpan) {
                userEmailSpan.textContent = this.currentUser.email;
            }
            if (userNameSpan) {
                userNameSpan.textContent = this.currentUser.displayName || this.currentUser.email.split('@')[0];
            }

        } else {
            // USER LOGGED OUT - Show auth buttons, hide user menu
            console.log('🚶 User is logged out, updating UI...');
            
            navAuth.style.display = 'flex';
            userMenu.style.display = 'none';
        }

        // Trigger animation/transition
        setTimeout(() => {
            navAuth.style.opacity = navAuth.style.display === 'flex' ? '1' : '0';
            userMenu.style.opacity = userMenu.style.display === 'block' ? '1' : '0';
        }, 10);
    }

    async logout() {
        if (!this.auth) {
            console.error('❌ Auth not initialized');
            return;
        }

        try {
            console.log('🚪 Logging out...');
            
            // Sign out dari Firebase
            await signOut(this.auth);
            
            console.log('✅ Logout successful');
            
            // UI akan otomatis update via onAuthStateChanged
            this.showLogoutMessage();
            
        } catch (error) {
            console.error('❌ Logout failed:', error);
            this.showMessage('Logout gagal: ' + error.message, 'error');
        }
    }

    showLogoutMessage() {
        this.showMessage('✅ Berhasil logout!', 'success');
    }

    showMessage(message, type = 'info') {
        // Remove existing messages
        const existingMsg = document.querySelector('.auth-message');
        if (existingMsg) existingMsg.remove();
        
        // Create new message
        const msg = document.createElement('div');
        msg.className = 'auth-message';
        
        const bgColor = type === 'success' ? '#28a745' : 
                       type === 'error' ? '#dc3545' : '#007bff';
        
        msg.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${bgColor};
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                z-index: 10000;
                font-family: 'Poppins', sans-serif;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideInRight 0.3s ease;
                max-width: 300px;
            ">
                ${message}
            </div>
        `;
        
        document.body.appendChild(msg);
        
        // Add animations if not exists
        if (!document.querySelector('#auth-animations')) {
            const style = document.createElement('style');
            style.id = 'auth-animations';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        setTimeout(() => {
            if (msg.parentNode) msg.parentNode.removeChild(msg);
        }, 3000);
    }

    // Utility methods
    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }
}

// 🚀 INITIALIZATION
let authSystem;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Starting Firebase Auth Persistence System...');
    
    // Tunggu sebentar untuk memastikan firebase-auth.js sudah load
    setTimeout(() => {
        authSystem = new FirebaseAuthPersistence();
        
        // Setup global event listeners
        setupGlobalEventListeners();
        
        // Auto-retry UI update setiap 2 detik sampai berhasil
        const uiUpdateInterval = setInterval(() => {
            if (authSystem.isInitialized && authSystem.updateUI()) {
                clearInterval(uiUpdateInterval);
            }
        }, 2000);
        
        // Fallback: stop retrying setelah 10 detik
        setTimeout(() => clearInterval(uiUpdateInterval), 10000);
        
    }, 1000);
});

// 🌍 GLOBAL EVENT LISTENERS
function setupGlobalEventListeners() {
    // Logout button handler
    document.addEventListener('click', (e) => {
        if (e.target.id === 'logout-btn' || e.target.closest('#logout-btn')) {
            e.preventDefault();
            e.stopPropagation();
            
            if (authSystem && authSystem.isInitialized) {
                authSystem.logout();
            } else {
                console.error('❌ Auth system not ready');
                emergencyLogout();
            }
        }
    });

    // Prevent dropdown close issue
    const userMenu = document.getElementById('user-menu');
    if (userMenu) {
        userMenu.addEventListener('click', (e) => e.stopPropagation());
    }
}

// 🆘 EMERGENCY LOGOUT (fallback)
function emergencyLogout() {
    console.log('🆘 Emergency logout activated');
    
    // Clear any potential conflicting data
    const auth = getAuth();
    signOut(auth).catch(() => {});
    
    // Clear session storage
    sessionStorage.clear();
    
    // Force UI update
    const navAuth = document.getElementById('nav-auth');
    const userMenu = document.getElementById('user-menu');
    
    if (navAuth) navAuth.style.display = 'flex';
    if (userMenu) userMenu.style.display = 'none';
    
    window.location.reload();
}

// 🛠️ UTILITY FUNCTIONS (untuk debugging)
window.authDebug = {
    getStatus: () => {
        if (!authSystem) return 'Auth system not initialized';
        return {
            initialized: authSystem.isInitialized,
            currentUser: authSystem.currentUser,
            authState: authSystem.isLoggedIn() ? 'LOGGED_IN' : 'LOGGED_OUT',
            userInfo: sessionStorage.getItem('userInfo')
        };
    },
    
    forceUIUpdate: () => {
        if (authSystem) {
            authSystem.updateUI();
            return 'UI update forced';
        }
        return 'Auth system not ready';
    },
    
    simulateLogin: (email = 'test@example.com') => {
        // Hanya untuk testing UI
        const userInfo = {
            email: email,
            displayName: email.split('@')[0]
        };
        sessionStorage.setItem('userInfo', JSON.stringify(userInfo));
        if (authSystem) authSystem.updateUI();
        return 'Simulated login UI';
    }
};

// 📝 USAGE INSTRUCTIONS:
/*
1. Pastikan firebase-auth.js di-load SEBELUM file ini
2. Struktur HTML yang diperlukan:

<!-- Untuk user belum login -->
<div id="nav-auth" style="display: none;">
    <a href="login.html">Login</a>
    <a href="signup.html">Daftar</a>
</div>

<!-- Untuk user sudah login -->
<div id="user-menu" style="display: none;">
    <span>Halo, <span id="user-name"></span></span>
    <span id="user-email"></span>
    <button id="logout-btn">Logout</button>
</div>

3. Sistem akan otomatis:
   - Menjaga status login walaupun browser ditutup
   - Update navbar sesuai status login
   - Handle logout dengan benar
*/

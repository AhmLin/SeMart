// 🔹 GLOBAL AUTH SYSTEM - FIXED VERSION
class GlobalAuthSystem {
    constructor() {
        this.initialized = false;
        this.init();
    }

    init() {
        if (this.initialized) return;
        
        console.log('🔐 Initializing global auth system...');
        this.initialized = true;
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupAuthListeners();
                this.forceUpdateNavbarAuth();
            });
        } else {
            // DOM already ready
            setTimeout(() => {
                this.setupAuthListeners();
                this.forceUpdateNavbarAuth();
            }, 100);
        }
        
        // Check auth status periodically
        setInterval(() => this.forceUpdateNavbarAuth(), 3000);
    }

    setupAuthListeners() {
        // Logout functionality - MORE ROBUST
        document.addEventListener('click', (e) => {
            if (e.target.id === 'logout-btn' || e.target.closest('#logout-btn')) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🚪 Logout button clicked');
                this.handleLogout();
            }
        });

        // Manual trigger untuk update auth
        window.addEventListener('storage', (e) => {
            if (e.key && (e.key.includes('user') || e.key.includes('auth'))) {
                console.log('🔄 Storage changed, updating auth UI');
                setTimeout(() => this.forceUpdateNavbarAuth(), 100);
            }
        });
    }

    forceUpdateNavbarAuth() {
        const navAuth = document.getElementById('nav-auth');
        const userMenu = document.getElementById('user-menu');
        const userGreeting = document.getElementById('user-greeting');

        if (!navAuth || !userMenu) {
            console.log('⚠️ Navbar auth elements not found, retrying...');
            return;
        }

        const isLoggedIn = this.checkAuthStatus();
        const userData = this.getUserData();
        
        console.log('🔐 Auth Status:', isLoggedIn);
        console.log('🔐 Current Display - navAuth:', navAuth.style.display, 'userMenu:', userMenu.style.display);

        // HAPUS SEMUA !important - gunakan approach yang benar
        if (isLoggedIn) {
            // User logged in - SHOW USER MENU
            this.hideElementCompletely(navAuth);
            this.showElementCompletely(userMenu);
            
            // Update user greeting
            if (userGreeting) {
                userGreeting.textContent = `Halo, ${userData.name}!`;
            }
            
            console.log('✅ Showing user menu, hiding login');
        } else {
            // User not logged in - SHOW LOGIN
            this.showElementCompletely(navAuth);
            this.hideElementCompletely(userMenu);
            
            console.log('✅ Showing login, hiding user menu');
        }

        // Force reflow dan verifikasi
        this.verifyUIState(navAuth, userMenu, isLoggedIn);
    }

    // METHOD BARU: Handle CSS specificity issues
    hideElementCompletely(element) {
        if (!element) return;
        
        // Multiple methods untuk memastikan element benar-benar hidden
        element.style.display = 'none';
        element.style.visibility = 'hidden';
        element.style.opacity = '0';
        element.style.position = 'absolute';
        element.style.left = '-9999px';
        element.setAttribute('aria-hidden', 'true');
        element.classList.add('force-hidden');
    }

    showElementCompletely(element) {
        if (!element) return;
        
        // Reset semua hiding properties
        element.style.display = 'flex';
        element.style.visibility = 'visible';
        element.style.opacity = '1';
        element.style.position = '';
        element.style.left = '';
        element.removeAttribute('aria-hidden');
        element.classList.remove('force-hidden');
        element.classList.add('force-visible');
    }

    verifyUIState(navAuth, userMenu, expectedLoggedIn) {
        setTimeout(() => {
            const navAuthVisible = navAuth.style.display !== 'none' && 
                                 navAuth.style.visibility !== 'hidden';
            const userMenuVisible = userMenu.style.display !== 'none' && 
                                  userMenu.style.visibility !== 'hidden';
            
            console.log('🔍 UI Verification:', {
                expected: expectedLoggedIn ? 'user-menu' : 'login',
                actual: {
                    navAuth: navAuthVisible ? 'visible' : 'hidden',
                    userMenu: userMenuVisible ? 'visible' : 'hidden'
                },
                match: (expectedLoggedIn && userMenuVisible && !navAuthVisible) || 
                       (!expectedLoggedIn && navAuthVisible && !userMenuVisible)
            });
            
            if (!((expectedLoggedIn && userMenuVisible && !navAuthVisible) || 
                  (!expectedLoggedIn && navAuthVisible && !userMenuVisible))) {
                console.warn('❌ UI STATE MISMATCH - Retrying...');
                this.forceUpdateNavbarAuth(); // Retry
            }
        }, 50);
    }

    checkAuthStatus() {
        // SINGLE SOURCE OF TRUTH - Simplify checks
        const checks = [
            // 1. Firebase primary
            () => window.semartAuth?.auth?.currentUser !== null && 
                  window.semartAuth?.auth?.currentUser !== undefined,
            
            // 2. Firebase function
            () => window.semartAuth?.isLoggedIn?.() === true,
            
            // 3. Firebase global
            () => window.firebase?.auth?.().currentUser !== null,
            
            // 4. LocalStorage primary
            () => localStorage.getItem('userLoggedIn') === 'true',
            
            // 5. Any user data
            () => {
                const userEmail = localStorage.getItem('userEmail');
                const userName = localStorage.getItem('userName');
                return !!(userEmail && userName);
            },
            
            // 6. Session storage
            () => sessionStorage.getItem('firebaseUser') !== null
        ];

        for (let check of checks) {
            try {
                if (check()) {
                    console.log('🔐 Auth check passed:', check.toString().slice(0, 80));
                    return true;
                }
            } catch (e) {
                // Continue to next check
            }
        }
        
        return false;
    }

    getUserData() {
        // Priority 1: Firebase Auth
        if (window.semartAuth?.auth?.currentUser) {
            const user = window.semartAuth.auth.currentUser;
            return {
                name: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
                email: user.email
            };
        }

        // Priority 2: LocalStorage
        const userName = localStorage.getItem('userName');
        const userEmail = localStorage.getItem('userEmail');
        
        if (userName && userEmail) {
            return {
                name: userName,
                email: userEmail
            };
        }

        // Default
        return {
            name: 'User',
            email: 'user@example.com'
        };
    }

    async handleLogout() {
        try {
            console.log('🚪 Starting comprehensive logout...');
            
            // 1. Clear data FIRST
            await this.clearAllAuth();
            
            // 2. Force UI update MULTIPLE TIMES
            this.forceUpdateNavbarAuth();
            setTimeout(() => this.forceUpdateNavbarAuth(), 100);
            setTimeout(() => this.forceUpdateNavbarAuth(), 500);
            
            // 3. Show success
            this.showLogoutSuccess();
            
            // 4. Redirect
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            
        } catch (error) {
            console.error('❌ Logout error:', error);
            // Still try to update UI
            this.forceUpdateNavbarAuth();
        }
    }

    async clearAllAuth() {
        console.log('🧹 Nuclear auth cleanup...');
        
        // A. Firebase logout
        try {
            if (window.semartAuth?.logout) {
                await window.semartAuth.logout();
            }
            if (window.firebase?.auth) {
                await window.firebase.auth().signOut();
            }
        } catch (e) {
            console.warn('Firebase logout failed:', e);
        }
        
        // B. Clear ALL storage aggressively
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && this.isAuthRelated(key)) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log('🗑️ Removed:', key);
        });
        
        // C. Clear session storage
        sessionStorage.clear();
        
        // D. Clear cookies
        document.cookie.split(';').forEach(cookie => {
            const name = cookie.split('=')[0].trim();
            if (this.isAuthRelated(name)) {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            }
        });
        
        console.log('✅ Auth cleanup completed');
    }

    isAuthRelated(key) {
        const authKeywords = ['user', 'auth', 'login', 'token', 'firebase', 'session', 'profile'];
        const lowerKey = key.toLowerCase();
        return authKeywords.some(keyword => lowerKey.includes(keyword));
    }

    showLogoutSuccess() {
        // Remove existing messages
        const existing = document.querySelector('.logout-message');
        if (existing) existing.remove();
        
        const message = document.createElement('div');
        message.className = 'logout-message';
        message.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: #28a745;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                z-index: 10000;
                font-family: 'Poppins', sans-serif;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                animation: slideIn 0.3s ease;
            ">
                ✅ Berhasil logout! Mengarahkan ke beranda...
            </div>
        `;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 3000);
    }
}

// 🚀 INITIALIZATION - HANYA SATU KALI
console.log('🔐 Loading global auth system...');

// Wait untuk memastikan DOM tersedia
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.globalAuth = new GlobalAuthSystem();
        }, 100);
    });
} else {
    setTimeout(() => {
        window.globalAuth = new GlobalAuthSystem();
    }, 100);
}

// 🔧 MANUAL DEBUG FUNCTIONS
window.debugAuth = () => {
    console.log('=== AUTH DEBUG ===');
    console.log('System:', window.globalAuth ? 'Loaded' : 'Not loaded');
    console.log('LocalStorage:', Object.keys(localStorage).filter(k => 
        k.includes('user') || k.includes('auth') || k.includes('firebase')
    ));
    console.log('UI State:', {
        navAuth: {
            display: document.getElementById('nav-auth')?.style.display,
            visibility: document.getElementById('nav-auth')?.style.visibility
        },
        userMenu: {
            display: document.getElementById('user-menu')?.style.display,
            visibility: document.getElementById('user-menu')?.style.visibility
        }
    });
};

window.forceAuthUpdate = () => {
    if (window.globalAuth) {
        window.globalAuth.forceUpdateNavbarAuth();
    }
};

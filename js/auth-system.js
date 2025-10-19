// 🔹 GLOBAL AUTH SYSTEM UNTUK SEMUA PAGE - FIXED VERSION
class GlobalAuthSystem {
    constructor() {
        this.init();
    }

    init() {
        console.log('🔐 Initializing global auth system...');
        
        // Delay sedikit untuk memastikan semua script sudah load
        setTimeout(() => {
            this.setupAuthListeners();
            this.forceUpdateNavbarAuth();
        }, 500);
        
        // Check auth status periodically
        setInterval(() => this.forceUpdateNavbarAuth(), 2000);
    }

    setupAuthListeners() {
        // Logout functionality
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }

        // Manual trigger untuk update auth
        window.addEventListener('updateAuthUI', () => {
            console.log('🔄 Manual auth UI update triggered');
            this.forceUpdateNavbarAuth();
        });
    }

    forceUpdateNavbarAuth() {
        const navAuth = document.getElementById('nav-auth');
        const userMenu = document.getElementById('user-menu');
        const userGreeting = document.getElementById('user-greeting');

        if (!navAuth || !userMenu) {
            console.error('❌ Navbar auth elements not found!');
            console.log('navAuth:', navAuth);
            console.log('userMenu:', userMenu);
            return;
        }

        const isLoggedIn = this.checkAuthStatus();
        const userData = this.getUserData();
        
        console.log('🔐 Auth Status:', isLoggedIn);
        console.log('🔐 User Data:', userData);
        console.log('🔐 Current Display - navAuth:', navAuth.style.display, 'userMenu:', userMenu.style.display);

        if (isLoggedIn) {
            // User sudah login - SEMUANYA PAKAI !important
            navAuth.style.display = 'none !important';
            userMenu.style.display = 'block !important';
            navAuth.style.cssText = 'display: none !important';
            userMenu.style.cssText = 'display: flex !important';
            
            // Update user greeting
            if (userGreeting) {
                userGreeting.textContent = `Halo, ${userData.name}!`;
            }
            
            console.log('✅ User logged in, showing profile menu');
        } else {
            // User belum login - SEMUANYA PAKAI !important
            navAuth.style.display = 'flex !important';
            userMenu.style.display = 'none !important';
            navAuth.style.cssText = 'display: flex !important';
            userMenu.style.cssText = 'display: none !important';
            
            console.log('❌ User not logged in, showing login button');
        }

        // Force reflow
        navAuth.offsetHeight;
        userMenu.offsetHeight;
    }

    checkAuthStatus() {
        // Method 1: Check Firebase Auth langsung
        if (this.checkFirebaseAuth()) {
            console.log('🔐 Firebase auth: LOGGED IN');
            return true;
        }

        // Method 2: Check localStorage
        if (this.checkLocalStorageAuth()) {
            console.log('🔐 LocalStorage auth: LOGGED IN');
            return true;
        }

        // Method 3: Check sessionStorage  
        if (this.checkSessionStorageAuth()) {
            console.log('🔐 SessionStorage auth: LOGGED IN');
            return true;
        }

        console.log('🔐 No auth method: NOT LOGGED IN');
        return false;
    }

    checkFirebaseAuth() {
        try {
            // Method 1A: Firebase Auth instance
            if (window.semartAuth && window.semartAuth.auth) {
                const user = window.semartAuth.auth.currentUser;
                if (user) {
                    console.log('🔥 Firebase user found:', user.email);
                    return true;
                }
            }

            // Method 1B: Firebase Auth methods
            if (window.semartAuth && typeof window.semartAuth.isLoggedIn === 'function') {
                const status = window.semartAuth.isLoggedIn();
                if (status) {
                    console.log('🔥 Firebase isLoggedIn(): true');
                    return true;
                }
            }

            // Method 1C: Check Firebase auth state
            if (window.firebase && window.firebase.auth) {
                const user = window.firebase.auth().currentUser;
                if (user) {
                    console.log('🔥 Firebase auth() user found:', user.email);
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.warn('🔐 Firebase auth check error:', error);
            return false;
        }
    }

    checkLocalStorageAuth() {
        try {
            const userLoggedIn = localStorage.getItem('userLoggedIn');
            const userEmail = localStorage.getItem('userEmail');
            
            if (userLoggedIn === 'true' && userEmail) {
                console.log('💾 LocalStorage auth found:', userEmail);
                return true;
            }
            
            // Check for any user data in localStorage
            const keys = Object.keys(localStorage);
            const userKeys = keys.filter(key => key.includes('user') || key.includes('auth'));
            if (userKeys.length > 0) {
                console.log('💾 User keys found in localStorage:', userKeys);
            }
            
            return false;
        } catch (error) {
            console.warn('🔐 LocalStorage auth check error:', error);
            return false;
        }
    }

    checkSessionStorageAuth() {
        try {
            const firebaseUser = sessionStorage.getItem('firebaseUser');
            if (firebaseUser) {
                console.log('💾 SessionStorage auth found');
                return true;
            }
            return false;
        } catch (error) {
            console.warn('🔐 SessionStorage auth check error:', error);
            return false;
        }
    }

    getUserData() {
        // Priority 1: Firebase Auth
        if (window.semartAuth && window.semartAuth.auth && window.semartAuth.auth.currentUser) {
            const user = window.semartAuth.auth.currentUser;
            return {
                name: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
                email: user.email || 'user@example.com'
            };
        }

        // Priority 2: LocalStorage
        const userName = localStorage.getItem('userName');
        const userEmail = localStorage.getItem('userEmail');
        
        if (userName) {
            return {
                name: userName,
                email: userEmail || 'user@example.com'
            };
        }

        // Priority 3: Try to get from any available source
        if (localStorage.getItem('userLoggedIn') === 'true') {
            return {
                name: 'User',
                email: 'user@example.com'
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
            console.log('🚪 Logging out from all systems...');
            
            // Clear semua auth methods
            await this.clearAllAuth();
            
            // Force UI update
            this.forceUpdateNavbarAuth();
            
            // Show success message
            this.showLogoutSuccess();
            
            // Redirect to home
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            
        } catch (error) {
            console.error('❌ Logout error:', error);
            alert('Gagal logout. Silakan coba lagi.');
        }
    }

    async clearAllAuth() {
        try {
            // Firebase logout
            if (window.semartAuth && typeof window.semartAuth.logout === 'function') {
                await window.semartAuth.logout();
            }
            
            if (window.firebase && window.firebase.auth) {
                await window.firebase.auth().signOut();
            }
            
            // Clear storage
            localStorage.removeItem('userLoggedIn');
            localStorage.removeItem('userName');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('semart-user');
            
            sessionStorage.removeItem('firebaseUser');
            sessionStorage.removeItem('userData');
            
            // Clear all user-related localStorage
            Object.keys(localStorage).forEach(key => {
                if (key.includes('user') || key.includes('auth') || key.includes('firebase')) {
                    localStorage.removeItem(key);
                }
            });
            
            console.log('✅ All auth data cleared');
        } catch (error) {
            console.warn('⚠️ Some auth clear operations failed:', error);
        }
    }

    showLogoutSuccess() {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: #17a2b8;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 1000;
            animation: slideInRight 0.3s ease;
            max-width: 250px;
            font-family: 'Poppins', sans-serif;
        `;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.2rem;">👋</span>
                <div>
                    <strong>Berhasil logout!</strong>
                    <div style="font-size: 0.9rem;">Sampai jumpa kembali</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize IMMEDIATELY tanpa menunggu DOMContentLoaded
console.log('🔐 Loading global auth system...');
window.globalAuth = new GlobalAuthSystem();

// Juga initialize ketika DOM ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔐 DOM ready, re-initializing auth system...');
    
    // Force update setelah semua element pasti tersedia
    setTimeout(() => {
        if (window.globalAuth) {
            window.globalAuth.forceUpdateNavbarAuth();
        }
    }, 1000);
});

// Export untuk manual trigger
window.updateAuthUI = () => {
    if (window.globalAuth) {
        window.globalAuth.forceUpdateNavbarAuth();
    }
};

// 🔹 SIMPLE AUTH FIX - VERSION 2 (FIXED LOGOUT)
class SimpleAuthFix {
    constructor() {
        this.isLoggingOut = false; // Flag untuk mencegah race condition
        this.init();
    }

    init() {
        console.log('🔐 Simple Auth Fix initialized - Enhanced Version');
        this.setupEventListeners();
        this.updateNavbar();
        
        // Check every 3 seconds (kurangi frekuensi)
        setInterval(() => this.updateNavbar(), 3000);
    }

    setupEventListeners() {
        // Logout button - Enhanced event listener
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            // Remove existing listeners first
            logoutBtn.replaceWith(logoutBtn.cloneNode(true));
            
            // Add new listener
            document.getElementById('logout-btn').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🚪 Logout button clicked');
                this.logout();
            });
        }

        // Tambah event listener untuk user menu
        this.setupUserMenu();
    }

    setupUserMenu() {
        const userProfile = document.querySelector('.user-profile');
        if (userProfile) {
            userProfile.addEventListener('click', (e) => {
                const dropdown = userProfile.querySelector('.user-dropdown');
                if (dropdown) {
                    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                }
            });
        }
    }

    isUserLoggedIn() {
        // Jika sedang proses logout, return false
        if (this.isLoggingOut) return false;

        const checks = [
            // Firebase Auth - dengan error handling lebih baik
            () => {
                try {
                    if (window.firebase && window.firebase.auth) {
                        return window.firebase.auth().currentUser !== null;
                    }
                    return false;
                } catch (e) {
                    return false;
                }
            },
            
            // SemartAuth custom
            () => {
                try {
                    return window.semartAuth && 
                           window.semartAuth.auth && 
                           window.semartAuth.auth.currentUser !== null;
                } catch (e) {
                    return false;
                }
            },

            // LocalStorage checks
            () => localStorage.getItem('userLoggedIn') === 'true',
            () => localStorage.getItem('userEmail') !== null,
            () => localStorage.getItem('userName') !== null,
            
            // SessionStorage
            () => sessionStorage.getItem('firebaseUser') !== null,
            
            // Cookie check (fallback)
            () => document.cookie.includes('userToken') || 
                  document.cookie.includes('firebase')
        ];

        const isLoggedIn = checks.some(check => {
            try {
                const result = check();
                console.log('Auth check result:', check.toString().slice(0, 50), result);
                return result;
            } catch (e) {
                console.warn('Auth check failed:', e);
                return false;
            }
        });

        console.log('🔐 Final login status:', isLoggedIn);
        return isLoggedIn;
    }

    getUserInfo() {
        // Priority 1: Firebase auth
        try {
            if (window.firebase?.auth().currentUser) {
                const user = window.firebase.auth().currentUser;
                return {
                    name: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
                    email: user.email
                };
            }
        } catch (e) {
            console.warn('Firebase user info failed:', e);
        }

        // Priority 2: semartAuth
        try {
            if (window.semartAuth?.auth?.currentUser) {
                const user = window.semartAuth.auth.currentUser;
                return {
                    name: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
                    email: user.email
                };
            }
        } catch (e) {
            console.warn('SemartAuth user info failed:', e);
        }

        // Priority 3: localStorage
        const userName = localStorage.getItem('userName');
        const userEmail = localStorage.getItem('userEmail');
        
        if (userName && userName !== 'null') {
            return {
                name: userName,
                email: userEmail || 'user@example.com'
            };
        }
        
        // Default
        return {
            name: 'User',
            email: 'user@example.com'
        };
    }

    async logout() {
        if (this.isLoggingOut) {
            console.log('⚠️ Logout already in progress');
            return;
        }

        this.isLoggingOut = true;
        console.log('🚪 Starting enhanced logout process...');

        try {
            // 1. Clear ALL auth data secara synchronous
            await this.clearAllAuthData();
            
            // 2. Update UI immediately
            this.forceNavbarUpdate();
            
            // 3. Show success message
            this.showLogoutMessage();
            
            // 4. Redirect setelah delay singkat
            setTimeout(() => {
                console.log('✅ Redirecting to home page');
                window.location.href = 'index.html';
            }, 1500);

        } catch (error) {
            console.error('❌ Logout error:', error);
            this.isLoggingOut = false;
            alert('Terjadi error saat logout. Silakan refresh halaman.');
        }
    }

    async clearAllAuthData() {
        console.log('🧹 Clearing all authentication data...');
        
        // A. Clear localStorage - lebih comprehensive
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && this.isAuthKey(key)) {
                keysToRemove.push(key);
                console.log('Removing localStorage:', key);
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            // Double check removal
            if (localStorage.getItem(key) !== null) {
                localStorage.setItem(key, ''); // Set to empty string
                localStorage.removeItem(key);
            }
        });

        // B. Clear sessionStorage
        sessionStorage.clear();
        console.log('✅ sessionStorage cleared');

        // C. Clear cookies
        this.clearAuthCookies();

        // D. Firebase logout dengan retry mechanism
        await this.performFirebaseLogout();

        // E. Clear any semartAuth instances
        this.clearSemartAuth();

        // F. Final verification
        this.verifyDataCleared();
    }

    isAuthKey(key) {
        const authKeywords = [
            'user', 'auth', 'login', 'logout', 'token', 
            'firebase', 'session', 'uid', 'email', 'password',
            'profile', 'account', 'access', 'refresh'
        ];
        
        const lowerKey = key.toLowerCase();
        return authKeywords.some(keyword => lowerKey.includes(keyword));
    }

    clearAuthCookies() {
        const cookies = document.cookie.split(';');
        cookies.forEach(cookie => {
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            
            if (this.isAuthKey(name)) {
                document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                console.log('Removed cookie:', name);
            }
        });
    }

    async performFirebaseLogout() {
        const firebaseLogoutMethods = [
            // Method 1: Standard firebase
            async () => {
                if (window.firebase && window.firebase.auth) {
                    console.log('Attempting Firebase auth signOut...');
                    await window.firebase.auth().signOut();
                    console.log('✅ Firebase signOut successful');
                    return true;
                }
                return false;
            },
            
            // Method 2: semartAuth logout
            async () => {
                if (window.semartAuth && typeof window.semartAuth.logout === 'function') {
                    console.log('Attempting semartAuth logout...');
                    await window.semartAuth.logout();
                    console.log('✅ semartAuth logout successful');
                    return true;
                }
                return false;
            },
            
            // Method 3: Direct auth state clear
            async () => {
                if (window.semartAuth && window.semartAuth.auth) {
                    console.log('Clearing semartAuth auth state...');
                    window.semartAuth.auth.currentUser = null;
                    return true;
                }
                return false;
            }
        ];

        for (const method of firebaseLogoutMethods) {
            try {
                const result = await method();
                if (result) break;
            } catch (error) {
                console.warn('Firebase logout method failed:', error);
                // Continue to next method
            }
        }
    }

    clearSemartAuth() {
        // Clear any global auth variables
        if (window.semartAuth) {
            try {
                window.semartAuth.auth = { currentUser: null };
                window.semartAuth.isLoggedIn = () => false;
            } catch (e) {
                console.warn('Failed to clear semartAuth:', e);
            }
        }
    }

    verifyDataCleared() {
        console.log('🔍 Verifying data clearance...');
        
        const checks = [
            () => localStorage.getItem('userLoggedIn') === null,
            () => localStorage.getItem('userEmail') === null,
            () => localStorage.getItem('userName') === null,
            () => sessionStorage.length === 0
        ];

        const allClear = checks.every(check => {
            try {
                return check();
            } catch (e) {
                return true; // Jika error, anggap sudah clear
            }
        });

        console.log('✅ Data clearance verified:', allClear);
    }

    forceNavbarUpdate() {
        const navAuth = document.getElementById('nav-auth');
        const userMenu = document.getElementById('user-menu');

        if (navAuth && userMenu) {
            // Force hide user menu, show login
            navAuth.style.display = 'flex';
            userMenu.style.display = 'none';
            
            // Tambah class untuk visual feedback
            navAuth.classList.add('logout-transition');
            
            console.log('🔄 Navbar forcefully updated to logout state');
        }
    }

    showLogoutMessage() {
        // Create custom notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 10000;
            font-family: 'Poppins', sans-serif;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        notification.textContent = '✅ Berhasil logout!';
        
        document.body.appendChild(notification);
        
        // Auto remove setelah 3 detik
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    updateNavbar() {
        if (this.isLoggingOut) return; // Skip update selama logout

        const navAuth = document.getElementById('nav-auth');
        const userMenu = document.getElementById('user-menu');
        const userGreeting = document.getElementById('user-greeting');

        if (!navAuth || !userMenu) {
            console.error('❌ Navbar elements not found');
            return;
        }

        const isLoggedIn = this.isUserLoggedIn();
        
        console.log('🔄 Updating navbar - Logged in:', isLoggedIn);

        if (isLoggedIn) {
            navAuth.style.display = 'none';
            userMenu.style.display = 'block';
            
            const userInfo = this.getUserInfo();
            if (userGreeting) {
                userGreeting.textContent = `Halo, ${userInfo.name}!`;
            }
        } else {
            navAuth.style.display = 'flex';
            userMenu.style.display = 'none';
            this.isLoggingOut = false; // Reset flag jika sudah logout
        }
    }
}

// Enhanced initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔐 Starting Enhanced Simple Auth Fix...');
    
    // Tunggu sebentar untuk memastikan DOM benar-benar ready
    setTimeout(() => {
        window.simpleAuthFix = new SimpleAuthFix();
        
        // Debug helper
        window.debugAuth = () => {
            console.log('=== AUTH DEBUG INFO ===');
            console.log('LocalStorage:', {
                userLoggedIn: localStorage.getItem('userLoggedIn'),
                userName: localStorage.getItem('userName'),
                userEmail: localStorage.getItem('userEmail')
            });
            console.log('Firebase auth:', window.firebase?.auth().currentUser);
            console.log('semartAuth:', window.semartAuth);
            console.log('isLoggingOut:', window.simpleAuthFix?.isLoggingOut);
        };
    }, 100);
});

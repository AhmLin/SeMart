// 🔹 SIMPLE AUTH FIX - PASTI BEKERJA
class SimpleAuthFix {
    constructor() {
        this.init();
    }

    init() {
        console.log('🔐 Simple Auth Fix initialized');
        this.setupEventListeners();
        this.updateNavbar();
        
        // Check every 2 seconds
        setInterval(() => this.updateNavbar(), 2000);
    }

    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    }

    isUserLoggedIn() {
        // Check semua kemungkinan sumber login
        const checks = [
            // Firebase Auth
            () => window.semartAuth?.auth?.currentUser !== null,
            () => window.semartAuth?.isLoggedIn?.() === true,
            () => window.firebase?.auth()?.currentUser !== null,
            
            // LocalStorage
            () => localStorage.getItem('userLoggedIn') === 'true',
            () => localStorage.getItem('userEmail') !== null,
            () => localStorage.getItem('userName') !== null,
            
            // SessionStorage
            () => sessionStorage.getItem('firebaseUser') !== null,
            
            // Any user data in localStorage
            () => {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.includes('user') || key.includes('auth') || key.includes('firebase'))) {
                        const value = localStorage.getItem(key);
                        if (value && value !== 'null' && value !== 'false') {
                            return true;
                        }
                    }
                }
                return false;
            }
        ];

        const isLoggedIn = checks.some(check => {
            try {
                return check();
            } catch (e) {
                return false;
            }
        });

        console.log('🔐 Login status:', isLoggedIn);
        return isLoggedIn;
    }

    getUserInfo() {
        // Try Firebase first
        if (window.semartAuth?.auth?.currentUser) {
            const user = window.semartAuth.auth.currentUser;
            return {
                name: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
                email: user.email
            };
        }
        
        // Try localStorage
        const userName = localStorage.getItem('userName');
        const userEmail = localStorage.getItem('userEmail');
        
        if (userName) {
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

    updateNavbar() {
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
            // User logged in - SHOW PROFILE, HIDE LOGIN
            navAuth.style.display = 'none';
            userMenu.style.display = 'block';
            
            // Update user info
            const userInfo = this.getUserInfo();
            if (userGreeting) {
                userGreeting.textContent = `Halo, ${userInfo.name}!`;
            }
        } else {
            // User not logged in - SHOW LOGIN, HIDE PROFILE
            navAuth.style.display = 'flex';
            userMenu.style.display = 'none';
        }
    }

    logout() {
        console.log('🚪 Logging out...');
        
        // Clear all auth data
        this.clearAuthData();
        
        // Update UI
        this.updateNavbar();
        
        // Show message
        alert('Berhasil logout!');
        
        // Redirect to home
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }

    clearAuthData() {
        // Clear localStorage
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (
                key.includes('user') || 
                key.includes('auth') || 
                key.includes('login') ||
                key.includes('token') ||
                key.includes('firebase')
            )) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });

        // Clear sessionStorage
        sessionStorage.clear();

        // Firebase logout
        try {
            if (window.semartAuth?.logout) {
                window.semartAuth.logout();
            }
            if (window.firebase?.auth) {
                window.firebase.auth().signOut();
            }
        } catch (error) {
            console.warn('Firebase logout failed:', error);
        }

        console.log('✅ All auth data cleared');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔐 Starting Simple Auth Fix...');
    window.simpleAuthFix = new SimpleAuthFix();
});

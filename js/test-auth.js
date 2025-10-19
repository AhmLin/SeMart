// 🔹 SIMPLE AUTH SYSTEM - PASTI BEKERJA
class SimpleAuthSystem {
    constructor() {
        this.init();
    }

    init() {
        console.log('🔐 Simple Auth System initialized');
        this.setupEventListeners();
        this.updateNavbar();
        
        // Check every second
        setInterval(() => this.updateNavbar(), 1000);
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

    isLoggedIn() {
        // Cek SEMUA kemungkinan sumber auth
        const checks = [
            this.checkFirebaseCurrentUser(),
            this.checkFirebaseAuth(),
            this.checkLocalStorage(),
            this.checkSessionStorage(),
            this.checkFirebaseTokens(),
            this.checkAnyUserData()
        ];

        const isLoggedIn = checks.some(check => check === true);
        console.log('🔐 Login check result:', isLoggedIn, checks);
        return isLoggedIn;
    }

    checkFirebaseCurrentUser() {
        try {
            if (window.semartAuth?.auth?.currentUser) {
                console.log('✅ Firebase currentUser found');
                return true;
            }
        } catch (e) {
            console.log('❌ Firebase currentUser check failed');
        }
        return false;
    }

    checkFirebaseAuth() {
        try {
            if (window.semartAuth?.isLoggedIn?.()) {
                console.log('✅ Firebase isLoggedIn() true');
                return true;
            }
        } catch (e) {
            console.log('❌ Firebase isLoggedIn check failed');
        }
        return false;
    }

    checkLocalStorage() {
        const items = [
            localStorage.getItem('userLoggedIn'),
            localStorage.getItem('userEmail'),
            localStorage.getItem('userName'),
            localStorage.getItem('firebase:authUser:'),
            localStorage.getItem('semart-user')
        ];

        const hasAuth = items.some(item => item && item !== 'null' && item !== 'false');
        if (hasAuth) console.log('✅ LocalStorage auth found');
        return hasAuth;
    }

    checkSessionStorage() {
        const items = [
            sessionStorage.getItem('firebaseUser'),
            sessionStorage.getItem('userData')
        ];

        const hasAuth = items.some(item => item && item !== 'null');
        if (hasAuth) console.log('✅ SessionStorage auth found');
        return hasAuth;
    }

    checkFirebaseTokens() {
        // Check for Firebase tokens in localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('firebase') && key.includes('auth')) {
                console.log('✅ Firebase token found:', key);
                return true;
            }
        }
        return false;
    }

    checkAnyUserData() {
        // Check for any user-related data
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (
                key.includes('user') || 
                key.includes('auth') || 
                key.includes('login') ||
                key.includes('token')
            )) {
                const value = localStorage.getItem(key);
                if (value && value !== 'null' && value !== 'false') {
                    console.log('✅ User data found:', key, value);
                    return true;
                }
            }
        }
        return false;
    }

    getUserInfo() {
        // Try to get user info from various sources
        let userName = 'User';
        let userEmail = 'user@example.com';

        // From Firebase
        if (window.semartAuth?.auth?.currentUser) {
            const user = window.semartAuth.auth.currentUser;
            userName = user.displayName || user.email?.split('@')[0] || 'User';
            userEmail = user.email || 'user@example.com';
        }
        // From localStorage
        else if (localStorage.getItem('userName')) {
            userName = localStorage.getItem('userName');
            userEmail = localStorage.getItem('userEmail') || 'user@example.com';
        }
        // From any user data
        else {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.includes('user') && !key.includes('cart')) {
                    const value = localStorage.getItem(key);
                    if (value && value.includes('@')) {
                        userEmail = value;
                        userName = value.split('@')[0];
                        break;
                    }
                }
            }
        }

        return { userName, userEmail };
    }

    updateNavbar() {
        const navAuth = document.getElementById('nav-auth');
        const userMenu = document.getElementById('user-menu');
        const userGreeting = document.getElementById('user-greeting');

        if (!navAuth || !userMenu) {
            console.error('❌ Navbar elements not found!');
            return;
        }

        const loggedIn = this.isLoggedIn();
        
        if (loggedIn) {
            // USER LOGGED IN - Show profile, hide login
            navAuth.style.display = 'none';
            userMenu.style.display = 'block';
            
            // Update user info
            const userInfo = this.getUserInfo();
            if (userGreeting) {
                userGreeting.textContent = `Halo, ${userInfo.userName}!`;
            }
            
            console.log('✅ NAVBAR: Showing profile menu for:', userInfo.userName);
        } else {
            // USER NOT LOGGED IN - Show login, hide profile
            navAuth.style.display = 'flex';
            userMenu.style.display = 'none';
            console.log('✅ NAVBAR: Showing login button');
        }
    }

    logout() {
        console.log('🚪 Logging out from all systems...');
        
        // Clear all possible auth data
        this.clearAllAuthData();
        
        // Update UI
        this.updateNavbar();
        
        // Show message
        alert('Berhasil logout!');
        
        // Redirect
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }

    clearAllAuthData() {
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
            console.log('🗑️ Removed:', key);
        });

        // Clear sessionStorage
        sessionStorage.clear();

        // Firebase logout
        if (window.semartAuth?.logout) {
            window.semartAuth.logout();
        }
        if (window.firebase?.auth) {
            window.firebase.auth().signOut();
        }

        console.log('✅ All auth data cleared');
    }
}

// Initialize immediately
console.log('🔐 Loading Simple Auth System...');
window.simpleAuth = new SimpleAuthSystem();

// Manual trigger function
window.updateAuthNavbar = () => {
    window.simpleAuth.updateNavbar();
};

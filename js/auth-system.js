// 🔹 GLOBAL AUTH SYSTEM UNTUK SEMUA PAGE
class GlobalAuthSystem {
    constructor() {
        this.init();
    }

    init() {
        console.log('🔐 Initializing global auth system...');
        this.setupAuthListeners();
        this.updateNavbarAuth();
        
        // Check auth status every 2 seconds untuk real-time update
        setInterval(() => this.updateNavbarAuth(), 2000);
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

        // Listen untuk auth events
        window.addEventListener('userLogin', () => {
            console.log('🔄 User login event detected');
            this.updateNavbarAuth();
        });

        window.addEventListener('userLogout', () => {
            console.log('🔄 User logout event detected');
            this.updateNavbarAuth();
        });
    }

    updateNavbarAuth() {
        const navAuth = document.getElementById('nav-auth');
        const userMenu = document.getElementById('user-menu');
        const userGreeting = document.getElementById('user-greeting');

        if (!navAuth || !userMenu) {
            console.warn('🔐 Navbar auth elements not found');
            return;
        }

        const isLoggedIn = this.checkAuthStatus();
        
        if (isLoggedIn) {
            // User sudah login
            navAuth.style.display = 'none';
            userMenu.style.display = 'block';
            
            // Update user greeting
            const userData = this.getUserData();
            if (userGreeting) {
                userGreeting.textContent = `Halo, ${userData.name}!`;
            }
        } else {
            // User belum login
            navAuth.style.display = 'flex';
            userMenu.style.display = 'none';
        }
    }

    checkAuthStatus() {
        // Priority 1: Firebase Auth System
        if (window.semartAuth && typeof window.semartAuth.isLoggedIn === 'function') {
            return window.semartAuth.isLoggedIn();
        }
        
        // Priority 2: LocalStorage fallback
        if (localStorage.getItem('userLoggedIn') === 'true') {
            return true;
        }
        
        // Priority 3: Session storage
        if (sessionStorage.getItem('firebaseUser')) {
            return true;
        }
        
        return false;
    }

    getUserData() {
        // Priority 1: Firebase Auth System
        if (window.semartAuth && typeof window.semartAuth.getCurrentUser === 'function') {
            const user = window.semartAuth.getCurrentUser();
            if (user) {
                return {
                    name: user.displayName || user.email.split('@')[0] || 'User',
                    email: user.email
                };
            }
        }
        
        // Priority 2: LocalStorage fallback
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

    async handleLogout() {
        try {
            console.log('🚪 Logging out...');
            
            // Priority 1: Firebase Auth System
            if (window.semartAuth && typeof window.semartAuth.logout === 'function') {
                await window.semartAuth.logout();
            } else {
                // Fallback logout
                localStorage.removeItem('userLoggedIn');
                localStorage.removeItem('userName');
                localStorage.removeItem('userEmail');
                sessionStorage.removeItem('firebaseUser');
            }
            
            // Update UI
            this.updateNavbarAuth();
            
            // Redirect to home
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
            
        } catch (error) {
            console.error('❌ Logout error:', error);
            alert('Gagal logout. Silakan coba lagi.');
        }
    }
}

// Initialize global auth system
let globalAuth;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🔐 Initializing global auth system for all pages...');
    globalAuth = new GlobalAuthSystem();
    window.globalAuth = globalAuth;
});

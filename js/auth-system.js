// 🔹 GLOBAL AUTH SYSTEM UNTUK SEMUA PAGE
class GlobalAuthSystem {
    constructor() {
        this.init();
    }

    init() {
        console.log('🔐 Initializing global auth system...');
        this.setupAuthListeners();
        this.updateNavbarAuth();
        
        // Setup Firebase auth listener jika tersedia
        this.setupFirebaseAuthListener();
        
        // Check auth status periodically untuk real-time update
        setInterval(() => this.updateNavbarAuth(), 3000);
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

        // Listen untuk custom auth events
        window.addEventListener('userLogin', () => {
            console.log('🔄 User login event detected');
            this.updateNavbarAuth();
        });

        window.addEventListener('userLogout', () => {
            console.log('🔄 User logout event detected');
            this.updateNavbarAuth();
        });

        // Juga listen untuk storage changes (jika login dari tab lain)
        window.addEventListener('storage', (e) => {
            if (e.key === 'userLoggedIn' || e.key === 'userName') {
                console.log('🔄 Storage change detected, updating auth UI');
                this.updateNavbarAuth();
            }
        });
    }

    setupFirebaseAuthListener() {
        // Jika Firebase auth tersedia, setup listener
        if (window.semartAuth && typeof window.semartAuth.auth !== 'undefined') {
            console.log('🔐 Setting up Firebase auth listener');
            
            // Listen untuk Firebase auth state changes
            window.semartAuth.auth.onAuthStateChanged((user) => {
                console.log('🔥 Firebase auth state changed:', user ? 'logged in' : 'logged out');
                this.updateNavbarAuth();
            });
        }
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
        
        console.log('🔐 Auth status:', isLoggedIn ? 'LOGGED IN' : 'NOT LOGGED IN');
        
        if (isLoggedIn) {
            // User sudah login
            navAuth.style.display = 'none';
            userMenu.style.display = 'block';
            
            // Update user greeting
            const userData = this.getUserData();
            if (userGreeting) {
                userGreeting.textContent = `Halo, ${userData.name}!`;
                userGreeting.title = userData.email;
            }
            
            console.log('🔐 User data:', userData);
        } else {
            // User belum login
            navAuth.style.display = 'flex';
            userMenu.style.display = 'none';
            
            console.log('🔐 User not logged in, showing login button');
        }
    }

    checkAuthStatus() {
        // Priority 1: Firebase Auth System
        if (window.semartAuth && typeof window.semartAuth.isLoggedIn === 'function') {
            const firebaseStatus = window.semartAuth.isLoggedIn();
            console.log('🔐 Firebase auth status:', firebaseStatus);
            return firebaseStatus;
        }
        
        // Priority 2: Check Firebase auth langsung
        if (window.semartAuth && window.semartAuth.auth && window.semartAuth.auth.currentUser) {
            console.log('🔐 Firebase currentUser exists');
            return true;
        }
        
        // Priority 3: LocalStorage fallback
        if (localStorage.getItem('userLoggedIn') === 'true') {
            console.log('🔐 LocalStorage auth status: true');
            return true;
        }
        
        // Priority 4: Session storage
        if (sessionStorage.getItem('firebaseUser')) {
            console.log('🔐 SessionStorage auth status: true');
            return true;
        }
        
        console.log('🔐 No auth method found, user not logged in');
        return false;
    }

    getUserData() {
        // Priority 1: Firebase Auth System
        if (window.semartAuth && typeof window.semartAuth.getCurrentUser === 'function') {
            const user = window.semartAuth.getCurrentUser();
            if (user) {
                console.log('🔐 Firebase user data:', user);
                return {
                    name: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
                    email: user.email || 'user@example.com'
                };
            }
        }
        
        // Priority 2: Firebase auth langsung
        if (window.semartAuth && window.semartAuth.auth && window.semartAuth.auth.currentUser) {
            const user = window.semartAuth.auth.currentUser;
            return {
                name: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
                email: user.email || 'user@example.com'
            };
        }
        
        // Priority 3: LocalStorage fallback
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
                console.log('🚪 Using Firebase logout');
                await window.semartAuth.logout();
            } 
            // Priority 2: Firebase auth langsung
            else if (window.semartAuth && window.semartAuth.auth) {
                console.log('🚪 Using Firebase auth directly');
                await window.semartAuth.auth.signOut();
            }
            else {
                // Fallback logout
                console.log('🚪 Using fallback logout');
                localStorage.removeItem('userLoggedIn');
                localStorage.removeItem('userName');
                localStorage.removeItem('userEmail');
                sessionStorage.removeItem('firebaseUser');
            }
            
            // Trigger custom event
            window.dispatchEvent(new CustomEvent('userLogout'));
            
            // Update UI
            this.updateNavbarAuth();
            
            // Show success message
            this.showLogoutSuccess();
            
            // Redirect to home after delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            
        } catch (error) {
            console.error('❌ Logout error:', error);
            alert('Gagal logout. Silakan coba lagi.');
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
            toast.style.animation = "slideOutRight 0.3s ease";
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize global auth system
let globalAuth;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🔐 Initializing global auth system for all pages...');
    globalAuth = new GlobalAuthSystem();
    window.globalAuth = globalAuth;
    
    // Juga update auth status setelah semua script loaded
    setTimeout(() => {
        globalAuth.updateNavbarAuth();
    }, 1000);
});

// Add CSS animations jika belum ada
if (!document.querySelector('#auth-animations')) {
    const style = document.createElement('style');
    style.id = 'auth-animations';
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

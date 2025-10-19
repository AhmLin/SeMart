// 🔹 SIMPLE AUTH FIX - ULTRA ROBUST VERSION
class SimpleAuthFix {
    constructor() {
        this.isLoggingOut = false;
        this.init();
    }

    init() {
        console.log('🔐 Ultra Robust Auth Fix initialized');
        this.setupEventListeners();
        this.forceNavbarUpdate(); // FORCE UPDATE SAAT INISIALISASI
    }

    setupEventListeners() {
        // Logout button dengan event binding yang kuat
        document.addEventListener('click', (e) => {
            if (e.target.id === 'logout-btn' || e.target.closest('#logout-btn')) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🚪 Logout triggered');
                this.logout();
            }
        });

        // Prevent dropdown close issue
        const userMenu = document.getElementById('user-menu');
        if (userMenu) {
            userMenu.addEventListener('click', (e) => e.stopPropagation());
        }
    }

    isUserLoggedIn() {
        // SUPER SIMPLE CHECK - hanya bergantung pada 1 source of truth
        const mainCheck = localStorage.getItem('userLoggedIn') === 'true';
        console.log('🔐 Main auth check:', mainCheck);
        return mainCheck;
    }

    async logout() {
        if (this.isLoggingOut) return;
        
        this.isLoggingOut = true;
        console.log('🚪 ULTRA LOGOUT - Starting...');

        // 1. CLEAR DATA FIRST - Synchronous dan aggressive
        this.aggressiveDataClear();
        
        // 2. UPDATE UI IMMEDIATELY - Jangan tunggu apapun
        this.forceNavbarUpdate();
        
        // 3. Tampilkan feedback
        this.showLogoutMessage();
        
        // 4. Redirect
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }

    aggressiveDataClear() {
        console.log('🧹 AGGRESSIVE DATA CLEARING...');
        
        // CLEAR LOCALSTORAGE - Remove everything related to auth
        const removeKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (
                key.toLowerCase().includes('user') ||
                key.toLowerCase().includes('auth') || 
                key.toLowerCase().includes('login') ||
                key.toLowerCase().includes('firebase') ||
                key.toLowerCase().includes('token') ||
                key.toLowerCase().includes('session') ||
                key.toLowerCase().includes('profile')
            )) {
                removeKeys.push(key);
            }
        }
        
        removeKeys.forEach(key => {
            console.log('Removing:', key);
            localStorage.removeItem(key);
            // Double removal untuk memastikan
            localStorage.setItem(key, '');
            localStorage.removeItem(key);
        });

        // CLEAR SESSIONSTORAGE - Remove everything
        sessionStorage.clear();
        
        // CLEAR COOKIES
        document.cookie.split(";").forEach(cookie => {
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        });

        // CLEAR ANY REMAINING GLOBAL VARIABLES
        if (window.semartAuth) {
            try {
                window.semartAuth.auth = { currentUser: null };
                window.semartAuth.isLoggedIn = false;
            } catch (e) {}
        }

        console.log('✅ Aggressive data clear completed');
    }

    forceNavbarUpdate() {
        const navAuth = document.getElementById('nav-auth');
        const userMenu = document.getElementById('user-menu');
        
        if (!navAuth || !userMenu) {
            console.error('❌ Navbar elements missing');
            return;
        }

        // FORCE THE UI UPDATE - regardless of auth state
        const shouldShowLogin = !this.isUserLoggedIn();
        
        console.log('🔄 FORCE NAVBAR UPDATE - Show login:', shouldShowLogin);
        
        if (shouldShowLogin) {
            // SHOW LOGIN, HIDE USER MENU
            navAuth.style.display = 'flex';
            navAuth.style.opacity = '1';
            navAuth.style.visibility = 'visible';
            
            userMenu.style.display = 'none';
            userMenu.style.opacity = '0';
            userMenu.style.visibility = 'hidden';
        } else {
            // SHOW USER MENU, HIDE LOGIN
            navAuth.style.display = 'none';
            navAuth.style.opacity = '0';
            navAuth.style.visibility = 'hidden';
            
            userMenu.style.display = 'block';
            userMenu.style.opacity = '1';
            userMenu.style.visibility = 'visible';
        }

        // Trigger reflow untuk memastikan render
        navAuth.offsetHeight;
        userMenu.offsetHeight;
    }

    showLogoutMessage() {
        // Remove existing messages
        const existingMsg = document.querySelector('.logout-message');
        if (existingMsg) existingMsg.remove();
        
        // Create new message
        const msg = document.createElement('div');
        msg.className = 'logout-message';
        msg.innerHTML = `
            <div style="
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
                animation: slideIn 0.3s ease;
            ">
                ✅ Berhasil logout! Mengarahkan...
            </div>
        `;
        
        document.body.appendChild(msg);
        
        setTimeout(() => {
            if (msg.parentNode) msg.parentNode.removeChild(msg);
        }, 3000);
    }
}

// 🚀 INITIALIZATION WITH FALLBACK
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Starting Ultra Robust Auth Fix...');
    
    // Wait for DOM to be fully ready
    setTimeout(() => {
        window.simpleAuthFix = new SimpleAuthFix();
        
        // FORCE INITIAL CHECK
        window.simpleAuthFix.forceNavbarUpdate();
        
        // Add global debug function
        window.debugAuth = () => {
            console.log('=== AUTH DEBUG ===');
            console.log('LocalStorage:', {
                userLoggedIn: localStorage.getItem('userLoggedIn'),
                userName: localStorage.getItem('userName'),
                userEmail: localStorage.getItem('userEmail'),
                allKeys: Object.keys(localStorage)
            });
            console.log('UI State:', {
                navAuth: document.getElementById('nav-auth')?.style.display,
                userMenu: document.getElementById('user-menu')?.style.display
            });
        };
        
        // Auto-check every 5 seconds as backup
        setInterval(() => {
            window.simpleAuthFix.forceNavbarUpdate();
        }, 5000);
        
    }, 500);
});

// 🆘 EMERGENCY FIX - Jika semua else fails
window.emergencyLogoutFix = function() {
    console.log('🆘 EMERGENCY LOGOUT FIX ACTIVATED');
    
    // Nuclear option - clear everything
    localStorage.clear();
    sessionStorage.clear();
    
    // Force UI update
    const navAuth = document.getElementById('nav-auth');
    const userMenu = document.getElementById('user-menu');
    
    if (navAuth) {
        navAuth.style.display = 'flex';
        navAuth.style.opacity = '1';
    }
    if (userMenu) {
        userMenu.style.display = 'none';
        userMenu.style.opacity = '0';
    }
    
    // Redirect to home
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
    
    return 'Emergency fix applied - you should be logged out now';
};

class ShoppingCart {
    constructor() {
        this.cart = this.getCartFromStorage();
        this.init();
    }

    init() {
        this.updateNavbarCart();
        
        if (window.location.pathname.includes('cart.html')) {
            this.setupCartPage();
        }
    }

    // 🔹 MODIFIKASI: Get cart berdasarkan user login atau guest
    getCartFromStorage() {
        // Cek jika auth system sudah tersedia dan user login
        if (typeof auth !== 'undefined' && auth.getCurrentUser()) {
            const userId = auth.getCurrentUser().id;
            const userCart = localStorage.getItem(`semart-cart-${userId}`);
            console.log('🛒 Loading user cart for:', userId);
            return userCart ? JSON.parse(userCart) : [];
        } else {
            // Guest cart
            const guestCart = localStorage.getItem('semart-cart-guest');
            console.log('🛒 Loading guest cart');
            return guestCart ? JSON.parse(guestCart) : [];
        }
    }

    // 🔹 MODIFIKASI: Save cart berdasarkan user status
    saveCartToStorage() {
        if (typeof auth !== 'undefined' && auth.getCurrentUser()) {
            const userId = auth.getCurrentUser().id;
            localStorage.setItem(`semart-cart-${userId}`, JSON.stringify(this.cart));
            console.log('🛒 Saved user cart for:', userId);
        } else {
            localStorage.setItem('semart-cart-guest', JSON.stringify(this.cart));
            console.log('🛒 Saved guest cart');
        }
        this.updateNavbarCart();
    }

    // 🔹 NEW: Transfer guest cart to user cart after login
    transferGuestCartToUser(userId) {
        const guestCart = localStorage.getItem('semart-cart-guest');
        if (guestCart) {
            console.log('🛒 Transferring guest cart to user:', userId);
            
            const guestCartData = JSON.parse(guestCart);
            const userCart = localStorage.getItem(`semart-cart-${userId}`);
            const userCartData = userCart ? JSON.parse(userCart) : [];
            
            // Merge guest cart with user cart
            const mergedCart = this.mergeCarts(userCartData, guestCartData);
            
            localStorage.setItem(`semart-cart-${userId}`, JSON.stringify(mergedCart));
            localStorage.removeItem('semart-cart-guest');
            
            // Update current cart instance
            this.cart = mergedCart;
            this.saveCartToStorage();
            this.updateNavbarCart();
            
            console.log('🛒 Cart transfer completed');
        }
    }

    // 🔹 NEW: Merge two carts (handle duplicate products)
    mergeCarts(userCart, guestCart) {
        const merged = [...userCart];
        
        guestCart.forEach(guestItem => {
            const existingItem = merged.find(userItem => userItem.id === guestItem.id);
            
            if (existingItem) {
                // Jika produk sudah ada, tambahkan quantity
                existingItem.quantity += guestItem.quantity;
            } else {
                // Jika produk baru, tambahkan ke cart
                merged.push(guestItem);
            }
        });
        
        return merged;
    }

    addToCart(product, quantity = null) {
        const finalQuantity = quantity !== null ? quantity : (product.quantity || 1);
        
        console.log('🛒 Adding to cart:', { 
            product: product.name, 
            quantity: finalQuantity,
            user: auth?.getCurrentUser() ? 'logged-in' : 'guest'
        });
        
        const existingItem = this.cart.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += finalQuantity;
            console.log('🛒 Updated existing item. New quantity:', existingItem.quantity);
        } else {
            const newItem = {
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: finalQuantity
            };
            this.cart.push(newItem);
            console.log('🛒 Added new item:', newItem);
        }
        
        this.saveCartToStorage();
        this.showAddToCartMessage(product.name, finalQuantity);
    }
    
    removeFromCart(productId) {
        console.log('🛒 Removing item:', productId);
        this.cart = this.cart.filter(item => item.id !== productId);
        this.saveCartToStorage();
        if (window.location.pathname.includes('cart.html')) {
            this.renderCartPage();
        }
    }
    
    updateQuantity(productId, newQuantity) {
        console.log('🛒 Updating quantity:', productId, 'to', newQuantity);
        if (newQuantity <= 0) {
            this.removeFromCart(productId);
            return;
        }
        
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            item.quantity = newQuantity;
            this.saveCartToStorage();
            if (window.location.pathname.includes('cart.html')) {
                this.renderCartPage();
            }
        }
    }
    
    clearCart() {
        if (confirm('Apakah Anda yakin ingin mengosongkan keranjang?')) {
            console.log('🛒 Clearing cart');
            this.cart = [];
            this.saveCartToStorage();
            if (window.location.pathname.includes('cart.html')) {
                this.renderCartPage();
            }
        }
    }
    
    getTotalItems() {
        const total = this.cart.reduce((total, item) => total + item.quantity, 0);
        console.log('🛒 Total items in cart:', total);
        return total;
    }
    
    getTotalPrice() {
        const total = this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
        console.log('🛒 Total price in cart:', total);
        return total;
    }
    
    updateNavbarCart() {
        const cartCount = document.getElementById('nav-cart-count');
        const cartTotal = document.getElementById('nav-cart-total');
        
        console.log('🛒 Navbar elements:', { cartCount, cartTotal });
        
        if (cartCount && cartTotal) {
            const totalItems = this.getTotalItems();
            const totalPrice = this.getTotalPrice();
            
            cartCount.textContent = totalItems;
            cartTotal.textContent = totalPrice.toLocaleString('id-ID');
            
            console.log('🛒 Navbar updated - Items:', totalItems, 'Price:', totalPrice);
        } else {
            console.warn('🛒 Navbar cart elements not found');
        }
    }
    
    setupCartPage() {
        console.log('🛒 Setting up cart page');
        document.getElementById('clear-cart').addEventListener('click', () => {
            this.clearCart();
        });
        
        document.getElementById('checkout').addEventListener('click', () => {
            this.checkout();
        });
        
        this.renderCartPage();
    }
    
    renderCartPage() {
        console.log('🛒 Rendering cart page');
        const emptyCart = document.getElementById('empty-cart');
        const cartItemsContainer = document.getElementById('cart-items-container');
        const cartItems = document.getElementById('cart-items');
        const subtotal = document.getElementById('subtotal');
        const totalPrice = document.getElementById('total-price');
        
        if (this.cart.length === 0) {
            console.log('🛒 Cart is empty');
            emptyCart.style.display = 'block';
            cartItemsContainer.style.display = 'none';
        } else {
            console.log('🛒 Cart has', this.cart.length, 'items');
            emptyCart.style.display = 'none';
            cartItemsContainer.style.display = 'grid';
            
            cartItems.innerHTML = '';
            this.cart.forEach(item => {
                const cartItemElement = this.createCartItemElement(item);
                cartItems.appendChild(cartItemElement);
            });
            
            const total = this.getTotalPrice();
            subtotal.textContent = total.toLocaleString('id-ID');
            totalPrice.textContent = total.toLocaleString('id-ID');
        }
    }
    
    createCartItemElement(item) {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="cart-item-image" loading="lazy">
            <div class="cart-item-details">
                <div class="cart-item-header">
                    <h3 class="cart-item-name">${item.name}</h3>
                    <div class="cart-item-price">Rp${(item.price * item.quantity).toLocaleString('id-ID')}</div>
                </div>
                <div class="cart-item-controls">
                    <div class="quantity-controls">
                        <button class="quantity-btn decrease" data-id="${item.id}">-</button>
                        <span class="quantity-display">${item.quantity}</span>
                        <button class="quantity-btn increase" data-id="${item.id}">+</button>
                    </div>
                    <button class="remove-item" data-id="${item.id}">Hapus</button>
                </div>
            </div>
        `;
        
        cartItem.querySelector('.decrease').addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            this.updateQuantity(id, item.quantity - 1);
        });
        
        cartItem.querySelector('.increase').addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            this.updateQuantity(id, item.quantity + 1);
        });
        
        cartItem.querySelector('.remove-item').addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            this.removeFromCart(id);
        });
        
        return cartItem;
    }
    
    showAddToCartMessage(productName, quantity = 1) {
        const toast = document.createElement('div');
        toast.className = 'cart-toast';
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.2rem;">✓</span>
                <div>
                    <strong>Berhasil ditambahkan!</strong>
                    <div style="font-size: 0.9rem;">${quantity}x ${productName}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
    
    checkout() {
        if (this.cart.length === 0) {
            alert('Keranjang belanja Anda kosong!');
            return;
        }

        // Cek jika user sudah login
        if (typeof auth === 'undefined' || !auth.getCurrentUser()) {
            if (confirm('Anda perlu login untuk checkout. Mau login sekarang?')) {
                // Redirect ke login page
                window.location.href = 'login.html?redirect=checkout';
                return;
            }
            return;
        }
        
        localStorage.setItem('semart-checkout', JSON.stringify(this.cart));
        window.location.href = 'checkout.html';
    }
}

// Global cart instance
let cart;

// Initialize cart when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🛒 DOM loaded, initializing cart');
    cart = new ShoppingCart();
    
    // Jika auth system tersedia, setup cart transfer setelah login
    if (typeof auth !== 'undefined') {
        // Listen untuk login events (jika auth system punya event system)
        // Atau bisa di-trigger manual setelah login success
    }
});

// Global addToCart function
function addToCart(product, quantity = null) {
    console.log('🛒 Global addToCart called:', { product: product?.name, quantity });
    
    if (typeof cart !== 'undefined') {
        console.log('🛒 Using cart instance');
        cart.addToCart(product, quantity);
    } else {
        console.log('🛒 Cart not initialized, using fallback');
        const fallbackCart = new ShoppingCart();
        fallbackCart.addToCart(product, quantity);
    }
}

// Function untuk transfer cart setelah login success
function transferCartAfterLogin(userId) {
    if (typeof cart !== 'undefined') {
        cart.transferGuestCartToUser(userId);
    }
}

// Expose to global for debugging
window.addToCart = addToCart;
window.transferCartAfterLogin = transferCartAfterLogin;
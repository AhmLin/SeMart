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
        try {
            // Cek jika auth system sudah tersedia dan user login
            if (typeof window.semartAuth !== 'undefined' && window.semartAuth.isLoggedIn()) {
                const user = window.semartAuth.getCurrentUser();
                const userId = user ? user.uid : null;
                if (userId) {
                    const userCart = localStorage.getItem(`semart-cart-${userId}`);
                    console.log('🛒 Loading user cart for:', userId);
                    return userCart ? JSON.parse(userCart) : [];
                }
            }
            
            // Guest cart (fallback)
            const guestCart = localStorage.getItem('semart-cart-guest');
            console.log('🛒 Loading guest cart');
            return guestCart ? JSON.parse(guestCart) : [];
            
        } catch (error) {
            console.error('🛒 Error loading cart from storage:', error);
            return [];
        }
    }

    // 🔹 MODIFIKASI: Save cart berdasarkan user status
    saveCartToStorage() {
        try {
            if (typeof window.semartAuth !== 'undefined' && window.semartAuth.isLoggedIn()) {
                const user = window.semartAuth.getCurrentUser();
                const userId = user ? user.uid : null;
                if (userId) {
                    localStorage.setItem(`semart-cart-${userId}`, JSON.stringify(this.cart));
                    console.log('🛒 Saved user cart for:', userId);
                    this.updateNavbarCart();
                    return;
                }
            }
            
            // Guest cart (fallback)
            localStorage.setItem('semart-cart-guest', JSON.stringify(this.cart));
            console.log('🛒 Saved guest cart');
            this.updateNavbarCart();
            
        } catch (error) {
            console.error('🛒 Error saving cart to storage:', error);
        }
    }

    // 🔹 NEW: Transfer guest cart to user cart after login
    transferGuestCartToUser(userId) {
        try {
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
        } catch (error) {
            console.error('🛒 Error transferring cart:', error);
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

    addToCart(product, quantity = 1) {
        try {
            console.log('🛒 Adding to cart:', { 
                product: product.name, 
                quantity: quantity,
                user: window.semartAuth?.isLoggedIn() ? 'logged-in' : 'guest'
            });
            
            // Validasi input
            if (!product || !product.id) {
                throw new Error('Product data tidak valid');
            }
            
            if (quantity < 1) {
                throw new Error('Quantity harus minimal 1');
            }
            
            const existingItem = this.cart.find(item => item.id == product.id);
            
            if (existingItem) {
                existingItem.quantity += quantity;
                console.log('🛒 Updated existing item. New quantity:', existingItem.quantity);
            } else {
                const newItem = {
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                    quantity: quantity
                };
                this.cart.push(newItem);
                console.log('🛒 Added new item:', newItem);
            }
            
            this.saveCartToStorage();
            this.showAddToCartMessage(product.name, quantity);
            
        } catch (error) {
            console.error('🛒 Error adding to cart:', error);
            throw error;
        }
    }
    
    removeFromCart(productId) {
        try {
            console.log('🛒 Removing item:', productId);
            this.cart = this.cart.filter(item => item.id != productId);
            this.saveCartToStorage();
            
            if (window.location.pathname.includes('cart.html')) {
                this.renderCartPage();
            }
        } catch (error) {
            console.error('🛒 Error removing from cart:', error);
        }
    }
    
    updateQuantity(productId, newQuantity) {
        try {
            console.log('🛒 Updating quantity:', productId, 'to', newQuantity);
            
            if (newQuantity <= 0) {
                this.removeFromCart(productId);
                return;
            }
            
            const item = this.cart.find(item => item.id == productId);
            if (item) {
                item.quantity = newQuantity;
                this.saveCartToStorage();
                
                if (window.location.pathname.includes('cart.html')) {
                    this.renderCartPage();
                }
            }
        } catch (error) {
            console.error('🛒 Error updating quantity:', error);
        }
    }
    
    clearCart() {
        if (confirm('Apakah Anda yakin ingin mengosongkan keranjang?')) {
            try {
                console.log('🛒 Clearing cart');
                this.cart = [];
                this.saveCartToStorage();
                
                if (window.location.pathname.includes('cart.html')) {
                    this.renderCartPage();
                }
            } catch (error) {
                console.error('🛒 Error clearing cart:', error);
            }
        }
    }
    
    getTotalItems() {
        try {
            const total = this.cart.reduce((total, item) => total + (item.quantity || 0), 0);
            console.log('🛒 Total items in cart:', total);
            return total;
        } catch (error) {
            console.error('🛒 Error calculating total items:', error);
            return 0;
        }
    }
    
    getTotalPrice() {
        try {
            const total = this.cart.reduce((total, item) => total + ((item.price || 0) * (item.quantity || 0)), 0);
            console.log('🛒 Total price in cart:', total);
            return total;
        } catch (error) {
            console.error('🛒 Error calculating total price:', error);
            return 0;
        }
    }
    
    updateNavbarCart() {
        try {
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
        } catch (error) {
            console.error('🛒 Error updating navbar:', error);
        }
    }
    
    setupCartPage() {
        try {
            console.log('🛒 Setting up cart page');
            
            const clearCartBtn = document.getElementById('clear-cart');
            const checkoutBtn = document.getElementById('checkout');
            
            if (clearCartBtn) {
                clearCartBtn.addEventListener('click', () => {
                    this.clearCart();
                });
            }
            
            if (checkoutBtn) {
                checkoutBtn.addEventListener('click', () => {
                    this.checkout();
                });
            }
            
            this.renderCartPage();
        } catch (error) {
            console.error('🛒 Error setting up cart page:', error);
        }
    }
    
    renderCartPage() {
        try {
            console.log('🛒 Rendering cart page');
            const emptyCart = document.getElementById('empty-cart');
            const cartItemsContainer = document.getElementById('cart-items-container');
            const cartItems = document.getElementById('cart-items');
            const subtotal = document.getElementById('subtotal');
            const totalPrice = document.getElementById('total-price');
            
            if (!emptyCart || !cartItemsContainer || !cartItems) {
                console.error('🛒 Cart page elements not found');
                return;
            }
            
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
                if (subtotal) subtotal.textContent = total.toLocaleString('id-ID');
                if (totalPrice) totalPrice.textContent = total.toLocaleString('id-ID');
            }
        } catch (error) {
            console.error('🛒 Error rendering cart page:', error);
        }
    }
    
    createCartItemElement(item) {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="cart-item-image" loading="lazy" onerror="this.src='images/placeholder-product.jpg'">
            <div class="cart-item-details">
                <div class="cart-item-header">
                    <h3 class="cart-item-name">${item.name}</h3>
                    <div class="cart-item-price">Rp${((item.price || 0) * (item.quantity || 0)).toLocaleString('id-ID')}</div>
                </div>
                <div class="cart-item-controls">
                    <div class="quantity-controls">
                        <button class="quantity-btn decrease" data-id="${item.id}">-</button>
                        <span class="quantity-display">${item.quantity || 0}</span>
                        <button class="quantity-btn increase" data-id="${item.id}">+</button>
                    </div>
                    <button class="remove-item" data-id="${item.id}">Hapus</button>
                </div>
            </div>
        `;
        
        // Event listeners
        const decreaseBtn = cartItem.querySelector('.decrease');
        const increaseBtn = cartItem.querySelector('.increase');
        const removeBtn = cartItem.querySelector('.remove-item');
        
        if (decreaseBtn) {
            decreaseBtn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                this.updateQuantity(id, (item.quantity || 0) - 1);
            });
        }
        
        if (increaseBtn) {
            increaseBtn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                this.updateQuantity(id, (item.quantity || 0) + 1);
            });
        }
        
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                this.removeFromCart(id);
            });
        }
        
        return cartItem;
    }
    
    showAddToCartMessage(productName, quantity = 1) {
        try {
            const toast = document.createElement('div');
            toast.className = 'cart-toast';
            toast.style.cssText = `
                position: fixed;
                top: 100px;
                right: 20px;
                background: #28a745;
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                z-index: 1000;
                animation: slideInRight 0.3s ease;
                max-width: 300px;
                font-family: 'Poppins', sans-serif;
            `;
            toast.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.2rem;">✓</span>
                    <div>
                        <strong>Berhasil ditambahkan!</strong>
                        <div style="font-size: 0.9rem;">${quantity}x ${productName}</div>
                        <div style="font-size: 0.8rem; opacity: 0.9;">
                            Lihat <a href="cart.html" style="color: white; text-decoration: underline;">keranjang</a>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }, 4000);
        } catch (error) {
            console.error('🛒 Error showing add to cart message:', error);
        }
    }
    
    checkout() {
        try {
            if (this.cart.length === 0) {
                alert('Keranjang belanja Anda kosong!');
                return;
            }

            // Cek jika user sudah login
            if (typeof window.semartAuth === 'undefined' || !window.semartAuth.isLoggedIn()) {
                if (confirm('Anda perlu login untuk checkout. Mau login sekarang?')) {
                    window.location.href = 'login.html?redirect=checkout';
                    return;
                }
                return;
            }
            
            localStorage.setItem('semart-checkout', JSON.stringify(this.cart));
            window.location.href = 'checkout.html';
        } catch (error) {
            console.error('🛒 Error during checkout:', error);
            alert('Terjadi kesalahan saat checkout. Silakan coba lagi.');
        }
    }
}

// Global cart instance
let shoppingCart;

// Initialize cart when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🛒 DOM loaded, initializing cart');
    try {
        shoppingCart = new ShoppingCart();
        window.shoppingCart = shoppingCart; // Expose to global
        
        console.log('🛒 Cart initialized successfully');
        console.log('🛒 Current cart items:', shoppingCart.cart);
        
    } catch (error) {
        console.error('🛒 Error initializing cart:', error);
    }
});

// Global addToCart function
function addToCart(product, quantity = 1) {
    console.log('🛒 Global addToCart called:', { product: product?.name, quantity });
    
    try {
        if (typeof shoppingCart !== 'undefined' && shoppingCart.addToCart) {
            console.log('🛒 Using shoppingCart instance');
            shoppingCart.addToCart(product, quantity);
        } else {
            console.log('🛒 ShoppingCart not available, using fallback');
            // Fallback langsung ke localStorage
            const cart = JSON.parse(localStorage.getItem('semart-cart-guest') || '[]');
            const existingItem = cart.find(item => item.id == product.id);
            
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                cart.push({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                    quantity: quantity
                });
            }
            
            localStorage.setItem('semart-cart-guest', JSON.stringify(cart));
            
            // Update navbar manually
            const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
            const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            
            const cartCount = document.getElementById('nav-cart-count');
            const cartTotal = document.getElementById('nav-cart-total');
            
            if (cartCount) cartCount.textContent = totalItems;
            if (cartTotal) cartTotal.textContent = totalPrice.toLocaleString('id-ID');
            
            // Show success message
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed; top: 100px; right: 20px;
                background: #28a745; color: white; padding: 1rem 1.5rem;
                border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                z-index: 1000; animation: slideInRight 0.3s ease;
                max-width: 300px; font-family: 'Poppins', sans-serif;
            `;
            toast.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.2rem;">✓</span>
                    <div>
                        <strong>Berhasil ditambahkan!</strong>
                        <div style="font-size: 0.9rem;">${quantity}x ${product.name}</div>
                    </div>
                </div>
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 4000);
        }
    } catch (error) {
        console.error('🛒 Error in global addToCart:', error);
        alert('Terjadi kesalahan saat menambahkan ke keranjang.');
    }
}

// Function untuk transfer cart setelah login success
function transferCartAfterLogin(userId) {
    console.log('🛒 Transferring cart for user:', userId);
    if (typeof shoppingCart !== 'undefined') {
        shoppingCart.transferGuestCartToUser(userId);
    }
}

// Expose to global for debugging and access
window.ShoppingCart = ShoppingCart;
window.shoppingCart = shoppingCart;
window.addToCart = addToCart;
window.transferCartAfterLogin = transferCartAfterLogin;

// Add CSS animations if not exists
if (!document.querySelector('#cart-animations')) {
    const style = document.createElement('style');
    style.id = 'cart-animations';
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

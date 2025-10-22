class ShoppingCart {
    constructor() {
        this.cart = this.getCartFromStorage();
        this.currentDiscount = 0;
        this.init();
    }

    init() {
        this.updateNavbarCart();
        
        // 🔥 TAMBAHKAN: Universal event listeners untuk SEMUA page
        this.setupGlobalAddToCartListeners();
        
        if (window.location.pathname.includes('cart.html')) {
            this.setupCartPage();
        }
    }

    // 🔥 METHOD BARU: Universal event listeners untuk semua page
    setupGlobalAddToCartListeners() {
        try {
            console.log('🛒 Setting up global add to cart listeners for all pages');
            
            // Method 1: Event delegation - bekerja untuk element yang ada sekarang dan akan datang
            document.addEventListener('click', (e) => {
                const addToCartBtn = e.target.closest('.add-to-cart, .btn-add-to-cart, [onclick*="addToCart"]');
                if (addToCartBtn) {
                    e.preventDefault();
                    this.handleAddToCartClick(addToCartBtn);
                }
            });

            // Method 2: Direct event listeners untuk button yang sudah ada di DOM
            this.attachAddToCartListeners();

            // Method 3: Observer untuk button yang ditambahkan dynamically (AJAX, etc.)
            this.observeDynamicButtons();

            console.log('🛒 Global add to cart listeners setup completed');

        } catch (error) {
            console.error('🛒 Error setting up global listeners:', error);
        }
    }

    // 🔥 METHOD BARU: Attach listeners ke existing buttons
    attachAddToCartListeners() {
        const addToCartButtons = document.querySelectorAll(
            '.add-to-cart, .btn-add-to-cart, [data-product-id], button[onclick*="addToCart"]'
        );
        
        console.log(`🛒 Found ${addToCartButtons.length} add to cart buttons`);
        
        addToCartButtons.forEach(button => {
            // Hanya attach listener sekali
            if (!button.hasAttribute('data-cart-listener')) {
                button.setAttribute('data-cart-listener', 'true');
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleAddToCartClick(button);
                });
            }
        });
    }

    // 🔥 METHOD BARU: Observer untuk button yang ditambahkan dynamically
    observeDynamicButtons() {
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                            if (node.matches && (
                                node.matches('.add-to-cart, .btn-add-to-cart, [data-product-id]') ||
                                node.querySelector('.add-to-cart, .btn-add-to-cart, [data-product-id]')
                            )) {
                                shouldUpdate = true;
                            }
                        }
                    });
                }
            });
            
            if (shouldUpdate) {
                console.log('🛒 New buttons detected, attaching listeners...');
                this.attachAddToCartListeners();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 🔥 METHOD BARU: Handle click pada add to cart button
    handleAddToCartClick(button) {
        try {
            console.log('🛒 Add to cart button clicked:', button);
            
            // Dapatkan data product dari berbagai sumber
            const productData = this.getProductDataFromButton(button);
            
            if (productData && productData.id) {
                this.addToCart(productData, 1);
            } else {
                console.error('🛒 Product data not found from button:', button);
                this.showErrorMessage('Data produk tidak ditemukan. Silakan refresh halaman.');
            }
            
        } catch (error) {
            console.error('🛒 Error handling add to cart click:', error);
            this.showErrorMessage('Terjadi kesalahan saat menambahkan ke keranjang.');
        }
    }

    // 🔥 METHOD BARU: Extract product data dari button
    getProductDataFromButton(button) {
        console.log('🛒 Extracting product data from button:', button);
        
        // Coba dari berbagai attribute
        const productId = button.getAttribute('data-product-id') || 
                         button.getAttribute('data-id') ||
                         button.closest('[data-product-id]')?.getAttribute('data-product-id') ||
                         this.generateProductIdFromName(button);
        
        const productName = button.getAttribute('data-product-name') || 
                           button.closest('.product-card, .product-item, .card')?.querySelector('.product-name, .product-title, .card-title, h3, h4, .name')?.textContent?.trim() ||
                           'Product';
        
        const productPrice = button.getAttribute('data-product-price') || 
                            button.closest('.product-card, .product-item, .card')?.querySelector('.product-price, .price, .card-price, .product-price-amount')?.textContent ||
                            '0';
        
        const productImage = button.getAttribute('data-product-image') || 
                            button.closest('.product-card, .product-item, .card')?.querySelector('.product-image, .card-img, img')?.src ||
                            'images/placeholder-product.jpg';

        // Parse price dari string ke number
        const price = this.parsePrice(productPrice);

        console.log('🛒 Extracted product data:', {
            id: productId,
            name: productName,
            price: price,
            image: productImage
        });

        if (productId) {
            return {
                id: productId,
                name: productName,
                price: price,
                image: productImage
            };
        }

        return null;
    }

    // 🔥 METHOD BARU: Generate product ID dari nama jika tidak ada
    generateProductIdFromName(button) {
        const productName = button.getAttribute('data-product-name') || 
                           button.closest('.product-card, .product-item')?.querySelector('.product-name, .card-title')?.textContent;
        
        if (productName) {
            // Generate ID dari nama produk (lowercase, hapus spasi, special chars)
            return productName.toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
        }
        
        return null;
    }

    // 🔥 METHOD BARU: Parse harga dari string "Rp 100.000" ke number 100000
    parsePrice(priceString) {
        try {
            if (!priceString) return 0;
            
            // Hapus "Rp", spasi, dan titik
            const cleaned = priceString.toString()
                .replace(/Rp\s?/gi, '')
                .replace(/\./g, '')
                .replace(/,/g, '.')
                .trim();
            
            const price = parseInt(cleaned) || 0;
            console.log('🛒 Parsed price:', priceString, '→', price);
            return price;
            
        } catch (error) {
            console.error('🛒 Error parsing price:', error);
            return 0;
        }
    }

    getCartFromStorage() {
        try {
            const cartData = localStorage.getItem('semart-cart');
            console.log('🛒 Loading cart from storage:', cartData);
            return cartData ? JSON.parse(cartData) : [];
        } catch (error) {
            console.error('🛒 Error loading cart from storage:', error);
            return [];
        }
    }

    saveCartToStorage() {
        try {
            localStorage.setItem('semart-cart', JSON.stringify(this.cart));
            console.log('🛒 Saved cart to storage:', this.cart);
            this.updateNavbarCart();
        } catch (error) {
            console.error('🛒 Error saving cart to storage:', error);
        }
    }

    addToCart(product, quantity = 1) {
        try {
            console.log('🛒 Adding to cart:', { 
                product: product.name, 
                quantity: quantity 
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

    // 🔥 METHOD BARU: Show error message
    showErrorMessage(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 1000;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
            font-family: 'Poppins', sans-serif;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 4000);
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
                this.currentDiscount = 0;
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
            
            if (cartCount && cartTotal) {
                const totalItems = this.getTotalItems();
                const totalPrice = this.getTotalPrice();
                
                cartCount.textContent = totalItems;
                cartTotal.textContent = totalPrice.toLocaleString('id-ID');
                
                console.log('🛒 Navbar updated - Items:', totalItems, 'Price:', totalPrice);
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
            const applyPromoBtn = document.getElementById('apply-promo');
            
            if (clearCartBtn) {
                clearCartBtn.addEventListener('click', () => this.clearCart());
            }
            
            if (checkoutBtn) {
                checkoutBtn.addEventListener('click', () => this.checkout());
            }
            
            if (applyPromoBtn) {
                applyPromoBtn.addEventListener('click', () => this.applyPromoCode());
            }
            
            const promoInput = document.getElementById('promo-code');
            if (promoInput) {
                promoInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.applyPromoCode();
                    }
                });
            }
            
            this.renderCartPage();
        } catch (error) {
            console.error('🛒 Error setting up cart page:', error);
        }
    }
    
    applyPromoCode() {
        try {
            const promoCodeInput = document.getElementById('promo-code');
            const promoMessage = document.getElementById('promo-message');
            const discountRow = document.getElementById('discount-row');
            const discountAmount = document.getElementById('discount-amount');
            
            if (!promoCodeInput || !promoMessage) return;
            
            const promoCode = promoCodeInput.value.trim().toUpperCase();
            
            if (!promoCode) {
                promoMessage.textContent = 'Masukkan kode promo terlebih dahulu';
                promoMessage.className = 'promo-message error';
                return;
            }
            
            const validPromoCodes = {
                'DISKON10': { discount: 0.1, minPurchase: 50000 },
                'SELAMAT15': { discount: 0.15, minPurchase: 100000 },
                'WELCOME20': { discount: 0.2, minPurchase: 150000 }
            };
            
            const promo = validPromoCodes[promoCode];
            const subtotal = this.getTotalPrice();
            
            if (!promo) {
                promoMessage.textContent = 'Kode promo tidak valid';
                promoMessage.className = 'promo-message error';
                return;
            }
            
            if (subtotal < promo.minPurchase) {
                promoMessage.textContent = `Minimal pembelian Rp${promo.minPurchase.toLocaleString('id-ID')}`;
                promoMessage.className = 'promo-message error';
                return;
            }
            
            const discount = Math.floor(subtotal * promo.discount);
            this.currentDiscount = discount;
            
            if (discountAmount) discountAmount.textContent = discount.toLocaleString('id-ID');
            if (discountRow) discountRow.style.display = 'flex';
            
            promoMessage.textContent = `Diskon ${promo.discount * 100}% berhasil diterapkan!`;
            promoMessage.className = 'promo-message success';
            
            this.updateCartSummary();
            
        } catch (error) {
            console.error('🛒 Error applying promo code:', error);
        }
    }
    
    updateCartSummary() {
        try {
            const subtotal = this.getTotalPrice();
            const discount = this.currentDiscount || 0;
            const shipping = 0;
            const total = Math.max(0, subtotal - discount + shipping);
            
            const subtotalElement = document.getElementById('subtotal');
            const totalPriceElement = document.getElementById('total-price');
            const shippingElement = document.getElementById('shipping');
            
            if (subtotalElement) subtotalElement.textContent = subtotal.toLocaleString('id-ID');
            if (totalPriceElement) totalPriceElement.textContent = total.toLocaleString('id-ID');
            if (shippingElement) shippingElement.textContent = shipping.toLocaleString('id-ID');
            
        } catch (error) {
            console.error('🛒 Error updating cart summary:', error);
        }
    }
    
    renderCartPage() {
        try {
            console.log('🛒 Rendering cart page');
            const emptyCart = document.getElementById('empty-cart');
            const cartItemsContainer = document.getElementById('cart-items-container');
            const cartItems = document.getElementById('cart-items');
            
            if (!emptyCart || !cartItemsContainer || !cartItems) {
                console.error('🛒 Cart page elements not found');
                return;
            }
            
            if (this.cart.length === 0) {
                console.log('🛒 Cart is empty');
                emptyCart.style.display = 'block';
                cartItemsContainer.style.display = 'none';
                
                this.currentDiscount = 0;
                const discountRow = document.getElementById('discount-row');
                if (discountRow) discountRow.style.display = 'none';
                
                const promoInput = document.getElementById('promo-code');
                const promoMessage = document.getElementById('promo-message');
                if (promoInput) promoInput.value = '';
                if (promoMessage) {
                    promoMessage.textContent = '';
                    promoMessage.className = 'promo-message';
                }
            } else {
                console.log('🛒 Cart has', this.cart.length, 'items');
                emptyCart.style.display = 'none';
                cartItemsContainer.style.display = 'block';
                
                cartItems.innerHTML = '';
                this.cart.forEach(item => {
                    const cartItemElement = this.createCartItemElement(item);
                    cartItems.appendChild(cartItemElement);
                });
                
                this.updateCartSummary();
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
    
            // Validasi form pengiriman
            const shippingForm = document.getElementById('shipping-form');
            if (shippingForm && !shippingForm.checkValidity()) {
                alert('Harap lengkapi semua informasi pengiriman yang wajib diisi!');
                shippingForm.reportValidity();
                return;
            }
    
            // 🔥 CEK LOGIN SEBELUM CHECKOUT
            if (typeof window.authSystem === 'undefined' || !window.authSystem.currentUser) {
                if (confirm('Anda perlu login untuk melanjutkan ke pembayaran. Mau login sekarang?')) {
                    // Simpan data checkout sementara
                    const tempCheckoutData = {
                        cart: this.cart,
                        discount: this.currentDiscount || 0,
                        shippingInfo: this.getShippingInfo(),
                        timestamp: new Date().toISOString()
                    };
                    
                    localStorage.setItem('semart-checkout-temp', JSON.stringify(tempCheckoutData));
                    window.location.href = 'login.html?redirect=payment';
                    return;
                }
                return;
            }
    
            // Generate data checkout
            const checkoutData = {
                cart: this.cart,
                discount: this.currentDiscount || 0,
                shippingInfo: this.getShippingInfo(),
                userInfo: this.getUserInfo(),
                timestamp: new Date().toISOString(),
                orderId: this.generateOrderId(),
                virtualAccount: this.generateVirtualAccount(),
                expiryTime: this.getExpiryTime()
            };
            
            // Simpan data untuk payment page
            localStorage.setItem('semart-checkout', JSON.stringify(checkoutData));
            
            // Redirect ke payment page
            window.location.href = 'payment.html';
            
        } catch (error) {
            console.error('🛒 Error during checkout:', error);
            alert('Terjadi kesalahan saat checkout. Silakan coba lagi.');
        }
    }
    
    generateOrderId() {
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `SM${timestamp}${random}`;
    }
    
    generateVirtualAccount() {
        const bankCode = '888';
        const random = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
        return `${bankCode}${random}`;
    }
    
    getExpiryTime() {
        const now = new Date();
        now.setHours(now.getHours() + 24);
        return now.toISOString();
    }
    
    getUserInfo() {
        try {
            if (window.authSystem && window.authSystem.currentUser) {
                return {
                    name: window.authSystem.currentUser.displayName || 'Customer',
                    email: window.authSystem.currentUser.email || '',
                    phone: window.authSystem.currentUser.phoneNumber || ''
                };
            }
            return {
                name: 'Customer',
                email: '',
                phone: ''
            };
        } catch (error) {
            console.error('🛒 Error getting user info:', error);
            return {};
        }
    }

    getShippingInfo() {
        try {
            return {
                recipientName: document.getElementById('recipient-name')?.value || '',
                recipientPhone: document.getElementById('recipient-phone')?.value || '',
                shippingAddress: document.getElementById('shipping-address')?.value || '',
                city: document.getElementById('city')?.value || '',
                postalCode: document.getElementById('postal-code')?.value || '',
                promoCode: document.getElementById('promo-code')?.value || '',
                orderNotes: document.getElementById('order-notes')?.value || ''
            };
        } catch (error) {
            console.error('🛒 Error getting shipping info:', error);
            return {};
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
        window.shoppingCart = shoppingCart;
        
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
            const cart = JSON.parse(localStorage.getItem('semart-cart') || '[]');
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
            
            localStorage.setItem('semart-cart', JSON.stringify(cart));
            updateNavbarCartGlobal();
            showAddToCartSuccessGlobal(product.name, quantity);
        }
    } catch (error) {
        console.error('🛒 Error in global addToCart:', error);
        alert('Terjadi kesalahan saat menambahkan ke keranjang.');
    }
}

// Global function untuk update navbar
function updateNavbarCartGlobal() {
    try {
        const cart = JSON.parse(localStorage.getItem('semart-cart') || '[]');
        const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const totalPrice = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
        
        const cartCount = document.getElementById('nav-cart-count');
        const cartTotal = document.getElementById('nav-cart-total');
        
        if (cartCount) cartCount.textContent = totalItems;
        if (cartTotal) cartTotal.textContent = totalPrice.toLocaleString('id-ID');
        
        console.log("🛒 Global Navbar updated:", { totalItems, totalPrice });
    } catch (error) {
        console.error("🛒 Error updating global navbar:", error);
    }
}

// Global function untuk show success message
function showAddToCartSuccessGlobal(productName, quantity = 1) {
    try {
        const toast = document.createElement('div');
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

// Expose to global
window.ShoppingCart = ShoppingCart;
window.shoppingCart = shoppingCart;
window.addToCart = addToCart;
window.updateNavbarCartGlobal = updateNavbarCartGlobal;

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

// Debug helper
function debugCartSystem() {
    console.log('🛒=== CART SYSTEM DEBUG ===');
    console.log('🛒 shoppingCart:', window.shoppingCart);
    console.log('🛒 addToCart function:', typeof window.addToCart);
    console.log('🛒 Current cart:', JSON.parse(localStorage.getItem('semart-cart') || '[]'));
    console.log('🛒 Add to cart buttons:', document.querySelectorAll('.add-to-cart, .btn-add-to-cart').length);
    console.log('🛒========================');
}

window.debugCart = debugCartSystem;

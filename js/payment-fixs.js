// payment-fix.js - Emergency fix untuk invoice kosong
console.log('🚀 Loading payment fix...');

class PaymentEmergencyFix {
    constructor() {
        this.maxRetries = 5;
        this.retryCount = 0;
        this.init();
    }

    async init() {
        console.log('🔧 Payment emergency fix initializing...');
        
        // Tunggu DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.startEmergencyCheck();
            });
        } else {
            this.startEmergencyCheck();
        }
    }

    startEmergencyCheck() {
        console.log('🔧 Starting emergency check...');
        
        // Check setiap 500ms selama 5 detik
        const checkInterval = setInterval(() => {
            this.retryCount++;
            
            const customerName = document.getElementById('customer-name');
            const invoiceBody = document.getElementById('invoice-products-body');
            
            console.log(`🔧 Check ${this.retryCount}:`, {
                customerName: customerName?.textContent,
                invoiceBody: invoiceBody?.innerHTML?.substring(0, 50) + '...'
            });

            // Jika masih kosong setelah 2 detik, force render
            if (this.retryCount >= 4) {
                clearInterval(checkInterval);
                this.forceEmergencyRender();
            }
            
            // Jika sudah terisi, stop checking
            if (customerName && customerName.textContent !== '-' && 
                invoiceBody && invoiceBody.innerHTML.trim() !== '') {
                clearInterval(checkInterval);
                console.log('✅ Invoice already rendered normally');
            }
            
            if (this.retryCount >= this.maxRetries) {
                clearInterval(checkInterval);
                console.log('❌ Max retries reached');
            }
        }, 500);
    }

    forceEmergencyRender() {
        console.log('🚨 FORCE EMERGENCY RENDER TRIGGERED');
        
        try {
            // 1. Load data dari localStorage
            const checkoutData = this.loadAndFixCheckoutData();
            if (!checkoutData) {
                this.showCriticalError('Tidak ada data checkout yang valid!');
                return;
            }

            console.log('🔧 Data loaded for emergency render:', checkoutData);

            // 2. Render manual ke DOM
            this.renderToDOM(checkoutData);
            
            // 3. Show success message
            this.showSuccessMessage('Invoice berhasil ditampilkan!');
            
        } catch (error) {
            console.error('❌ Emergency render failed:', error);
            this.showCriticalError('Gagal menampilkan invoice: ' + error.message);
        }
    }

    loadAndFixCheckoutData() {
        console.log('📦 Loading and fixing checkout data...');
        
        try {
            // Coba beberapa kemungkinan key
            let checkoutData = null;
            
            // Priority 1: semart-checkout
            checkoutData = localStorage.getItem('semart-checkout');
            if (checkoutData) {
                console.log('✅ Found semart-checkout data');
                checkoutData = JSON.parse(checkoutData);
            } 
            // Priority 2: semart-checkout-temp
            else if (localStorage.getItem('semart-checkout-temp')) {
                console.log('✅ Found semart-checkout-temp data');
                checkoutData = JSON.parse(localStorage.getItem('semart-checkout-temp'));
            }
            // Priority 3: semart-cart (fallback)
            else if (localStorage.getItem('semart-cart')) {
                console.log('⚠️ Using semart-cart as fallback');
                const cartData = JSON.parse(localStorage.getItem('semart-cart'));
                checkoutData = {
                    cart: Array.isArray(cartData) ? cartData : (cartData.items || cartData.cart || []),
                    shippingInfo: {
                        recipientName: 'Customer',
                        recipientPhone: '-',
                        shippingAddress: '-',
                        city: '-',
                        postalCode: '-'
                    },
                    discount: 0
                };
            } else {
                console.error('❌ No checkout data found anywhere!');
                return null;
            }

            // Fix data structure
            return this.fixDataStructure(checkoutData);
            
        } catch (error) {
            console.error('❌ Error loading checkout data:', error);
            return null;
        }
    }

    fixDataStructure(data) {
        console.log('🔧 Fixing data structure:', data);
        
        const fixedData = {
            // Pastikan cart adalah array
            cart: this.extractCartData(data),
            
            // Shipping info dengan fallback
            shippingInfo: data.shippingInfo || data.userInfo || {
                recipientName: 'Customer',
                recipientPhone: '-',
                shippingAddress: '-', 
                city: '-',
                postalCode: '-'
            },
            
            // Data lainnya dengan default values
            discount: data.discount || 0,
            orderId: data.orderId || `EMG-${Date.now()}`,
            virtualAccount: data.virtualAccount || this.generateVirtualAccount(),
            expiryTime: data.expiryTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };

        console.log('✅ Fixed data structure:', fixedData);
        return fixedData;
    }

    extractCartData(data) {
        if (Array.isArray(data.cart)) {
            return data.cart;
        } else if (Array.isArray(data.items)) {
            return data.items;
        } else if (Array.isArray(data)) {
            return data;
        } else {
            console.warn('⚠️ No cart data found, using empty array');
            return [];
        }
    }

    renderToDOM(data) {
        console.log('🎨 Rendering to DOM...');
        
        const { cart, shippingInfo, discount, orderId, virtualAccount, expiryTime } = data;
        
        // 1. Render customer info
        this.setElementContent('invoice-order-id', orderId);
        this.setElementContent('customer-name', shippingInfo.recipientName);
        this.setElementContent('customer-phone', shippingInfo.recipientPhone);
        this.setElementContent('customer-address', shippingInfo.shippingAddress);
        this.setElementContent('customer-city', `${shippingInfo.city} ${shippingInfo.postalCode}`.trim());
        
        // 2. Render dates
        const now = new Date();
        this.setElementContent('invoice-date', this.formatDate(now));
        this.setElementContent('order-date', now.toLocaleDateString('id-ID'));
        
        // 3. Render products
        this.renderProductsTable(cart);
        
        // 4. Calculate and render totals
        this.renderTotals(cart, discount, virtualAccount);
        
        // 5. Render expiry time
        const expiryDate = new Date(expiryTime);
        this.setElementContent('payment-expiry', this.formatDateTime(expiryDate));
        this.setElementContent('expiry-time', this.formatDateTime(expiryDate));
        
        console.log('✅ DOM rendering completed');
    }

    renderProductsTable(cart) {
        const tbody = document.getElementById('invoice-products-body');
        if (!tbody) {
            console.error('❌ invoice-products-body not found');
            return;
        }

        if (!cart || cart.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: #999;">Tidak ada produk dalam keranjang</td></tr>';
            return;
        }

        tbody.innerHTML = cart.map(item => `
            <tr>
                <td><strong>${item.name || 'Produk'}</strong></td>
                <td>Rp${(item.price || 0).toLocaleString('id-ID')}</td>
                <td>${item.quantity || 1}</td>
                <td>Rp${((item.price || 0) * (item.quantity || 1)).toLocaleString('id-ID')}</td>
            </tr>
        `).join('');

        console.log(`✅ Rendered ${cart.length} products`);
    }

    renderTotals(cart, discount, virtualAccount) {
        if (!cart || cart.length === 0) return;

        const subtotal = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
        const total = Math.max(0, subtotal - discount);

        this.setElementContent('invoice-subtotal', `Rp${subtotal.toLocaleString('id-ID')}`);
        this.setElementContent('invoice-total', `Rp${total.toLocaleString('id-ID')}`);
        this.setElementContent('va-number', virtualAccount);
        this.setElementContent('instruction-va', virtualAccount);
        this.setElementContent('va-amount', `Rp${total.toLocaleString('id-ID')}`);

        // Handle discount
        if (discount > 0) {
            const discountRow = document.getElementById('invoice-discount-row');
            if (discountRow) {
                discountRow.style.display = 'flex';
                this.setElementContent('invoice-discount', `-Rp${discount.toLocaleString('id-ID')}`);
            }
        }

        console.log('✅ Totals rendered:', { subtotal, discount, total });
    }

    setElementContent(id, content) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content;
        } else {
            console.warn(`⚠️ Element ${id} not found`);
        }
    }

    generateVirtualAccount() {
        const bankCode = '888';
        const random = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
        return `${bankCode}${random}`;
    }

    formatDate(date) {
        return date.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatDateTime(date) {
        return date.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showSuccessMessage(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #28a745;
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideInDown 0.3s ease;
            font-family: 'Poppins', sans-serif;
            font-weight: 500;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutUp 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    showCriticalError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #dc3545;
            color: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            z-index: 10000;
            text-align: center;
            max-width: 400px;
            width: 90%;
            font-family: 'Poppins', sans-serif;
        `;
        errorDiv.innerHTML = `
            <h3 style="margin: 0 0 1rem 0;">⚠️ Gagal Memuat Invoice</h3>
            <p style="margin: 0 0 1.5rem 0; opacity: 0.9;">${message}</p>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button onclick="location.href='cart.html'" style="
                    background: white;
                    color: #dc3545;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                ">Kembali ke Keranjang</button>
                <button onclick="location.reload()" style="
                    background: rgba(255,255,255,0.2);
                    color: white;
                    border: 1px solid rgba(255,255,255,0.3);
                    padding: 0.75rem 1.5rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                ">Refresh Halaman</button>
            </div>
        `;
        
        document.body.appendChild(errorDiv);
    }
}

// Add CSS animations
if (!document.querySelector('#emergency-animations')) {
    const style = document.createElement('style');
    style.id = 'emergency-animations';
    style.textContent = `
        @keyframes slideInDown {
            from { transform: translate(-50%, -100%); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes slideOutUp {
            from { transform: translate(-50%, 0); opacity: 1; }
            to { transform: translate(-50%, -100%); opacity: 0; }
        }
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

// Initialize emergency fix
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM ready, starting payment emergency fix...');
    window.paymentEmergencyFix = new PaymentEmergencyFix();
});

// Global debug function
window.debugPaymentData = function() {
    console.log('🔍=== PAYMENT DATA DEBUG ===');
    console.log('📦 semart-checkout:', JSON.parse(localStorage.getItem('semart-checkout') || 'null'));
    console.log('📦 semart-checkout-temp:', JSON.parse(localStorage.getItem('semart-checkout-temp') || 'null'));
    console.log('🛒 semart-cart:', JSON.parse(localStorage.getItem('semart-cart') || 'null'));
    
    const elements = [
        'invoice-order-id', 'customer-name', 'customer-phone', 
        'customer-address', 'customer-city', 'invoice-products-body'
    ];
    
    elements.forEach(id => {
        const el = document.getElementById(id);
        console.log(`🎯 ${id}:`, el ? el.textContent : 'NOT FOUND');
    });
    
    console.log('🔍==========================');
};

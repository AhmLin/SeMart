// debug-payment.js - Debug helper untuk payment page
console.log('🔧 DEBUG: Payment page loaded');

// Cek semua data di localStorage
function checkAllStorageData() {
    console.log('📦 === LOCALSTORAGE DATA ===');
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.includes('semart') || key.includes('cart') || key.includes('checkout') || key.includes('order')) {
            try {
                const value = JSON.parse(localStorage.getItem(key));
                console.log(`📦 ${key}:`, value);
            } catch (e) {
                console.log(`📦 ${key}:`, localStorage.getItem(key));
            }
        }
    });
    console.log('📦 =========================');
}

// Cek struktur DOM invoice
function checkInvoiceDOM() {
    console.log('🎯 === INVOICE DOM CHECK ===');
    const elements = [
        'invoice-order-id',
        'invoice-date', 
        'customer-name',
        'customer-phone',
        'customer-address',
        'customer-city',
        'invoice-products-body',
        'invoice-subtotal',
        'invoice-total',
        'va-number'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`🎯 ${id}:`, element ? 'FOUND' : 'NOT FOUND', element);
    });
    console.log('🎯 ========================');
}

// Simulate checkout data jika tidak ada
function createSampleCheckoutData() {
    const sampleData = {
        orderId: 'INV-' + Date.now(),
        virtualAccount: '888' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0'),
        expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        discount: 10000,
        shippingInfo: {
            recipientName: 'John Doe',
            recipientPhone: '081234567890',
            shippingAddress: 'Jl. Contoh Alamat No. 123',
            city: 'Jakarta Selatan',
            postalCode: '12345',
            orderNotes: 'Tolong dikirim cepat'
        },
        cart: [
            {
                id: 'prod-1',
                name: 'Product Sample 1',
                price: 50000,
                quantity: 2,
                image: 'images/product1.jpg'
            },
            {
                id: 'prod-2', 
                name: 'Product Sample 2',
                price: 75000,
                quantity: 1,
                image: 'images/product2.jpg'
            }
        ]
    };
    
    localStorage.setItem('semart-checkout', JSON.stringify(sampleData));
    console.log('📝 Sample checkout data created:', sampleData);
    return sampleData;
}

// Load data dan render manual
function manualRender() {
    const checkoutData = JSON.parse(localStorage.getItem('semart-checkout'));
    if (!checkoutData) {
        console.log('❌ No checkout data found, creating sample...');
        createSampleCheckoutData();
        location.reload();
        return;
    }
    
    console.log('🔄 Manual render with data:', checkoutData);
    
    // Render basic info
    document.getElementById('invoice-order-id').textContent = checkoutData.orderId;
    document.getElementById('invoice-date').textContent = new Date().toLocaleDateString('id-ID');
    document.getElementById('order-date').textContent = new Date().toLocaleDateString('id-ID');
    
    // Render customer info
    document.getElementById('customer-name').textContent = checkoutData.shippingInfo.recipientName;
    document.getElementById('customer-phone').textContent = checkoutData.shippingInfo.recipientPhone;
    document.getElementById('customer-address').textContent = checkoutData.shippingInfo.shippingAddress;
    document.getElementById('customer-city').textContent = `${checkoutData.shippingInfo.city} ${checkoutData.shippingInfo.postalCode}`;
    
    // Render products
    const tbody = document.getElementById('invoice-products-body');
    tbody.innerHTML = checkoutData.cart.map(item => `
        <tr>
            <td><strong>${item.name}</strong></td>
            <td>Rp${item.price.toLocaleString('id-ID')}</td>
            <td>${item.quantity}</td>
            <td>Rp${(item.price * item.quantity).toLocaleString('id-ID')}</td>
        </tr>
    `).join('');
    
    // Calculate totals
    const subtotal = checkoutData.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal - (checkoutData.discount || 0);
    
    // Render totals
    document.getElementById('invoice-subtotal').textContent = `Rp${subtotal.toLocaleString('id-ID')}`;
    document.getElementById('invoice-total').textContent = `Rp${total.toLocaleString('id-ID')}`;
    
    // Render virtual account
    document.getElementById('va-number').textContent = checkoutData.virtualAccount;
    document.getElementById('instruction-va').textContent = checkoutData.virtualAccount;
    document.getElementById('va-amount').textContent = `Rp${total.toLocaleString('id-ID')}`;
    
    console.log('✅ Manual render completed');
}

// Export functions untuk global access
window.debugPayment = {
    checkAllStorageData,
    checkInvoiceDOM,
    createSampleCheckoutData,
    manualRender
};

// Auto-run ketika DOM ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 DEBUG: DOM ready, running checks...');
    setTimeout(() => {
        checkAllStorageData();
        checkInvoiceDOM();
        
        // Jika tidak ada data, buat sample
        if (!localStorage.getItem('semart-checkout')) {
            console.log('🔄 No checkout data found, creating sample in 2 seconds...');
            setTimeout(() => {
                createSampleCheckoutData();
                manualRender();
            }, 2000);
        }
    }, 1000);
});

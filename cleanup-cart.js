// cleanup-cart.js - Jalankan sekali untuk hapus data lama
function cleanupOldCartData() {
    console.log('🧹 Cleaning up old cart data...');
    
    const oldKeys = [
        'semart-cart-guest',
        // Tambahkan keys lama lainnya yang pernah digunakan
    ];
    
    let cleanedCount = 0;
    
    oldKeys.forEach(key => {
        if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            console.log(`✅ Removed: ${key}`);
            cleanedCount++;
        }
    });
    
    // Migrasi data jika ada di key lama ke key baru
    const guestCart = localStorage.getItem('semart-cart-guest');
    if (guestCart) {
        localStorage.setItem('semart-cart', guestCart);
        localStorage.removeItem('semart-cart-guest');
        console.log('✅ Migrated guest cart to new key');
        cleanedCount++;
    }
    
    console.log(`🧹 Cleanup completed: ${cleanedCount} items cleaned`);
    
    // Verify
    const currentCart = localStorage.getItem('semart-cart');
    console.log('📦 Current cart data:', currentCart);
}

// Jalankan cleanup
cleanupOldCartData();

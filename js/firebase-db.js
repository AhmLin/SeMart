// firebase-db.js - Firebase Database Operations (FIXED VERSION)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    doc, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    updateDoc,
    deleteDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔥 Konfigurasi Firebase
const firebaseConfig = {
  apiKey: "AIzaSyApFkWDpEodKPHLzePFe0cc9z5kiMZbrS4",
  authDomain: "semart-5da85.firebaseapp.com",
  projectId: "semart-5da85",
  storageBucket: "semart-5da85.firebasestorage.app",
  messagingSenderId: "77585287575",
  appId: "1:77585287575:web:5f58edd85981264da25cd2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

class FirebaseDB {
    constructor() {
        this.db = db;
        this.ordersCollection = "orders";
        this.paymentsCollection = "payments";
        this.usersCollection = "users";
    }

    // ==================== ORDER OPERATIONS ====================

    /**
     * 🔥 Simpan pesanan lengkap ke Firebase - SIMPLIFIED VERSION
     * @param {Object} orderData - Data pesanan dari payment system
     * @returns {Promise<Object>} - Result penyimpanan
     */
    async saveOrder(orderData) {
        try {
            console.log('🔥 [saveOrder] Starting to save order to Firebase...');
            console.log('🔥 [saveOrder] Raw order data:', orderData);

            // Validasi dasar
            if (!orderData) {
                throw new Error('Data order tidak boleh kosong');
            }

            if (!orderData.orderId) {
                throw new Error('orderId tidak ditemukan');
            }

            if (!orderData.userId) {
                throw new Error('userId tidak ditemukan');
            }

            // Validasi items
            if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
                throw new Error('Data items tidak valid atau kosong');
            }

            // Siapkan data yang SIMPLE dan sesuai dengan struktur dari payment.js
            const firebaseOrderData = {
                // ========== BASIC ORDER INFO ==========
                orderId: orderData.orderId,
                orderNumber: orderData.orderNumber || `ORDER-${orderData.orderId}`,
                
                // ========== USER INFO ==========
                userId: orderData.userId,
                userEmail: orderData.userEmail || 'no-email',
                userName: orderData.userName || orderData.recipientInfo?.name || 'Customer',
                
                // ========== RECIPIENT INFO ==========
                recipientInfo: {
                    name: orderData.recipientInfo?.name || orderData.shippingInfo?.recipientName || 'Customer',
                    phone: orderData.recipientInfo?.phone || orderData.shippingInfo?.recipientPhone || '081234567890',
                    address: orderData.recipientInfo?.address || orderData.shippingInfo?.shippingAddress || 'Alamat tidak tersedia',
                    city: orderData.recipientInfo?.city || orderData.shippingInfo?.city || 'Kota',
                    postalCode: orderData.recipientInfo?.postalCode || orderData.shippingInfo?.postalCode || '12345',
                    notes: orderData.recipientInfo?.notes || orderData.shippingInfo?.orderNotes || 'Tidak ada catatan'
                },
                
                // ========== ITEMS ==========
                items: orderData.items.map((item, index) => ({
                    itemId: index + 1,
                    productId: item.productId || item.id || `prod-${index}`,
                    productName: item.productName || item.name || 'Product',
                    price: Number(item.price) || 0,
                    quantity: Number(item.quantity) || 1,
                    subtotal: (Number(item.price) || 0) * (Number(item.quantity) || 1),
                    image: item.image || 'images/placeholder-product.jpg'
                })),
                
                // ========== PAYMENT INFO ==========
                paymentInfo: {
                    method: 'bank_transfer',
                    bankName: 'Bank Nusantara',
                    virtualAccount: orderData.paymentInfo?.virtualAccount || '233110005',
                    
                    // Amount breakdown
                    subtotal: Number(orderData.paymentInfo?.subtotal) || this.calculateSubtotal(orderData.items),
                    discount: Number(orderData.paymentInfo?.discount) || 0,
                    shippingCost: Number(orderData.paymentInfo?.shippingCost) || 0,
                    totalAmount: Number(orderData.paymentInfo?.totalAmount) || 
                                this.calculateTotalAmount(
                                    orderData.items, 
                                    orderData.paymentInfo?.discount, 
                                    orderData.paymentInfo?.shippingCost
                                ),
                    
                    // Status
                    status: 'pending',
                    expiryTime: orderData.paymentInfo?.expiryTime || orderData.expiryTime || this.getExpiryTime()
                },
                
                // ========== ORDER STATUS ==========
                status: 'pending_payment',
                
                // ========== TIMESTAMPS ==========
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                expiresAt: orderData.expiryTime || this.getExpiryTime()
            };

            console.log('🔥 [saveOrder] Processed order data for Firebase:', firebaseOrderData);

            // Validasi final sebelum save
            const validation = this.validateOrderData(firebaseOrderData);
            if (!validation.isValid) {
                throw new Error(`Data tidak valid: ${validation.errors.join(', ')}`);
            }

            // Simpan ke Firebase
            const docRef = await addDoc(collection(this.db, this.ordersCollection), firebaseOrderData);
            console.log('✅ [saveOrder] Order successfully saved with Firebase ID:', docRef.id);
            
            return {
                success: true,
                firebaseId: docRef.id,
                orderId: orderData.orderId,
                message: 'Pesanan berhasil disimpan ke database'
            };

        } catch (error) {
            console.error('❌ [saveOrder] Error saving order to Firebase:', error);
            
            // Return error object instead of throwing untuk compatibility dengan payment.js
            return {
                success: false,
                error: error.message,
                message: `Gagal menyimpan pesanan: ${error.message}`
            };
        }
    }

    /**
     * 🔥 Save order dengan data dari cart/checkout (COMPATIBILITY METHOD)
     * @param {Object} checkoutData - Data dari cart system
     * @returns {Promise<Object>} - Result penyimpanan
     */
    async saveOrderFromCheckout(checkoutData) {
        try {
            console.log('🔥 [saveOrderFromCheckout] Saving order from checkout data:', checkoutData);

            // Transform data dari cart/checkout format ke format Firebase
            const orderData = {
                orderId: checkoutData.orderId,
                userId: checkoutData.userInfo?.uid || checkoutData.userId || 'unknown',
                userEmail: checkoutData.userInfo?.email || '',
                userName: checkoutData.userInfo?.name || checkoutData.shippingInfo?.recipientName || 'Customer',
                
                recipientInfo: {
                    name: checkoutData.shippingInfo?.recipientName || 'Customer',
                    phone: checkoutData.shippingInfo?.recipientPhone || '081234567890',
                    address: checkoutData.shippingInfo?.shippingAddress || 'Alamat tidak tersedia',
                    city: checkoutData.shippingInfo?.city || 'Kota',
                    postalCode: checkoutData.shippingInfo?.postalCode || '12345',
                    notes: checkoutData.shippingInfo?.orderNotes || ''
                },
                
                items: checkoutData.cart || [],
                
                paymentInfo: {
                    subtotal: this.calculateSubtotal(checkoutData.cart),
                    discount: checkoutData.discount || 0,
                    shippingCost: 0,
                    totalAmount: this.calculateTotalAmount(checkoutData.cart, checkoutData.discount, 0)
                },
                
                expiryTime: checkoutData.expiryTime || this.getExpiryTime()
            };

            return await this.saveOrder(orderData);

        } catch (error) {
            console.error('❌ [saveOrderFromCheckout] Error:', error);
            return {
                success: false,
                error: error.message,
                message: `Gagal menyimpan pesanan dari checkout: ${error.message}`
            };
        }
    }

    /**
     * 🔥 Update status pesanan
     * @param {string} orderId - ID pesanan
     * @param {string} newStatus - Status baru
     * @param {string} note - Catatan status (optional)
     * @returns {Promise<Object>} - Result update
     */
    async updateOrderStatus(orderId, newStatus, note = '') {
        try {
            console.log('🔥 [updateOrderStatus] Updating order status:', { orderId, newStatus, note });
            
            const ordersRef = collection(this.db, this.ordersCollection);
            const q = query(ordersRef, where("orderId", "==", orderId));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const docId = querySnapshot.docs[0].id;
                const orderDoc = querySnapshot.docs[0].data();
                
                // Siapkan update data
                const updateData = {
                    status: newStatus,
                    updatedAt: new Date().toISOString()
                };
                
                // Update payment status jika status berubah ke paid
                if (newStatus === 'paid' || newStatus === 'completed') {
                    updateData.paymentInfo = {
                        ...orderDoc.paymentInfo,
                        status: newStatus === 'paid' ? 'paid' : 'completed',
                        paidAt: new Date().toISOString()
                    };
                }
                
                await updateDoc(doc(this.db, this.ordersCollection, docId), updateData);
                
                console.log('✅ [updateOrderStatus] Order status updated successfully');
                return {
                    success: true,
                    message: 'Status pesanan berhasil diperbarui'
                };
            } else {
                throw new Error(`Order dengan ID ${orderId} tidak ditemukan`);
            }
        } catch (error) {
            console.error('❌ [updateOrderStatus] Error:', error);
            return {
                success: false,
                error: error.message,
                message: `Gagal memperbarui status: ${error.message}`
            };
        }
    }

    /**
     * 🔥 Ambil pesanan oleh user ID
     * @param {string} userId - User ID
     * @returns {Promise<Array>} - Daftar pesanan
     */
    async getOrdersByUser(userId) {
        try {
            console.log('🔥 [getOrdersByUser] Getting orders for user:', userId);
            
            if (!userId) {
                throw new Error('User ID tidak boleh kosong');
            }
            
            const ordersRef = collection(this.db, this.ordersCollection);
            const q = query(ordersRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            
            const orders = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                orders.push({
                    id: doc.id,
                    firebaseId: doc.id,
                    ...data,
                    // Format tanggal untuk display
                    createdAtFormatted: this.formatDate(data.createdAt),
                    expiresAtFormatted: this.formatDate(data.expiresAt)
                });
            });
            
            console.log(`✅ [getOrdersByUser] Found ${orders.length} orders for user ${userId}`);
            return {
                success: true,
                data: orders,
                count: orders.length
            };
        } catch (error) {
            console.error('❌ [getOrdersByUser] Error:', error);
            return {
                success: false,
                error: error.message,
                data: [],
                count: 0
            };
        }
    }

    /**
     * 🔥 Ambil detail pesanan by orderId
     * @param {string} orderId - Order ID
     * @returns {Promise<Object>} - Detail pesanan
     */
    async getOrderByOrderId(orderId) {
        try {
            console.log('🔥 [getOrderByOrderId] Getting order by orderId:', orderId);
            
            const ordersRef = collection(this.db, this.ordersCollection);
            const q = query(ordersRef, where("orderId", "==", orderId));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                const data = doc.data();
                
                return {
                    success: true,
                    data: {
                        id: doc.id,
                        firebaseId: doc.id,
                        ...data,
                        createdAtFormatted: this.formatDate(data.createdAt),
                        expiresAtFormatted: this.formatDate(data.expiresAt)
                    }
                };
            } else {
                throw new Error(`Order dengan ID ${orderId} tidak ditemukan`);
            }
        } catch (error) {
            console.error('❌ [getOrderByOrderId] Error:', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * 🔥 Ambil semua pesanan (untuk admin)
     * @returns {Promise<Array>} - Semua pesanan
     */
    async getAllOrders() {
        try {
            console.log('🔥 [getAllOrders] Getting all orders');
            
            const ordersRef = collection(this.db, this.ordersCollection);
            const q = query(ordersRef, orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            
            const orders = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                orders.push({
                    id: doc.id,
                    firebaseId: doc.id,
                    ...data,
                    createdAtFormatted: this.formatDate(data.createdAt),
                    expiresAtFormatted: this.formatDate(data.expiresAt)
                });
            });
            
            console.log(`✅ [getAllOrders] Found ${orders.length} total orders`);
            return {
                success: true,
                data: orders,
                count: orders.length
            };
        } catch (error) {
            console.error('❌ [getAllOrders] Error:', error);
            return {
                success: false,
                error: error.message,
                data: [],
                count: 0
            };
        }
    }

    /**
     * 🔥 Real-time listener untuk pesanan user
     * @param {string} userId - User ID
     * @param {Function} callback - Callback function
     * @returns {Function} - Unsubscribe function
     */
    onUserOrdersChange(userId, callback) {
        try {
            if (!userId) {
                console.error('❌ [onUserOrdersChange] User ID tidak boleh kosong');
                return () => {};
            }
            
            console.log('🔥 [onUserOrdersChange] Setting up real-time listener for user:', userId);
            
            const ordersRef = collection(this.db, this.ordersCollection);
            const q = query(ordersRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
            
            return onSnapshot(q, 
                (snapshot) => {
                    const orders = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        orders.push({
                            id: doc.id,
                            firebaseId: doc.id,
                            ...data,
                            createdAtFormatted: this.formatDate(data.createdAt),
                            expiresAtFormatted: this.formatDate(data.expiresAt)
                        });
                    });
                    console.log(`🔥 [onUserOrdersChange] Real-time update: ${orders.length} orders`);
                    callback({
                        success: true,
                        data: orders,
                        count: orders.length
                    });
                }, 
                (error) => {
                    console.error('❌ [onUserOrdersChange] Error in real-time listener:', error);
                    callback({
                        success: false,
                        error: error.message,
                        data: [],
                        count: 0
                    });
                }
            );
        } catch (error) {
            console.error('❌ [onUserOrdersChange] Setup error:', error);
            return () => {};
        }
    }

    // ==================== PAYMENT OPERATIONS ====================

    /**
     * 🔥 Simpan riwayat pembayaran
     * @param {Object} paymentData - Data pembayaran
     * @returns {Promise<Object>} - Payment result
     */
    async savePaymentHistory(paymentData) {
        try {
            console.log('🔥 [savePaymentHistory] Saving payment history:', paymentData);
            
            const paymentWithTimestamp = {
                ...paymentData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const docRef = await addDoc(collection(this.db, this.paymentsCollection), paymentWithTimestamp);
            console.log('✅ [savePaymentHistory] Payment history saved with ID:', docRef.id);
            
            return {
                success: true,
                paymentId: docRef.id,
                message: 'Riwayat pembayaran berhasil disimpan'
            };
        } catch (error) {
            console.error('❌ [savePaymentHistory] Error:', error);
            return {
                success: false,
                error: error.message,
                message: `Gagal menyimpan riwayat pembayaran: ${error.message}`
            };
        }
    }

    /**
     * 🔥 Update status pembayaran
     * @param {string} orderId - Order ID
     * @param {string} paymentStatus - Status pembayaran
     * @returns {Promise<Object>} - Update result
     */
    async updatePaymentStatus(orderId, paymentStatus) {
        try {
            console.log('🔥 [updatePaymentStatus] Updating payment status:', { orderId, paymentStatus });
            
            const ordersRef = collection(this.db, this.ordersCollection);
            const q = query(ordersRef, where("orderId", "==", orderId));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const docId = querySnapshot.docs[0].id;
                
                await updateDoc(doc(this.db, this.ordersCollection, docId), {
                    "paymentInfo.status": paymentStatus,
                    "paymentInfo.updatedAt": new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                
                console.log('✅ [updatePaymentStatus] Payment status updated successfully');
                return {
                    success: true,
                    message: 'Status pembayaran berhasil diperbarui'
                };
            } else {
                throw new Error(`Order dengan ID ${orderId} tidak ditemukan`);
            }
        } catch (error) {
            console.error('❌ [updatePaymentStatus] Error:', error);
            return {
                success: false,
                error: error.message,
                message: `Gagal memperbarui status pembayaran: ${error.message}`
            };
        }
    }

    // ==================== HELPER METHODS ====================

    /**
     * 🔥 Hitung subtotal dari items
     * @param {Array} items - Daftar items
     * @returns {number} - Subtotal
     */
    calculateSubtotal(items) {
        if (!items || !Array.isArray(items)) return 0;
        
        return items.reduce((total, item) => {
            const price = Number(item.price) || 0;
            const quantity = Number(item.quantity) || 1;
            return total + (price * quantity);
        }, 0);
    }

    /**
     * 🔥 Hitung total amount
     * @param {Array} items - Daftar items
     * @param {number} discount - Diskon
     * @param {number} shippingCost - Ongkos kirim
     * @returns {number} - Total amount
     */
    calculateTotalAmount(items, discount = 0, shippingCost = 0) {
        const subtotal = this.calculateSubtotal(items);
        return Math.max(0, subtotal - discount + shippingCost);
    }

    /**
     * 🔥 Dapatkan waktu expiry (24 jam dari sekarang)
     * @returns {string} - ISO string tanggal expiry
     */
    getExpiryTime() {
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 24);
        return expiry.toISOString();
    }

    /**
     * 🔥 Format tanggal untuk display
     * @param {string} dateString - ISO date string
     * @returns {string} - Formatted date
     */
    formatDate(dateString) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    }

    /**
     * 🔥 Validasi data order
     * @param {Object} orderData - Data order
     * @returns {Object} - Result validasi
     */
    validateOrderData(orderData) {
        const errors = [];
        
        if (!orderData.orderId) errors.push('orderId is required');
        if (!orderData.userId) errors.push('userId is required');
        if (!orderData.items || !Array.isArray(orderData.items)) errors.push('items is required and must be array');
        if (orderData.items.length === 0) errors.push('items cannot be empty');
        
        // Validasi setiap item
        orderData.items.forEach((item, index) => {
            if (!item.productId && !item.id) errors.push(`Item ${index + 1}: productId or id is required`);
            if (!item.productName && !item.name) errors.push(`Item ${index + 1}: productName or name is required`);
            if (Number(item.price) < 0) errors.push(`Item ${index + 1}: price cannot be negative`);
            if (Number(item.quantity) < 1) errors.push(`Item ${index + 1}: quantity must be at least 1`);
        });

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * 🔥 Debug method untuk mengecek koneksi Firebase
     * @returns {Promise<Object>} - Connection status
     */
    async checkConnection() {
        try {
            console.log('🔥 [checkConnection] Checking Firebase connection...');
            
            // Coba akses collection orders
            const ordersRef = collection(this.db, this.ordersCollection);
            const q = query(ordersRef, orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            
            console.log('✅ [checkConnection] Firebase connection successful');
            return {
                success: true,
                connected: true,
                message: 'Firebase connection is working',
                ordersCount: querySnapshot.size
            };
        } catch (error) {
            console.error('❌ [checkConnection] Firebase connection failed:', error);
            return {
                success: false,
                connected: false,
                error: error.message,
                message: 'Firebase connection failed'
            };
        }
    }

    /**
     * 🔥 Clean up expired orders (untuk admin)
     * @returns {Promise<Object>} - Cleanup result
     */
    async cleanupExpiredOrders() {
        try {
            const now = new Date().toISOString();
            const ordersRef = collection(this.db, this.ordersCollection);
            const q = query(
                ordersRef, 
                where("status", "==", "pending_payment"),
                where("expiresAt", "<", now)
            );
            
            const querySnapshot = await getDocs(q);
            const deletePromises = [];
            
            querySnapshot.forEach((doc) => {
                deletePromises.push(deleteDoc(doc.ref));
            });
            
            await Promise.all(deletePromises);
            console.log(`✅ [cleanupExpiredOrders] Cleaned up ${deletePromises.length} expired orders`);
            
            return {
                success: true,
                deletedCount: deletePromises.length,
                message: `Berhasil menghapus ${deletePromises.length} pesanan kedaluwarsa`
            };
        } catch (error) {
            console.error('❌ [cleanupExpiredOrders] Error:', error);
            return {
                success: false,
                error: error.message,
                deletedCount: 0,
                message: `Gagal membersihkan pesanan kedaluwarsa: ${error.message}`
            };
        }
    }
}

// Export instance
const firebaseDB = new FirebaseDB();
export default firebaseDB;

// firebase-db.js - Firebase Database Operations
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

// 🔥 Konfigurasi Firebase - GANTI DENGAN KONFIGURASI ANDA
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
     * 🔥 Simpan pesanan lengkap ke Firebase
     * @param {Object} orderData - Data pesanan lengkap
     * @returns {Promise<Object>} - Result penyimpanan
     */
    async saveOrder(orderData) {
        try {
            console.log('🔥 Saving complete order to Firebase...');
            
            // Validasi data penting
            if (!orderData.orderId || !orderData.userId || !orderData.shippingInfo) {
                throw new Error('Data order tidak lengkap: orderId, userId, atau shippingInfo tidak ada');
            }

            // Validasi items
            if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
                throw new Error('Data items tidak valid atau kosong');
            }

            // Siapkan data lengkap untuk Firebase
            const completeOrderData = {
                // ========== INFORMASI ORDER ==========
                orderId: orderData.orderId,
                orderNumber: `ORDER-${orderData.orderId}`,
                
                // ========== INFORMASI USER ==========
                userId: orderData.userId,
                userEmail: orderData.userEmail || '',
                userName: orderData.userName || orderData.shippingInfo.recipientName,
                
                // ========== INFORMASI PENERIMA LENGKAP ==========
                recipientInfo: {
                    name: orderData.shippingInfo.recipientName || '',
                    phone: orderData.shippingInfo.recipientPhone || '',
                    address: orderData.shippingInfo.shippingAddress || '',
                    city: orderData.shippingInfo.city || '',
                    postalCode: orderData.shippingInfo.postalCode || '',
                    notes: orderData.shippingInfo.orderNotes || 'Tidak ada catatan'
                },
                
                // ========== BARANG YANG DIBELI LENGKAP ==========
                items: orderData.items.map((item, index) => ({
                    itemId: index + 1,
                    productId: item.id || `prod-${index}`,
                    productName: item.name || 'Product',
                    price: Number(item.price) || 0,
                    quantity: Number(item.quantity) || 1,
                    subtotal: (Number(item.price) || 0) * (Number(item.quantity) || 1),
                    image: item.image || 'images/placeholder-product.jpg',
                    category: item.category || 'Umum'
                })),
                
                // ========== INFORMASI PEMBAYARAN LENGKAP ==========
                paymentInfo: {
                    method: 'bank_nusantara',
                    virtualAccount: orderData.paymentInfo?.virtualAccount || this.generateVirtualAccount(),
                    bankName: 'Bank Nusantara',
                    
                    // Breakdown harga
                    subtotal: Number(orderData.paymentInfo?.subtotal) || this.calculateSubtotal(orderData.items),
                    discount: Number(orderData.paymentInfo?.discount) || 0,
                    shippingCost: Number(orderData.paymentInfo?.shippingCost) || 0,
                    tax: Number(orderData.paymentInfo?.tax) || 0,
                    totalAmount: Number(orderData.paymentInfo?.finalAmount) || this.calculateTotalAmount(orderData.items, orderData.paymentInfo?.discount),
                    
                    // Status pembayaran
                    status: 'pending',
                    expiryTime: orderData.expiryTime || this.getExpiryTime()
                },
                
                // ========== INFORMASI PENGIRIMAN ==========
                shippingInfo: {
                    service: 'standard',
                    cost: Number(orderData.paymentInfo?.shippingCost) || 0,
                    estimatedDelivery: this.getEstimatedDelivery(),
                    trackingNumber: '',
                    status: 'pending'
                },
                
                // ========== PROMO & DISKON ==========
                promotion: {
                    promoCode: orderData.promoCode || '',
                    discountAmount: Number(orderData.paymentInfo?.discount) || 0,
                    discountPercentage: this.calculateDiscountPercentage(
                        Number(orderData.paymentInfo?.subtotal) || this.calculateSubtotal(orderData.items),
                        Number(orderData.paymentInfo?.discount) || 0
                    )
                },
                
                // ========== STATUS ORDER ==========
                status: 'pending_payment',
                statusHistory: [
                    {
                        status: 'pending_payment',
                        timestamp: new Date().toISOString(),
                        note: 'Menunggu pembayaran via Bank Nusantara',
                        description: 'Pesanan dibuat dan menunggu pembayaran'
                    }
                ],
                
                // ========== METADATA ==========
                metadata: {
                    itemsCount: orderData.items.length,
                    totalQuantity: orderData.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
                    platform: 'web',
                    browser: navigator.userAgent,
                    screenResolution: `${screen.width}x${screen.height}`,
                    ipAddress: 'unknown' // Di production bisa diisi dengan real IP
                },
                
                // ========== TIMESTAMPS ==========
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                expiresAt: orderData.expiryTime || this.getExpiryTime()
            };

            console.log('🔥 Complete order data prepared:', completeOrderData);

            // Simpan ke collection 'orders'
            const docRef = await addDoc(collection(this.db, this.ordersCollection), completeOrderData);
            console.log('✅ Order successfully saved with ID:', docRef.id);
            
            return {
                success: true,
                firebaseId: docRef.id,
                orderId: orderData.orderId,
                message: 'Pesanan berhasil disimpan ke database'
            };

        } catch (error) {
            console.error('❌ Error saving complete order to Firebase:', error);
            throw new Error(`Gagal menyimpan pesanan: ${error.message}`);
        }
    }

    /**
     * 🔥 Update status pesanan
     * @param {string} orderId - ID pesanan
     * @param {string} newStatus - Status baru
     * @param {string} note - Catatan status (optional)
     * @returns {Promise<boolean>} - Success status
     */
    async updateOrderStatus(orderId, newStatus, note = '') {
        try {
            console.log('🔥 Updating order status:', { orderId, newStatus, note });
            
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
                
                // Tambahkan ke status history
                const statusUpdate = {
                    status: newStatus,
                    timestamp: new Date().toISOString(),
                    note: note || this.getStatusNote(newStatus),
                    description: this.getStatusDescription(newStatus)
                };
                
                updateData.statusHistory = [...(orderDoc.statusHistory || []), statusUpdate];
                
                // Update payment status jika status berubah ke paid
                if (newStatus === 'paid') {
                    updateData.paymentInfo = {
                        ...orderDoc.paymentInfo,
                        status: 'paid',
                        paidAt: new Date().toISOString()
                    };
                }
                
                await updateDoc(doc(this.db, this.ordersCollection, docId), updateData);
                
                console.log('✅ Order status updated successfully');
                return true;
            } else {
                throw new Error(`Order dengan ID ${orderId} tidak ditemukan`);
            }
        } catch (error) {
            console.error('❌ Error updating order status:', error);
            throw error;
        }
    }

    /**
     * 🔥 Ambil pesanan oleh user ID
     * @param {string} userId - User ID
     * @returns {Promise<Array>} - Daftar pesanan
     */
    async getOrdersByUser(userId) {
        try {
            console.log('🔥 Getting orders for user:', userId);
            
            if (!userId) {
                throw new Error('User ID tidak boleh kosong');
            }
            
            const ordersRef = collection(this.db, this.ordersCollection);
            const q = query(ordersRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            
            const orders = [];
            querySnapshot.forEach((doc) => {
                orders.push({
                    id: doc.id,
                    firebaseId: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`✅ Found ${orders.length} orders for user ${userId}`);
            return orders;
        } catch (error) {
            console.error('❌ Error getting user orders:', error);
            throw error;
        }
    }

    /**
     * 🔥 Ambil detail pesanan by orderId
     * @param {string} orderId - Order ID
     * @returns {Promise<Object>} - Detail pesanan
     */
    async getOrderByOrderId(orderId) {
        try {
            console.log('🔥 Getting order by orderId:', orderId);
            
            const ordersRef = collection(this.db, this.ordersCollection);
            const q = query(ordersRef, where("orderId", "==", orderId));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                return {
                    id: doc.id,
                    firebaseId: doc.id,
                    ...doc.data()
                };
            } else {
                throw new Error(`Order dengan ID ${orderId} tidak ditemukan`);
            }
        } catch (error) {
            console.error('❌ Error getting order by orderId:', error);
            throw error;
        }
    }

    /**
     * 🔥 Ambil semua pesanan (untuk admin)
     * @returns {Promise<Array>} - Semua pesanan
     */
    async getAllOrders() {
        try {
            console.log('🔥 Getting all orders');
            
            const ordersRef = collection(this.db, this.ordersCollection);
            const q = query(ordersRef, orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            
            const orders = [];
            querySnapshot.forEach((doc) => {
                orders.push({
                    id: doc.id,
                    firebaseId: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`✅ Found ${orders.length} total orders`);
            return orders;
        } catch (error) {
            console.error('❌ Error getting all orders:', error);
            throw error;
        }
    }

    /**
     * 🔥 Real-time listener untuk pesanan user
     * @param {string} userId - User ID
     * @param {Function} callback - Callback function
     * @returns {Function} - Unsubscribe function
     */
    onUserOrdersChange(userId, callback) {
        if (!userId) {
            console.error('User ID tidak boleh kosong untuk real-time listener');
            return () => {};
        }
        
        const ordersRef = collection(this.db, this.ordersCollection);
        const q = query(ordersRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
        
        return onSnapshot(q, (snapshot) => {
            const orders = [];
            snapshot.forEach((doc) => {
                orders.push({
                    id: doc.id,
                    firebaseId: doc.id,
                    ...doc.data()
                });
            });
            callback(orders);
        }, (error) => {
            console.error('❌ Error in orders real-time listener:', error);
        });
    }

    // ==================== PAYMENT OPERATIONS ====================

    /**
     * 🔥 Simpan riwayat pembayaran
     * @param {Object} paymentData - Data pembayaran
     * @returns {Promise<string>} - Payment ID
     */
    async savePaymentHistory(paymentData) {
        try {
            console.log('🔥 Saving payment history:', paymentData);
            
            const paymentWithTimestamp = {
                ...paymentData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const docRef = await addDoc(collection(this.db, this.paymentsCollection), paymentWithTimestamp);
            console.log('✅ Payment history saved with ID:', docRef.id);
            
            return docRef.id;
        } catch (error) {
            console.error('❌ Error saving payment history:', error);
            throw error;
        }
    }

    /**
     * 🔥 Update status pembayaran
     * @param {string} orderId - Order ID
     * @param {string} paymentStatus - Status pembayaran
     * @returns {Promise<boolean>} - Success status
     */
    async updatePaymentStatus(orderId, paymentStatus) {
        try {
            console.log('🔥 Updating payment status:', { orderId, paymentStatus });
            
            // Update di collection orders
            const ordersRef = collection(this.db, this.ordersCollection);
            const q = query(ordersRef, where("orderId", "==", orderId));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const docId = querySnapshot.docs[0].id;
                const orderDoc = querySnapshot.docs[0].data();
                
                await updateDoc(doc(this.db, this.ordersCollection, docId), {
                    "paymentInfo.status": paymentStatus,
                    "paymentInfo.updatedAt": new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                
                console.log('✅ Payment status updated successfully');
                return true;
            } else {
                throw new Error(`Order dengan ID ${orderId} tidak ditemukan`);
            }
        } catch (error) {
            console.error('❌ Error updating payment status:', error);
            throw error;
        }
    }

    // ==================== HELPER METHODS ====================

    /**
     * 🔥 Generate virtual account number
     * @returns {string} - Virtual account number
     */
    generateVirtualAccount() {
        const bankCode = '888'; // Bank Nusantara
        const random = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
        return `${bankCode}${random}`;
    }

    /**
     * 🔥 Hitung subtotal dari items
     * @param {Array} items - Daftar items
     * @returns {number} - Subtotal
     */
    calculateSubtotal(items) {
        return items.reduce((total, item) => {
            return total + ((Number(item.price) || 0) * (Number(item.quantity) || 0));
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
     * 🔥 Hitung persentase diskon
     * @param {number} subtotal - Subtotal
     * @param {number} discount - Diskon
     * @returns {number} - Persentase diskon
     */
    calculateDiscountPercentage(subtotal, discount) {
        if (!subtotal || !discount) return 0;
        return Math.round((discount / subtotal) * 100);
    }

    /**
     * 🔥 Dapatkan estimasi waktu pengiriman
     * @returns {string} - ISO string tanggal estimasi
     */
    getEstimatedDelivery() {
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 3); // 3 hari kerja
        return deliveryDate.toISOString();
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
     * 🔥 Dapatkan note untuk status
     * @param {string} status - Status order
     * @returns {string} - Note status
     */
    getStatusNote(status) {
        const statusNotes = {
            'pending_payment': 'Menunggu pembayaran',
            'paid': 'Pembayaran diterima',
            'processing': 'Pesanan sedang diproses',
            'shipped': 'Pesanan dikirim',
            'delivered': 'Pesanan diterima',
            'completed': 'Pesanan selesai',
            'cancelled': 'Pesanan dibatalkan'
        };
        return statusNotes[status] || 'Status diperbarui';
    }

    /**
     * 🔥 Dapatkan deskripsi untuk status
     * @param {string} status - Status order
     * @returns {string} - Deskripsi status
     */
    getStatusDescription(status) {
        const statusDescriptions = {
            'pending_payment': 'Pesanan dibuat dan menunggu pembayaran',
            'paid': 'Pembayaran berhasil dikonfirmasi',
            'processing': 'Pesanan sedang disiapkan untuk pengiriman',
            'shipped': 'Pesanan telah dikirim ke kurir',
            'delivered': 'Pesanan telah diterima oleh customer',
            'completed': 'Pesanan telah selesai',
            'cancelled': 'Pesanan telah dibatalkan'
        };
        return statusDescriptions[status] || 'Status pesanan diperbarui';
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
        if (!orderData.shippingInfo) errors.push('shippingInfo is required');
        if (!orderData.items || !Array.isArray(orderData.items)) errors.push('items is required and must be array');
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * 🔥 Clean up expired orders (untuk admin)
     * @returns {Promise<number>} - Jumlah order yang dihapus
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
            console.log(`✅ Cleaned up ${deletePromises.length} expired orders`);
            return deletePromises.length;
        } catch (error) {
            console.error('❌ Error cleaning up expired orders:', error);
            throw error;
        }
    }
}

// Export instance
const firebaseDB = new FirebaseDB();
export default firebaseDB;

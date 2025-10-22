// payment-full.js
// Module tunggal: FirebaseDB + Payment page logic
// Muat di HTML dengan: <script type="module" src="js/payment-full.js"></script>

/* ===========================
   FirebaseDB (Firestore helper)
   =========================== */
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

// TODO: ganti konfigurasi ini ke milikmu
const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

class FirebaseDB {
    constructor() {
        this.db = db;
        this.ordersCollection = "orders";
        this.paymentsCollection = "payments";
        this.usersCollection = "users";
        this.initialized = true;
    }

    // Save order (full)
    async saveOrder(orderData) {
        try {
            console.log('🔥 Saving complete order to Firebase...');
            if (!orderData.orderId || !orderData.userId || !orderData.shippingInfo) {
                throw new Error('Data order tidak lengkap: orderId, userId, atau shippingInfo tidak ada');
            }
            if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
                throw new Error('Data items tidak valid atau kosong');
            }

            const completeOrderData = {
                orderId: orderData.orderId,
                orderNumber: `ORDER-${orderData.orderId}`,
                userId: orderData.userId,
                userEmail: orderData.userEmail || '',
                userName: orderData.userName || orderData.shippingInfo.recipientName,
                recipientInfo: {
                    name: orderData.shippingInfo.recipientName || '',
                    phone: orderData.shippingInfo.recipientPhone || '',
                    address: orderData.shippingInfo.shippingAddress || '',
                    city: orderData.shippingInfo.city || '',
                    postalCode: orderData.shippingInfo.postalCode || '',
                    notes: orderData.shippingInfo.orderNotes || 'Tidak ada catatan'
                },
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
                paymentInfo: {
                    method: orderData.paymentInfo?.method || 'bank_nusantara',
                    virtualAccount: orderData.paymentInfo?.virtualAccount || this.generateVirtualAccount(),
                    bankName: orderData.paymentInfo?.bankName || 'Bank Nusantara',
                    subtotal: Number(orderData.paymentInfo?.subtotal) || this.calculateSubtotal(orderData.items),
                    discount: Number(orderData.paymentInfo?.discount) || 0,
                    shippingCost: Number(orderData.paymentInfo?.shippingCost) || 0,
                    tax: Number(orderData.paymentInfo?.tax) || 0,
                    totalAmount: Number(orderData.paymentInfo?.finalAmount) || this.calculateTotalAmount(orderData.items, orderData.paymentInfo?.discount),
                    status: orderData.paymentInfo?.status || 'pending',
                    expiryTime: orderData.expiryTime || this.getExpiryTime()
                },
                shippingInfo: {
                    service: 'standard',
                    cost: Number(orderData.paymentInfo?.shippingCost) || 0,
                    estimatedDelivery: this.getEstimatedDelivery(),
                    trackingNumber: '',
                    status: 'pending'
                },
                promotion: {
                    promoCode: orderData.promoCode || '',
                    discountAmount: Number(orderData.paymentInfo?.discount) || 0,
                    discountPercentage: this.calculateDiscountPercentage(
                        Number(orderData.paymentInfo?.subtotal) || this.calculateSubtotal(orderData.items),
                        Number(orderData.paymentInfo?.discount) || 0
                    )
                },
                status: 'pending_payment',
                statusHistory: [
                    {
                        status: 'pending_payment',
                        timestamp: new Date().toISOString(),
                        note: 'Menunggu pembayaran',
                        description: 'Pesanan dibuat dan menunggu pembayaran'
                    }
                ],
                metadata: {
                    itemsCount: orderData.items.length,
                    totalQuantity: orderData.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
                    platform: 'web',
                    browser: navigator.userAgent,
                    screenResolution: `${screen.width}x${screen.height}`,
                    ipAddress: 'unknown'
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                expiresAt: orderData.expiryTime || this.getExpiryTime()
            };

            console.log('🔥 Complete order data prepared:', completeOrderData);

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

    async updateOrderStatus(orderId, newStatus, note = '') {
        try {
            console.log('🔥 Updating order status:', { orderId, newStatus, note });
            const ordersRef = collection(this.db, this.ordersCollection);
            const q = query(ordersRef, where("orderId", "==", orderId));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const docId = querySnapshot.docs[0].id;
                const orderDoc = querySnapshot.docs[0].data();
                const updateData = {
                    status: newStatus,
                    updatedAt: new Date().toISOString()
                };
                const statusUpdate = {
                    status: newStatus,
                    timestamp: new Date().toISOString(),
                    note: note || this.getStatusNote(newStatus),
                    description: this.getStatusDescription(newStatus)
                };
                updateData.statusHistory = [...(orderDoc.statusHistory || []), statusUpdate];

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

    async getOrdersByUser(userId) {
        try {
            console.log('🔥 Getting orders for user:', userId);
            if (!userId) throw new Error('User ID tidak boleh kosong');
            const ordersRef = collection(this.db, this.ordersCollection);
            const q = query(ordersRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const orders = [];
            querySnapshot.forEach((doc) => {
                orders.push({ id: doc.id, firebaseId: doc.id, ...doc.data() });
            });
            console.log(`✅ Found ${orders.length} orders for user ${userId}`);
            return orders;
        } catch (error) {
            console.error('❌ Error getting user orders:', error);
            throw error;
        }
    }

    async getOrderByOrderId(orderId) {
        try {
            console.log('🔥 Getting order by orderId:', orderId);
            const ordersRef = collection(this.db, this.ordersCollection);
            const q = query(ordersRef, where("orderId", "==", orderId));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const docSnap = querySnapshot.docs[0];
                return { id: docSnap.id, firebaseId: docSnap.id, ...docSnap.data() };
            } else {
                throw new Error(`Order dengan ID ${orderId} tidak ditemukan`);
            }
        } catch (error) {
            console.error('❌ Error getting order by orderId:', error);
            throw error;
        }
    }

    async getAllOrders() {
        try {
            console.log('🔥 Getting all orders');
            const ordersRef = collection(this.db, this.ordersCollection);
            const q = query(ordersRef, orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const orders = [];
            querySnapshot.forEach((doc) => {
                orders.push({ id: doc.id, firebaseId: doc.id, ...doc.data() });
            });
            console.log(`✅ Found ${orders.length} total orders`);
            return orders;
        } catch (error) {
            console.error('❌ Error getting all orders:', error);
            throw error;
        }
    }

    onUserOrdersChange(userId, callback) {
        if (!userId) {
            console.error('User ID tidak boleh kosong untuk real-time listener');
            return () => {};
        }
        const ordersRef = collection(this.db, this.ordersCollection);
        const q = query(ordersRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
        return onSnapshot(q, (snapshot) => {
            const orders = [];
            snapshot.forEach((docSnap) => orders.push({ id: docSnap.id, firebaseId: docSnap.id, ...docSnap.data() }));
            callback(orders);
        }, (error) => {
            console.error('❌ Error in orders real-time listener:', error);
        });
    }

    async savePaymentHistory(paymentData) {
        try {
            console.log('🔥 Saving payment history:', paymentData);
            const paymentWithTimestamp = { ...paymentData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
            const docRef = await addDoc(collection(this.db, this.paymentsCollection), paymentWithTimestamp);
            console.log('✅ Payment history saved with ID:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('❌ Error saving payment history:', error);
            throw error;
        }
    }

    async updatePaymentStatus(orderId, paymentStatus) {
        try {
            console.log('🔥 Updating payment status:', { orderId, paymentStatus });
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

    generateVirtualAccount() {
        const bankCode = '888';
        const random = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
        return `${bankCode}${random}`;
    }

    calculateSubtotal(items) {
        return items.reduce((total, item) => total + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);
    }

    calculateTotalAmount(items, discount = 0, shippingCost = 0) {
        const subtotal = this.calculateSubtotal(items);
        return Math.max(0, subtotal - discount + shippingCost);
    }

    calculateDiscountPercentage(subtotal, discount) {
        if (!subtotal || !discount) return 0;
        return Math.round((discount / subtotal) * 100);
    }

    getEstimatedDelivery() {
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 3);
        return deliveryDate.toISOString();
    }

    getExpiryTime() {
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 24);
        return expiry.toISOString();
    }

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

    validateOrderData(orderData) {
        const errors = [];
        if (!orderData.orderId) errors.push('orderId is required');
        if (!orderData.userId) errors.push('userId is required');
        if (!orderData.shippingInfo) errors.push('shippingInfo is required');
        if (!orderData.items || !Array.isArray(orderData.items)) errors.push('items is required and must be array');
        return { isValid: errors.length === 0, errors: errors };
    }

    async cleanupExpiredOrders() {
        try {
            const now = new Date().toISOString();
            const ordersRef = collection(this.db, this.ordersCollection);
            const q = query(ordersRef, where("status", "==", "pending_payment"), where("expiresAt", "<", now));
            const querySnapshot = await getDocs(q);
            const deletePromises = [];
            querySnapshot.forEach((docSnap) => deletePromises.push(deleteDoc(docSnap.ref)));
            await Promise.all(deletePromises);
            console.log(`✅ Cleaned up ${deletePromises.length} expired orders`);
            return deletePromises.length;
        } catch (error) {
            console.error('❌ Error cleaning up expired orders:', error);
            throw error;
        }
    }
}

// instantiate helper
const firebaseDB = new FirebaseDB();

/* ===========================
   Payment page logic (from your payment.js)
   =========================== */

// ELEMENT REFERENCES
const invoiceOrderId = document.getElementById("invoice-order-id");
const invoiceDate = document.getElementById("invoice-date");
const invoiceProductsBody = document.getElementById("invoice-products-body");
const invoiceSubtotal = document.getElementById("invoice-subtotal");
const invoiceDiscountRow = document.getElementById("invoice-discount-row");
const invoiceDiscount = document.getElementById("invoice-discount");
const invoiceShipping = document.getElementById("invoice-shipping");
const invoiceTotal = document.getElementById("invoice-total");
const customerNameEl = document.getElementById("customer-name");
const customerPhone = document.getElementById("customer-phone");
const customerAddress = document.getElementById("customer-address");
const customerCity = document.getElementById("customer-city");
const vaNumber = document.getElementById("va-number");
const vaAmount = document.getElementById("va-amount");
const instructionVa = document.getElementById("instruction-va");
const paymentTimer = document.getElementById("payment-timer");
const downloadBtn = document.getElementById("download-pdf");
const printBtn = document.getElementById("print-invoice");
const checkStatusBtn = document.getElementById("check-status");

// Data from localStorage
const orderData = JSON.parse(localStorage.getItem("semart-current-order")) || null;
const currentUser = JSON.parse(localStorage.getItem("semart-current-user")) || null;

if (!orderData) {
    alert("Tidak ada data pesanan ditemukan. Kembali ke keranjang.");
    window.location.href = "cart.html";
}

// Helpers
function formatRupiah(num) {
    return "Rp" + Number(num).toLocaleString("id-ID");
}
function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Display invoice (uses firebaseDB.generateVirtualAccount)
function displayInvoice(data) {
    const orderId = data.orderId || Math.floor(Math.random() * 100000);
    const orderDate = new Date();

    if (invoiceOrderId) invoiceOrderId.textContent = orderId;
    if (invoiceDate) invoiceDate.textContent = formatDate(orderDate);
    if (customerNameEl) customerNameEl.textContent = data.shippingInfo.recipientName;
    if (customerPhone) customerPhone.textContent = data.shippingInfo.recipientPhone;
    if (customerAddress) customerAddress.textContent = data.shippingInfo.shippingAddress;
    if (customerCity) customerCity.textContent = data.shippingInfo.city;

    if (invoiceProductsBody) {
        invoiceProductsBody.innerHTML = "";
        let subtotal = 0;
        data.items.forEach(item => {
            const tr = document.createElement("tr");
            const subtotalItem = item.price * item.quantity;
            subtotal += subtotalItem;
            tr.innerHTML = `
                <td>${item.name}</td>
                <td>${formatRupiah(item.price)}</td>
                <td>${item.quantity}</td>
                <td>${formatRupiah(subtotalItem)}</td>
            `;
            invoiceProductsBody.appendChild(tr);
        });
        if (invoiceSubtotal) invoiceSubtotal.textContent = formatRupiah(subtotal);
    }

    if (data.paymentInfo?.discount > 0 && invoiceDiscountRow && invoiceDiscount) {
        invoiceDiscountRow.style.display = "flex";
        invoiceDiscount.textContent = "-" + formatRupiah(data.paymentInfo.discount);
    }

    if (invoiceShipping) invoiceShipping.textContent = formatRupiah(data.paymentInfo?.shippingCost || 0);
    if (invoiceTotal) invoiceTotal.textContent = formatRupiah(data.paymentInfo?.finalAmount || 0);

    const va = firebaseDB.generateVirtualAccount();
    if (vaNumber) vaNumber.textContent = va;
    if (instructionVa) instructionVa.textContent = va;
    if (vaAmount) vaAmount.textContent = formatRupiah(data.paymentInfo?.finalAmount || 0);

    // persist updated order
    data.paymentInfo = data.paymentInfo || {};
    data.paymentInfo.virtualAccount = va;
    data.orderId = orderId;
    data.orderDate = orderDate.toISOString();
    localStorage.setItem("semart-current-order", JSON.stringify(data));
}

// Save order to firebase (requires user)
async function saveOrderToFirebase() {
    try {
        if (!currentUser || !currentUser.uid) {
            alert("Anda harus login untuk melanjutkan pembayaran.");
            return;
        }
        const orderToSave = {
            ...orderData,
            orderId: orderData.orderId || Date.now().toString(),
            userId: currentUser.uid,
            userEmail: currentUser.email,
            userName: currentUser.displayName || orderData.shippingInfo.recipientName,
            expiryTime: firebaseDB.getExpiryTime()
        };

        const result = await firebaseDB.saveOrder(orderToSave);
        console.log("✅ Pesanan tersimpan di Firebase:", result);
    } catch (error) {
        console.error("❌ Gagal menyimpan ke Firebase:", error);
        alert("Gagal menyimpan pesanan. Coba lagi nanti.");
    }
}

// PDF download
if (downloadBtn) {
    downloadBtn.addEventListener("click", async () => {
        try {
            const { jsPDF } = window.jspdf || {};
            if (typeof html2canvas === 'undefined' || !jsPDF) {
                alert('Library PDF belum tersedia.');
                return;
            }
            const invoiceContent = document.getElementById("invoice-content");
            const canvas = await html2canvas(invoiceContent, { scale: 2 });
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("p", "mm", "a4");
            const imgWidth = 190;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
            pdf.save(`Invoice_SeMart_${invoiceOrderId?.textContent || 'invoice'}.pdf`);
        } catch (err) {
            console.error('PDF error', err);
            alert('Gagal membuat PDF');
        }
    });
}

// Print
if (printBtn) printBtn.addEventListener("click", () => window.print());

// Check status
if (checkStatusBtn) {
    checkStatusBtn.addEventListener("click", async () => {
        try {
            const result = await firebaseDB.getOrderByOrderId(orderData.orderId);
            const status = result.paymentInfo?.status || "pending";
            alert(`Status Pembayaran: ${status.toUpperCase()}`);
        } catch (error) {
            console.error(error);
            alert("Gagal memeriksa status pembayaran");
        }
    });
}

// Countdown (visual)
let countdown = 24 * 60 * 60; // 24 jam
const countdownInterval = setInterval(() => {
    const hours = String(Math.floor(countdown / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((countdown % 3600) / 60)).padStart(2, "0");
    const seconds = String(countdown % 60).padStart(2, "0");
    if (paymentTimer) paymentTimer.textContent = `${hours}:${minutes}:${seconds}`;
    countdown--;
    if (countdown <= 0) {
        if (paymentTimer) paymentTimer.textContent = "00:00:00";
        clearInterval(countdownInterval);
    }
}, 1000);

// Execute display + save
displayInvoice(orderData);
// try saving to firebase if user present
saveOrderToFirebase();

/* End of module */

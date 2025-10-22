// payment.js - Final Version dengan Firebase Integration & Auth System
class PaymentSystem {
    constructor() {
        this.checkoutData = null;
        this.paymentTimer = null;
        this.isAuthReady = false;
        this.init();
    }

    async init() {
        console.log('💳 Initializing payment system');
        
        try {
            // Tunggu auth system ready
            await this.waitForAuthSystem();
            this.isAuthReady = true;
            
            console.log('💳 Auth system ready, current user:', window.authSystem?.currentUser);
            
            this.loadCheckoutData();
            
            // Setup UI berdasarkan login status
            this.setupAuthBasedUI();
            this.setupEventListeners();
            this.startPaymentTimer();
            
            // Simpan ke Firebase jika user login
            if (this.isUserLoggedIn()) {
                await this.saveCompleteOrderToFirebase();
            }
            
        } catch (error) {
            console.error('💳 Error during payment initialization:', error);
            // Fallback: lanjutkan tanpa auth
            this.loadCheckoutData();
            this.setupEventListeners();
            this.startPaymentTimer();
        }
    }

    // ==================== AUTHENTICATION & FIREBASE ====================

    /**
     * 🔐 Tunggu auth system siap
     */
    async waitForAuthSystem(maxWait = 10000) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            
            const checkAuth = () => {
                if (window.authSystem !== undefined) {
                    console.log('💳 Auth system loaded after', Date.now() - startTime, 'ms');
                    resolve();
                } else if (Date.now() - startTime > maxWait) {
                    console.warn('💳 Auth system timeout, continuing without auth');
                    resolve(); // Lanjut tanpa auth
                } else {
                    setTimeout(checkAuth, 100);
                }
            };
            
            checkAuth();
        });
    }

    /**
     * 🔍 Cek apakah user login
     */
    isUserLoggedIn() {
        return this.isAuthReady && 
               window.authSystem?.currentUser !== null && 
               window.authSystem?.currentUser !== undefined;
    }

    /**
     * 🎨 Setup UI berdasarkan status login
     */
    setupAuthBasedUI() {
        if (this.isUserLoggedIn()) {
            console.log('💳 User is logged in, showing secure features');
            this.showLoggedInFeatures();
        } else {
            console.log('💳 User is not logged in, showing guest features');
            this.showGuestFeatures();
        }
    }

    /**
     * 🔐 Tampilkan fitur untuk user login
     */
    showLoggedInFeatures() {
        const user = window.authSystem.currentUser;
        console.log('💳 Logged in user:', user.email);
        this.updateInvoiceWithUserInfo(user);
        this.showFirebaseSaveStatus();
    }

    /**
     * 🎭 Tampilkan fitur untuk guest
     */
    showGuestFeatures() {
        this.showGuestReminder();
    }

    /**
     * 💬 Tampilkan reminder untuk guest
     */
    showGuestReminder() {
        const reminder = document.createElement('div');
        reminder.style.cssText = `
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
            text-align: center;
        `;
        reminder.innerHTML = `
            <p style="margin: 0 0 0.5rem 0;">
                <strong>💡 Tips:</strong> 
                <a href="login.html?redirect=payment" style="color: #007bff; text-decoration: underline;">
                    Login
                </a> 
                untuk menyimpan riwayat pesanan dan notifikasi status pembayaran otomatis.
            </p>
            <small>Pesanan tetap bisa diproses tanpa login</small>
        `;
        
        const actionsSection = document.querySelector('.payment-actions-section');
        if (actionsSection) {
            actionsSection.insertBefore(reminder, actionsSection.firstChild);
        }
    }

    /**
     * 📝 Update invoice dengan info user
     */
    updateInvoiceWithUserInfo(user) {
        const customerName = document.getElementById('customer-name');
        if (customerName && user.displayName) {
            customerName.textContent = user.displayName;
        }
        
        const customerInfo = document.querySelector('.invoice-customer');
        if (customerInfo && user.email) {
            const emailElement = document.createElement('p');
            emailElement.textContent = `Email: ${user.email}`;
            emailElement.style.margin = '0.25rem 0';
            emailElement.style.fontSize = '0.9rem';
            emailElement.style.color = '#666';
            customerInfo.appendChild(emailElement);
        }
    }

    /**
     * 💾 Simpan data lengkap ke Firebase
     */
    async saveCompleteOrderToFirebase() {
        try {
            if (!this.checkoutData) {
                console.log('💳 No checkout data available for Firebase');
                return;
            }

            if (!this.isUserLoggedIn()) {
                console.log('💳 User not logged in, skipping Firebase save');
                this.saveOrderTemporarily();
                return;
            }

            const user = window.authSystem.currentUser;
            console.log('💳 Saving order to Firebase for user:', user.email);

            // Cek jika order sudah disimpan sebelumnya
            const existingOrder = localStorage.getItem(`order-${this.checkoutData.orderId}-saved`);
            if (existingOrder) {
                console.log('💳 Order already saved to Firebase');
                return;
            }

            // 🔥 SIAPKAN DATA LENGKAP DARI PAYMENT PAGE
            const completeOrderData = {
                orderId: this.checkoutData.orderId,
                userId: user.uid,
                userEmail: user.email,
                userName: user.displayName || this.checkoutData.shippingInfo.recipientName,
                
                // INFORMASI PENERIMA
                shippingInfo: {
                    recipientName: this.checkoutData.shippingInfo.recipientName,
                    recipientPhone: this.checkoutData.shippingInfo.recipientPhone,
                    shippingAddress: this.checkoutData.shippingInfo.shippingAddress,
                    city: this.checkoutData.shippingInfo.city,
                    postalCode: this.checkoutData.shippingInfo.postalCode,
                    orderNotes: this.checkoutData.shippingInfo.orderNotes || ''
                },
                
                // BARANG YANG DIBELI
                items: this.checkoutData.cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    image: item.image,
                    subtotal: item.price * item.quantity
                })),
                
                // INFORMASI PEMBAYARAN
                paymentInfo: {
                    virtualAccount: this.checkoutData.virtualAccount,
                    subtotal: this.getTotalAmount(),
                    discount: this.checkoutData.discount || 0,
                    shippingCost: 0,
                    finalAmount: this.getTotalAmount() - (this.checkoutData.discount || 0),
                    status: 'pending'
                },
                
                // INFORMASI PROMO
                promoCode: this.checkoutData.shippingInfo.promoCode || '',
                discountPercentage: this.calculateDiscountPercentage(),
                
                // STATUS & TIMESTAMP
                status: 'pending_payment',
                expiryTime: this.checkoutData.expiryTime,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            console.log('💳 Complete order data for Firebase:', completeOrderData);

            // Pastikan firebaseDB tersedia
            if (typeof firebaseDB === 'undefined' || !firebaseDB.initialized) {
                console.warn('💳 FirebaseDB not available, saving temporarily');
                this.saveOrderTemporarily();
                return;
            }

            // Simpan ke Firebase
            const result = await firebaseDB.saveOrder(completeOrderData);
            
            // Tandai sudah disimpan
            localStorage.setItem(`order-${this.checkoutData.orderId}-saved`, 'true');
            
            // Hapus data temporary jika ada
            localStorage.removeItem(`temp-order-${this.checkoutData.orderId}`);
            
            console.log('💳 Complete order successfully saved to Firebase:', result);
            
            // Update UI untuk menunjukkan data tersimpan
            this.showFirebaseSaveStatus();

        } catch (error) {
            console.error('💳 Error saving complete order to Firebase:', error);
            
            // Simpan sementara jika gagal
            this.saveOrderTemporarily();
            
            this.showMessage(
                'Pesanan berhasil dibuat. Data akan disimpan ke server setelah terkoneksi.', 
                'info'
            );
        }
    }

    /**
     * 💾 Simpan data sementara di localStorage
     */
    saveOrderTemporarily() {
        try {
            if (!this.checkoutData) return;
            
            const tempOrderData = {
                ...this.checkoutData,
                savedAt: new Date().toISOString(),
                status: 'temporary',
                retryCount: 0
            };
            
            localStorage.setItem(`temp-order-${this.checkoutData.orderId}`, JSON.stringify(tempOrderData));
            console.log('💳 Order saved temporarily:', this.checkoutData.orderId);
            
        } catch (error) {
            console.error('💳 Error saving temporary order:', error);
        }
    }

    // ==================== INVOICE RENDERING ====================

    /**
     * 📄 Load checkout data dari localStorage
     */
    loadCheckoutData() {
        try {
            const checkoutData = localStorage.getItem('semart-checkout');
            if (!checkoutData) {
                console.error('❌ No checkout data found');
                this.showError('Data checkout tidak ditemukan. Silakan kembali ke keranjang.');
                return;
            }

            this.checkoutData = JSON.parse(checkoutData);
            console.log('💳 Complete checkout data loaded:', this.checkoutData);
            this.renderInvoice();
            
        } catch (error) {
            console.error('💳 Error loading checkout data:', error);
            this.showError('Terjadi kesalahan saat memuat data pembayaran.');
        }
    }

    /**
     * 🎨 Render invoice ke HTML
     */
    renderInvoice() {
        if (!this.checkoutData) return;

        try {
            const { cart, discount, shippingInfo, orderId, virtualAccount, expiryTime } = this.checkoutData;
            
            // Calculate totals
            const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const shipping = 0;
            const total = Math.max(0, subtotal - discount + shipping);

            // Set invoice data
            this.setElementText('invoice-order-id', orderId);
            this.setElementText('invoice-date', new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }));
            this.setElementText('order-date', new Date().toLocaleDateString('id-ID'));

            // Customer info
            this.setElementText('customer-name', shippingInfo.recipientName);
            this.setElementText('customer-phone', shippingInfo.recipientPhone);
            this.setElementText('customer-address', shippingInfo.shippingAddress);
            this.setElementText('customer-city', `${shippingInfo.city} ${shippingInfo.postalCode}`);

            // Products
            this.renderProductsTable(cart);

            // Totals
            this.setElementText('invoice-subtotal', `Rp${subtotal.toLocaleString('id-ID')}`);
            this.setElementText('invoice-total', `Rp${total.toLocaleString('id-ID')}`);
            this.setElementText('invoice-shipping', `Rp${shipping.toLocaleString('id-ID')}`);

            // Discount
            if (discount > 0) {
                const discountRow = document.getElementById('invoice-discount-row');
                if (discountRow) {
                    discountRow.style.display = 'flex';
                    this.setElementText('invoice-discount', `-Rp${discount.toLocaleString('id-ID')}`);
                }
            }

            // Virtual Account
            this.setElementText('va-number', virtualAccount);
            this.setElementText('instruction-va', virtualAccount);
            this.setElementText('va-amount', `Rp${total.toLocaleString('id-ID')}`);

            // Expiry time
            const expiryDate = new Date(expiryTime);
            const formattedExpiry = expiryDate.toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            this.setElementText('payment-expiry', formattedExpiry);
            this.setElementText('expiry-time', formattedExpiry);

        } catch (error) {
            console.error('💳 Error rendering invoice:', error);
        }
    }

    /**
     * 📊 Render tabel produk
     */
    renderProductsTable(cart) {
        const tbody = document.getElementById('invoice-products-body');
        if (!tbody) return;

        tbody.innerHTML = cart.map(item => `
            <tr>
                <td>
                    <strong>${item.name}</strong>
                </td>
                <td>Rp${(item.price || 0).toLocaleString('id-ID')}</td>
                <td>${item.quantity || 0}</td>
                <td>Rp${((item.price || 0) * (item.quantity || 0)).toLocaleString('id-ID')}</td>
            </tr>
        `).join('');
    }

    // ==================== PDF & PRINT FUNCTIONALITY ====================

    /**
     * 📄 Download invoice sebagai PDF
     */
    async downloadPDF() {
        try {
            const invoiceContent = document.getElementById('invoice-content');
            if (!invoiceContent) {
                throw new Error('Invoice content not found');
            }

            // Show loading
            const downloadBtn = document.getElementById('download-pdf');
            const originalText = downloadBtn?.textContent || 'Download PDF Invoice';
            if (downloadBtn) {
                downloadBtn.textContent = 'Membuat PDF...';
                downloadBtn.disabled = true;
            }

            // Check jika libraries tersedia
            if (typeof html2canvas === 'undefined') {
                throw new Error('html2canvas library tidak tersedia');
            }

            if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
                throw new Error('jsPDF library tidak tersedia');
            }

            // Use html2canvas untuk capture invoice
            const canvas = await html2canvas(invoiceContent, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            
            // Handle jsPDF yang berbeda-beda
            let pdf;
            if (typeof jspdf !== 'undefined') {
                pdf = new jspdf.jsPDF('p', 'mm', 'a4');
            } else if (typeof window.jspdf !== 'undefined') {
                pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
            } else {
                throw new Error('jsPDF tidak tersedia');
            }

            const imgWidth = 210;
            const pageHeight = 295;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            // Add first page
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            // Add additional pages if needed
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            // Save PDF
            const orderId = this.checkoutData?.orderId || 'invoice';
            const fileName = `invoice-${orderId}.pdf`;
            pdf.save(fileName);

            // Show success message
            this.showMessage('PDF berhasil didownload!', 'success');

        } catch (error) {
            console.error('💳 Error downloading PDF:', error);
            this.handlePDFError(error);
            
        } finally {
            // Reset button state
            const downloadBtn = document.getElementById('download-pdf');
            if (downloadBtn) {
                downloadBtn.textContent = 'Download PDF Invoice';
                downloadBtn.disabled = false;
            }
        }
    }

    /**
     * 🖨️ Handle PDF error dengan fallback
     */
    handlePDFError(error) {
        const fallbackModal = this.createFallbackModal();
        document.body.appendChild(fallbackModal);
    }

    /**
     * 📱 Buat modal fallback untuk PDF error
     */
    createFallbackModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        `;

        modal.innerHTML = `
            <div style="
                background: white;
                padding: 2rem;
                border-radius: 12px;
                max-width: 500px;
                width: 90%;
                text-align: center;
            ">
                <h3 style="color: #e74c3c; margin-bottom: 1rem;">⚠️ Gagal Download PDF</h3>
                <p style="margin-bottom: 1.5rem; color: #555;">
                    Terjadi kesalahan saat generate PDF. Silakan gunakan alternatif berikut:
                </p>
                
                <div style="text-align: left; margin-bottom: 2rem;">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <span style="font-size: 1.5rem;">📸</span>
                        <div>
                            <strong>Screenshot Manual</strong>
                            <p style="margin: 0.25rem 0 0 0; font-size: 0.9rem; color: #666;">
                                Gunakan screenshot tool browser atau OS
                            </p>
                        </div>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <span style="font-size: 1.5rem;">🖨️</span>
                        <div>
                            <strong>Print sebagai PDF</strong>
                            <p style="margin: 0.25rem 0 0 0; font-size: 0.9rem; color: #666;">
                                Tekan <kbd>Ctrl</kbd> + <kbd>P</kbd> → Pilih "Save as PDF"
                            </p>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button onclick="window.print()" style="
                        background: #007bff;
                        color: white;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                    ">🖨️ Print Halaman</button>
                    
                    <button onclick="this.closest('[style]').remove()" style="
                        background: #6c757d;
                        color: white;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                    ">Tutup</button>
                </div>
            </div>
        `;

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        return modal;
    }

    // ==================== PAYMENT TIMER & STATUS ====================

    /**
     * ⏰ Start payment countdown timer
     */
    startPaymentTimer() {
        if (!this.checkoutData || !this.checkoutData.expiryTime) return;

        const updateTimer = () => {
            const now = new Date().getTime();
            const expiry = new Date(this.checkoutData.expiryTime).getTime();
            const timeLeft = expiry - now;

            if (timeLeft <= 0) {
                this.setElementText('payment-timer', '00:00:00');
                if (this.paymentTimer) {
                    clearInterval(this.paymentTimer);
                }
                this.showExpiryWarning();
                return;
            }

            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            this.setElementText('payment-timer', 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            );
        };

        updateTimer();
        this.paymentTimer = setInterval(updateTimer, 1000);
    }

    /**
     * 🔍 Check payment status (simulasi)
     */
    checkPaymentStatus() {
        this.showMessage('Sedang memeriksa status pembayaran...', 'info');
        
        setTimeout(() => {
            this.showMessage('Pembayaran masih dalam proses. Silakan coba lagi dalam beberapa menit.', 'info');
        }, 2000);
    }

    // ==================== EVENT LISTENERS ====================

    /**
     * 🎯 Setup event listeners
     */
    setupEventListeners() {
        // Download PDF
        const downloadBtn = document.getElementById('download-pdf');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                const libraries = this.checkPDFLibraries();
                if (!libraries.html2canvas || !libraries.jsPDF) {
                    this.showMessage('Library PDF tidak tersedia. Menggunakan fallback...', 'warning');
                    this.handlePDFError(new Error('PDF libraries not available'));
                    return;
                }
                this.downloadPDF();
            });
        }

        // Check payment status
        const checkStatusBtn = document.getElementById('check-status');
        if (checkStatusBtn) {
            checkStatusBtn.addEventListener('click', () => {
                this.checkPaymentStatus();
            });
        }

        // Print button fallback
        const printBtn = document.getElementById('print-invoice');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                window.print();
            });
        }
    }

    // ==================== HELPER METHODS ====================

    /**
     * 🔧 Set element text dengan safety check
     */
    setElementText(id, text) {
        const element = document.getElementById(id);
        if (element) element.textContent = text;
    }

    /**
     * 🧮 Hitung total amount
     */
    getTotalAmount() {
        if (!this.checkoutData) return 0;
        return this.checkoutData.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    /**
     * 💰 Hitung persentase diskon
     */
    calculateDiscountPercentage() {
        if (!this.checkoutData.discount || !this.checkoutData.cart.length) return 0;
        const subtotal = this.getTotalAmount();
        return Math.round((this.checkoutData.discount / subtotal) * 100);
    }

    /**
     * 📚 Check PDF library availability
     */
    checkPDFLibraries() {
        const libraries = {
            html2canvas: typeof html2canvas !== 'undefined',
            jsPDF: typeof jspdf !== 'undefined' || typeof window.jspdf !== 'undefined'
        };
        return libraries;
    }

    /**
     * 💬 Tunjukkan status save ke Firebase
     */
    showFirebaseSaveStatus() {
        if (!this.checkoutData) return;
        
        const saveStatus = document.createElement('div');
        saveStatus.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: #28a745;
            color: white;
            padding: 0.75rem 1.25rem;
            border-radius: 8px;
            font-size: 0.9rem;
            z-index: 1000;
            animation: slideInLeft 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;
        saveStatus.innerHTML = `✅ Data pesanan tersimpan #${this.checkoutData.orderId}`;
        
        document.body.appendChild(saveStatus);
        
        setTimeout(() => {
            saveStatus.style.animation = 'slideOutLeft 0.3s ease';
            setTimeout(() => {
                if (saveStatus.parentNode) {
                    saveStatus.parentNode.removeChild(saveStatus);
                }
            }, 300);
        }, 5000);
    }

    /**
     * 💬 Show message toast
     */
    showMessage(message, type = 'info') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${this.getToastColor(type)};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
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
        }, 5000);
    }

    /**
     * 🎨 Get toast color berdasarkan type
     */
    getToastColor(type) {
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        return colors[type] || colors.info;
    }

    /**
     * ⚠️ Show expiry warning
     */
    showExpiryWarning() {
        this.showMessage('Batas waktu pembayaran telah habis. Silakan buat pesanan baru.', 'warning');
    }

    /**
     * ❌ Show error message
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            background: #f8d7da;
            color: #721c24;
            padding: 1.5rem;
            border-radius: 8px;
            margin: 2rem auto;
            border: 1px solid #f5c6cb;
            text-align: center;
            max-width: 500px;
        `;
        errorDiv.innerHTML = `
            <h4 style="margin: 0 0 1rem 0; color: #721c24;">⚠️ Terjadi Kesalahan</h4>
            <p style="margin: 0 0 1.5rem 0;">${message}</p>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <a href="cart.html" style="
                    background: #6c757d;
                    color: white;
                    padding: 0.75rem 1.5rem;
                    border-radius: 6px;
                    text-decoration: none;
                    font-weight: 500;
                ">Kembali ke Keranjang</a>
                <button onclick="location.reload()" style="
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                ">Refresh Halaman</button>
            </div>
        `;
        
        const container = document.querySelector('.payment-content');
        if (container) {
            container.innerHTML = '';
            container.appendChild(errorDiv);
        }
    }
}

// ==================== INITIALIZATION ====================

// Initialize payment system when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('💳 DOM loaded, initializing payment system');
    
    try {
        // Tunggu sedikit untuk memastikan auth system sudah di-load
        await new Promise(resolve => setTimeout(resolve, 500));
        
        window.paymentSystem = new PaymentSystem();
        
        // Debug info
        console.log('💳 Payment system initialized');
        console.log('💳 Auth system available:', typeof window.authSystem !== 'undefined');
        console.log('💳 Current user:', window.authSystem?.currentUser);
        
    } catch (error) {
        console.error('💳 Error initializing payment system:', error);
        
        // Fallback: tetap inisialisasi tanpa auth
        window.paymentSystem = new PaymentSystem();
    }
});

// 🔥 TAMBAHKAN: Event listener untuk auth state changes
document.addEventListener('authStateChanged', (event) => {
    console.log('💳 Auth state changed detected in payment system:', event.detail);
    
    if (window.paymentSystem && event.detail.user) {
        console.log('💳 User logged in, retrying Firebase save...');
        window.paymentSystem.saveCompleteOrderToFirebase().catch(console.error);
    }
});

// ==================== DEBUGGING HELPERS ====================

/**
 * 🐛 Debug helper untuk payment system
 */
function debugPaymentSystem() {
    console.log('💳=== PAYMENT SYSTEM DEBUG ===');
    console.log('💳 Auth system available:', typeof window.authSystem !== 'undefined');
    console.log('💳 Current user:', window.authSystem?.currentUser);
    console.log('💳 Payment system:', window.paymentSystem);
    console.log('💳 User logged in:', window.paymentSystem?.isUserLoggedIn());
    console.log('💳 Auth ready:', window.paymentSystem?.isAuthReady);
    console.log('💳 Checkout data:', window.paymentSystem?.checkoutData);
    console.log('💳============================');
}

// Expose untuk debugging di console
window.debugPayment = debugPaymentSystem;

// Add CSS animations if not exists
if (!document.querySelector('#payment-animations')) {
    const style = document.createElement('style');
    style.id = 'payment-animations';
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        @keyframes slideInLeft {
            from { transform: translateX(-100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutLeft {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(-100%); opacity: 0; }
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

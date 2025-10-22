// payment.js - FINAL VERSION dengan Firebase Integration
import firebaseDB from './firebase-db.js';

class PaymentSystem {
    constructor() {
        this.checkoutData = null;
        this.paymentTimer = null;
        this.isAuthReady = false;
        this.currentUser = null;
        this.isDOMReady = false;
        
        // Tunggu DOM ready sebelum init
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.isDOMReady = true;
                this.init();
            });
        } else {
            this.isDOMReady = true;
            this.init();
        }
    }

    async init() {
        console.log('💳 Initializing payment system, DOM ready:', this.isDOMReady);
        
        if (!this.isDOMReady) {
            console.error('💳 DOM not ready, delaying initialization');
            setTimeout(() => this.init(), 100);
            return;
        }

        try {
            // Pastikan semua element invoice sudah tersedia
            if (!this.checkInvoiceElements()) {
                console.error('💳 Invoice elements not found, retrying...');
                setTimeout(() => this.init(), 500);
                return;
            }

            console.log('💳 All invoice elements found, proceeding...');
            
            // Tunggu auth system ready
            await this.waitForAuthSystem();
            this.isAuthReady = true;
            
            console.log('💳 Auth system ready');
            
            this.loadCheckoutData();
            this.setupAuthBasedUI();
            this.setupEventListeners();
            this.startPaymentTimer();
            
            if (this.isUserLoggedIn()) {
                await this.saveCompleteOrderToFirebase();
            }
            
        } catch (error) {
            console.error('💳 Error during payment initialization:', error);
            this.loadCheckoutData();
            this.setupEventListeners();
            this.startPaymentTimer();
        }
    }

    /**
     * 🔍 Check jika semua element invoice sudah tersedia di DOM
     */
    checkInvoiceElements() {
        const requiredElements = [
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

        const allElementsExist = requiredElements.every(id => {
            const element = document.getElementById(id);
            const exists = !!element;
            if (!exists) {
                console.warn(`💳 Missing element: ${id}`);
            }
            return exists;
        });

        console.log(`💳 Required elements check: ${allElementsExist ? 'PASS' : 'FAIL'}`);
        return allElementsExist;
    }

    // ==================== AUTHENTICATION & FIREBASE ====================

    /**
     * 🔐 Tunggu auth system siap
     */
    async waitForAuthSystem(maxWait = 10000) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            
            const checkAuth = () => {
                // Cek jika user sudah login dari localStorage/session
                const userData = localStorage.getItem('currentUser');
                if (userData) {
                    try {
                        this.currentUser = JSON.parse(userData);
                        console.log('💳 User found in localStorage:', this.currentUser);
                        resolve();
                        return;
                    } catch (e) {
                        console.warn('💳 Error parsing user data from localStorage:', e);
                    }
                }
                
                // Cek auth system global
                if (window.authSystem !== undefined && window.authSystem.currentUser) {
                    this.currentUser = window.authSystem.currentUser;
                    console.log('💳 User from auth system:', this.currentUser);
                    resolve();
                } else if (Date.now() - startTime > maxWait) {
                    console.warn('💳 Auth system timeout, continuing without auth');
                    this.currentUser = null;
                    resolve();
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
        return this.currentUser !== null && this.currentUser !== undefined;
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
        this.updateInvoiceWithUserInfo(this.currentUser);
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

            console.log('💳 Saving order to Firebase for user:', this.currentUser.email);

            // Cek jika order sudah disimpan sebelumnya
            const existingOrder = localStorage.getItem(`order-${this.checkoutData.orderId}-saved`);
            if (existingOrder) {
                console.log('💳 Order already saved to Firebase');
                return;
            }

            // Siapkan data lengkap untuk Firebase
            const completeOrderData = {
                // ========== INFORMASI ORDER ==========
                orderId: this.checkoutData.orderId,
                orderNumber: `ORDER-${this.checkoutData.orderId}`,
                
                // ========== INFORMASI USER ==========
                userId: this.currentUser.uid,
                userEmail: this.currentUser.email,
                userName: this.currentUser.displayName || this.checkoutData.shippingInfo.recipientName,
                
                // ========== INFORMASI PENERIMA LENGKAP ==========
                recipientInfo: {
                    name: this.checkoutData.shippingInfo.recipientName,
                    phone: this.checkoutData.shippingInfo.recipientPhone,
                    address: this.checkoutData.shippingInfo.shippingAddress,
                    city: this.checkoutData.shippingInfo.city,
                    postalCode: this.checkoutData.shippingInfo.postalCode,
                    notes: this.checkoutData.shippingInfo.orderNotes || 'Tidak ada catatan'
                },
                
                // ========== BARANG YANG DIBELI LENGKAP ==========
                items: this.checkoutData.cart.map((item, index) => ({
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
                    virtualAccount: this.checkoutData.virtualAccount || this.generateVirtualAccount(),
                    bankName: 'Bank Nusantara',
                    
                    // Breakdown harga
                    subtotal: this.getTotalAmount(),
                    discount: this.checkoutData.discount || 0,
                    shippingCost: 0,
                    tax: 0,
                    totalAmount: this.getTotalAmount() - (this.checkoutData.discount || 0),
                    
                    // Status pembayaran
                    status: 'pending',
                    expiryTime: this.checkoutData.expiryTime || this.getExpiryTime()
                },
                
                // ========== INFORMASI PENGIRIMAN ==========
                shippingInfo: {
                    service: 'standard',
                    cost: 0,
                    estimatedDelivery: this.getEstimatedDelivery(),
                    trackingNumber: '',
                    status: 'pending'
                },
                
                // ========== PROMO & DISKON ==========
                promotion: {
                    promoCode: this.checkoutData.promoCode || '',
                    discountAmount: this.checkoutData.discount || 0,
                    discountPercentage: this.calculateDiscountPercentage()
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
                    itemsCount: this.checkoutData.cart.length,
                    totalQuantity: this.checkoutData.cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
                    platform: 'web',
                    browser: navigator.userAgent,
                    screenResolution: `${screen.width}x${screen.height}`,
                    ipAddress: 'unknown'
                },
                
                // ========== TIMESTAMPS ==========
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                expiresAt: this.checkoutData.expiryTime || this.getExpiryTime()
            };

            console.log('💳 Complete order data for Firebase:', completeOrderData);

            // Validasi data sebelum simpan
            const validation = firebaseDB.validateOrderData(completeOrderData);
            if (!validation.isValid) {
                throw new Error(`Data tidak valid: ${validation.errors.join(', ')}`);
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
     * 📄 Load checkout data dari localStorage - FIXED VERSION
     */
    loadCheckoutData() {
        try {
            console.log('💳 Checking for checkout data...');
            
            const checkoutData = JSON.parse(localStorage.getItem('semart-checkout'));
            if (!checkoutData) {
                console.error('❌ No checkout data found');
                this.showError('Data checkout tidak ditemukan. Silakan kembali ke keranjang.');
                return;
            }

            console.log('💳 Raw checkout data:', checkoutData);

            // Handle berbagai struktur data yang mungkin
            const processedData = {
                // Data dari root
                ...checkoutData,
                
                // OVERRIDE: Gunakan shippingInfo dari root jika ada, atau dari userInfo
                shippingInfo: checkoutData.shippingInfo || checkoutData.userInfo || {},
                
                // OVERRIDE: Pastikan cart ada
                cart: checkoutData.cart || [],
                
                // GENERATE jika tidak ada
                orderId: checkoutData.orderId || `INV-${Date.now()}`,
                virtualAccount: checkoutData.virtualAccount || this.generateVirtualAccount(),
                expiryTime: checkoutData.expiryTime || this.getExpiryTime(),
                discount: checkoutData.discount || 0
            };

            console.log('💳 Processed checkout data:', processedData);

            // Validasi data penting
            if (!processedData.cart || !Array.isArray(processedData.cart) || processedData.cart.length === 0) {
                console.error('❌ Invalid cart data:', processedData.cart);
                this.showError('Keranjang belanja kosong. Silakan kembali ke keranjang.');
                return;
            }

            if (!processedData.shippingInfo.recipientName) {
                console.error('❌ Missing recipient name');
                this.showError('Data penerima tidak lengkap. Silakan lengkapi data pengiriman.');
                return;
            }

            this.checkoutData = processedData;
            
            // Simpan kembali dengan struktur yang konsisten
            localStorage.setItem('semart-checkout', JSON.stringify(this.checkoutData));
            
            console.log('💳 Final checkout data ready:', this.checkoutData);
            this.renderInvoice();
            
        } catch (error) {
            console.error('💳 Error loading checkout data:', error);
            this.showError('Terjadi kesalahan saat memuat data pembayaran: ' + error.message);
        }
    }

    /**
     * 🎨 Render invoice ke HTML - FIXED VERSION
     */
    renderInvoice() {
        if (!this.checkoutData) {
            console.error('💳 No checkout data available for rendering');
            return;
        }

        try {
            console.log('💳 Starting invoice rendering with data:', this.checkoutData);
            
            const { cart, discount, shippingInfo, orderId, virtualAccount, expiryTime } = this.checkoutData;
            
            // Debug info
            console.log('💳 Cart items:', cart);
            console.log('💳 Shipping info:', shippingInfo);
            console.log('💳 Discount:', discount);

            // Calculate totals
            const subtotal = cart.reduce((sum, item) => {
                const price = Number(item.price) || 0;
                const quantity = Number(item.quantity) || 1;
                return sum + (price * quantity);
            }, 0);
            
            const shipping = 0;
            const total = Math.max(0, subtotal - (Number(discount) || 0) + shipping);

            console.log('💳 Calculated totals:', { subtotal, discount, shipping, total });

            // Set invoice data
            document.getElementById('invoice-order-id').textContent = orderId;
            document.getElementById('invoice-date').textContent = new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            document.getElementById('order-date').textContent = new Date().toLocaleDateString('id-ID');

            // Customer info
            document.getElementById('customer-name').textContent = shippingInfo.recipientName || 'Tidak tersedia';
            document.getElementById('customer-phone').textContent = shippingInfo.recipientPhone || 'Tidak tersedia';
            document.getElementById('customer-address').textContent = shippingInfo.shippingAddress || 'Tidak tersedia';
            document.getElementById('customer-city').textContent = 
                `${shippingInfo.city || ''} ${shippingInfo.postalCode || ''}`.trim() || 'Tidak tersedia';

            // Render products table
            const tbody = document.getElementById('invoice-products-body');
            if (tbody && cart && cart.length > 0) {
                tbody.innerHTML = cart.map(item => `
                    <tr>
                        <td>
                            <strong>${item.name || 'Produk'}</strong>
                        </td>
                        <td>Rp${(item.price || 0).toLocaleString('id-ID')}</td>
                        <td>${item.quantity || 1}</td>
                        <td>Rp${((item.price || 0) * (item.quantity || 1)).toLocaleString('id-ID')}</td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="4">Tidak ada produk</td></tr>';
            }

            // Render totals
            document.getElementById('invoice-subtotal').textContent = `Rp${subtotal.toLocaleString('id-ID')}`;
            document.getElementById('invoice-total').textContent = `Rp${total.toLocaleString('id-ID')}`;
            document.getElementById('invoice-shipping').textContent = `Rp${shipping.toLocaleString('id-ID')}`;

            // Handle discount
            if (discount > 0) {
                const discountRow = document.getElementById('invoice-discount-row');
                if (discountRow) {
                    discountRow.style.display = 'flex';
                    document.getElementById('invoice-discount').textContent = `-Rp${discount.toLocaleString('id-ID')}`;
                }
            }

            // Virtual Account
            const vaNumber = virtualAccount || this.generateVirtualAccount();
            document.getElementById('va-number').textContent = vaNumber;
            document.getElementById('instruction-va').textContent = vaNumber;
            document.getElementById('va-amount').textContent = `Rp${total.toLocaleString('id-ID')}`;

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
            
            document.getElementById('payment-expiry').textContent = formattedExpiry;
            document.getElementById('expiry-time').textContent = formattedExpiry;

            console.log('💳 Invoice rendering completed successfully');

        } catch (error) {
            console.error('💳 Error rendering invoice:', error);
            this.showError(`Gagal menampilkan invoice: ${error.message}`);
        }
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

        console.log('💾 Starting optimized PDF generation...');

        // 🔥 OPTIMASI 1: Buat clone element untuk PDF saja
        const pdfContainer = this.createOptimizedPDFContainer(invoiceContent);
        document.body.appendChild(pdfContainer);

        // 🔥 OPTIMASI 2: Gunakan scale yang lebih rendah dan optimasi kualitas
        const canvas = await html2canvas(pdfContainer, {
            scale: 1.5, // Turunkan dari 2 ke 1.5
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            removeContainer: true,
            width: pdfContainer.scrollWidth,
            height: pdfContainer.scrollHeight,
            // 🔥 OPTIMASI 3: Kurani kualitas gambar
            onclone: (clonedDoc) => {
                this.optimizeForPDF(clonedDoc);
            }
        });

        // Hapus container temporary
        document.body.removeChild(pdfContainer);

        // 🔥 OPTIMASI 4: Kompres gambar dengan kualitas lebih rendah
        const imgData = canvas.toDataURL('image/jpeg', 0.7); // Gunakan JPEG dengan kualitas 70%
        
        console.log('📊 Canvas size:', canvas.width, 'x', canvas.height);
        console.log('📦 Image data size:', Math.round(imgData.length / 1024), 'KB');

        // Handle jsPDF
        let pdf;
        if (typeof jspdf !== 'undefined') {
            pdf = new jspdf.jsPDF('p', 'mm', 'a4');
        } else if (typeof window.jspdf !== 'undefined') {
            pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
        } else {
            throw new Error('jsPDF tidak tersedia');
        }

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        // 🔥 OPTIMASI 5: Hitung aspect ratio yang tepat
        const imgWidth = pdfWidth - 10; // Margin 5mm each side
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        console.log('📐 PDF dimensions:', { pdfWidth, pdfHeight, imgWidth, imgHeight });

        // 🔥 OPTIMASI 6: Cek jika perlu multiple pages
        if (imgHeight > pdfHeight) {
            // Jika terlalu tinggi, bagi menjadi beberapa halaman
            let heightLeft = imgHeight;
            let position = 5; // Start dengan margin top 5mm
            
            pdf.addImage(imgData, 'JPEG', 5, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 5, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;
            }
        } else {
            // Muat dalam 1 halaman
            pdf.addImage(imgData, 'JPEG', 5, 5, imgWidth, imgHeight);
        }

        // Save PDF
        const orderId = this.checkoutData?.orderId || 'invoice';
        const fileName = `invoice-${orderId}.pdf`;
        pdf.save(fileName);

        // Show success message
        this.showMessage('PDF berhasil didownload! (Size optimized)', 'success');

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
 * 🔥 Buat container teroptimasi untuk PDF
 */
createOptimizedPDFContainer(originalElement) {
    const container = document.createElement('div');
    container.style.cssText = `
        position: fixed;
        left: -9999px;
        top: -9999px;
        width: 800px; /* Fixed width untuk konsistensi */
        background: white;
        padding: 20px;
        box-sizing: border-box;
        font-family: 'Poppins', sans-serif;
        transform: scale(0.8);
        transform-origin: top left;
    `;
    
    // Clone dan optimasi element
    const clonedElement = originalElement.cloneNode(true);
    this.optimizeElementForPDF(clonedElement);
    container.appendChild(clonedElement);
    
    return container;
}

/**
 * 🔥 Optimasi element untuk PDF
 */
optimizeElementForPDF(element) {
    // Hapus element yang tidak perlu untuk PDF
    const elementsToRemove = element.querySelectorAll(
        '.payment-actions-section, .btn-download, .btn-print, .btn-check-status, .action-buttons, .backpage, .navbar, footer'
    );
    elementsToRemove.forEach(el => el.remove());

    // Optimasi styles untuk PDF
    const stylesToOptimize = [
        '.invoice-card { padding: 15px !important; margin: 0 !important; }',
        '.invoice-header { margin-bottom: 15px !important; }',
        '.invoice-info-grid { margin-bottom: 15px !important; }',
        '.invoice-products table { font-size: 10px !important; }',
        '.invoice-total { margin-top: 15px !important; }',
        '.payment-instructions { margin-top: 15px !important; font-size: 10px !important; }',
        'h1 { font-size: 18px !important; }',
        'h2 { font-size: 16px !important; }',
        'h3 { font-size: 14px !important; }',
        'p, span { font-size: 10px !important; }',
        'table { width: 100% !important; }',
        'td, th { padding: 4px 6px !important; }',
        '.va-number { font-size: 12px !important; padding: 8px !important; }'
    ].join(' ');

    const styleElement = document.createElement('style');
    styleElement.textContent = stylesToOptimize;
    element.appendChild(styleElement);

    // Batasi jumlah produk yang ditampilkan jika terlalu banyak
    const productRows = element.querySelectorAll('#invoice-products-body tr');
    if (productRows.length > 10) {
        const tbody = element.querySelector('#invoice-products-body');
        const visibleRows = Array.from(productRows).slice(0, 10);
        const summaryRow = document.createElement('tr');
        summaryRow.innerHTML = `
            <td colspan="4" style="text-align: center; font-style: italic; padding: 10px;">
                ... dan ${productRows.length - 10} produk lainnya
            </td>
        `;
        
        tbody.innerHTML = '';
        visibleRows.forEach(row => tbody.appendChild(row));
        tbody.appendChild(summaryRow);
    }
}

/**
 * 🔥 Optimasi saat cloning untuk PDF
 */
optimizeForPDF(clonedDoc) {
    // Hapus element interaktif
    const interactiveElements = clonedDoc.querySelectorAll(
        'button, a, .btn, .actions-card, .payment-actions-section'
    );
    interactiveElements.forEach(el => el.remove());

    // Optimasi teks
    const allTextElements = clonedDoc.querySelectorAll('*');
    allTextElements.forEach(el => {
        if (el.textContent && el.textContent.length > 200) {
            el.textContent = el.textContent.substring(0, 200) + '...';
        }
    });

    // Kompres gambar
    const images = clonedDoc.querySelectorAll('img');
    images.forEach(img => {
        img.style.maxWidth = '100px';
        img.style.height = 'auto';
    });
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
                this.handlePaymentExpired();
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
     * 🔍 Check payment status dari Firebase
     */
    async checkPaymentStatus() {
        try {
            if (!this.checkoutData?.orderId) {
                throw new Error('Order ID tidak ditemukan');
            }

            this.showMessage('Sedang memeriksa status pembayaran...', 'info');

            const order = await firebaseDB.getOrderByOrderId(this.checkoutData.orderId);
            
            if (order) {
                this.showPaymentStatus(order.paymentInfo?.status || 'pending');
            } else {
                throw new Error('Data pesanan tidak ditemukan di database');
            }
        } catch (error) {
            console.error('💳 Error checking payment status:', error);
            this.showMessage('Gagal memeriksa status pembayaran. Silakan coba lagi.', 'error');
        }
    }

    /**
     * 📊 Tampilkan status pembayaran
     */
    showPaymentStatus(status) {
        const statusMessages = {
            'pending': '⏳ Menunggu pembayaran',
            'paid': '✅ Pembayaran berhasil',
            'failed': '❌ Pembayaran gagal',
            'expired': '⏰ Waktu pembayaran habis'
        };
        
        const message = statusMessages[status] || 'Status tidak diketahui';
        this.showMessage(`Status Pembayaran: ${message}`, 'info');
        
        // Redirect jika sudah paid
        if (status === 'paid') {
            setTimeout(() => {
                window.location.href = 'order-success.html';
            }, 3000);
        }
    }

    /**
     * ⏰ Handle payment expired
     */
    async handlePaymentExpired() {
        try {
            if (this.checkoutData?.orderId) {
                await firebaseDB.updateOrderStatus(this.checkoutData.orderId, 'expired', 'Waktu pembayaran habis');
                await firebaseDB.updatePaymentStatus(this.checkoutData.orderId, 'expired');
            }
            
            this.showMessage('Waktu pembayaran telah habis. Silakan buat pesanan baru.', 'warning');
            
            setTimeout(() => {
                window.location.href = 'cart.html';
            }, 5000);
        } catch (error) {
            console.error('💳 Error handling payment expiration:', error);
        }
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
     * 🔢 Generate virtual account
     */
    generateVirtualAccount() {
        const bankCode = '888';
        const random = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
        return `${bankCode}${random}`;
    }

    /**
     * ⏱️ Get expiry time (24 jam dari sekarang)
     */
    getExpiryTime() {
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 24);
        return expiry.toISOString();
    }

    /**
     * 📦 Get estimated delivery time
     */
    getEstimatedDelivery() {
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 3);
        return deliveryDate.toISOString();
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
        console.log('💳 Current user:', window.paymentSystem.currentUser);
        
    } catch (error) {
        console.error('💳 Error initializing payment system:', error);
        
        // Fallback: tetap inisialisasi tanpa auth
        window.paymentSystem = new PaymentSystem();
    }
});

// Event listener untuk auth state changes
document.addEventListener('authStateChanged', (event) => {
    console.log('💳 Auth state changed detected in payment system:', event.detail);
    
    if (window.paymentSystem && event.detail.user) {
        console.log('💳 User logged in, retrying Firebase save...');
        window.paymentSystem.currentUser = event.detail.user;
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
    console.log('💳 Current user:', window.paymentSystem?.currentUser);
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

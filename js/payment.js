class PaymentSystem {
    constructor() {
        this.checkoutData = null;
        this.paymentTimer = null;
        this.init();
    }

    init() {
        console.log('💳 Initializing payment system');
        this.loadCheckoutData();
        this.setupEventListeners();
        this.startPaymentTimer();
    }

    loadCheckoutData() {
        try {
            const checkoutData = localStorage.getItem('semart-checkout');
            if (!checkoutData) {
                console.error('❌ No checkout data found');
                this.showError('Data checkout tidak ditemukan. Silakan kembali ke keranjang.');
                return;
            }

            this.checkoutData = JSON.parse(checkoutData);
            console.log('💳 Checkout data loaded:', this.checkoutData);
            this.renderInvoice();
            
        } catch (error) {
            console.error('💳 Error loading checkout data:', error);
            this.showError('Terjadi kesalahan saat memuat data pembayaran.');
        }
    }

    renderInvoice() {
        if (!this.checkoutData) return;

        try {
            const { cart, discount, shippingInfo, orderId, virtualAccount, expiryTime } = this.checkoutData;
            
            // Calculate totals
            const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const shipping = 0; // Bisa ditambahkan kalkulasi ongkir
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
                document.getElementById('invoice-discount-row').style.display = 'flex';
                this.setElementText('invoice-discount', `-Rp${discount.toLocaleString('id-ID')}`);
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

    setElementText(id, text) {
        const element = document.getElementById(id);
        if (element) element.textContent = text;
    }

    setupEventListeners() {
        // Download PDF
        const downloadBtn = document.getElementById('download-pdf');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
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
    }

    startPaymentTimer() {
        if (!this.checkoutData || !this.checkoutData.expiryTime) return;

        const updateTimer = () => {
            const now = new Date().getTime();
            const expiry = new Date(this.checkoutData.expiryTime).getTime();
            const timeLeft = expiry - now;

            if (timeLeft <= 0) {
                this.setElementText('payment-timer', '00:00:00');
                clearInterval(this.paymentTimer);
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

    async downloadPDF() {
        try {
            const invoiceContent = document.getElementById('invoice-content');
            if (!invoiceContent) {
                throw new Error('Invoice content not found');
            }

            // Show loading
            const downloadBtn = document.getElementById('download-pdf');
            const originalText = downloadBtn.textContent;
            downloadBtn.textContent = 'Membuat PDF...';
            downloadBtn.disabled = true;

            // Use html2canvas and jsPDF
            const canvas = await html2canvas(invoiceContent, {
                scale: 2,
                useCORS: true,
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const imgWidth = 210;
            const pageHeight = 295;
            const imgHeight = canvas.height * imgWidth / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            // Add new pages if needed
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            // Save PDF
            const fileName = `invoice-${this.checkoutData.orderId}.pdf`;
            pdf.save(fileName);

            // Show success message
            this.showMessage('PDF berhasil didownload!', 'success');

            // Reset button
            downloadBtn.textContent = originalText;
            downloadBtn.disabled = false;

        } catch (error) {
            console.error('💳 Error downloading PDF:', error);
            this.showMessage('Gagal mendownload PDF. Silakan screenshot halaman ini.', 'error');
            
            // Reset button
            const downloadBtn = document.getElementById('download-pdf');
            downloadBtn.textContent = 'Download PDF Invoice';
            downloadBtn.disabled = false;
        }
    }

    checkPaymentStatus() {
        // Simulasi cek status pembayaran
        this.showMessage('Sedang memeriksa status pembayaran...', 'info');
        
        setTimeout(() => {
            this.showMessage('Pembayaran masih dalam proses. Silakan coba lagi dalam beberapa menit.', 'info');
        }, 2000);
    }

    showExpiryWarning() {
        this.showMessage('Batas waktu pembayaran telah habis. Silakan buat pesanan baru.', 'warning');
    }

    showMessage(message, type = 'info') {
        // Create toast message
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

    getToastColor(type) {
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        return colors[type] || colors.info;
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            background: #f8d7da;
            color: #721c24;
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
            border: 1px solid #f5c6cb;
            text-align: center;
        `;
        errorDiv.innerHTML = `
            <p><strong>Error:</strong> ${message}</p>
            <a href="cart.html" style="color: #721c24; text-decoration: underline;">Kembali ke Keranjang</a>
        `;
        
        const container = document.querySelector('.payment-content');
        if (container) {
            container.innerHTML = '';
            container.appendChild(errorDiv);
        }
    }
}

// Initialize payment system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('💳 DOM loaded, initializing payment system');
    try {
        window.paymentSystem = new PaymentSystem();
    } catch (error) {
        console.error('💳 Error initializing payment system:', error);
    }
});

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
    `;
    document.head.appendChild(style);
}

// security.js - Enhanced security measures
class Security {
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validatePhone(phone) {
        const phoneRegex = /^[0-9]{10,13}$/;
        return phoneRegex.test(phone.replace(/\D/g, ''));
    }

    static generateCSRFToken() {
        return 'csrf_' + Math.random().toString(36).substr(2, 9);
    }
}
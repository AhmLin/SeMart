// 🔹 SEARCH SYSTEM - FIXED VERSION
class SearchSystem {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.searchTerm = '';
        this.activeFilters = {
            category: [],
            priceRange: { min: null, max: null },
            minRating: 0,
            status: []
        };
        
        this.init();
    }
    
    async init() {
        console.log('🔍 Initializing search system...');
        await this.loadProducts();
        this.setupEventListeners();
        this.processURLParameters();
        this.applySearchAndFilters();
    }
    
    async loadProducts() {
        try {
            console.log('📦 Loading products...');
            const response = await fetch('data/product.json');
            if (!response.ok) {
                throw new Error('Failed to load products');
            }
            this.products = await response.json();
            console.log(`✅ Loaded ${this.products.length} products`);
            this.populateCategoryFilters();
        } catch (error) {
            console.error('❌ Error loading products:', error);
            this.showErrorMessage('Gagal memuat data produk. Silakan refresh halaman.');
        }
    }
    
    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Search functionality
        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });
        
        document.getElementById('search-btn').addEventListener('click', () => {
            this.performSearch();
        });
        
        // Filter functionality
        document.getElementById('apply-filters').addEventListener('click', () => {
            this.applyFilters();
        });
        
        document.getElementById('reset-filters').addEventListener('click', () => {
            this.resetFilters();
        });
        
        document.getElementById('sort-by').addEventListener('change', () => {
            this.sortProducts();
        });
        
        // Filter toggle
        document.getElementById('filter-toggle').addEventListener('click', () => {
            this.toggleFilterGrid();
        });
        
        // Clear search
        document.getElementById('clear-search').addEventListener('click', () => {
            this.clearSearch();
        });
    }
    
    toggleFilterGrid() {
        const filterGrid = document.getElementById('filter-grid');
        const toggleBtn = document.getElementById('filter-toggle');
        
        filterGrid.classList.toggle('active');
        toggleBtn.textContent = filterGrid.classList.contains('active') 
            ? '▲ Sembunyikan Filter' 
            : '▼ Tampilkan Filter';
    }
    
    processURLParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        this.searchTerm = urlParams.get('search') || '';
        document.getElementById('search-input').value = this.searchTerm;
        this.updateSearchTitle();
        
        // Show clear search button if there's a search term
        if (this.searchTerm) {
            document.getElementById('clear-search').style.display = 'block';
        }
    }
    
    performSearch() {
        const searchValue = document.getElementById('search-input').value.trim();
        if (searchValue) {
            window.location.href = `search-results.html?search=${encodeURIComponent(searchValue)}`;
        } else {
            alert('Silakan masukkan kata kunci pencarian');
            document.getElementById('search-input').focus();
        }
    }
    
    clearSearch() {
        window.location.href = 'search-results.html';
    }
    
    applySearchAndFilters() {
        console.log('🔍 Applying search and filters...');
        document.getElementById('loading-message').style.display = 'none';
        
        let results = this.searchTerm ? 
            this.searchProducts(this.searchTerm) : 
            [...this.products];
        
        results = this.applyAllFilters(results);
        this.filteredProducts = results;
        this.displayResults();
        this.updateResultsInfo();
    }
    
    searchProducts(term) {
        const searchTerm = term.toLowerCase();
        console.log(`🔍 Searching for: "${searchTerm}"`);
        
        return this.products.filter(product => {
            const searchableText = [
                product.name,
                product.category,
                product.description,
                product.tags || ''
            ].join(' ').toLowerCase();
            
            return searchableText.includes(searchTerm);
        });
    }
    
    applyAllFilters(products) {
        let filtered = products;
        
        // Category filter
        if (this.activeFilters.category.length > 0) {
            filtered = filtered.filter(p => 
                this.activeFilters.category.includes(p.category)
            );
        }
        
        // Price range filter
        if (this.activeFilters.priceRange.min !== null) {
            filtered = filtered.filter(p => p.price >= this.activeFilters.priceRange.min);
        }
        if (this.activeFilters.priceRange.max !== null) {
            filtered = filtered.filter(p => p.price <= this.activeFilters.priceRange.max);
        }
        
        // Rating filter
        if (this.activeFilters.minRating > 0) {
            filtered = filtered.filter(p => p.rating >= this.activeFilters.minRating);
        }
        
        // Status filter
        if (this.activeFilters.status.length > 0) {
            filtered = filtered.filter(p => {
                if (this.activeFilters.status.includes('best-seller') && p.sold < 100) return false;
                if (this.activeFilters.status.includes('new') && p.sold > 50) return false;
                if (this.activeFilters.status.includes('discount') && (!p.discount || p.discount === 0)) return false;
                return true;
            });
        }
        
        console.log(`📊 Filtered from ${products.length} to ${filtered.length} products`);
        return filtered;
    }
    
    displayResults() {
        const container = document.getElementById('product-grid');
        const noProducts = document.getElementById('no-products');
        const resultsCount = document.getElementById('results-count');
        
        container.innerHTML = '';
        
        if (this.filteredProducts.length === 0) {
            noProducts.style.display = 'block';
            resultsCount.textContent = '0 produk ditemukan';
            this.updateActiveFiltersDisplay();
            return;
        }
        
        noProducts.style.display = 'none';
        resultsCount.textContent = `${this.filteredProducts.length} produk ditemukan`;
        
        this.filteredProducts.forEach(product => {
            const card = this.createProductCard(product);
            container.appendChild(card);
        });
        
        this.updateActiveFiltersDisplay();
    }
    
    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.src='images/placeholder-product.jpg'">
            <h3>${product.name}</h3>
            <p>Terjual ${product.sold}</p>
            <div class="rating">
                ${this.generateStars(product.rating)} 
                <span>${product.rating.toFixed(1)}</span>
            </div>
            <div class="product-bottom">
                <p class="price">Rp${product.price.toLocaleString('id-ID')}</p>
                <a href="product.html?id=${product.id}" class="btn-secondary">Lihat Detail</a>
            </div>
        `;
        return card;
    }
    
    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5 ? 1 : 0;
        const emptyStars = 5 - fullStars - halfStar;
        return '★'.repeat(fullStars) + (halfStar ? '½' : '') + '☆'.repeat(emptyStars);
    }
    
    populateCategoryFilters() {
        const container = document.getElementById('category-filters');
        const categories = [...new Set(this.products.map(p => p.category))];
        
        container.innerHTML = '';
        
        categories.forEach(category => {
            const label = document.createElement('label');
            label.className = 'filter-option';
            label.innerHTML = `
                <input type="checkbox" name="category" value="${category}">
                <span>${category}</span>
            `;
            container.appendChild(label);
        });
        
        console.log(`📂 Populated ${categories.length} categories`);
    }
    
    updateSearchTitle() {
        const title = document.getElementById('search-title');
        if (this.searchTerm) {
            title.textContent = `Hasil Pencarian: "${this.searchTerm}"`;
        } else {
            title.textContent = 'Semua Produk';
        }
    }
    
    applyFilters() {
        console.log('🔧 Applying filters...');
        
        // Get category filters
        this.activeFilters.category = this.getCheckedValues('category');
        
        // Get price range
        this.activeFilters.priceRange = {
            min: document.getElementById('min-price').value ? parseInt(document.getElementById('min-price').value) : null,
            max: document.getElementById('max-price').value ? parseInt(document.getElementById('max-price').value) : null
        };
        
        // Get rating filter
        const ratingRadio = document.querySelector('input[name="rating"]:checked');
        this.activeFilters.minRating = ratingRadio ? parseFloat(ratingRadio.value) : 0;
        
        // Get status filters
        this.activeFilters.status = this.getCheckedValues('status');
        
        this.applySearchAndFilters();
    }
    
    resetFilters() {
        console.log('🔄 Resetting filters...');
        
        // Reset checkboxes and inputs
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.checked = radio.value === '0';
        });
        document.getElementById('min-price').value = '';
        document.getElementById('max-price').value = '';
        
        // Reset active filters
        this.activeFilters = {
            category: [],
            priceRange: { min: null, max: null },
            minRating: 0,
            status: []
        };
        
        this.applySearchAndFilters();
    }
    
    getCheckedValues(name) {
        return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(cb => cb.value);
    }
    
    sortProducts() {
        const sortValue = document.getElementById('sort-by').value;
        console.log(`📊 Sorting by: ${sortValue}`);
        
        switch(sortValue) {
            case 'price-asc':
                this.filteredProducts.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                this.filteredProducts.sort((a, b) => b.price - a.price);
                break;
            case 'rating-desc':
                this.filteredProducts.sort((a, b) => b.rating - a.rating);
                break;
            case 'sold-desc':
                this.filteredProducts.sort((a, b) => b.sold - a.sold);
                break;
            case 'name-asc':
                this.filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'relevance':
            default:
                // For relevance, we keep the original search order
                break;
        }
        
        this.displayResults();
    }
    
    updateResultsInfo() {
        const resultsInfo = document.getElementById('results-stats');
        if (this.searchTerm) {
            resultsInfo.textContent = `Menemukan ${this.filteredProducts.length} produk untuk "${this.searchTerm}"`;
        } else {
            resultsInfo.textContent = `Menampilkan ${this.filteredProducts.length} produk`;
        }
    }
    
    updateActiveFiltersDisplay() {
        const container = document.getElementById('active-filters');
        container.innerHTML = '';
        
        // Category filters
        this.activeFilters.category.forEach(cat => {
            container.appendChild(this.createFilterTag(cat, 'category'));
        });
        
        // Price range
        if (this.activeFilters.priceRange.min || this.activeFilters.priceRange.max) {
            const min = this.activeFilters.priceRange.min || 'Min';
            const max = this.activeFilters.priceRange.max || 'Max';
            container.appendChild(this.createFilterTag(`Harga: Rp${min} - Rp${max}`, 'price'));
        }
        
        // Rating
        if (this.activeFilters.minRating > 0) {
            container.appendChild(this.createFilterTag(`Rating: ${this.activeFilters.minRating}+`, 'rating'));
        }
        
        // Status
        this.activeFilters.status.forEach(status => {
            const text = status === 'best-seller' ? 'Terlaris' : 
                        status === 'new' ? 'Baru' : 'Sedang Diskon';
            container.appendChild(this.createFilterTag(text, `status-${status}`));
        });
    }
    
    createFilterTag(text, key) {
        const tag = document.createElement('div');
        tag.className = 'filter-tag';
        tag.innerHTML = `${text} <button data-key="${key}">×</button>`;
        tag.querySelector('button').addEventListener('click', (e) => {
            this.removeFilter(e.target.dataset.key);
        });
        return tag;
    }
    
    removeFilter(key) {
        console.log(`🗑️ Removing filter: ${key}`);
        
        if (key === 'category') {
            this.activeFilters.category = [];
            document.querySelectorAll('input[name="category"]:checked').forEach(cb => cb.checked = false);
        } else if (key === 'price') {
            this.activeFilters.priceRange = { min: null, max: null };
            document.getElementById('min-price').value = '';
            document.getElementById('max-price').value = '';
        } else if (key === 'rating') {
            this.activeFilters.minRating = 0;
            document.querySelector('input[name="rating"][value="0"]').checked = true;
        } else if (key.startsWith('status-')) {
            const status = key.split('-')[1];
            this.activeFilters.status = this.activeFilters.status.filter(s => s !== status);
            document.querySelector(`input[name="status"][value="${status}"]`).checked = false;
        }
        
        this.applySearchAndFilters();
    }
    
    showErrorMessage(message) {
        const container = document.getElementById('product-grid');
        container.innerHTML = `
            <div class="error-message">
                <p>${message}</p>
                <button onclick="location.reload()">Coba Lagi</button>
            </div>
        `;
    }
}

// Initialize search system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔍 Starting Search System...');
    window.searchSystem = new SearchSystem();
});

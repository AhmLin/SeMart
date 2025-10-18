class SearchSystem {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.searchTerm = '';
        this.activeFilters = {
            category: [],
            priceRange: { min: null, max: null },
            minRating: 0
        };
        
        this.init();
    }
    
    async init() {
        await this.loadProducts();
        this.setupEventListeners();
        this.processURLParameters();
        this.applySearchAndFilters();
    }
    
    async loadProducts() {
        try {
            const response = await fetch('data/product.json');
            this.products = await response.json();
            this.populateCategoryFilters();
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }
    
    setupEventListeners() {
        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });
        
        document.getElementById('search-btn').addEventListener('click', () => {
            this.performSearch();
        });
        
        document.getElementById('apply-filters').addEventListener('click', () => {
            this.applyFilters();
        });
        
        document.getElementById('reset-filters').addEventListener('click', () => {
            this.resetFilters();
        });
        
        document.getElementById('sort-by').addEventListener('change', () => {
            this.sortProducts();
        });
    }
    
    processURLParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        this.searchTerm = urlParams.get('search') || '';
        document.getElementById('search-input').value = this.searchTerm;
        this.updateSearchTitle();
    }
    
    performSearch() {
        const searchValue = document.getElementById('search-input').value.trim();
        if (searchValue) {
            window.location.href = `search-results.html?search=${encodeURIComponent(searchValue)}`;
        }
    }
    
    applySearchAndFilters() {
        document.getElementById('loading-message').style.display = 'none';
        
        let results = this.searchTerm ? 
            this.searchProducts(this.searchTerm) : 
            [...this.products];
        
        results = this.applyAllFilters(results);
        this.filteredProducts = results;
        this.displayResults();
    }
    
    searchProducts(term) {
        const searchTerm = term.toLowerCase();
        return this.products.filter(product => {
            const searchableText = [
                product.name,
                product.category,
                product.description
            ].join(' ').toLowerCase();
            
            return searchableText.includes(searchTerm);
        });
    }
    
    applyAllFilters(products) {
        let filtered = products;
        
        if (this.activeFilters.category.length > 0) {
            filtered = filtered.filter(p => 
                this.activeFilters.category.includes(p.category)
            );
        }
        
        if (this.activeFilters.priceRange.min !== null) {
            filtered = filtered.filter(p => p.price >= this.activeFilters.priceRange.min);
        }
        if (this.activeFilters.priceRange.max !== null) {
            filtered = filtered.filter(p => p.price <= this.activeFilters.priceRange.max);
        }
        
        if (this.activeFilters.minRating > 0) {
            filtered = filtered.filter(p => p.rating >= this.activeFilters.minRating);
        }
        
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
            return;
        }
        
        noProducts.style.display = 'none';
        resultsCount.textContent = `${this.filteredProducts.length} produk ditemukan`;
        
        this.filteredProducts.forEach(product => {
            const card = this.createProductCard(product);
            container.appendChild(card);
        });
    }
    
    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.image}" alt="${product.name}" loading="lazy">
            <h3>${product.name}</h3>  <!-- TANPA HIGHLIGHT -->
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
        
        categories.forEach(category => {
            const label = document.createElement('label');
            label.className = 'filter-option';
            label.innerHTML = `
                <input type="checkbox" name="category" value="${category}">
                <span>${category}</span>
            `;
            container.appendChild(label);
        });
    }
    
    updateSearchTitle() {
        const title = document.getElementById('search-title');
        if (this.searchTerm) {
            title.textContent = `Hasil Pencarian: "${this.searchTerm}"`;
        }
    }

    // HAPUS fungsi highlightSearchTerm() sepenuhnya
    // highlightSearchTerm(text) {
    //     if (!this.searchTerm) return text;
    //     const regex = new RegExp(`(${this.searchTerm})`, 'gi');
    //     return text.replace(regex, '<mark class="search-highlight">$1</mark>');
    // }
}

document.addEventListener('DOMContentLoaded', () => {
    new SearchSystem();
});
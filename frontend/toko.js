document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/api'; // Sesuaikan jika URL API berbeda

    const productGrid = document.getElementById('product-grid');
    const pageTitle = document.querySelector('h1').textContent.toLowerCase();
    
    let shopType = '';
    if (pageTitle.includes('sembako')) {
        shopType = 'sembako';
    } else if (pageTitle.includes('elektronik')) {
        shopType = 'elektronik';
    } else if (pageTitle.includes('aplikasi')) {
        shopType = 'aplikasi';
    }

    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined) return 'Rp 0';
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };

    const createProductCard = (product) => {
        let imageUrl = 'https://placehold.co/400x400?text=Produk';
        if (product.image_url) {
            // Check if it's an external URL or a local path
            imageUrl = product.image_url.startsWith('http') 
                ? product.image_url 
                : `${API_URL.replace('/api', '')}${product.image_url}`;
        }
        return `
            <div class="bg-white rounded-lg shadow-md overflow-hidden group transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div class="relative">
                    <img src="${imageUrl}" alt="${product.name}" class="w-full h-48 object-cover">
                </div>
                <div class="p-4">
                    <h3 class="text-lg font-semibold text-gray-800 truncate" title="${product.name}">${product.name}</h3>
                    <p class="text-gray-500 text-sm mb-4 h-10">${product.description || ''}</p>
                    <div class="flex justify-between items-center">
                        <span class="text-xl font-bold text-accent">${formatCurrency(product.price)}</span>
                        <button class="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 transition-transform transform group-hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-400">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.922.778h9.246a1 1 0 00.97-.743l1.455-5.433A1 1 0 0016.22 0H4.342a1 1 0 00-.97.743L3.07 2.175A.997.997 0 002.148 3H1a1 1 0 100 2h.382l1.438 5.752A3 3 0 007.14 13h5.72a3 3 0 002.92-2.248L17.62 5H7.14a1 1 0 00-.922-.778L5.915 3H4.78a1 1 0 00-.97.743L3.38 4.917l-.305-1.222H1a1 1 0 00-1-1H.5a1 1 0 000 2h.538l.305 1.222a2.99 2.99 0 002.764 2.356h9.246a3 3 0 002.92-2.248L18.38 3H19a1 1 0 100-2h-2.78a3 3 0 00-2.92-2.248L12.86 0H4.342A3 3 0 001.42 2.248L.382 6.752A1 1 0 001.304 8H1a1 1 0 100-2h.382l.305-1.222A1 1 0 002.609 4H3V1zM7 15a2 2 0 100 4 2 2 0 000-4zm8 0a2 2 0 100 4 2 2 0 000-4z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    };

    const loadPublicProducts = async (type) => {
        if (!productGrid || !type) {
            console.error('Elemen #product-grid tidak ditemukan atau tipe toko tidak valid.');
            return;
        }

        productGrid.innerHTML = '<p class="col-span-full text-center text-gray-500">Memuat produk...</p>';

        try {
            // Asumsi ada endpoint publik `/api/products`
            const response = await fetch(`${API_URL}/products?shop=${type}`);
            if (!response.ok) {
                throw new Error('Gagal memuat produk dari server.');
            }
            const products = await response.json();

            if (products.length === 0) {
                productGrid.innerHTML = `<p class="col-span-full text-center text-gray-500">Belum ada produk yang tersedia di toko ini.</p>`;
                return;
            }

            productGrid.innerHTML = ''; // Kosongkan grid
            products.forEach(product => {
                productGrid.innerHTML += createProductCard(product);
            });

        } catch (error) {
            console.error('Error:', error);
            productGrid.innerHTML = `<p class="col-span-full text-center text-red-500">Terjadi kesalahan saat memuat produk.</p>`;
        }
    };

    if (shopType) {
        loadPublicProducts(shopType);
    }
});

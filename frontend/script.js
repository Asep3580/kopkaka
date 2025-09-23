document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMEN DOM ---
    const savingsSlider = document.getElementById('savingsSlider');
    const savingsInput = document.getElementById('savingsInput');
    const tenorButtons = document.querySelectorAll('.tenor-btn');
    const tenorInput = document.getElementById('tenor');
    const interestRateInput = document.getElementById('interest-rate');

    const plafonText = document.getElementById('plafonText');
    const cicilanText = document.getElementById('cicilanText');
    
    const amortizationSection = document.getElementById('amortization-section');
    const amortizationTableBody = document.getElementById('amortization-table-body');
    const amortizationTableFooter = document.getElementById('amortization-table-footer');

    // --- FUNGSI KERANJANG (HANYA UNTUK UPDATE JUMLAH) ---
    const updateCartCount = () => {
        const cartCountElements = document.querySelectorAll('.cart-item-count');
        if (cartCountElements.length === 0) return;

        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

        cartCountElements.forEach(element => {
            const displayCount = totalItems > 9 ? '9+' : totalItems;
            element.textContent = displayCount;
            if (totalItems > 0) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        });
    };


    // --- FUNGSI UTILITAS ---
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const formatPlain = (value) => {
        return new Intl.NumberFormat('id-ID').format(value);
    };

    const parseNumber = (formattedValue) => {
        return Number(String(formattedValue).replace(/[^0-9]/g, ''));
    };

    // --- FUNGSI PERHITUNGAN & RENDER ---
    const generateAmortization = (plafon, tenor, annualInterestRate) => {
        amortizationTableBody.innerHTML = '';
        amortizationTableFooter.innerHTML = '';

        if (plafon <= 0 || tenor <= 0) {
            amortizationSection.classList.add('hidden');
            return;
        }

        amortizationSection.classList.remove('hidden');

        const monthlyInterestRate = (annualInterestRate / 100) / 12;
        const pokokPerBulan = plafon / tenor;
        
        let sisaPinjaman = plafon;
        let totalPokok = 0, totalBunga = 0, totalCicilan = 0;

        for (let i = 1; i <= tenor; i++) {
            const bungaBulanIni = sisaPinjaman * monthlyInterestRate;
            const cicilanBulanIni = pokokPerBulan + bungaBulanIni;
            sisaPinjaman -= pokokPerBulan;

            totalPokok += pokokPerBulan;
            totalBunga += bungaBulanIni;
            totalCicilan += cicilanBulanIni;

            const row = `
                <tr>
                    <td class="px-6 py-4 text-sm text-gray-500">${i}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${formatCurrency(pokokPerBulan)}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${formatCurrency(bungaBulanIni)}</td>
                    <td class="px-6 py-4 text-sm font-semibold text-gray-800">${formatCurrency(cicilanBulanIni)}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${formatCurrency(sisaPinjaman < 1 ? 0 : sisaPinjaman)}</td>
                </tr>
            `;
            amortizationTableBody.innerHTML += row;
        }

        const footerRow = `
            <tr>
                <td class="px-6 py-3 text-xs font-bold text-gray-700 uppercase">Total</td>
                <td class="px-6 py-3 text-sm font-bold text-gray-900">${formatCurrency(totalPokok)}</td>
                <td class="px-6 py-3 text-sm font-bold text-gray-900">${formatCurrency(totalBunga)}</td>
                <td class="px-6 py-3 text-sm font-bold text-gray-900">${formatCurrency(totalCicilan)}</td>
                <td></td>
            </tr>
        `;
        amortizationTableFooter.innerHTML = footerRow;
    };

    const calculateAndDisplay = () => {
        const savings = parseNumber(savingsInput.value);
        const tenor = parseInt(tenorInput.value, 10);
        const interestRate = parseFloat(interestRateInput.value);

        if (isNaN(savings) || isNaN(tenor) || isNaN(interestRate) || savings <= 0 || tenor <= 0) return;

        // Aturan Plafon: Total Simpanan dikali 1.5
        const plafon = savings * 1.5;

        // Hitung cicilan bulan pertama (tertinggi dalam metode bunga menurun)
        const monthlyInterestRate = (interestRate / 100) / 12;
        const pokokPerBulan = plafon / tenor;
        const bungaBulanPertama = plafon * monthlyInterestRate;
        const cicilanBulanPertama = pokokPerBulan + bungaBulanPertama;

        // Update UI utama
        plafonText.textContent = formatCurrency(plafon);
        cicilanText.textContent = formatCurrency(cicilanBulanPertama);

        // Update Tabel Amortisasi
        generateAmortization(plafon, tenor, interestRate);
    };

    // --- EVENT LISTENERS ---
    savingsSlider.addEventListener('input', () => {
        savingsInput.value = formatPlain(savingsSlider.value);
        calculateAndDisplay();
    });

    savingsInput.addEventListener('input', (e) => {
        const numericValue = parseNumber(e.target.value);
        if (numericValue <= parseInt(savingsSlider.max, 10)) {
            savingsSlider.value = numericValue;
        }
        e.target.value = formatPlain(numericValue);
        calculateAndDisplay();
    });
    
    savingsInput.addEventListener('blur', () => {
        const numericValue = parseNumber(savingsInput.value);
        savingsInput.value = formatPlain(numericValue);
    });

    tenorButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            tenorButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            tenorInput.value = button.dataset.tenor;
            calculateAndDisplay();
        });
    });

    interestRateInput.addEventListener('input', () => {
        calculateAndDisplay();
    });

    // --- INISIALISASI ---
    // Panggil sekali saat halaman dimuat untuk menampilkan nilai awal
    calculateAndDisplay();
    updateCartCount(); // Perbarui jumlah keranjang saat halaman utama dimuat
});
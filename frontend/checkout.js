document.addEventListener('DOMContentLoaded', () => {
    const checkoutSuccessEl = document.getElementById('checkout-success');
    const checkoutFailEl = document.getElementById('checkout-fail');

    // Elements for success case
    const orderIdEl = document.getElementById('order-id');
    const orderDateEl = document.getElementById('order-date');
    const orderMemberNameEl = document.getElementById('order-member-name');
    const orderCoopNumberEl = document.getElementById('order-coop-number');
    const orderItemsTableEl = document.getElementById('order-items-table');
    const orderTotalEl = document.getElementById('order-total');
    const barcodeEl = document.getElementById('barcode');
    const printBtn = document.getElementById('print-btn');
    const finishBtn = document.getElementById('finish-btn');

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };

    const loadOrderData = () => {
        const orderDataJSON = sessionStorage.getItem('checkoutOrder');
        if (!orderDataJSON) {
            checkoutFailEl.classList.remove('hidden');
            checkoutSuccessEl.classList.add('hidden');
            return;
        }

        checkoutFailEl.classList.add('hidden');
        checkoutSuccessEl.classList.remove('hidden');

        const orderData = JSON.parse(orderDataJSON);

        // Populate order details
        orderIdEl.textContent = orderData.orderId;
        orderDateEl.textContent = new Date(orderData.timestamp).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
        orderMemberNameEl.textContent = orderData.user.name;
        orderCoopNumberEl.textContent = orderData.user.coopNumber;

        // Populate items table
        orderItemsTableEl.innerHTML = '';
        orderData.items.forEach(item => {
            const row = document.createElement('tr');
            const itemSubtotal = item.price * item.quantity;
            row.innerHTML = `
                <td class="py-2 text-left">${item.name}</td>
                <td class="py-2 text-center">${item.quantity}</td>
                <td class="py-2 text-right">${formatCurrency(itemSubtotal)}</td>
            `;
            orderItemsTableEl.appendChild(row);
        });

        // Populate total
        orderTotalEl.textContent = formatCurrency(orderData.total);

        // Generate Barcode (QR Code)
        try {
            JsBarcode(barcodeEl, JSON.stringify(orderData), {
                format: "QRCODE",
                width: 3,
                height: 3,
                displayValue: false
            });
        } catch (e) {
            console.error("Error generating barcode:", e);
            barcodeEl.parentElement.innerHTML = '<p class="text-red-500">Gagal membuat barcode.</p>';
        }
    };

    // Event Listeners
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    if (finishBtn) {
        finishBtn.addEventListener('click', () => {
            sessionStorage.removeItem('checkoutOrder');
        });
    }

    // Initial load
    loadOrderData();
});
document.addEventListener('DOMContentLoaded', () => {
    // --- KONFIGURASI & ELEMEN GLOBAL ---
    const API_URL = 'http://localhost:3000/api'; // URL utama API
    const ADMIN_API_URL = `${API_URL}/admin`; // URL untuk endpoint admin
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const menuButton = document.getElementById('menu-button');
    const allLinks = document.querySelectorAll('.sidebar-link, .settings-card-link, .accounting-card-link');
    const contentSections = document.querySelectorAll('.content-section');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');

    // --- AUTH & ROLE CHECK ---
    const token = localStorage.getItem('token');
    const userName = localStorage.getItem('user_name');
    const userRole = localStorage.getItem('user_role');

    const checkAdminAuth = () => {
        if (!token || !['admin', 'akunting', 'manager'].includes(userRole)) {
            alert('Akses ditolak. Silakan masuk sebagai staf.');
            localStorage.clear();
            window.location.href = 'login.html';
        }
        document.getElementById('user-name-header').textContent = userName || 'Pengguna';
    };


    // --- HELPER FUNCTIONS ---
    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined) return 'Rp 0';
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const apiFetch = async (endpoint, options = {}) => {
        const currentToken = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${currentToken}`, ...options.headers };

        // Do not set Content-Type for FormData, browser will do it with boundary
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }
        
        const response = await fetch(endpoint, { ...options, headers });
        if (response.status === 401 || response.status === 403) {
            alert('Sesi Anda telah berakhir atau tidak valid. Silakan masuk kembali.');
            localStorage.clear();
            window.location.href = 'login.html';
            throw new Error('Unauthorized'); // Stop further execution
        }
        return response;
    };

    // Generic Dropdown Populator
    const populateDropdown = async (selectElement, endpoint, valueKey, textKey, defaultText) => {
        try {
            const response = await apiFetch(`${API_URL}/${endpoint}`);
            if (!response.ok) throw new Error(`Gagal memuat ${defaultText}`);
            const items = await response.json();
            selectElement.innerHTML = `<option value="">-- Pilih ${defaultText} --</option>`;
            items.forEach(item => {
                const option = document.createElement('option');
                option.value = item[valueKey];
                // If textKey is a function, use it to generate the text
                if (typeof textKey === 'function') {
                    option.textContent = textKey(item);
                } else {
                    option.textContent = item[textKey];
                }
                selectElement.appendChild(option);
            });
        } catch (error) {
            console.error(error);
            selectElement.innerHTML = `<option value="">Gagal memuat data</option>`;
        }
    };

    const renderPagination = (containerId, pagination, loadDataFunction) => {
        const container = document.getElementById(containerId);
        if (!container) return;
    
        const { totalItems, totalPages, currentPage, limit } = pagination;
    
        if (totalItems === 0) {
            container.innerHTML = '';
            return;
        }
    
        const startItem = (currentPage - 1) * limit + 1;
        const endItem = Math.min(currentPage * limit, totalItems);
    
        container.innerHTML = `
            <div>
                Menampilkan <span class="font-semibold">${startItem}</span> - <span class="font-semibold">${endItem}</span> dari <span class="font-semibold">${totalItems}</span> hasil
            </div>
            <div class="flex items-center space-x-2">
                <button data-page="${currentPage - 1}" class="pagination-btn bg-white border border-gray-300 rounded-md px-3 py-1 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" ${currentPage === 1 ? 'disabled' : ''}>
                    Sebelumnya
                </button>
                <span class="px-2">Halaman ${currentPage} dari ${totalPages}</span>
                <button data-page="${currentPage + 1}" class="pagination-btn bg-white border border-gray-300 rounded-md px-3 py-1 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" ${currentPage >= totalPages ? 'disabled' : ''}>
                    Berikutnya
                </button>
            </div>
        `;
    
        container.querySelectorAll('.pagination-btn:not([disabled])').forEach(button => {
            button.addEventListener('click', () => loadDataFunction(parseInt(button.dataset.page, 10)));
        });
    };

    // --- FUNGSI UNTUK MENU MOBILE ---
    const toggleMenu = () => {
        sidebar.classList.toggle('-translate-x-full');
        sidebarOverlay.classList.toggle('hidden');
    };
    if (menuButton) menuButton.addEventListener('click', toggleMenu);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleMenu);

    // --- FUNGSI UNTUK MENU COLLAPSIBLE USAHA KOPERASI ---
    const usahaMenuButton = document.getElementById('usaha-koperasi-menu-button');
    if (usahaMenuButton) {
        usahaMenuButton.addEventListener('click', () => {
            const submenu = document.getElementById('usaha-koperasi-submenu');
            const arrow = document.getElementById('usaha-koperasi-arrow');
            submenu.classList.toggle('hidden');
            arrow.classList.toggle('rotate-180');
        });
    }


    // --- FUNGSI UNTUK DASHBOARD ---
    const loadDashboardData = async () => {
        try {
            // 1. Ambil statistik umum (simpanan, pinjaman, pendaftar baru)
            const statsResponse = await apiFetch(`${ADMIN_API_URL}/stats`);
            if (!statsResponse.ok) throw new Error('Gagal memuat statistik.');
            const stats = await statsResponse.json();

            document.getElementById('total-savings').textContent = formatCurrency(stats.totalSavings);
            document.getElementById('total-loans').textContent = formatCurrency(stats.totalActiveLoans);
            document.getElementById('pending-members-count').textContent = stats.pendingMembers || 0;
            document.getElementById('total-members').textContent = stats.totalMembers || 0;

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            document.getElementById('total-members').textContent = 'N/A';
        }
    };

    // --- FUNGSI UNTUK ANGGOTA ---
    let currentMemberFilters = {};
    const loadMembers = async (page = 1) => {
        const tableBody = document.getElementById('members-table-body');
        if (!tableBody) return;
        tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-gray-500">Memuat data anggota...</td></tr>`;

        try {
            const filters = { ...currentMemberFilters, status: 'Active', page, limit: 10 };
            const queryParams = new URLSearchParams(filters).toString();
            
            const response = await apiFetch(`${API_URL}/members?${queryParams}`);
            if (!response.ok) throw new Error('Gagal memuat data anggota.');
            const { data: members, pagination } = await response.json();

            // Saring daftar untuk hanya menampilkan pengguna dengan peran 'member'
            const memberOnlyList = members.filter(user => user.role === 'member');

            tableBody.innerHTML = '';
            if (memberOnlyList.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-gray-500">Tidak ada anggota yang cocok dengan filter.</td></tr>`;
                renderPagination('members-pagination-controls', { totalItems: 0 }, loadMembers);
                return;
            }

            memberOnlyList.forEach(member => {
                const row = tableBody.insertRow();
                row.innerHTML = `
                    <td class="px-6 py-4 text-sm font-medium text-gray-900">${member.name}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${member.cooperative_number || '-'}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${member.ktp_number || '-'}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${member.company_name || '-'}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${member.position_name || '-'}</td>
                    <td class="px-6 py-4 text-sm text-gray-500 text-right">${formatCurrency(member.total_savings)}</td>
                    <td class="px-6 py-4 text-sm text-gray-500 text-right">${formatCurrency(member.total_loans)}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${formatDate(member.approval_date)}</td>
                    <td class="px-6 py-4 text-sm font-medium space-x-2">
                        <button class="details-member-btn text-indigo-600 hover:text-indigo-900" data-id="${member.id}">Detail</button>
                    </td>
                `;
            });

            // Render pagination controls
            renderPagination('members-pagination-controls', pagination, loadMembers);
        } catch (error) {
            console.error('Error loading members:', error);
            tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-red-500">${error.message}</td></tr>`;
        }
    };
    const membersTableBody = document.getElementById('members-table-body');
    if(membersTableBody) {
        membersTableBody.addEventListener('click', (e) => {
            if (e.target.matches('.details-member-btn')) {
                showMemberDetails(e.target.dataset.id);
            }
            // could add edit/delete later here
        });
    }

    // --- EVENT LISTENERS UNTUK FILTER ANGGOTA ---
    const membersFilterForm = document.getElementById('members-filter-form');
    if (membersFilterForm) {
        const companySelect = document.getElementById('members-filter-company');
        populateDropdown(companySelect, 'employers', 'id', 'name', 'Semua Perusahaan');

        membersFilterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            currentMemberFilters = {
                search: document.getElementById('members-filter-search').value,
                companyId: document.getElementById('members-filter-company').value,
            };
            Object.keys(currentMemberFilters).forEach(key => !currentMemberFilters[key] && delete currentMemberFilters[key]);
            loadMembers(1);
        });

        document.getElementById('members-filter-reset-btn').addEventListener('click', () => {
            membersFilterForm.reset();
            currentMemberFilters = {};
            loadMembers(1);
        });
    }

    // --- FUNGSI UNTUK SIMPANAN ---
    let currentSavingsFilters = {};
    const loadSavings = async (page = 1) => {
        const tableBody = document.getElementById('savings-table-body');
        if (!tableBody) return;
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-gray-500">Memuat data simpanan...</td></tr>`;
        try {
            const filters = { ...currentSavingsFilters, page, limit: 10 };
            const queryParams = new URLSearchParams(filters).toString();
            const response = await apiFetch(`${API_URL}/savings?${queryParams}`);
            if (!response.ok) throw new Error('Gagal memuat data simpanan.');
            const { data: savings, pagination } = await response.json();

            tableBody.innerHTML = '';
            if (savings.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-gray-500">Tidak ada data simpanan ditemukan.</td></tr>`;
                renderPagination('savings-pagination-controls', { totalItems: 0 }, loadSavings);
                return;
            }
            
            savings.forEach(saving => {
                const row = tableBody.insertRow();
                const statusClass = saving.status === 'Approved' ? 'bg-green-100 text-green-800' : (saving.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800');
                row.innerHTML = `
                    <td class="px-6 py-4 text-sm text-gray-900">${saving.memberName}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${saving.savingTypeName}</td>
                    <td class="px-6 py-4 text-sm text-gray-500 text-right">${formatCurrency(saving.amount)}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${formatDate(saving.date)}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${saving.description || '-'}</td>
                    <td class="px-6 py-4 text-sm"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${saving.status}</span></td>
                    <td class="px-6 py-4 text-sm font-medium space-x-2">
                        ${userRole === 'admin' && saving.status === 'Pending' ? `<button class="edit-saving-btn text-indigo-600 hover:text-indigo-900" data-id="${saving.id}">Ubah</button>` : ''}
                        ${userRole === 'admin' && saving.status === 'Pending' ? `<button class="delete-saving-btn text-red-600 hover:text-red-900" data-id="${saving.id}">Hapus</button>` : ''}
                    </td>
                `;
            });
            
            renderPagination('savings-pagination-controls', pagination, loadSavings);

        } catch (error) {
            console.error('Error loading savings:', error);
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-red-500">${error.message}</td></tr>`;
        }
    };

    // --- FUNGSI UNTUK PINJAMAN ---
    let currentLoansFilters = {};
    const loadLoans = async (page = 1) => {
        const tableBody = document.getElementById('loans-table-body');
        if (!tableBody) return;
        tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-gray-500">Memuat data pinjaman...</td></tr>`;
        try {
            const filters = { ...currentLoansFilters, page, limit: 10 };
            const queryParams = new URLSearchParams(filters).toString();
            // Diasumsikan endpoint /api/loans sudah ada dan melakukan join yang diperlukan
            const response = await apiFetch(`${API_URL}/loans?${queryParams}`);
            if (!response.ok) throw new Error('Gagal memuat data pinjaman.');
            const { data: loans, pagination } = await response.json();

            tableBody.innerHTML = '';
            if (loans.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-gray-500">Tidak ada data pinjaman ditemukan.</td></tr>`;
                renderPagination('loans-pagination-controls', { totalItems: 0 }, loadLoans);
                return;
            }

            loans.forEach(loan => {
                const row = tableBody.insertRow();
                // Diasumsikan backend mengembalikan field-field ini dari join atau kalkulasi
                const monthlyInstallment = loan.monthlyInstallment || 0;
                const totalPayment = loan.totalPayment || 0;
                const statusClass = loan.status === 'Approved' ? 'bg-green-100 text-green-800' : (loan.status === 'Rejected' ? 'bg-red-100 text-red-800' : (loan.status === 'Lunas' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'));

                row.innerHTML = `
                    <td class="px-6 py-4 text-sm text-gray-900">${loan.memberName}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${loan.loanTypeName}</td>
                    <td class="px-6 py-4 text-sm text-gray-500 text-right">${formatCurrency(loan.amount)}</td>
                    <td class="px-6 py-4 text-sm text-gray-500 text-center">${loan.tenorMonths} bulan</td>
                    <td class="px-6 py-4 text-sm text-gray-500 text-right">${formatCurrency(monthlyInstallment)}</td>
                    <td class="px-6 py-4 text-sm text-gray-500 text-right">${formatCurrency(totalPayment)}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${formatDate(loan.date)}</td>
                    <td class="px-6 py-4 text-sm"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${loan.status}</span></td>
                    <td class="px-6 py-4 text-sm font-medium space-x-2 whitespace-nowrap">
                        <button class="details-loan-btn text-blue-600 hover:text-blue-900" data-id="${loan.id}">Detail</button>
                        ${userRole === 'admin' && loan.status === 'Pending' ? `<button class="edit-loan-btn text-indigo-600 hover:text-indigo-900" data-id="${loan.id}">Ubah</button>` : ''}
                        ${userRole === 'admin' && loan.status === 'Pending' ? `<button class="delete-loan-btn text-red-600 hover:text-red-900" data-id="${loan.id}">Hapus</button>` : ''}
                    </td>
                `;
            });

            renderPagination('loans-pagination-controls', pagination, loadLoans);
        } catch (error) {
            console.error('Error loading loans:', error);
            tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-red-500">${error.message}</td></tr>`;
        }
    };

    // --- EVENT LISTENERS UNTUK FILTER PINJAMAN ---
    const loansFilterForm = document.getElementById('loans-filter-form');
    if (loansFilterForm) {
        loansFilterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            currentLoansFilters = {
                status: document.getElementById('loans-filter-status').value,
                startDate: document.getElementById('loans-filter-start-date').value,
                endDate: document.getElementById('loans-filter-end-date').value,
                search: document.getElementById('loans-filter-search').value,
            };
            // Hapus filter kosong
            Object.keys(currentLoansFilters).forEach(key => !currentLoansFilters[key] && delete currentLoansFilters[key]);
            loadLoans(1);
        });

        document.getElementById('loans-filter-reset-btn').addEventListener('click', () => {
            loansFilterForm.reset();
            currentLoansFilters = {};
            loadLoans(1);
        });
    }

    const loansTableBody = document.getElementById('loans-table-body');
    if (loansTableBody) {
        loansTableBody.addEventListener('click', async (e) => {
            const button = e.target;
            const loanId = button.dataset.id;

            if (button.matches('.details-loan-btn')) {
                showAdminLoanDetailsModal(loanId);
            }

            if (button.matches('.edit-loan-btn')) {
                showEditLoanModal(loanId);
            }

            if (button.matches('.delete-loan-btn')) {
                if (confirm('Anda yakin ingin menghapus pengajuan pinjaman ini? Tindakan ini tidak dapat dibatalkan.')) {
                    try {
                        const response = await apiFetch(`${ADMIN_API_URL}/loans/${loanId}`, {
                            method: 'DELETE',
                        });

                        if (!response.ok) {
                            const err = await response.json();
                            throw new Error(err.error || 'Gagal menghapus pinjaman.');
                        }
                        
                        alert('Pengajuan pinjaman berhasil dihapus.');
                        loadLoans(); // Reload the list
                    } catch (error) {
                        alert(`Terjadi kesalahan: ${error.message}`);
                        console.error('Error deleting loan:', error);
                    }
                }
            }
        });
    }

    // --- FUNGSI UNTUK MODAL UBAH PINJAMAN ---
    const loanEditModal = document.getElementById('loan-edit-modal');
    const loanEditForm = document.getElementById('loan-edit-form');
    if (loanEditModal) {
        document.getElementById('close-loan-edit-modal').addEventListener('click', () => loanEditModal.classList.add('hidden'));
        document.getElementById('cancel-loan-edit-modal').addEventListener('click', () => loanEditModal.classList.add('hidden'));

        loanEditForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const loanId = document.getElementById('loan-edit-id-input').value;
            const loan_term_id = document.getElementById('loan-edit-term-select').value;
            const amount = document.getElementById('loan-edit-amount-input').value;

            try {
                const response = await apiFetch(`${ADMIN_API_URL}/loans/${loanId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ loan_term_id, amount }),
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Gagal memperbarui pinjaman.');
                }

                alert('Pengajuan pinjaman berhasil diperbarui.');
                loanEditModal.classList.add('hidden');
                loadLoans(); // Muat ulang daftar pinjaman
            } catch (error) {
                alert(`Terjadi kesalahan: ${error.message}`);
                console.error('Error updating loan:', error);
            }
        });
    }

    const showEditLoanModal = async (loanId) => {
        loanEditForm.reset();
        loanEditModal.classList.remove('hidden');
        try {
            const loanResponse = await apiFetch(`${ADMIN_API_URL}/loans/${loanId}`);
            if (!loanResponse.ok) throw new Error('Gagal memuat data pinjaman.');
            const loan = await loanResponse.json();

            document.getElementById('loan-edit-id-input').value = loan.id;
            document.getElementById('loan-edit-member-name').textContent = loan.member_name;
            document.getElementById('loan-edit-amount-input').value = loan.amount;

            const termSelect = document.getElementById('loan-edit-term-select');
            await populateDropdown(termSelect, 'loanterms', 'id', 
                (item) => `${item.loan_type_name} - ${item.tenor_months} bulan (${item.interest_rate}%)`, 
                'Produk Pinjaman');
            termSelect.value = loan.loan_term_id;
        } catch (error) {
            alert(`Terjadi kesalahan: ${error.message}`);
            loanEditModal.classList.add('hidden');
        }
    };

    // --- FUNGSI UNTUK MODAL DETAIL PINJAMAN (ADMIN) ---
    const adminLoanDetailsModal = document.getElementById('admin-loan-details-modal');
    if (adminLoanDetailsModal) {
        document.getElementById('close-admin-loan-details-modal-btn').addEventListener('click', () => {
            adminLoanDetailsModal.classList.add('hidden');
        });

        adminLoanDetailsModal.addEventListener('click', async (e) => {
            if (!e.target.matches('.pay-installment-btn')) return;
    
            const button = e.target;
            const { loanId, installmentNumber } = button.dataset;
    
            if (!confirm(`Anda yakin ingin mencatat pembayaran untuk angsuran ke-${installmentNumber}?`)) {
                return;
            }
    
            button.disabled = true;
            button.textContent = 'Memproses...';
    
            try {
                const response = await apiFetch(`${ADMIN_API_URL}/loans/payment`, {
                    method: 'POST',
                    body: JSON.stringify({ loanId, installmentNumber }),
                });
    
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Gagal mencatat pembayaran.');
                }
                
                const result = await response.json();
                alert(result.message);
    
                // Refresh the modal content to show the updated status
                showAdminLoanDetailsModal(loanId);
    
                // If the loan is now 'Lunas', refresh the main loans list as well
                if (result.loanStatus === 'Lunas') {
                    loadLoans();
                }
    
            } catch (error) {
                alert(`Terjadi kesalahan: ${error.message}`);
                button.disabled = false;
                button.textContent = 'Bayar';
            }
        });
    }

    const showAdminLoanDetailsModal = async (loanId) => {
        if (!adminLoanDetailsModal) return;
        
        const titleEl = document.getElementById('admin-loan-details-modal-title');
        const summarySection = document.getElementById('admin-loan-summary-section');
        const installmentsTableBody = document.getElementById('admin-loan-installments-table-body');

        adminLoanDetailsModal.classList.remove('hidden');
        titleEl.textContent = 'Memuat Detail Pinjaman...';
        summarySection.innerHTML = `<p class="text-gray-500 col-span-full text-center">Memuat ringkasan...</p>`;
        installmentsTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">Memuat jadwal angsuran...</td></tr>`;

        try {
            const response = await apiFetch(`${ADMIN_API_URL}/loans/${loanId}/details`);
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Gagal memuat detail pinjaman.');
            }
            const data = await response.json();
            const { summary, installments } = data;

            titleEl.textContent = `Detail Pinjaman - ${summary.memberName}`;

            const isLoanPayable = summary.status === 'Approved';

            // Populate summary
            const renderSummaryDetail = (label, value) => `<div class="p-2"><p class="text-xs text-gray-500">${label}</p><p class="font-semibold text-gray-800">${value}</p></div>`;
            summarySection.innerHTML = `
                ${renderSummaryDetail('Jumlah Pinjaman', formatCurrency(summary.amount))}
                ${renderSummaryDetail('Angsuran/Bulan (Awal)', formatCurrency(summary.monthlyInstallment))}
                ${renderSummaryDetail('Tenor', `${summary.tenor_months} bulan`)}
                ${renderSummaryDetail('Total Terbayar', formatCurrency(summary.totalPaid))}
            `;

            // Populate installments table
            if (installments.length === 0) {
                installmentsTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">Jadwal angsuran tidak tersedia.</td></tr>`;
                return;
            }
            
            installmentsTableBody.innerHTML = '';
            installments.forEach(inst => {
                const statusClass = inst.status === 'Lunas' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';

                let actionButton = '';
                if (inst.status !== 'Lunas' && isLoanPayable && ['admin', 'akunting'].includes(userRole)) {
                    actionButton = `<button class="pay-installment-btn text-sm bg-green-600 text-white py-1 px-3 rounded-md hover:bg-green-700" data-loan-id="${summary.id}" data-installment-number="${inst.installmentNumber}">Bayar</button>`;
                } else if (inst.status !== 'Lunas') {
                    actionButton = `<span class="text-xs text-gray-400">-</span>`;
                }

                const row = installmentsTableBody.insertRow();
                row.innerHTML = `
                    <td class="px-6 py-4 text-sm text-gray-500 text-center">${inst.installmentNumber}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${formatDate(inst.dueDate)}</td>
                    <td class="px-6 py-4 text-sm text-gray-900 text-right">${formatCurrency(inst.amount)}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${formatDate(inst.paymentDate)}</td>
                    <td class="px-6 py-4 text-sm"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${inst.status}</span></td>
                    <td class="px-6 py-4 text-sm font-medium">${actionButton}</td>
                `;
            });

        } catch (error) {
            console.error('Error loading loan details for admin:', error);
            titleEl.textContent = 'Gagal Memuat Data';
            summarySection.innerHTML = `<p class="text-red-500 col-span-full text-center">${error.message}</p>`;
            installmentsTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-red-500">Gagal memuat jadwal angsuran.</td></tr>`;
        }
    };

    // --- FUNGSI UNTUK PERSETUJUAN ---
    const approvalTabBtns = document.querySelectorAll('.approval-tab-btn');
    const approvalTabContents = document.querySelectorAll('.approval-tab-content');
    const pendingMembersTableBody = document.getElementById('pending-members-table-body');

    const renderPendingMembers = async () => {
        if (!pendingMembersTableBody) return;
        
        try {
            const response = await apiFetch(`${API_URL}/members?status=Pending`);
            if (!response.ok) {
                throw new Error('Gagal memuat data pendaftar baru.');
            }
            const { data: pendingMembers } = await response.json();
            
            pendingMembersTableBody.innerHTML = ''; // Kosongkan tabel

            if (!pendingMembers || pendingMembers.length === 0) {
                pendingMembersTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">Tidak ada pendaftaran baru.</td></tr>`;
                return;
            }

            pendingMembers.forEach(member => {
                const row = document.createElement('tr');
                // cooperative_number akan kosong untuk pendaftar baru
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${member.name}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${member.cooperative_number || '-'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${member.ktp_number || '-'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${member.company_name || '-'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(member.registration_date).toLocaleDateString('id-ID')}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button class="details-member-btn text-blue-600 hover:text-blue-900" data-id="${member.id}">Detail</button>
                        <button class="approve-member-btn text-green-600 hover:text-green-900" data-id="${member.id}">Setujui</button>
                        <button class="reject-member-btn text-red-600 hover:text-red-900" data-id="${member.id}">Tolak</button>
                    </td>
                `;
                pendingMembersTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error fetching pending members:', error);
            pendingMembersTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-red-500">${error.message}</td></tr>`;
        }
    };

    const handleMemberApproval = async (e) => {
        const button = e.target;
        const memberId = button.dataset.id;

        if (button.matches('.details-member-btn')) {
            showMemberDetails(memberId);
            return;
        }

        if (button.matches('.approve-member-btn, .reject-member-btn')) {
            const isApproved = button.matches('.approve-member-btn');
            const newStatus = isApproved ? 'Active' : 'Rejected';

            if (!confirm(`Anda yakin ingin ${isApproved ? 'menyetujui' : 'menolak'} pendaftaran ini?`)) {
                return;
            }

            try {
                const response = await apiFetch(`${API_URL}/members/${memberId}/status`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: newStatus }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Gagal memperbarui status anggota.');
                }

                const updatedMember = await response.json();
                alert(`Status anggota "${updatedMember.name}" berhasil diubah menjadi "${newStatus}".`);
                renderPendingMembers();

            } catch (error) {
                console.error('Error handling member approval:', error);
                alert(`Terjadi kesalahan: ${error.message}`);
            }
        }
    };

    if (pendingMembersTableBody) {
        pendingMembersTableBody.addEventListener('click', handleMemberApproval);
    }

    const memberDetailsModal = document.getElementById('member-details-modal');
    const memberDetailsContent = document.getElementById('member-details-content');
    const memberDetailsModalTitle = document.getElementById('member-details-modal-title');
    document.getElementById('close-member-details-modal-btn')?.addEventListener('click', () => memberDetailsModal.classList.add('hidden'));

    const showMemberDetails = async (memberId) => {
        memberDetailsModal.classList.remove('hidden');
        memberDetailsModalTitle.textContent = 'Memuat Data...';
        memberDetailsContent.innerHTML = `<div class="text-center py-8"><p class="text-gray-500">Memuat data detail...</p></div>`;
        try {
            const response = await apiFetch(`${API_URL}/members/${memberId}`);
            if (!response.ok) throw new Error('Gagal memuat detail anggota.');
            const member = await response.json();

            const renderDetail = (label, value) => `<div><dt class="text-sm font-medium text-gray-500">${label}</dt><dd class="mt-1 text-sm text-gray-900">${value || '-'}</dd></div>`;
            const renderImage = (label, path) => {
                if (!path) return '';
                const webPath = path.replace(/\\/g, '/');
                const fullUrl = `${API_URL.replace('/api', '')}${webPath.startsWith('/') ? '' : '/'}${webPath}`;
                return `<div><dt class="text-sm font-medium text-gray-500">${label}</dt><dd class="mt-1"><a href="${fullUrl}" target="_blank" rel="noopener noreferrer"><img src="${fullUrl}" alt="${label}" class="rounded-lg max-h-48 border hover:opacity-80 transition-opacity"></a></dd></div>`;
            };

            memberDetailsModalTitle.textContent = `Detail Anggota: ${member.name}`;
            const fullAddress = [member.address_detail, member.address_village, member.address_district, member.address_city, member.address_province].filter(Boolean).join(', ');
            const statusClass = member.status === 'Active' ? 'bg-green-100 text-green-800' : (member.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800');

            memberDetailsContent.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                    <dl class="space-y-4">
                        ${renderDetail('Nama Lengkap', member.name)}
                        ${renderDetail('Nomor Koperasi', member.cooperative_number)}
                        ${renderDetail('Nomor KTP', member.ktp_number)}
                        ${renderDetail('Email', member.email)}
                        ${renderDetail('No. Telepon', member.phone)}
                    </dl>
                    <dl class="space-y-4">
                        ${renderDetail('Perusahaan', member.company_name)}
                        ${renderDetail('Jabatan', member.position_name)}
                        ${renderDetail(member.status === 'Active' ? 'Tanggal Bergabung' : 'Tanggal Pendaftaran', formatDate(member.approval_date || member.registration_date))}
                        ${renderDetail('Status', `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${member.status}</span>`)}
                    </dl>
                </div>
                <div class="border-t border-gray-200 pt-6 mt-6">
                    <h4 class="text-md font-semibold text-gray-800 mb-4">Informasi Keuangan</h4>
                    <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                        ${renderDetail('Total Simpanan', formatCurrency(member.total_savings))}
                        ${renderDetail('Total Pinjaman Aktif', formatCurrency(member.total_loans))}
                    </dl>
                </div>
                <div class="border-t border-gray-200 pt-6 mt-6">
                    <h4 class="text-md font-semibold text-gray-800 mb-4">Alamat</h4>
                    <dl>${renderDetail('Alamat Lengkap', fullAddress)}</dl>
                </div>
                <div class="border-t border-gray-200 pt-6 mt-6">
                    <h4 class="text-md font-semibold text-gray-800 mb-4">Data Ahli Waris</h4>
                    <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                        ${renderDetail('Nama Ahli Waris', member.heir_name)}
                        ${renderDetail('Hubungan', member.heir_relationship)}
                        ${renderDetail('No. Kartu Keluarga', member.heir_kk_number)}
                        ${renderDetail('No. Telepon', member.heir_phone)}
                    </dl>
                </div>
                <div class="border-t border-gray-200 pt-6 mt-6">
                    <h4 class="text-md font-semibold text-gray-800 mb-4">Dokumen Terlampir</h4>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        ${renderImage('Foto KTP', member.ktp_photo_path)}
                        ${renderImage('Foto Selfie + KTP', member.selfie_photo_path)}
                        ${renderImage('Foto Kartu Keluarga', member.kk_photo_path)}
                    </div>
                </div>
            `;
        } catch (error) {
            memberDetailsContent.innerHTML = `<p class="text-center text-red-500">${error.message}</p>`;
        }
    };

    const loadPendingApprovals = async (type) => {
        const endpoint = type === 'savings' ? 'savings' : 'loans';
        const tableBody = document.getElementById(`pending-${endpoint}-table-body`);
        if (!tableBody) return;

        const isLoan = type === 'loans';
        const url = isLoan ? `${ADMIN_API_URL}/pending-loans` : `${API_URL}/savings?status=Pending`;
        const colspan = isLoan ? 6 : 5;

        try {
            const response = await apiFetch(url);
            if (!response.ok) throw new Error(`Gagal memuat data ${type} menunggu persetujuan.`);
            const responseData = await response.json();
            // Handle both paginated (has .data) and non-paginated responses
            const items = responseData.data || responseData;

            tableBody.innerHTML = '';
            if (items.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="${colspan}" class="text-center py-4 text-gray-500">Tidak ada pengajuan baru.</td></tr>`;
                return;
            }
            items.forEach(item => {
                const row = tableBody.insertRow();
                let actionButtons = `<span class="text-xs text-gray-400">Tidak ada aksi</span>`;

                if (isLoan) {
                    if (item.status === 'Pending' && ['admin', 'akunting'].includes(userRole)) {
                        actionButtons = `<button class="approve-btn text-green-600" data-id="${item.id}" data-type="loans" data-new-status="Approved by Accounting">Setujui (Akunting)</button>
                                         <button class="reject-btn text-red-600" data-id="${item.id}" data-type="loans" data-new-status="Rejected">Tolak</button>`;
                    } else if (item.status === 'Approved by Accounting' && ['admin', 'manager'].includes(userRole)) {
                        actionButtons = `<button class="approve-btn text-green-600" data-id="${item.id}" data-type="loans" data-new-status="Approved">Finalisasi (Manager)</button>
                                         <button class="reject-btn text-red-600" data-id="${item.id}" data-type="loans" data-new-status="Rejected">Tolak</button>`;
                    }
                } else { // Savings
                    if (['admin', 'akunting'].includes(userRole)) {
                        actionButtons = `<button class="approve-btn text-green-600" data-id="${item.id}" data-type="savings" data-new-status="Approved">Setujui</button>
                                         <button class="reject-btn text-red-600" data-id="${item.id}" data-type="savings" data-new-status="Rejected">Tolak</button>`;
                    }
                }

                row.innerHTML = `
                    <td class="px-6 py-4 text-sm text-gray-900">${item.memberName || 'N/A'}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${item.cooperativeNumber || '-'}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${formatCurrency(item.amount)}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${formatDate(item.date)}</td>
                    ${isLoan ? `<td class="px-6 py-4 text-sm text-gray-500">${item.status}</td>` : ''}
                    <td class="px-6 py-4 text-sm font-medium space-x-2">${actionButtons}</td>
                `;
            });
        } catch (error) {
            console.error(`Error loading pending ${type}:`, error);
            tableBody.innerHTML = `<tr><td colspan="${colspan}" class="text-center py-4 text-red-500">${error.message}</td></tr>`;
        }
    };

    const handleGenericApproval = async (e) => {
        if (!e.target.matches('.approve-btn, .reject-btn')) return;
        const { id, type, newStatus } = e.target.dataset;
        const isApproved = !newStatus.includes('Rejected');
        const endpoint = type === 'loans' ? `${ADMIN_API_URL}/loans` : `${API_URL}/savings`;

        if (!confirm(`Anda yakin ingin ${isApproved ? 'menyetujui' : 'menolak'} pengajuan ini?`)) return;

        try {
            const response = await apiFetch(`${endpoint}/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus }),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Gagal memperbarui status.');
            }
            alert('Status berhasil diperbarui.');
            loadPendingApprovals(type); // Muat ulang daftar
        } catch (error) {
            alert(`Terjadi kesalahan: ${error.message}`);
        }
    };

    // --- FUNGSI UNTUK PENGATURAN (SETTINGS) ---

    // Generic Modal Closer
    const allModals = document.querySelectorAll('.fixed.inset-0.z-50');
    allModals.forEach(modal => {
        const closeButton = modal.querySelector('[id^="close-"]');
        const cancelButton = modal.querySelector('[id^="cancel-"]');
        if (closeButton) closeButton.addEventListener('click', () => modal.classList.add('hidden'));
        if (cancelButton) cancelButton.addEventListener('click', () => modal.classList.add('hidden'));
    });

    const setupSimpleCrud = (config) => {
        const { modal, form, tableBody, addBtn, endpoint, title, fields, renderRow } = config;

        // Defensive check: If the required HTML elements for this CRUD don't exist, skip setup.
        if (!modal || !form || !tableBody) {
            return () => {}; // Return an empty function to prevent errors on call.
        }

        const idInput = form.querySelector('input[type="hidden"]');
        const modalTitle = modal.querySelector('[id$="-modal-title"]');
        const finalEndpoint = endpoint.startsWith('admin/') ? `${API_URL}/${endpoint}` : `${ADMIN_API_URL}/${endpoint}`;

        const loadData = async () => {
            try {
                const response = await apiFetch(`${API_URL}/${endpoint}`);
                const items = await response.json();
                tableBody.innerHTML = '';
                items.forEach(item => tableBody.insertAdjacentHTML('beforeend', renderRow(item, userRole)));
            } catch (error) {
                console.error(`Error loading ${title}:`, error);
                tableBody.innerHTML = `<tr><td colspan="${fields.length + 1}" class="text-center py-4 text-red-500">Gagal memuat data.</td></tr>`;
            }
        };

        addBtn?.addEventListener('click', () => {
            form.reset();
            idInput.value = '';
            modalTitle.textContent = `Tambah ${title} Baru`;
            if (config.onAdd) config.onAdd();
            modal.classList.remove('hidden');
        });

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = idInput.value;
            const body = {};
            fields.forEach(field => {
                body[field] = form.querySelector(`[id$="-${field.split('_')[0]}-input"]`)?.value || form.querySelector(`[id$="-${field}-select"]`)?.value;
            });

            const url = id ? `${finalEndpoint}/${id}` : `${finalEndpoint}`;
            const method = id ? 'PUT' : 'POST';

            try {
                const response = await apiFetch(url, { method, body: JSON.stringify(body) });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || `Gagal menyimpan ${title}.`);
                }
                modal.classList.add('hidden');
                loadData();
            } catch (error) { alert(error.message); }
        });

        tableBody?.addEventListener('click', async (e) => {
            const target = e.target;
            const id = target.dataset.id;

            if (target.classList.contains(`edit-${title.toLowerCase().replace(' ', '-')}-btn`)) {
                try {
                    const response = await apiFetch(`${API_URL}/${endpoint}/${id}`);
                    if (!response.ok) throw new Error(`Gagal mengambil data ${title}.`);
                    const item = await response.json();

                    idInput.value = item.id;
                    fields.forEach(field => {
                        const inputElement = form.querySelector(`[id$="-${field.split('_')[0]}-input"]`) || form.querySelector(`[id$="-${field}-select"]`);
                        if (inputElement) inputElement.value = item[field];
                    });
                    modalTitle.textContent = `Ubah ${title}`;
                    if (config.onEdit) config.onEdit(item);
                    modal.classList.remove('hidden');
                } catch (error) { alert(error.message); }
            }

            if (target.classList.contains(`delete-${title.toLowerCase().replace(' ', '-')}-btn`)) {
                if (confirm(`Anda yakin ingin menghapus ${title} ini?`)) {
                    try {
                        const response = await apiFetch(`${ADMIN_API_URL}/${endpoint}/${id}`, { method: 'DELETE' });
                        if (!response.ok) {
                            const err = await response.json();
                            throw new Error(err.error || `Gagal menghapus ${title}.`);
                        }
                        loadData();
                    } catch (error) { alert(error.message); }
                }
            }
        });
        return loadData;
    };

    // --- FUNGSI UNTUK KELOLA USER & ROLE ---
    const loadUsers = async () => {
        const tableBody = document.getElementById('users-table-body');
        if (!tableBody) return;
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4">Memuat...</td></tr>`;
        try {
            const response = await apiFetch(`${ADMIN_API_URL}/users`);
            if (!response.ok) throw new Error('Gagal memuat data pengguna.');
            const users = await response.json();

            tableBody.innerHTML = '';
            if (users.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4">Tidak ada pengguna ditemukan.</td></tr>`;
                return;
            }

            users.forEach(user => {
                const statusClass = user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
                const row = tableBody.insertRow();
                row.innerHTML = `
                    <td class="px-6 py-4 text-sm font-medium text-gray-900">${user.name}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${user.email}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${user.role}</td>
                    <td class="px-6 py-4 text-sm"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${user.status}</span></td>
                    <td class="px-6 py-4 text-sm font-medium">
                        <button class="edit-user-role-btn text-indigo-600 hover:text-indigo-900" data-id="${user.id}" data-name="${user.name}" data-role="${user.role}">Ubah Role</button>
                    </td>
                `;
            });
        } catch (error) {
            console.error('Error loading users:', error);
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">${error.message}</td></tr>`;
        }
    };

    const renderRolePermissions = async () => {
        const container = document.getElementById('role-permissions-container');
        if (!container) return;
        container.innerHTML = `<div class="col-span-full text-center py-8"><p class="text-gray-500">Memuat hak akses...</p></div>`;

        try {
            // 1. Dapatkan semua kemungkinan hak akses dari backend
            const permissionsResponse = await apiFetch(`${ADMIN_API_URL}/permissions`);
            if (!permissionsResponse.ok) throw new Error('Gagal memuat daftar hak akses.');
            const allPermissions = await permissionsResponse.json();

            // 2. Definisikan peran yang akan dikelola
            const rolesToManage = ['admin', 'manager', 'akunting'];

            // 3. Ambil dan render kartu untuk setiap peran
            const rolePromises = rolesToManage.map(async (role) => {
                const rolePermsResponse = await apiFetch(`${ADMIN_API_URL}/roles/${role}/permissions`);
                if (!rolePermsResponse.ok) throw new Error(`Gagal memuat hak akses untuk peran ${role}.`);
                const rolePerms = await rolePermsResponse.json();
                const userHasPermissionSet = new Set(rolePerms);

                // Tentukan apakah kartu ini dapat diedit
                const isEditable = userRole === 'admin' && role !== 'admin';

                const permissionsHTML = allPermissions.map(perm => {
                    const isChecked = userHasPermissionSet.has(perm.key);
                    return `
                        <label class="flex items-center space-x-3 ${isEditable ? 'cursor-pointer' : 'cursor-not-allowed'}">
                            <input type="checkbox" data-permission-key="${perm.key}" ${isChecked ? 'checked' : ''} ${!isEditable ? 'disabled' : ''} class="permission-checkbox rounded border-gray-300 text-red-600 shadow-sm focus:border-red-300 focus:ring focus:ring-offset-0 focus:ring-red-200 focus:ring-opacity-50">
                            <span class="text-gray-700">${perm.description}</span>
                        </label>
                    `;
                }).join('');

                const saveButtonHTML = isEditable ? `
                    <div class="px-4 py-3 bg-gray-50 text-right sm:px-6">
                        <button data-role="${role}" class="save-role-permissions-btn bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700">Simpan Perubahan</button>
                    </div>
                ` : '';

                return `
                    <div class="bg-white shadow overflow-hidden sm:rounded-lg">
                        <div class="px-4 py-5 sm:px-6">
                            <h3 class="text-lg leading-6 font-medium text-gray-900 capitalize">${role}</h3>
                            <p class="mt-1 max-w-2xl text-sm text-gray-500">${role === 'admin' ? 'Akses penuh ke sistem (tidak dapat diubah).' : `Hak akses untuk peran ${role}.`}</p>
                        </div>
                        <div class="border-t border-gray-200 px-4 py-5 sm:p-6">
                            <h4 class="text-md font-semibold text-gray-800 mb-4">Hak Akses:</h4>
                            <div class="space-y-4">${permissionsHTML}</div>
                        </div>
                        ${saveButtonHTML}
                    </div>
                `;
            });

            const cardsHTML = await Promise.all(rolePromises);
            container.innerHTML = cardsHTML.join('');

        } catch (error) {
            console.error('Error rendering role permissions:', error);
            container.innerHTML = `<div class="col-span-full text-center py-8"><p class="text-red-500">${error.message}</p></div>`;
        }
    };

    const userRoleModal = document.getElementById('user-role-modal');
    const userRoleForm = document.getElementById('user-role-form');

    userRoleForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = userRoleModal.querySelector('#user-role-id-input').value;
        const newRole = userRoleModal.querySelector('#user-role-select').value;

        try {
            const response = await apiFetch(`${ADMIN_API_URL}/users/${id}/role`, {
                method: 'PUT',
                body: JSON.stringify({ role: newRole }),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Gagal memperbarui role pengguna.');
            }
            alert('Role pengguna berhasil diperbarui.');
            userRoleModal.classList.add('hidden');
            loadUsers(); // Muat ulang daftar pengguna
        } catch (error) {
            alert(`Terjadi kesalahan: ${error.message}`);
        }
    });

    // 1. Kelola Perusahaan
    const loadEmployers = setupSimpleCrud({
        modal: document.getElementById('employer-modal'),
        form: document.getElementById('employer-form'),
        tableBody: document.getElementById('employers-table-body'),
        addBtn: document.getElementById('show-add-employer-form-btn'),
        endpoint: 'employers',
        title: 'Perusahaan',
        fields: ['name', 'address', 'phone', 'contract_number', 'document_url'],
        renderRow: (item, role) => `
            <tr>
                <td class="px-6 py-4 text-sm text-gray-900">${item.name}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${item.address || '-'}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${item.phone || '-'}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${item.contract_number || '-'}</td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    ${item.document_url ? `<a href="${item.document_url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">Lihat Dokumen</a>` : '-'}
                </td>
                <td class="px-6 py-4 text-sm font-medium space-x-2">
                    <button class="edit-perusahaan-btn text-indigo-600 hover:text-indigo-900" data-id="${item.id}">Ubah</button>
                    ${role === 'admin' ? `<button class="delete-perusahaan-btn text-red-600 hover:text-red-900" data-id="${item.id}">Hapus</button>` : ''}
                </td>
            </tr>`,
    });

    // 2. Kelola Jabatan
    const loadPositions = setupSimpleCrud({
        modal: document.getElementById('position-modal'),
        form: document.getElementById('position-form'),
        tableBody: document.getElementById('positions-table-body'),
        addBtn: document.getElementById('show-add-position-form-btn'),
        endpoint: 'positions',
        title: 'Jabatan',
        fields: ['name'],
        renderRow: (item, role) => `
            <tr>
                <td class="px-6 py-4 text-sm text-gray-900">${item.name}</td>
                <td class="px-6 py-4 text-sm font-medium space-x-2">
                    <button class="edit-jabatan-btn text-indigo-600 hover:text-indigo-900" data-id="${item.id}">Ubah</button>
                    ${role === 'admin' ? `<button class="delete-jabatan-btn text-red-600 hover:text-red-900" data-id="${item.id}">Hapus</button>` : ''}
                </td>
            </tr>`
    });

    // 3. Kelola Tipe Simpanan
    const loadSavingTypes = setupSimpleCrud({
        modal: document.getElementById('saving-type-modal'),
        form: document.getElementById('saving-type-form'),
        tableBody: document.getElementById('saving-types-table-body'),
        addBtn: document.getElementById('show-add-saving-type-form-btn'),
        endpoint: 'savingtypes',
        title: 'Tipe Simpanan',
        fields: ['name', 'description'],
        renderRow: (item, role) => `
            <tr>
                <td class="px-6 py-4 text-sm text-gray-900">${item.name}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${item.description || '-'}</td>
                <td class="px-6 py-4 text-sm font-medium space-x-2">
                    <button class="edit-tipe-simpanan-btn text-indigo-600 hover:text-indigo-900" data-id="${item.id}">Ubah</button>
                    ${role === 'admin' ? `<button class="delete-tipe-simpanan-btn text-red-600 hover:text-red-900" data-id="${item.id}">Hapus</button>` : ''}
                </td>
            </tr>`
    });

    // 4. Kelola Tipe Pinjaman
    const loadLoanTypes = setupSimpleCrud({
        modal: document.getElementById('loan-type-modal'),
        form: document.getElementById('loan-type-form'),
        tableBody: document.getElementById('loan-types-table-body'),
        addBtn: document.getElementById('show-add-loan-type-form-btn'),
        endpoint: 'loantypes',
        title: 'Tipe Pinjaman',
        fields: ['name', 'description'],
        renderRow: (item, role) => `
            <tr>
                <td class="px-6 py-4 text-sm text-gray-900">${item.name}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${item.description || '-'}</td>
                <td class="px-6 py-4 text-sm font-medium space-x-2">
                    <button class="edit-tipe-pinjaman-btn text-indigo-600 hover:text-indigo-900" data-id="${item.id}">Ubah</button>
                    ${role === 'admin' ? `<button class="delete-tipe-pinjaman-btn text-red-600 hover:text-red-900" data-id="${item.id}">Hapus</button>` : ''}
                </td>
            </tr>`
    });

    // 5. Kelola Tenor & Bunga
    const loadLoanTerms = setupSimpleCrud({
        modal: document.getElementById('loan-term-modal'),
        form: document.getElementById('loan-term-form'),
        tableBody: document.getElementById('loan-terms-table-body'),
        addBtn: document.getElementById('show-add-loan-term-form-btn'),
        endpoint: 'loanterms',
        title: 'Tenor Pinjaman',
        fields: ['loan_type_id', 'tenor_months', 'interest_rate'],
        onAdd: () => {
            populateDropdown(document.getElementById('loan-term-loantype-select'), 'loantypes', 'id', 'name', 'Tipe Pinjaman');
        },
        onEdit: (item) => {
            const select = document.getElementById('loan-term-loantype-select');
            populateDropdown(select, 'loantypes', 'id', 'name', 'Tipe Pinjaman').then(() => {
                select.value = item.loan_type_id;
            });
        },
        renderRow: (item, role) => `
            <tr>
                <td class="px-6 py-4 text-sm text-gray-900">${item.loan_type_name}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${item.tenor_months} bulan</td>
                <td class="px-6 py-4 text-sm text-gray-500">${item.interest_rate}%</td>
                <td class="px-6 py-4 text-sm font-medium space-x-2">
                    <button class="edit-tenor-pinjaman-btn text-indigo-600 hover:text-indigo-900" data-id="${item.id}">Ubah</button>
                    ${role === 'admin' ? `<button class="delete-tenor-pinjaman-btn text-red-600 hover:text-red-900" data-id="${item.id}">Hapus</button>` : ''}
                </td>
            </tr>`
    });

    // 6. Kelola Akun (Chart of Accounts)
    const loadAccounts = setupSimpleCrud({
        modal: document.getElementById('account-modal'),
        form: document.getElementById('account-form'),
        tableBody: document.getElementById('accounts-table-body'),
        addBtn: document.getElementById('show-add-account-form-btn'),
        endpoint: 'accounts',
        title: 'Akun',
        fields: ['account_number', 'account_name', 'account_type', 'parent_id'],
        onAdd: () => {
            populateDropdown(document.getElementById('parent-account-select'), 'accounts', 'id', 'account_name', 'Akun Induk (Opsional)');
        },
        onEdit: (item) => {
            const select = document.getElementById('parent-account-select');
            populateDropdown(select, 'accounts', 'id', 'account_name', 'Akun Induk (Opsional)').then(() => {
                select.value = item.parent_id;
            });
        },
        renderRow: (item, role) => `
            <tr>
                <td class="px-6 py-4 text-sm text-gray-900">${item.account_number}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${item.account_name}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${item.account_type}</td>
                <td class="px-6 py-4 text-sm font-medium space-x-2">
                    <button class="edit-akun-btn text-indigo-600 hover:text-indigo-900" data-id="${item.id}">Ubah</button>
                    ${role === 'admin' ? `<button class="delete-akun-btn text-red-600 hover:text-red-900" data-id="${item.id}">Hapus</button>` : ''}
                </td>
            </tr>`
    });

    // --- EVENT LISTENER UNTUK SIMPAN HAK AKSES ROLE ---
    document.getElementById('role-permissions-container')?.addEventListener('click', async (e) => {
        if (!e.target.matches('.save-role-permissions-btn')) return;

        const button = e.target;
        const role = button.dataset.role;
        const card = button.closest('.bg-white.shadow');
        
        const checkedPermissions = Array.from(card.querySelectorAll('.permission-checkbox:checked'))
                                        .map(checkbox => checkbox.dataset.permissionKey);

        button.disabled = true;
        button.textContent = 'Menyimpan...';

        try {
            const response = await apiFetch(`${ADMIN_API_URL}/roles/${role}/permissions`, {
                method: 'PUT',
                body: JSON.stringify({ permissions: checkedPermissions })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Gagal menyimpan hak akses.');
            }

            alert(`Hak akses untuk peran "${role}" berhasil diperbarui. Perubahan akan aktif pada sesi login berikutnya.`);
        } catch (error) {
            alert(`Terjadi kesalahan: ${error.message}`);
        } finally {
            button.disabled = false;
            button.textContent = 'Simpan Perubahan';
        }
    });

    // --- FUNGSI UNTUK UNDUH TEMPLATE SIMPANAN ---
    const handleDownloadSavingsTemplate = () => {
        const downloadBtn = document.getElementById('download-savings-template-btn');
        if (!downloadBtn) return;

        downloadBtn.addEventListener('click', async () => {
            const originalText = downloadBtn.textContent;
            downloadBtn.textContent = 'Memproses...';
            downloadBtn.disabled = true;

            try {
                // We fetch a file, so we don't use the standard apiFetch that expects JSON
                const token = localStorage.getItem('token');
                const response = await fetch(`${ADMIN_API_URL}/savings/export-template`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => null);
                    throw new Error(errorData?.error || `Gagal mengunduh template. Status: ${response.status}`);
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'template_simpanan_anggota.xlsx'; 
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            } catch (error) {
                alert(`Terjadi kesalahan: ${error.message}`);
            } finally {
                downloadBtn.textContent = originalText;
                downloadBtn.disabled = false;
            }
        });
    };

    // --- FUNGSI UNTUK UNGGAH SIMPANAN BULK ---
    const handleBulkSavingsUpload = () => {
        const form = document.getElementById('bulk-savings-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('bulk-savings-file');
            const feedbackEl = document.getElementById('bulk-savings-feedback');
            const submitBtn = form.querySelector('button[type="submit"]');

            if (!fileInput.files || fileInput.files.length === 0) {
                alert('Silakan pilih file Excel untuk diunggah.');
                return;
            }

            const file = fileInput.files[0];
            const formData = new FormData();
            formData.append('savingsFile', file); // Key 'savingsFile' harus cocok dengan di backend (multer)

            submitBtn.disabled = true;
            submitBtn.textContent = 'Mengunggah...';
            feedbackEl.classList.add('hidden');

            try {
                const response = await apiFetch(`${ADMIN_API_URL}/savings/bulk-upload`, {
                    method: 'POST',
                    body: formData,
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Terjadi kesalahan saat mengunggah file.');

                feedbackEl.textContent = result.message || 'File berhasil diunggah dan diproses.';
                feedbackEl.className = 'p-3 rounded-md text-sm bg-green-100 text-green-800';
                feedbackEl.classList.remove('hidden');
                form.reset();
            } catch (error) {
                feedbackEl.textContent = `Error: ${error.message}`;
                feedbackEl.className = 'p-3 rounded-md text-sm bg-red-100 text-red-800';
                feedbackEl.classList.remove('hidden');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Unggah dan Proses';
            }
        });
    };

    // --- FUNGSI UNTUK KELOLA TOKO (USAHA KOPERASI) ---
    const loadShopProducts = async (shopType) => {
        const tableBody = document.getElementById(`toko-${shopType}-table-body`);
        if (!tableBody) return;

        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">Memuat produk...</td></tr>`;

        try {
            // Menggunakan endpoint admin untuk mengambil produk
            const response = await apiFetch(`${ADMIN_API_URL}/products?shop=${shopType}`);
            if (!response.ok) throw new Error(`Gagal memuat produk untuk ${shopType}`);
            const products = await response.json();

            tableBody.innerHTML = '';
            if (products.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">Belum ada produk. Klik "Tambah Produk Baru" untuk memulai.</td></tr>`;
                return;
            }

            products.forEach(product => {
                const row = tableBody.insertRow();
                let imageUrl = 'https://placehold.co/100x100?text=No+Image';
                if (product.image_url) {
                    // Check if it's an external URL or a local path
                    imageUrl = product.image_url.startsWith('http') 
                        ? product.image_url 
                        : `${API_URL.replace('/api', '')}${product.image_url}`;
                }
                row.innerHTML = `
                    <td class="px-6 py-4"><img src="${imageUrl}" alt="${product.name}" class="h-12 w-12 object-cover rounded"></td>
                    <td class="px-6 py-4 text-sm font-medium text-gray-900">${product.name}</td>
                    <td class="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title="${product.description}">${product.description || '-'}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${formatCurrency(product.price)}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${product.stock}</td>
                    <td class="px-6 py-4 text-sm font-medium space-x-2">
                        <button class="edit-product-btn text-indigo-600 hover:text-indigo-900" data-id="${product.id}" data-shop-type="${shopType}">Ubah</button>
                        <button class="delete-product-btn text-red-600 hover:text-red-900" data-id="${product.id}" data-shop-type="${shopType}">Hapus</button>
                    </td>
                `;
            });

        } catch (error) {
            console.error(`Error loading ${shopType} products:`, error);
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-red-500">${error.message}</td></tr>`;
        }
    };

    // --- FUNGSI UNTUK MODAL PRODUK ---
    const productModal = document.getElementById('product-modal');
    const productForm = document.getElementById('product-form');
    const productModalTitle = document.getElementById('product-modal-title');

    const imagePreview = document.getElementById('product-image-preview');
    const currentImageUrlInput = document.getElementById('product-current-image-url');
    const showProductModal = (product = null, shopType) => {
        if (!productModal) return;
        productForm.reset();
        document.getElementById('product-id-input').value = '';
        document.getElementById('product-shop-type-input').value = shopType;

        if (product) {
            // Mode Ubah
            productModalTitle.textContent = 'Ubah Produk';
            document.getElementById('product-id-input').value = product.id;
            document.getElementById('product-name-input').value = product.name;
            document.getElementById('product-description-input').value = product.description;
            document.getElementById('product-price-input').value = product.price;
            document.getElementById('product-stock-input').value = product.stock;
            // Tampilkan gambar yang sudah ada
            if (product.image_url) {
                imagePreview.src = product.image_url.startsWith('http')
                    ? product.image_url
                    : `${API_URL.replace('/api', '')}${product.image_url}`;
            } else {
                imagePreview.src = 'https://placehold.co/100x100?text=No+Image';
            }
            currentImageUrlInput.value = product.image_url || '';
        } else {
            // Mode Tambah
            productModalTitle.textContent = 'Tambah Produk Baru';
            imagePreview.src = 'https://placehold.co/100x100?text=No+Image';
            currentImageUrlInput.value = '';
        }
        productModal.classList.remove('hidden');
    };

    if (productModal) {
        document.getElementById('close-product-modal').addEventListener('click', () => productModal.classList.add('hidden'));
        document.getElementById('cancel-product-modal').addEventListener('click', () => productModal.classList.add('hidden'));

        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('product-id-input').value;
            const shopType = document.getElementById('product-shop-type-input').value;

            const formData = new FormData();
            formData.append('name', document.getElementById('product-name-input').value);
            formData.append('description', document.getElementById('product-description-input').value);
            formData.append('price', parseFloat(document.getElementById('product-price-input').value));
            formData.append('stock', parseInt(document.getElementById('product-stock-input').value, 10));
            formData.append('shop_type', shopType);

            const imageInput = document.getElementById('product-image-input');
            if (imageInput.files[0]) {
                formData.append('productImage', imageInput.files[0]);
            }

            const url = id ? `${ADMIN_API_URL}/products/${id}` : `${ADMIN_API_URL}/products`;
            const method = id ? 'PUT' : 'POST';

            try {
                const response = await apiFetch(url, {
                    method,
                    body: formData,
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || `Gagal menyimpan produk.`);
                }

                alert(`Produk berhasil ${id ? 'diperbarui' : 'ditambahkan'}.`);
                productModal.classList.add('hidden');
                loadShopProducts(shopType); // Muat ulang daftar produk

            } catch (error) {
                alert(`Terjadi kesalahan: ${error.message}`);
                console.error('Error saving product:', error);
            }
        });

        // Event listener untuk pratinjau gambar
        document.getElementById('product-image-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    imagePreview.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Event listener untuk semua tombol "Tambah Produk Baru"
    document.querySelectorAll('.add-product-btn').forEach(button => {
        button.addEventListener('click', () => {
            const shopType = button.dataset.shopType;
            showProductModal(null, shopType);
        });
    });

    // --- FUNGSI UNTUK KELOLA TOKO (USAHA KOPERASI) ---
    // This function is defined earlier in the file. This is a duplicate.

    // Event delegation for product actions
    document.querySelector('main').addEventListener('click', async (e) => {
        const button = e.target;
        const { id, shopType } = button.dataset;

        if (button.matches('.edit-product-btn')) {
            const response = await apiFetch(`${ADMIN_API_URL}/products/${id}`);
            if (!response.ok) return alert('Gagal memuat data produk untuk diubah.');
            const product = await response.json();
            showProductModal(product, shopType);
        }

        if (button.matches('.delete-product-btn')) {
            if (confirm('Anda yakin ingin menghapus produk ini?')) {
                try {
                    const response = await apiFetch(`${ADMIN_API_URL}/products/${id}`, { method: 'DELETE' });
                    if (!response.ok) {
                        const err = await response.json();
                        throw new Error(err.error || 'Gagal menghapus produk.');
                    }
                    alert('Produk berhasil dihapus.');
                    loadShopProducts(shopType);
                } catch (error) {
                    alert(`Terjadi kesalahan: ${error.message}`);
                }
            }
        }
    });

    // --- FUNGSI UNTUK NAVIGASI KONTEN UTAMA ---
    const switchContent = (targetId) => {
        contentSections.forEach(section => {
            section.classList.remove('active');
        });

        // Tampilkan konten yang dituju
        const targetSection = document.getElementById(`${targetId}-content`);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        const pageTitle = document.querySelector(`.sidebar-link[data-target="${targetId}"] span`)?.textContent || 'Beranda';
        document.getElementById('page-title').textContent = pageTitle;

        // Panggil fungsi load data yang sesuai
        if (targetId === 'dashboard') loadDashboardData();
        if (targetId === 'members') loadMembers();
        if (targetId === 'savings') loadSavings();
        if (targetId === 'loans') loadLoans();
        if (targetId === 'approvals') {
            renderPendingMembers();
            loadPendingApprovals('savings');
            loadPendingApprovals('loans');
        }
        if (targetId === 'manage-users-roles') {
            loadUsers();
            renderRolePermissions();
        }

        if (targetId === 'accounting' || targetId === 'bulk-savings-input') {
            // Tidak ada data yang perlu dimuat saat halaman menu atau form ditampilkan
        }

        // Load data for settings pages
        if (targetId.startsWith('manage-')) {
            const loadFunction = { 'manage-employers': loadEmployers, 'manage-positions': loadPositions, 'manage-saving-types': loadSavingTypes, 'manage-loan-types': loadLoanTypes, 'manage-loan-terms': loadLoanTerms, 'manage-accounts': loadAccounts }[targetId];
            if (loadFunction) loadFunction();
        }

        // Load data for shop pages
        if (targetId.startsWith('toko-')) {
            const shopType = targetId.replace('toko-', '');
            loadShopProducts(shopType);
        }

        // Perbarui status 'active' pada link sidebar dan tombol menu
        sidebarLinks.forEach(link => {
            link.classList.remove('active');
        });
        const directLink = document.querySelector(`.sidebar-link[data-target="${targetId}"]`);
        
        // Activate the direct link if it exists
        if (directLink) {
            directLink.classList.add('active');
        }

        // Handle parent menu activation
        let parentMenuButton = null;
        if (targetId.startsWith('manage-')) {
            // For settings sub-pages
            parentMenuButton = document.querySelector('.sidebar-link[data-target="settings"]');
        } else if (targetId.startsWith('bulk-')) {
            // For accounting sub-pages
            parentMenuButton = document.querySelector('.sidebar-link[data-target="accounting"]');
        } else if (['toko-sembako', 'toko-elektronik', 'toko-aplikasi'].includes(targetId)) {
            // For Usaha Koperasi sub-pages
            parentMenuButton = document.getElementById('usaha-koperasi-menu-button');
            
            // Also expand the menu if it's not open when navigating to a child
            const submenu = document.getElementById('usaha-koperasi-submenu');
            const arrow = document.getElementById('usaha-koperasi-arrow');
            if (submenu && submenu.classList.contains('hidden')) {
                submenu.classList.remove('hidden');
                if(arrow) arrow.classList.add('rotate-180');
            }
        }

        if(parentMenuButton) {
            parentMenuButton.classList.add('active');
        }
    };

    document.querySelector('.back-to-settings-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchContent('settings');
    });
    document.querySelector('.back-to-accounting-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchContent('accounting');
    });
    allLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.dataset.target;
            if (targetId) {
                switchContent(targetId);
                // Tutup sidebar di mode mobile setelah navigasi
                if (window.innerWidth < 768 && sidebar && !sidebar.classList.contains('-translate-x-full')) {
                    toggleMenu();
                }
            }
        });
    });

    // --- FUNGSI UNTUK TAB DI HALAMAN PERSETUJUAN ---
    approvalTabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.dataset.target;

            approvalTabBtns.forEach(b => b.classList.remove('border-red-500', 'text-red-600'));
            approvalTabBtns.forEach(b => b.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300'));
            btn.classList.add('border-red-500', 'text-red-600');
            btn.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');

            approvalTabContents.forEach(content => content.classList.toggle('hidden', content.id !== targetId));
        });
    });

    // --- FUNGSI UNTUK TAB DI HALAMAN USER & ROLE ---
    const userRoleTabBtns = document.querySelectorAll('.user-role-tab-btn');
    const userRoleTabContents = document.querySelectorAll('.user-role-tab-content');
    userRoleTabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.dataset.target;
            userRoleTabBtns.forEach(b => b.classList.remove('border-red-500', 'text-red-600'));
            userRoleTabBtns.forEach(b => b.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300'));
            btn.classList.add('border-red-500', 'text-red-600');
            btn.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            userRoleTabContents.forEach(content => content.classList.toggle('hidden', content.id !== targetId));
        });
    });

    document.getElementById('users-table-body')?.addEventListener('click', (e) => {
        if (!e.target.matches('.edit-user-role-btn')) return;
        const { id, name, role } = e.target.dataset;
        userRoleModal.querySelector('#user-role-id-input').value = id;
        userRoleModal.querySelector('#user-role-name-text').textContent = name;
        userRoleModal.querySelector('#user-role-select').value = role;
        userRoleModal.classList.remove('hidden');
    });

    // Tambahkan event listener untuk tombol persetujuan simpanan dan pinjaman
    document.getElementById('pending-savings-table-body')?.addEventListener('click', handleGenericApproval);
    document.getElementById('pending-loans-table-body')?.addEventListener('click', handleGenericApproval);

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Anda yakin ingin keluar?')) {
                localStorage.clear();
                window.location.href = 'login.html';
            }
        });
    }

    // Tambahkan penutup untuk modal user-role
    document.getElementById('close-user-role-modal')?.addEventListener('click', () => userRoleModal.classList.add('hidden'));
    document.getElementById('cancel-user-role-modal')?.addEventListener('click', () => userRoleModal.classList.add('hidden'));

    // --- EVENT LISTENERS UNTUK FILTER SIMPANAN ---
    const savingsFilterForm = document.getElementById('savings-filter-form');
    if (savingsFilterForm) {
        const savingTypeSelect = document.getElementById('savings-filter-type');
        populateDropdown(savingTypeSelect, 'savingtypes', 'id', 'name', 'Semua Tipe');

        savingsFilterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            currentSavingsFilters = {
                search: document.getElementById('savings-filter-search').value,
                savingTypeId: document.getElementById('savings-filter-type').value,
                status: document.getElementById('savings-filter-status').value,
                startDate: document.getElementById('savings-filter-start-date').value,
                endDate: document.getElementById('savings-filter-end-date').value,
            };
            // Hapus filter kosong
            Object.keys(currentSavingsFilters).forEach(key => !currentSavingsFilters[key] && delete currentSavingsFilters[key]);
            loadSavings(1);
        });
        document.getElementById('savings-filter-reset-btn').addEventListener('click', () => {
            savingsFilterForm.reset();
            currentSavingsFilters = {};
            loadSavings(1);
        });
    }

    // --- INISIALISASI ---
    checkAdminAuth();
    handleBulkSavingsUpload();
    handleDownloadSavingsTemplate();

    // Sembunyikan menu berdasarkan peran
    if (!['admin', 'akunting'].includes(userRole)) {
        // Hanya admin & akunting yang bisa lihat menu Akunting
        document.querySelector('.sidebar-link[data-target="accounting"]')?.remove();
    }
    if (userRole !== 'admin') {
        // Hanya admin yang bisa lihat menu Pengaturan
        document.querySelector('.sidebar-link[data-target="settings"]')?.parentElement.remove();
    }


    // Muat konten awal
    switchContent('dashboard');
});
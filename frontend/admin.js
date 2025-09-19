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
                option.textContent = item[textKey];
                selectElement.appendChild(option);
            });
        } catch (error) {
            console.error(error);
            selectElement.innerHTML = `<option value="">Gagal memuat data</option>`;
        }
    };


    // --- FUNGSI UNTUK MENU MOBILE ---
    const toggleMenu = () => {
        sidebar.classList.toggle('-translate-x-full');
        sidebarOverlay.classList.toggle('hidden');
    };
    if (menuButton) menuButton.addEventListener('click', toggleMenu);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleMenu);

    // --- FUNGSI UNTUK DASHBOARD ---
    const loadDashboardData = async () => {
        try {
            // Endpoint ini perlu dibuat di backend untuk menyediakan statistik
            const response = await apiFetch(`${ADMIN_API_URL}/stats`);
            if (!response.ok) throw new Error('Gagal memuat statistik.');
            const stats = await response.json();

            document.getElementById('total-members').textContent = stats.totalMembers || 0;
            document.getElementById('total-savings').textContent = formatCurrency(stats.totalSavings);
            document.getElementById('total-loans').textContent = formatCurrency(stats.totalActiveLoans);
            document.getElementById('pending-members-count').textContent = stats.pendingMembers || 0;
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            // Biarkan nilai default jika terjadi error
        }
    };

    // --- FUNGSI UNTUK ANGGOTA ---
    const loadMembers = async (filters = {}) => {
        const tableBody = document.getElementById('members-table-body');
        if (!tableBody) return;
        try {
            // Hanya ambil anggota yang sudah aktif
            filters.status = 'Active';
            const queryParams = new URLSearchParams(filters).toString();
            
            const response = await apiFetch(`${API_URL}/members?${queryParams}`);
            if (!response.ok) throw new Error('Gagal memuat data anggota.');
            const members = await response.json();

            // Saring daftar untuk hanya menampilkan pengguna dengan peran 'member'
            const memberOnlyList = members.filter(user => user.role === 'member');

            tableBody.innerHTML = '';
            if (memberOnlyList.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-gray-500">Belum ada anggota aktif.</td></tr>`;
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
            const filters = {
                search: document.getElementById('members-filter-search').value,
                companyId: document.getElementById('members-filter-company').value,
            };
            Object.keys(filters).forEach(key => !filters[key] && delete filters[key]);
            loadMembers(filters);
        });

        document.getElementById('members-filter-reset-btn').addEventListener('click', () => {
            membersFilterForm.reset();
            loadMembers();
        });
    }

    // --- FUNGSI UNTUK SIMPANAN ---
    const loadSavings = async (filters = {}) => {
    const tableBody = document.getElementById('savings-table-body');
    if (!tableBody) return;
    try {
        const queryParams = new URLSearchParams(filters).toString();
        const response = await apiFetch(`${API_URL}/savings?${queryParams}`);
        if (!response.ok) throw new Error('Gagal memuat data simpanan.');
        const savings = await response.json();

        tableBody.innerHTML = '';
        if (savings.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-gray-500">Tidak ada data simpanan ditemukan.</td></tr>`;
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
                    ${userRole === 'admin' ? `<button class="edit-saving-btn text-indigo-600 hover:text-indigo-900" data-id="${saving.id}">Ubah</button>` : ''}
                    ${userRole === 'admin' ? `<button class="delete-saving-btn text-red-600 hover:text-red-900" data-id="${saving.id}">Hapus</button>` : ''}
                </td>
            `;
        });

    } catch (error) {
        console.error('Error loading savings:', error);
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-red-500">${error.message}</td></tr>`;
    }
};

    // --- FUNGSI UNTUK PINJAMAN ---
    const loadLoans = async () => {
        const tableBody = document.getElementById('loans-table-body');
        if (!tableBody) return;
        try {
            // Diasumsikan endpoint /api/loans sudah ada dan melakukan join yang diperlukan
            const response = await apiFetch(`${API_URL}/loans`);
            if (!response.ok) throw new Error('Gagal memuat data pinjaman.');
            const loans = await response.json();

            tableBody.innerHTML = '';
            if (loans.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-gray-500">Tidak ada data pinjaman.</td></tr>`;
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
                    <td class="px-6 py-4 text-sm font-medium space-x-2">
                        <button class="details-loan-btn text-indigo-600 hover:text-indigo-900" data-id="${loan.id}">Detail</button>
                    </td>
                `;
            });
        } catch (error) {
            console.error('Error loading loans:', error);
            tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-red-500">${error.message}</td></tr>`;
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
            const pendingMembers = await response.json();
            
            pendingMembersTableBody.innerHTML = ''; // Kosongkan tabel

            if (pendingMembers.length === 0) {
                pendingMembersTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">Tidak ada pendaftaran baru.</td></tr>`;
                return;
            }

            pendingMembers.forEach(member => {
                const row = document.createElement('tr');
                // Asumsikan backend mengembalikan 'company_name' dan 'registration_date'
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${member.name}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${member.employee_id}</td>
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
            pendingMembersTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">${error.message}</td></tr>`;
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

        try {
            const response = await apiFetch(url);
            if (!response.ok) throw new Error(`Gagal memuat data ${type} menunggu persetujuan.`);
            const items = await response.json();
            tableBody.innerHTML = '';
            if (items.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">Tidak ada pengajuan baru.</td></tr>`;
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
                    <td class="px-6 py-4 text-sm text-gray-500">${formatCurrency(item.amount)}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${formatDate(item.date)}</td>
                    ${isLoan ? `<td class="px-6 py-4 text-sm text-gray-500">${item.status}</td>` : ''}
                    <td class="px-6 py-4 text-sm font-medium space-x-2">${actionButtons}</td>
                `;
            });
        } catch (error) {
            console.error(`Error loading pending ${type}:`, error);
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">${error.message}</td></tr>`;
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
        fields: ['name', 'address', 'phone'],
        renderRow: (item, role) => `
            <tr>
                <td class="px-6 py-4 text-sm text-gray-900">${item.name}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${item.address || '-'}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${item.phone || '-'}</td>
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

        // Perbarui status 'active' pada link sidebar
        sidebarLinks.forEach(link => {
            link.classList.remove('active');
        });

        // Jika target ada di dalam 'Pengaturan' atau 'Akunting', tandai juga menu utamanya sebagai aktif
        const parentLink = document.querySelector(`.sidebar-link[data-target="${targetId.split('-')[0]}"]`);
        if (parentLink) {
            parentLink.classList.add('active');
        }
        const directLink = document.querySelector(`.sidebar-link[data-target="${targetId}"]`);
        if (directLink) {
            directLink.classList.add('active');
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
        savingsFilterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const filters = {
                status: document.getElementById('savings-filter-status').value,
                startDate: document.getElementById('savings-filter-start-date').value,
                endDate: document.getElementById('savings-filter-end-date').value,
                search: document.getElementById('savings-filter-search').value,
            };
            // Hapus filter kosong
            Object.keys(filters).forEach(key => !filters[key] && delete filters[key]);
            loadSavings(filters);
        });

        document.getElementById('savings-filter-reset-btn').addEventListener('click', () => {
            savingsFilterForm.reset();
            loadSavings();
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
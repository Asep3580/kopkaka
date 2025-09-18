document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL ELEMENTS & CONFIG ---
    const API_URL = 'http://localhost:3000/api'; // Ganti jika perlu
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const quickLinkBtns = document.querySelectorAll('.quick-link-btn');
    const contentSections = document.querySelectorAll('.content-section');
    const logoutButton = document.getElementById('logout-button');
    const menuButton = document.getElementById('menu-button');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    // --- UTILITY FUNCTIONS ---
    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined) return 'Rp 0';
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const getToken = () => {
        return localStorage.getItem('token');
    };

    // --- AUTHENTICATION ---
    const checkAuth = () => {
        const token = getToken();
        if (!token) {
            alert('Sesi Anda telah berakhir. Silakan masuk kembali.');
            window.location.href = 'login.html';
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('member_name');
        window.location.href = 'index.html';
    };

    // --- NAVIGATION ---
    const switchContent = (targetId) => {
        contentSections.forEach(section => section.classList.remove('active'));
        sidebarLinks.forEach(link => link.classList.remove('active'));

        const targetSection = document.getElementById(`${targetId}-content`);
        const targetLink = document.querySelector(`.sidebar-link[data-target="${targetId}"]`);

        if (targetSection) targetSection.classList.add('active');
        if (targetLink) targetLink.classList.add('active');

        // Load data for the new section
        loadSectionData(targetId);
    };

    const loadSectionData = (targetId) => {
        switch (targetId) {
            case 'dashboard':
                loadDashboardData();
                break;
            case 'profile':
                loadProfileData();
                break;
            case 'savings':
                loadSavingsData();
                break;
            case 'loans':
                loadLoansData();
                break;
            case 'application':
                loadApplicationData();
                break;
        }
    };

    // --- DATA LOADING FUNCTIONS ---
    const fetchData = async (endpoint, options = {}) => {
        const token = getToken();
        const defaultOptions = {
            headers: { 
                'Authorization': `Bearer ${token}`,
            }
        };

        if (options.body && typeof options.body === 'object') {
            options.body = JSON.stringify(options.body);
            defaultOptions.headers['Content-Type'] = 'application/json';
        }

        const finalOptions = { ...defaultOptions, ...options, headers: {...defaultOptions.headers, ...options.headers} };
        
        const response = await fetch(`${API_URL}${endpoint}`, finalOptions);

        if (response.status === 401 || response.status === 403) {
            logout();
            throw new Error('Sesi tidak valid atau telah berakhir.');
        }

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error || `Gagal memproses permintaan ke ${endpoint}`);
        }
        return responseData;
    };

    const loadDashboardData = async () => {
        try {
            const stats = await fetchData('/member/stats'); // Endpoint perlu dibuat di backend
            document.getElementById('total-savings').textContent = formatCurrency(stats.totalSavings);
            document.getElementById('active-loan').textContent = formatCurrency(stats.activeLoan);
            document.getElementById('last-shu').textContent = formatCurrency(stats.lastSHU);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    };

    const loadProfileData = async () => {
        try {
            const profile = await fetchData('/member/profile'); // Endpoint perlu dibuat
            const profileDetails = document.getElementById('profile-details');
            const heirDetails = document.getElementById('heir-details');

            const renderDetail = (label, value) => `<div class="sm:col-span-1"><dt class="text-sm font-medium text-gray-500">${label}</dt><dd class="mt-1 text-sm text-gray-900">${value || '-'}</dd></div>`;
            
            profileDetails.innerHTML = `
                <dl class="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                    ${renderDetail('Nama Lengkap', profile.name)}
                    ${renderDetail('Email', profile.email)}
                    ${renderDetail('NIK Karyawan', profile.employee_id)}
                    ${renderDetail('Nomor KTP', profile.ktp_number)}
                    ${renderDetail('Perusahaan', profile.company_name)}
                    ${renderDetail('Jabatan', profile.position_name)}
                    ${renderDetail('Tanggal Bergabung', formatDate(profile.approval_date))}
                    ${renderDetail('Alamat', [profile.address_detail, profile.address_village, profile.address_district, profile.address_city, profile.address_province].filter(Boolean).join(', '))}
                </dl>
            `;

            heirDetails.innerHTML = `
                <dl class="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                    ${renderDetail('Nama Ahli Waris', profile.heir_name)}
                    ${renderDetail('Hubungan Keluarga', profile.heir_relationship)}
                    ${renderDetail('Nomor Kartu Keluarga', profile.heir_kk_number)}
                    ${renderDetail('No. Telepon Ahli Waris', profile.heir_phone)}
                </dl>
            `;

        } catch (error) {
            console.error('Error loading profile data:', error);
            document.getElementById('profile-details').innerHTML = `<p class="text-red-500">Gagal memuat data profil.</p>`;
        }
    };

    const loadSavingsData = async () => {
        const tableBody = document.getElementById('savings-table-body');
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">Memuat...</td></tr>`;
        try {
            const savings = await fetchData('/member/savings'); // Endpoint perlu dibuat
            let totalSavings = 0;
            
            if (savings.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">Belum ada riwayat simpanan.</td></tr>`;
                return;
            }

            tableBody.innerHTML = '';
            savings.forEach(saving => {
                if (saving.status === 'Approved') {
                    totalSavings += parseFloat(saving.amount);
                }
                const statusClass = saving.status === 'Approved' ? 'bg-green-100 text-green-800' : (saving.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800');
                const row = tableBody.insertRow();
                row.innerHTML = `
                    <td class="px-6 py-4 text-sm text-gray-500">${formatDate(saving.date)}</td>
                    <td class="px-6 py-4 text-sm text-gray-900">${saving.savingTypeName}</td>
                    <td class="px-6 py-4 text-sm text-gray-500 text-right">${formatCurrency(saving.amount)}</td>
                    <td class="px-6 py-4 text-sm"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${saving.status}</span></td>
                    <td class="px-6 py-4 text-sm text-gray-500">${saving.description || '-'}</td>
                `;
            });
            document.getElementById('savings-total-summary').textContent = formatCurrency(totalSavings);
        } catch (error) {
            console.error('Error loading savings data:', error);
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">Gagal memuat data.</td></tr>`;
        }
    };

    const loadLoansData = async () => {
        const tableBody = document.getElementById('loans-table-body');
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">Memuat...</td></tr>`;
        try {
            const loans = await fetchData('/member/loans'); // Endpoint perlu dibuat
            if (loans.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">Belum ada riwayat pinjaman.</td></tr>`;
                return;
            }
            tableBody.innerHTML = '';
            loans.forEach(loan => {
                const statusClass = loan.status === 'Lunas' ? 'bg-blue-100 text-blue-800' : (loan.status === 'Approved' ? 'bg-green-100 text-green-800' : (loan.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'));
                const row = tableBody.insertRow();
                row.innerHTML = `
                    <td class="px-6 py-4 text-sm text-gray-500">${formatDate(loan.date)}</td>
                    <td class="px-6 py-4 text-sm text-gray-900 text-right">${formatCurrency(loan.amount)}</td>
                    <td class="px-6 py-4 text-sm text-gray-500 text-center">${loan.tenorMonths} bulan</td>
                    <td class="px-6 py-4 text-sm text-gray-500 text-right">${formatCurrency(loan.remainingPrincipal)}</td>
                    <td class="px-6 py-4 text-sm"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${loan.status}</span></td>
                    <td class="px-6 py-4 text-sm font-medium">
                        <button class="view-loan-details-btn text-indigo-600 hover:text-indigo-900" data-id="${loan.id}">Lihat Detail</button>
                    </td>
                `;
            });
        } catch (error) {
            console.error('Error loading loans data:', error);
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-red-500">Gagal memuat data.</td></tr>`;
        }
    };

    const loadApplicationData = async () => {
        const loanTermSelect = document.getElementById('loan-term-id');
        const applicationsTableBody = document.getElementById('applications-table-body');
        try {
            // Load loan terms for dropdown
            const loanTerms = await fetchData('/loan-terms'); // Public endpoint
            loanTermSelect.innerHTML = '<option value="">-- Pilih Produk --</option>';
            loanTerms.forEach(term => {
                const option = document.createElement('option');
                option.value = term.id;
                option.textContent = `${term.loan_type_name} - ${term.tenor_months} bulan (${term.interest_rate}%/bulan)`;
                loanTermSelect.appendChild(option);
            });

            // Load max loan info
            const stats = await fetchData('/member/stats');
            document.getElementById('max-loan-info').textContent = formatCurrency(stats.maxLoanAmount);

            // Load pending applications
            const applications = await fetchData('/member/applications'); // Endpoint perlu dibuat
            if (applications.length === 0) {
                applicationsTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">Tidak ada pengajuan yang sedang diproses.</td></tr>`;
                return;
            }
            applicationsTableBody.innerHTML = '';
            applications.forEach(app => {
                const statusClass = app.status === 'Approved' ? 'bg-green-100 text-green-800' : (app.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800');
                const row = applicationsTableBody.insertRow();
                row.innerHTML = `
                    <td class="px-6 py-4 text-sm text-gray-500">${formatDate(app.date)}</td>
                    <td class="px-6 py-4 text-sm text-gray-900">${app.type}</td>
                    <td class="px-6 py-4 text-sm text-gray-500 text-right">${formatCurrency(app.amount)}</td>
                    <td class="px-6 py-4 text-sm"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${app.status}</span></td>
                `;
            });

        } catch (error) {
            console.error('Error loading application data:', error);
        }
    };

    // --- MODAL & DETAIL FUNCTIONS ---
    const loanDetailsModal = document.getElementById('loan-details-modal');
    const closeLoanDetailsModalBtn = document.getElementById('close-loan-details-modal-btn');
    const loanSummarySection = document.getElementById('loan-summary-section');
    const loanInstallmentsTableBody = document.getElementById('loan-installments-table-body');

    const showLoanDetailsModal = async (loanId) => {
        loanDetailsModal.classList.remove('hidden');
        loanSummarySection.innerHTML = `<p class="text-gray-500 col-span-full text-center">Memuat ringkasan...</p>`;
        loanInstallmentsTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">Memuat jadwal angsuran...</td></tr>`;

        try {
            const data = await fetchData(`/member/loans/${loanId}/details`);
            const { summary, installments } = data;

            // Populate summary
            const renderSummaryDetail = (label, value) => `<div class="p-2"><p class="text-xs text-gray-500">${label}</p><p class="font-semibold text-gray-800">${value}</p></div>`;
            loanSummarySection.innerHTML = `
                ${renderSummaryDetail('Jumlah Pinjaman', formatCurrency(summary.amount))}
                ${renderSummaryDetail('Angsuran/Bulan (Awal)', formatCurrency(summary.monthlyInstallment))}
                ${renderSummaryDetail('Tenor', `${summary.tenor} bulan`)}
                ${renderSummaryDetail('Total Terbayar', formatCurrency(summary.totalPaid))}
            `;

            // Populate installments table
            if (installments.length === 0) {
                loanInstallmentsTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">Jadwal angsuran tidak tersedia.</td></tr>`;
                return;
            }
            
            loanInstallmentsTableBody.innerHTML = '';
            installments.forEach(inst => {
                const statusClass = inst.status === 'Lunas' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
                const row = loanInstallmentsTableBody.insertRow();
                row.innerHTML = `
                    <td class="px-6 py-4 text-sm text-gray-500 text-center">${inst.installmentNumber}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${formatDate(inst.dueDate)}</td>
                    <td class="px-6 py-4 text-sm text-gray-900 text-right">${formatCurrency(inst.amount)}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${formatDate(inst.paymentDate)}</td>
                    <td class="px-6 py-4 text-sm"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${inst.status}</span></td>
                `;
            });

        } catch (error) {
            console.error('Error loading loan details:', error);
            loanSummarySection.innerHTML = `<p class="text-red-500 col-span-full text-center">Gagal memuat ringkasan.</p>`;
            loanInstallmentsTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">Gagal memuat jadwal angsuran.</td></tr>`;
        }
    };

    // --- EVENT LISTENERS ---
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchContent(link.dataset.target);
            if (window.innerWidth < 768) { // Close sidebar on mobile
                sidebar.classList.add('-translate-x-full');
                sidebarOverlay.classList.add('hidden');
            }
        });
    });

    quickLinkBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            switchContent(btn.dataset.target);
        });
    });

    // Loan Application Form Submission
    const loanApplicationForm = document.getElementById('loan-application-form');
    if (loanApplicationForm) {
        loanApplicationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = loanApplicationForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = 'Mengirim...';

            const loanTermId = document.getElementById('loan-term-id').value;
            const amount = document.getElementById('loan-amount').value;

            try {
                await fetchData('/member/loans', {
                    method: 'POST',
                    body: {
                        loan_term_id: loanTermId,
                        amount: parseFloat(amount)
                    }
                });
                
                alert('Pengajuan pinjaman berhasil dikirim dan sedang menunggu persetujuan.');
                loanApplicationForm.reset();
                loadApplicationData(); // Refresh the pending applications list
            } catch (error) {
                console.error('Loan application error:', error);
                alert(`Gagal mengajukan pinjaman: ${error.message}`);
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
            }
        });
    }

    // Saving Application Form Submission
    const savingApplicationForm = document.getElementById('saving-application-form');
    if (savingApplicationForm) {
        savingApplicationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = savingApplicationForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = 'Mengirim...';

            const amount = document.getElementById('saving-amount').value;
            const description = document.getElementById('saving-description').value;

            try {
                await fetchData('/member/savings', {
                    method: 'POST',
                    body: {
                        amount: parseFloat(amount),
                        description: description
                    }
                });
                
                alert('Pengajuan setoran simpanan sukarela berhasil dikirim.');
                savingApplicationForm.reset();
                loadApplicationData(); // Refresh the pending applications list
            } catch (error) {
                console.error('Saving application error:', error);
                alert(`Gagal mengajukan setoran: ${error.message}`);
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
            }
        });
    }

    // Event listener for loan details button
    const loansTableBody = document.getElementById('loans-table-body');
    if (loansTableBody) {
        loansTableBody.addEventListener('click', (e) => {
            if (e.target.matches('.view-loan-details-btn')) {
                e.preventDefault();
                const loanId = e.target.dataset.id;
                showLoanDetailsModal(loanId);
            }
        });
    }

    // Event listener for closing the modal
    if (closeLoanDetailsModalBtn) {
        closeLoanDetailsModalBtn.addEventListener('click', () => {
            loanDetailsModal.classList.add('hidden');
        });
    }

    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Apakah Anda yakin ingin keluar?')) {
            logout();
        }
    });

    menuButton.addEventListener('click', () => {
        sidebar.classList.toggle('-translate-x-full');
        sidebarOverlay.classList.toggle('hidden');
    });

    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('hidden');
    });

    // --- INITIALIZATION ---
    checkAuth();
    const memberName = localStorage.getItem('member_name') || 'Anggota';
    document.getElementById('member-name-header').textContent = memberName;
    document.getElementById('member-name-welcome').textContent = memberName;
    switchContent('dashboard');
});
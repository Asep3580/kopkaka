const express = require('express');
const router = express.Router();
const multer = require('multer'); // Import multer
const excelUpload = multer({ storage: multer.memoryStorage() }); // Define multer for Excel in-memory processing
const upload = require('../middleware/upload.middleware');
const authMiddleware = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware'); // Now checks permissions

const positionController = require('../controllers/position.controller');
const savingTypeController = require('../controllers/savingtype.controller');
const loanTypeController = require('../controllers/loantype.controller');
const loanTermController = require('../controllers/loanterms.controller');
const accountController = require('../controllers/account.controller'); // Diperbarui untuk menyertakan fungsi ekspor
const accountTypeController = require('../controllers/accounttype.controller');
const supplierController = require('../controllers/supplier.controller');
const membersController = require('../controllers/members.controller');
const userController = require('../controllers/user.controller');
const publicController = require('../controllers/public.controller');

// --- Sub-routers for specific admin resources ---
const announcementRoutes = require('./announcement.routes.js');
const employerRoutes = require('./employer.routes.js');
const partnerRoutes = require('./partner.routes.js');
const supplierRoutes = require('./supplier.routes.js'); // 1. Impor router supplier

const { 
    getSavings,
    getSavingsByMember,
    createSaving,
    updateSavingStatus,
    updateSaving,
    deleteSaving,
    uploadBulkSavings,
    exportSavingsTemplate
} = require('../controllers/saving.controller');
const {
    getLoans
} = require('../controllers/loan.controller');
const {
    getJournals,
    createJournal,
    getJournalById,
    updateJournal,
    deleteJournal
} = require('../controllers/journal.controller.js');
const { 
    getDashboardStats, 
    getCashFlowSummary,
    getMemberGrowth,
    getPendingLoans,
    updateLoanStatus,
    recordLoanPayment,
    getLoanDetailsForAdmin,
    getLoanById,
    updateLoan,
    deleteLoan,
    getAllPermissions,
    getRolePermissions,
    updateRolePermissions,
    createCashSale,
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    getLogisticsEntries,
    getAvailableLogisticsProducts,
    createLogisticsEntry,
    getLogisticsByReference,
    updateLogisticsByReference,
    deleteLogisticsByReference,
    getCompanyInfo,
    updateCompanyInfo,
    getTestimonials,
    getTestimonialById,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial,
    mapSavingAccount,
    mapLoanAccount,
    getReceivableLogistics,
    receiveLogisticsItems,
    getPayables,
    getPayableDetails,
    recordPayablePayment,
    getStockCardHistory,
    getSavingTypes,
    getAllProductsForDropdown,
    createSale,
    getIncomeStatement,
    getIncomeStatementSummary,
    getShuRules,
    saveShuRules,
    calculateShuPreview,
    postShuDistribution,
    getBalanceSheet,
    getBalanceSheetSummary,
    getCashFlowStatement,
    getGeneralLedger,
    getMemberLoanHistory,
    getPendingSales,
    getSaleDetailsByOrderId,
    getSaleItemsByOrderId,
    getPendingResignations,
    processResignation,
    getMonthlyClosingStatus,
    getMonthlyClosings,
    getPositions,
    getLoanTypes,
    getSuppliers,
    getLoanTerms,
    reopenMonthlyClosing,
    processMonthlyClosing,
    getAccounts,
    createManualSaving,
    getMasterProducts,
    createMasterProduct,
    updateMasterProduct,
    deleteMasterProduct,
    getPendingLoanPayments,
    updateLoanPaymentStatus,
} = require('../controllers/admin.controller');

// Dashboard
router.get('/stats', authMiddleware, authorize(['viewDashboard']), getDashboardStats);
router.get('/cashflow-summary', authMiddleware, authorize(['viewDashboard']), getCashFlowSummary);
router.get('/member-growth', authMiddleware, authorize(['viewDashboard']), getMemberGrowth);
router.get('/balance-sheet-summary', authMiddleware, authorize(['viewDashboard']), getBalanceSheetSummary);
router.get('/income-statement-summary', authMiddleware, authorize(['viewDashboard']), getIncomeStatementSummary);

// Approvals
router.get('/pending-loans', authMiddleware, authorize(['viewApprovals']), getPendingLoans);
router.get('/pending-loan-payments', authMiddleware, authorize(['approveLoanAccounting']), getPendingLoanPayments);
// This route can be accessed by accounting (for first approval) or manager (for final approval)
router.put('/loans/:id/status', authMiddleware, authorize(['approveLoanAccounting', 'approveLoanManager']), updateLoanStatus);

// Savings Management
router.get('/savings', authMiddleware, authorize(['viewSavings']), getSavings);
router.get('/savings/member/:memberId', authMiddleware, authorize(['viewSavings']), getSavingsByMember);
router.post('/savings', authMiddleware, authorize(['approveSaving']), createSaving);
router.put('/savings/:id/status', authMiddleware, authorize(['approveSaving']), updateSavingStatus);
router.put('/savings/:id', authMiddleware, authorize(['deleteData']), updateSaving);
router.delete('/savings/:id', authMiddleware, authorize(['deleteData']), deleteSaving);

// Bulk Savings Management
router.get('/savings/export-template', authMiddleware, authorize(['approveSaving']), exportSavingsTemplate);
router.post('/savings/bulk-upload', authMiddleware, authorize(['approveSaving']), upload.single('savingsFile'), uploadBulkSavings);
// Manual Saving Input
router.post('/savings/manual', authMiddleware, authorize(['approveSaving']), createManualSaving);


// Loan Management (for admin)
router.get('/loans', authMiddleware, authorize(['viewLoans']), getLoans);
router.get('/loans/:id/details', authMiddleware, authorize(['viewLoans']), getLoanDetailsForAdmin);
router.post('/loans/payment', authMiddleware, authorize(['approveLoanAccounting']), recordLoanPayment);
router.get('/loans/:id', authMiddleware, authorize(['manageUsers']), getLoanById);
router.put('/loan-payments/:id/status', authMiddleware, authorize(['approveLoanAccounting']), updateLoanPaymentStatus);
router.put('/loans/:id', authMiddleware, authorize(['manageUsers']), updateLoan);
router.delete('/loans/:id', authMiddleware, authorize(['deleteData']), deleteLoan);
router.get('/members/:id/loans', authMiddleware, authorize(['viewLoans']), getMemberLoanHistory);
// User Management
router.get('/users', authMiddleware, authorize(['manageUsers']), userController.getUsers);
router.post('/users', authMiddleware, authorize(['manageUsers']), userController.createUser);
router.put('/users/:id', authMiddleware, authorize(['manageUsers']), userController.updateUser);
router.delete('/users/:id', authMiddleware, authorize(['manageUsers']), userController.deleteUser);

// Member Management (for Admin views like Approvals, Member List)
router.get('/members', authMiddleware, authorize(['viewMembers', 'viewApprovals']), membersController.getAllMembers);
router.get('/members/:id', authMiddleware, authorize(['viewMembers', 'viewApprovals']), membersController.getMemberById);
router.put('/members/:id/status', authMiddleware, authorize(['admin']), membersController.updateMemberStatus);

// Role & Permission Management
router.get('/permissions', authMiddleware, authorize(['viewSettings']), getAllPermissions);
router.get('/roles/:roleName/permissions', authMiddleware, authorize(['viewSettings']), getRolePermissions);
router.put('/roles/:roleName/permissions', authMiddleware, authorize(['viewSettings']), updateRolePermissions);

// Product Management
const productManagementPermission = ['viewDashboard']; // Gunakan permission yang sudah ada untuk simpel
router.get('/products', authMiddleware, authorize(productManagementPermission), getProducts);
router.get('/products/:id', authMiddleware, authorize(productManagementPermission), getProductById);
router.post('/sales', authMiddleware, authorize(productManagementPermission), createSale);
router.post('/products', authMiddleware, authorize(productManagementPermission), upload.single('productImage'), createProduct);
router.put('/products/:id', authMiddleware, authorize(productManagementPermission), upload.single('productImage'), updateProduct);
router.delete('/products/:id', authMiddleware, authorize(productManagementPermission), deleteProduct);
router.post('/cash-sale', authMiddleware, authorize(['viewUsahaKoperasi']), createCashSale);
router.get('/logistics-products/:shopType', authMiddleware, authorize(productManagementPermission), getAvailableLogisticsProducts);
// Rute baru untuk mengambil pesanan yang menunggu pengambilan
router.get('/sales/pending', authMiddleware, authorize(['approveLoanAccounting']), getPendingSales);
// Rute baru untuk mengambil detail item dari sebuah pesanan
router.get('/sales/:orderId/items', authMiddleware, authorize(['approveLoanAccounting']), getSaleItemsByOrderId);
// Rute baru untuk verifikasi pesanan oleh kasir
router.get('/sales/order/:orderId', authMiddleware, authorize(['approveLoanAccounting']), getSaleDetailsByOrderId);
// Rute baru untuk membatalkan pesanan oleh admin/kasir
router.put('/sales/:orderId/cancel', authMiddleware, authorize(['approveLoanAccounting', 'viewDashboard']), publicController.cancelSaleOrder);

// Rute baru untuk mengambil permintaan pengunduran diri
router.get('/pending-resignations', authMiddleware, authorize(['admin']), getPendingResignations);
router.post('/process-resignation', authMiddleware, authorize(['admin']), processResignation);

// Logistics Card View
// Menggunakan permission 'approveLoanAccounting' karena fitur ini adalah bagian dari akunting
// dan permission ini sudah dimiliki oleh role 'admin' dan 'akunting'.
router.get('/logistics-view', authMiddleware, authorize(['approveLoanAccounting']), getLogisticsEntries);

// Logistics Card CRUD
const logisticsPermission = ['approveLoanAccounting']; // Reuse permission
router.post('/logistics_entries', authMiddleware, authorize(logisticsPermission), createLogisticsEntry);
router.get('/logistics-by-ref/:ref', authMiddleware, authorize(logisticsPermission), getLogisticsByReference);
router.put('/logistics-by-ref/:ref', authMiddleware, authorize(logisticsPermission), updateLogisticsByReference);
router.delete('/logistics-by-ref/:ref', authMiddleware, authorize(logisticsPermission), deleteLogisticsByReference);
// Hapus rute lama untuk delete per item, karena sekarang kita kelola per referensi
// router.delete('/logistics_entries/:id', authMiddleware, authorize(logisticsPermission), deleteItem('logistics_entries'));

// Company Profile Management
// Endpoint ini dibuat lebih permisif agar semua role staf (admin, akunting, manager) bisa memuat info header.
// Otorisasi spesifik (viewSettings) hanya diperlukan untuk mengubah data.
router.get('/company-info', authMiddleware, getCompanyInfo);
router.put('/company-info', authMiddleware, authorize(['viewSettings']), upload.single('logo'), updateCompanyInfo);

// Testimonial Management
const testimonialPermission = ['viewSettings'];
router.get('/testimonials', authMiddleware, authorize(testimonialPermission), getTestimonials);
router.get('/testimonials/:id', authMiddleware, authorize(testimonialPermission), getTestimonialById);
router.post('/testimonials', authMiddleware, authorize(testimonialPermission), upload.single('testimonialPhoto'), createTestimonial);
router.put('/testimonials/:id', authMiddleware, authorize(testimonialPermission), upload.single('testimonialPhoto'), updateTestimonial);
router.delete('/testimonials/:id', authMiddleware, authorize(testimonialPermission), deleteTestimonial);

// Account Mapping
router.put('/map-saving-account/:id', authMiddleware, authorize(['viewSettings']), mapSavingAccount);
router.put('/map-loan-account/:id', authMiddleware, authorize(['viewSettings']), mapLoanAccount);

// Goods Receipt & Accounts Payable
const accountingPermission = ['viewAccounting'];
router.get('/logistics/receivable', authMiddleware, authorize(accountingPermission), getReceivableLogistics);
router.post('/logistics/receive', authMiddleware, authorize(accountingPermission), receiveLogisticsItems);
router.get('/payables', authMiddleware, authorize(accountingPermission), getPayables);
router.get('/payables/:id', authMiddleware, authorize(accountingPermission), getPayableDetails);
router.post('/payables/payment', authMiddleware, authorize(accountingPermission), recordPayablePayment);
router.get('/stock-card', authMiddleware, authorize(accountingPermission), getStockCardHistory);
router.get('/all-products', authMiddleware, authorize(accountingPermission), getAllProductsForDropdown);

// Reports
router.get('/reports/income-statement', authMiddleware, authorize(['viewReports']), getIncomeStatement);
router.get('/reports/balance-sheet', authMiddleware, authorize(['viewReports']), getBalanceSheet);
router.get('/reports/general-ledger', authMiddleware, authorize(['viewReports']), getGeneralLedger);
router.get('/reports/cash-flow', authMiddleware, authorize(['viewReports']), getCashFlowStatement);
router.get('/reports/monthly-closing-status', authMiddleware, authorize(['viewReports']), getMonthlyClosingStatus);

// SHU Rules Management
router.get('/shu-rules/:year', authMiddleware, authorize(['viewSettings']), getShuRules);
router.post('/shu-rules', authMiddleware, authorize(['viewSettings']), saveShuRules);

// SHU Posting
router.post('/shu/calculate-preview', authMiddleware, authorize(['postSHU']), calculateShuPreview);
router.post('/shu/post-distribution', authMiddleware, authorize(['postSHU']), postShuDistribution);

// Monthly Closing Process
router.get('/accounting/closings', authMiddleware, authorize(['processClosing']), getMonthlyClosings);
router.post('/accounting/close-month', authMiddleware, authorize(['processClosing']), processMonthlyClosing);
router.post('/accounting/reopen-month', authMiddleware, authorize(['processClosing']), reopenMonthlyClosing);

// General Journal Management
router.get('/journals', authMiddleware, authorize(accountingPermission), getJournals);
router.post('/journals', authMiddleware, authorize(accountingPermission), createJournal);
router.get('/journals/:id', authMiddleware, authorize(accountingPermission), getJournalById);
router.put('/journals/:id', authMiddleware, authorize(accountingPermission), updateJournal);
router.delete('/journals/:id', authMiddleware, authorize(accountingPermission), deleteJournal);

// --- Settings Routes ---

// Positions
router.get('/positions', authMiddleware, authorize(['viewSettings', 'viewMembers']), positionController.getPositions);
router.post('/positions', authMiddleware, authorize(['viewSettings']), positionController.createPosition);
router.put('/positions/:id', authMiddleware, authorize(['viewSettings']), positionController.updatePosition);
router.delete('/positions/:id', authMiddleware, authorize(['deleteData']), positionController.deletePosition);

// Saving Types
router.get('/savingtypes', authMiddleware, authorize(['viewSettings', 'viewSavings']), savingTypeController.getSavingTypes);
router.post('/savingtypes', authMiddleware, authorize(['viewSettings']), savingTypeController.createSavingType);
router.put('/savingtypes/:id', authMiddleware, authorize(['viewSettings']), savingTypeController.updateSavingType);
router.delete('/savingtypes/:id', authMiddleware, authorize(['deleteData']), savingTypeController.deleteSavingType);

// Loan Types
router.get('/loantypes', authMiddleware, authorize(['viewSettings']), loanTypeController.getLoanTypes);
router.post('/loantypes', authMiddleware, authorize(['viewSettings']), loanTypeController.createLoanType);
router.put('/loantypes/:id', authMiddleware, authorize(['viewSettings']), loanTypeController.updateLoanType);
router.delete('/loantypes/:id', authMiddleware, authorize(['deleteData']), loanTypeController.deleteLoanType);

// Loan Terms
router.get('/loanterms', authMiddleware, authorize(['viewSettings']), loanTermController.getLoanTerms);
router.post('/loanterms', authMiddleware, authorize(['viewSettings']), loanTermController.createLoanTerm);
router.put('/loanterms/:id', authMiddleware, authorize(['viewSettings']), loanTermController.updateLoanTerm);
router.delete('/loanterms/:id', authMiddleware, authorize(['deleteData']), loanTermController.deleteLoanTerm);

// Chart of Accounts (COA)
router.get('/accounts', authMiddleware, authorize(['viewSettings']), accountController.getAccounts);
router.post('/accounts/import', authMiddleware, authorize(['viewSettings']), excelUpload.single('accountsFile'), accountController.importAccountsFromExcel);
router.get('/accounts/export', authMiddleware, authorize(['viewSettings']), accountController.exportAccountsToExcel);
router.post('/accounts', authMiddleware, authorize(['viewSettings']), accountController.createAccount);
router.put('/accounts/:id', authMiddleware, authorize(['viewSettings']), accountController.updateAccount);
router.delete('/accounts/:id', authMiddleware, authorize(['deleteData']), accountController.deleteAccount);
// Rute baru untuk jurnal, hanya mengembalikan akun yang bukan akun induk.
router.get('/journal-accounts', authMiddleware, authorize(['viewAccounting']), accountController.getJournalableAccounts);

// Account Types (for COA)
router.get('/accounttypes', authMiddleware, authorize(['viewSettings']), accountTypeController.getAccountTypes);
router.post('/accounttypes', authMiddleware, authorize(['viewSettings']), accountTypeController.createAccountType);
router.put('/accounttypes/:id', authMiddleware, authorize(['viewSettings']), accountTypeController.updateAccountType);
router.delete('/accounttypes/:id', authMiddleware, authorize(['deleteData']), accountTypeController.deleteAccountType);

// Suppliers
router.get('/suppliers', authMiddleware, authorize(['viewSettings', 'viewAccounting']), supplierController.getSuppliers);
// Note: Supplier creation/update/delete logic is not fully implemented in a dedicated controller yet.
// This part might need a separate controller in the future.

// Master Products CRUD
router.get('/master-products', authMiddleware, authorize(['viewSettings']), getMasterProducts);
router.post('/master-products', authMiddleware, authorize(['viewSettings']), createMasterProduct);
router.put('/master-products/:id', authMiddleware, authorize(['viewSettings']), updateMasterProduct);
router.delete('/master-products/:id', authMiddleware, authorize(['deleteData']), deleteMasterProduct);


module.exports = router;

// --- Sub-routers (MUST be at the end) ---
router.use('/announcements', announcementRoutes);
router.use('/employers', employerRoutes);
router.use('/partners', partnerRoutes);
router.use('/', supplierRoutes); // 2. Gunakan router supplier
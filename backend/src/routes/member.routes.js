const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const upload = require('../middleware/upload.middleware');

const {
    getMemberStats,
    getMemberProfile,
    getMemberSavings,
    getMemberLoans,
    getMemberApplications,
    createLoanApplication,
    createSavingApplication,
    getLoanDetails,
    getMemberShuHistory,
    getNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    createResignationRequest,
    cancelResignationRequest,
    getMyPermissions,
    changePassword,
    updateProfilePhoto,
    getSavingsChartData,
    getLoansChartData,
    getTransactionsChartData,
    getShuChartData,
    getAnnouncements,
    getMemberSalesHistory,
    getSaleDetailsByOrderIdForMember,
    getVoluntarySavingsBalance,
    createWithdrawalApplication,
    getActiveLoanForPayment,
    submitLoanPayment
} = require('../controllers/member.controller');

// All routes in this file are for logged-in members, so we apply authMiddleware globally.
router.use(authMiddleware);
// The authorize(['member']) middleware is now applied to specific routes below,
// allowing some routes to be accessible by any authenticated user (e.g., admin, manager).

// Dashboard & Profile
router.get('/stats', authorize(['viewDashboard']), getMemberStats);
router.get('/profile', getMemberProfile);
router.put('/profile/photo', upload.single('selfie_photo'), updateProfilePhoto);
router.put('/change-password', changePassword);

// Permissions route accessible by any logged-in user
router.get('/permissions', getMyPermissions);

// Chart Data Routes (for member dashboard)
router.get('/chart-data/savings', authorize(['viewDashboard']), getSavingsChartData);
router.get('/chart-data/loans', authorize(['viewDashboard']), getLoansChartData);
router.get('/chart-data/transactions', authorize(['viewDashboard']), getTransactionsChartData);
router.get('/chart-data/shu', authorize(['viewDashboard']), getShuChartData);

// Notifications & Announcements
router.get('/notifications', getNotifications);
router.get('/notifications/unread-count', getUnreadNotificationCount);
router.put('/notifications/:id/read', markNotificationAsRead);
router.get('/announcements', getAnnouncements);

// Savings, Loans, SHU
router.get('/savings', authorize(['viewDashboard']), getMemberSavings);
router.get('/loans', authorize(['viewDashboard']), getMemberLoans);
router.get('/loans/:id/details', authorize(['viewDashboard']), getLoanDetails);
router.get('/shu-history', authorize(['viewDashboard']), getMemberShuHistory);

router.get('/savings/voluntary-balance', authorize(['viewDashboard']), getVoluntarySavingsBalance);

// Applications
router.get('/applications', authorize(['viewDashboard']), getMemberApplications);
router.post('/loans', authorize(['viewDashboard']), createLoanApplication);
router.post('/savings', authorize(['viewDashboard']), upload.single('proof'), createSavingApplication);

// Loan Payments
router.get('/active-loan-for-payment', authorize(['viewDashboard']), getActiveLoanForPayment);
router.post('/loan-payment', authorize(['viewDashboard']), upload.single('proof'), submitLoanPayment);

// Resignation Routes
router.post('/request-resignation', authorize(['viewDashboard']), createResignationRequest);
router.post('/cancel-resignation', authorize(['viewDashboard']), cancelResignationRequest);
router.post('/savings/withdrawal', authorize(['viewDashboard']), createWithdrawalApplication);

// New Transaction Routes
router.get('/sales', authorize(['viewDashboard']), getMemberSalesHistory);
router.get('/sales/:orderId', authorize(['viewDashboard']), getSaleDetailsByOrderIdForMember);

module.exports = router;
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
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

// All routes in this file are protected and start with /api/member

// Dashboard & Profile
router.get('/stats', protect, authorize(['viewDashboard']), getMemberStats);
router.get('/profile', protect, getMemberProfile);
router.put('/profile/photo', protect, upload.single('selfie_photo'), updateProfilePhoto);
router.put('/change-password', protect, changePassword);

// Permissions route accessible by any logged-in user
router.get('/permissions', protect, getMyPermissions);

// Chart Data Routes (for member dashboard)
router.get('/chart-data/savings', protect, authorize(['viewDashboard']), getSavingsChartData);
router.get('/chart-data/loans', protect, authorize(['viewDashboard']), getLoansChartData);
router.get('/chart-data/transactions', protect, authorize(['viewDashboard']), getTransactionsChartData);
router.get('/chart-data/shu', protect, authorize(['viewDashboard']), getShuChartData);

// Notifications & Announcements
router.get('/notifications', protect, getNotifications);
router.get('/notifications/unread-count', protect, getUnreadNotificationCount);
router.put('/notifications/:id/read', protect, markNotificationAsRead);
router.get('/announcements', protect, getAnnouncements);

// Savings, Loans, SHU
router.get('/savings', protect, authorize(['viewDashboard']), getMemberSavings);
router.get('/loans', protect, authorize(['viewDashboard']), getMemberLoans);
router.get('/loans/:id/details', protect, authorize(['viewDashboard']), getLoanDetails);
router.get('/shu-history', protect, authorize(['viewDashboard']), getMemberShuHistory);
router.get('/savings/voluntary-balance', protect, authorize(['viewDashboard']), getVoluntarySavingsBalance);
router.post('/savings/withdrawal', protect, authorize(['viewDashboard']), createWithdrawalApplication);

// Applications
router.get('/applications', protect, authorize(['viewDashboard']), getMemberApplications);
router.post('/loans', protect, authorize(['viewDashboard']), createLoanApplication);
router.post('/savings', protect, authorize(['viewDashboard']), upload.single('proof'), createSavingApplication);

// Loan Payments
router.get('/active-loan-for-payment', protect, authorize(['viewDashboard']), getActiveLoanForPayment);
router.post('/loan-payment', protect, authorize(['viewDashboard']), upload.single('proof'), submitLoanPayment);

// Resignation Routes
router.post('/request-resignation', protect, authorize(['viewDashboard']), createResignationRequest);
router.post('/cancel-resignation', protect, authorize(['viewDashboard']), cancelResignationRequest);

// New Transaction Routes
router.get('/sales', protect, authorize(['viewDashboard']), getMemberSalesHistory);
router.get('/sales/:orderId', protect, authorize(['viewDashboard']), getSaleDetailsByOrderIdForMember);

module.exports = router;
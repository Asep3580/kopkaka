const express = require('express');
const router = express.Router();
const { getPartners, getPublicPartners, createPartner, updatePartner, deletePartner, getPartnerById } = require('../controllers/partner.controller');
const authMiddleware = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const { uploadPartnerLogo } = require('../middleware/upload');

// This permission will be used for admin-only routes.
// The `authorize` middleware allows the 'admin' role to pass any check.
const adminPermission = ['viewSettings'];

// Public route
router.get('/public/partners', getPublicPartners);

// Admin routes
router.route('/admin/partners')
    .get(authMiddleware, authorize(adminPermission), getPartners)
    .post(authMiddleware, authorize(adminPermission), uploadPartnerLogo.single('partnerLogo'), createPartner);

router.route('/admin/partners/:id')
    .get(authMiddleware, authorize(adminPermission), getPartnerById)
    .put(authMiddleware, authorize(adminPermission), uploadPartnerLogo.single('partnerLogo'), updatePartner)
    .delete(authMiddleware, authorize(adminPermission), deletePartner);

module.exports = router;
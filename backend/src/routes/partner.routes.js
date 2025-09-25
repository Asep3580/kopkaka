const express = require('express');
const router = express.Router();
const { getPartners, createPartner, updatePartner, deletePartner, getPartnerById } = require('../controllers/partner.controller');
const auth = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const { upload } = require('../middleware/upload.middleware');

// This permission will be used for admin-only routes.
// The `authorize` middleware allows the 'admin' role to pass any check.
const viewPermission = ['viewSettings'];
const managePermission = ['manageSettings'];

// Admin routes
router.route('/')
    .get(auth, authorize(viewPermission), getPartners)
    .post(auth, authorize(managePermission), upload.single('partnerLogo'), createPartner);

router.route('/:id')
    .get(auth, authorize(viewPermission), getPartnerById)
    .put(auth, authorize(managePermission), upload.single('partnerLogo'), updatePartner)
    .delete(auth, authorize(managePermission), deletePartner);

module.exports = router;
const { Router } = require('express');
const { getSuppliers, getSupplierById } = require('../controllers/supplier.controller.js');
const authMiddleware = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

const router = Router();

// Rute ini diperlukan untuk mengambil data di halaman "Kelola Supplier" (Admin)
// dan untuk mengisi dropdown di modal "Kartu Logistik" (Akunting).
const allowedRoles = ['admin', 'akunting'];

router.get('/suppliers', authMiddleware, authorize(allowedRoles), getSuppliers);
router.get('/suppliers/:id', authMiddleware, authorize(allowedRoles), getSupplierById);

module.exports = router;
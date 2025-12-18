const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticate, authorize } = require('../middleware/auth');

// Audit routes - Restricted to SUPER_ADMIN and PASTOR
router.get('/logs', authenticate, authorize(['SUPER_ADMIN', 'PASTOR']), auditController.getAuditLogs);
router.get('/stats', authenticate, authorize(['SUPER_ADMIN', 'PASTOR']), auditController.getAuditStats);

module.exports = router;

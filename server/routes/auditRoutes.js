const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticate, authorize } = require('../middleware/auth');

// Audit routes - Restricted to ADMIN and PASTOR
router.get('/logs', authenticate, authorize(['ADMIN', 'PASTOR']), auditController.getAuditLogs);
router.get('/stats', authenticate, authorize(['ADMIN', 'PASTOR']), auditController.getAuditStats);

module.exports = router;

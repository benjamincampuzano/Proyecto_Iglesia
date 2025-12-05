const express = require('express');
const router = express.Router();
const seminarController = require('../controllers/seminarController');
const { authenticate, isAdmin } = require('../middleware/auth');

router.get('/', authenticate, seminarController.getAllModules);
router.post('/', authenticate, seminarController.createModule);
router.put('/:id', authenticate, seminarController.updateModule);
router.delete('/:id', authenticate, seminarController.deleteModule);

// Enrollment routes
router.post('/:moduleId/enroll', authenticate, seminarController.enrollStudent);
router.get('/:moduleId/enrollments', authenticate, seminarController.getModuleEnrollments);

module.exports = router;

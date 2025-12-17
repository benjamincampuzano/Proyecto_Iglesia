const express = require('express');
const router = express.Router();
const seminarController = require('../controllers/seminarController');
const classAttendanceController = require('../controllers/classAttendanceController');
const { authenticate, isAdmin } = require('../middleware/auth');

router.get('/', authenticate, seminarController.getAllModules);
router.get('/:id', authenticate, seminarController.getModuleDetails); // New
router.post('/', authenticate, seminarController.createModule);
router.put('/:id', authenticate, seminarController.updateModule);
router.delete('/:id', authenticate, seminarController.deleteModule);

// Enrollment routes
router.post('/:moduleId/enroll', authenticate, seminarController.enrollStudent);
router.delete('/enrollments/:id', authenticate, seminarController.deleteEnrollment); // New
router.get('/:moduleId/enrollments', authenticate, seminarController.getModuleEnrollments);
router.put('/enrollments/:enrollmentId/progress', authenticate, seminarController.updateProgress);

// Class Attendance routes
router.post('/class-attendance', authenticate, classAttendanceController.recordClassAttendance);
router.get('/enrollments/:enrollmentId/attendances', authenticate, classAttendanceController.getEnrollmentAttendances);

module.exports = router;

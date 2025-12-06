const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// Import controllers
const churchAttendanceController = require('../controllers/churchAttendanceController');
const seminarController = require('../controllers/seminarController');
const enrollmentController = require('../controllers/enrollmentController');
const classAttendanceController = require('../controllers/classAttendanceController');
const consolidarStatsController = require('../controllers/consolidarStatsController');

// All routes require authentication
router.use(authenticate);

// Church Attendance Routes
// Church Attendance Routes
router.post('/church-attendance', churchAttendanceController.recordAttendance);
router.get('/church-attendance/members/all', churchAttendanceController.getAllMembers);
router.get('/church-attendance/stats', churchAttendanceController.getAttendanceStats);
router.get('/church-attendance/daily-stats', churchAttendanceController.getDailyStats);
router.get('/church-attendance/:date', churchAttendanceController.getAttendanceByDate);

// Consolidated Stats Routes
router.get('/stats/general', consolidarStatsController.getGeneralStats);


// Seminar Module Routes
router.get('/seminar/modules', seminarController.getAllModules);
router.post('/seminar/modules', seminarController.createModule);
router.put('/seminar/modules/:id', seminarController.updateModule);
router.delete('/seminar/modules/:id', seminarController.deleteModule);

// Enrollment Routes
router.post('/seminar/enrollments', enrollmentController.enrollStudent);
router.get('/seminar/enrollments/module/:moduleId', enrollmentController.getEnrollmentsByModule);
router.get('/seminar/enrollments/student/:userId', enrollmentController.getStudentEnrollments);
router.put('/seminar/enrollments/:id/status', enrollmentController.updateEnrollmentStatus);

// Class Attendance Routes
router.post('/seminar/class-attendance', classAttendanceController.recordClassAttendance);
router.get('/seminar/class-attendance/enrollment/:enrollmentId', classAttendanceController.getEnrollmentAttendances);
router.get('/seminar/class-attendance/module/:moduleId/class/:classNumber', classAttendanceController.getModuleClassAttendance);
router.get('/seminar/progress/:userId', classAttendanceController.getStudentProgress);

module.exports = router;

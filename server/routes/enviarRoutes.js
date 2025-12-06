const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// Import controllers
const cellAttendanceController = require('../controllers/cellAttendanceController');
const cellController = require('../controllers/cellController');

// All routes require authentication
router.use(authenticate);

// Cell Management Routes
router.post('/cells', cellController.createCell);
router.post('/cells/assign', cellController.assignMember);
router.get('/eligible-leaders', cellController.getEligibleLeaders);
router.get('/eligible-hosts', cellController.getEligibleHosts);
router.get('/eligible-members', cellController.getEligibleMembers);

// Cell Attendance Routes
router.post('/cell-attendance', cellAttendanceController.recordCellAttendance);
router.get('/cell-attendance/:cellId/:date', cellAttendanceController.getCellAttendance);
router.get('/cell-attendance/stats', cellAttendanceController.getAttendanceStats);
router.get('/cells', cellAttendanceController.getCells);
router.get('/cells/:cellId/members', cellAttendanceController.getCellMembers);

module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
    createModule,
    getModules,
    enrollStudent,
    getModuleMatrix,
    updateMatrixCell,
    deleteModule,
    updateModule,
    unenrollStudent,
    getSchoolStatsByLeader
} = require('../controllers/schoolController');

router.use(authenticate); // Protect all routes

router.post('/modules', createModule);
router.get('/modules', getModules);
router.delete('/modules/:id', deleteModule); // New
router.put('/modules/:id', updateModule);    // New
router.get('/modules/:id/matrix', getModuleMatrix);

router.post('/enroll', enrollStudent);
router.delete('/enrollments/:enrollmentId', unenrollStudent); // New
router.post('/matrix/update', updateMatrixCell);

// Stats
router.get('/stats/leader', getSchoolStatsByLeader); // New

module.exports = router;

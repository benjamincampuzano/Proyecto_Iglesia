const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
    createModule,
    getModules,
    enrollStudent,
    getModuleMatrix,
    updateMatrixCell
} = require('../controllers/schoolController');

router.use(authenticate); // Protect all routes

router.post('/modules', createModule);
router.get('/modules', getModules);
router.get('/modules/:id/matrix', getModuleMatrix);
router.post('/enroll', enrollStudent);
router.post('/matrix/update', updateMatrixCell);

module.exports = router;

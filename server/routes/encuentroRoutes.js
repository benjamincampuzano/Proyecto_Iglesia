const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const encuentroController = require('../controllers/encuentroController');

router.use(authenticate);

router.get('/', encuentroController.getEncuentros);
router.post('/', encuentroController.createEncuentro);
router.delete('/:id', encuentroController.deleteEncuentro);
router.get('/:id', encuentroController.getEncuentroById);

router.post('/:encuentroId/register', encuentroController.registerGuest);
router.delete('/registrations/:registrationId', encuentroController.deleteRegistration);

router.post('/registrations/:registrationId/payments', encuentroController.addPayment);

// Class Attendance
// classNumber should be 1-10
router.put('/registrations/:registrationId/classes/:classNumber', encuentroController.updateClassAttendance);

module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
    getEncuentros,
    getEncuentroById,
    createEncuentro,
    updateEncuentro,
    deleteEncuentro,
    registerParticipant,
    deleteRegistration,
    addPayment,
    updateClassAttendance,
    getEncuentroBalanceReport
} = require('../controllers/encuentroController');

router.use(authenticate);

router.get('/', getEncuentros);
router.post('/', createEncuentro);
router.get('/:id', getEncuentroById);
router.put('/:id', updateEncuentro);
router.delete('/:id', deleteEncuentro);
router.get('/:id/report/balance', getEncuentroBalanceReport);

router.post('/:encuentroId/register', registerParticipant);
router.delete('/registrations/:registrationId', deleteRegistration);

router.post('/registrations/:registrationId/payments', addPayment);

// Class Attendance
// classNumber should be 1-10
router.put('/registrations/:registrationId/classes/:classNumber', updateClassAttendance);

module.exports = router;

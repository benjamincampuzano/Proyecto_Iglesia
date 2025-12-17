const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
    getConventions,
    getConventionById,
    createConvention,
    updateConvention,
    registerUser,
    addPayment,
    deleteRegistration,
    deleteConvention,
    getConventionBalanceReport
} = require('../controllers/conventionController');

// All routes require authentication
router.use(authenticate);

router.get('/', getConventions);
router.post('/', createConvention);
router.get('/:id', getConventionById);
router.put('/:id', updateConvention);
router.delete('/:id', deleteConvention);
router.get('/:id/report/balance', getConventionBalanceReport);

router.post('/:conventionId/register', registerUser);
router.post('/registrations/:registrationId/payments', addPayment);
router.delete('/registrations/:registrationId', deleteRegistration);

module.exports = router;

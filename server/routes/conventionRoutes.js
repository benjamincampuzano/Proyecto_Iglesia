const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const conventionController = require('../controllers/conventionController');

// All routes require authentication
router.use(authenticate);

router.get('/', conventionController.getConventions);
router.post('/', conventionController.createConvention);
router.get('/:id', conventionController.getConventionById);
router.post('/:conventionId/register', conventionController.registerUser);
router.post('/registrations/:registrationId/payments', conventionController.addPayment);
router.delete('/registrations/:registrationId', conventionController.deleteRegistration);
router.delete('/:id', conventionController.deleteConvention);

module.exports = router;

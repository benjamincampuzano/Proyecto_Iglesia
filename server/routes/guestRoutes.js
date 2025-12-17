const express = require('express');
const {
    createGuest,
    getAllGuests,
    getGuestById,
    updateGuest,
    deleteGuest,
    convertGuestToMember,
} = require('../controllers/guestController');
const guestStatsController = require('../controllers/guestStatsController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All guest routes require authentication
router.get('/stats', authenticate, guestStatsController.getGuestStats);
router.post('/', authenticate, createGuest);
router.get('/', authenticate, getAllGuests);
router.get('/:id', authenticate, getGuestById);
router.put('/:id', authenticate, updateGuest);
router.delete('/:id', authenticate, deleteGuest);
router.post('/:id/convert-to-member', authenticate, convertGuestToMember);

module.exports = router;

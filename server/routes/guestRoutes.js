const express = require('express');
const {
    createGuest,
    getAllGuests,
    getGuestById,
    updateGuest,
    deleteGuest,
    assignGuest,
    convertGuestToMember,
} = require('../controllers/guestController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All guest routes require authentication
router.post('/', authenticate, createGuest);
router.get('/', authenticate, getAllGuests);
router.get('/:id', authenticate, getGuestById);
router.put('/:id', authenticate, updateGuest);
router.delete('/:id', authenticate, deleteGuest);
router.put('/:id/assign', authenticate, assignGuest);
router.post('/:id/convert-to-member', authenticate, convertGuestToMember);

module.exports = router;

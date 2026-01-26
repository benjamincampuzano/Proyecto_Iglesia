const express = require('express');
const {
    getProfile,
    updateProfile,
    changePassword,
    getAllUsers,
    getUserById,
    updateUser,
    createUser,
    deleteUser,
    assignLeader,
    getMyNetwork,
} = require('../controllers/userController');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

// User profile routes (authenticated users)
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, changePassword);

// Admin routes (ADMIN and LIDER_DOCE only)
router.get('/', authenticate, isAdmin, getAllUsers);
router.get('/:id', authenticate, isAdmin, getUserById);
router.put('/:id', authenticate, isAdmin, updateUser);
router.post('/', authenticate, isAdmin, createUser);
router.delete('/:id', authenticate, isAdmin, deleteUser);
router.post('/assign-leader/:id', authenticate, isAdmin, assignLeader);
router.get('/my-network/all', authenticate, getMyNetwork); // Added new route

module.exports = router;

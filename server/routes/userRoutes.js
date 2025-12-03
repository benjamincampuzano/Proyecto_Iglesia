const express = require('express');
const {
    updateProfile,
    changePassword,
    getAllUsers,
    getUserById,
    updateUser,
    createUser,
    deleteUser,
} = require('../controllers/userController');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

// User profile routes (authenticated users)
router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, changePassword);

// Admin routes (SUPER_ADMIN and LIDER_DOCE only)
router.get('/', authenticate, isAdmin, getAllUsers);
router.get('/:id', authenticate, isAdmin, getUserById);
router.put('/:id', authenticate, isAdmin, updateUser);
router.post('/', authenticate, isAdmin, createUser);
router.delete('/:id', authenticate, isAdmin, deleteUser);

module.exports = router;

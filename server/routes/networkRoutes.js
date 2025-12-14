const express = require('express');
const router = express.Router();
const {
    getLosDoce,
    getPastores,
    getNetwork,
    getAvailableUsers,
    assignUserToLeader,
    removeUserFromNetwork
} = require('../controllers/networkController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get all users with role LIDER_DOCE
router.get('/los-doce', getLosDoce);

// Get all users with role PASTOR
router.get('/pastores', getPastores);

// Get discipleship network for a specific user
router.get('/network/:userId', getNetwork);

// Get available users that can be added to a leader's network
router.get('/available-users/:leaderId', getAvailableUsers);

// Assign a user to a leader's network
router.post('/assign', assignUserToLeader);

// Remove a user from their leader's network
router.delete('/remove/:userId', removeUserFromNetwork);

module.exports = router;

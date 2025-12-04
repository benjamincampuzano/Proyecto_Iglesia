const express = require('express');
const router = express.Router();
const { getLosDoce, getNetwork } = require('../controllers/networkController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get all users with role LIDER_DOCE
router.get('/los-doce', getLosDoce);

// Get discipleship network for a specific user
router.get('/network/:userId', getNetwork);

module.exports = router;

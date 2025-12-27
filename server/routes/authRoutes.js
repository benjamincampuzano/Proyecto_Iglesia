const express = require('express');
const { register, login, getPublicLeaders, checkInitStatus, registerSetup } = require('../controllers/authController');

const router = express.Router();

router.get('/init-status', checkInitStatus);
router.post('/setup', registerSetup);
router.post('/register', register);
router.post('/login', login);
router.get('/leaders', getPublicLeaders);

module.exports = router;

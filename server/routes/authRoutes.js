const express = require('express');
const { register, login, getPublicLeaders } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/leaders', getPublicLeaders);

module.exports = router;

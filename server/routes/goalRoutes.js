const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getGoals, upsertGoal, updateGoal, deleteGoal } = require('../controllers/goalController');

router.use(authenticate);

// View goals: ADMIN, PASTOR, LIDER_DOCE
router.get('/', authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), getGoals);

// Manage goals: ADMIN, PASTOR
router.post('/', authorize(['ADMIN', 'PASTOR']), upsertGoal);
router.put('/:id', authorize(['ADMIN', 'PASTOR']), updateGoal);
router.delete('/:id', authorize(['ADMIN', 'PASTOR']), deleteGoal);

module.exports = router;

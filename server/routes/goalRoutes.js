const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getGoals, upsertGoal, updateGoal, deleteGoal } = require('../controllers/goalController');

router.use(authenticate);

// View goals: SUPER_ADMIN, PASTOR, LIDER_DOCE
router.get('/', authorize(['SUPER_ADMIN', 'PASTOR', 'LIDER_DOCE']), getGoals);

// Manage goals: SUPER_ADMIN, PASTOR
router.post('/', authorize(['SUPER_ADMIN', 'PASTOR']), upsertGoal);
router.put('/:id', authorize(['SUPER_ADMIN', 'PASTOR']), updateGoal);
router.delete('/:id', authorize(['SUPER_ADMIN', 'PASTOR']), deleteGoal);

module.exports = router;

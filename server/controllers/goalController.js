const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getUserNetwork } = require('../utils/networkUtils');
const { logActivity } = require('../utils/auditLogger');

// Create or Update a Goal
const upsertGoal = async (req, res) => {
    try {
        const { type, targetValue, encuentroId, conventionId, month, year, userId } = req.body;
        const currentUserId = req.user?.id;

        if (!userId) {
            return res.status(400).json({ message: 'El Líder Responsable es obligatorio' });
        }

        // Find if goal already exists for this context
        const where = { type, userId: parseInt(userId) };
        if (encuentroId) where.encuentroId = parseInt(encuentroId);
        if (conventionId) where.conventionId = parseInt(conventionId);
        if (month !== undefined) where.month = parseInt(month);
        if (year !== undefined) where.year = parseInt(year);

        const existingGoal = await prisma.goal.findFirst({ where });

        let goal;
        let action = '';
        if (existingGoal) {
            goal = await prisma.goal.update({
                where: { id: existingGoal.id },
                data: { targetValue: parseFloat(targetValue) }
            });
            action = 'UPDATE';
        } else {
            goal = await prisma.goal.create({
                data: {
                    type,
                    targetValue: parseFloat(targetValue),
                    encuentroId: encuentroId ? parseInt(encuentroId) : null,
                    conventionId: conventionId ? parseInt(conventionId) : null,
                    month: month !== undefined ? parseInt(month) : null,
                    year: year !== undefined ? parseInt(year) : null,
                    userId: userId ? parseInt(userId) : null
                }
            });
            action = 'CREATE';
        }

        if (currentUserId) {
            // Fetch user name for audit log
            const targetUser = await prisma.user.findUnique({
                where: { id: goal.userId },
                select: { profile: { select: { fullName: true } } }
            });

            await logActivity(currentUserId, action, 'GOAL', goal.id, {
                type: goal.type,
                targetValue: goal.targetValue,
                responsable: targetUser?.profile?.fullName || `Usuario #${goal.userId}`
            }, req.ip, req.headers['user-agent']);
        }

        res.status(200).json(goal);
    } catch (error) {
        console.error('Error upserting goal:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

// Update a Goal by ID
const updateGoal = async (req, res) => {
    try {
        const { id } = req.params;
        const { targetValue, encuentroId, conventionId, month, year, userId, type } = req.body;
        const currentUserId = req.user?.id;

        // Check if goal exists
        const existingGoal = await prisma.goal.findUnique({ where: { id: parseInt(id) } });

        if (!existingGoal) {
            return res.status(404).json({ message: 'Meta no encontrada' });
        }

        // Optional: Check if the new parameters conflict with another goal (if context changes)
        // But for "Edit", usually we trust the user knows what they are doing.
        // If they actally change the context (e.g. change Leader), we must ensure no duplicate exists.
        // We don't have unique constraint on schema for logic keys, so we should check manually.

        if (userId && parseInt(userId) !== existingGoal.userId) {
            const where = {
                type: type || existingGoal.type,
                userId: parseInt(userId)
            };
            // Add other context fields... 
            // Ideally we should replicate the "upsert" uniqueness check here to prevent duplicates.
            // But simpler is to allow update and let database constraint fail if unique constraint exists.
            // We don't have unique constraint on schema for logic keys, so we should check manually.
        }

        const goal = await prisma.goal.update({
            where: { id: parseInt(id) },
            data: {
                targetValue: targetValue ? parseFloat(targetValue) : undefined,
                userId: userId ? parseInt(userId) : undefined,
                encuentroId: encuentroId ? parseInt(encuentroId) : null, // Allow nullifying
                conventionId: conventionId ? parseInt(conventionId) : null,
                month: month ? parseInt(month) : undefined,
                year: year ? parseInt(year) : undefined
            }
        });

        if (currentUserId) {
            await logActivity(currentUserId, 'UPDATE', 'GOAL', goal.id, {
                previousTarget: existingGoal.targetValue,
                newTarget: goal.targetValue
            }, req.ip, req.headers['user-agent']);
        }

        res.status(200).json(goal);
    } catch (error) {
        console.error('Error updating goal:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

// Delete a Goal by ID
const deleteGoal = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user?.id;

        const goal = await prisma.goal.findUnique({ where: { id: parseInt(id) } });

        if (goal) {
            await prisma.goal.delete({
                where: { id: parseInt(id) }
            });

            if (currentUserId) {
                // Fetch user name for audit log
                const targetUser = await prisma.user.findUnique({
                    where: { id: goal.userId },
                    select: { profile: { select: { fullName: true } } }
                });

                await logActivity(currentUserId, 'DELETE', 'GOAL', parseInt(id), {
                    type: goal.type,
                    responsable: targetUser?.profile?.fullName || `Usuario #${goal.userId}`
                }, req.ip, req.headers['user-agent']);
            }
        }

        res.status(200).json({ message: 'Meta eliminada correctamente' });
    } catch (error) {
        console.error('Error deleting goal:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

// Get Goals with Progress
const getGoals = async (req, res) => {
    try {
        const { month, year, userId: filteredUserId } = req.query;
        const currentUserId = req.user.id;
        const userRoles = req.user.roles || [];

        // Determine scope
        let scopeUserId = currentUserId;
        if (userRoles.includes('ADMIN') || userRoles.includes('PASTOR')) {
            scopeUserId = filteredUserId ? parseInt(filteredUserId) : null;
        }

        const where = {};
        if (scopeUserId) where.userId = scopeUserId;
        if (month) where.month = parseInt(month);
        if (year) where.year = parseInt(year);

        const goals = await prisma.goal.findMany({
            where,
            include: {
                encuentro: true,
                convention: true,
                user: { select: { profile: { select: { fullName: true } } } }
            }
        });

        // Calculate progress for each goal
        const goalsWithProgress = await Promise.all(goals.map(async (goal) => {
            let currentValue = 0;
            let extraData = {};
            let networkIds = [];

            if (goal.userId) {
                const descendants = await getUserNetwork(goal.userId);
                networkIds = [goal.userId, ...descendants];
            }

            switch (goal.type) {
                case 'ENCUENTRO_REGISTRATIONS':
                    if (goal.encuentroId) {
                        const regWhere = { encuentroId: goal.encuentroId };
                        if (goal.userId) {
                            regWhere.OR = [
                                { guest: { assignedToId: { in: networkIds } } },
                                { userId: { in: networkIds } }
                            ];
                        }
                        currentValue = await prisma.encuentroRegistration.count({ where: regWhere });

                        // Stats for abonos/pendientes
                        const payments = await prisma.encuentroPayment.aggregate({
                            where: { registration: regWhere },
                            _sum: { amount: true }
                        });
                        const totalPaid = payments._sum.amount || 0;
                        const totalPotential = currentValue * goal.encuentro.cost;
                        extraData = { totalPaid, totalPending: totalPotential - totalPaid };
                    }
                    break;

                case 'ENCUENTRO_CONVERSIONS':
                    if (goal.encuentroId) {
                        const convWhere = {
                            registration: { encuentroId: goal.encuentroId },
                            attended: true
                        };
                        if (goal.userId) {
                            convWhere.registration.OR = [
                                { guest: { assignedToId: { in: networkIds } } },
                                { userId: { in: networkIds } }
                            ];
                        }
                        currentValue = await prisma.encuentroClassAttendance.count({
                            where: convWhere
                        });
                    }
                    break;

                case 'CONVENTION_REGISTRATIONS':
                    if (goal.conventionId) {
                        const regWhere = { conventionId: goal.conventionId };
                        if (goal.userId) {
                            regWhere.userId = { in: networkIds };
                        }
                        currentValue = await prisma.conventionRegistration.count({ where: regWhere });

                        const payments = await prisma.conventionPayment.aggregate({
                            where: { registration: regWhere },
                            _sum: { amount: true }
                        });
                        const totalPaid = payments._sum.amount || 0;
                        const totalPotential = currentValue * goal.convention.cost;
                        extraData = { totalPaid, totalPending: totalPotential - totalPaid };
                    }
                    break;

                case 'CELL_COUNT':
                    const cellWhere = { isDeleted: false };
                    if (goal.userId) {
                        cellWhere.leaderId = { in: networkIds };
                    }
                    currentValue = await prisma.cell.count({ where: cellWhere });
                    break;

                case 'CELL_ATTENDANCE':
                    const attendanceWhere = {};
                    if (goal.month && goal.year) {
                        const start = new Date(goal.year, goal.month - 1, 1);
                        const end = new Date(goal.year, goal.month, 0, 23, 59, 59);
                        attendanceWhere.date = { gte: start, lte: end };
                    }
                    if (goal.userId) {
                        attendanceWhere.userId = { in: networkIds };
                    }
                    currentValue = await prisma.cellAttendance.count({
                        where: { ...attendanceWhere, status: 'PRESENTE' }
                    });
                    break;
            }

            return {
                ...goal,
                currentValue,
                extraData
            };
        }));

        res.status(200).json(goalsWithProgress);
    } catch (error) {
        console.error('Error fetching goals:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

module.exports = {
    upsertGoal,
    updateGoal,
    deleteGoal,
    getGoals
};

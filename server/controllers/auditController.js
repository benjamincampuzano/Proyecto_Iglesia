const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAuditLogs = async (req, res) => {
    try {
        const { page = 1, limit = 50, action, entityType, startDate, endDate } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (action) where.action = action;
        if (entityType) where.entityType = entityType;
        if (startDate || endDate) {
            where.createdAt = {
                ...(startDate && { gte: new Date(startDate) }),
                ...(endDate && { lte: new Date(endDate) })
            };
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            profile: {
                                select: { fullName: true }
                            },
                            roles: {
                                select: {
                                    role: {
                                        select: { name: true }
                                    }
                                }
                            },
                            email: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.auditLog.count({ where })
        ]);

        const formattedLogs = logs.map(log => ({
            ...log,
            details: log.details ? JSON.stringify(log.details) : null,
            user: log.user ? {
                ...log.user,
                fullName: log.user.profile?.fullName,
                roles: log.user.roles.map(r => r.role.name)
            } : null
        }));

        res.json({
            logs: formattedLogs,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                currentPage: parseInt(page)
            }
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Error fetching audit logs' });
    }
};

const getAuditStats = async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        // Group logins by day
        const logins = await prisma.auditLog.findMany({
            where: {
                action: 'LOGIN',
                createdAt: { gte: startDate }
            },
            select: { createdAt: true }
        });

        // Group by date
        const loginsByDate = {};
        logins.forEach(log => {
            const date = log.createdAt.toISOString().split('T')[0];
            loginsByDate[date] = (loginsByDate[date] || 0) + 1;
        });

        // Action distribution
        const actions = await prisma.auditLog.groupBy({
            by: ['action'],
            _count: true
        });

        // Deletions count by type
        const deletions = await prisma.auditLog.groupBy({
            by: ['entityType'],
            where: { action: 'DELETE' },
            _count: true
        });

        res.json({
            loginsPerDay: Object.entries(loginsByDate).map(([date, count]) => ({ date, count })),
            actionDistribution: actions,
            deletionsByType: deletions
        });
    } catch (error) {
        console.error('Error fetching audit stats:', error);
        res.status(500).json({ error: 'Error fetching statistics' });
    }
};

module.exports = {
    getAuditLogs,
    getAuditStats
};

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getUserNetwork } = require('../utils/networkUtils');

// Create or update church attendance for a specific date
const recordAttendance = async (req, res) => {
    try {
        const { date, attendances } = req.body; // attendances: [{ userId, status }]

        if (!date || !attendances || !Array.isArray(attendances)) {
            return res.status(400).json({ error: 'Date and attendances array required' });
        }

        const results = await Promise.all(
            attendances.map(({ userId, status }) =>
                prisma.churchAttendance.upsert({
                    where: {
                        date_userId: {
                            date: new Date(date),
                            userId: parseInt(userId)
                        }
                    },
                    update: { status },
                    create: {
                        date: new Date(date),
                        userId: parseInt(userId),
                        status
                    }
                })
            )
        );

        res.json({ message: 'Attendance recorded successfully', count: results.length });
    } catch (error) {
        console.error('Error recording church attendance:', error);
        res.status(500).json({ error: 'Error recording attendance' });
    }
};

// Get attendance for a specific date
const getAttendanceByDate = async (req, res) => {
    try {
        const { date } = req.params;

        // Validate date
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ error: 'Invalid date format' });
        }

        const attendances = await prisma.churchAttendance.findMany({
            where: {
                date: parsedDate
            },
            include: {
                user: {
                    select: {
                        id: true,
                        profile: { select: { fullName: true } },
                        email: true,
                        roles: {
                            include: { role: true }
                        }
                    }
                }
            },
            orderBy: {
                user: {
                    profile: { fullName: 'asc' }
                }
            }
        });

        // Format response to flatten structure for frontend if needed, 
        // or frontend can handle it. Let's keep it close to previous but safe.
        // Frontend likely expects `user.fullName` and `user.role`.
        // We can map it.
        const formattedAttendances = attendances.map(a => ({
            ...a,
            user: {
                ...a.user,
                fullName: a.user.profile?.fullName || 'Sin Nombre',
                role: a.user.roles.map(r => r.role.name).join(', ') // Simple join for display
            }
        }));

        res.json(formattedAttendances);
    } catch (error) {
        console.error('Error fetching church attendance:', error);
        res.status(500).json({ error: 'Error fetching attendance' });
    }
};

// Get members for attendance marking (filtered by role)
const getAllMembers = async (req, res) => {
    try {
        const { id, roles } = req.user;
        const userId = parseInt(id);
        const userRoles = roles || [];
        let where = {};

        if (userRoles.includes('LIDER_DOCE') || userRoles.includes('PASTOR')) {
            const networkIds = await getUserNetwork(userId);
            // Include both the network and the leader themselves
            where = {
                id: { in: [...networkIds, userId] }
            };
        } else if (userRoles.includes('LIDER_CELULA')) {
            // LIDER_CELULA should see their disciples (network) AND their cell members
            const networkIds = await getUserNetwork(userId);

            // Find members of cells led by this user
            // Note: 'cell' with 'leaderId' IS valid in schema (User -> Cell via CellLeader relation)
            const cellMembers = await prisma.user.findMany({
                where: { cell: { leaderId: userId } },
                select: { id: true }
            });
            const cellMemberIds = cellMembers.map(u => u.id);

            // Combine unique IDs
            const allIds = [...new Set([...networkIds, ...cellMemberIds, userId])];

            where = {
                id: { in: allIds }
            };
        } else if (!userRoles.includes('ADMIN') && !userRoles.includes('ADMIN')) {
            // Regular members only see themselves
            where = { id: userId };
        }

        const members = await prisma.user.findMany({
            where,
            select: {
                id: true,
                profile: { select: { fullName: true } },
                email: true,
                roles: {
                    include: { role: true }
                }
            },
            orderBy: {
                profile: { fullName: 'asc' }
            }
        });

        // Format for frontend
        const formattedMembers = members.map(m => ({
            id: m.id,
            fullName: m.profile?.fullName || 'Sin Nombre',
            email: m.email,
            role: m.roles.map(r => r.role.name).join(', ')
        }));

        res.json(formattedMembers);
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({ error: 'Error fetching members' });
    }
};


// Get attendance statistics
const getAttendanceStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const { id, roles } = req.user;
        const userRoles = roles || [];

        const where = {};
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        if (userRoles.includes('LIDER_DOCE') || userRoles.includes('PASTOR') || userRoles.includes('LIDER_CELULA')) {
            const networkIds = await getUserNetwork(id);
            networkIds.push(id);
            where.userId = { in: networkIds };
        } else if (!userRoles.includes('ADMIN')) {
            where.userId = id;
        }

        // Always exclude ADMIN from reports
        where.user = {
            roles: {
                none: {
                    role: { name: 'ADMIN' }
                }
            }
        };

        const total = await prisma.churchAttendance.count({ where });
        const present = await prisma.churchAttendance.count({
            where: { ...where, status: 'PRESENTE' }
        });

        res.json({
            total,
            present,
            absent: total - present,
            attendanceRate: total > 0 ? ((present / total) * 100).toFixed(2) : 0
        });
    } catch (error) {
        console.error('Error fetching attendance stats:', error);
        res.status(500).json({ error: 'Error fetching statistics' });
    }
};

// Get daily attendance statistics for chart
const getDailyStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Default to last 30 days if no date range provided
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

        const where = {
            date: {
                gte: start,
                lte: end
            }
        };

        const { id, roles } = req.user;
        const userRoles = roles || [];
        if (userRoles.includes('LIDER_DOCE') || userRoles.includes('PASTOR') || userRoles.includes('LIDER_CELULA')) {
            const networkIds = await getUserNetwork(id);
            networkIds.push(id);
            where.userId = { in: networkIds };
        } else if (!userRoles.includes('ADMIN')) {
            where.userId = id;
        }

        // Always exclude ADMIN from reports
        where.user = {
            roles: {
                none: {
                    role: { name: 'ADMIN' }
                }
            }
        };

        // Fetch attendance records within date range
        const attendances = await prisma.churchAttendance.findMany({
            where,
            select: {
                date: true,
                status: true
            }
        });

        // Group by date and count present/absent
        const statsMap = {};
        attendances.forEach(att => {
            const dateKey = att.date.toISOString().split('T')[0];
            if (!statsMap[dateKey]) {
                statsMap[dateKey] = { date: dateKey, present: 0, absent: 0 };
            }
            if (att.status === 'PRESENTE') {
                statsMap[dateKey].present++;
            } else {
                statsMap[dateKey].absent++;
            }
        });

        // Convert to array and sort by date
        const stats = Object.values(statsMap).sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        res.json(stats);
    } catch (error) {
        console.error('Error fetching daily stats:', error);
        res.status(500).json({ error: 'Error fetching daily statistics' });
    }
};

module.exports = {
    recordAttendance,
    getAttendanceByDate,
    getAllMembers,
    getAttendanceStats,
    getDailyStats
};

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
                        fullName: true,
                        email: true,
                        role: true
                    }
                }
            },
            orderBy: {
                user: {
                    fullName: 'asc'
                }
            }
        });

        res.json(attendances);
    } catch (error) {
        console.error('Error fetching church attendance:', error);
        res.status(500).json({ error: 'Error fetching attendance' });
    }
};

// Helper to get network ids recursively
const getNetworkIds = async (leaderId) => {
    const directDisciples = await prisma.user.findMany({
        where: { leaderId },
        select: { id: true }
    });

    let networkIds = directDisciples.map(d => d.id);

    for (const disciple of directDisciples) {
        const subNetwork = await getNetworkIds(disciple.id);
        networkIds = [...networkIds, ...subNetwork];
    }

    return networkIds;
};

// Get members for attendance marking (filtered by role)
const getAllMembers = async (req, res) => {
    try {
        const { role, id } = req.user;
        let where = {};

        if (role === 'LIDER_DOCE' || role === 'LIDER_CELULA') {
            const networkIds = await getNetworkIds(id);
            // Include both the network and the leader themselves? 
            // Usually network implies downline. Let's include networkIds.
            // If they need to mark their own attendance, we should add `id` to the list.
            // Based on "personas de su red", it usually implies disciples.
            where = {
                id: { in: networkIds }
            };
        } else if (role !== 'SUPER_ADMIN') {
            // If not admin or leader 12/cell leader, return empty or limit to self?
            // For now, if role is MIEMBRO, maybe they shouldn't see anyone?
            // "que se pueda guardar... segun su rol". Role member probably can't mark attendance.
            // We can return empty list or just themselves.
            // Let's assume strict: if not leader, see nobody (or maybe just self if needed, but usually leaders mark).
            where = { id: id }; // Restricted to self? Or restricted to nothing?
            // Let's stick to restricting to network if leader, else standard behavior (which was 'show all' previously for others? No, it was empty/undefined in my previous edit?
            // Original code: `else if (role !== 'SUPER_ADMIN')`. If it falls through, `where` is `{}` -> All members!
            // That's risky.
            // I'll make explicit: 
            // Admin: All.
            // Leaders: Network.
            // Others (Member): None (or Self). I'll default to Self to be safe.
            where = { id: id };
        }

        const members = await prisma.user.findMany({
            where,
            select: {
                id: true,
                fullName: true,
                email: true,
                role: true
            },
            orderBy: {
                fullName: 'asc'
            }
        });

        res.json(members);
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({ error: 'Error fetching members' });
    }
};

// Get attendance statistics
const getAttendanceStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const { role, id } = req.user;

        const where = {};
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        if (role === 'LIDER_DOCE' || role === 'LIDER_CELULA') {
            const networkIds = await getNetworkIds(id);
            where.userId = { in: networkIds };
        } else if (role !== 'SUPER_ADMIN') {
            where.userId = id;
        }

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

        const { role, id } = req.user;
        if (role === 'LIDER_DOCE' || role === 'LIDER_CELULA') {
            const networkIds = await getNetworkIds(id);
            where.userId = { in: networkIds };
        } else if (role !== 'SUPER_ADMIN') {
            where.userId = id;
        }

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

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to get network IDs (recursive)
const getNetworkIds = async (leaderId) => {
    const id = parseInt(leaderId);
    if (isNaN(id)) return [];

    const directDisciples = await prisma.user.findMany({
        where: {
            OR: [
                { leaderId: id },
                { liderDoceId: id },
                { liderCelulaId: id },
                { pastorId: id }
            ]
        },
        select: { id: true }
    });

    let networkIds = directDisciples.map(d => d.id);

    for (const disciple of directDisciples) {
        if (disciple.id !== id) {
            const subNetwork = await getNetworkIds(disciple.id);
            networkIds = [...networkIds, ...subNetwork];
        }
    }

    return [...new Set(networkIds)];
};

const getGeneralStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const { role, id } = req.user;

        // Default date range: last 30 days
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

        let userFilter = {};
        if (role === 'LIDER_DOCE' || role === 'LIDER_CELULA') {
            const networkIds = await getNetworkIds(id);
            userFilter = { id: { in: [...networkIds, id] } }; // Include self?
            // Usually stats are about the network.
            // If checking 'Users', we check if they are in the ID list.
        } else if (role !== 'SUPER_ADMIN') {
            // Member sees only self?
            userFilter = { id: id };
        }

        // 1. Church Attendance Stats
        // Attendance records are linked to User.
        // We need to filter attendances where userId is in userFilter

        let attendanceWhere = {
            date: {
                gte: start,
                lte: end
            }
        };

        if (userFilter.id) {
            attendanceWhere.userId = userFilter.id;
        }

        const totalAttendanceRecords = await prisma.churchAttendance.count({ where: attendanceWhere });
        const presentCount = await prisma.churchAttendance.count({
            where: { ...attendanceWhere, status: 'PRESENTE' }
        });

        const attendanceStats = {
            totalRecords: totalAttendanceRecords,
            present: presentCount,
            absent: totalAttendanceRecords - presentCount,
            rate: totalAttendanceRecords > 0
                ? ((presentCount / totalAttendanceRecords) * 100).toFixed(1)
                : 0
        };

        // 2. Active Members (Total Database Users)
        // Filter by network
        const totalMembers = await prisma.user.count({
            where: {
                role: { not: 'SUPER_ADMIN' },
                ...userFilter
            }
        });

        // 3. Seminar Stats (Modules and Enrollments)
        // Enrollments are linked to User (userId)
        const activeEnrollments = await prisma.seminarEnrollment.count({
            where: {
                status: {
                    in: ['INSCRITO', 'EN_PROGRESO']
                },
                ...(userFilter.id && { userId: userFilter.id })
            }
        });

        const completedModules = await prisma.seminarEnrollment.count({
            where: {
                status: 'COMPLETADO',
                updatedAt: { gte: start, lte: end },
                ...(userFilter.id && { userId: userFilter.id })
            }
        });

        // 4. Daily Attendance Trend for the period (for a potential mini-chart)
        // GroupBy allows filtering by 'where'
        const dailyAttendance = await prisma.churchAttendance.groupBy({
            by: ['date'],
            where: attendanceWhere,
            _count: {
                status: true
            },
            // We can't filter _count by status inside groupBy easily in one go without raw query or post-processing
            // So we'll fetch basic groups and maybe run a second query or just existing logic.
            // Actually, let's reuse the logic from churchAttendanceController for daily stats if we need it detailed,
            // but here we might just want high-level numbers.
        });

        res.json({
            period: { start, end },
            summary: {
                totalMembers,
                activeStudents: activeEnrollments,
                graduatedInPeriod: completedModules
            },
            churchAttendance: attendanceStats,
            // Add more sections as needed
        });

    } catch (error) {
        console.error('Error fetching general consolidated stats:', error);
        res.status(500).json({ error: 'Error fetching general statistics' });
    }
};

module.exports = {
    getGeneralStats
};

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getGeneralStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Default date range: last 30 days
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

        // 1. Church Attendance Stats
        const attendanceWhere = {
            date: {
                gte: start,
                lte: end
            }
        };

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
        const totalMembers = await prisma.user.count({
            where: { role: { not: 'SUPER_ADMIN' } } // Exclude system admin from general member count
        });

        // 3. Seminar Stats (Modules and Enrollments)
        // Active enrollments: INSCRITO and EN_PROGRESO
        const activeEnrollments = await prisma.seminarEnrollment.count({
            where: {
                status: {
                    in: ['INSCRITO', 'EN_PROGRESO']
                }
            }
        });

        const completedModules = await prisma.seminarEnrollment.count({
            where: {
                status: 'COMPLETADO',
                updatedAt: { gte: start, lte: end } // Completed in this period
            }
        });

        // 4. Daily Attendance Trend for the period (for a potential mini-chart)
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

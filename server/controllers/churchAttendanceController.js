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

        const attendances = await prisma.churchAttendance.findMany({
            where: {
                date: new Date(date)
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

// Get all members for attendance marking
const getAllMembers = async (req, res) => {
    try {
        const members = await prisma.user.findMany({
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

        const where = {};
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
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

module.exports = {
    recordAttendance,
    getAttendanceByDate,
    getAllMembers,
    getAttendanceStats
};

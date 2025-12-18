const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper function to get all users in a leader's network (disciples and sub-disciples)
const getUserNetwork = async (userId) => {
    const network = [];
    const queue = [userId];
    const visited = new Set();

    while (queue.length > 0) {
        const currentId = queue.shift();

        if (visited.has(currentId)) continue;
        visited.add(currentId);
        network.push(currentId);

        const disciples = await prisma.user.findMany({
            where: { leaderId: currentId },
            select: { id: true }
        });

        queue.push(...disciples.map(d => d.id));
    }

    return network.filter(id => id != null);
};

// Record cell attendance
const recordCellAttendance = async (req, res) => {
    try {
        const { date, cellId, attendances } = req.body; // attendances: [{ userId, status }]

        if (!date || !cellId || !attendances || !Array.isArray(attendances)) {
            return res.status(400).json({ error: 'Date, cellId, and attendances array required' });
        }

        // Check if user is authorized (cell leader or admin)
        const cell = await prisma.cell.findUnique({
            where: { id: parseInt(cellId) },
            select: { leaderId: true }
        });

        if (!cell) {
            return res.status(404).json({ error: 'Cell not found' });
        }

        const userRole = req.user.role;
        const userId = req.user.userId;

        if (userRole !== 'SUPER_ADMIN' && userRole !== 'LIDER_DOCE' && cell.leaderId !== userId) {
            return res.status(403).json({ error: 'Not authorized to record attendance for this cell' });
        }

        const results = await Promise.all(
            attendances.map(({ userId, status }) =>
                prisma.cellAttendance.upsert({
                    where: {
                        date_cellId_userId: {
                            date: new Date(date),
                            cellId: parseInt(cellId),
                            userId: parseInt(userId)
                        }
                    },
                    update: { status },
                    create: {
                        date: new Date(date),
                        cellId: parseInt(cellId),
                        userId: parseInt(userId),
                        status
                    }
                })
            )
        );

        res.json({ message: 'Cell attendance recorded successfully', count: results.length });
    } catch (error) {
        console.error('Error recording cell attendance:', error);
        res.status(500).json({ error: 'Error recording cell attendance' });
    }
};

// Get cell attendance by date and cell
const getCellAttendance = async (req, res) => {
    try {
        const { cellId, date } = req.params;
        const userRole = req.user.role;
        const userId = req.user.userId;

        // Check authorization
        const cell = await prisma.cell.findUnique({
            where: { id: parseInt(cellId) },
            select: { leaderId: true }
        });

        if (!cell) {
            return res.status(404).json({ error: 'Cell not found' });
        }

        const isMember = await prisma.user.findFirst({
            where: { id: userId, cellId: parseInt(cellId) }
        });

        if (userRole !== 'SUPER_ADMIN' && userRole !== 'LIDER_DOCE' && cell.leaderId !== userId && !isMember) {
            return res.status(403).json({ error: 'Not authorized to view this cell attendance' });
        }

        const attendances = await prisma.cellAttendance.findMany({
            where: {
                cellId: parseInt(cellId),
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
        console.error('Error fetching cell attendance:', error);
        res.status(500).json({ error: 'Error fetching cell attendance' });
    }
};

// Get cells (filtered by role)
const getCells = async (req, res) => {
    try {
        const userRole = req.user.role;
        const userId = req.user.userId;

        let where = {};

        if (userRole === 'LIDER_CELULA') {
            // LIDER_CELULA can only see their own cells
            where.leaderId = userId;
        } else if (userRole === 'LIDER_DOCE') {
            // LIDER_DOCE can only see cells where the leader is in their network
            const networkUserIds = await getUserNetwork(userId);
            where.leaderId = { in: networkUserIds };
        } else if (userRole === 'MIEMBRO') {
            // MIEMBRO can only see cells they belong to
            where.members = {
                some: { id: userId }
            };
        }
        // SUPER_ADMIN sees all cells (no filter)

        const cells = await prisma.cell.findMany({
            where,
            select: {
                id: true,
                name: true,
                address: true,
                city: true,
                latitude: true,
                longitude: true,
                dayOfWeek: true,
                time: true,
                leader: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true
                    }
                },
                host: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true
                    }
                },
                liderDoce: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true
                    }
                },
                _count: {
                    select: {
                        members: true
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        res.json(cells);
    } catch (error) {
        console.error('Error fetching cells:', error);
        res.status(500).json({ error: 'Error fetching cells' });
    }
};

// Get cell members
const getCellMembers = async (req, res) => {
    try {
        const { cellId } = req.params;
        const userRole = req.user.role;
        const userId = req.user.userId;

        const cell = await prisma.cell.findUnique({
            where: { id: parseInt(cellId) },
            select: {
                leaderId: true,
                members: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        role: true
                    }
                }
            }
        });

        if (!cell) {
            return res.status(404).json({ error: 'Cell not found' });
        }

        const isMember = cell.members.some(m => m.id === userId);

        if (userRole !== 'SUPER_ADMIN' && userRole !== 'LIDER_DOCE' && cell.leaderId !== userId && !isMember) {
            return res.status(403).json({ error: 'Not authorized to view this cell' });
        }

        res.json(cell.members);
    } catch (error) {
        console.error('Error fetching cell members:', error);
        res.status(500).json({ error: 'Error fetching cell members' });
    }
};

// Get attendance statistics for chart
const getAttendanceStats = async (req, res) => {
    try {
        const { startDate, endDate, cellId } = req.query;
        const userRole = req.user.role;
        const userId = req.user.userId;

        // Default to last 30 days if no date range provided
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Build cell filter based on role
        let cellFilter = {};

        if (cellId) {
            // If specific cell requested, verify access
            const cell = await prisma.cell.findUnique({
                where: { id: parseInt(cellId) },
                select: { leaderId: true }
            });

            if (!cell) {
                return res.status(404).json({ error: 'Cell not found' });
            }

            // Check authorization
            if (userRole === 'LIDER_CELULA' && cell.leaderId !== userId) {
                return res.status(403).json({ error: 'Not authorized to view this cell' });
            } else if (userRole === 'LIDER_DOCE') {
                const networkUserIds = await getUserNetwork(userId);
                if (!networkUserIds.includes(cell.leaderId)) {
                    return res.status(403).json({ error: 'Not authorized to view this cell' });
                }
            }

            cellFilter.cellId = parseInt(cellId);
        } else {
            // Filter all cells based on role
            if (userRole === 'LIDER_CELULA') {
                const userCells = await prisma.cell.findMany({
                    where: { leaderId: userId },
                    select: { id: true }
                });
                cellFilter.cellId = { in: userCells.map(c => c.id) };
            } else if (userRole === 'LIDER_DOCE') {
                const networkUserIds = await getUserNetwork(userId);
                const networkCells = await prisma.cell.findMany({
                    where: { leaderId: { in: networkUserIds } },
                    select: { id: true }
                });
                cellFilter.cellId = { in: networkCells.map(c => c.id) };
            }
            // SUPER_ADMIN sees all cells (no filter)
        }

        // Fetch attendance records within date range
        const attendances = await prisma.cellAttendance.findMany({
            where: {
                ...cellFilter,
                date: {
                    gte: start,
                    lte: end
                }
            },
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
        console.error('Error fetching attendance stats:', error);
        res.status(500).json({ error: 'Error fetching attendance stats' });
    }
};

module.exports = {
    recordCellAttendance,
    getCellAttendance,
    getCells,
    getCellMembers,
    getAttendanceStats
};

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Record cell attendance
const recordCellAttendance = async (req, res) => {
    try {
        const { date, cellId, attendances } = req.body; // attendances: [{ userId, status }]

        if (!date || !cellId || !attendances || !Array.isArray(attendances)) {
            return res.status(400).json({ error: 'Date, cellId, and attendances array required' });
        }

        // Check if user is authorized (cell leader or admin)
        const cell = await prisma.cell.findUnique({
            where: { id: parseInt(cellId) }
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
            where: { id: parseInt(cellId) }
        });

        if (!cell) {
            return res.status(404).json({ error: 'Cell not found' });
        }

        if (userRole !== 'SUPER_ADMIN' && userRole !== 'LIDER_DOCE' && cell.leaderId !== userId) {
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
            where.leaderId = userId;
        }

        const cells = await prisma.cell.findMany({
            where,
            include: {
                leader: {
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
            include: {
                members: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        role: true
                    },
                    orderBy: {
                        fullName: 'asc'
                    }
                }
            }
        });

        if (!cell) {
            return res.status(404).json({ error: 'Cell not found' });
        }

        if (userRole !== 'SUPER_ADMIN' && userRole !== 'LIDER_DOCE' && cell.leaderId !== userId) {
            return res.status(403).json({ error: 'Not authorized to view this cell' });
        }

        res.json(cell.members);
    } catch (error) {
        console.error('Error fetching cell members:', error);
        res.status(500).json({ error: 'Error fetching cell members' });
    }
};

module.exports = {
    recordCellAttendance,
    getCellAttendance,
    getCells,
    getCellMembers
};

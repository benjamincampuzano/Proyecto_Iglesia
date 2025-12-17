const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get guest statistics with date filtering
const getGuestStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const user = req.user;

        // Build date filter
        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate) dateFilter.createdAt.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.createdAt.lte = end;
            }
        }

        // Build security filter based on role
        let securityFilter = {};
        if (user.role === 'SUPER_ADMIN') {
            securityFilter = {};
        } else if (user.role === 'LIDER_DOCE') {
            // Get network IDs
            const networkIds = await getUserNetwork(user.id);
            securityFilter = {
                invitedById: { in: [...networkIds, user.id] }
            };
        } else {
            // LIDER_CELULA and MIEMBRO see only their own guests
            securityFilter = {
                invitedById: user.id
            };
        }

        // Combine filters
        const whereClause = {
            AND: [securityFilter, dateFilter]
        };

        // Get total guests
        const totalGuests = await prisma.guest.count({ where: whereClause });

        // Get guests by status
        const guestsByStatus = await prisma.guest.groupBy({
            by: ['status'],
            where: whereClause,
            _count: true
        });

        const byStatus = {};
        guestsByStatus.forEach(item => {
            byStatus[item.status] = item._count;
        });

        // Calculate conversion rate
        const ganados = byStatus.GANADO || 0;
        const conversionRate = totalGuests > 0 ? ((ganados / totalGuests) * 100).toFixed(1) : 0;

        // Get top inviters
        const topInvitersData = await prisma.guest.groupBy({
            by: ['invitedById'],
            where: whereClause,
            _count: true,
            orderBy: {
                _count: {
                    invitedById: 'desc'
                }
            },
            take: 10
        });

        // Fetch inviter details
        const inviterIds = topInvitersData.map(item => item.invitedById);
        const inviters = await prisma.user.findMany({
            where: { id: { in: inviterIds } },
            select: { id: true, fullName: true }
        });

        const inviterMap = {};
        inviters.forEach(inv => {
            inviterMap[inv.id] = inv.fullName;
        });

        const topInviters = topInvitersData.map(item => ({
            id: item.invitedById,
            name: inviterMap[item.invitedById] || 'Desconocido',
            count: item._count
        }));

        res.status(200).json({
            totalGuests,
            byStatus,
            conversionRate: parseFloat(conversionRate),
            topInviters
        });
    } catch (error) {
        console.error('Error fetching guest stats:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Helper function to get user network (reused from guestController)
const getUserNetwork = async (userId) => {
    const id = parseInt(userId);
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
            const subNetwork = await getUserNetwork(disciple.id);
            networkIds = [...networkIds, ...subNetwork];
        }
    }

    return [...new Set(networkIds.filter(id => id != null))];
};

module.exports = {
    getGuestStats
};

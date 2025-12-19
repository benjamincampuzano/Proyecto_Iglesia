const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get guest statistics with date filtering
const getGuestStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const currentUserId = parseInt(req.user.id);
        const userRole = req.user.role.toUpperCase();

        // Build date filter
        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate) dateFilter.createdAt.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setUTCHours(23, 59, 59, 999);
                dateFilter.createdAt.lte = end;
            }
        }

        // Build security filter based on role
        let securityFilter = {};
        if (userRole === 'SUPER_ADMIN') {
            securityFilter = {};
        } else if (userRole === 'LIDER_DOCE' || userRole === 'PASTOR') {
            // Get network IDs
            const networkIds = await getUserNetwork(currentUserId);
            securityFilter = {
                invitedById: { in: [...networkIds, currentUserId] }
            };


        } else {
            // LIDER_CELULA and Miembro see only their own guests
            securityFilter = {
                invitedById: currentUserId
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

        // Calculate invitations by LIDER_DOCE
        // We need to fetch guests with their inviter's hierarchy info
        const guestsWithInviter = await prisma.guest.findMany({
            where: whereClause,
            select: {
                id: true,
                createdAt: true,
                invitedBy: {
                    select: {
                        id: true,
                        fullName: true,
                        role: true,
                        liderDoce: {
                            select: { fullName: true }
                        },
                        liderCelula: {
                            select: {
                                liderDoce: {
                                    select: { fullName: true }
                                }
                            }
                        },
                        pastor: {
                            select: { fullName: true }
                        }
                    }
                }
            }
        });

        const liderDoceCounts = {};
        guestsWithInviter.forEach(guest => {
            if (guest.invitedBy) {
                const inviter = guest.invitedBy;
                let leaderName = 'Sin Asignar';

                // Resolve Leader Name following the hierarchy
                if (inviter.role === 'LIDER_DOCE') {
                    leaderName = inviter.fullName;
                } else if (inviter.liderDoce) {
                    leaderName = inviter.liderDoce.fullName;
                } else if (inviter.liderCelula && inviter.liderCelula.liderDoce) {
                    leaderName = inviter.liderCelula.liderDoce.fullName;
                } else if (inviter.pastor) {
                    leaderName = inviter.pastor.fullName;
                } else if (inviter.role === 'PASTOR') {
                    leaderName = inviter.fullName;
                }

                liderDoceCounts[leaderName] = (liderDoceCounts[leaderName] || 0) + 1;
            }
        });

        const invitationsByLiderDoce = Object.entries(liderDoceCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        // Calculate Monthly Average
        // Group by YYYY-MM
        const guestsByMonth = {};
        guestsWithInviter.forEach(guest => {
            const date = new Date(guest.createdAt);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            guestsByMonth[key] = (guestsByMonth[key] || 0) + 1;
        });

        const monthsCount = Object.keys(guestsByMonth).length || 1; // Avoid division by zero
        const monthlyAverage = (totalGuests / monthsCount).toFixed(1);

        const monthlyTrend = Object.entries(guestsByMonth)
            .map(([month, count]) => ({ month, count }))
            .sort((a, b) => a.month.localeCompare(b.month));


        res.status(200).json({
            totalGuests,
            byStatus,
            conversionRate: parseFloat(conversionRate),
            topInviters,
            invitationsByLiderDoce,
            monthlyAverage: parseFloat(monthlyAverage),
            monthlyTrend
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

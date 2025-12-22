const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getNetworkIds } = require('./consolidarStatsController');

// Generar un reporte Estadístico de cantidad de personas con y sin llamadas, 
// con y sin visita por lider y por fecha.
const getGuestTrackingStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const userRole = req.user.role?.toUpperCase();
        const currentUserId = parseInt(req.user.id);

        let networkIds = [];
        if (userRole === 'LIDER_DOCE' || userRole === 'PASTOR') {
            networkIds = await getNetworkIds(currentUserId);
            networkIds.push(currentUserId);
        }

        const networkFilter = (path = 'invitedById') => {
            if (userRole === 'SUPER_ADMIN') return {};
            return { [path]: { in: networkIds } };
        };

        const end = endDate ? new Date(endDate) : new Date();
        if (endDate) end.setUTCHours(23, 59, 59, 999);

        const start = startDate ? new Date(startDate) : new Date(0); // All time if not specified
        if (startDate) start.setUTCHours(0, 0, 0, 0);

        const guests = await prisma.guest.findMany({
            where: {
                AND: [
                    { createdAt: { gte: start, lte: end } },
                    networkFilter('invitedById')
                ]
            },
            include: {
                invitedBy: {
                    include: {
                        liderDoce: true,
                        liderCelula: { include: { liderDoce: true } },
                        pastor: true,
                        leader: true
                    }
                }
            }
        });

        // Helper to get Leader Name (following hierarchy)
        const getLiderName = (user) => {
            if (!user) return 'Sin Asignar';
            const role = user.role?.toUpperCase();
            if (role === 'LIDER_DOCE') return user.fullName;
            if (user.liderDoce) return user.liderDoce.fullName;
            if (user.liderCelula && user.liderCelula.liderDoce) return user.liderCelula.liderDoce.fullName;
            if (user.pastor) return user.pastor.fullName;
            if (role === 'PASTOR') return user.fullName;
            if (user.leader) return user.leader.fullName;
            return 'Sin Asignar';
        };

        const statsByLeader = {};

        guests.forEach(guest => {
            const leaderName = getLiderName(guest.invitedBy);

            if (!statsByLeader[leaderName]) {
                statsByLeader[leaderName] = {
                    leaderName,
                    total: 0,
                    withCall: 0,
                    withoutCall: 0,
                    withVisit: 0,
                    withoutVisit: 0
                };
            }

            const stats = statsByLeader[leaderName];
            stats.total++;

            if (guest.called) {
                stats.withCall++;
            } else {
                stats.withoutCall++;
            }

            if (guest.visited) {
                stats.withVisit++;
            } else {
                stats.withoutVisit++;
            }
        });

        res.status(200).json(Object.values(statsByLeader));
    } catch (error) {
        console.error('Error fetching guest tracking stats:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getGuestTrackingStats
};

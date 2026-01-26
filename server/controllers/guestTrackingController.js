const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getUserNetwork } = require('../utils/networkUtils');

// Generar un reporte Estadístico de cantidad de personas con y sin llamadas, 
// con y sin visita por lider y por fecha.
const getGuestTrackingStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        // Fix: correctly access roles array
        const userRoles = req.user.roles || [];
        const currentUserId = req.user.id ? parseInt(req.user.id) : null;

        let networkIds = [];
        // Check if user has relevant leadership roles
        const isSuperAdmin = userRoles.includes('ADMIN');
        const isAdmin = userRoles.includes('ADMIN');
        const isLeader = userRoles.some(r => ['LIDER_DOCE', 'PASTOR', 'LIDER_CELULA'].includes(r));

        if (isLeader && currentUserId && !isSuperAdmin && !isAdmin) {
            networkIds = await getUserNetwork(currentUserId);
            networkIds.push(currentUserId);
        }

        const networkFilter = (path = 'invitedById') => {
            const baseFilter = {
                invitedBy: {
                    roles: {
                        none: {
                            role: { name: 'ADMIN' }
                        }
                    }
                }
            };

            if (isSuperAdmin || isAdmin) return baseFilter;
            // If no user ID, return empty result filter (impossible condition)
            if (!currentUserId) return { [path]: -1 };
            return {
                AND: [
                    { [path]: { in: networkIds } },
                    baseFilter
                ]
            };
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
                        profile: true,
                        parents: {
                            include: {
                                parent: {
                                    include: { profile: true }
                                }
                            }
                        }
                    }
                },
                calls: true,
                visits: true
            }
        });

        // Helper to get Leader Name (following hierarchy) using the new UserHierarchy system
        const getLiderName = (user) => {
            if (!user) return 'Sin Asignar';

            // Check parents in hierarchy
            if (user.parents && user.parents.length > 0) {
                // Priority: LIDER_DOCE -> PASTOR -> LIDER_CELULA
                const doce = user.parents.find(p => p.role === 'LIDER_DOCE')?.parent;
                if (doce) return doce.profile?.fullName || doce.email;

                const pastor = user.parents.find(p => p.role === 'PASTOR')?.parent;
                if (pastor) return pastor.profile?.fullName || pastor.email;

                const celula = user.parents.find(p => p.role === 'LIDER_CELULA')?.parent;
                if (celula) return celula.profile?.fullName || celula.email;
            }

            // Fallback: If no parent matches or no parents entry, return user's own name
            return user.profile?.fullName || user.email || 'Usuario';
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

            if (guest.calls && guest.calls.length > 0) {
                stats.withCall++;
            } else {
                stats.withoutCall++;
            }

            if (guest.visits && guest.visits.length > 0) {
                stats.withVisit++;
            } else {
                stats.withoutVisit++;
            }
        });

        res.status(200).json(Object.values(statsByLeader));
    } catch (error) {
        console.error('Error fetching guest tracking stats:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

module.exports = {
    getGuestTrackingStats
};

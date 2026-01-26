const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getUserNetwork } = require('../utils/networkUtils');

// Helper to resolve Lider Doce name for a user (walking up hierarchy)
// optimized to check populated parents
const resolveLiderDoce = (userWithParents) => {
    if (!userWithParents) return 'Sin Asignar';

    // Check if user themselves is LIDER_DOCE
    const roles = userWithParents.roles?.map(r => r.role.name) || [];
    if (roles.includes('LIDER_DOCE')) {
        return userWithParents.profile?.fullName || 'Sin Nombre';
    }

    // Traverse up (assuming parents are populated to some depth)
    // Note: detailed recursion requires DB calls, but here we depend on what's passed.
    // To do this strictly without N+1, we should probably fetch the hierarchy fully or
    // accept that we only check immediate parent/grandparent if populated.
    // For this controller, we will implement a batch fetch strategy instead of deep nested include if possible.
    // But for now, let's try to find a parent with LIDER_DOCE role in the `parents` array.

    if (userWithParents.parents && userWithParents.parents.length > 0) {
        for (const p of userWithParents.parents) {
            // p is UserHierarchy entry. p.parent is the User.
            // We need to check p.parent's role.
            if (!p.parent) continue;
            const pRoles = p.parent.roles?.map(r => r.role.name) || [];
            if (pRoles.includes('LIDER_DOCE')) {
                return p.parent.profile?.fullName || 'Sin Nombre';
            }
            // Recursive check if parent has parents populated?
            // Since we can't easily recurse infinitely in findMany include,
            // we rely on the specific query structure we use below.
            if (p.parent.parents && p.parent.parents.length > 0) {
                return resolveLiderDoce(p.parent);
            }
        }
    }

    // If not found, maybe they are under a PASTOR directly? 
    if (roles.includes('PASTOR')) return userWithParents.profile?.fullName || 'Sin Nombre';
    if (userWithParents.parents?.some(p => p.parent?.roles?.some(r => r.role.name === 'PASTOR'))) {
        const pastor = userWithParents.parents.find(p => p.parent.roles.some(r => r.role.name === 'PASTOR'));
        return pastor.parent.profile.fullName;
    }

    return 'Sin Asignar';
};

// Get guest statistics with date filtering
const getGuestStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const currentUserId = parseInt(req.user.id);
        const userRoles = req.user.roles || [];
        const isSuperAdmin = userRoles.includes('ADMIN');
        const isPastor = userRoles.includes('PASTOR');
        const isLiderDoce = userRoles.includes('LIDER_DOCE');

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
        if (isSuperAdmin) {
            securityFilter = {};
        } else if (isLiderDoce || isPastor) {
            // Get network IDs
            const networkIds = await getUserNetwork(currentUserId);
            securityFilter = {
                invitedById: { in: [...networkIds, currentUserId] }
            };
        } else {
            // LIDER_CELULA and DISCIPULO see only their own guests
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

        // Get top inviters (Count only)
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

        // Fetch inviter details for top inviters
        const inviterIds = topInvitersData.map(item => item.invitedById);
        const inviters = await prisma.user.findMany({
            where: { id: { in: inviterIds } },
            select: { id: true, profile: { select: { fullName: true } } }
        });

        const inviterMap = {};
        inviters.forEach(inv => {
            inviterMap[inv.id] = inv.profile?.fullName || 'Sin Nombre';
        });

        const topInviters = topInvitersData.map(item => ({
            id: item.invitedById,
            name: inviterMap[item.invitedById] || 'Desconocido',
            count: item._count
        }));

        // Calculate invitations by LIDER_DOCE
        // 1. Fetch all guests (id + inviterId)
        const guestsWithInviterId = await prisma.guest.findMany({
            where: whereClause,
            select: { invitedById: true, createdAt: true }
        });

        // 2. Get unique inviter IDs
        const uniqueInviterIds = [...new Set(guestsWithInviterId.map(g => g.invitedById))];

        // 3. Fetch detailed info for these inviters (Hierarchy up to 3 levels)
        const hierarchyInclude = {
            include: {
                parent: {
                    include: {
                        profile: true,
                        roles: { include: { role: true } },
                        parents: { // Level 2
                            include: {
                                parent: {
                                    include: {
                                        profile: true,
                                        roles: { include: { role: true } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };

        const detailedInviters = await prisma.user.findMany({
            where: { id: { in: uniqueInviterIds } },
            include: {
                profile: true,
                roles: { include: { role: true } },
                parents: hierarchyInclude // Level 1
                // Note: We are nesting 2 levels deep in `hierarchyInclude`.
                // User -> parents (L1) -> parent -> parents (L2) -> parent.
            }
        });

        const inviterLiderMap = {}; // userId -> LiderName
        detailedInviters.forEach(inv => {
            inviterLiderMap[inv.id] = resolveLiderDoce(inv);
        });

        // 4. Map guests to their leader
        const liderDoceCounts = {};
        guestsWithInviterId.forEach(guest => {
            const leaderName = inviterLiderMap[guest.invitedById] || 'Sin Asignar';
            liderDoceCounts[leaderName] = (liderDoceCounts[leaderName] || 0) + 1;
        });

        const invitationsByLiderDoce = Object.entries(liderDoceCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        // Calculate Monthly Average
        const guestsByMonth = {};
        guestsWithInviterId.forEach(guest => {
            const date = new Date(guest.createdAt);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            guestsByMonth[key] = (guestsByMonth[key] || 0) + 1;
        });

        const monthsCount = Object.keys(guestsByMonth).length || 1;
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

module.exports = {
    getGuestStats
};

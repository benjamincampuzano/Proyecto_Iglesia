const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all users with role LIDER_DOCE
 */
const getLosDoce = async (req, res) => {
    try {
        const losDoce = await prisma.user.findMany({
            where: {
                role: 'LIDER_DOCE'
            },
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

        res.json(losDoce);
    } catch (error) {
        console.error('Error fetching Los Doce:', error);
        res.status(500).json({ error: 'Error fetching Los Doce' });
    }
};

/**
 * Get the discipleship network for a specific user using new hierarchical structure
 */
const getNetwork = async (req, res) => {
    try {
        const { userId } = req.params;
        const requesterRole = req.user.role;
        const isCellLeaderView = requesterRole === 'LIDER_CELULA';

        // Fetch the user with their complete network using new fields
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            include: {
                // Get disciples based on new hierarchical fields
                DiscipulosCelula: {
                    include: {
                        DiscipulosCelula: {
                            include: {
                                assignedGuests: true,
                                invitedGuests: true
                            }
                        },
                        assignedGuests: true,
                        invitedGuests: true
                    }
                },
                DiscipulosDoce: {
                    include: {
                        DiscipulosCelula: {
                            include: {
                                assignedGuests: true,
                                invitedGuests: true
                            }
                        },
                        assignedGuests: true,
                        invitedGuests: true
                    }
                },
                DiscipulosPastor: {
                    include: {
                        DiscipulosDoce: {
                            include: {
                                DiscipulosCelula: {
                                    include: {
                                        assignedGuests: true,
                                        invitedGuests: true
                                    }
                                },
                                assignedGuests: true,
                                invitedGuests: true
                            }
                        },
                        assignedGuests: true,
                        invitedGuests: true
                    }
                },
                assignedGuests: true,
                invitedGuests: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Build unified disciples array from all hierarchical relationships
        const allDisciples = [
            ...(user.DiscipulosCelula || []),
            ...(user.DiscipulosDoce || []),
            ...(user.DiscipulosPastor || [])
        ];

        // Remove duplicates (in case a user appears in multiple relationships)
        const uniqueDisciples = Array.from(
            new Map(allDisciples.map(d => [d.id, d])).values()
        );

        // Apply cell leader restrictions
        if (isCellLeaderView) {
            // LIDER_CELULA can only see their direct disciples (DiscipulosCelula)
            const filteredDisciples = uniqueDisciples.filter(disciple =>
                disciple.liderCelulaId === user.id
            );

            const networkData = {
                ...user,
                disciples: filteredDisciples.map(disciple => ({
                    ...disciple,
                    disciples: [] // Cell leaders don't see deeper levels
                }))
            };

            return res.json(networkData);
        }

        // For other roles, return full network
        const networkData = {
            ...user,
            disciples: uniqueDisciples
        };

        res.json(networkData);
    } catch (error) {
        console.error('Error fetching network:', error);
        res.status(500).json({ error: 'Error fetching network' });
    }
};

/**
 * Get available users that can be assigned to a leader
 * Uses new hierarchical fields
 */
const getAvailableUsers = async (req, res) => {
    try {
        const { leaderId } = req.params;
        const requesterId = req.user.id;
        const requesterRole = req.user.role;

        // Permission check
        if (!['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA'].includes(requesterRole)) {
            return res.status(403).json({ error: 'No tienes permisos para gestionar redes' });
        }

        // Get the leader to determine what role they are
        const leader = await prisma.user.findUnique({
            where: { id: parseInt(leaderId) },
            select: { id: true, role: true, pastorId: true, liderDoceId: true }
        });

        if (!leader) {
            return res.status(404).json({ error: 'Líder no encontrado' });
        }

        let whereClause;

        if (requesterRole === 'ADMIN') {
            // ADMIN can see all users except the leader themselves
            whereClause = {
                id: { not: parseInt(leaderId) }
            };
        } else if (requesterRole === 'PASTOR') {
            // PASTOR can see users in their network or without leaders
            const networkUsers = await prisma.user.findMany({
                where: {
                    OR: [
                        { pastorId: requesterId },
                        { liderDoceId: { in: await getUsersWithPastorId(requesterId) } }
                    ]
                },
                select: { id: true }
            });

            const networkUserIds = networkUsers.map(u => u.id);

            whereClause = {
                AND: [
                    { id: { not: parseInt(leaderId) } },
                    { role: { not: 'ADMIN' } },
                    { role: { not: 'PASTOR' } },
                    {
                        OR: [
                            { pastorId: null, liderDoceId: null, liderCelulaId: null },
                            { id: { in: networkUserIds } }
                        ]
                    }
                ]
            };
        } else if (requesterRole === 'LIDER_DOCE') {
            // LIDER_DOCE can see users in their network
            const networkUsers = await prisma.user.findMany({
                where: {
                    OR: [
                        { liderDoceId: requesterId },
                        { liderCelulaId: { in: await getUsersWithLiderDoceId(requesterId) } }
                    ]
                },
                select: { id: true }
            });

            const networkUserIds = networkUsers.map(u => u.id);

            whereClause = {
                AND: [
                    { id: { not: parseInt(leaderId) } },
                    { role: { not: 'LIDER_DOCE' } },
                    { role: { not: 'ADMIN' } },
                    { role: { not: 'PASTOR' } },
                    {
                        OR: [
                            { liderDoceId: null, liderCelulaId: null },
                            { id: { in: networkUserIds } }
                        ]
                    }
                ]
            };
        } else if (requesterRole === 'LIDER_CELULA') {
            // LIDER_CELULA can see users in their network
            const networkUsers = await prisma.user.findMany({
                where: {
                    OR: [
                        { liderCelulaId: requesterId },
                        {
                            liderCelula: {
                                liderCelulaId: requesterId
                            }
                        }
                    ]
                },
                select: { id: true }
            });

            const networkUserIds = networkUsers.map(u => u.id);

            whereClause = {
                AND: [
                    { id: { not: parseInt(leaderId) } },
                    { role: { not: 'LIDER_CELULA' } },
                    { role: { not: 'LIDER_DOCE' } },
                    { role: { not: 'ADMIN' } },
                    { role: { not: 'PASTOR' } },
                    {
                        OR: [
                            { liderCelulaId: null },
                            { id: { in: networkUserIds } }
                        ]
                    }
                ]
            };
        }

        const availableUsers = await prisma.user.findMany({
            where: whereClause,
            select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                pastorId: true,
                liderDoceId: true,
                liderCelulaId: true,
                pastor: {
                    select: { id: true, fullName: true, role: true }
                },
                liderDoce: {
                    select: { id: true, fullName: true, role: true }
                },
                liderCelula: {
                    select: { id: true, fullName: true, role: true }
                }
            },
            orderBy: {
                fullName: 'asc'
            }
        });

        res.json(availableUsers);
    } catch (error) {
        console.error('Error fetching available users:', error);
        res.status(500).json({ error: 'Error al obtener usuarios disponibles' });
    }
};

// Helper functions
async function getUsersWithPastorId(pastorId) {
    const users = await prisma.user.findMany({
        where: { pastorId },
        select: { id: true }
    });
    return users.map(u => u.id);
}

async function getUsersWithLiderDoceId(liderDoceId) {
    const users = await prisma.user.findMany({
        where: { liderDoceId },
        select: { id: true }
    });
    return users.map(u => u.id);
}

module.exports = {
    getLosDoce,
    getNetwork,
    getAvailableUsers
};

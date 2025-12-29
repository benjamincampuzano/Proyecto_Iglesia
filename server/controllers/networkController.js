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
 * Get the discipleship network for a specific user using hierarchical structure
 */
const getNetwork = async (req, res) => {
    try {
        const { userId } = req.params;
        const requesterRole = req.user.role;
        const isCellLeaderView = requesterRole === 'LIDER_CELULA';

        // Fetch user with all their disciples from different hierarchical levels
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            include: {
                // Level 1: Direct disciples through different relationships
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
                DiscipulosPastor: {
                    include: {
                        DiscipulosDoce: {
                            include: {
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
                                assignedGuests: true,
                                invitedGuests: true
                            }
                        },
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
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Helper to recursively collect all users from the nested structure
        const collectAllDisciples = (userNode) => {
            let collected = [];

            const arrays = [
                userNode.DiscipulosCelula || [],
                userNode.DiscipulosDoce || [],
                userNode.DiscipulosPastor || []
            ];

            for (const array of arrays) {
                for (const disciple of array) {
                    collected.push(disciple);
                    // Recursively collect from this disciple
                    collected = [...collected, ...collectAllDisciples(disciple)];
                }
            }

            return collected;
        };

        // Get all disciples flattened
        const allDisciples = collectAllDisciples(user);

        // Remove duplicates
        const uniqueDisciples = Array.from(
            new Map(allDisciples.map(d => [d.id, d])).values()
        );

        // Build hierarchy recursively
        const buildHierarchy = (currentUser, disciples) => {
            const isTargetAnotherLeader = currentUser.role === 'LIDER_CELULA' && currentUser.id !== parseInt(userId);

            if (isCellLeaderView && isTargetAnotherLeader) {
                return {
                    id: currentUser.id,
                    fullName: currentUser.fullName,
                    email: currentUser.email,
                    role: currentUser.role,
                    assignedGuests: [],
                    invitedGuests: [],
                    disciples: []
                };
            }

            // Get this user's disciples from the merged list
            // PRIORITIZE HIERARCHY:
            // 1. If user has liderCelulaId, they only appear under that leader
            // 2. If user has liderDoceId (and no liderCelulaId), they appear under Doce leader
            // 3. If user has pastorId (and no others), they appear under Pastor
            const userDisciples = disciples.filter(d => {
                // If I am their Cell Leader, always show them
                if (d.liderCelulaId === currentUser.id) return true;

                // If I am their Doce Leader
                if (d.liderDoceId === currentUser.id) {
                    // Only show if they DO NOT have a Cell Leader
                    // (Or if I am also their Cell Leader, which is caught above)
                    return !d.liderCelulaId;
                }

                // If I am their Pastor
                if (d.pastorId === currentUser.id) {
                    // Only show if they DO NOT have Cell Leader OR Doce Leader
                    return !d.liderCelulaId && !d.liderDoceId;
                }

                return false;
            });

            return {
                id: currentUser.id,
                fullName: currentUser.fullName,
                email: currentUser.email,
                role: currentUser.role,
                assignedGuests: currentUser.assignedGuests || [],
                invitedGuests: currentUser.invitedGuests || [],
                disciples: userDisciples.map(disciple => buildHierarchy(disciple, disciples))
            };
        };

        const network = buildHierarchy(user, uniqueDisciples);
        res.json(network);
    } catch (error) {
        console.error('Error fetching network:', error);
        res.status(500).json({ error: 'Error fetching network' });
    }
};

/**
 * Get available users that can be assigned to a leader
 */
const getAvailableUsers = async (req, res) => {
    try {
        const { leaderId } = req.params;
        const requesterId = req.user.id;
        const requesterRole = req.user.role;

        if (!['SUPER_ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA'].includes(requesterRole)) {
            return res.status(403).json({ error: 'No tienes permisos para gestionar redes' });
        }

        const leader = await prisma.user.findUnique({
            where: { id: parseInt(leaderId) },
            select: { id: true, role: true, pastorId: true, liderDoceId: true }
        });

        if (!leader) {
            return res.status(404).json({ error: 'Líder no encontrado' });
        }

        let whereClause;

        if (requesterRole === 'SUPER_ADMIN') {
            whereClause = {
                id: { not: parseInt(leaderId) }
            };
        } else if (requesterRole === 'PASTOR') {
            const networkUsers = await prisma.user.findMany({
                where: {
                    OR: [
                        { pastorId: requesterId },
                        { liderDoce: { pastorId: requesterId } },
                        { liderCelula: { liderDoce: { pastorId: requesterId } } }
                    ]
                },
                select: { id: true }
            });

            const networkUserIds = networkUsers.map(u => u.id);

            whereClause = {
                AND: [
                    { id: { not: parseInt(leaderId) } },
                    { role: { not: 'SUPER_ADMIN' } },
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
            const networkUsers = await prisma.user.findMany({
                where: {
                    OR: [
                        { liderDoceId: requesterId },
                        { liderCelula: { liderDoceId: requesterId } }
                    ]
                },
                select: { id: true }
            });

            const networkUserIds = networkUsers.map(u => u.id);

            whereClause = {
                AND: [
                    { id: { not: parseInt(leaderId) } },
                    { role: { not: 'LIDER_DOCE' } },
                    { role: { not: 'SUPER_ADMIN' } },
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
            const networkUsers = await prisma.user.findMany({
                where: {
                    OR: [
                        { liderCelulaId: requesterId },
                        { liderCelula: { liderCelulaId: requesterId } }
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
                    { role: { not: 'SUPER_ADMIN' } },
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

/**
 * Assign a user to a leader's network using hierarchical structure
 */
const assignUserToLeader = async (req, res) => {
    try {
        const { userId, leaderId } = req.body;
        const requesterId = req.user.id;
        const requesterRole = req.user.role;

        if (!userId || !leaderId) {
            return res.status(400).json({ error: 'userId y leaderId son requeridos' });
        }

        if (!['SUPER_ADMIN', 'LIDER_DOCE', 'LIDER_CELULA'].includes(requesterRole)) {
            return res.status(403).json({ error: 'No tienes permisos para gestionar redes' });
        }

        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            include: {
                pastor: true,
                liderDoce: true,
                liderCelula: true
            }
        });

        const leader = await prisma.user.findUnique({
            where: { id: parseInt(leaderId) },
            include: {
                pastor: true,
                liderDoce: true
            }
        });

        if (!user || !leader) {
            return res.status(404).json({ error: 'Usuario o líder no encontrado' });
        }

        // Global validation: Only SUPER_ADMIN can add other SUPER_ADMIN
        if (requesterRole !== 'SUPER_ADMIN' && user.role === 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'No puedes agregar a un Administrador' });
        }

        // Determine update data based on leader role
        let updateData = {};

        if (leader.role === 'PASTOR') {
            updateData = { pastorId: leader.id };
        } else if (leader.role === 'LIDER_DOCE') {
            updateData = {
                liderDoceId: leader.id,
                pastorId: leader.pastorId
            };
        } else if (leader.role === 'LIDER_CELULA') {
            updateData = {
                liderCelulaId: leader.id,
                liderDoceId: leader.liderDoceId,
                pastorId: leader.liderDoce?.pastorId || null
            };
        }

        // Role-specific validations
        if (requesterRole === 'LIDER_DOCE') {
            // Cannot add other LIDER_DOCE
            if (user.role === 'LIDER_DOCE') {
                return res.status(403).json({ error: 'No puedes agregar a otro Líder de Los Doce' });
            }

            // Can only assign to themselves or to LIDER_CELULA in their network
            if (parseInt(leaderId) !== requesterId) {
                const isValidTarget = leader.role === 'LIDER_CELULA' && leader.liderDoceId === requesterId;
                if (!isValidTarget) {
                    return res.status(403).json({ error: 'Solo puedes asignar a Líderes de Célula en tu red' });
                }
            }

            // Verify user is in network
            if (user.liderDoceId !== null || user.liderCelulaId !== null) {
                const isInNetwork = await checkUserInLiderDoceNetwork(userId, requesterId);
                if (!isInNetwork) {
                    return res.status(403).json({ error: 'Solo puedes reasignar usuarios de tu propia red' });
                }
            }
        } else if (requesterRole === 'LIDER_CELULA') {
            // Cannot add other LIDER_CELULA
            if (user.role === 'LIDER_CELULA') {
                return res.status(403).json({ error: 'No puedes agregar a otro Líder de Célula' });
            }

            // Cannot add LIDER_DOCE
            if (user.role === 'LIDER_DOCE') {
                return res.status(403).json({ error: 'No puedes agregar a un Líder de Los Doce' });
            }

            // Can only assign to own network
            if (parseInt(leaderId) !== requesterId) {
                return res.status(403).json({ error: 'Solo puedes agregar usuarios a tu propia red' });
            }

            // Verify user is in network
            if (user.liderCelulaId !== null) {
                const isInNetwork = await checkUserInLiderCelulaNetwork(userId, requesterId);
                if (!isInNetwork) {
                    return res.status(403).json({ error: 'Solo puedes reasignar usuarios de tu propia red' });
                }
            }
        }

        // Update the user
        const updatedUser = await prisma.user.update({
            where: { id: parseInt(userId) },
            data: updateData,
            select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                pastorId: true,
                liderDoceId: true,
                liderCelulaId: true
            }
        });

        res.json({
            message: 'Usuario asignado exitosamente',
            user: updatedUser
        });
    } catch (error) {
        console.error('Error assigning user to leader:', error);
        res.status(500).json({ error: 'Error al asignar usuario al líder' });
    }
};

/**
 * Remove a user from their leader's network
 */
const removeUserFromNetwork = async (req, res) => {
    try {
        const { userId } = req.params;
        const requesterId = req.user.id;
        const requesterRole = req.user.role;

        if (!['SUPER_ADMIN', 'LIDER_DOCE', 'LIDER_CELULA'].includes(requesterRole)) {
            return res.status(403).json({ error: 'No tienes permisos para gestionar redes' });
        }

        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            include: {
                pastor: true,
                liderDoce: true,
                liderCelula: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        if (!user.pastorId && !user.liderDoceId && !user.liderCelulaId) {
            return res.status(400).json({ error: 'El usuario no tiene un líder asignado' });
        }

        // Permission check: Non-admins can only remove from their own network
        if (requesterRole !== 'SUPER_ADMIN') {
            const isInNetwork = await checkUserInNetwork(userId, requesterId, requesterRole);
            if (!isInNetwork) {
                return res.status(403).json({ error: 'Solo puedes remover usuarios de tu propia red' });
            }
        }

        // Determine what to remove based on hierarchy
        let updateData = {};

        if (user.liderCelulaId) {
            // Remove from LIDER_CELULA (keeps LIDER_DOCE and PASTOR)
            updateData = { liderCelulaId: null };
        } else if (user.liderDoceId) {
            // Remove from LIDER_DOCE (only SUPER_ADMIN can do this)
            if (requesterRole !== 'SUPER_ADMIN') {
                return res.status(403).json({ error: 'No tienes permisos para remover de este nivel' });
            }
            updateData = { liderDoceId: null, liderCelulaId: null };
        } else if (user.pastorId) {
            // Remove from PASTOR (only SUPER_ADMIN)
            if (requesterRole !== 'SUPER_ADMIN') {
                return res.status(403).json({ error: 'Solo SUPER_ADMIN puede remover de este nivel' });
            }
            updateData = { pastorId: null, liderDoceId: null, liderCelulaId: null };
        }

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(userId) },
            data: updateData,
            select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                pastorId: true,
                liderDoceId: true,
                liderCelulaId: true
            }
        });

        res.json({
            message: 'Usuario removido exitosamente de la red',
            user: updatedUser
        });
    } catch (error) {
        console.error('Error removing user from network:', error);
        res.status(500).json({ error: 'Error al remover usuario de la red' });
    }
};

// Helper functions for network checking
async function checkUserInPastorNetwork(userId, pastorId) {
    const user = await prisma.user.findFirst({
        where: {
            id: parseInt(userId),
            OR: [
                { pastorId: pastorId },
                { liderDoce: { pastorId: pastorId } },
                { liderCelula: { liderDoce: { pastorId: pastorId } } }
            ]
        }
    });
    return !!user;
}

async function checkUserInLiderDoceNetwork(userId, liderDoceId) {
    const user = await prisma.user.findFirst({
        where: {
            id: parseInt(userId),
            OR: [
                { liderDoceId: liderDoceId },
                { liderCelula: { liderDoceId: liderDoceId } }
            ]
        }
    });
    return !!user;
}

async function checkUserInLiderCelulaNetwork(userId, liderCelulaId) {
    const user = await prisma.user.findFirst({
        where: {
            id: parseInt(userId),
            OR: [
                { liderCelulaId: liderCelulaId },
                { liderCelula: { liderCelulaId: liderCelulaId } }
            ]
        }
    });
    return !!user;
}

async function checkUserInNetwork(userId, requesterId, requesterRole) {
    if (requesterRole === 'PASTOR') {
        return await checkUserInPastorNetwork(userId, requesterId);
    } else if (requesterRole === 'LIDER_DOCE') {
        return await checkUserInLiderDoceNetwork(userId, requesterId);
    } else if (requesterRole === 'LIDER_CELULA') {
        return await checkUserInLiderCelulaNetwork(userId, requesterId);
    }
    return false;
}

/**
 * Get all users with role PASTOR
 */
const getPastores = async (req, res) => {
    try {
        const pastores = await prisma.user.findMany({
            where: {
                role: 'PASTOR'
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

        res.json(pastores);
    } catch (error) {
        console.error('Error fetching Pastores:', error);
        res.status(500).json({ error: 'Error fetching Pastores' });
    }
};

module.exports = {
    getLosDoce,
    getPastores,
    getNetwork,
    getAvailableUsers,
    assignUserToLeader,
    removeUserFromNetwork
};

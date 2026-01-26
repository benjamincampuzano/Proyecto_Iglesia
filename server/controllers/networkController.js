const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getUserNetwork, checkCycle } = require('../utils/networkUtils');

/**
 * Get all users with role LIDER_DOCE
 */
const getLosDoce = async (req, res) => {
    try {
        const losDoce = await prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        role: {
                            name: 'LIDER_DOCE'
                        }
                    },
                    none: {
                        role: { name: 'ADMIN' }
                    }
                }
            },
            select: {
                id: true,
                email: true,
                profile: {
                    select: { fullName: true }
                },
                roles: {
                    include: {
                        role: true
                    }
                }
            },
            orderBy: {
                profile: {
                    fullName: 'asc'
                }
            }
        });

        const formattedLosDoce = losDoce.map(d => ({
            id: d.id,
            fullName: d.profile?.fullName || 'Sin Nombre',
            email: d.email,
            roles: d.roles.map(r => r.role.name)
        }));

        res.json(formattedLosDoce);
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
        const rootId = parseInt(userId);

        // Fetch the user to confirm existence
        const rootUser = await prisma.user.findUnique({
            where: { id: rootId },
            include: {
                profile: true,
                roles: { include: { role: true } },
                parents: { include: { parent: { include: { profile: true, roles: { include: { role: true } } } } } }
            }
        });

        if (!rootUser) return res.status(404).json({ error: 'User not found' });

        // Helper to recursively build tree
        // Note: Doing deep recursion with single query is hard. 
        // We will fetch all descendants first (using our CTE util) and then structure them in memory.
        const allDescendantIds = await getUserNetwork(rootId);

        // Fetch all descendants with their children details
        // We need to fetch 'parents' to link them back to the tree
        // OR we can fetch 'children' on everyone? 
        // Efficient way: Fetch all involved users (root + descendants).
        const allIds = [rootId, ...allDescendantIds];

        const allUsers = await prisma.user.findMany({
            where: {
                id: { in: allIds },
                roles: {
                    none: {
                        role: { name: 'ADMIN' }
                    }
                }
            },
            include: {
                profile: true,
                roles: { include: { role: true } },
                children: { // Get direct children for linkage
                    include: {
                        child: true // We just need ID mainly, but full details helps validation
                    }
                },
                parents: { // To know who is their parent in THIS sub-network
                    include: {
                        parent: {
                            include: {
                                profile: true,
                                roles: { include: { role: true } }
                            }
                        }
                    }
                },
                _count: { select: { invitedGuests: true, assignedGuests: true } }
            }
        });

        const userMap = new Map();
        allUsers.forEach(u => userMap.set(u.id, u));

        // Function to build node
        const buildNode = (currentUserId) => {
            const currentUser = userMap.get(currentUserId);
            if (!currentUser) return null;

            // Resolve immediate hierarchy info (parents)
            const parentEntries = currentUser.parents || [];
            // Map parents to useful structure
            const leaders = {
                pastor: parentEntries.find(p => p.role === 'PASTOR')?.parent,
                liderDoce: parentEntries.find(p => p.role === 'LIDER_DOCE')?.parent,
                liderCelula: parentEntries.find(p => p.role === 'LIDER_CELULA')?.parent
            };

            // Find children in the fetched set
            // We use the `children` relation on the user
            const directChildrenEdges = currentUser.children || [];

            // Filter children that are part of our network set (descendants)
            // and build their nodes
            const discipleNodes = directChildrenEdges
                .filter(edge => userMap.has(edge.childId)) // Only include those we fetched
                .map(edge => buildNode(edge.childId))
                .filter(n => n !== null);

            return {
                id: currentUser.id,
                fullName: currentUser.profile?.fullName || 'Sin Nombre',
                email: currentUser.email,
                roles: currentUser.roles.map(r => r.role.name),
                assignedGuests: [], // Simplification: we didn't fetch full guest lists to keep it light
                invitedGuests: [],
                pastor: leaders.pastor ? { id: leaders.pastor.id, fullName: leaders.pastor.profile?.fullName } : null,
                liderDoce: leaders.liderDoce ? { id: leaders.liderDoce.id, fullName: leaders.liderDoce.profile?.fullName } : null,
                liderCelula: leaders.liderCelula ? { id: leaders.liderCelula.id, fullName: leaders.liderCelula.profile?.fullName } : null,
                disciples: discipleNodes
            };
        };

        const tree = buildNode(rootId);
        res.json(tree);

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
        const requesterRole = req.user.role; // This logic might fail if req.user.role is not populated? 
        // Auth middleware populates roles array `req.user.roles`
        const userRoles = req.user.roles || [];
        // Determine primary role for logic (simplification)
        const primaryRole = userRoles.includes('ADMIN') ? 'ADMIN' :
            userRoles.includes('PASTOR') ? 'PASTOR' :
                userRoles.includes('LIDER_DOCE') ? 'LIDER_DOCE' :
                    userRoles.includes('LIDER_CELULA') ? 'LIDER_CELULA' : 'DISCIPULO';

        // ... logic for availability ...
        // Simplification: Return all users not in hierarchy of leader?
        // This is complex. For now, let's return all users except leader and self, 
        // possibly filtered by network if not admin.

        let whereClause = {
            id: { not: parseInt(leaderId) }
        };

        if (primaryRole !== 'ADMIN' && primaryRole !== 'PASTOR') {
            // Constrain to network
            const networkIds = await getUserNetwork(requesterId);
            whereClause.id.in = [...networkIds];
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            select: {
                id: true,
                profile: { select: { fullName: true } },
                roles: { include: { role: true } },
                parents: {
                    include: {
                        parent: { select: { id: true, profile: { select: { fullName: true } }, roles: { include: { role: true } } } }
                    }
                }
            },
            take: 100, // Limit
            orderBy: { profile: { fullName: 'asc' } }
        });

        const formatted = users.map(u => {
            // Resolve leaders
            const p = u.parents.find(p => p.role === 'PASTOR')?.parent;
            const ld = u.parents.find(p => p.role === 'LIDER_DOCE')?.parent;
            const lc = u.parents.find(p => p.role === 'LIDER_CELULA')?.parent;

            return {
                id: u.id,
                fullName: u.profile?.fullName,
                roles: u.roles.map(r => r.role.name),
                pastor: p ? { id: p.id, fullName: p.profile?.fullName } : null,
                liderDoce: ld ? { id: ld.id, fullName: ld.profile?.fullName } : null,
                liderCelula: lc ? { id: lc.id, fullName: lc.profile?.fullName } : null
            };
        });

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching available users:', error);
        res.status(500).json({ error: 'Error al obtener usuarios disponibles' });
    }
};

const { assignHierarchy } = require('../services/hierarchyService');

// ...

/**
 * Assign a user to a leader's network using hierarchical structure
 */
const assignUserToLeader = async (req, res) => {
    try {
        const { userId, leaderId } = req.body;

        const leader = await prisma.user.findUnique({
            where: { id: parseInt(leaderId) },
            include: { roles: { include: { role: true } } }
        });

        if (!leader) return res.status(404).json({ error: 'Leader not found' });

        // Determine hierarchy role based on leader's primary role
        const leaderRoles = leader.roles.map(r => r.role.name);
        let hierarchyRole = 'DISCIPULO';
        if (leaderRoles.includes('PASTOR')) hierarchyRole = 'PASTOR';
        else if (leaderRoles.includes('LIDER_DOCE')) hierarchyRole = 'LIDER_DOCE';
        else if (leaderRoles.includes('LIDER_CELULA')) hierarchyRole = 'LIDER_CELULA';

        // Use Service for centralized logic
        await assignHierarchy({
            parentId: parseInt(leaderId),
            childId: parseInt(userId),
            role: hierarchyRole
        });

        res.json({ message: 'Usuario asignado exitosamente' });
    } catch (error) {
        console.error('Error assigning user to leader:', error);
        res.status(500).json({ error: error.message || 'Error al asignar usuario al líder' });
    }
};

/**
 * Remove a user from their leader's network
 */
const removeUserFromNetwork = async (req, res) => {
    try {
        const { userId } = req.params;
        // In hierarchical system, "removing from network" means removing the link to the parent.
        // But which parent? The request implies context.
        // For simplicity, we remove *all* hierarchical links? No, that orphans them.
        // Usually UI allows identifying which link.
        // If we don't have that info, we might check requester permissions.
        // If requester is LIDER_CELULA, remove LIDER_CELULA link.

        const requesterRoles = req.user.roles || [];
        let targetRole = 'DISCIPULO';
        if (requesterRoles.includes('LIDER_CELULA')) targetRole = 'LIDER_CELULA';
        else if (requesterRoles.includes('LIDER_DOCE')) targetRole = 'LIDER_DOCE';
        else if (requesterRoles.includes('PASTOR')) targetRole = 'PASTOR';
        else if (requesterRoles.includes('ADMIN')) {
            // Admin can remove anything, maybe pass as query param?
            // For now, remove all? Dangerous.
            // Let's assume we remove all parents for now to "reset" assignment.
            await prisma.userHierarchy.deleteMany({
                where: { childId: parseInt(userId) }
            });
            return res.json({ message: 'Usuario removido de toda red' });
        }

        await prisma.userHierarchy.deleteMany({
            where: {
                childId: parseInt(userId),
                role: targetRole
            }
        });

        res.json({ message: 'Usuario removido exitosamente de la red' });
    } catch (error) {
        console.error('Error removing user from network:', error);
        res.status(500).json({ error: 'Error al remover usuario de la red' });
    }
};
// Helper functions for network checking 
// (Removed as we used simpler logic above or networkUtils)

/**
 * Get all users with role PASTOR
 */
const getPastores = async (req, res) => {
    try {
        const pastores = await prisma.user.findMany({
            where: {
                roles: { some: { role: { name: { in: ['PASTOR', 'ADMIN'] } } } }
            },
            select: {
                id: true,
                email: true,
                profile: { select: { fullName: true } },
                roles: { include: { role: true } }
            },
            orderBy: { profile: { fullName: 'asc' } }
        });

        const formatted = pastores.map(p => ({
            id: p.id,
            fullName: p.profile?.fullName || 'Sin Nombre',
            email: p.email,
            roles: p.roles.map(r => r.role.name)
        }));

        res.json(formatted);
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

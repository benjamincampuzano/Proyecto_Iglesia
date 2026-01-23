const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all descendant user IDs in the network of a leader (recursive).
 * Uses a recursive CTE for performance.
 * @param {number|string} leaderId 
 * @returns {Promise<number[]>} Array of user IDs
 */
const getUserNetwork = async (leaderId) => {
    const id = parseInt(leaderId);
    if (isNaN(id)) return [];

    try {
        // Recursive CTE to get all descendants from UserHierarchy
        // This query finds all users where there is a path from leaderId to them in UserHierarchy table
        const descendants = await prisma.$queryRaw`
            WITH RECURSIVE hierarchy AS (
                SELECT "childId"
                FROM "UserHierarchy"
                WHERE "parentId" = ${id}
                UNION ALL
                SELECT uh."childId"
                FROM "UserHierarchy" uh
                INNER JOIN hierarchy h ON uh."parentId" = h."childId"
            )
            SELECT DISTINCT "childId" FROM hierarchy;
        `;

        return descendants.map(d => d.childId);
    } catch (error) {
        console.error('Error in getUserNetwork utils:', error);
        return [];
    }
};

/**
 * Get the "12 Leader" (Lider Doce) for a specific user by traversing up the hierarchy.
 * @param {number} userId 
 * @returns {Promise<{ name: string } | null>}
 */
const getLiderDoceName = async (userId) => {
    // Since we don't have direct relations, we have to walk up "parents".
    // A user might have multiple parents entries in UserHierarchy (e.g. historical),
    // but usually one active for structure.
    // hierarchy roles: PASTOR, LIDER_DOCE, LIDER_CELULA, DISCIPULO

    // We fetch the user with parents recursively (up to reasonable depth, e.g. 3 levels)
    // to find the first ancestor with valid role/status to be "Lider Doce".
    // Alternatively, we can do a reverse CTE if supported, or iterative lookup.
    // Iterative is safer for complex logic.

    let currentId = userId;
    let depth = 0;
    while (depth < 5) { // Safety break
        const userWithParents = await prisma.user.findUnique({
            where: { id: currentId },
            include: {
                roles: { include: { role: true } },
                parents: {
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
        });

        if (!userWithParents) return null;

        // Check if current user IS a Lider Doce (and not the start user if we are strict, but usually leader IS their own leader if they are at that level?)
        // The original logic checked inviter's role.
        if (userWithParents.roles.some(r => r.role.name === 'LIDER_DOCE')) {
            return { name: userWithParents.profile?.fullName || 'Sin Nombre' };
        }

        // If not found, look for parent.
        // Assuming single parent structure in UserHierarchy for line of command.
        // Ideally we pick the parent that is LIDER_DOCE, LIDER_CELULA etc.
        const parentEntry = userWithParents.parents[0]; // Simplification: take first parent
        if (!parentEntry) return null; // No parent, stop

        currentId = parentEntry.parentId;
        depth++;
    }
    return null;
};

module.exports = {
    getUserNetwork,
    getLiderDoceName,
    checkCycle: async (childId, potentialParentId) => {
        // A cycle exists if potentialParentId is already a descendant of childId
        // OR if childId is an ancestor of potentialParentId.
        // We can reuse getUserNetwork to see if potentialParentId is in childId's downstream network.

        // However, a cycle is created if we assign Child -> Parent, but Parent is already IN Child's subtree.
        // So checking if Parent is in Child's network is sufficient.

        const descendants = await getUserNetwork(childId);
        return descendants.includes(parseInt(potentialParentId));
    }
};

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all users with role LIDER_DOCE
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

// Get the discipleship network for a specific user
const getNetwork = async (req, res) => {
    try {
        const { userId } = req.params;
        const requesterRole = req.user.role;
        // Check if the user is a cell leader, to apply restrictions
        const isCellLeaderView = requesterRole === 'LIDER_CELULA';

        // Fetch the user with their complete network
        // Note: This static include fetches 2 levels deep. 
        // For deep networks, this might need recursion or raw queries in future.
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            include: {
                disciples: {
                    include: {
                        disciples: {
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

        // Build hierarchical structure with pruning
        const buildHierarchy = (currentUser) => {
            // Restriction Rule: 
            // If the view is for a Cell Leader, and we encounter ANOTHER Cell Leader (who is not the root/requested user),
            // we must hide their detailed info (disciples/guests). We only show their basic "node".
            const isTargetAnotherLeader = currentUser.role === 'LIDER_CELULA' && currentUser.id !== parseInt(userId);

            // If we are restricted, return the pruned node
            if (isCellLeaderView && isTargetAnotherLeader) {
                return {
                    id: currentUser.id,
                    fullName: currentUser.fullName,
                    email: currentUser.email,
                    role: currentUser.role,
                    assignedGuests: [], // Hidden
                    invitedGuests: [],  // Hidden
                    disciples: []       // Hidden
                };
            }

            // Otherwise, return full node and recurse
            return {
                id: currentUser.id,
                fullName: currentUser.fullName,
                email: currentUser.email,
                role: currentUser.role,
                assignedGuests: currentUser.assignedGuests || [],
                invitedGuests: currentUser.invitedGuests || [],
                disciples: (currentUser.disciples || []).map(disciple => buildHierarchy(disciple))
            };
        };

        const network = buildHierarchy(user);
        res.json(network);
    } catch (error) {
        console.error('Error fetching network:', error);
        res.status(500).json({ error: 'Error fetching network' });
    }
};

module.exports = {
    getLosDoce,
    getNetwork
};

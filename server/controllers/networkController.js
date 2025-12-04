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

        // Fetch the user with their complete network
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

        // Build hierarchical structure
        const buildHierarchy = (user) => {
            return {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                assignedGuests: user.assignedGuests || [],
                invitedGuests: user.invitedGuests || [],
                disciples: (user.disciples || []).map(disciple => buildHierarchy(disciple))
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

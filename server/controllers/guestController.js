const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Create new guest
const createGuest = async (req, res) => {
    try {
        let { name, phone, address, prayerRequest, invitedById } = req.body;
        const user = req.user;

        if (!name || !phone) {
            return res.status(400).json({ message: 'Name and phone are required' });
        }

        // LIDER_CELULA and MIEMBRO can only create guests with themselves as invitedBy
        if (user.role === 'LIDER_CELULA' || user.role === 'MIEMBRO') {
            invitedById = user.id;
        } else {
            // SUPER_ADMIN and LIDER_DOCE can specify invitedById
            if (!invitedById) {
                return res.status(400).json({ message: 'invitedById is required' });
            }
        }

        const guest = await prisma.guest.create({
            data: {
                name,
                phone,
                address,
                prayerRequest,
                invitedById: parseInt(invitedById),
            },
            include: {
                invitedBy: {
                    select: { id: true, fullName: true, email: true },
                },
                assignedTo: {
                    select: { id: true, fullName: true, email: true },
                },
            },
        });

        res.status(201).json({ guest });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Helper function to get all users in a leader's network (disciples and sub-disciples)
const getUserNetwork = async (userId) => {
    const network = [];
    const queue = [userId];
    const visited = new Set();

    while (queue.length > 0) {
        const currentId = queue.shift();

        if (visited.has(currentId)) continue;
        visited.add(currentId);
        network.push(currentId);

        const disciples = await prisma.user.findMany({
            where: { leaderId: currentId },
            select: { id: true }
        });

        queue.push(...disciples.map(d => d.id));
    }

    // Filter out any undefined/null values as safety measure
    return network.filter(id => id != null);
};

// Get all guests with optional filters
const getAllGuests = async (req, res) => {
    try {
        const { status, invitedById, assignedToId, search } = req.query;
        const user = req.user; // Get authenticated user from request

        let securityFilter = {};

        // Apply role-based visibility
        if (user.role === 'SUPER_ADMIN') {
            // Super admin can see all guests
            securityFilter = {};
        } else if (user.role === 'LIDER_DOCE') {
            // LIDER_DOCE can see guests invited/assigned to anyone in their network
            const networkUserIds = await getUserNetwork(user.id);
            securityFilter = {
                OR: [
                    { invitedById: { in: networkUserIds } },
                    { assignedToId: { in: networkUserIds } }
                ]
            };
        } else {
            // LIDER_CELULA and MIEMBRO can only see:
            // 1. Guests they invited AND are not assigned to someone else
            // 2. Guests assigned to them
            securityFilter = {
                OR: [
                    {
                        AND: [
                            { invitedById: user.id },
                            {
                                OR: [
                                    { assignedToId: null },
                                    { assignedToId: user.id }
                                ]
                            }
                        ]
                    },
                    { assignedToId: user.id }
                ]
            };
        }

        // DEBUG: Log the filter being applied
        console.log('=== GUEST FILTER DEBUG ===');
        console.log('User:', { id: user.id, role: user.role });
        console.log('Security Filter:', JSON.stringify(securityFilter, null, 2));
        console.log('========================');

        // Build query filters
        const queryFilters = {};
        if (status) queryFilters.status = status;
        if (invitedById) queryFilters.invitedById = parseInt(invitedById);
        if (assignedToId) queryFilters.assignedToId = parseInt(assignedToId);
        if (search) {
            queryFilters.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
            ];
        }

        // Combine security filter and query filters
        const finalWhere = Object.keys(securityFilter).length > 0
            ? { AND: [securityFilter, queryFilters] }
            : queryFilters;

        const guests = await prisma.guest.findMany({
            where: finalWhere,
            include: {
                invitedBy: {
                    select: { id: true, fullName: true, email: true },
                },
                assignedTo: {
                    select: { id: true, fullName: true, email: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.status(200).json({ guests });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get specific guest by ID
const getGuestById = async (req, res) => {
    try {
        const { id } = req.params;

        const guest = await prisma.guest.findUnique({
            where: { id: parseInt(id) },
            include: {
                invitedBy: {
                    select: { id: true, fullName: true, email: true },
                },
                assignedTo: {
                    select: { id: true, fullName: true, email: true },
                },
            },
        });

        if (!guest) {
            return res.status(404).json({ message: 'Guest not found' });
        }

        res.status(200).json({ guest });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update guest
const updateGuest = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, address, prayerRequest, status, invitedById, assignedToId } = req.body;
        const user = req.user;

        // Get the guest first to check permissions
        const existingGuest = await prisma.guest.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingGuest) {
            return res.status(404).json({ message: 'Guest not found' });
        }

        // Prepare update data based on role
        let updateData = {};

        if (user.role === 'SUPER_ADMIN') {
            // Super admin can update all fields
            updateData = {
                ...(name && { name }),
                ...(phone && { phone }),
                ...(address !== undefined && { address }),
                ...(prayerRequest !== undefined && { prayerRequest }),
                ...(status && { status }),
                ...(invitedById && { invitedById: parseInt(invitedById) }),
                ...(assignedToId !== undefined && { assignedToId: assignedToId ? parseInt(assignedToId) : null }),
            };
        } else if (user.role === 'LIDER_DOCE') {
            // LIDER_DOCE can update all fields for guests in their network
            const networkUserIds = await getUserNetwork(user.id);
            const isInNetwork = networkUserIds.includes(existingGuest.invitedById) ||
                (existingGuest.assignedToId && networkUserIds.includes(existingGuest.assignedToId));

            if (!isInNetwork) {
                return res.status(403).json({ message: 'You can only update guests in your network' });
            }

            updateData = {
                ...(name && { name }),
                ...(phone && { phone }),
                ...(address !== undefined && { address }),
                ...(prayerRequest !== undefined && { prayerRequest }),
                ...(status && { status }),
                ...(invitedById && { invitedById: parseInt(invitedById) }),
                ...(assignedToId !== undefined && { assignedToId: assignedToId ? parseInt(assignedToId) : null }),
            };
        } else {
            // LIDER_CELULA and MIEMBRO can only update status field
            // And only for guests they invited or were assigned to them
            const canEdit = existingGuest.invitedById === user.id || existingGuest.assignedToId === user.id;

            if (!canEdit) {
                return res.status(403).json({ message: 'You can only update guests you invited or assigned to you' });
            }

            // Only allow status updates
            if (status) {
                updateData = { status };
            } else {
                return res.status(400).json({ message: 'You can only update the status field' });
            }
        }

        const guest = await prisma.guest.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                invitedBy: {
                    select: { id: true, fullName: true, email: true },
                },
                assignedTo: {
                    select: { id: true, fullName: true, email: true },
                },
            },
        });

        res.status(200).json({ guest });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete guest
const deleteGuest = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        // Get the guest first to check permissions
        const existingGuest = await prisma.guest.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingGuest) {
            return res.status(404).json({ message: 'Guest not found' });
        }

        // Check delete permissions based on role
        if (user.role === 'SUPER_ADMIN') {
            // Super admin can delete any guest
        } else if (user.role === 'LIDER_DOCE') {
            // LIDER_DOCE can delete guests in their network
            const networkUserIds = await getUserNetwork(user.id);
            const isInNetwork = networkUserIds.includes(existingGuest.invitedById) ||
                (existingGuest.assignedToId && networkUserIds.includes(existingGuest.assignedToId));

            if (!isInNetwork) {
                return res.status(403).json({ message: 'You can only delete guests in your network' });
            }
        } else {
            // LIDER_CELULA and MIEMBRO can only delete guests they invited (not assigned)
            if (existingGuest.invitedById !== user.id) {
                return res.status(403).json({ message: 'You can only delete guests you invited' });
            }
        }

        await prisma.guest.delete({
            where: { id: parseInt(id) },
        });

        res.status(200).json({ message: 'Guest deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Assign guest to a leader
const assignGuest = async (req, res) => {
    try {
        const { id } = req.params;
        const { assignedToId } = req.body;

        if (!assignedToId) {
            return res.status(400).json({ message: 'assignedToId is required' });
        }

        const guest = await prisma.guest.update({
            where: { id: parseInt(id) },
            data: {
                assignedToId: parseInt(assignedToId),
            },
            include: {
                invitedBy: {
                    select: { id: true, fullName: true, email: true },
                },
                assignedTo: {
                    select: { id: true, fullName: true, email: true },
                },
            },
        });

        res.status(200).json({ guest });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Convert guest to member (create user account)
const convertGuestToMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Get the guest
        const guest = await prisma.guest.findUnique({
            where: { id: parseInt(id) }
        });

        if (!guest) {
            return res.status(404).json({ message: 'Guest not found' });
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        // Hash password
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user from guest data
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                fullName: guest.name,
                role: 'MIEMBRO',
                // Assign to the person who invited them
                leaderId: guest.invitedById
            }
        });

        // Delete the guest record
        await prisma.guest.delete({
            where: { id: parseInt(id) }
        });

        res.status(201).json({
            message: 'Guest converted to member successfully',
            user: {
                id: newUser.id,
                email: newUser.email,
                fullName: newUser.fullName,
                role: newUser.role
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createGuest,
    getAllGuests,
    getGuestById,
    updateGuest,
    deleteGuest,
    assignGuest,
    convertGuestToMember,
};

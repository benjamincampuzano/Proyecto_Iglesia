const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Create new guest
const createGuest = async (req, res) => {
    try {
        const { name, phone, address, prayerRequest, invitedById } = req.body;

        if (!name || !phone || !invitedById) {
            return res.status(400).json({ message: 'Name, phone, and invitedById are required' });
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

// Get all guests with optional filters
const getAllGuests = async (req, res) => {
    try {
        const { status, invitedById, assignedToId, search } = req.query;
        const user = req.user; // Get authenticated user from request

        const where = {};

        // If user is not an admin, restrict access to their own guests (invited or assigned)
        if (user.role !== 'SUPER_ADMIN' && user.role !== 'LIDER_DOCE') {
            where.OR = [
                { invitedById: user.id },
                { assignedToId: user.id }
            ];
        }

        if (status) {
            where.status = status;
        }

        // Allow filtering by invitedById, but if non-admin tries to filter by someone else, 
        // the OR condition above combined with this AND might result in no records (which is correct security)
        // However, we need to be careful with how Prisma handles top-level AND/OR mixing.
        // If we have a top-level OR for security, and specific filters, we need to structure it correctly.

        // Let's restructure 'where' to handle the security constraint + filters safely.

        const securityFilter = (user.role !== 'SUPER_ADMIN' && user.role !== 'LIDER_DOCE')
            ? {
                OR: [
                    { invitedById: user.id },
                    { assignedToId: user.id }
                ]
            }
            : {};

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
        // If both exist, we need an AND of them.
        const finalWhere = {
            AND: [
                securityFilter,
                queryFilters
            ]
        };

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

        const guest = await prisma.guest.update({
            where: { id: parseInt(id) },
            data: {
                ...(name && { name }),
                ...(phone && { phone }),
                ...(address !== undefined && { address }),
                ...(prayerRequest !== undefined && { prayerRequest }),
                ...(status && { status }),
                ...(invitedById && { invitedById: parseInt(invitedById) }),
                ...(assignedToId !== undefined && { assignedToId: assignedToId ? parseInt(assignedToId) : null }),
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

// Delete guest
const deleteGuest = async (req, res) => {
    try {
        const { id } = req.params;

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

module.exports = {
    createGuest,
    getAllGuests,
    getGuestById,
    updateGuest,
    deleteGuest,
    assignGuest,
};

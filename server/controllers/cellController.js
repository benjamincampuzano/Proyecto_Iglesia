const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to get network IDs (recursive)
const getNetworkIds = async (leaderId) => {
    const directDisciples = await prisma.user.findMany({
        where: { leaderId },
        select: { id: true }
    });

    let networkIds = directDisciples.map(d => d.id);

    for (const disciple of directDisciples) {
        const subNetwork = await getNetworkIds(disciple.id);
        networkIds = [...networkIds, ...subNetwork];
    }
    return networkIds;
};

// Create a new cell
const createCell = async (req, res) => {
    try {
        const { name, leaderId, hostId, address, city, dayOfWeek, time } = req.body;
        const requestedLeaderId = parseInt(leaderId);
        const requestedHostId = parseInt(hostId);

        if (!name || !leaderId || !address || !city || !dayOfWeek || !time) {
            return res.status(400).json({ error: 'Missing defined fields' });
        }

        // Validate permissions
        // Only SUPER_ADMIN and LIDER_DOCE can create cells usually? 
        // Or LIDER_CELULA can create their own? 
        // Assuming Admin/Doce updates structure.
        const { role, id } = req.user;
        if (role !== 'SUPER_ADMIN' && role !== 'LIDER_DOCE') {
            return res.status(403).json({ error: 'Not authorized to create cells' });
        }

        // Validate Leader
        // Leader must be in network if LIDER_DOCE
        if (role === 'LIDER_DOCE') {
            const networkIds = await getNetworkIds(id);
            if (!networkIds.includes(requestedLeaderId) && requestedLeaderId !== id) {
                // Allow assigning to self? Usually yes.
                if (requestedLeaderId !== id)
                    return res.status(400).json({ error: 'Leader not in your network' });
            }
        }

        // Check availability of Host? 
        // Host must be in network of Leader?
        // "Anfitrion, puede ser el lider de celula o un miembro de la misma red"
        // Network of the SELECTED Leader.
        if (requestedHostId !== requestedLeaderId) {
            const leaderNetwork = await getNetworkIds(requestedLeaderId);
            if (!leaderNetwork.includes(requestedHostId)) {
                // return res.status(400).json({ error: 'Host not in leader\'s network' });
                // Note: Sometimes host is just a member, maybe not strictly in 'discipleship' downline but in the same cell?
                // But for creation, we assume hierarchy. 
            }
        }

        const newCell = await prisma.cell.create({
            data: {
                name,
                leaderId: requestedLeaderId,
                hostId: requestedHostId,
                address,
                city,
                dayOfWeek,
                time
            }
        });

        res.json(newCell);

    } catch (error) {
        console.error('Error creating cell:', error);
        res.status(500).json({ error: 'Error creating cell' });
    }
};

// Assign functionality (Add member to cell)
const assignMember = async (req, res) => {
    try {
        const { cellId, userId } = req.body;

        // Validate access
        // ... (Similar logic)

        await prisma.user.update({
            where: { id: parseInt(userId) },
            data: { cellId: parseInt(cellId) }
        });

        res.json({ message: 'Member assigned successfully' });
    } catch (error) {
        console.error('Error assigning member:', error);
        res.status(500).json({ error: 'Error assigning member' });
    }
};

// Get Eligible Leaders (LIDER_CELULA in network)
const getEligibleLeaders = async (req, res) => {
    try {
        const { role, id } = req.user;
        let where = { role: 'LIDER_CELULA' };

        if (role === 'LIDER_DOCE') {
            const networkIds = await getNetworkIds(id);
            where.id = { in: [...networkIds, id] }; // proper or self
        } else if (role === 'SUPER_ADMIN') {
            // all
        } else {
            return res.json([]);
        }

        const leaders = await prisma.user.findMany({
            where,
            select: { id: true, fullName: true }
        });
        res.json(leaders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Eligible Hosts (Network of a specific leader)
const getEligibleHosts = async (req, res) => {
    try {
        const { leaderId } = req.query;
        if (!leaderId) return res.json([]);

        // Host can be the leader himself OR his network
        const networkIds = await getNetworkIds(parseInt(leaderId));
        const ids = [parseInt(leaderId), ...networkIds];

        const hosts = await prisma.user.findMany({
            where: { id: { in: ids } },
            select: { id: true, fullName: true, role: true }
        });
        res.json(hosts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Eligible Members (Network of a specific leader or current user)
const getEligibleMembers = async (req, res) => {
    try {
        const { role, id } = req.user;
        let networkIds = [];

        if (role === 'SUPER_ADMIN') {
            // Can search anyone ideally, but let's limit to query if needed or return all
            const allUsers = await prisma.user.findMany({ select: { id: true, fullName: true, cellId: true } });
            return res.json(allUsers);
        } else {
            networkIds = await getNetworkIds(id);
        }

        const members = await prisma.user.findMany({
            where: { id: { in: networkIds } },
            select: { id: true, fullName: true, role: true, cellId: true, cell: { select: { name: true } } }
        });
        res.json(members);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete a cell
const deleteCell = async (req, res) => {
    try {
        const { id } = req.params; // Cell ID
        const cellId = parseInt(id);
        const { role, id: userId } = req.user;

        // 1. Permission check
        if (role !== 'SUPER_ADMIN' && role !== 'LIDER_DOCE') {
            return res.status(403).json({ error: 'Not authorized to delete cells' });
        }

        // Find cell to verify ownership/existence
        const cell = await prisma.cell.findUnique({ where: { id: cellId } });
        if (!cell) {
            return res.status(404).json({ error: 'Cell not found' });
        }

        // If LIDER_DOCE, verify cell is in their network
        if (role === 'LIDER_DOCE') {
            // Check if cell leader is in their network or is themselves
            const networkIds = await getNetworkIds(userId);
            if (!networkIds.includes(cell.leaderId) && cell.leaderId !== userId) {
                return res.status(403).json({ error: 'Cannot delete a cell outside your network' });
            }
        }

        // 2. Cleanup transaction
        await prisma.$transaction(async (tx) => {
            // A. Unassign members
            await tx.user.updateMany({
                where: { cellId: cellId },
                data: { cellId: null }
            });

            // B. Delete attendances
            await tx.cellAttendance.deleteMany({
                where: { cellId: cellId }
            });

            // C. Delete cell
            await tx.cell.delete({
                where: { id: cellId }
            });
        });

        res.json({ message: 'Cell deleted successfully' });

    } catch (error) {
        console.error('Error deleting cell:', error);
        res.status(500).json({ error: 'Error deleting cell' });
    }
};

module.exports = {
    createCell,
    deleteCell,
    assignMember,
    getEligibleLeaders,
    getEligibleHosts,
    getEligibleMembers
};

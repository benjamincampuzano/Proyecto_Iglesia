const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const { logActivity } = require('../utils/auditLogger');

// Helper for Geocoding (Nominatim OpenStreetMap)
const getCoordinates = async (address, city) => {
    try {
        const query = `${address}, ${city}, Colombia`;
        const encodedQuery = encodeURIComponent(query);
        const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1`;

        // User-Agent is required by Nominatim
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'IglesiaApp/1.0 (admin@iglesia.com)' }
        });

        if (response.data && response.data.length > 0) {
            console.log(`Geocoding successful for ${query}:`, response.data[0].lat, response.data[0].lon);
            return {
                lat: parseFloat(response.data[0].lat),
                lon: parseFloat(response.data[0].lon)
            };
        }
        console.warn(`Geocoding failed for ${query}: No results`);
        return { lat: null, lon: null };
    } catch (error) {
        console.error('Geocoding error:', error.message);
        return { lat: null, lon: null };
    }
};

// Helper to get network IDs (recursive)
const getNetworkIds = async (leaderId) => {
    const id = parseInt(leaderId);
    if (isNaN(id)) return [];

    const directDisciples = await prisma.user.findMany({
        where: {
            OR: [
                { leaderId: id },
                { liderDoceId: id },
                { liderCelulaId: id },
                { pastorId: id }
            ]
        },
        select: { id: true }
    });

    let networkIds = directDisciples.map(d => d.id);

    for (const disciple of directDisciples) {
        if (disciple.id !== id) {
            const subNetwork = await getNetworkIds(disciple.id);
            networkIds = [...networkIds, ...subNetwork];
        }
    }
    return [...new Set(networkIds)];
};

// Create a new cell
const createCell = async (req, res) => {
    try {
        const { name, leaderId, hostId, address, city, dayOfWeek, time, liderDoceId, cellType } = req.body;
        const requestedLeaderId = parseInt(leaderId);
        const requestedHostId = hostId ? parseInt(hostId) : null;
        const requestedLiderDoceId = liderDoceId ? parseInt(liderDoceId) : null;

        if (!name || !leaderId || !address || !city || !dayOfWeek || !time) {
            return res.status(400).json({ error: 'Missing defined fields' });
        }

        const { role, id } = req.user;
        if (role !== 'SUPER_ADMIN' && role !== 'LIDER_DOCE' && role !== 'PASTOR') {
            return res.status(403).json({ error: 'Not authorized to create cells' });
        }

        if (role === 'LIDER_DOCE' || role === 'PASTOR') {
            const networkIds = await getNetworkIds(id);
            if (!networkIds.includes(requestedLeaderId) && requestedLeaderId !== parseInt(id)) {
                return res.status(400).json({ error: 'Leader not in your network' });
            }
        }

        // New Cell Type Leadership Rules
        const targetLeader = await prisma.user.findUnique({ where: { id: requestedLeaderId }, select: { role: true } });
        if (cellType === 'CERRADA' && targetLeader.role !== 'LIDER_DOCE') {
            return res.status(400).json({ error: 'Una célula CERRADA debe ser dirigida por un Líder de 12' });
        }
        if (cellType === 'ABIERTA' && !['LIDER_CELULA', 'LIDER_DOCE', 'PASTOR'].includes(targetLeader.role)) {
            return res.status(400).json({ error: 'Rol de líder no apto para célula ABIERTA' });
        }

        // Geocoding
        const coords = await getCoordinates(address, city);

        const newCell = await prisma.cell.create({
            data: {
                name,
                leaderId: requestedLeaderId,
                hostId: requestedHostId,
                liderDoceId: requestedLiderDoceId,
                address,
                city,
                latitude: coords.lat,
                longitude: coords.lon,
                dayOfWeek,
                time,
                cellType: cellType || 'ABIERTA'
            }
        });

        await logActivity(id, 'CREATE', 'CELL', newCell.id, { name: newCell.name });

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

        await prisma.user.update({
            where: { id: parseInt(userId) },
            data: { cellId: parseInt(cellId) }
        });

        const { id: currentUserId } = req.user;
        await logActivity(currentUserId, 'UPDATE', 'USER', parseInt(userId), { action: 'ASSIGN_CELL', cellId: parseInt(cellId) });

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
        const userId = parseInt(id);
        let where = {};

        if (role === 'LIDER_DOCE' || role === 'PASTOR') {
            const networkIds = await getNetworkIds(userId);
            where.id = { in: [...networkIds, userId] };
            where.role = { in: ['LIDER_CELULA', 'LIDER_DOCE', 'PASTOR'] }; // Pastors can assign themselves or others
        } else if (role === 'SUPER_ADMIN') {
            // Admins can assign to LIDER_DOCE or LIDER_CELULA
            where.role = { in: ['LIDER_CELULA', 'LIDER_DOCE'] };
        } else {
            return res.json([]);
        }

        const leaders = await prisma.user.findMany({
            where,
            select: { id: true, fullName: true, role: true }
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

        const where = { id: { in: ids } };

        // PASTOR requirement: only LIDER_DOCE can be hosts in their network cells
        if (req.user.role === 'PASTOR') {
            where.role = 'LIDER_DOCE';
        }

        const hosts = await prisma.user.findMany({
            where,
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
        const { leaderId, cellType } = req.query;
        let networkIds = [];

        // If a leaderId is provided, we fetch the network of THAT leader
        // Otherwise, we use the network of the current user
        const targetId = leaderId ? parseInt(leaderId) : id;

        // Fetch target leader to check their role
        const targetLeader = await prisma.user.findUnique({
            where: { id: targetId },
            select: { role: true }
        });

        if (!targetLeader) {
            return res.status(404).json({ error: 'Líder no encontrado' });
        }

        // --- NEW Invitation-based filter Logic ---
        // A member is eligible for targetId's cell if:
        // 1. Their leaderId is targetId (Directly invited by OR reporting to the leader)
        // 2. OR their leader's leaderId is targetId (Invited by a disciple of the leader)

        const where = {
            OR: [
                { leaderId: targetId },
                { liderCelulaId: targetId },
                { liderDoceId: targetId },
                { pastorId: targetId },
                {
                    leader: {
                        OR: [
                            { liderCelulaId: targetId },
                            { liderDoceId: targetId },
                            { leaderId: targetId }
                        ]
                    }
                }
            ]
        };

        // --- Refined Role Filtering based on Cell Type ---
        if (cellType === 'CERRADA') {
            // Cerrada: LIDER_CELULA or DISCIPULO
            where.role = { in: ['LIDER_CELULA', 'DISCIPULO'] };
        } else if (cellType === 'ABIERTA' || !cellType) {
            // Abierta: DISCIPULO or INVITADO
            where.role = { in: ['DISCIPULO', 'INVITADO'] };
        }

        // Special restriction for PASTOR (can lead cells of LIDER_DOCE)
        if (role === 'PASTOR' && !leaderId) {
            where.role = 'LIDER_DOCE';
        }

        const members = await prisma.user.findMany({
            where,
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
        const cell = await prisma.cell.findUnique({
            where: { id: cellId },
            select: { leaderId: true }
        });
        if (!cell) {
            return res.status(404).json({ error: 'Cell not found' });
        }

        // If LIDER_DOCE or PASTOR, verify cell is in their network
        if (role === 'LIDER_DOCE' || role === 'PASTOR') {
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
                where: { id: cellId },
                select: { id: true, name: true }
            });
        });

        await logActivity(userId, 'DELETE', 'CELL', cellId, { name: cell.name });

        res.json({ message: 'Cell deleted successfully' });

    } catch (error) {
        console.error('Error deleting cell:', error);
        res.status(500).json({ error: 'Error deleting cell' });
    }
};

// Update coordinates for an existing cell
const updateCellCoordinates = async (req, res) => {
    try {
        const { id } = req.params;
        const cellId = parseInt(id);

        const cell = await prisma.cell.findUnique({
            where: { id: cellId },
            select: { address: true, city: true }
        });

        if (!cell) {
            return res.status(404).json({ error: 'Célula no encontrada' });
        }

        const coords = await getCoordinates(cell.address, cell.city);

        if (coords.lat === null) {
            return res.status(400).json({ error: 'No se pudieron obtener coordenadas para esta dirección. Verifique que la dirección y ciudad sean correctas.' });
        }

        const updatedCell = await prisma.cell.update({
            where: { id: cellId },
            data: {
                latitude: coords.lat,
                longitude: coords.lon
            }
        });

        res.json(updatedCell);
    } catch (error) {
        console.error('Error updating coordinates:', error);
        res.status(500).json({ error: 'Error al actualizar coordenadas' });
    }
};

// Update an existing cell
const updateCell = async (req, res) => {
    try {
        const { id } = req.params;
        const cellId = parseInt(id);
        const { name, leaderId, hostId, address, city, dayOfWeek, time, liderDoceId, cellType } = req.body;

        const { role, id: userId } = req.user;

        // Find existing cell
        const existingCell = await prisma.cell.findUnique({
            where: { id: cellId }
        });

        if (!existingCell) {
            return res.status(404).json({ error: 'Célula no encontrada' });
        }

        // Permission check
        if (role !== 'SUPER_ADMIN') {
            const networkIds = await getNetworkIds(userId);
            if (!networkIds.includes(existingCell.leaderId) && existingCell.leaderId !== userId) {
                return res.status(403).json({ error: 'No autorizado para editar esta célula' });
            }
        }

        const data = {
            name,
            leaderId: parseInt(leaderId),
            hostId: parseInt(hostId),
            liderDoceId: liderDoceId ? parseInt(liderDoceId) : null,
            address,
            city,
            dayOfWeek,
            time,
            cellType: cellType || existingCell.cellType
        };

        if (leaderId) data.leaderId = parseInt(leaderId);
        if (hostId) data.hostId = parseInt(hostId);
        if (liderDoceId) data.liderDoceId = parseInt(liderDoceId);

        // Geocoding if address or city changed
        if (address !== existingCell.address || city !== existingCell.city) {
            const coords = await getCoordinates(address, city);
            data.latitude = coords.lat;
            data.longitude = coords.lon;
        }

        const updatedCell = await prisma.cell.update({
            where: { id: cellId },
            data
        });

        await logActivity(userId, 'UPDATE', 'CELL', cellId, { name: updatedCell.name });

        res.json(updatedCell);
    } catch (error) {
        console.error('Error updating cell:', error);
        res.status(500).json({ error: 'Error al actualizar la célula' });
    }
};

// Unassign member from cell
const unassignMember = async (req, res) => {
    try {
        const { userId } = req.body;
        const { id: currentUserId } = req.user;

        await prisma.user.update({
            where: { id: parseInt(userId) },
            data: { cellId: null }
        });

        await logActivity(currentUserId, 'UPDATE', 'USER', parseInt(userId), { action: 'UNASSIGN_CELL' });

        res.json({ message: 'Miembro desvinculado correctamente' });
    } catch (error) {
        console.error('Error unassigning member:', error);
        res.status(500).json({ error: 'Error al desvincular miembro' });
    }
};

// Get Eligible Doce Leaders
const getEligibleDoceLeaders = async (req, res) => {
    try {
        const { role, id } = req.user;
        let where = {};

        if (role === 'PASTOR') {
            // Requirement: PASTOR selects from other Pastors
            where.role = 'PASTOR';
        } else if (role === 'LIDER_DOCE') {
            where.role = 'LIDER_DOCE';
            where.id = parseInt(id);
        } else if (role === 'SUPER_ADMIN') {
            where.role = 'LIDER_DOCE';
        } else {
            return res.json([]);
        }

        const leaders = await prisma.user.findMany({
            where,
            select: { id: true, fullName: true, role: true }
        });
        res.json(leaders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createCell,
    deleteCell,
    assignMember,
    getEligibleLeaders,
    getEligibleHosts,
    getEligibleMembers,
    updateCellCoordinates,
    getEligibleDoceLeaders,
    updateCell,
    unassignMember
};

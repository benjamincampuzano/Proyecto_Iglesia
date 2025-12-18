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
        const { name, leaderId, hostId, address, city, dayOfWeek, time, liderDoceId } = req.body;
        const requestedLeaderId = parseInt(leaderId);
        const requestedHostId = parseInt(hostId);
        const requestedLiderDoceId = liderDoceId ? parseInt(liderDoceId) : null;

        if (!name || !leaderId || !address || !city || !dayOfWeek || !time) {
            return res.status(400).json({ error: 'Missing defined fields' });
        }

        const { role, id } = req.user;
        if (role !== 'SUPER_ADMIN' && role !== 'LIDER_DOCE') {
            return res.status(403).json({ error: 'Not authorized to create cells' });
        }

        if (role === 'LIDER_DOCE') {
            const networkIds = await getNetworkIds(id);
            if (!networkIds.includes(requestedLeaderId) && requestedLeaderId !== parseInt(id)) {
                return res.status(400).json({ error: 'Leader not in your network' });
            }
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
                time
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

        if (role === 'LIDER_DOCE') {
            const networkIds = await getNetworkIds(userId);
            where.id = { in: [...networkIds, userId] };
            where.role = 'LIDER_CELULA';
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
        const cell = await prisma.cell.findUnique({
            where: { id: cellId },
            select: { leaderId: true }
        });
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

// Get Eligible Doce Leaders
const getEligibleDoceLeaders = async (req, res) => {
    try {
        const { role, id } = req.user;
        let where = { role: 'LIDER_DOCE' };

        if (role === 'LIDER_DOCE') {
            // A LIDER_DOCE can only assign themselves or someone in their network if they were higher? 
            // Usually, they just assign themselves or its assigned by SUPER_ADMIN.
            where.id = parseInt(id);
        } else if (role !== 'SUPER_ADMIN') {
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
    getEligibleDoceLeaders
};

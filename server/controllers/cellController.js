const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const { logActivity } = require('../utils/auditLogger');
const { getUserNetwork } = require('../utils/networkUtils');

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

// Local getNetworkIds removed in favor of centralized getUserNetwork (networkUtils)

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

        const { roles, id } = req.user;
        const isAuthorized = roles.some(r => ['ADMIN', 'LIDER_DOCE', 'PASTOR'].includes(r));
        if (!isAuthorized) {
            return res.status(403).json({ error: 'Not authorized to create cells' });
        }

        if (!roles.includes('ADMIN') && !roles.includes('ADMIN')) {
            const networkIds = await getUserNetwork(id);
            if (!networkIds.includes(requestedLeaderId) && requestedLeaderId !== parseInt(id)) {
                return res.status(400).json({ error: 'Leader not in your network' });
            }
        }

        // New Cell Type Leadership Rules
        const targetLeader = await prisma.user.findUnique({
            where: { id: requestedLeaderId },
            include: { roles: { include: { role: true } } }
        });
        const leaderRoles = targetLeader.roles.map(r => r.role.name);

        if (cellType === 'CERRADA' && !leaderRoles.includes('LIDER_DOCE')) {
            return res.status(400).json({ error: 'Una célula CERRADA debe ser dirigida por un Líder de 12' });
        }
        if (cellType === 'ABIERTA' && !leaderRoles.some(r => ['LIDER_CELULA', 'LIDER_DOCE', 'PASTOR'].includes(r))) {
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

        await logActivity(id, 'CREATE', 'CELL', newCell.id, { name: newCell.name }, req.ip, req.headers['user-agent']);

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
        await logActivity(currentUserId, 'UPDATE', 'USER', parseInt(userId), { action: 'ASSIGN_CELL', cellId: parseInt(cellId) }, req.ip, req.headers['user-agent']);

        res.json({ message: 'Member assigned successfully' });
    } catch (error) {
        console.error('Error assigning member:', error);
        res.status(500).json({ error: 'Error assigning member' });
    }
};

// Get Eligible Leaders (LIDER_CELULA in network)
const getEligibleLeaders = async (req, res) => {
    try {
        const { roles, id } = req.user;
        const userId = parseInt(id);
        let where = {};

        if (roles.includes('ADMIN')) {
            where = {
                roles: {
                    some: {
                        role: {
                            name: { in: ['LIDER_CELULA', 'LIDER_DOCE', 'PASTOR'] }
                        }
                    },
                    none: {
                        role: { name: 'ADMIN' }
                    }
                }
            };
        } else {
            const networkIds = await getUserNetwork(userId);
            where = {
                id: { in: [...networkIds, userId] },
                roles: {
                    some: {
                        role: {
                            name: { in: ['LIDER_CELULA', 'LIDER_DOCE', 'PASTOR'] }
                        }
                    },
                    none: {
                        role: { name: 'ADMIN' }
                    }
                }
            };
        }

        const leaders = await prisma.user.findMany({
            where,
            include: {
                profile: true,
                roles: { include: { role: true } }
            }
        });

        const formatted = leaders.map(l => ({
            id: l.id,
            fullName: l.profile.fullName,
            roles: l.roles.map(r => r.role.name)
        }));

        res.json(formatted);
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
        const networkIds = await getUserNetwork(parseInt(leaderId));
        const ids = [parseInt(leaderId), ...networkIds];

        const where = {
            id: { in: ids },
            roles: {
                none: {
                    role: { name: 'ADMIN' }
                }
            }
        };

        // PASTOR requirement: only LIDER_DOCE can be hosts in their network cells
        if (req.user.roles.includes('PASTOR') && !req.user.roles.includes('ADMIN')) {
            where.roles = {
                some: {
                    role: { name: 'LIDER_DOCE' }
                }
            };
        }

        const hosts = await prisma.user.findMany({
            where,
            include: {
                profile: true,
                roles: { include: { role: true } }
            }
        });

        const formatted = hosts.map(h => ({
            id: h.id,
            fullName: h.profile.fullName,
            roles: h.roles.map(r => r.role.name)
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Eligible Members (Network of a specific leader or current user)
const getEligibleMembers = async (req, res) => {
    try {
        const { roles, id } = req.user;
        const { leaderId, cellType } = req.query;

        const targetId = leaderId ? parseInt(leaderId) : id;

        // Fetch target leader to check their roles
        const targetLeader = await prisma.user.findUnique({
            where: { id: targetId },
            include: { roles: { include: { role: true } } }
        });

        if (!targetLeader) {
            return res.status(404).json({ error: 'Líder no encontrado' });
        }

        // --- NEW filter Logic using CTE helper ---
        const networkIds = await getUserNetwork(targetId);

        const where = {
            id: { in: networkIds },
            roles: {
                none: {
                    role: { name: 'ADMIN' }
                }
            }
        };

        // --- Refined Role Filtering based on Cell Type ---
        if (cellType === 'CERRADA') {
            // Cerrada: LIDER_CELULA or DISCIPULO
            where.roles = {
                some: {
                    role: { name: { in: ['LIDER_CELULA', 'DISCIPULO'] } }
                }
            };
        } else if (cellType === 'ABIERTA' || !cellType) {
            // Abierta: DISCIPULO or INVITADO (MIEMBRO is essentially DISCIPULO)
            where.roles = {
                some: {
                    role: { name: { in: ['DISCIPULO', 'DISCIPULO'] } }
                }
            };
        }

        // Special restriction for PASTOR (can lead cells of LIDER_DOCE)
        if (targetRoles.includes('PASTOR') && !leaderId) {
            where.roles = {
                some: {
                    role: { name: 'LIDER_DOCE' }
                }
            };
        }

        const members = await prisma.user.findMany({
            where,
            include: {
                profile: true,
                roles: { include: { role: true } },
                cell: { select: { name: true } }
            }
        });

        const formatted = members.map(m => ({
            id: m.id,
            fullName: m.profile.fullName,
            roles: m.roles.map(r => r.role.name),
            cellId: m.cellId,
            cellName: m.cell?.name
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete a cell
const deleteCell = async (req, res) => {
    try {
        const { id } = req.params; // Cell ID
        const cellId = parseInt(id);
        const { roles, id: userId } = req.user;

        // 1. Permission check
        const isAuthorized = roles.some(r => ['ADMIN', 'LIDER_DOCE'].includes(r));
        if (!isAuthorized) {
            return res.status(403).json({ error: 'Not authorized to delete cells' });
        }

        // Find cell to verify ownership/existence
        const cell = await prisma.cell.findUnique({
            where: { id: cellId },
            select: { leaderId: true, name: true }
        });
        if (!cell) {
            return res.status(404).json({ error: 'Cell not found' });
        }

        // If LIDER_DOCE or PASTOR, verify cell is in their network
        if (!roles.includes('ADMIN') && !roles.includes('ADMIN')) {
            // Check if cell leader is in their network or is themselves
            const networkIds = await getUserNetwork(userId);
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

        await logActivity(userId, 'DELETE', 'CELL', cellId, { name: cell.name }, req.ip, req.headers['user-agent']);

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

        const { roles, id: userId } = req.user;

        // Find existing cell
        const existingCell = await prisma.cell.findUnique({
            where: { id: cellId }
        });

        if (!existingCell) {
            return res.status(404).json({ error: 'Célula no encontrada' });
        }

        // Permission check
        if (!roles.includes('ADMIN') && !roles.includes('ADMIN')) {
            const networkIds = await getUserNetwork(userId);
            if (!networkIds.includes(existingCell.leaderId) && existingCell.leaderId !== userId) {
                return res.status(403).json({ error: 'No autorizado para editar esta célula' });
            }
        }

        const data = {};
        if (name) data.name = name;
        if (leaderId) data.leaderId = parseInt(leaderId);
        if (hostId !== undefined) data.hostId = hostId ? parseInt(hostId) : null;
        if (liderDoceId !== undefined) data.liderDoceId = liderDoceId ? parseInt(liderDoceId) : null;
        if (address) data.address = address;
        if (city) data.city = city;
        if (dayOfWeek) data.dayOfWeek = dayOfWeek;
        if (time) data.time = time;
        if (cellType) data.cellType = cellType;

        // Geocoding if address or city changed
        if ((address && address !== existingCell.address) || (city && city !== existingCell.city)) {
            const coords = await getCoordinates(address || existingCell.address, city || existingCell.city);
            data.latitude = coords.lat;
            data.longitude = coords.lon;
        }

        const updatedCell = await prisma.cell.update({
            where: { id: cellId },
            data
        });

        await logActivity(userId, 'UPDATE', 'CELL', cellId, { name: updatedCell.name }, req.ip, req.headers['user-agent']);

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

        await logActivity(currentUserId, 'UPDATE', 'USER', parseInt(userId), { action: 'UNASSIGN_CELL' }, req.ip, req.headers['user-agent']);

        res.json({ message: 'Miembro desvinculado correctamente' });
    } catch (error) {
        console.error('Error unassigning member:', error);
        res.status(500).json({ error: 'Error al desvincular miembro' });
    }
};

// Get Eligible Doce Leaders
const getEligibleDoceLeaders = async (req, res) => {
    try {
        const { roles, id } = req.user;
        let where = {};

        if (roles.includes('PASTOR')) {
            // Requirement: PASTOR selects from other Pastors (historical rule)
            where.roles = { some: { role: { name: 'PASTOR' } } };
        } else if (roles.includes('LIDER_DOCE')) {
            where.id = parseInt(id);
        } else if (roles.includes('ADMIN')) {
            where.roles = { some: { role: { name: 'LIDER_DOCE' } } };
        } else {
            return res.json([]);
        }

        const leaders = await prisma.user.findMany({
            where,
            include: {
                profile: true,
                roles: { include: { role: true } }
            }
        });

        const formatted = leaders.map(l => ({
            id: l.id,
            fullName: l.profile.fullName,
            roles: l.roles.map(r => r.role.name)
        }));

        res.json(formatted);
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

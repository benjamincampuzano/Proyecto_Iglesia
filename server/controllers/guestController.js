const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Crear nuevo invitado
const createGuest = async (req, res) => {
    try {
        let { name, phone, address, prayerRequest, invitedById } = req.body;
        const user = req.user;

        if (!name || !phone) {
            return res.status(400).json({ message: 'Name and phone are required' });
        }

        // LIDER_CELULA y MIEMBRO solo pueden crear invitados con ellos mismos como invitedBy
        if (user.role === 'LIDER_CELULA' || user.role === 'MIEMBRO') {
            invitedById = user.id;
        } else {
            // SUPER_ADMIN y LIDER_DOCE pueden especificar invitedById
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

// Función auxiliar para obtener todos los usuarios en la red de un líder (discípulos y sub-discípulos)
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

// Obtener todos los invitados con filtros opcionales
const getAllGuests = async (req, res) => {
    try {
        const { status, invitedById, assignedToId, search } = req.query;
        const user = req.user; // Obtener usuario autenticado de la petición

        let securityFilter = {};

        // Aplicar visibilidad basada en roles
        if (user.role === 'SUPER_ADMIN') {
            // Super admin puede ver todos los invitados
            securityFilter = {};
        } else if (user.role === 'LIDER_DOCE') {
            // LIDER_DOCE puede ver invitados invitados/asignados a cualquiera en su red
            const networkUserIds = await getUserNetwork(user.id);
            securityFilter = {
                OR: [
                    { invitedById: { in: networkUserIds } },
                    { assignedToId: { in: networkUserIds } }
                ]
            };
        } else {
            // LIDER_CELULA y MIEMBRO solo pueden ver:
            // 1. Invitados que ellos invitaron Y no están asignados a alguien más
            // 2. Invitados asignados a ellos
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

        // DEBUG: Log del filtro siendo aplicado
        console.log('=== GUEST FILTER DEBUG ===');
        console.log('User:', { id: user.id, role: user.role });
        console.log('Security Filter:', JSON.stringify(securityFilter, null, 2));
        console.log('========================');

        // Construir filtros de consulta
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

        // Combinar filtro de seguridad y filtros de consulta
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

// Obtener invitado específico por ID
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

// Actualizar invitado
const updateGuest = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, address, prayerRequest, status, invitedById, assignedToId } = req.body;
        const user = req.user;

        // Obtener el invitado primero para verificar permisos
        const existingGuest = await prisma.guest.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingGuest) {
            return res.status(404).json({ message: 'Guest not found' });
        }

        // Preparar datos de actualización basados en rol
        let updateData = {};

        if (user.role === 'SUPER_ADMIN') {
            // Super admin puede actualizar todos los campos
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
            // LIDER_DOCE puede actualizar todos los campos para invitados en su red
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
            // LIDER_CELULA y MIEMBRO solo pueden actualizar campo de estado
            // Y solo para invitados que ellos invitaron o les fueron asignados
            const canEdit = existingGuest.invitedById === user.id || existingGuest.assignedToId === user.id;

            if (!canEdit) {
                return res.status(403).json({ message: 'You can only update guests you invited or assigned to you' });
            }

            // Solo permitir actualizaciones de estado
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

// Eliminar invitado
const deleteGuest = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        // Obtener el invitado primero para verificar permisos
        const existingGuest = await prisma.guest.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingGuest) {
            return res.status(404).json({ message: 'Guest not found' });
        }

        // Verificar permisos de eliminación basados en rol
        if (user.role === 'SUPER_ADMIN') {
            // Super admin puede eliminar cualquier invitado
        } else if (user.role === 'LIDER_DOCE') {
            // LIDER_DOCE puede eliminar invitados en su red
            const networkUserIds = await getUserNetwork(user.id);
            const isInNetwork = networkUserIds.includes(existingGuest.invitedById) ||
                (existingGuest.assignedToId && networkUserIds.includes(existingGuest.assignedToId));

            if (!isInNetwork) {
                return res.status(403).json({ message: 'You can only delete guests in your network' });
            }
        } else {
            // LIDER_CELULA y MIEMBRO solo pueden eliminar invitados que ellos invitaron (no asignados)
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

// Asignar invitado a un líder
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

// Convertir invitado a miembro (crear cuenta de usuario)
const convertGuestToMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Obtener el invitado
        const guest = await prisma.guest.findUnique({
            where: { id: parseInt(id) }
        });

        if (!guest) {
            return res.status(404).json({ message: 'Guest not found' });
        }

        // Verificar si el correo ya existe
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        // Hashear contraseña
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear usuario con datos del invitado
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                fullName: guest.name,
                role: 'MIEMBRO',
                // Asignar a la persona que los invitó
                leaderId: guest.invitedById
            }
        });

        // Eliminar el registro del invitado
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

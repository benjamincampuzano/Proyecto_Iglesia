const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Crear nuevo invitado
const createGuest = async (req, res) => {
    try {
        let { name, phone, address, prayerRequest, invitedById, called, callObservation, visited, visitObservation } = req.body;
        const user = req.user;

        if (!name || !phone) {
            return res.status(400).json({ message: 'Name and phone are required' });
        }

        // Case-insensitive role check
        const userRole = user.role.toUpperCase();

        // PASTOR no puede crear invitados directamente
        // Solo puede ver invitados creados por su red (LIDER_DOCE, LIDER_CELULA, MIEMBRO)
        if (userRole === 'PASTOR') {
            return res.status(403).json({
                message: 'Los usuarios con rol PASTOR no pueden crear invitados directamente. Los invitados deben ser creados por LIDER_DOCE, LIDER_CELULA o DISCIPULO.'
            });
        }

        if (userRole === 'LIDER_CELULA' || userRole === 'DISCIPULO') {
            // LIDER_CELULA y DISCIPULO solo pueden crear invitados para sí mismos
            invitedById = user.id;
        } else {
            // SUPER_ADMIN y LIDER_DOCE pueden especificar invitedById
            // Si no se especifica, por defecto es el usuario actual
            if (!invitedById) {
                invitedById = user.id;
            }
        }

        const guest = await prisma.guest.create({
            data: {
                name,
                phone,
                address,
                prayerRequest,
                invitedById: parseInt(invitedById),
                called: called || false,
                callObservation,
                visited: visited || false,
                visitObservation,
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
    const id = parseInt(userId);
    if (isNaN(id)) return [];

    // Find all users who report to this leader via ANY of the hierarchy fields
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

    // Recursively find their disciples
    for (const disciple of directDisciples) {
        if (disciple.id !== id) {
            const subNetwork = await getUserNetwork(disciple.id);
            networkIds = [...networkIds, ...subNetwork];
        }
    }

    // Filter out any undefined/null values as safety measure and deduplicate
    return [...new Set(networkIds.filter(id => id != null))];
};

// Obtener todos los invitados con filtros opcionales
const getAllGuests = async (req, res) => {
    try {
        const { status, invitedById, assignedToId, search, liderDoceId } = req.query;
        const user = req.user; // Obtener usuario autenticado de la petición

        let securityFilter = {};

        // Aplicar visibilidad basada en roles
        if (user.role === 'SUPER_ADMIN') {
            // Super admin puede ver todos los invitados
            securityFilter = {};
        } else if (user.role === 'LIDER_DOCE' || user.role === 'LIDER_CELULA' || user.role === 'PASTOR') {
            // LIDER_DOCE, LIDER_CELULA y PASTOR pueden ver invitados invitados/asignados a cualquiera en su red
            const userId = parseInt(user.id);
            const networkUserIds = await getUserNetwork(userId);
            securityFilter = {
                OR: [
                    { invitedById: { in: [...networkUserIds, userId] } },
                    { assignedToId: { in: [...networkUserIds, userId] } }
                ]
            };
        } else {
            // LIDER_CELULA y DISCIPULO solo pueden ver:
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

        // Construir filtros de consulta
        const queryFilters = {};
        if (status) queryFilters.status = status;
        if (assignedToId) queryFilters.assignedToId = parseInt(assignedToId);
        if (search) {
            queryFilters.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
            ];
        }

        // Lider Doce & Invited By Logic
        if (liderDoceId) {
            const networkIds = await getUserNetwork(liderDoceId);
            const idsToCheck = [...networkIds, parseInt(liderDoceId)];

            if (invitedById) {
                // If filtering by specific inviter AND Lider Doce, prevent conflict or check intersection
                if (!idsToCheck.includes(parseInt(invitedById))) {
                    queryFilters.invitedById = -1; // Force empty result, intersection is empty
                } else {
                    queryFilters.invitedById = parseInt(invitedById);
                }
            } else {
                queryFilters.invitedById = { in: idsToCheck };
            }
        } else if (invitedById) {
            queryFilters.invitedById = parseInt(invitedById);
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
                calls: {
                    include: {
                        caller: { select: { fullName: true } }
                    },
                    orderBy: { date: 'desc' }
                },
                visits: {
                    include: {
                        visitor: { select: { fullName: true } }
                    },
                    orderBy: { date: 'desc' }
                }
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
                calls: {
                    include: {
                        caller: { select: { fullName: true } }
                    },
                    orderBy: { date: 'desc' }
                },
                visits: {
                    include: {
                        visitor: { select: { fullName: true } }
                    },
                    orderBy: { date: 'desc' }
                }
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
        const { name, phone, address, prayerRequest, status, invitedById, assignedToId, called, callObservation, visited, visitObservation } = req.body;
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
                ...(called !== undefined && { called: Boolean(called) }),
                ...(callObservation !== undefined && { callObservation }),
                ...(visited !== undefined && { visited: Boolean(visited) }),
                ...(visitObservation !== undefined && { visitObservation }),
            };
        } else if (user.role === 'LIDER_DOCE' || user.role === 'LIDER_CELULA' || user.role === 'PASTOR') {
            // LIDER_DOCE, LIDER_CELULA y PASTOR pueden actualizar todos los campos para invitados en su red
            const networkUserIds = await getUserNetwork(user.id);
            const isInNetwork = networkUserIds.includes(existingGuest.invitedById) ||
                (existingGuest.assignedToId && networkUserIds.includes(existingGuest.assignedToId)) ||
                existingGuest.invitedById === user.id ||
                existingGuest.assignedToId === user.id;

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
                ...(called !== undefined && { called: Boolean(called) }),
                ...(callObservation !== undefined && { callObservation }),
                ...(visited !== undefined && { visited: Boolean(visited) }),
                ...(visitObservation !== undefined && { visitObservation }),
            };
        } else {
            // LIDER_CELULA y DISCIPULO solo pueden actualizar campo de estado y seguimiento
            const canEdit = existingGuest.invitedById === user.id || existingGuest.assignedToId === user.id;

            if (!canEdit) {
                return res.status(403).json({ message: 'You can only update guests you invited or assigned to you' });
            }

            // Permitir actualizaciones de estado y seguimiento
            updateData = {
                ...(status && { status }),
                ...(called !== undefined && { called: Boolean(called) }),
                ...(callObservation !== undefined && { callObservation }),
                ...(visited !== undefined && { visited: Boolean(visited) }),
                ...(visitObservation !== undefined && { visitObservation }),
            };

            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({ message: 'You can only update status or tracking fields' });
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
        } else if (user.role === 'LIDER_DOCE' || user.role === 'LIDER_CELULA' || user.role === 'PASTOR') {
            // LIDER_DOCE, LIDER_CELULA y PASTOR pueden eliminar invitados en su red
            const networkUserIds = await getUserNetwork(user.id);
            const isInNetwork = networkUserIds.includes(existingGuest.invitedById) ||
                (existingGuest.assignedToId && networkUserIds.includes(existingGuest.assignedToId)) ||
                existingGuest.invitedById === user.id ||
                existingGuest.assignedToId === user.id;

            if (!isInNetwork) {
                return res.status(403).json({ message: 'You can only delete guests in your network' });
            }
        } else {
            // LIDER_CELULA y DISCIPULO solo pueden eliminar invitados que ellos invitaron (no asignados)
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

// Convertir invitado a Discípulo (crear cuenta de usuario)
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
                role: 'DISCIPULO',
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

// Agregar llamada a invitado
const addCall = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, observation } = req.body;
        const user = req.user;

        if (!observation) {
            return res.status(400).json({ message: 'Observation is required' });
        }

        const call = await prisma.guestCall.create({
            data: {
                guestId: parseInt(id),
                date: date ? new Date(date) : new Date(),
                observation,
                callerId: user.id
            }
        });

        // Update guest status to CONTACTADO
        await prisma.guest.update({
            where: { id: parseInt(id) },
            data: { status: 'CONTACTADO' }
        });

        res.status(201).json({ call });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Agregar visita a invitado
const addVisit = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, observation } = req.body;
        const user = req.user;

        if (!observation) {
            return res.status(400).json({ message: 'Observation is required' });
        }

        const visit = await prisma.guestVisit.create({
            data: {
                guestId: parseInt(id),
                date: date ? new Date(date) : new Date(),
                observation,
                visitorId: user.id
            }
        });

        // Update guest status to CONSOLIDADO
        await prisma.guest.update({
            where: { id: parseInt(id) },
            data: { status: 'CONSOLIDADO' }
        });

        res.status(201).json({ visit });
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
    addCall,
    addVisit,
};

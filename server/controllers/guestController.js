const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logActivity } = require('../utils/auditLogger');
const { getUserNetwork } = require('../utils/networkUtils');

// Crear nuevo invitado
const createGuest = async (req, res) => {
    try {
        let { name, phone, address, city, prayerRequest, invitedById, assignedToId, called, callObservation, visited, visitObservation, documentType, documentNumber, birthDate, sex } = req.body;
        const { roles, id: currentUserId } = req.user;

        if (!name || !phone) {
            return res.status(400).json({ message: 'Name and phone are required' });
        }

        // Security: PASTOR only consumes network data, doesn't create guests directly (optional historical rule)
        // Allow ADMIN and ADMIN to bypass this
        const isAdmin = roles.includes('ADMIN');
        if (roles.includes('PASTOR') && !isAdmin) {
            return res.status(403).json({
                message: 'Los usuarios con rol PASTOR no pueden crear invitados directamente. Los invitados deben ser creados por LIDER_DOCE, LIDER_CELULA o DISCIPULO.'
            });
        }

        if (roles.some(r => ['LIDER_CELULA', 'DISCIPULO', 'DISCIPULO'].includes(r))) {
            invitedById = currentUserId;
        } else if (!invitedById) {
            invitedById = currentUserId;
        }

        const guest = await prisma.guest.create({
            data: {
                name,
                phone,
                address,
                city,
                prayerRequest,
                invitedById: parseInt(invitedById),
                assignedToId: assignedToId ? parseInt(assignedToId) : null,
                called: called || false,
                callObservation,
                visited: visited || false,
                visitObservation,
                documentType,
                documentNumber,
                birthDate: birthDate ? new Date(birthDate) : null,
                sex,
            },
            include: {
                invitedBy: {
                    include: { profile: true }
                },
                assignedTo: {
                    include: { profile: true }
                },
            },
        });

        await logActivity(currentUserId, 'CREATE', 'GUEST', guest.id, { name: guest.name }, req.ip, req.headers['user-agent']);

        res.status(201).json({ guest });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Obtener todos los invitados con filtros opcionales
const getAllGuests = async (req, res) => {
    try {
        const { status, invitedById, assignedToId, search, liderDoceId } = req.query;
        const { roles, id: currentUserId } = req.user;

        let securityFilter = {};

        // Aplicar visibilidad basada en roles
        // Allow ADMIN to see everything like ADMIN
        if (roles.includes('ADMIN')) {
            securityFilter = {};
        } else if (roles.some(r => ['PASTOR', 'LIDER_DOCE', 'LIDER_CELULA'].includes(r))) {
            const networkUserIds = await getUserNetwork(currentUserId);
            securityFilter = {
                OR: [
                    { invitedById: { in: [...networkUserIds, currentUserId] } },
                    { assignedToId: { in: [...networkUserIds, currentUserId] } }
                ]
            };
        } else {
            securityFilter = {
                OR: [
                    {
                        AND: [
                            { invitedById: currentUserId },
                            {
                                OR: [
                                    { assignedToId: null },
                                    { assignedToId: currentUserId }
                                ]
                            }
                        ]
                    },
                    { assignedToId: currentUserId }
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
                if (!idsToCheck.includes(parseInt(invitedById))) {
                    queryFilters.invitedById = -1;
                } else {
                    queryFilters.invitedById = parseInt(invitedById);
                }
            } else {
                queryFilters.invitedById = { in: idsToCheck };
            }
        } else if (invitedById) {
            queryFilters.invitedById = parseInt(invitedById);
        }

        const finalWhere = Object.keys(securityFilter).length > 0
            ? { AND: [securityFilter, queryFilters] }
            : queryFilters;

        const guests = await prisma.guest.findMany({
            where: finalWhere,
            include: {
                invitedBy: {
                    include: { profile: true }
                },
                assignedTo: {
                    include: { profile: true }
                },
                calls: {
                    include: {
                        caller: { include: { profile: true } }
                    },
                    orderBy: { date: 'desc' }
                },
                visits: {
                    include: {
                        visitor: { include: { profile: true } }
                    },
                    orderBy: { date: 'desc' }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        // Format for frontend
        const formattedGuests = guests.map(g => ({
            ...g,
            invitedBy: g.invitedBy ? { id: g.invitedBy.id, fullName: g.invitedBy.profile?.fullName, email: g.invitedBy.email } : null,
            assignedTo: g.assignedTo ? { id: g.assignedTo.id, fullName: g.assignedTo.profile?.fullName, email: g.assignedTo.email } : null,
            calls: g.calls.map(c => ({ ...c, caller: c.caller ? { fullName: c.caller.profile?.fullName } : null })),
            visits: g.visits.map(v => ({ ...v, visitor: v.visitor ? { fullName: v.visitor.profile?.fullName } : null }))
        }));

        res.status(200).json({ guests: formattedGuests });
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
                    include: { profile: true }
                },
                assignedTo: {
                    include: { profile: true }
                },
                calls: {
                    include: {
                        caller: { include: { profile: true } }
                    },
                    orderBy: { date: 'desc' }
                },
                visits: {
                    include: {
                        visitor: { include: { profile: true } }
                    },
                    orderBy: { date: 'desc' }
                }
            },
        });

        if (!guest) {
            return res.status(404).json({ message: 'Guest not found' });
        }

        const formattedGuest = {
            ...guest,
            invitedBy: guest.invitedBy ? { id: guest.invitedBy.id, fullName: guest.invitedBy.profile?.fullName, email: guest.invitedBy.email } : null,
            assignedTo: guest.assignedTo ? { id: guest.assignedTo.id, fullName: guest.assignedTo.profile?.fullName, email: guest.assignedTo.email } : null,
            calls: guest.calls.map(c => ({ ...c, caller: c.caller ? { fullName: c.caller.profile?.fullName } : null })),
            visits: guest.visits.map(v => ({ ...v, visitor: v.visitor ? { fullName: v.visitor.profile?.fullName } : null }))
        };

        res.status(200).json({ guest: formattedGuest });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Actualizar invitado
const updateGuest = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, address, city, prayerRequest, status, invitedById, assignedToId, called, callObservation, visited, visitObservation, documentType, documentNumber, birthDate, sex } = req.body;
        const { roles, id: currentUserId } = req.user;

        const existingGuest = await prisma.guest.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingGuest) {
            return res.status(404).json({ message: 'Guest not found' });
        }

        let updateData = {};
        const isAdminValue = roles.includes('ADMIN');
        const isNetworkLeader = roles.some(r => ['PASTOR', 'LIDER_DOCE', 'LIDER_CELULA'].includes(r));

        if (isAdminValue || isNetworkLeader) {
            if (!isAdminValue) {
                const networkUserIds = await getUserNetwork(currentUserId);
                const isInNetwork = networkUserIds.includes(existingGuest.invitedById) ||
                    (existingGuest.assignedToId && networkUserIds.includes(existingGuest.assignedToId)) ||
                    existingGuest.invitedById === currentUserId ||
                    existingGuest.assignedToId === currentUserId;

                if (!isInNetwork) {
                    return res.status(403).json({ message: 'You can only update guests in your network' });
                }
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
                ...(documentType !== undefined && { documentType }),
                ...(documentNumber !== undefined && { documentNumber }),
                ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
                ...(sex !== undefined && { sex }),
                ...(city !== undefined && { city }),
            };
        } else {
            const canEdit = existingGuest.invitedById === currentUserId || existingGuest.assignedToId === currentUserId;

            if (!canEdit) {
                return res.status(403).json({ message: 'You can only update guests you invited or assigned to you' });
            }

            updateData = {
                ...(status && { status }),
                ...(called !== undefined && { called: Boolean(called) }),
                ...(callObservation !== undefined && { callObservation }),
                ...(visited !== undefined && { visited: Boolean(visited) }),
                ...(visitObservation !== undefined && { visitObservation }),
            };
        }

        const guest = await prisma.guest.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                invitedBy: { include: { profile: true } },
                assignedTo: { include: { profile: true } },
            },
        });

        await logActivity(currentUserId, 'UPDATE', 'GUEST', guest.id, { name: guest.name }, req.ip, req.headers['user-agent']);

        const formattedGuest = {
            ...guest,
            invitedBy: guest.invitedBy ? { id: guest.invitedBy.id, fullName: guest.invitedBy.profile?.fullName, email: guest.invitedBy.email } : null,
            assignedTo: guest.assignedTo ? { id: guest.assignedTo.id, fullName: guest.assignedTo.profile?.fullName, email: guest.assignedTo.email } : null
        };

        res.status(200).json({ guest: formattedGuest });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Eliminar invitado
const deleteGuest = async (req, res) => {
    try {
        const { id } = req.params;
        const { roles, id: currentUserId } = req.user;

        const existingGuest = await prisma.guest.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingGuest) {
            return res.status(404).json({ message: 'Guest not found' });
        }

        const isAdminValue = roles.includes('ADMIN');
        const isNetworkLeader = roles.some(r => ['PASTOR', 'LIDER_DOCE', 'LIDER_CELULA'].includes(r));

        if (!isAdminValue) {
            const networkUserIds = isNetworkLeader ? await getUserNetwork(currentUserId) : [];
            const canDelete = isAdminValue ||
                networkUserIds.includes(existingGuest.invitedById) ||
                (existingGuest.assignedToId && networkUserIds.includes(existingGuest.assignedToId)) ||
                existingGuest.invitedById === currentUserId ||
                existingGuest.assignedToId === currentUserId;

            if (!canDelete) {
                return res.status(403).json({ message: 'You can only delete guests in your network or that you invited' });
            }
        }

        await prisma.guest.delete({
            where: { id: parseInt(id) },
        });

        await logActivity(currentUserId, 'DELETE', 'GUEST', parseInt(id), { name: existingGuest.name }, req.ip, req.headers['user-agent']);

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
        const { id: currentUserId } = req.user;

        if (!assignedToId) {
            return res.status(400).json({ message: 'assignedToId is required' });
        }

        const guest = await prisma.guest.update({
            where: { id: parseInt(id) },
            data: {
                assignedToId: parseInt(assignedToId),
            },
            include: {
                invitedBy: { include: { profile: true } },
                assignedTo: { include: { profile: true } },
            },
        });

        await logActivity(currentUserId, 'UPDATE', 'GUEST', guest.id, { action: 'ASSIGN', assignedToId }, req.ip, req.headers['user-agent']);

        const formattedGuest = {
            ...guest,
            invitedBy: guest.invitedBy ? { id: guest.invitedBy.id, fullName: guest.invitedBy.profile?.fullName, email: guest.invitedBy.email } : null,
            assignedTo: guest.assignedTo ? { id: guest.assignedTo.id, fullName: guest.assignedTo.profile?.fullName, email: guest.assignedTo.email } : null
        };

        res.status(200).json({ guest: formattedGuest });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Convertir invitado a Discípulo (crear cuenta de usuario)
const convertGuestToMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, password, phone } = req.body;
        const { id: currentUserId } = req.user;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const guest = await prisma.guest.findUnique({
            where: { id: parseInt(id) }
        });

        if (!guest) {
            return res.status(404).json({ message: 'Guest not found' });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);

        // Atomic transaction to create user and clean up guest
        const newUser = await prisma.$transaction(async (tx) => {
            // 1. Create User and Profile
            const user = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    phone: phone || guest.phone,
                    profile: {
                        create: {
                            fullName: guest.name,
                            address: guest.address,
                            city: guest.city,
                            sex: guest.sex,
                            documentType: guest.documentType,
                            documentNumber: guest.documentNumber,
                            birthDate: guest.birthDate
                        }
                    }
                },
                include: { profile: true }
            });

            // 2. Assign default DISCIPULO role
            const discipleRole = await tx.role.upsert({
                where: { name: 'DISCIPULO' },
                update: {},
                create: { name: 'DISCIPULO' }
            });

            await tx.userRole.create({
                data: {
                    userId: user.id,
                    roleId: discipleRole.id
                }
            });

            // 3. Establish Discipleship Hierarchy (InvitedBy becomes Parent)
            await tx.userHierarchy.create({
                data: {
                    parentId: guest.invitedById,
                    childId: user.id,
                    role: 'DISCIPULO'
                }
            });

            // 4. Delete the guest record
            await tx.guest.delete({
                where: { id: parseInt(id) }
            });

            return user;
        });

        await logActivity(currentUserId, 'CONSOLIDATE', 'GUEST', parseInt(id), { newUserId: newUser.id }, req.ip, req.headers['user-agent']);

        res.status(201).json({
            message: 'Guest consolidated to member successfully',
            user: {
                id: newUser.id,
                email: newUser.email,
                fullName: newUser.profile.fullName,
                roles: ['DISCIPULO']
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
        const { id: userId } = req.user;

        if (!observation) {
            return res.status(400).json({ message: 'Observation is required' });
        }

        const call = await prisma.guestCall.create({
            data: {
                guestId: parseInt(id),
                date: date ? new Date(date) : new Date(),
                observation,
                callerId: userId
            }
        });

        await prisma.guest.update({
            where: { id: parseInt(id) },
            data: { status: 'CONTACTADO', called: true }
        });

        await logActivity(userId, 'CREATE', 'GUEST_CALL', call.id, { guestId: parseInt(id) }, req.ip, req.headers['user-agent']);

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
        const { id: userId } = req.user;

        if (!observation) {
            return res.status(400).json({ message: 'Observation is required' });
        }

        const visit = await prisma.guestVisit.create({
            data: {
                guestId: parseInt(id),
                date: date ? new Date(date) : new Date(),
                observation,
                visitorId: userId
            }
        });

        await prisma.guest.update({
            where: { id: parseInt(id) },
            data: { status: 'CONSOLIDADO', visited: true }
        });

        await logActivity(userId, 'CREATE', 'GUEST_VISIT', visit.id, { guestId: parseInt(id) }, req.ip, req.headers['user-agent']);

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

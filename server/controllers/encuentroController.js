const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logActivity } = require('../utils/auditLogger');
const { getUserNetwork } = require('../utils/networkUtils');

// Helper to check if user has modification access to an encuentro
const checkEncuentroAccess = async (user, encuentroId) => {
    if (user.roles.includes('ADMIN')) return true;

    const encuentro = await prisma.encuentro.findUnique({
        where: { id: parseInt(encuentroId) },
        select: { coordinatorId: true }
    });

    if (!encuentro) return false;
    return encuentro.coordinatorId === parseInt(user.id);
};

const getEncuentros = async (req, res) => {
    try {
        const encuentros = await prisma.encuentro.findMany({
            include: {
                coordinator: {
                    include: { profile: true }
                },
                _count: {
                    select: { registrations: true }
                }
            },
            orderBy: { startDate: 'asc' }
        });

        // Format for frontend
        const formattedEncuentros = encuentros.map(e => ({
            ...e,
            coordinator: e.coordinator ? { id: e.coordinator.id, fullName: e.coordinator.profile?.fullName } : null
        }));

        res.json(formattedEncuentros);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching encuentros' });
    }
};

const getEncuentroById = async (req, res) => {
    try {
        const { id } = req.params;
        const { roles, id: currentUserId } = req.user;

        const encuentro = await prisma.encuentro.findUnique({
            where: { id: parseInt(id) },
            include: {
                coordinator: {
                    include: { profile: true }
                },
                registrations: {
                    include: {
                        guest: {
                            include: {
                                invitedBy: { include: { profile: true } },
                                assignedTo: { include: { profile: true } }
                            }
                        },
                        user: {
                            include: { profile: true }
                        },
                        payments: true,
                        classAttendances: true
                    }
                }
            }
        });

        if (!encuentro) return res.status(404).json({ error: 'Not found' });

        // Visibility Filtering
        let filteredRegistrations = encuentro.registrations;

        const isAdmin = roles.includes('ADMIN');
        const isCoordinator = encuentro.coordinatorId === parseInt(currentUserId);

        if (!isAdmin && !isCoordinator) {
            const networkIds = await getUserNetwork(currentUserId);
            const allowedIds = new Set([...networkIds, parseInt(currentUserId)]);

            filteredRegistrations = encuentro.registrations.filter(reg => {
                const participant = reg.guest || reg.user;
                if (!participant) return false;

                if (reg.guest) {
                    const assignedCheck = reg.guest.assignedToId && allowedIds.has(reg.guest.assignedToId);
                    const invitedCheck = reg.guest.invitedById && allowedIds.has(reg.guest.invitedById);
                    return assignedCheck || invitedCheck;
                } else {
                    return allowedIds.has(reg.userId);
                }
            });
        }

        const registrationsWithStats = filteredRegistrations.map(reg => {
            const totalPaid = reg.payments.reduce((sum, p) => sum + p.amount, 0);
            const finalCost = encuentro.cost * (1 - reg.discountPercentage / 100);
            const balance = finalCost - totalPaid;

            const classesAttended = reg.classAttendances.filter(c => c.attended).length;
            const preEncuentroProgress = reg.classAttendances.filter(c => c.attended && c.classNumber <= 5).length;
            const postEncuentroProgress = reg.classAttendances.filter(c => c.attended && c.classNumber > 5).length;

            return {
                ...reg,
                user: reg.user ? { id: reg.user.id, fullName: reg.user.profile?.fullName, phone: reg.user.phone } : null,
                totalPaid,
                finalCost,
                balance,
                classesAttended,
                preEncuentroProgress,
                postEncuentroProgress
            };
        });

        const formattedEncuentro = {
            ...encuentro,
            coordinator: encuentro.coordinator ? { id: encuentro.coordinator.id, fullName: encuentro.coordinator.profile?.fullName } : null,
            registrations: registrationsWithStats
        };

        res.json(formattedEncuentro);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching detail' });
    }
};

const createEncuentro = async (req, res) => {
    try {
        const { roles, id: userId } = req.user;
        if (!roles.includes('ADMIN') && !roles.includes('ADMIN')) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const { type, name, description, cost, startDate, endDate, liderDoceIds, coordinatorId } = req.body;
        const encuentro = await prisma.encuentro.create({
            data: {
                type,
                name,
                description,
                cost: parseFloat(cost),
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                leaders: {
                    create: (liderDoceIds || []).map(id => ({ userId: parseInt(id) }))
                },
                coordinatorId: coordinatorId ? parseInt(coordinatorId) : null
            }
        });

        await logActivity(userId, 'CREATE', 'ENCUENTRO', encuentro.id, { name: encuentro.name, type: encuentro.type }, req.ip, req.headers['user-agent']);

        res.status(201).json(encuentro);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creating encuentro' });
    }
};

const deleteEncuentro = async (req, res) => {
    try {
        const { id } = req.params;
        const { roles, id: userId } = req.user;

        if (!roles.includes('ADMIN') && !roles.includes('ADMIN')) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const encuentro = await prisma.encuentro.delete({
            where: { id: parseInt(id) },
            select: { id: true, name: true }
        });

        await logActivity(userId, 'DELETE', 'ENCUENTRO', encuentro.id, { name: encuentro.name }, req.ip, req.headers['user-agent']);

        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting' });
    }
};

const updateEncuentro = async (req, res) => {
    try {
        const { id } = req.params;
        const { roles, id: userId } = req.user;

        // Restriction: Only ADMIN or Coordinator
        const hasAccess = await checkEncuentroAccess(req.user, id);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No tienes permisos para modificar este encuentro. Solo el coordinador asignado o un administrador pueden hacerlo.' });
        }

        const { type, name, description, cost, startDate, endDate, liderDoceIds, coordinatorId } = req.body;

        const updateData = {};
        if (type !== undefined) updateData.type = type;
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (cost !== undefined) updateData.cost = parseFloat(cost);
        if (startDate !== undefined) updateData.startDate = new Date(startDate);
        if (endDate !== undefined) updateData.endDate = new Date(endDate);
        if (liderDoceIds !== undefined) {
            updateData.leaders = {
                deleteMany: {},
                create: (liderDoceIds || []).map(id => ({ userId: parseInt(id) }))
            };
        }
        if (coordinatorId !== undefined) updateData.coordinatorId = coordinatorId ? parseInt(coordinatorId) : null;

        const encuentro = await prisma.encuentro.update({
            where: { id: parseInt(id) },
            data: updateData,
            select: { id: true, name: true }
        });

        await logActivity(userId, 'UPDATE', 'ENCUENTRO', encuentro.id, { name: encuentro.name }, req.ip, req.headers['user-agent']);

        res.json(encuentro);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error updating encuentro' });
    }
};

const registerParticipant = async (req, res) => {
    try {
        const { encuentroId } = req.params;
        const { guestId, userId, discountPercentage } = req.body;
        const { roles, id: currentUserId } = req.user;

        // Restriction: Only ADMIN or Coordinator
        const hasAccess = await checkEncuentroAccess(req.user, encuentroId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No tienes permisos para registrar participantes en este encuentro.' });
        }

        // Validation: Must be User XOR Guest
        if ((!guestId && !userId) || (guestId && userId)) {
            return res.status(400).json({ error: 'Must provide either guestId OR userId, not both.' });
        }

        // Integrity Check: Already registered?
        const existing = await prisma.encuentroRegistration.findFirst({
            where: {
                encuentroId: parseInt(encuentroId),
                OR: [
                    guestId ? { guestId: parseInt(guestId) } : {},
                    userId ? { userId: parseInt(userId) } : {}
                ]
            }
        });

        if (existing) {
            return res.status(400).json({ error: 'El participante ya está registrado en este encuentro.' });
        }

        const registration = await prisma.encuentroRegistration.create({
            data: {
                encuentroId: parseInt(encuentroId),
                guestId: guestId ? parseInt(guestId) : null,
                userId: userId ? parseInt(userId) : null,
                discountPercentage: parseFloat(discountPercentage || 0)
            },
            include: {
                guest: true,
                user: { include: { profile: true } }
            }
        });

        // If it's a guest, update status to GANADO (Consolidado)
        if (guestId) {
            await prisma.guest.update({
                where: { id: parseInt(guestId) },
                data: { status: 'GANADO' }
            });
        }

        const encuentro = await prisma.encuentro.findUnique({
            where: { id: parseInt(encuentroId) },
            select: { name: true }
        });

        await logActivity(currentUserId, 'CREATE', 'ENCUENTRO_REGISTRATION', registration.id, {
            Invitado: registration.guest?.name || registration.user?.profile?.fullName || registration.user?.email,
            Encuentro: encuentro.name,
            GuestId: guestId,
            UserId: userId,
            EncuentroId: encuentroId
        }, req.ip, req.headers['user-agent']);

        res.status(201).json(registration);
    } catch (error) {
        console.error(error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'El participante ya está registrado en este encuentro' });
        }
        res.status(500).json({ error: 'Error registering participant' });
    }
};

const deleteRegistration = async (req, res) => {
    try {
        const { registrationId } = req.params;
        const { roles, id: userId } = req.user;

        const registration = await prisma.encuentroRegistration.findUnique({
            where: { id: parseInt(registrationId) },
            select: { id: true, guestId: true, userId: true, encuentroId: true }
        });

        if (!registration) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        // Restriction: Only ADMIN or Coordinator
        const hasAccess = await checkEncuentroAccess(req.user, registration.encuentroId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No tienes permisos para eliminar inscripciones en este encuentro.' });
        }

        await prisma.encuentroRegistration.delete({
            where: { id: parseInt(registrationId) }
        });

        await logActivity(userId, 'DELETE', 'ENCUENTRO_REGISTRATION', registration.id, {
            participantId: registration.guestId || registration.userId,
            encuentroId: registration.encuentroId
        }, req.ip, req.headers['user-agent']);

        res.json({ message: 'Deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Delete failed' });
    }
};

const addPayment = async (req, res) => {
    try {
        const { registrationId } = req.params;
        const { amount, notes } = req.body;
        const { roles, id: userId } = req.user;

        const registration = await prisma.encuentroRegistration.findUnique({
            where: { id: parseInt(registrationId) },
            select: { encuentroId: true }
        });

        if (!registration) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        // Restriction: Only ADMIN or Coordinator
        const hasAccess = await checkEncuentroAccess(req.user, registration.encuentroId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No tienes permisos para agregar pagos en este encuentro.' });
        }

        const payment = await prisma.encuentroPayment.create({
            data: {
                registrationId: parseInt(registrationId),
                amount: parseFloat(amount),
                notes
            }
        });

        await logActivity(userId, 'CREATE', 'ENCUENTRO_PAYMENT', payment.id, { registrationId: parseInt(registrationId), amount }, req.ip, req.headers['user-agent']);

        res.status(201).json(payment);
    } catch (error) {
        res.status(500).json({ error: 'Payment failed' });
    }
};

const updateClassAttendance = async (req, res) => {
    try {
        const { registrationId, classNumber } = req.params; // classNumber 1-10
        const { attended } = req.body;
        const { id: userId } = req.user;

        const registration = await prisma.encuentroRegistration.findUnique({
            where: { id: parseInt(registrationId) },
            select: { encuentroId: true }
        });

        if (!registration) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        // Restriction: Only ADMIN or Coordinator
        const hasAccess = await checkEncuentroAccess(req.user, registration.encuentroId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No tienes permisos para actualizar asistencia en este encuentro.' });
        }

        const record = await prisma.encuentroClassAttendance.upsert({
            where: {
                registrationId_classNumber: {
                    registrationId: parseInt(registrationId),
                    classNumber: parseInt(classNumber)
                }
            },
            update: { attended },
            create: {
                registrationId: parseInt(registrationId),
                classNumber: parseInt(classNumber),
                attended
            }
        });

        await logActivity(userId, 'UPDATE', 'ENCUENTRO_ATTENDANCE', record.id, { registrationId: parseInt(registrationId), classNumber, attended }, req.ip, req.headers['user-agent']);

        res.json(record);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Attendance update failed' });
    }
};

// Helper to get network
// Local getNetworkIds removed in favor of centralized getUserNetwork

const getEncuentroBalanceReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { roles, id: userId } = req.user;

        const encuentro = await prisma.encuentro.findUnique({
            where: { id: parseInt(id) },
            include: {
                registrations: {
                    where: {
                        OR: [
                            { guest: { isNot: null } }, // Guests are fine
                            { user: { roles: { none: { role: { name: 'ADMIN' } } } } }
                        ]
                    },
                    include: {
                        guest: {
                            include: {
                                assignedTo: {
                                    include: {
                                        profile: true,
                                        parents: {
                                            include: { parent: { include: { profile: true } } }
                                        }
                                    }
                                },
                                invitedBy: {
                                    include: {
                                        profile: true,
                                        parents: {
                                            include: { parent: { include: { profile: true } } }
                                        }
                                    }
                                }
                            }
                        },
                        user: {
                            include: {
                                profile: true,
                                parents: {
                                    include: { parent: { include: { profile: true } } }
                                }
                            }
                        },
                        payments: true
                    }
                }
            }
        });

        if (!encuentro) {
            return res.status(404).json({ error: 'Encuentro not found' });
        }

        // Apply Network Filter
        let visibleRegistrations = encuentro.registrations;

        const isAdmin = roles.includes('ADMIN');
        const isCoordinator = encuentro.coordinatorId === parseInt(userId);

        if (!isAdmin && !isCoordinator) {
            const networkIds = await getUserNetwork(userId);
            const allowedIds = new Set([...networkIds, parseInt(userId)]);

            visibleRegistrations = encuentro.registrations.filter(reg => {
                if (reg.guest) {
                    const assignedCheck = reg.guest.assignedToId && allowedIds.has(reg.guest.assignedToId);
                    const invitedCheck = reg.guest.invitedById && allowedIds.has(reg.guest.invitedById);
                    return assignedCheck || invitedCheck;
                } else {
                    return allowedIds.has(reg.userId);
                }
            });
        }

        // Transform Data for Report
        const reportData = visibleRegistrations.map(reg => {
            const totalPaid = reg.payments.reduce((sum, p) => sum + p.amount, 0);
            const finalCost = encuentro.cost * (1 - (reg.discountPercentage / 100));
            const balance = finalCost - totalPaid;

            // Use assignedTo for hierarchy, fallback to invitedBy (for guests)
            const responsibleUser = reg.guest ? (reg.guest.assignedTo || reg.guest.invitedBy) : reg.user;

            const getParentName = (role) => {
                if (!responsibleUser) return 'N/A';
                const parent = responsibleUser.parents?.find(p => p.role === role);
                return parent?.parent?.profile?.fullName || 'N/A';
            };

            return {
                id: reg.id,
                userName: reg.user?.profile?.fullName || reg.user?.email,
                guestName: reg.guest?.name,
                userRole: 'PARTICIPANTE',
                status: reg.guest?.status,
                responsibleName: responsibleUser?.profile?.fullName || 'Sin Asignar',
                pastorName: getParentName('PASTOR'),
                liderDoceName: getParentName('LIDER_DOCE'),
                liderCelulaName: getParentName('LIDER_CELULA'),
                leaderName: getParentName('DISCIPULO'),
                cost: finalCost,
                paid: totalPaid,
                balance: balance,
                paymentsDetails: reg.payments
            };
        });

        res.json(reportData);
    } catch (error) {
        console.error('Error generating balance report:', error);
        res.status(500).json({ error: 'Error generating report' });
    }
};

module.exports = {
    getEncuentros,
    getEncuentroById,
    createEncuentro,
    updateEncuentro,
    deleteEncuentro,
    registerParticipant,
    deleteRegistration,
    addPayment,
    updateClassAttendance,
    getEncuentroBalanceReport
};

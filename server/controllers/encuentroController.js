const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logActivity } = require('../utils/auditLogger');

// Helper to check if user has modification access to an encuentro
const checkEncuentroAccess = async (user, encuentroId) => {
    if (user.role === 'SUPER_ADMIN') return true;

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
                    select: { id: true, fullName: true }
                },
                _count: {
                    select: { registrations: true }
                }
            },
            orderBy: { startDate: 'asc' }
        });
        res.json(encuentros);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching encuentros' });
    }
};

const getEncuentroById = async (req, res) => {
    try {
        const { id } = req.params;
        const encuentro = await prisma.encuentro.findUnique({
            where: { id: parseInt(id) },
            include: {
                coordinator: {
                    select: { id: true, fullName: true }
                },
                registrations: {
                    include: {
                        guest: true, // Includes Guest info
                        user: {
                            select: { id: true, fullName: true, phone: true }
                        },
                        payments: true,
                        classAttendances: true // Includes Class Attendance
                    }
                }
            }
        });

        if (!encuentro) return res.status(404).json({ error: 'Not found' });

        // Calculate metadata for each registration
        let filteredRegistrations = encuentro.registrations;

        // Restriction for non-admin roles: Only see guests in their network
        if (req.user.role !== 'SUPER_ADMIN') {
            const userId = parseInt(req.user.id);
            const networkIds = await getNetworkIds(userId);
            const allowedIds = new Set([...networkIds, userId]);

            filteredRegistrations = encuentro.registrations.filter(reg => {
                const assignedCheck = reg.guest.assignedToId && allowedIds.has(reg.guest.assignedToId);
                const invitedCheck = reg.guest.invitedById && allowedIds.has(reg.guest.invitedById);
                return assignedCheck || invitedCheck;
            });
        }

        const registrationsWithStats = filteredRegistrations.map(reg => {
            const totalPaid = reg.payments.reduce((sum, p) => sum + p.amount, 0);
            const finalCost = encuentro.cost * (1 - reg.discountPercentage / 100);
            const balance = finalCost - totalPaid;

            // Calculate class progress
            const classesAttended = reg.classAttendances.filter(c => c.attended).length;
            const preEncuentroProgress = reg.classAttendances.filter(c => c.attended && c.classNumber <= 5).length;
            const postEncuentroProgress = reg.classAttendances.filter(c => c.attended && c.classNumber > 5).length;

            return {
                ...reg,
                totalPaid,
                finalCost,
                balance,
                classesAttended,
                preEncuentroProgress,
                postEncuentroProgress
            };
        });

        res.json({ ...encuentro, registrations: registrationsWithStats });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching detail' });
    }
};

const createEncuentro = async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN') {
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
                liderDoceIds: liderDoceIds || [],
                coordinatorId: coordinatorId ? parseInt(coordinatorId) : null
            }
        });

        await logActivity(req.user.id, 'CREATE', 'ENCUENTRO', encuentro.id, { name: encuentro.name, type: encuentro.type });

        res.status(201).json(encuentro);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creating encuentro' });
    }
};

const deleteEncuentro = async (req, res) => {
    try {
        const { id } = req.params;
        // Check permissions (Only SUPER_ADMIN)
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const encuentro = await prisma.encuentro.delete({
            where: { id: parseInt(id) },
            select: { id: true, name: true }
        });

        await logActivity(req.user.id, 'DELETE', 'ENCUENTRO', encuentro.id, { name: encuentro.name });

        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting' });
    }
};

const updateEncuentro = async (req, res) => {
    try {
        const { id } = req.params;

        // Restriction: Only SUPER_ADMIN or Coordinator
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
        if (liderDoceIds !== undefined) updateData.liderDoceIds = liderDoceIds;
        if (coordinatorId !== undefined) updateData.coordinatorId = coordinatorId ? parseInt(coordinatorId) : null;

        const encuentro = await prisma.encuentro.update({
            where: { id: parseInt(id) },
            data: updateData,
            select: { id: true, name: true }
        });

        await logActivity(req.user.id, 'UPDATE', 'ENCUENTRO', encuentro.id, { name: encuentro.name });

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

        // Restriction: Only SUPER_ADMIN or Coordinator
        const hasAccess = await checkEncuentroAccess(req.user, encuentroId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No tienes permisos para registrar participantes en este encuentro.' });
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
                user: { select: { fullName: true } }
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

        await logActivity(req.user.id, 'CREATE', 'ENCUENTRO_REGISTRATION', registration.id, {
            Invitado: registration.guest.name,
            Encuentro: encuentro.name,
            GuestId: guestId,
            EncuentroId: encuentroId
        });

        res.status(201).json(registration);
    } catch (error) {
        console.error(error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'El invitado ya está registrado en este encuentro' });
        }
        res.status(500).json({ error: 'Error registering guest' });
    }
};

const deleteRegistration = async (req, res) => {
    try {
        const { registrationId } = req.params;

        const registration = await prisma.encuentroRegistration.findUnique({
            where: { id: parseInt(registrationId) },
            select: { id: true, guestId: true, userId: true, encuentroId: true }
        });

        if (!registration) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        // Restriction: Only SUPER_ADMIN or Coordinator
        const hasAccess = await checkEncuentroAccess(req.user, registration.encuentroId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No tienes permisos para eliminar inscripciones en este encuentro.' });
        }

        await prisma.encuentroRegistration.delete({
            where: { id: parseInt(registrationId) }
        });

        await logActivity(req.user.id, 'DELETE', 'ENCUENTRO_REGISTRATION', registration.id, {
            participantId: registration.guestId || registration.userId,
            encuentroId: registration.encuentroId
        });

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

        const registration = await prisma.encuentroRegistration.findUnique({
            where: { id: parseInt(registrationId) },
            select: { encuentroId: true }
        });

        if (!registration) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        // Restriction: Only SUPER_ADMIN or Coordinator
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
        res.status(201).json(payment);
    } catch (error) {
        res.status(500).json({ error: 'Payment failed' });
    }
};

const updateClassAttendance = async (req, res) => {
    try {
        const { registrationId, classNumber } = req.params; // classNumber 1-10
        const { attended } = req.body;

        const registration = await prisma.encuentroRegistration.findUnique({
            where: { id: parseInt(registrationId) },
            select: { encuentroId: true }
        });

        if (!registration) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        // Restriction: Only SUPER_ADMIN or Coordinator
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
        res.json(record);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Attendance update failed' });
    }
};

// Helper to get network
const getNetworkIds = async (leaderId) => {
    const id = parseInt(leaderId);
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
            const subNetwork = await getNetworkIds(disciple.id);
            networkIds = [...networkIds, ...subNetwork];
        }
    }

    return [...new Set(networkIds)];
};

const getEncuentroBalanceReport = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const encuentro = await prisma.encuentro.findUnique({
            where: { id: parseInt(id) },
            include: {
                registrations: {
                    include: {
                        guest: {
                            include: {
                                assignedTo: {
                                    include: {
                                        leader: { select: { fullName: true } },
                                        liderDoce: { select: { fullName: true } },
                                        liderCelula: { select: { fullName: true } },
                                        pastor: { select: { fullName: true } }
                                    }
                                },
                                invitedBy: {
                                    include: {
                                        leader: { select: { fullName: true } },
                                        liderDoce: { select: { fullName: true } },
                                        liderCelula: { select: { fullName: true } },
                                        pastor: { select: { fullName: true } }
                                    }
                                }
                            }
                        },
                        user: {
                            include: {
                                leader: { select: { fullName: true } },
                                liderDoce: { select: { fullName: true } },
                                liderCelula: { select: { fullName: true } },
                                pastor: { select: { fullName: true } }
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

        if (user.role === 'SUPER_ADMIN') {
            // All
        } else if (user.role === 'LIDER_DOCE' || user.role === 'LIDER_CELULA' || user.role === 'PASTOR') {
            const userId = parseInt(user.id);
            const networkIds = await getNetworkIds(userId);
            const allowedIds = new Set([...networkIds, userId]);

            visibleRegistrations = encuentro.registrations.filter(reg => {
                const participant = reg.guest || reg.user;
                if (!participant) return false;

                if (reg.guest) {
                    const assignedCheck = reg.guest.assignedToId && allowedIds.has(reg.guest.assignedToId);
                    const invitedCheck = reg.guest.invitedById && allowedIds.has(reg.guest.invitedById);
                    return assignedCheck || invitedCheck;
                } else {
                    // For user registrations, check if the user itself or its leaders are in the allowed list
                    return allowedIds.has(reg.user.id) ||
                        (reg.user.liderCelulaId && allowedIds.has(reg.user.liderCelulaId)) ||
                        (reg.user.liderDoceId && allowedIds.has(reg.user.liderDoceId)) ||
                        (reg.user.pastorId && allowedIds.has(reg.user.pastorId));
                }
            });
        } else {
            // Member sees guests assigned to them OR invited by them
            const userId = parseInt(user.id);
            visibleRegistrations = encuentro.registrations.filter(reg => {
                if (reg.guest) {
                    return reg.guest.assignedToId === userId || reg.guest.invitedById === userId;
                } else {
                    return reg.userId === userId;
                }
            });
        }

        // Transform Data for Report
        const reportData = visibleRegistrations.map(reg => {
            const totalPaid = reg.payments.reduce((sum, p) => sum + p.amount, 0);
            const finalCost = encuentro.cost * (1 - (reg.discountPercentage / 100));
            const balance = finalCost - totalPaid;

            // Use assignedTo for hierarchy, fallback to invitedBy (for guests)
            // Or the user's direct hierarchy (for users)
            const responsibleUser = reg.guest ? (reg.guest.assignedTo || reg.guest.invitedBy) : reg.user;

            return {
                id: reg.id,
                userName: reg.user?.fullName,
                guestName: reg.guest?.name,
                userRole: reg.user?.role,
                status: reg.guest?.status,
                responsibleName: responsibleUser?.fullName || 'Sin Asignar',
                pastorName: responsibleUser?.pastor?.fullName || 'N/A',
                liderDoceName: responsibleUser?.liderDoce?.fullName || 'N/A',
                liderCelulaName: responsibleUser?.liderCelula?.fullName || 'N/A',
                leaderName: responsibleUser?.leader?.fullName || 'N/A',
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

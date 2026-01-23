const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logActivity } = require('../utils/auditLogger');
const { getUserNetwork } = require('../utils/networkUtils');

const getConventions = async (req, res) => {
    try {
        const { year } = req.query;
        // Safeguard req.user access
        const roles = req.user?.roles || [];
        const currentUserId = req.user?.id;

        const where = {};
        if (year) {
            const parsedYear = parseInt(year);
            if (!isNaN(parsedYear)) {
                where.year = parsedYear;
            }
        }

        const conventions = await prisma.convention.findMany({
            where,
            select: {
                id: true,
                type: true,
                year: true,
                theme: true,
                cost: true,
                startDate: true,
                endDate: true,
                _count: {
                    select: { registrations: true }
                },
                registrations: {
                    select: {
                        id: true,
                        discountPercentage: true,
                        payments: {
                            select: { amount: true }
                        }
                    }
                }
            },
            orderBy: {
                startDate: 'asc'
            }
        });

        // Filter for specific roles: Only show conventions they are registered for if they are not leaders/admin
        const isLeaderOrAdmin = roles.some(r => ['SUPER_ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA'].includes(r));

        let filteredConventions = conventions;
        if (!isLeaderOrAdmin) {
            if (!currentUserId) {
                // If we don't have a valid user ID, we can't show user specific registrations.
                filteredConventions = [];
            } else {
                const userRegistrations = await prisma.conventionRegistration.findMany({
                    where: { userId: parseInt(currentUserId) },
                    select: { conventionId: true }
                });
                const registeredConventionIds = new Set(userRegistrations.map(r => r.conventionId));
                filteredConventions = conventions.filter(c => registeredConventionIds.has(c.id));
            }
        }

        // Calculate stats
        const conventionsWithStats = filteredConventions.map(conv => {
            const totalCollected = conv.registrations?.reduce((acc, reg) => {
                const paymentsSum = reg.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
                return acc + paymentsSum;
            }, 0) || 0;

            const expectedIncome = conv.registrations?.reduce((acc, reg) => {
                const cost = conv.cost * (1 - ((reg.discountPercentage || 0) / 100));
                return acc + cost;
            }, 0) || 0;

            return {
                ...conv,
                stats: {
                    registeredCount: conv._count?.registrations || 0,
                    totalCollected,
                    expectedIncome
                }
            };
        });

        res.json(conventionsWithStats);
    } catch (error) {
        console.error('Error fetching conventions:', error);
        res.status(500).json({ error: 'Error getting conventions: ' + error.message });
    }
};

// Helper to get network
// Local getNetworkIds removed in favor of centralized getUserNetwork (networkUtils)

const getConventionById = async (req, res) => {
    const { id } = req.params;
    const roles = req.user?.roles || [];
    const currentUserId = req.user?.id;

    try {
        const convention = await prisma.convention.findUnique({
            where: { id: parseInt(id) },
            select: {
                id: true,
                type: true,
                year: true,
                theme: true,
                cost: true,
                startDate: true,
                endDate: true,
                registrations: {
                    where: {
                        user: {
                            roles: {
                                none: {
                                    role: { name: 'SUPER_ADMIN' }
                                }
                            }
                        }
                    },
                    select: {
                        id: true,
                        userId: true,
                        discountPercentage: true,
                        needsTransport: true,
                        needsAccommodation: true,
                        user: {
                            include: { profile: true }
                        },
                        payments: {
                            select: {
                                id: true,
                                amount: true,
                                date: true,
                                notes: true
                            },
                            orderBy: { date: 'desc' }
                        }
                    }
                }
            }
        });

        if (!convention) {
            return res.status(404).json({ error: 'Convention not found' });
        }

        // Filter registrations based on Role & Network
        let visibleRegistrations = convention.registrations || [];

        if (roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')) {
            // See all
        } else if (roles.some(r => ['LIDER_DOCE', 'LIDER_CELULA', 'PASTOR'].includes(r))) {
            if (currentUserId) {
                const networkIds = await getUserNetwork(currentUserId);
                const allowedIds = new Set([...networkIds, parseInt(currentUserId)]);
                visibleRegistrations = visibleRegistrations.filter(reg => {
                    const assignedCheck = allowedIds.has(reg.userId);
                    // Check logic: registeredById is not selected in the main query above, so relying on network + self
                    return assignedCheck;
                });
            }
        } else {
            // Member sees only themselves
            if (currentUserId) {
                visibleRegistrations = visibleRegistrations.filter(reg => reg.userId === parseInt(currentUserId));
            } else {
                visibleRegistrations = [];
            }
        }

        // Enhance registrations with balance info
        const registrationsWithBalance = visibleRegistrations.map(reg => {
            const totalPaid = reg.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
            const initialCost = convention.cost;
            const finalCost = initialCost * (1 - ((reg.discountPercentage || 0) / 100));
            const balance = finalCost - totalPaid;

            return {
                ...reg,
                user: {
                    id: reg.user.id,
                    fullName: reg.user.profile?.fullName,
                    email: reg.user.email
                },
                totalPaid,
                finalCost,
                balance
            };
        });

        res.json({ ...convention, registrations: registrationsWithBalance });
    } catch (error) {
        console.error('Error fetching convention details:', error);
        res.status(500).json({ error: 'Error getting convention details: ' + error.message });
    }
};

const createConvention = async (req, res) => {
    try {
        const roles = req.user?.roles || [];
        const userId = req.user?.id;

        if (!roles.includes('SUPER_ADMIN') && !roles.includes('ADMIN')) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const { type, year, theme, cost, startDate, endDate, liderDoceIds } = req.body;

        const existing = await prisma.convention.findUnique({
            where: {
                type_year: {
                    type,
                    year: parseInt(year)
                }
            },
            select: { id: true }
        });

        if (existing) {
            return res.status(400).json({ error: `Convention ${type} ${year} already exists` });
        }

        const convention = await prisma.convention.create({
            data: {
                type,
                year: parseInt(year),
                theme,
                cost: parseFloat(cost),
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                leaders: {
                    create: (liderDoceIds || []).map(id => ({ userId: parseInt(id) }))
                }
            }
        });

        if (userId) {
            await logActivity(userId, 'CREATE', 'CONVENTION', convention.id, { type, year }, req.ip, req.headers['user-agent']);
        }

        res.status(201).json(convention);
    } catch (error) {
        console.error('Error creating convention:', error);
        res.status(500).json({ error: 'Error creating convention' });
    }
};

const updateConvention = async (req, res) => {
    try {
        const { id } = req.params;
        const roles = req.user?.roles || [];
        const userId = req.user?.id;

        if (!roles.some(r => ['SUPER_ADMIN', 'LIDER_DOCE', 'PASTOR'].includes(r))) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { type, year, theme, cost, startDate, endDate, liderDoceIds } = req.body;

        const updateData = {};
        if (type !== undefined) updateData.type = type;
        if (year !== undefined) updateData.year = parseInt(year);
        if (theme !== undefined) updateData.theme = theme;
        if (cost !== undefined) updateData.cost = parseFloat(cost);
        if (startDate !== undefined) updateData.startDate = new Date(startDate);
        if (endDate !== undefined) updateData.endDate = new Date(endDate);
        if (liderDoceIds !== undefined) {
            updateData.leaders = {
                deleteMany: {},
                create: (liderDoceIds || []).map(id => ({ userId: parseInt(id) }))
            };
        }

        const convention = await prisma.convention.update({
            where: { id: parseInt(id) },
            data: updateData,
            select: { id: true, type: true, year: true }
        });

        if (userId) {
            await logActivity(userId, 'UPDATE', 'CONVENTION', convention.id, { type: convention.type, year: convention.year }, req.ip, req.headers['user-agent']);
        }

        res.json(convention);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error updating convention' });
    }
};

const registerUser = async (req, res) => {
    try {
        const { conventionId } = req.params;
        const { userId, discountPercentage, needsTransport, needsAccommodation } = req.body;
        const roles = req.user?.roles || [];
        const currentUserId = req.user?.id;

        // Restriction: Only SUPER_ADMIN, ADMIN, PASTOR, or LIDER_DOCE
        if (!roles.some(r => ['SUPER_ADMIN', 'PASTOR', 'LIDER_DOCE'].includes(r))) {
            return res.status(403).json({ error: 'No tienes permisos para registrar participantes en convenciones' });
        }

        const existing = await prisma.conventionRegistration.findUnique({
            where: {
                userId_conventionId: {
                    userId: parseInt(userId),
                    conventionId: parseInt(conventionId)
                }
            },
            select: { id: true }
        });

        if (existing) {
            return res.status(400).json({ error: 'User is already registered for this convention' });
        }

        const registration = await prisma.conventionRegistration.create({
            data: {
                userId: parseInt(userId),
                conventionId: parseInt(conventionId),
                discountPercentage: parseFloat(discountPercentage || 0),
                needsTransport: needsTransport || false,
                needsAccommodation: needsAccommodation || false,
                registeredById: currentUserId ? parseInt(currentUserId) : undefined
            },
            select: {
                id: true,
                user: {
                    include: { profile: true }
                }
            }
        });

        const convention = await prisma.convention.findUnique({
            where: { id: parseInt(conventionId) },
            select: { type: true, year: true }
        });

        if (currentUserId) {
            await logActivity(currentUserId, 'CREATE', 'CONVENTION_REGISTRATION', registration.id, {
                Usuario: registration.user.profile?.fullName || registration.user.email,
                Evento: `${convention.type} ${convention.year}`,
                UserId: userId,
                ConventionId: conventionId
            }, req.ip, req.headers['user-agent']);
        }

        res.status(201).json(registration);
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Error registering user' });
    }
};

const addPayment = async (req, res) => {
    try {
        const { registrationId } = req.params;
        const { amount, notes } = req.body;
        const roles = req.user?.roles || [];
        const userId = req.user?.id;

        // Restriction: Only SUPER_ADMIN, ADMIN, PASTOR, or LIDER_DOCE
        if (!roles.some(r => ['SUPER_ADMIN', 'PASTOR', 'LIDER_DOCE'].includes(r))) {
            return res.status(403).json({ error: 'No tienes permisos para agregar pagos' });
        }

        const payment = await prisma.conventionPayment.create({
            data: {
                registrationId: parseInt(registrationId),
                amount: parseFloat(amount),
                notes
            }
        });

        if (userId) {
            await logActivity(userId, 'CREATE', 'CONVENTION_PAYMENT', payment.id, { registrationId: parseInt(registrationId), amount }, req.ip, req.headers['user-agent']);
        }

        res.status(201).json(payment);
    } catch (error) {
        console.error('Error adding payment:', error);
        res.status(500).json({ error: 'Error adding payment' });
    }
};

const deleteRegistration = async (req, res) => {
    try {
        const { registrationId } = req.params;
        const roles = req.user?.roles || [];
        const userId = req.user?.id;

        if (!roles.includes('SUPER_ADMIN') && !roles.includes('ADMIN')) {
            return res.status(403).json({ error: 'Not authorized to delete registrations' });
        }

        const registration = await prisma.conventionRegistration.delete({
            where: { id: parseInt(registrationId) },
            select: { id: true, userId: true, conventionId: true }
        });

        if (userId) {
            await logActivity(userId, 'DELETE', 'CONVENTION_REGISTRATION', registration.id, { userId: registration.userId, conventionId: registration.conventionId }, req.ip, req.headers['user-agent']);
        }

        res.json({ message: 'Registration deleted successfully' });
    } catch (error) {
        console.error('Error deleting registration:', error);
        res.status(500).json({ error: 'Error deleting registration' });
    }
};

const deleteConvention = async (req, res) => {
    try {
        const { id } = req.params;
        const roles = req.user?.roles || [];
        const userId = req.user?.id;

        if (!roles.includes('SUPER_ADMIN') && !roles.includes('ADMIN')) {
            return res.status(403).json({ error: 'Not authorized to delete conventions' });
        }

        const convention = await prisma.convention.delete({
            where: { id: parseInt(id) },
            select: { id: true, type: true, year: true }
        });

        if (userId) {
            await logActivity(userId, 'DELETE', 'CONVENTION', convention.id, { type: convention.type, year: convention.year }, req.ip, req.headers['user-agent']);
        }

        res.json({ message: 'Convention deleted successfully' });
    } catch (error) {
        console.error('Error deleting convention:', error);
        res.status(500).json({ error: 'Error deleting convention' });
    }
};

const getConventionBalanceReport = async (req, res) => {
    try {
        const { id } = req.params;
        const roles = req.user?.roles || [];
        const userId = req.user?.id;

        const convention = await prisma.convention.findUnique({
            where: { id: parseInt(id) },
            select: {
                cost: true,
                registrations: {
                    select: {
                        id: true,
                        userId: true,
                        discountPercentage: true,
                        user: {
                            include: {
                                profile: true,
                                parents: {
                                    include: {
                                        parent: { include: { profile: true } }
                                    }
                                }
                            }
                        },
                        payments: {
                            select: {
                                amount: true,
                                date: true,
                                notes: true
                            }
                        }
                    }
                }
            }
        });

        if (!convention) {
            return res.status(404).json({ error: 'Convention not found' });
        }

        // Apply Network Filter
        let visibleRegistrations = convention.registrations || [];
        if (roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')) {
            // All
        } else if (roles.some(r => ['PASTOR', 'LIDER_DOCE', 'LIDER_CELULA'].includes(r))) {
            if (userId) {
                const networkIds = await getUserNetwork(userId);
                const allowedIds = new Set([...networkIds, parseInt(userId)]);
                visibleRegistrations = visibleRegistrations.filter(reg => {
                    const assignedCheck = allowedIds.has(reg.userId);
                    return assignedCheck;
                });
            } else {
                visibleRegistrations = [];
            }
        } else {
            // Members see only themselves
            if (userId) {
                visibleRegistrations = visibleRegistrations.filter(reg => reg.userId === parseInt(userId));
            } else {
                visibleRegistrations = [];
            }
        }

        // Transform Data for Report
        const reportData = visibleRegistrations.map(reg => {
            const totalPaid = reg.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
            const initialCost = convention.cost;
            const finalCost = initialCost * (1 - ((reg.discountPercentage || 0) / 100));
            const balance = finalCost - totalPaid;

            // Simplified hierarchy display for the report
            const getParentName = (role) => {
                const parent = reg.user.parents.find(p => p.role === role);
                return parent?.parent?.profile?.fullName || 'N/A';
            };

            return {
                id: reg.id,
                userName: reg.user.profile?.fullName || reg.user.email,
                userRole: 'DISCIPULO', // Roles would need to be fetched/joined if needed specifically
                pastorName: getParentName('PASTOR'),
                liderDoceName: getParentName('LIDER_DOCE'),
                liderCelulaName: getParentName('LIDER_CELULA'),
                leaderName: getParentName('DISCIPULO'), // Direct discipler
                cost: finalCost,
                paid: totalPaid,
                balance: balance,
                paymentsDetails: reg.payments
            };
        });

        res.json(reportData);
    } catch (error) {
        console.error('Error generating balance report:', error);
        res.status(500).json({ error: 'Error generating report: ' + error.message });
    }
};

module.exports = {
    getConventions,
    getConventionById,
    createConvention,
    updateConvention,
    registerUser,
    addPayment,
    deleteRegistration,
    deleteConvention,
    getConventionBalanceReport
};

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logActivity } = require('../utils/auditLogger');

const getConventions = async (req, res) => {
    try {
        const { year } = req.query;
        const where = {};
        if (year) {
            where.year = parseInt(year);
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
                liderDoceIds: true,
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

        // Filter for DISCIPULO: Only show conventions they are registered for
        if (req.user.role === 'DISCIPULO') {
            const userRegistrations = await prisma.conventionRegistration.findMany({
                where: { userId: req.user.id },
                select: { conventionId: true }
            });
            const registeredConventionIds = new Set(userRegistrations.map(r => r.conventionId));

            // Filter the conventions list
            const filteredConventions = conventions.filter(c => registeredConventionIds.has(c.id));

            // Re-assign conventions to the filtered list for further processing (stats calculation)
            // Note: const conventions above prevents reassignment, so we'll just return early or adapt the map below.
            // Better approach: wrap the map
            const conventionsWithStats = filteredConventions.map(conv => {
                const totalCollected = conv.registrations.reduce((acc, reg) => {
                    const paymentsSum = reg.payments.reduce((sum, p) => sum + p.amount, 0);
                    return acc + paymentsSum;
                }, 0);

                const expectedIncome = conv.registrations.reduce((acc, reg) => {
                    const cost = conv.cost * (1 - (reg.discountPercentage / 100));
                    return acc + cost;
                }, 0);

                return {
                    ...conv,
                    stats: {
                        registeredCount: conv._count.registrations,
                        totalCollected,
                        expectedIncome
                    }
                };
            });
            return res.json(conventionsWithStats);
        }

        // Calculate stats (Original Logic)
        const conventionsWithStats = conventions.map(conv => {
            const totalCollected = conv.registrations.reduce((acc, reg) => {
                const paymentsSum = reg.payments.reduce((sum, p) => sum + p.amount, 0);
                return acc + paymentsSum;
            }, 0);

            const expectedIncome = conv.registrations.reduce((acc, reg) => {
                const cost = conv.cost * (1 - (reg.discountPercentage / 100));
                return acc + cost;
            }, 0);

            // Hide registrations list for the list view to keep payload small? 
            // Or maybe just send it all for now since n is small (4 conventions/year)
            // But let's sanitize strictly for the list view if needed.
            // keeping it simple for now.

            return {
                ...conv,
                stats: {
                    registeredCount: conv._count.registrations,
                    totalCollected,
                    expectedIncome
                }
            };
        });

        res.json(conventionsWithStats);
    } catch (error) {
        console.error('Error fetching conventions:', error);
        res.status(500).json({ error: 'Error getting conventions' });
    }
};

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

const getConventionById = async (req, res) => {
    const { id } = req.params;
    const user = req.user;

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
                liderDoceIds: true,
                registrations: {
                    select: {
                        id: true,
                        userId: true,
                        discountPercentage: true,
                        needsTransport: true,
                        needsAccommodation: true,
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                email: true,
                                role: true
                            }
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
        let visibleRegistrations = convention.registrations;

        if (user.role === 'SUPER_ADMIN') {
            // See all
        } else if (user.role === 'LIDER_DOCE' || user.role === 'LIDER_CELULA' || user.role === 'PASTOR') {
            const userId = parseInt(user.id);
            const networkIds = await getNetworkIds(userId);
            const allowedIds = new Set([...networkIds, userId]);
            visibleRegistrations = convention.registrations.filter(reg => {
                const assignedCheck = allowedIds.has(reg.userId);
                const registeredByCheck = reg.registeredById === userId;
                return assignedCheck || registeredByCheck;
            });
        } else {
            // Member sees only themselves
            visibleRegistrations = convention.registrations.filter(reg => reg.userId === parseInt(user.id));
        }

        // Enhance registrations with balance info
        const registrationsWithBalance = visibleRegistrations.map(reg => {
            const totalPaid = reg.payments.reduce((sum, p) => sum + p.amount, 0);
            const initialCost = convention.cost;
            const finalCost = initialCost * (1 - (reg.discountPercentage / 100));
            const balance = finalCost - totalPaid;

            return {
                ...reg,
                totalPaid,
                finalCost,
                balance
            };
        });

        res.json({ ...convention, registrations: registrationsWithBalance });
    } catch (error) {
        console.error('Error fetching convention details:', error);
        res.status(500).json({ error: 'Error getting convention details' });
    }
};

const createConvention = async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN') {
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
                liderDoceIds: liderDoceIds || []
            }
        });

        await logActivity(req.user.id, 'CREATE', 'CONVENTION', convention.id, { type, year });

        res.status(201).json(convention);
    } catch (error) {
        console.error('Error creating convention:', error);
        res.status(500).json({ error: 'Error creating convention' });
    }
};

const updateConvention = async (req, res) => {
    try {
        const { id } = req.params;
        // Check permissions (SUPER_ADMIN, LIDER_DOCE or PASTOR)
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'LIDER_DOCE' && req.user.role !== 'PASTOR') {
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
        if (liderDoceIds !== undefined) updateData.liderDoceIds = liderDoceIds;

        const convention = await prisma.convention.update({
            where: { id: parseInt(id) },
            data: updateData,
            select: { id: true, type: true, year: true }
        });

        await logActivity(req.user.id, 'UPDATE', 'CONVENTION', convention.id, { type: convention.type, year: convention.year });

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

        // Restriction: Only SUPER_ADMIN, PASTOR, or LIDER_DOCE
        if (req.user.role === 'LIDER_CELULA' || req.user.role === 'DISCIPULO') {
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
                needsAccommodation: needsAccommodation || false
            },
            select: {
                id: true,
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true
                    }
                }
            }
        });

        const convention = await prisma.convention.findUnique({
            where: { id: parseInt(conventionId) },
            select: { type: true, year: true }
        });

        await logActivity(req.user.id, 'CREATE', 'CONVENTION_REGISTRATION', registration.id, {
            Usuario: registration.user.fullName,
            Evento: `${convention.type} ${convention.year}`,
            UserId: userId,
            ConventionId: conventionId
        });

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

        // Restriction: Only SUPER_ADMIN, PASTOR, or LIDER_DOCE
        if (req.user.role === 'LIDER_CELULA' || req.user.role === 'DISCIPULO') {
            return res.status(403).json({ error: 'No tienes permisos para agregar pagos' });
        }

        const payment = await prisma.conventionPayment.create({
            data: {
                registrationId: parseInt(registrationId),
                amount: parseFloat(amount),
                notes
            }
        });

        res.status(201).json(payment);
    } catch (error) {
        console.error('Error adding payment:', error);
        res.status(500).json({ error: 'Error adding payment' });
    }
};

const deleteRegistration = async (req, res) => {
    try {
        const { registrationId } = req.params;

        // Check permissions (Only SUPER_ADMIN)
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Not authorized to delete registrations' });
        }

        const registration = await prisma.conventionRegistration.delete({
            where: { id: parseInt(registrationId) },
            select: { id: true, userId: true, conventionId: true }
        });

        await logActivity(req.user.id, 'DELETE', 'CONVENTION_REGISTRATION', registration.id, { userId: registration.userId, conventionId: registration.conventionId });

        res.json({ message: 'Registration deleted successfully' });
    } catch (error) {
        console.error('Error deleting registration:', error);
        res.status(500).json({ error: 'Error deleting registration' });
    }
};

const deleteConvention = async (req, res) => {
    try {
        const { id } = req.params;

        // Check permissions (Only SUPER_ADMIN)
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Not authorized to delete conventions' });
        }

        const convention = await prisma.convention.delete({
            where: { id: parseInt(id) },
            select: { id: true, type: true, year: true }
        });

        await logActivity(req.user.id, 'DELETE', 'CONVENTION', convention.id, { type: convention.type, year: convention.year });

        res.json({ message: 'Convention deleted successfully' });
    } catch (error) {
        console.error('Error deleting convention:', error);
        res.status(500).json({ error: 'Error deleting convention' });
    }
};

const getConventionBalanceReport = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

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
                            select: {
                                fullName: true,
                                role: true,
                                leader: { select: { fullName: true } },
                                liderDoce: { select: { fullName: true } },
                                liderCelula: { select: { fullName: true } },
                                pastor: { select: { fullName: true } }
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
        let visibleRegistrations = convention.registrations;
        if (user.role === 'SUPER_ADMIN') {
            // All
        } else if (user.role === 'LIDER_DOCE' || user.role === 'LIDER_CELULA' || user.role === 'PASTOR') {
            const userId = parseInt(user.id);
            const networkIds = await getNetworkIds(userId);
            const allowedIds = new Set([...networkIds, userId]);
            visibleRegistrations = convention.registrations.filter(reg => {
                const assignedCheck = allowedIds.has(reg.userId);
                const registeredByCheck = reg.registeredById === userId;
                return assignedCheck || registeredByCheck;
            });
        } else {
            // Members see only themselves
            visibleRegistrations = convention.registrations.filter(reg => reg.userId === parseInt(user.id));
        }

        // Transform Data for Report
        const reportData = visibleRegistrations.map(reg => {
            const totalPaid = reg.payments.reduce((sum, p) => sum + p.amount, 0);
            const initialCost = convention.cost;
            const finalCost = initialCost * (1 - (reg.discountPercentage / 100));
            const balance = finalCost - totalPaid;

            return {
                id: reg.id,
                userName: reg.user.fullName,
                userRole: reg.user.role,
                pastorName: reg.user.pastor?.fullName || 'N/A',
                liderDoceName: reg.user.liderDoce?.fullName || 'N/A',
                liderCelulaName: reg.user.liderCelula?.fullName || 'N/A',
                leaderName: reg.user.leader?.fullName || 'N/A', // Direct discipler
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

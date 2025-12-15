const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getConventions = async (req, res) => {
    try {
        const { year } = req.query;
        const where = {};
        if (year) {
            where.year = parseInt(year);
        }

        const conventions = await prisma.convention.findMany({
            where,
            include: {
                _count: {
                    select: { registrations: true }
                },
                registrations: {
                    include: {
                        payments: true
                    }
                }
            },
            orderBy: {
                startDate: 'asc'
            }
        });

        // Calculate stats
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
            include: {
                registrations: {
                    include: {
                        user: true,
                        payments: {
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
        } else if (user.role === 'LIDER_DOCE' || user.role === 'LIDER_CELULA') {
            const userId = parseInt(user.id);
            const networkIds = await getNetworkIds(userId);
            const allowedIds = new Set([...networkIds, userId]);
            visibleRegistrations = convention.registrations.filter(reg => allowedIds.has(reg.userId));
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
        const { type, year, theme, cost, startDate, endDate } = req.body;

        const existing = await prisma.convention.findUnique({
            where: {
                type_year: {
                    type,
                    year: parseInt(year)
                }
            }
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
                endDate: new Date(endDate)
            }
        });

        res.status(201).json(convention);
    } catch (error) {
        console.error('Error creating convention:', error);
        res.status(500).json({ error: 'Error creating convention' });
    }
};

const registerUser = async (req, res) => {
    try {
        const { conventionId } = req.params;
        const { userId, discountPercentage } = req.body;

        const existing = await prisma.conventionRegistration.findUnique({
            where: {
                userId_conventionId: {
                    userId: parseInt(userId),
                    conventionId: parseInt(conventionId)
                }
            }
        });

        if (existing) {
            return res.status(400).json({ error: 'User is already registered for this convention' });
        }

        const registration = await prisma.conventionRegistration.create({
            data: {
                userId: parseInt(userId),
                conventionId: parseInt(conventionId),
                discountPercentage: parseFloat(discountPercentage || 0)
            },
            include: {
                user: true
            }
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

        await prisma.conventionRegistration.delete({
            where: { id: parseInt(registrationId) }
        });

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

        await prisma.convention.delete({
            where: { id: parseInt(id) }
        });

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
            include: {
                registrations: {
                    include: {
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

        if (!convention) {
            return res.status(404).json({ error: 'Convention not found' });
        }

        // Apply Network Filter
        let visibleRegistrations = convention.registrations;
        if (user.role === 'SUPER_ADMIN') {
            // All
        } else if (user.role === 'LIDER_DOCE' || user.role === 'LIDER_CELULA') {
            const userId = parseInt(user.id);
            const networkIds = await getNetworkIds(userId);
            const allowedIds = new Set([...networkIds, userId]);
            visibleRegistrations = convention.registrations.filter(reg => allowedIds.has(reg.userId));
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
    registerUser,
    addPayment,
    deleteRegistration,
    deleteConvention,
    getConventionBalanceReport
};

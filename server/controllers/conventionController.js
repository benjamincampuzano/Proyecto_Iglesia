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

const getConventionById = async (req, res) => {
    const { id } = req.params;
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

        // Enhance registrations with balance info
        const registrationsWithBalance = convention.registrations.map(reg => {
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

        // Check permissions (Only SUPER_ADMIN and LIDER_DOCE)
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'LIDER_DOCE') {
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

        // Check permissions (Only SUPER_ADMIN and LIDER_DOCE)
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'LIDER_DOCE') {
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

module.exports = {
    getConventions,
    getConventionById,
    createConvention,
    registerUser,
    addPayment,
    deleteRegistration,
    deleteConvention
};

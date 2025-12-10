const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getEncuentros = async (req, res) => {
    try {
        const encuentros = await prisma.encuentro.findMany({
            include: {
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
                registrations: {
                    include: {
                        guest: true, // Includes Guest info
                        payments: true,
                        classAttendances: true // Includes Class Attendance
                    }
                }
            }
        });

        if (!encuentro) return res.status(404).json({ error: 'Not found' });

        // Calculate metadata for each registration
        const registrationsWithStats = encuentro.registrations.map(reg => {
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
        const { type, name, description, cost, startDate, endDate } = req.body;
        const encuentro = await prisma.encuentro.create({
            data: {
                type,
                name,
                description,
                cost: parseFloat(cost),
                startDate: new Date(startDate),
                endDate: new Date(endDate)
            }
        });
        res.status(201).json(encuentro);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creating encuentro' });
    }
};

const deleteEncuentro = async (req, res) => {
    try {
        const { id } = req.params;
        // Check permissions (Only SUPER_ADMIN and LIDER_DOCE)
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'LIDER_DOCE') {
            return res.status(403).json({ error: 'Not authorized' });
        }
        await prisma.encuentro.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting' });
    }
};

const registerGuest = async (req, res) => {
    try {
        const { encuentroId } = req.params;
        const { guestId, discountPercentage } = req.body;

        const registration = await prisma.encuentroRegistration.create({
            data: {
                encuentroId: parseInt(encuentroId),
                guestId: parseInt(guestId),
                discountPercentage: parseFloat(discountPercentage || 0)
            },
            include: { guest: true }
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
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'LIDER_DOCE') {
            return res.status(403).json({ error: 'Not authorized' });
        }
        await prisma.encuentroRegistration.delete({ where: { id: parseInt(registrationId) } });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Delete failed' });
    }
};

const addPayment = async (req, res) => {
    try {
        const { registrationId } = req.params;
        const { amount, notes } = req.body;
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

module.exports = {
    getEncuentros,
    getEncuentroById,
    createEncuentro,
    deleteEncuentro,
    registerGuest,
    deleteRegistration,
    addPayment,
    updateClassAttendance
};

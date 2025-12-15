const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all seminar modules
const getAllModules = async (req, res) => {
    try {
        const { type } = req.query;
        const whereClause = type ? { type } : {};

        const modules = await prisma.seminarModule.findMany({
            where: whereClause,
            include: {
                _count: {
                    select: {
                        enrollments: true
                    }
                }
            },
            orderBy: {
                moduleNumber: 'asc'
            }
        });

        res.json(modules);
    } catch (error) {
        console.error('Error fetching modules:', error);
        res.status(500).json({ error: 'Error fetching modules' });
    }
};

// Create a new module
const createModule = async (req, res) => {
    try {
        const { name, description, moduleNumber, code, type } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const moduleData = {
            name,
            description,
            type: type || 'SEMINARIO',
            code
        };

        if (moduleNumber !== undefined && moduleNumber !== null && moduleNumber !== '') {
            const parsedModuleNumber = parseInt(moduleNumber);
            if (isNaN(parsedModuleNumber)) {
                return res.status(400).json({ error: 'Module number must be a valid number' });
            }
            moduleData.moduleNumber = parsedModuleNumber;
        }

        const module = await prisma.seminarModule.create({
            data: moduleData
        });

        res.status(201).json(module);
    } catch (error) {
        console.error('Error creating module:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Module code or number already exists' });
        }
        res.status(500).json({ error: 'Error creating module' });
    }
};

// Update a module
const updateModule = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, moduleNumber, code, type } = req.body;

        // Check if module exists
        const existingModule = await prisma.seminarModule.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingModule) {
            return res.status(404).json({ error: 'Module not found' });
        }

        const updateData = {
            ...(name && { name }),
            ...(description && { description }),
            ...(code && { code }),
            ...(type && { type }),
            ...(moduleNumber !== undefined && { moduleNumber: parseInt(moduleNumber) })
        };

        const module = await prisma.seminarModule.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        res.json(module);
    } catch (error) {
        console.error('Error updating module:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Module code or number already exists' });
        }
        res.status(500).json({ error: 'Error updating module' });
    }
};

// Update enrollment progress (assignments, status, finalProjectGrade)
const updateProgress = async (req, res) => {
    try {
        const { enrollmentId } = req.params;
        const { assignmentsDone, status, finalProjectGrade } = req.body;

        const updateData = {};
        if (assignmentsDone !== undefined) updateData.assignmentsDone = parseInt(assignmentsDone);
        if (status) updateData.status = status;
        if (finalProjectGrade !== undefined) updateData.finalProjectGrade = parseFloat(finalProjectGrade);

        const enrollment = await prisma.seminarEnrollment.update({
            where: { id: parseInt(enrollmentId) },
            data: updateData
        });

        res.json(enrollment);
    } catch (error) {
        console.error('Error updating progress:', error);
        res.status(500).json({ error: 'Error updating progress' });
    }
};

// ... existing deleteModule, enrollStudent, getModuleEnrollments ...

// Delete a module
const deleteModule = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.seminarModule.delete({
            where: { id: parseInt(id) }
        });

        res.json({ message: 'Module deleted successfully' });
    } catch (error) {
        console.error('Error deleting module:', error);
        res.status(500).json({ error: 'Error deleting module' });
    }
};

// Helper to get network
const getUserNetwork = async (leaderId) => {
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
            const subNetwork = await getUserNetwork(disciple.id);
            networkIds = [...networkIds, ...subNetwork];
        }
    }

    return [...new Set(networkIds)];
};

// Enroll a user in a module
const enrollStudent = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { userId, phone, address } = req.body;
        const requestingUser = req.user;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // --- Refinement: Role and Network Check ---
        // "Solo los lideres de 12 pueden inscribir"
        // Also allow SUPER_ADMIN for testing/management
        if (requestingUser.role !== 'LIDER_DOCE' && requestingUser.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Solo los Líderes de 12 pueden inscribir estudiantes.' });
        }

        // "Personas de su red"
        // If SUPER_ADMIN, bypass check.
        if (requestingUser.role === 'LIDER_DOCE') {
            const networkIds = await getUserNetwork(requestingUser.id);
            if (!networkIds.includes(parseInt(userId))) {
                return res.status(403).json({ error: 'Solo puedes inscribir a personas de tu red.' });
            }
        }
        // -------------------------------------------

        // Update User info if provided
        if (phone || address) {
            await prisma.user.update({
                where: { id: parseInt(userId) },
                data: {
                    ...(phone && { phone }),
                    ...(address && { address })
                }
            });
        }

        // Check if already enrolled
        const existingEnrollment = await prisma.seminarEnrollment.findUnique({
            where: {
                userId_moduleId: {
                    userId: parseInt(userId),
                    moduleId: parseInt(moduleId)
                }
            }
        });

        if (existingEnrollment) {
            return res.status(400).json({ error: 'User is already enrolled in this module' });
        }

        const enrollment = await prisma.seminarEnrollment.create({
            data: {
                userId: parseInt(userId),
                moduleId: parseInt(moduleId),
                status: 'INSCRITO'
            }
        });

        res.status(201).json(enrollment);
    } catch (error) {
        console.error('Error enrolling student:', error);
        res.status(500).json({ error: 'Error enrolling student' });
    }
};

// Get enrollments for a module
const getModuleEnrollments = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const user = req.user;
        let where = { moduleId: parseInt(moduleId) };

        // Security Filter
        if (user.role === 'SUPER_ADMIN') {
            // See all
        } else if (user.role === 'LIDER_DOCE' || user.role === 'LIDER_CELULA') {
            const userId = parseInt(user.id);
            const networkIds = await getUserNetwork(userId);
            where.userId = { in: [...networkIds, userId] };
        } else {
            // Members see only themselves
            where.userId = parseInt(user.id);
        }

        const enrollments = await prisma.seminarEnrollment.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true
                    }
                },
                classAttendances: {
                    orderBy: {
                        classNumber: 'asc'
                    }
                }
            }
        });

        res.json(enrollments);
    } catch (error) {
        console.error('Error fetching enrollments:', error);
        res.status(500).json({ error: 'Error fetching enrollments' });
    }
};

module.exports = {
    getAllModules,
    createModule,
    updateModule,
    deleteModule,
    enrollStudent,
    getModuleEnrollments,
    updateProgress
};

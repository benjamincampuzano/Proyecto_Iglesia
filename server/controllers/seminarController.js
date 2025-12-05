const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all seminar modules
const getAllModules = async (req, res) => {
    try {
        const modules = await prisma.seminarModule.findMany({
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
        const { name, description, moduleNumber } = req.body;

        if (!name || moduleNumber === undefined || moduleNumber === null || moduleNumber === '') {
            return res.status(400).json({ error: 'Name and module number are required' });
        }

        const parsedModuleNumber = parseInt(moduleNumber);
        if (isNaN(parsedModuleNumber)) {
            return res.status(400).json({ error: 'Module number must be a valid number' });
        }

        // Check if module number already exists
        const existingModule = await prisma.seminarModule.findUnique({
            where: { moduleNumber: parsedModuleNumber }
        });

        if (existingModule) {
            return res.status(400).json({ error: 'Module number already exists' });
        }

        const module = await prisma.seminarModule.create({
            data: {
                name,
                description,
                moduleNumber: parsedModuleNumber
            }
        });

        res.status(201).json(module);
    } catch (error) {
        console.error('Error creating module:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Module number already exists' });
        }
        res.status(500).json({ error: 'Error creating module' });
    }
};

// Update a module
const updateModule = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, moduleNumber } = req.body;

        // Check if module exists
        const existingModule = await prisma.seminarModule.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingModule) {
            return res.status(404).json({ error: 'Module not found' });
        }

        // If updating moduleNumber, check uniqueness
        if (moduleNumber !== undefined && parseInt(moduleNumber) !== existingModule.moduleNumber) {
            const duplicate = await prisma.seminarModule.findUnique({
                where: { moduleNumber: parseInt(moduleNumber) }
            });
            if (duplicate) {
                return res.status(400).json({ error: 'Module number already exists' });
            }
        }

        const module = await prisma.seminarModule.update({
            where: { id: parseInt(id) },
            data: {
                ...(name && { name }),
                ...(description && { description }),
                ...(moduleNumber && { moduleNumber: parseInt(moduleNumber) })
            }
        });

        res.json(module);
    } catch (error) {
        console.error('Error updating module:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Module number already exists' });
        }
        res.status(500).json({ error: 'Error updating module' });
    }
};

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

// Enroll a user in a module
const enrollStudent = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
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

        const enrollments = await prisma.seminarEnrollment.findMany({
            where: { moduleId: parseInt(moduleId) },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true
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
    getModuleEnrollments
};

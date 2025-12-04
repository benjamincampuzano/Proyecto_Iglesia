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

        if (!name || !moduleNumber) {
            return res.status(400).json({ error: 'Name and module number are required' });
        }

        const module = await prisma.seminarModule.create({
            data: {
                name,
                description,
                moduleNumber: parseInt(moduleNumber)
            }
        });

        res.status(201).json(module);
    } catch (error) {
        console.error('Error creating module:', error);
        res.status(500).json({ error: 'Error creating module' });
    }
};

// Update a module
const updateModule = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, moduleNumber } = req.body;

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

module.exports = {
    getAllModules,
    createModule,
    updateModule,
    deleteModule
};

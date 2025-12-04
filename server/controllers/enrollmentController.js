const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Enroll a student in a module
const enrollStudent = async (req, res) => {
    try {
        const { userId, moduleId } = req.body;

        if (!userId || !moduleId) {
            return res.status(400).json({ error: 'User ID and Module ID are required' });
        }

        const enrollment = await prisma.seminarEnrollment.create({
            data: {
                userId: parseInt(userId),
                moduleId: parseInt(moduleId),
                status: 'INSCRITO'
            },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true
                    }
                },
                module: true
            }
        });

        res.status(201).json(enrollment);
    } catch (error) {
        console.error('Error enrolling student:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Student already enrolled in this module' });
        }
        res.status(500).json({ error: 'Error enrolling student' });
    }
};

// Get enrollments by module
const getEnrollmentsByModule = async (req, res) => {
    try {
        const { moduleId } = req.params;

        const enrollments = await prisma.seminarEnrollment.findMany({
            where: {
                moduleId: parseInt(moduleId)
            },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true
                    }
                },
                _count: {
                    select: {
                        classAttendances: true
                    }
                }
            },
            orderBy: {
                user: {
                    fullName: 'asc'
                }
            }
        });

        res.json(enrollments);
    } catch (error) {
        console.error('Error fetching enrollments:', error);
        res.status(500).json({ error: 'Error fetching enrollments' });
    }
};

// Get student's enrollment history
const getStudentEnrollments = async (req, res) => {
    try {
        const { userId } = req.params;

        const enrollments = await prisma.seminarEnrollment.findMany({
            where: {
                userId: parseInt(userId)
            },
            include: {
                module: true,
                _count: {
                    select: {
                        classAttendances: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json(enrollments);
    } catch (error) {
        console.error('Error fetching student enrollments:', error);
        res.status(500).json({ error: 'Error fetching student enrollments' });
    }
};

// Update enrollment status
const updateEnrollmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        const enrollment = await prisma.seminarEnrollment.update({
            where: { id: parseInt(id) },
            data: { status },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true
                    }
                },
                module: true
            }
        });

        res.json(enrollment);
    } catch (error) {
        console.error('Error updating enrollment status:', error);
        res.status(500).json({ error: 'Error updating enrollment status' });
    }
};

module.exports = {
    enrollStudent,
    getEnrollmentsByModule,
    getStudentEnrollments,
    updateEnrollmentStatus
};

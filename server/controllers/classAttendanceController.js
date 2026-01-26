const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { SCHOOL_LEVELS } = require('../utils/levelConstants');

// Record class attendance
const recordClassAttendance = async (req, res) => {
    try {
        const { enrollmentId, classNumber, status, notes } = req.body;

        if (!enrollmentId || !classNumber || !status) {
            return res.status(400).json({ error: 'Enrollment ID, class number, and status are required' });
        }

        // Get enrollment to get userId
        const enrollment = await prisma.seminarEnrollment.findUnique({
            where: { id: parseInt(enrollmentId) }
        });

        if (!enrollment) {
            return res.status(404).json({ error: 'Enrollment not found' });
        }

        const attendance = await prisma.classAttendance.upsert({
            where: {
                enrollmentId_classNumber: {
                    enrollmentId: parseInt(enrollmentId),
                    classNumber: parseInt(classNumber)
                }
            },
            update: {
                status,
                grade: req.body.grade !== undefined ? parseFloat(req.body.grade) : undefined,
                notes: notes || null
            },
            create: {
                enrollmentId: parseInt(enrollmentId),
                userId: enrollment.userId,
                classNumber: parseInt(classNumber),
                status,
                grade: req.body.grade !== undefined ? parseFloat(req.body.grade) : null,
                notes: notes || null
            }
        });

        res.json(attendance);
    } catch (error) {
        console.error('Error recording class attendance:', error);
        res.status(500).json({ error: 'Error recording class attendance' });
    }
};

// Get class attendance for an enrollment
const getEnrollmentAttendances = async (req, res) => {
    try {
        const { enrollmentId } = req.params;

        const attendances = await prisma.classAttendance.findMany({
            where: {
                enrollmentId: parseInt(enrollmentId)
            },
            orderBy: {
                classNumber: 'asc'
            }
        });

        res.json(attendances);
    } catch (error) {
        console.error('Error fetching class attendances:', error);
        res.status(500).json({ error: 'Error fetching class attendances' });
    }
};

// Get student progress with RBAC and level tracking
const getStudentProgress = async (req, res) => {
    try {
        const { userId } = req.params;
        const requestingUser = req.user;
        const targetUserId = parseInt(userId);

        // RBAC Check
        const isSelf = requestingUser.id === targetUserId;
        const isAdmin = requestingUser.role === 'ADMIN';
        const isPastor = requestingUser.role === 'PASTOR';

        // For Leaders, we'd need to check the network. 
        // For now, let's assume they can see if they are the leader in the hierarchy.
        // But the user said: "Lider_Doce, pueda ver informacion de su propa red. Lider_celula, pueda ver la informacion de las personas de su red."

        let canAccess = isSelf || isAdmin || isPastor;

        if (!canAccess) {
            // Check network
            const targetUser = await prisma.user.findUnique({
                where: { id: targetUserId },
                select: { pastorId: true, liderDoceId: true, liderCelulaId: true }
            });

            if (targetUser) {
                if (requestingUser.role === 'LIDER_DOCE' && targetUser.liderDoceId === requestingUser.id) canAccess = true;
                if (requestingUser.role === 'LIDER_CELULA' && targetUser.liderCelulaId === requestingUser.id) canAccess = true;
            }
        }

        if (!canAccess) {
            return res.status(403).json({ error: 'Not authorized to view this progress' });
        }

        const enrollments = await prisma.seminarEnrollment.findMany({
            where: { userId: targetUserId },
            include: {
                module: true,
                classAttendances: { orderBy: { classNumber: 'asc' } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Map enrollments to progress and also check which levels are missing
        const progressByModuleNumber = {};
        enrollments.forEach(enrollment => {
            const totalClasses = 10;
            const attendedClasses = enrollment.classAttendances.filter(att => att.status === 'ASISTE').length;

            progressByModuleNumber[enrollment.module.moduleNumber] = {
                enrollment,
                stats: {
                    totalClasses,
                    attendedClasses,
                    attendancePercentage: totalClasses > 0 ? ((attendedClasses / totalClasses) * 100).toFixed(2) : 0
                }
            };
        });

        // Create the 6-level mapping
        const schoolLevelProgress = SCHOOL_LEVELS.map(level => {
            const data = progressByModuleNumber[level.moduleNumber];
            return {
                ...level,
                status: data ? data.enrollment.status : 'FALTA',
                data: data || null
            };
        });

        res.json({
            userId: targetUserId,
            levels: schoolLevelProgress,
            allEnrollments: enrollments // Keep original for backwards compatibility if needed
        });
    } catch (error) {
        console.error('Error fetching student progress:', error);
        res.status(500).json({ error: 'Error fetching student progress' });
    }
};

// Get class attendance for a module and class number
const getModuleClassAttendance = async (req, res) => {
    try {
        const { moduleId, classNumber } = req.params;

        const attendances = await prisma.classAttendance.findMany({
            where: {
                enrollment: {
                    moduleId: parseInt(moduleId)
                },
                classNumber: parseInt(classNumber)
            },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true
                    }
                },
                enrollment: {
                    select: {
                        id: true,
                        status: true
                    }
                }
            },
            orderBy: {
                user: {
                    fullName: 'asc'
                }
            }
        });

        res.json(attendances);
    } catch (error) {
        console.error('Error fetching module class attendance:', error);
        res.status(500).json({ error: 'Error fetching module class attendance' });
    }
};

module.exports = {
    recordClassAttendance,
    getEnrollmentAttendances,
    getStudentProgress,
    getModuleClassAttendance
};

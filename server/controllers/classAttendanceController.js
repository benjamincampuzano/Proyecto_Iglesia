const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

// Get student progress
const getStudentProgress = async (req, res) => {
    try {
        const { userId } = req.params;

        const enrollments = await prisma.seminarEnrollment.findMany({
            where: {
                userId: parseInt(userId)
            },
            include: {
                module: true,
                classAttendances: {
                    orderBy: {
                        classNumber: 'asc'
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Calculate progress for each enrollment
        const progress = enrollments.map(enrollment => {
            const totalClasses = 10;
            const attendedClasses = enrollment.classAttendances.filter(
                att => att.status === 'ASISTE'
            ).length;
            const justifiedAbsences = enrollment.classAttendances.filter(
                att => att.status === 'AUSENCIA_JUSTIFICADA'
            ).length;
            const unjustifiedAbsences = enrollment.classAttendances.filter(
                att => att.status === 'AUSENCIA_NO_JUSTIFICADA'
            ).length;
            const dropped = enrollment.classAttendances.filter(
                att => att.status === 'BAJA'
            ).length;

            return {
                enrollment,
                stats: {
                    totalClasses,
                    attendedClasses,
                    justifiedAbsences,
                    unjustifiedAbsences,
                    dropped,
                    attendancePercentage: totalClasses > 0
                        ? ((attendedClasses / totalClasses) * 100).toFixed(2)
                        : 0
                }
            };
        });

        res.json(progress);
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

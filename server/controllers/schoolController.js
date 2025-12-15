const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- Module / Class Management ---

const createModule = async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'LIDER_DOCE') {
            return res.status(403).json({ error: 'Not authorized to create classes' });
        }

        const { name, description, moduleId, professorId, startDate, endDate, auxiliarIds } = req.body;

        // Create the module
        const moduleData = {
            name,
            description,
            moduleNumber: moduleId ? parseInt(moduleId) : undefined,
            type: 'ESCUELA', // Distinguish from generic seminars
            professorId: professorId ? parseInt(professorId) : undefined,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
        };

        // Handle Auxiliaries (Many-to-Many)
        if (auxiliarIds && Array.isArray(auxiliarIds)) {
            moduleData.auxiliaries = {
                connect: auxiliarIds.map(id => ({ id: parseInt(id) }))
            };
        }

        const newModule = await prisma.seminarModule.create({
            data: moduleData
        });

        res.status(201).json(newModule);
    } catch (error) {
        console.error('Error creating module:', error);
        res.status(500).json({ error: 'Error creating module' });
    }
};

const getModules = async (req, res) => {
    try {
        const user = req.user;
        let whereClause = { type: 'ESCUELA' };

        // Filtering based on role
        if (user.role === 'SUPER_ADMIN' || user.role === 'PASTOR') {
            // See all
        } else if (user.role === 'LIDER_DOCE') {
            // See classes where they are Professor OR Auxiliar
            whereClause = {
                type: 'ESCUELA',
                OR: [
                    { professorId: parseInt(user.id) },
                    { auxiliaries: { some: { id: parseInt(user.id) } } }
                ]
            };
        } else {
            // Students: See classes they are enrolled in
            // Auxiliars (who might be MIEMBRO): See classes where they are Auxiliar
            whereClause = {
                type: 'ESCUELA',
                OR: [
                    { enrollments: { some: { userId: parseInt(user.id) } } },
                    { auxiliaries: { some: { id: parseInt(user.id) } } }
                ]
            };
        }

        const modules = await prisma.seminarModule.findMany({
            where: whereClause,
            include: {
                professor: { select: { id: true, fullName: true } },
                _count: { select: { enrollments: true } }
            },
            orderBy: { startDate: 'desc' }
        });

        res.json(modules);
    } catch (error) {
        console.error('Error fetching modules:', error);
        res.status(500).json({ error: 'Error fetching modules' });
    }
};

// --- Student Enrollment ---

const enrollStudent = async (req, res) => {
    try {
        // Only Professor or Admin can enroll students usually, or maybe open enrollment?
        // Requirement says "Auxiliar: Solo registro de Asistencia, notas... del grupo asignado"
        // Implies someone assigns them. Let's allow Admin/Professor/Auxiliar to enroll?
        // For now, restriction: SUPER_ADMIN, LIDER_DOCE (Professor)

        const { moduleId, studentId, assignedAuxiliarId } = req.body;

        // Check permissions... assuming loose for now or strict?
        // Let's allow if user has access to the module.

        const enrollment = await prisma.seminarEnrollment.create({
            data: {
                moduleId: parseInt(moduleId),
                userId: parseInt(studentId),
                assignedAuxiliarId: assignedAuxiliarId ? parseInt(assignedAuxiliarId) : undefined,
                status: 'INSCRITO'
            }
        });

        res.status(201).json(enrollment);
    } catch (error) {
        console.error('Error enrolling student:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Student already enrolled' });
        }
        res.status(500).json({ error: 'Error enrolling student' });
    }
};

// --- Matrix Logic ---

const getModuleMatrix = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const moduleId = parseInt(id);

        // Fetch Module
        const moduleData = await prisma.seminarModule.findUnique({
            where: { id: moduleId },
            include: {
                professor: { select: { id: true, fullName: true } },
                auxiliaries: { select: { id: true, fullName: true } }
            }
        });

        if (!moduleData) return res.status(404).json({ error: 'Module not found' });

        // Access Control
        const isProfessor = moduleData.professorId === user.id || user.role === 'SUPER_ADMIN';
        // Check if user is an aux for this module
        const isAuxiliar = moduleData.auxiliaries.some(a => a.id === user.id);

        // Determine which enrollments to show
        let enrollmentsQuery = { moduleId };

        if (isProfessor) {
            // See all
        } else if (isAuxiliar) {
            // See ONLY assigned students ?? Or all but edit only assigned?
            // User request: "Auxiliar... Solo registro de Asistencia, notas y proyectos del grupo asignado"
            // It says "Solo registro", implies they MIGHT see others? But usually "del grupo asignado" implies visibility scope too.
            // Let's restrict visibility to Assigned Group for simplicity and privacy.
            enrollmentsQuery.assignedAuxiliarId = user.id;
        } else {
            // Student: See ONLY themselves
            enrollmentsQuery.userId = user.id;
        }

        const enrollments = await prisma.seminarEnrollment.findMany({
            where: enrollmentsQuery,
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        role: true
                    }
                },
                assignedAuxiliar: {
                    select: { id: true, fullName: true }
                },
                classAttendances: {
                    orderBy: { classNumber: 'asc' }
                }
            },
            orderBy: { user: { fullName: 'asc' } }
        });

        // Format for Matrix
        // We need 10 columns.
        const matrix = enrollments.map(enrollment => {
            const attendances = {};
            const grades = {};

            // Fill existing data
            enrollment.classAttendances.forEach(rec => {
                attendances[rec.classNumber] = rec.status;
                grades[rec.classNumber] = rec.grade;
            });

            return {
                id: enrollment.id,
                studentId: enrollment.user.id,
                studentName: enrollment.user.fullName,
                auxiliarId: enrollment.assignedAuxiliarId,
                auxiliarName: enrollment.assignedAuxiliar?.fullName || 'Sin Asignar',
                // Data for 10 sessions
                attendances, // { 1: 'ASISTE', 2: 'AUSENTE'... }
                grades,      // { 1: 5.0, 2: 4.5 ... }
                projectNotes: enrollment.projectNotes,
                finalGrade: enrollment.finalGrade
            };
        });

        res.json({
            module: moduleData,
            matrix,
            permissions: {
                isProfessor,
                isAuxiliar,
                isStudent: !isProfessor && !isAuxiliar
            }
        });

    } catch (error) {
        console.error('Error fetching matrix:', error);
        res.status(500).json({ error: 'Error fetching matrix' });
    }
};

const updateMatrixCell = async (req, res) => {
    try {
        const { enrollmentId, type, key, value } = req.body;
        // type: 'attendance', 'grade', 'project', 'final'
        // key: classNumber (1-10) for attendance/grade

        const user = req.user;

        // Fetch enrollment to check permissions
        const enrollment = await prisma.seminarEnrollment.findUnique({
            where: { id: parseInt(enrollmentId) },
            include: { module: { include: { auxiliaries: true } } }
        });

        if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

        // Permission Check
        const isProfessor = enrollment.module.professorId === user.id || user.role === 'SUPER_ADMIN';
        const isAssignedAuxiliar = enrollment.assignedAuxiliarId === user.id;

        if (!isProfessor && !isAssignedAuxiliar) {
            return res.status(403).json({ error: 'Not authorized to edit this student' });
        }

        // Update Logic
        if (type === 'attendance') {
            const classNumber = parseInt(key);
            await prisma.classAttendance.upsert({
                where: {
                    enrollmentId_classNumber: {
                        enrollmentId: enrollment.id,
                        classNumber
                    }
                },
                create: {
                    enrollmentId: enrollment.id,
                    userId: enrollment.userId,
                    classNumber,
                    status: value // Enum
                },
                update: { status: value }
            });
        } else if (type === 'grade') {
            const classNumber = parseInt(key);
            await prisma.classAttendance.upsert({
                where: {
                    enrollmentId_classNumber: {
                        enrollmentId: enrollment.id,
                        classNumber
                    }
                },
                create: {
                    enrollmentId: enrollment.id,
                    userId: enrollment.userId,
                    classNumber,
                    grade: parseFloat(value)
                },
                update: { grade: parseFloat(value) }
            });
        } else if (type === 'projectNotes') {
            await prisma.seminarEnrollment.update({
                where: { id: enrollment.id },
                data: { projectNotes: value }
            });
        } else if (type === 'finalGrade') {
            await prisma.seminarEnrollment.update({
                where: { id: enrollment.id },
                data: { finalGrade: parseFloat(value) }
            });
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Error updating matrix:', error);
        res.status(500).json({ error: 'Update failed' });
    }
};

module.exports = {
    createModule,
    getModules,
    enrollStudent,
    getModuleMatrix,
    updateMatrixCell
};

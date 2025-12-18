const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { SCHOOL_LEVELS } = require('../utils/levelConstants');

// --- Module / Class Management ---

const createModule = async (req, res) => {
    try {
        const isAdmin = req.user.role === 'SUPER_ADMIN';
        const isProfesorRole = req.user.role === 'PROFESOR';

        if (!isAdmin && !isProfesorRole && req.user.role !== 'LIDER_DOCE') {
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

const updateModule = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, moduleId, professorId, startDate, endDate, auxiliarIds } = req.body;

        const isAdmin = req.user.role === 'SUPER_ADMIN';
        const isProfesorRole = req.user.role === 'PROFESOR';

        if (!isAdmin && !isProfesorRole && req.user.role !== 'LIDER_DOCE') {
            return res.status(403).json({ error: 'Not authorized to update classes' });
        }

        const updateData = {
            ...(name && { name }),
            ...(description && { description }),
            ...(moduleId !== undefined && { moduleNumber: parseInt(moduleId) }),
            ...(professorId && { professorId: parseInt(professorId) }),
            ...(startDate && { startDate: new Date(startDate) }),
            ...(endDate && { endDate: new Date(endDate) }),
        };

        if (auxiliarIds && Array.isArray(auxiliarIds)) {
            updateData.auxiliaries = {
                set: [], // Disconnect all prev
                connect: auxiliarIds.map(id => ({ id: parseInt(id) }))
            };
        }

        const updatedModule = await prisma.seminarModule.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        res.json(updatedModule);
    } catch (error) {
        console.error('Error updating module:', error);
        res.status(500).json({ error: 'Error updating module' });
    }
};

const deleteModule = async (req, res) => {
    try {
        const { id } = req.params;
        const moduleId = parseInt(id);
        const isAdmin = req.user.role === 'SUPER_ADMIN';
        const isProfesorRole = req.user.role === 'PROFESOR';

        if (!isAdmin && !isProfesorRole && req.user.role !== 'LIDER_DOCE') {
            return res.status(403).json({ error: 'Not authorized to delete classes' });
        }

        // Check if there are "notes" or "information" (grades, project notes, etc.)
        const enrollmentsWithData = await prisma.seminarEnrollment.findMany({
            where: {
                moduleId,
                OR: [
                    { finalGrade: { not: null } },
                    { projectNotes: { not: null, not: "" } },
                    {
                        classAttendances: {
                            some: {
                                OR: [
                                    { grade: { not: null } },
                                    { notes: { not: null, not: "" } }
                                ]
                            }
                        }
                    }
                ]
            }
        });

        if (enrollmentsWithData.length > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar la clase, porque existe información en esta clase.'
            });
        }

        // If no "information", we can delete. 
        // We handle the manual cascade for enrollments and attendances.
        await prisma.$transaction([
            prisma.classAttendance.deleteMany({
                where: { enrollment: { moduleId } }
            }),
            prisma.seminarEnrollment.deleteMany({
                where: { moduleId }
            }),
            // ClassMaterial is already onDelete: Cascade in schema, but we can be explicit if we want.
            // But let's let Prisma/DB handle it for those that have it. 
            // SeminarEnrollment definitely needs manual help here.
            prisma.seminarModule.delete({
                where: { id: moduleId }
            })
        ]);

        res.json({ message: 'Clase eliminada exitosamente' });
    } catch (error) {
        console.error('Error deleting module:', error);
        res.status(500).json({ error: 'Error al intentar eliminar la clase' });
    }
};

// --- Student Enrollment ---

const enrollStudent = async (req, res) => {
    try {
        const { moduleId, studentId, assignedAuxiliarId } = req.body;

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

const unenrollStudent = async (req, res) => {
    try {
        const { enrollmentId } = req.params;

        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'LIDER_DOCE') {
            return res.status(403).json({ error: 'Not authorized to remove students' });
        }

        // Manual Cascade Delete due to missing schema cascade
        await prisma.classAttendance.deleteMany({
            where: { enrollmentId: parseInt(enrollmentId) }
        });

        await prisma.seminarEnrollment.delete({
            where: { id: parseInt(enrollmentId) }
        });

        res.json({ message: 'Student unenrolled' });
    } catch (error) {
        console.error('Error unenrolling student:', error);
        res.status(500).json({ error: 'Error unenrolling student' });
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
        const isAuxiliar = moduleData.auxiliaries.some(a => a.id === user.id);

        // Determine which enrollments to show
        let enrollmentsQuery = { moduleId };

        if (isProfessor) {
            // See all
        } else if (isAuxiliar) {
            enrollmentsQuery.assignedAuxiliarId = user.id;
        } else {
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
        const matrix = enrollments.map(enrollment => {
            const attendances = {};
            const grades = {};

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
                attendances,
                grades,
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
        const user = req.user;

        // Fetch enrollment
        const enrollment = await prisma.seminarEnrollment.findUnique({
            where: { id: parseInt(enrollmentId) },
            include: { module: { include: { auxiliaries: true } } }
        });

        if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

        // Permission Check
        const isAdmin = user.role === 'SUPER_ADMIN';
        const isProfesorRole = user.role === 'PROFESOR';
        const isAuxiliarRole = user.role === 'AUXILIAR';

        const isProfessorOfModule = enrollment.module.professorId === user.id || isAdmin || isProfesorRole;
        const isAssignedAuxiliar = enrollment.assignedAuxiliarId === user.id || isAuxiliarRole;

        if (!isProfessorOfModule && !isAssignedAuxiliar) {
            return res.status(403).json({ error: 'Not authorized to edit this student' });
        }

        // Update Logic
        if (type === 'attendance') {
            const classNumber = parseInt(key);
            if (!value) {
                // If empty value, delete the record (reset) to allow empty state in UI
                await prisma.classAttendance.deleteMany({
                    where: {
                        enrollmentId: enrollment.id,
                        classNumber: classNumber
                    }
                });
            } else {
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
                        status: value
                    },
                    update: { status: value }
                });
            }
        } else if (type === 'grade') {
            const classNumber = parseInt(key);
            const numValue = value === '' ? null : parseFloat(value);

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
                    status: 'ASISTE', // Default if only grading
                    grade: numValue
                },
                update: { grade: numValue }
            });
        } else if (type === 'projectNotes') {
            await prisma.seminarEnrollment.update({
                where: { id: enrollment.id },
                data: { projectNotes: value }
            });
        } else if (type === 'finalGrade') {
            const numValue = value === '' ? null : parseFloat(value);
            await prisma.seminarEnrollment.update({
                where: { id: enrollment.id },
                data: { finalGrade: numValue }
            });
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Error updating matrix:', error);
        res.status(500).json({ error: 'Update failed: ' + error.message });
    }
};

const getSchoolStatsByLeader = async (req, res) => {
    try {
        const enrollments = await prisma.seminarEnrollment.findMany({
            where: {
                module: { type: 'ESCUELA' }
            },
            include: {
                user: {
                    include: { liderDoce: true, leader: true }
                },
                classAttendances: true
            }
        });

        const statsByLeader = {};

        const getLiderName = (user) => {
            if (!user) return 'Sin Asignar';
            const leader = user.liderDoce || user.leader;
            return leader ? leader.fullName : 'Sin Asignar';
        };

        enrollments.forEach(enrol => {
            const leaderName = getLiderName(enrol.user);

            if (!statsByLeader[leaderName]) {
                statsByLeader[leaderName] = {
                    leaderName,
                    totalStudents: 0,
                    totalGradeSum: 0,
                    gradeCount: 0,
                    totalAttendancePctSum: 0,
                    passedCount: 0
                };
            }

            const stats = statsByLeader[leaderName];
            stats.totalStudents++;

            if (enrol.finalGrade) {
                stats.totalGradeSum += enrol.finalGrade;
                stats.gradeCount++;
                if (enrol.finalGrade >= 3.0) stats.passedCount++;
            }

            const expectedClasses = 10;
            const attended = enrol.classAttendances.filter(c => c.status === 'ASISTE').length;
            const pct = (attended / expectedClasses) * 100;
            stats.totalAttendancePctSum += pct;
        });

        const report = Object.values(statsByLeader).map(s => ({
            leaderName: s.leaderName,
            students: s.totalStudents,
            avgGrade: s.gradeCount > 0 ? (s.totalGradeSum / s.gradeCount).toFixed(1) : 0,
            avgAttendance: s.totalStudents > 0 ? (s.totalAttendancePctSum / s.totalStudents).toFixed(1) : 0,
            passed: s.passedCount
        }));

        res.json(report);

    } catch (error) {
        console.error('Error fetching school stats:', error);
        res.status(500).json({ error: 'Error fetching stats' });
    }
};

// --- Class Materials ---

const getClassMaterials = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const materials = await prisma.classMaterial.findMany({
            where: { moduleId: parseInt(moduleId) },
            orderBy: { classNumber: 'asc' }
        });
        res.json(materials);
    } catch (error) {
        console.error('Error fetching materials:', error);
        res.status(500).json({ error: 'Error fetching materials' });
    }
};

const updateClassMaterial = async (req, res) => {
    try {
        const { moduleId, classNumber } = req.params;
        const { description, documents, videoLinks, quizLinks } = req.body;
        const user = req.user;

        // Verify module ownership/role
        const moduleData = await prisma.seminarModule.findUnique({
            where: { id: parseInt(moduleId) }
        });

        if (!moduleData) return res.status(404).json({ error: 'Module not found' });

        const isAdmin = user.role === 'SUPER_ADMIN';
        const isProfesorRole = user.role === 'PROFESOR';
        const isModuleProfessor = moduleData.professorId === user.id || isAdmin || isProfesorRole;

        if (!isModuleProfessor) {
            return res.status(403).json({ error: 'Only professors can manage materials' });
        }

        const material = await prisma.classMaterial.upsert({
            where: {
                moduleId_classNumber: {
                    moduleId: parseInt(moduleId),
                    classNumber: parseInt(classNumber)
                }
            },
            create: {
                moduleId: parseInt(moduleId),
                classNumber: parseInt(classNumber),
                description,
                documents: documents || [],
                videoLinks: videoLinks || [],
                quizLinks: quizLinks || []
            },
            update: {
                description,
                documents: documents || [],
                videoLinks: videoLinks || [],
                quizLinks: quizLinks || []
            }
        });

        res.json(material);
    } catch (error) {
        console.error('Error updating materials:', error);
        res.status(500).json({ error: 'Error updating materials' });
    }
};

module.exports = {
    createModule,
    getModules,
    enrollStudent,
    getModuleMatrix,
    updateMatrixCell,
    deleteModule,
    updateModule,
    unenrollStudent,
    getSchoolStatsByLeader,
    getClassMaterials,
    updateClassMaterial
};

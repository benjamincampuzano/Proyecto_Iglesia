const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to get network IDs (recursive)
const getNetworkIds = async (leaderId) => {
    const id = parseInt(leaderId);
    if (isNaN(id)) return [];

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

    for (const disciple of directDisciples) {
        if (disciple.id !== id) {
            const subNetwork = await getNetworkIds(disciple.id);
            networkIds = [...networkIds, ...subNetwork];
        }
    }

    return [...new Set(networkIds)];
};

const getGeneralStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const userRole = req.user.role?.toUpperCase();
        const currentUserId = parseInt(req.user.id);

        let networkIds = [];
        if (userRole === 'LIDER_DOCE' || userRole === 'PASTOR') {
            networkIds = await getNetworkIds(currentUserId);
            networkIds.push(currentUserId);
        }

        const networkFilter = (path = 'invitedById') => {
            if (userRole === 'SUPER_ADMIN') return {};
            return { [path]: { in: networkIds } };
        };
        // Default date range
        const end = endDate ? new Date(endDate) : new Date();
        if (endDate) end.setUTCHours(23, 59, 59, 999);

        const start = startDate ? new Date(startDate) : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
        if (startDate) start.setUTCHours(0, 0, 0, 0);

        // Helper to format Lider Name following hierarchy: User -> LiderCelula -> LiderDoce
        const getLiderName = (user) => {
            if (!user) return 'Sin Asignar';

            const role = user.role?.toUpperCase();

            // 1. If user is Lider Doce
            if (role === 'LIDER_DOCE') return user.fullName;

            // 2. Direct Lider Doce
            if (user.liderDoce) return user.liderDoce.fullName;

            // 3. Via Cell Leader
            if (user.liderCelula && user.liderCelula.liderDoce) {
                return user.liderCelula.liderDoce.fullName;
            }

            // 4. Fallback to Pastor if no Lider Doce found
            if (user.pastor) return user.pastor.fullName;
            if (role === 'PASTOR') return user.fullName;

            // 5. Fallback to legacy leader relation if any
            if (user.leader) return user.leader.fullName;

            return 'Sin Asignar';
        };

        // 1. GUESTS: Invited Guests grouped by Lider_Doce
        const guests = await prisma.guest.findMany({
            where: {
                AND: [
                    { createdAt: { gte: start, lte: end } },
                    networkFilter('invitedById')
                ]
            },
            include: {
                invitedBy: {
                    include: {
                        liderDoce: true,
                        liderCelula: { include: { liderDoce: true } },
                        pastor: true,
                        leader: true
                    }
                }
            }
        });



        const guestsByLeader = {};
        guests.forEach(guest => {
            const leaderName = getLiderName(guest.invitedBy);
            guestsByLeader[leaderName] = (guestsByLeader[leaderName] || 0) + 1;
        });



        // 2. CHURCH ATTENDANCE: By Month, Lider_Doce
        const attendances = await prisma.churchAttendance.findMany({
            where: {
                AND: [
                    { date: { gte: start, lte: end } },
                    { status: 'PRESENTE' },
                    networkFilter('userId')
                ]
            },
            include: {
                user: {
                    include: {
                        liderDoce: true,
                        liderCelula: { include: { liderDoce: true } },
                        pastor: true,
                        leader: true
                    }
                }
            }
        });

        const attendanceByMonth = {};
        attendances.forEach(att => {
            const date = new Date(att.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const leaderName = getLiderName(att.user);

            if (!attendanceByMonth[monthKey]) attendanceByMonth[monthKey] = {};
            attendanceByMonth[monthKey][leaderName] = (attendanceByMonth[monthKey][leaderName] || 0) + 1;
        });

        // 3. STUDENTS: Count per Class (Module), Avg Notes, Avg Attendance
        const modules = await prisma.seminarModule.findMany({
            include: {
                enrollments: {
                    where: {
                        createdAt: { gte: start, lte: end }
                    },
                    include: {
                        classAttendances: true
                    }
                }
            }
        });

        const studentStats = modules.map(mod => {
            const activeEnrollments = mod.enrollments;
            const studentCount = activeEnrollments.length;

            let totalGrade = 0;
            let gradeCount = 0;
            let totalAttendancePct = 0;

            activeEnrollments.forEach(enrol => {
                if (enrol.finalGrade) {
                    totalGrade += enrol.finalGrade;
                    gradeCount++;
                }
                const totalClasses = 12; // Standard estimation
                const attended = enrol.classAttendances.filter(ca => ca.status === 'ASISTE').length;
                totalAttendancePct += (attended / totalClasses) * 100;
            });

            return {
                moduleName: mod.name,
                studentCount,
                avgGrade: gradeCount > 0 ? (totalGrade / gradeCount).toFixed(1) : 0,
                avgAttendance: studentCount > 0 ? (totalAttendancePct / studentCount).toFixed(1) : 0
            };
        });

        // 4. CELLS: Count, Attendance, Location Map by Lider_Doce
        const cells = await prisma.cell.findMany({
            where: networkFilter('leaderId'), // Approximated filter for cells
            select: {
                id: true,
                name: true,
                address: true,
                city: true,
                latitude: true,
                longitude: true,
                leader: {
                    select: {
                        fullName: true,
                        role: true,
                        liderDoce: { select: { fullName: true } },
                        liderCelula: { include: { liderDoce: { select: { fullName: true } } } },
                        pastor: { select: { fullName: true } },
                        leader: { select: { fullName: true } }
                    }
                },
                attendances: {
                    where: {
                        date: { gte: start, lte: end }
                    },
                    select: { date: true, status: true }
                }
            }
        });

        const cellsByLeader = {};
        cells.forEach(cell => {
            const leaderName = getLiderName(cell.leader);
            if (!cellsByLeader[leaderName]) {
                cellsByLeader[leaderName] = {
                    count: 0,
                    locations: [],
                    totalAvgAttendance: 0,
                    cellCountWithAttendance: 0
                };
            }

            cellsByLeader[leaderName].count++;

            // Include location data (lat/lng) if available or at least address
            cellsByLeader[leaderName].locations.push({
                name: cell.name,
                address: cell.address,
                city: cell.city,
                lat: cell.latitude,
                lng: cell.longitude
            });

            if (cell.attendances.length > 0) {
                const meetings = {};
                cell.attendances.forEach(ca => {
                    const d = ca.date.toISOString();
                    if (!meetings[d]) meetings[d] = 0;
                    if (ca.status === 'PRESENTE') meetings[d]++;
                });

                const meetingDates = Object.keys(meetings);
                if (meetingDates.length > 0) {
                    const sumAttendees = meetingDates.reduce((acc, d) => acc + meetings[d], 0);
                    const avg = sumAttendees / meetingDates.length;

                    cellsByLeader[leaderName].totalAvgAttendance += avg;
                    cellsByLeader[leaderName].cellCountWithAttendance++;
                }
            }
        });

        Object.keys(cellsByLeader).forEach(key => {
            const data = cellsByLeader[key];
            data.avgAttendance = data.cellCountWithAttendance > 0
                ? (data.totalAvgAttendance / data.cellCountWithAttendance).toFixed(1)
                : 0;
            delete data.totalAvgAttendance;
            delete data.cellCountWithAttendance;
        });

        // 5. ENCUENTROS: Break down by Leader -> Cell -> Registrations Count -> Financials
        const encuentroRegs = await prisma.encuentroRegistration.findMany({
            where: {
                status: { not: 'CANCELLED' },
                encuentro: {
                    startDate: { gte: start, lte: end }
                },
                guest: {
                    invitedById: userRole === 'SUPER_ADMIN' ? undefined : { in: networkIds }
                }
            },
            include: {
                encuentro: true,
                payments: true,
                guest: {
                    include: {
                        invitedBy: {
                            include: {
                                liderDoce: { select: { fullName: true } },
                                liderCelula: { include: { liderDoce: { select: { fullName: true } } } },
                                pastor: { select: { fullName: true } },
                                leader: { select: { fullName: true } },
                                cell: { select: { name: true } }
                            }
                        }
                    }
                }
            }
        });

        const encuentrosInfo = {};
        encuentroRegs.forEach(reg => {
            const leaderName = getLiderName(reg.guest.invitedBy);
            const cellName = reg.guest.invitedBy.cell ? reg.guest.invitedBy.cell.name : 'Sin Célula';

            if (!encuentrosInfo[leaderName]) encuentrosInfo[leaderName] = {};
            if (!encuentrosInfo[leaderName][cellName]) {
                encuentrosInfo[leaderName][cellName] = { count: 0, totalCost: 0, totalPaid: 0, balance: 0 };
            }

            const stats = encuentrosInfo[leaderName][cellName];
            stats.count++;

            const finalCost = reg.encuentro.cost * (1 - (reg.discountPercentage || 0) / 100);
            const paid = reg.payments.reduce((sum, p) => sum + p.amount, 0);

            stats.totalCost += finalCost;
            stats.totalPaid += paid;
            stats.balance += (finalCost - paid);
        });

        // 6. CONVENTIONS: Break down by Leader -> Registrations Count -> Financials
        const conventionRegs = await prisma.conventionRegistration.findMany({
            where: {
                status: { not: 'CANCELLED' },
                convention: {
                    startDate: { gte: start, lte: end }
                },
                user: {
                    id: userRole === 'SUPER_ADMIN' ? undefined : { in: networkIds }
                }
            },
            include: {
                convention: true,
                payments: true,
                user: {
                    include: {
                        liderDoce: { select: { fullName: true } },
                        liderCelula: { include: { liderDoce: { select: { fullName: true } } } },
                        pastor: { select: { fullName: true } },
                        leader: { select: { fullName: true } }
                    }
                }
            }
        });

        const conventionsInfo = {};
        conventionRegs.forEach(reg => {
            const leaderName = getLiderName(reg.user);

            if (!conventionsInfo[leaderName]) {
                conventionsInfo[leaderName] = { count: 0, totalCost: 0, totalPaid: 0, balance: 0 };
            }

            const stats = conventionsInfo[leaderName];
            stats.count++;

            const finalCost = reg.convention.cost * (1 - (reg.discountPercentage || 0) / 100);
            const paid = reg.payments.reduce((sum, p) => sum + p.amount, 0);

            stats.totalCost += finalCost;
            stats.totalPaid += paid;
            stats.balance += (finalCost - paid);
        });

        res.json({
            period: { start, end },
            guestsByLeader,
            attendanceByMonth,
            studentStats,
            cellsByLeader,
            encuentrosInfo,
            conventionsInfo,
            summary: {
                totalMembers: await prisma.user.count({ where: { role: { not: 'SUPER_ADMIN' } } }),
                activeStudents: await prisma.seminarEnrollment.count({ where: { status: 'EN_PROGRESO' } }),
                graduatedInPeriod: 0
            }
        });

    } catch (error) {
        console.error('Error fetching general consolidated stats:', error);
        res.status(500).json({ error: 'Error fetching general statistics' });
    }
};

const getSeminarStatsByLeader = async (req, res) => {
    try {

        const userRole = req.user.role?.toUpperCase();
        const currentUserId = parseInt(req.user.id);
        let networkIds = [];
        if (userRole === 'LIDER_DOCE' || userRole === 'PASTOR') {
            networkIds = await getNetworkIds(currentUserId);
            networkIds.push(currentUserId);
        }

        // Helper to get Leader Name (reused)
        const getLiderName = (user) => {
            if (!user) return 'Sin Asignar';
            const role = user.role?.toUpperCase();
            if (role === 'LIDER_DOCE') return user.fullName;
            if (user.liderDoce) return user.liderDoce.fullName;
            if (user.liderCelula && user.liderCelula.liderDoce) return user.liderCelula.liderDoce.fullName;
            if (user.pastor) return user.pastor.fullName;
            if (role === 'PASTOR') return user.fullName;
            if (user.leader) return user.leader.fullName;
            return 'Sin Asignar';
        };

        const enrollments = await prisma.seminarEnrollment.findMany({
            where: userRole === 'SUPER_ADMIN' ? {} : { userId: { in: networkIds } },
            include: {
                user: {
                    include: {
                        liderDoce: true,
                        liderCelula: { include: { liderDoce: true } },
                        pastor: true,
                        leader: true
                    }
                },
                module: true,
                classAttendances: true
            }
        });

        const statsByLeader = {};

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
                if (enrol.finalGrade >= 70) stats.passedCount++; // Assuming 70 is passing
            }

            // Attendance Calc
            const expectedClasses = 12; // Standard
            const attended = enrol.classAttendances.filter(c => c.status === 'ASISTE').length;
            const attendedCount = attended;
            const pct = (attendedCount / expectedClasses) * 100;
            stats.totalAttendancePctSum += pct;
        });

        // Average out
        const report = Object.values(statsByLeader).map(s => ({
            leaderName: s.leaderName,
            students: s.totalStudents,
            avgGrade: s.gradeCount > 0 ? (s.totalGradeSum / s.gradeCount).toFixed(1) : 0,
            avgAttendance: s.totalStudents > 0 ? (s.totalAttendancePctSum / s.totalStudents).toFixed(1) : 0,
            passed: s.passedCount
        }));

        res.json(report);

    } catch (error) {
        console.error('Error fetching seminar stats by leader:', error);
        res.status(500).json({ error: 'Error fetching seminar statistics' });
    }
};

module.exports = {
    getGeneralStats,
    getNetworkIds,
    getSeminarStatsByLeader
};

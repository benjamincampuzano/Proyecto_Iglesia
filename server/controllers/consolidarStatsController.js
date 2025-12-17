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
        // const { role, id } = req.user; 

        // Default date range
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date(new Date().setFullYear(new Date().getFullYear() - 1));

        // Helper to format Lider Name
        const getLiderName = (user) => {
            if (!user) return 'Sin Asignar';
            // Prefer liderDoce, fallback to direct leader if structure is mixed
            const leader = user.liderDoce || user.leader;
            return leader ? leader.fullName : 'Sin Asignar';
        };

        // 1. GUESTS: Invited Guests grouped by Lider_Doce
        const guests = await prisma.guest.findMany({
            where: {
                createdAt: { gte: start, lte: end }
            },
            include: {
                invitedBy: {
                    include: { liderDoce: true, leader: true }
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
                date: { gte: start, lte: end },
                status: 'PRESENTE'
            },
            include: {
                user: {
                    include: { liderDoce: true, leader: true }
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
            include: {
                leader: {
                    include: { liderDoce: true, leader: true }
                },
                attendances: true
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

        // 5. ENCUENTROS: Attendees by Month by Lider_Doce
        const encuentroRegs = await prisma.encuentroRegistration.findMany({
            where: {
                status: 'ATTENDED',
                encuentro: {
                    startDate: { gte: start, lte: end }
                }
            },
            include: {
                encuentro: true,
                guest: {
                    include: {
                        invitedBy: {
                            include: { liderDoce: true, leader: true }
                        }
                    }
                }
            }
        });

        const encuentrosByMonth = {};
        encuentroRegs.forEach(reg => {
            const date = new Date(reg.encuentro.startDate);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const leaderName = getLiderName(reg.guest.invitedBy);

            if (!encuentrosByMonth[monthKey]) encuentrosByMonth[monthKey] = {};
            encuentrosByMonth[monthKey][leaderName] = (encuentrosByMonth[monthKey][leaderName] || 0) + 1;
        });

        // 6. CONVENTIONS: Attendees by Year by Lider_Doce
        const conventionRegs = await prisma.conventionRegistration.findMany({
            where: {
                status: 'ATTENDED',
                convention: {
                    startDate: { gte: start }
                }
            },
            include: {
                convention: true,
                user: {
                    include: { liderDoce: true, leader: true }
                }
            }
        });

        const conventionsByYear = {};
        conventionRegs.forEach(reg => {
            const year = reg.convention.year;
            const leaderName = getLiderName(reg.user);

            if (!conventionsByYear[year]) conventionsByYear[year] = {};
            conventionsByYear[year][leaderName] = (conventionsByYear[year][leaderName] || 0) + 1;
        });


        res.json({
            period: { start, end },
            guestsByLeader,
            attendanceByMonth,
            studentStats,
            cellsByLeader,
            encuentrosByMonth,
            conventionsByYear,
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

        // Helper to get Leader Name (reused)
        const getLiderName = (user) => {
            if (!user) return 'Sin Asignar';
            const leader = user.liderDoce || user.leader;
            return leader ? leader.fullName : 'Sin Asignar';
        };

        const enrollments = await prisma.seminarEnrollment.findMany({
            include: {
                user: {
                    include: { liderDoce: true, leader: true }
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

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getUserNetwork } = require('../utils/networkUtils');

const getGeneralStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const userRoles = req.user.roles || [];
        const currentUserId = req.user.id ? parseInt(req.user.id) : null;

        let networkIds = [];
        const isSuperAdmin = userRoles.includes('ADMIN');
        const isAdmin = userRoles.includes('ADMIN');
        const isLeader = userRoles.some(r => ['LIDER_DOCE', 'PASTOR', 'LIDER_CELULA'].includes(r));

        if (isLeader && currentUserId && !isSuperAdmin && !isAdmin) {
            networkIds = await getUserNetwork(currentUserId);
            networkIds.push(currentUserId);
        }

        const networkFilter = (invitedKey = 'invitedById', assignedKey = 'assignedToId', registeredKey = 'registeredById') => {
            const excludeCriteria = {
                roles: {
                    none: {
                        role: { name: 'ADMIN' }
                    }
                }
            };

            // Define relation path based on field key
            const relationMap = {
                'invitedById': 'invitedBy',
                'assignedToId': 'assignedTo',
                'userId': 'user',
                'leaderId': 'leader'
            };

            const conditions = [];

            // 1. Exclude ADMIN from the relevant entities
            if (invitedKey && relationMap[invitedKey]) conditions.push({ [relationMap[invitedKey]]: excludeCriteria });
            if (assignedKey && relationMap[assignedKey]) conditions.push({ [relationMap[assignedKey]]: excludeCriteria });
            if (registeredKey && relationMap[registeredKey]) conditions.push({ [relationMap[registeredKey]]: excludeCriteria });

            // 2. Apply Network Filter if not admin
            if (!isSuperAdmin && !isAdmin) {
                const networkFilters = [];
                if (invitedKey) networkFilters.push({ [invitedKey]: { in: networkIds } });
                if (assignedKey) networkFilters.push({ [assignedKey]: { in: networkIds } });
                if (registeredKey) networkFilters.push({ [registeredKey]: { in: networkIds } });

                if (networkFilters.length > 0) {
                    conditions.push({ OR: networkFilters });
                } else if (invitedKey) {
                    // Safety: if no keys but we need a filter, return nothing
                    conditions.push({ [invitedKey]: -1 });
                }
            }

            return conditions.length > 0 ? { AND: conditions } : {};
        };

        const end = endDate ? new Date(endDate) : new Date();
        if (endDate) end.setUTCHours(23, 59, 59, 999);

        const start = startDate ? new Date(startDate) : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
        if (startDate) start.setUTCHours(0, 0, 0, 0);

        // Helper to format Leader Name using the new UserHierarchy system
        const getLiderName = (user) => {
            if (!user) return 'Sin Asignar';

            // Check parents in hierarchy
            if (user.parents && user.parents.length > 0) {
                // Priority: LIDER_DOCE -> PASTOR -> LIDER_CELULA
                const doce = user.parents.find(p => p.role === 'LIDER_DOCE')?.parent;
                if (doce) return doce.profile?.fullName || doce.email;

                const pastor = user.parents.find(p => p.role === 'PASTOR')?.parent;
                if (pastor) return pastor.profile?.fullName || pastor.email;

                const celula = user.parents.find(p => p.role === 'LIDER_CELULA')?.parent;
                if (celula) return celula.profile?.fullName || celula.email;
            }

            // Fallback: If no parent matches or no parents entry, return user's own name
            return user.profile?.fullName || user.email || 'Usuario';
        };

        const hierarchyInclude = {
            include: {
                profile: true,
                parents: {
                    include: {
                        parent: {
                            include: { profile: true }
                        }
                    }
                }
            }
        };

        // 1. GUESTS
        const guests = await prisma.guest.findMany({
            where: {
                AND: [
                    { createdAt: { gte: start, lte: end } },
                    networkFilter('invitedById', 'assignedToId', null)
                ]
            },
            include: {
                invitedBy: hierarchyInclude,
                calls: true,
                visits: true
            }
        });

        const guestsByLeader = {};
        let totalGuests = 0;
        let totalConversions = 0;
        const trackingStats = { withCall: 0, withoutCall: 0, withVisit: 0, withoutVisit: 0 };

        guests.forEach(guest => {
            totalGuests++;
            const leaderName = getLiderName(guest.invitedBy);
            guestsByLeader[leaderName] = (guestsByLeader[leaderName] || 0) + 1;
            if (guest.status === 'GANADO') totalConversions++;
            if (guest.calls?.length > 0) trackingStats.withCall++;
            else trackingStats.withoutCall++;
            if (guest.visits?.length > 0) trackingStats.withVisit++;
            else trackingStats.withoutVisit++;
        });

        // 2. CHURCH ATTENDANCE
        const attendances = await prisma.churchAttendance.findMany({
            where: {
                AND: [
                    { date: { gte: start, lte: end } },
                    { status: 'PRESENTE' },
                    networkFilter('userId', null, null)
                ]
            },
            include: { user: hierarchyInclude }
        });

        const attendanceByMonth = {};
        attendances.forEach(att => {
            const date = new Date(att.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const leaderName = getLiderName(att.user);
            if (!attendanceByMonth[monthKey]) attendanceByMonth[monthKey] = {};
            attendanceByMonth[monthKey][leaderName] = (attendanceByMonth[monthKey][leaderName] || 0) + 1;
        });

        // 3. STUDENTS
        const modules = await prisma.seminarModule.findMany({
            include: {
                enrollments: {
                    where: { createdAt: { gte: start, lte: end } },
                    include: { classAttendances: true }
                }
            }
        });

        const studentStats = modules.map(mod => {
            const activeEnrollments = mod.enrollments;
            const studentCount = activeEnrollments.length;
            let totalGrade = 0, gradeCount = 0, totalAttendancePct = 0;
            activeEnrollments.forEach(enrol => {
                if (enrol.finalGrade) { totalGrade += enrol.finalGrade; gradeCount++; }
                const attended = enrol.classAttendances.filter(ca => ca.status === 'ASISTE').length;
                totalAttendancePct += (attended / 12) * 100;
            });
            return {
                moduleName: mod.name,
                studentCount,
                avgGrade: gradeCount > 0 ? (totalGrade / gradeCount).toFixed(1) : 0,
                avgAttendance: studentCount > 0 ? (totalAttendancePct / studentCount).toFixed(1) : 0
            };
        });

        // 4. CELLS
        const cells = await prisma.cell.findMany({
            where: networkFilter('leaderId', null, null),
            include: {
                leader: hierarchyInclude,
                attendances: {
                    where: { date: { gte: start, lte: end } },
                    select: { date: true, status: true }
                }
            }
        });

        const cellsByLeader = {};
        cells.forEach(cell => {
            const leaderName = getLiderName(cell.leader);
            if (!cellsByLeader[leaderName]) {
                cellsByLeader[leaderName] = { count: 0, locations: [], totalAvgAttendance: 0, cellCountWithAttendance: 0 };
            }
            cellsByLeader[leaderName].count++;
            cellsByLeader[leaderName].locations.push({
                name: cell.name, address: cell.address, city: cell.city, lat: cell.latitude, lng: cell.longitude
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
                    const avg = meetingDates.reduce((acc, d) => acc + meetings[d], 0) / meetingDates.length;
                    cellsByLeader[leaderName].totalAvgAttendance += avg;
                    cellsByLeader[leaderName].cellCountWithAttendance++;
                }
            }
        });

        Object.keys(cellsByLeader).forEach(key => {
            const data = cellsByLeader[key];
            data.avgAttendance = data.cellCountWithAttendance > 0 ? (data.totalAvgAttendance / data.cellCountWithAttendance).toFixed(1) : 0;
            delete data.totalAvgAttendance; delete data.cellCountWithAttendance;
        });

        // 5. ENCUENTROS
        const encuentroRegs = await prisma.encuentroRegistration.findMany({
            where: {
                status: { not: 'CANCELLED' },
                encuentro: { startDate: { gte: start } },
                OR: (isSuperAdmin || isAdmin) ? undefined : [
                    { guest: { invitedById: { in: networkIds } } },
                    { guest: { assignedToId: { in: networkIds } } },
                    { user: { id: { in: networkIds } } }
                ]
            },
            include: {
                encuentro: true,
                payments: true,
                guest: { include: { invitedBy: { include: { ...hierarchyInclude.include, cell: true } } } },
                user: { include: { ...hierarchyInclude.include, cell: true } }
            }
        });

        const encuentrosInfo = {};
        encuentroRegs.forEach(reg => {
            const participantSource = reg.guest ? reg.guest.invitedBy : reg.user;
            if (!participantSource) return;
            const leaderName = getLiderName(participantSource);
            const cellName = participantSource.cell ? participantSource.cell.name : 'Sin Célula';
            if (!encuentrosInfo[leaderName]) encuentrosInfo[leaderName] = {};
            if (!encuentrosInfo[leaderName][cellName]) {
                encuentrosInfo[leaderName][cellName] = { count: 0, totalCost: 0, totalPaid: 0, balance: 0 };
            }
            const st = encuentrosInfo[leaderName][cellName];
            st.count++;
            const finalCost = reg.encuentro.cost * (1 - (reg.discountPercentage || 0) / 100);
            const paid = reg.payments.reduce((sum, p) => sum + p.amount, 0);
            st.totalCost += finalCost; st.totalPaid += paid; st.balance += (finalCost - paid);
        });

        // 6. CONVENTIONS
        const conventionRegs = await prisma.conventionRegistration.findMany({
            where: {
                status: { not: 'CANCELLED' },
                convention: { startDate: { gte: start } },
                OR: (isSuperAdmin || isAdmin) ? undefined : [
                    { user: { id: { in: networkIds } } },
                    { registeredById: { in: networkIds } }
                ]
            },
            include: {
                convention: true,
                payments: true,
                user: hierarchyInclude
            }
        });

        const conventionsInfo = {};
        conventionRegs.forEach(reg => {
            const leaderName = getLiderName(reg.user);
            if (!conventionsInfo[leaderName]) conventionsInfo[leaderName] = { count: 0, totalCost: 0, totalPaid: 0, balance: 0 };
            const st = conventionsInfo[leaderName];
            st.count++;
            const finalCost = reg.convention.cost * (1 - (reg.discountPercentage || 0) / 100);
            const paid = reg.payments.reduce((sum, p) => sum + p.amount, 0);
            st.totalCost += finalCost; st.totalPaid += paid; st.balance += (finalCost - paid);
        });

        res.json({
            period: { start, end },
            guestsByLeader,
            attendanceByMonth,
            studentStats,
            cellsByLeader,
            encuentrosInfo,
            conventionsInfo,
            trackingStats,
            summary: {
                totalGuests,
                totalConversions,
                conversionRate: totalGuests > 0 ? ((totalConversions / totalGuests) * 100).toFixed(1) : 0,
                totalCells: cells.length,
                totalMembers: await prisma.user.count({
                    where: {
                        isDeleted: false,
                        roles: {
                            none: {
                                role: { name: 'ADMIN' }
                            }
                        }
                    }
                }),
                activeStudents: await prisma.seminarEnrollment.count({ where: { status: 'EN_PROGRESO' } }),
                graduatedInPeriod: 0
            }
        });
    } catch (error) {
        console.error('Error fetching general consolidated stats:', error);
        res.status(500).json({ error: 'Error fetching general statistics: ' + error.message });
    }
};

const getSeminarStatsByLeader = async (req, res) => {
    try {
        const userRoles = req.user.roles || [];
        const currentUserId = req.user.id ? parseInt(req.user.id) : null;
        let networkIds = [];
        const isSuperAdmin = userRoles.includes('ADMIN');
        const isLeader = userRoles.some(r => ['LIDER_DOCE', 'PASTOR', 'LIDER_CELULA'].includes(r));
        if (isLeader && currentUserId && !isSuperAdmin) {
            networkIds = await getUserNetwork(currentUserId);
            networkIds.push(currentUserId);
        }

        const enrollments = await prisma.seminarEnrollment.findMany({
            where: isSuperAdmin ? {} : { userId: { in: networkIds } },
            include: {
                user: {
                    include: {
                        profile: true,
                        parents: { include: { parent: { include: { profile: true } } } }
                    }
                },
                module: true,
                classAttendances: true
            }
        });

        const statsByLeader = {};
        enrollments.forEach(enrol => {
            const user = enrol.user;
            let leaderName = 'Sin Asignar';
            if (user.parents?.length > 0) {
                const doce = user.parents.find(p => p.role === 'LIDER_DOCE')?.parent;
                if (doce) leaderName = doce.profile?.fullName || doce.email;
                else {
                    const pastor = user.parents.find(p => p.role === 'PASTOR')?.parent;
                    if (pastor) leaderName = pastor.profile?.fullName || pastor.email;
                }
            } else {
                leaderName = user.profile?.fullName || user.email;
            }

            if (!statsByLeader[leaderName]) statsByLeader[leaderName] = { leaderName, totalStudents: 0, totalGradeSum: 0, gradeCount: 0, totalAttendancePctSum: 0, passedCount: 0 };
            const s = statsByLeader[leaderName];
            s.totalStudents++;
            if (enrol.finalGrade) { s.totalGradeSum += enrol.finalGrade; s.gradeCount++; if (enrol.finalGrade >= 70) s.passedCount++; }
            const attended = enrol.classAttendances.filter(c => c.status === 'ASISTE').length;
            s.totalAttendancePctSum += (attended / 12) * 100;
        });

        res.json(Object.values(statsByLeader).map(s => ({
            leaderName: s.leaderName, students: s.totalStudents,
            avgGrade: s.gradeCount > 0 ? (s.totalGradeSum / s.gradeCount).toFixed(1) : 0,
            avgAttendance: s.totalStudents > 0 ? (s.totalAttendancePctSum / s.totalStudents).toFixed(1) : 0,
            passed: s.passedCount
        })));
    } catch (error) {
        console.error('Error fetching seminar stats by leader:', error);
        res.status(500).json({ error: 'Error fetching seminar statistics: ' + error.message });
    }
};

module.exports = { getGeneralStats, getSeminarStatsByLeader };

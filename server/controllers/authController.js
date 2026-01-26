const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logActivity } = require('../utils/auditLogger');
const { validatePassword } = require('../utils/passwordValidator');

const prisma = new PrismaClient();

const register = async (req, res) => {
    try {
        const { email, password, fullName, sex, phone, address, city, parentId, roleInHierarchy, documentType, documentNumber, birthDate } = req.body;

        const validation = validatePassword(password, { email, fullName });
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.message });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Transaction to ensure atomicity
        const user = await prisma.$transaction(async (tx) => {
            // 1. Create User
            const newUser = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    phone,
                    profile: {
                        create: {
                            fullName,
                            sex,
                            address,
                            city,
                            documentType,
                            documentNumber,
                            birthDate: birthDate ? new Date(birthDate) : null
                        }
                    }
                }
            });

            // 2. Assign default role (DISCIPULO/MIEMBRO)
            const discipleRole = await tx.role.upsert({
                where: { name: 'DISCIPULO' },
                update: {},
                create: { name: 'DISCIPULO' }
            });

            await tx.userRole.create({
                data: {
                    userId: newUser.id,
                    roleId: discipleRole.id
                }
            });

            // 3. Handle Hierarchy if parent provided
            if (parentId) {
                await tx.userHierarchy.create({
                    data: {
                        parentId: parseInt(parentId),
                        childId: newUser.id,
                        role: roleInHierarchy || 'DISCIPULO'
                    }
                });
            }

            return tx.user.findUnique({
                where: { id: newUser.id },
                include: {
                    profile: true,
                    roles: { include: { role: true } },
                    parents: { include: { parent: { include: { profile: true } } } }
                }
            });
        });

        const roles = user.roles.map(r => r.role.name);
        const token = jwt.sign({ userId: user.id, roles }, process.env.JWT_SECRET, {
            expiresIn: '1d',
        });

        res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.profile.fullName,
                roles,
                phone: user.phone,
                address: user.profile.address,
                city: user.profile.city,
                sex: user.profile.sex
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                profile: true,
                roles: { include: { role: true } }
            }
        });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const roles = user.roles.map(r => r.role.name);
        const token = jwt.sign({ userId: user.id, roles }, process.env.JWT_SECRET, {
            expiresIn: '1d',
        });

        // Log the login activity
        await logActivity(user.id, 'LOGIN', 'USER', user.id, null, req.ip, req.headers['user-agent']);

        // Update last login (we don't have lastLogin field in User anymore, choosing to ignore or add to profile if needed)
        // For now, removing it as it's not in the new schema

        res.status(200).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.profile.fullName,
                roles,
                phone: user.phone,
                address: user.profile.address,
                city: user.profile.city,
                sex: user.profile.sex
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getPublicLeaders = async (req, res) => {
    try {
        // Fetch users who have specific hierarchy roles or system roles
        const leaders = await prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        role: {
                            name: { in: ['PASTOR', 'LIDER_DOCE', 'ADMIN'] }
                        }
                    }
                }
            },
            select: {
                id: true,
                profile: { select: { fullName: true } },
                roles: { include: { role: { select: { name: true } } } }
            }
        });

        const formattedLeaders = leaders.map(l => ({
            id: l.id,
            fullName: l.profile.fullName,
            roles: l.roles.map(r => r.role.name)
        }));

        res.json(formattedLeaders);
    } catch (error) {
        console.error('Error fetching public leaders:', error);
        res.status(500).json({ message: 'Error fetching leaders' });
    }
};

const checkInitStatus = async (req, res) => {
    try {
        const userCount = await prisma.user.count();
        res.json({ isInitialized: userCount > 0 });
    } catch (error) {
        console.error('Error checking init status:', error);
        res.status(500).json({ message: 'Error checking system initialization status' });
    }
};

const registerSetup = async (req, res) => {
    try {
        const userCount = await prisma.user.count();
        if (userCount > 0) {
            return res.status(403).json({ message: 'System is already initialized' });
        }

        const { email, password, fullName, sex, phone, address, city, documentType, documentNumber, birthDate } = req.body;

        const validation = validatePassword(password, { email, fullName });
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.message });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.$transaction(async (tx) => {
            const adminRole = await tx.role.upsert({
                where: { name: 'ADMIN' },
                update: {},
                create: { name: 'ADMIN' }
            });

            const newUser = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    phone,
                    profile: {
                        create: {
                            fullName,
                            sex: sex || undefined,
                            address,
                            city,
                            documentType: documentType || undefined,
                            documentNumber,
                            birthDate: birthDate ? new Date(birthDate) : null
                        }
                    }
                },
                include: { profile: true }
            });

            await tx.userRole.create({
                data: {
                    userId: newUser.id,
                    roleId: adminRole.id
                }
            });

            return newUser;
        });

        const roles = ['ADMIN'];
        const token = jwt.sign({ userId: user.id, roles }, process.env.JWT_SECRET, {
            expiresIn: '1d',
        });

        await logActivity(user.id, 'CREATE', 'USER', user.id, { message: 'Inicialización del sistema: Primer Usuario (ADMIN)' }, req.ip, req.headers['user-agent']);

        res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.profile.fullName,
                roles
            },
        });
    } catch (err) {
        console.error('Setup error:', err);
        res.status(500).json({ message: 'Error initializing system' });
    }
};

module.exports = { register, login, getPublicLeaders, checkInitStatus, registerSetup };

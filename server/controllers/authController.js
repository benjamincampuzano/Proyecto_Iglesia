const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logActivity } = require('../utils/auditLogger');
const { validatePassword } = require('../utils/passwordValidator');

const prisma = new PrismaClient();

const register = async (req, res) => {
    try {
        const { email, password, fullName, role, sex, phone, address, city, liderDoceId } = req.body;

        const validation = validatePassword(password, { email, fullName });
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.message });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const userData = {
            email,
            password: hashedPassword,
            fullName,
            role: role || 'DISCIPULO',
            sex,
            phone,
            address,
            city
        };

        if (liderDoceId) {
            const numericLdoceId = parseInt(liderDoceId);
            userData.liderDoceId = numericLdoceId;

            // Inherit pastor from the 12 leader
            const leader12 = await prisma.user.findUnique({
                where: { id: numericLdoceId },
                select: { pastorId: true }
            });
            if (leader12 && leader12.pastorId) {
                userData.pastorId = leader12.pastorId;
            }
        }

        const user = await prisma.user.create({
            data: userData,
            include: {
                pastor: true,
                liderDoce: true,
                liderCelula: true
            }
        });

        const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '1d',
        });

        res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                phone: user.phone,
                address: user.address,
                city: user.city,
                sex: user.sex,
                pastorId: user.pastorId,
                liderDoceId: user.liderDoceId,
                liderCelulaId: user.liderCelulaId
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

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '1d',
        });

        // Log the login activity
        await logActivity(user.id, 'LOGIN', 'SESSION');

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
        });

        res.status(200).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                phone: user.phone,
                address: user.address,
                city: user.city,
                sex: user.sex,
                pastorId: user.pastorId,
                liderDoceId: user.liderDoceId,
                liderCelulaId: user.liderCelulaId
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getPublicLeaders = async (req, res) => {
    try {
        const leaders = await prisma.user.findMany({
            where: { role: 'LIDER_DOCE' },
            select: { id: true, fullName: true, role: true }
        });
        res.json(leaders);
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

        const { email, password, fullName, sex, phone, address, city } = req.body;

        const validation = validatePassword(password, { email, fullName });
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.message });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                fullName,
                role: 'SUPER_ADMIN',
                sex,
                phone,
                address,
                city
            },
        });

        const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '1d',
        });

        await logActivity(user.id, 'CREATE', 'USER', user.id, 'Inicialización del sistema: Primer Usuario (SUPER_ADMIN)');

        res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                pastorId: user.pastorId,
                liderDoceId: user.liderDoceId,
                liderCelulaId: user.liderCelulaId
            },
        });
    } catch (err) {
        console.error('Setup error:', err);
        res.status(500).json({ message: 'Error initializing system' });
    }
};

module.exports = { register, login, getPublicLeaders, checkInitStatus, registerSetup };

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logActivity } = require('../utils/auditLogger');

const prisma = new PrismaClient();

const register = async (req, res) => {
    try {
        const { email, password, fullName, role, sex, phone, address, city, liderDoceId } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const userData = {
            email,
            password: hashedPassword,
            fullName,
            role: role || 'Miembro',
            sex,
            phone,
            address,
            city
        };

        if (liderDoceId) {
            userData.liderDoceId = parseInt(liderDoceId);
        }

        const user = await prisma.user.create({
            data: userData,
        });

        const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '1d',
        });

        res.status(201).json({ token, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } });
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

        res.status(200).json({ token, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } });
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
            user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role }
        });
    } catch (error) {
        console.error('Error in setup registration:', error);
        res.status(500).json({ message: 'Server error during setup' });
    }
};

module.exports = { register, login, getPublicLeaders, checkInitStatus, registerSetup };

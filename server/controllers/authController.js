const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
            role: role || 'MIEMBRO',
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
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '1d',
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

module.exports = { register, login, getPublicLeaders };

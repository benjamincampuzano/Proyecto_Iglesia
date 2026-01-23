const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { logActivity } = require('../utils/auditLogger');
const { validatePassword } = require('../utils/passwordValidator');

const prisma = new PrismaClient();

// Geocoding helper using Nominatim
const geocodeAddress = async (address, city) => {
    if (!address) return { lat: null, lng: null };
    try {
        const fullAddress = `${address}${city ? ', ' + city : ''}`;
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: {
                q: fullAddress,
                format: 'json',
                limit: 1
            },
            headers: {
                'User-Agent': 'ProyectoIglesia/1.0'
            }
        });
        if (response.data && response.data.length > 0) {
            return {
                lat: parseFloat(response.data[0].lat),
                lng: parseFloat(response.data[0].lon)
            };
        }
    } catch (error) {
        console.error('Geocoding error:', error);
    }
    return { lat: null, lng: null };
};

const { getUserNetwork } = require('../utils/networkUtils');

// Función auxiliar local eliminada en favor de la centralizada en utils/networkUtils


// Obtener perfil propio
const getProfile = async (req, res) => {
    try {
        const userId = parseInt(req.user.id);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                profile: true,
                roles: { include: { role: true } },
                parents: { include: { parent: { include: { profile: true } } } }
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                ...user.profile,
                roles: user.roles.map(r => r.role.name),
                hierarchy: user.parents.map(p => ({
                    parentId: p.parentId,
                    parentName: p.parent.profile.fullName,
                    role: p.role
                }))
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Actualizar perfil propio
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { fullName, email, sex, phone, address, city, documentType, documentNumber, birthDate } = req.body;

        if (email) {
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser && existingUser.id !== userId) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }

        let latitude = undefined;
        let longitude = undefined;
        if (address || city) {
            const coords = await geocodeAddress(address, city);
            if (coords.lat) {
                latitude = coords.lat;
                longitude = coords.lng;
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(email && { email }),
                ...(phone && { phone }),
                profile: {
                    update: {
                        ...(fullName && { fullName }),
                        ...(sex && { sex }),
                        ...(address && { address }),
                        ...(city && { city }),
                        ...(latitude !== undefined && { latitude }),
                        ...(longitude !== undefined && { longitude }),
                        ...(documentType !== undefined && { documentType }),
                        ...(documentNumber !== undefined && { documentNumber }),
                        ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
                    }
                }
            },
            include: { profile: true, roles: { include: { role: true } } }
        });

        res.status(200).json({
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                fullName: updatedUser.profile.fullName,
                roles: updatedUser.roles.map(r => r.role.name),
                phone: updatedUser.phone,
                address: updatedUser.profile.address,
                city: updatedUser.profile.city,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Cambiar contraseña propia
const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new password are required' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        const validation = validatePassword(newPassword, { email: user.email, fullName: user.profile.fullName });
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.message });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: Obtener todos los usuarios
const getAllUsers = async (req, res) => {
    try {
        const currentUser = req.user;
        const { role } = req.query;
        let where = {};

        // Security Filter based on RBAC and Hierarchy
        // Note: currentUser.roles is an array from the token
        if (currentUser.roles.includes('SUPER_ADMIN')) {
            where = {};
        } else if (currentUser.roles.some(r => ['PASTOR', 'LIDER_DOCE', 'LIDER_CELULA'].includes(r))) {
            const networkIds = await getUserNetwork(currentUser.id);
            where = {
                id: { in: [...networkIds, currentUser.id] },
                roles: {
                    none: {
                        role: { name: 'SUPER_ADMIN' }
                    }
                }
            };
        } else {
            where = { id: currentUser.id };
        }

        // Apply role filter if provided (matching the new Role table)
        if (role) {
            const roleNames = role.split(',');
            where.roles = {
                some: {
                    role: {
                        name: { in: roleNames }
                    }
                }
            };
        }

        const users = await prisma.user.findMany({
            where,
            include: {
                profile: true,
                roles: { include: { role: true } },
                parents: {
                    include: {
                        parent: {
                            include: { profile: true }
                        }
                    }
                },
                _count: {
                    select: {
                        invitedGuests: true
                    }
                }
            },
            orderBy: { profile: { fullName: 'asc' } }
        });

        // Format for frontend consumption
        const formattedUsers = users.map(u => ({
            id: u.id,
            email: u.email,
            phone: u.phone,
            ...u.profile,
            roles: u.roles.map(r => r.role.name),
            parents: u.parents.map(p => ({
                id: p.parentId,
                fullName: p.parent.profile.fullName,
                role: p.role
            })),
            invitedGuestsCount: u._count.invitedGuests
        }));

        res.status(200).json(formattedUsers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: Obtener usuario específico
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            include: {
                profile: true,
                roles: { include: { role: true } },
                parents: { include: { parent: { include: { profile: true } } } }
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const formattedUser = {
            id: user.id,
            email: user.email,
            phone: user.phone,
            ...user.profile,
            roles: user.roles.map(r => r.role.name),
            parents: user.parents.map(p => ({
                id: p.parentId,
                fullName: p.parent.profile.fullName,
                role: p.role
            }))
        };

        res.status(200).json({ user: formattedUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: Actualizar usuario (rol, detalles, jerarquía)
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = parseInt(id);
        const { fullName, email, role, sex, phone, address, city, parentId, roleInHierarchy, documentType, documentNumber, birthDate } = req.body;

        const userToUpdate = await prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true, roles: { include: { role: true } } }
        });

        if (!userToUpdate) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Security: LIDER_DOCE or PASTOR can only update their network
        if (req.user.roles.some(r => ['LIDER_DOCE', 'PASTOR'].includes(r)) && !req.user.roles.includes('SUPER_ADMIN')) {
            const networkIds = await getUserNetwork(req.user.id);
            if (!networkIds.includes(userId) && userId !== req.user.id) {
                return res.status(403).json({ message: 'You can only update users in your network' });
            }
        }

        if (email) {
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser && existingUser.id !== userId) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }

        let latitude = undefined;
        let longitude = undefined;
        if (address || city) {
            const coords = await geocodeAddress(address, city);
            if (coords.lat) { latitude = coords.lat; longitude = coords.lng; }
        }

        const updatedUser = await prisma.$transaction(async (tx) => {
            // 1. Update Core User & Profile
            const updated = await tx.user.update({
                where: { id: userId },
                data: {
                    ...(email && { email }),
                    ...(phone && { phone }),
                    profile: {
                        update: {
                            ...(fullName && { fullName }),
                            ...(sex && { sex }),
                            ...(address && { address }),
                            ...(city && { city }),
                            ...(latitude !== undefined && { latitude }),
                            ...(longitude !== undefined && { longitude }),
                            ...(documentType !== undefined && { documentType }),
                            ...(documentNumber !== undefined && { documentNumber }),
                            ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
                        }
                    }
                },
                include: { profile: true, roles: { include: { role: true } } }
            });

            // 2. Update Role if provided
            if (role) {
                const targetRole = await tx.role.upsert({
                    where: { name: role },
                    update: {},
                    create: { name: role }
                });
                // Clear existing roles and assign new one (or handle multi-role if needed)
                await tx.userRole.deleteMany({ where: { userId } });
                await tx.userRole.create({ data: { userId, roleId: targetRole.id } });
            }

            // 3. Update Hierarchy if parent provided
            if (parentId !== undefined) {
                await tx.userHierarchy.deleteMany({ where: { childId: userId } });
                if (parentId) {
                    await tx.userHierarchy.create({
                        data: {
                            parentId: parseInt(parentId),
                            childId: userId,
                            role: roleInHierarchy || 'DISCIPULO'
                        }
                    });
                }
            }

            return updated;
        });

        // Audit Log (Simplified for brevity)
        await logActivity(req.user.id, 'UPDATE', 'USER', userId, { targetUser: updatedUser.profile.fullName }, req.ip, req.headers['user-agent']);

        res.status(200).json({
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                fullName: updatedUser.profile.fullName,
                roles: updatedUser.roles.map(r => r.role.name)
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: Crear nuevo usuario
const createUser = async (req, res) => {
    try {
        const { email, password, fullName, role, sex, phone, address, city, parentId, roleInHierarchy, documentType, documentNumber, birthDate } = req.body;

        if (!email || !password || !fullName) {
            return res.status(400).json({ message: 'Email, password, and full name are required' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        // Check for duplicate document information
        if (documentType && documentNumber) {
            const existingProfile = await prisma.userProfile.findFirst({
                where: { documentType, documentNumber }
            });
            if (existingProfile) {
                return res.status(400).json({ message: 'Ya existe un usuario registrado con este tipo y número de documento.' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const coords = await geocodeAddress(address, city);

        const user = await prisma.$transaction(async (tx) => {
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
                            latitude: coords.lat,
                            longitude: coords.lng,
                            documentType,
                            documentNumber,
                            birthDate: birthDate ? new Date(birthDate) : null
                        }
                    }
                },
                include: { profile: true }
            });

            const targetRole = await tx.role.upsert({
                where: { name: role || 'DISCIPULO' },
                update: {},
                create: { name: role || 'DISCIPULO' }
            });

            await tx.userRole.create({ data: { userId: newUser.id, roleId: targetRole.id } });

            if (parentId) {
                await tx.userHierarchy.create({
                    data: {
                        parentId: parseInt(parentId),
                        childId: newUser.id,
                        role: roleInHierarchy || 'DISCIPULO'
                    }
                });
            }

            return newUser;
        });

        await logActivity(req.user.id, 'CREATE', 'USER', user.id, { targetUser: user.profile.fullName }, req.ip, req.headers['user-agent']);

        res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                fullName: user.profile.fullName,
                roles: [role || 'DISCIPULO']
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: Eliminar usuario
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = parseInt(id);

        if (userId === req.user.id) return res.status(400).json({ message: 'Cannot delete your own account' });

        const userToDelete = await prisma.user.findUnique({
            where: { id: userId },
            include: { _count: { select: { children: true, ledCells: true, invitedGuests: true } } }
        });

        if (!userToDelete) return res.status(404).json({ message: 'User not found' });

        if (userToDelete._count.children > 0 || userToDelete._count.ledCells > 0 || userToDelete._count.invitedGuests > 0) {
            return res.status(400).json({ message: 'User has dependencies (descendants, cells, or guests) and cannot be deleted yet.' });
        }

        await prisma.$transaction([
            prisma.userRole.deleteMany({ where: { userId } }),
            prisma.userHierarchy.deleteMany({ where: { OR: [{ parentId: userId }, { childId: userId }] } }),
            prisma.userProfile.delete({ where: { userId } }),
            prisma.user.delete({ where: { id: userId } })
        ]);

        await logActivity(req.user.id, 'DELETE', 'USER', userId, { targetId: userId }, req.ip, req.headers['user-agent']);

        res.status(200).json({ message: 'Usuario eliminado exitosamente' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error del servidor al eliminar usuario' });
    }
};

// Admin: Asignar líder a usuario
const assignLeader = async (req, res) => {
    try {
        const { id } = req.params;
        const { parentId, role } = req.body;

        const userId = parseInt(id);
        const pId = parseInt(parentId);

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Update hierarchy: remove old, add new
        await prisma.userHierarchy.deleteMany({ where: { childId: userId } });
        if (parentId) {
            await prisma.userHierarchy.create({
                data: {
                    parentId: pId,
                    childId: userId,
                    role: role || 'DISCIPULO'
                }
            });
        }

        res.status(200).json({ message: 'Leader assigned successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Obtener usuarios en mi red (para líderes)
const getMyNetwork = async (req, res) => {
    try {
        const userId = req.user.id;
        const networkIds = await getUserNetwork(userId);

        if (networkIds.length === 0) {
            return res.json([]);
        }

        const users = await prisma.user.findMany({
            where: {
                id: { in: networkIds }
            },
            include: {
                profile: true,
                roles: { include: { role: true } }
            },
            orderBy: { profile: { fullName: 'asc' } }
        });

        const formatted = users.map(u => ({
            id: u.id,
            fullName: u.profile.fullName,
            email: u.email,
            phone: u.phone,
            roles: u.roles.map(r => r.role.name)
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching my network:', error);
        res.status(500).json({ error: 'Error fetching network' });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    changePassword,
    getAllUsers,
    getUserById,
    updateUser,
    createUser,
    deleteUser,
    assignLeader,
    getMyNetwork
};

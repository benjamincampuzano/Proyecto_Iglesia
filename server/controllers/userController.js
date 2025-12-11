const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Función auxiliar para obtener todos los usuarios en la red de un líder (discípulos y sub-discípulos)
const getUserNetwork = async (userId) => {
    const network = [];
    const queue = [userId];
    const visited = new Set();

    while (queue.length > 0) {
        const currentId = queue.shift();

        if (visited.has(currentId)) continue;
        visited.add(currentId);
        network.push(currentId);

        const disciples = await prisma.user.findMany({
            where: { leaderId: currentId },
            select: { id: true }
        });

        queue.push(...disciples.map(d => d.id));
    }

    // Filter out any undefined/null values as safety measure
    return network.filter(id => id != null);
};

// Actualizar perfil propio (nombre, email)
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { fullName, email } = req.body;

        // Verificar si el correo ya está siendo usado por otro usuario
        if (email) {
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser && existingUser.id !== userId) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(fullName && { fullName }),
                ...(email && { email }),
            },
        });

        res.status(200).json({
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                fullName: updatedUser.fullName,
                role: updatedUser.role,
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

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verificar contraseña actual
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Hashear nueva contraseña
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
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                leaderId: true,
                createdAt: true,
                updatedAt: true,
                leader: {
                    select: {
                        id: true,
                        fullName: true,
                        role: true
                    }
                },
                disciples: {
                    select: {
                        id: true,
                        fullName: true,
                        role: true,
                        _count: {
                            select: {
                                invitedGuests: true
                            }
                        },
                        disciples: {
                            select: {
                                id: true,
                                fullName: true,
                                role: true,
                                _count: {
                                    select: {
                                        invitedGuests: true
                                    }
                                }
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        invitedGuests: true
                    }
                }
            },
            orderBy: { fullName: 'asc' }
        });

        res.status(200).json({ users });
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
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: Actualizar usuario (rol, detalles)
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, email, role } = req.body;

        // Obtener el usuario que se está actualizando
        const userToUpdate = await prisma.user.findUnique({
            where: { id: parseInt(id) }
        });

        if (!userToUpdate) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Si es LIDER_DOCE, validar que solo pueda actualizar usuarios en su red
        if (req.user.role === 'LIDER_DOCE') {
            const networkUserIds = await getUserNetwork(req.user.id);

            if (!networkUserIds.includes(userToUpdate.id)) {
                return res.status(403).json({
                    message: 'You can only update users in your network'
                });
            }
        }

        // Verificar si el correo ya cuenta con otro usuario
        if (email) {
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser && existingUser.id !== parseInt(id)) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: {
                ...(fullName && { fullName }),
                ...(email && { email }),
                ...(role && { role }),
            },
        });

        res.status(200).json({
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                fullName: updatedUser.fullName,
                role: updatedUser.role,
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
        const { email, password, fullName, role } = req.body;

        if (!email || !password || !fullName) {
            return res.status(400).json({ message: 'Email, password, and full name are required' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                fullName,
                role: role || 'MIEMBRO',
            },
        });

        res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
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

        // LIDER_DOCE no puede eliminar usuarios
        if (req.user.role === 'LIDER_DOCE') {
            return res.status(403).json({
                message: 'LIDER_DOCE role cannot delete users'
            });
        }

        // Prevenir eliminarse a sí mismo
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        await prisma.user.delete({
            where: { id: parseInt(id) },
        });

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: Asignar líder a usuario (establecer relación de discipulado)
const assignLeader = async (req, res) => {
    try {
        const { id } = req.params;
        const { leaderId } = req.body;

        // Obtener el usuario para validar rol
        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            select: { id: true, role: true, fullName: true }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Validar: no se puede asignar líder a roles SUPER_ADMIN o LIDER_DOCE
        if (user.role === 'SUPER_ADMIN' || user.role === 'LIDER_DOCE') {
            return res.status(400).json({
                message: 'Cannot assign leader to SUPER_ADMIN or LIDER_DOCE roles'
            });
        }

        // Si se proporciona leaderId, validar que exista y tenga el rol apropiado
        if (leaderId) {
            const leader = await prisma.user.findUnique({
                where: { id: parseInt(leaderId) },
                select: { id: true, role: true, fullName: true }
            });

            if (!leader) {
                return res.status(404).json({ message: 'Leader not found' });
            }

            // El líder debe ser LIDER_DOCE o LIDER_CELULA
            if (leader.role !== 'LIDER_DOCE' && leader.role !== 'LIDER_CELULA') {
                return res.status(400).json({
                    message: 'Leader must have LIDER_DOCE or LIDER_CELULA role'
                });
            }

            // Solo LIDER_DOCE puede asignar a LIDER_CELULA como líder
            if (leader.role === 'LIDER_CELULA' && req.user.role !== 'LIDER_DOCE' && req.user.role !== 'SUPER_ADMIN') {
                return res.status(403).json({
                    message: 'Only LIDER_DOCE or SUPER_ADMIN can assign LIDER_CELULA as leader'
                });
            }

            // MIEMBRO solo puede ser asignado a LIDER_CELULA o LIDER_DOCE
            // LIDER_CELULA solo puede ser asignado a LIDER_DOCE
            if (user.role === 'LIDER_CELULA' && leader.role !== 'LIDER_DOCE') {
                return res.status(400).json({
                    message: 'LIDER_CELULA can only be assigned to LIDER_DOCE'
                });
            }
        }

        // Actualizar el leaderId del usuario
        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { leaderId: leaderId ? parseInt(leaderId) : null },
            include: {
                leader: {
                    select: { id: true, fullName: true, role: true }
                }
            }
        });

        res.status(200).json({
            message: leaderId ? 'Leader assigned successfully' : 'Leader removed successfully',
            user: {
                id: updatedUser.id,
                fullName: updatedUser.fullName,
                role: updatedUser.role,
                leader: updatedUser.leader
            }
        });
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
            select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                address: true,
                role: true
            },
            orderBy: { fullName: 'asc' }
        });

        res.json(users);
    } catch (error) {
        console.error('Error fetching my network:', error);
        res.status(500).json({ error: 'Error fetching network' });
    }
};

module.exports = {
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

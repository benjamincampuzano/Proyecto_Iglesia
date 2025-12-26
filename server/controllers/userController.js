const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const axios = require('axios');

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

// Función auxiliar para obtener todos los usuarios en la red de un líder (discípulos y sub-discípulos)
const getUserNetwork = async (leaderId) => {
    const id = parseInt(leaderId);
    if (isNaN(id)) return [];

    const network = new Set();
    const queue = [id];
    const visited = new Set([id]);

    while (queue.length > 0) {
        const currentId = queue.shift();

        const children = await prisma.user.findMany({
            where: {
                OR: [
                    { leaderId: currentId },
                    { liderDoceId: currentId },
                    { liderCelulaId: currentId },
                    { pastorId: currentId }
                ]
            },
            select: { id: true }
        });

        for (const child of children) {
            if (!visited.has(child.id)) {
                visited.add(child.id);
                network.add(child.id);
                queue.push(child.id);
            }
        }
    }

    return Array.from(network);
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
        const currentUser = req.user;
        const { role } = req.query; // Added role parameter extraction
        let where = {};

        // Security Filter
        // Security Filter
        if (currentUser.role === 'SUPER_ADMIN') {
            // See all
            where = {};
        } else if (currentUser.role === 'PASTOR' || currentUser.role === 'LIDER_DOCE' || currentUser.role === 'LIDER_CELULA') {
            const networkIds = await getUserNetwork(currentUser.id);
            // Include self and network
            where = {
                id: { in: [...networkIds, currentUser.id] }
            };
        } else {
            // Members see only themselves
            where = { id: currentUser.id };
        }

        // Apply role filter if provided
        if (role) {
            if (role.includes(',')) {
                where.role = { in: role.split(',') };
            } else {
                where.role = role;
            }
        }

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                sex: true,
                phone: true,
                address: true,
                city: true,
                latitude: true,
                longitude: true,
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
        const { fullName, email, role, sex, phone, address, city } = req.body;

        // Geocode address if provided
        let latitude = undefined;
        let longitude = undefined;
        if (address || city) {
            const coords = await geocodeAddress(address, city);
            if (coords.lat) {
                latitude = coords.lat;
                longitude = coords.lng;
            }
        }

        // Obtener el usuario que se está actualizando
        const userToUpdate = await prisma.user.findUnique({
            where: { id: parseInt(id) }
        });

        if (!userToUpdate) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Si es LIDER_DOCE o PASTOR, validar que solo pueda actualizar usuarios en su red
        if (req.user.role === 'LIDER_DOCE' || req.user.role === 'PASTOR') {
            const networkUserIds = await getUserNetwork(req.user.id);

            if (!networkUserIds.includes(userToUpdate.id) && userToUpdate.id !== req.user.id) {
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
                ...(sex && { sex }),
                ...(phone && { phone }),
                ...(address && { address }),
                ...(city && { city }),
                ...(latitude !== undefined && { latitude }),
                ...(longitude !== undefined && { longitude }),
            },
        });

        res.status(200).json({
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                fullName: updatedUser.fullName,
                role: updatedUser.role,
                latitude: updatedUser.latitude,
                longitude: updatedUser.longitude
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
        const { email, password, fullName, role, sex, phone, address, city, liderDoceId } = req.body;

        if (!email || !password || !fullName) {
            return res.status(400).json({ message: 'Email, password, and full name are required' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Geocode address if provided
        const coords = await geocodeAddress(address, city);

        const userData = {
            email,
            password: hashedPassword,
            fullName,
            role: role || 'Miembro',
            sex,
            phone,
            address,
            city,
            latitude: coords.lat,
            longitude: coords.lng
        };

        if (liderDoceId) {
            userData.liderDoceId = parseInt(liderDoceId);
            userData.leaderId = parseInt(liderDoceId); // Asignar también como líder directo por defecto
        }
        if (req.body.pastorId) {
            userData.pastorId = parseInt(req.body.pastorId);
            userData.leaderId = parseInt(req.body.pastorId);
        }
        if (req.body.liderCelulaId) {
            userData.liderCelulaId = parseInt(req.body.liderCelulaId);
            userData.leaderId = parseInt(req.body.liderCelulaId);
        }

        const user = await prisma.user.create({
            data: userData,
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
        const userId = parseInt(id);

        console.log(`Attempting to delete user ${userId}`);

        // LIDER_DOCE no puede eliminar usuarios
        if (req.user.role === 'LIDER_DOCE') {
            return res.status(403).json({
                message: 'LIDER_DOCE role cannot delete users'
            });
        }

        // Prevenir eliminarse a sí mismo
        if (userId === req.user.id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        // 1. Verificar si tiene invitados invitados (bloqueante)
        const invitedGuestsCount = await prisma.guest.count({
            where: { invitedById: userId }
        });

        if (invitedGuestsCount > 0) {
            return res.status(400).json({
                message: `No se puede eliminar: El usuario tiene ${invitedGuestsCount} invitados registrados. Reasígnalos o elimínalos primero.`
            });
        }

        // 2. Verificar si es LIDER de alguna célula (bloqueante)
        const ledCellsCount = await prisma.cell.count({
            where: { leaderId: userId }
        });

        if (ledCellsCount > 0) {
            return res.status(400).json({
                message: `No se puede eliminar: El usuario es líder de ${ledCellsCount} células. Asigna un nuevo líder a estas células antes de eliminar el usuario.`
            });
        }

        // 3. Transacción para limpiar TODAS las referencias y borrar
        await prisma.$transaction(async (tx) => {
            console.log('Starting deletion transaction for user', userId);

            // A. Desvincular roles de liderazgo (poner null)
            await tx.user.updateMany({ where: { leaderId: userId }, data: { leaderId: null } });
            await tx.user.updateMany({ where: { pastorId: userId }, data: { pastorId: null } });
            await tx.user.updateMany({ where: { liderDoceId: userId }, data: { liderDoceId: null } });
            await tx.user.updateMany({ where: { liderCelulaId: userId }, data: { liderCelulaId: null } });

            // B. Desvincular como Host de célula (opcional)
            await tx.cell.updateMany({
                where: { hostId: userId },
                data: { hostId: null }
            });

            // C. Desvincular asignación de invitados
            await tx.guest.updateMany({
                where: { assignedToId: userId },
                data: { assignedToId: null }
            });

            // D. Borrar datos relacionados (Historiales, Asistencias, Inscripciones)
            await tx.classAttendance.deleteMany({ where: { userId: userId } });
            await tx.seminarEnrollment.deleteMany({ where: { userId: userId } });
            await tx.churchAttendance.deleteMany({ where: { userId: userId } });
            await tx.cellAttendance.deleteMany({ where: { userId: userId } });
            await tx.conventionRegistration.deleteMany({ where: { userId: userId } });

            // E. Finalmente eliminar usuario
            await tx.user.delete({
                where: { id: userId },
            });
        });

        console.log(`User ${userId} deleted successfully`);
        res.status(200).json({ message: 'Usuario eliminado exitosamente' });
    } catch (error) {
        console.error('Error deleting user:', error);
        // Mejor manejo de errores de Prisma
        if (error.code === 'P2003') {
            return res.status(400).json({
                message: 'No se puede eliminar: El usuario tiene datos relacionados (asistencias, clases, etc.) que impiden su eliminación.'
            });
        }
        res.status(500).json({ message: 'Error del servidor al eliminar usuario' });
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

        // Validar: no se puede asignar líder a roles SUPER_ADMIN o PASTOR (ellos son cabeza)
        if (user.role === 'SUPER_ADMIN' || user.role === 'PASTOR') {
            return res.status(400).json({
                message: 'Cannot assign leader to SUPER_ADMIN or PASTOR roles'
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

            // El líder debe ser PASTOR, LIDER_DOCE o LIDER_CELULA
            if (leader.role !== 'LIDER_DOCE' && leader.role !== 'LIDER_CELULA' && leader.role !== 'PASTOR') {
                return res.status(400).json({
                    message: 'Leader must have PASTOR, LIDER_DOCE or LIDER_CELULA role'
                });
            }

            // Solo LIDER_DOCE puede asignar a LIDER_CELULA como líder
            if (leader.role === 'LIDER_CELULA' && req.user.role !== 'LIDER_DOCE' && req.user.role !== 'SUPER_ADMIN') {
                return res.status(403).json({
                    message: 'Only LIDER_DOCE or SUPER_ADMIN can assign LIDER_CELULA as leader'
                });
            }

            // Miembro solo puede ser asignado a LIDER_CELULA o LIDER_DOCE
            // LIDER_CELULA solo puede ser asignado a LIDER_DOCE
            if (user.role === 'LIDER_CELULA' && leader.role !== 'LIDER_DOCE') {
                return res.status(400).json({
                    message: 'LIDER_CELULA can only be assigned to LIDER_DOCE'
                });
            }
        }

        // Actualizar el leaderId del usuario (y mantener coherencia con campos antiguos si es necesario)
        let updateData = {
            leaderId: leaderId ? parseInt(leaderId) : null
        };

        // Sincronizar campos específicos para compatibilidad
        if (leaderId) {
            const leader = await prisma.user.findUnique({ where: { id: parseInt(leaderId) } });
            if (leader.role === 'PASTOR') updateData.pastorId = parseInt(leaderId);
            else if (leader.role === 'LIDER_DOCE') updateData.liderDoceId = parseInt(leaderId);
            else if (leader.role === 'LIDER_CELULA') updateData.liderCelulaId = parseInt(leaderId);
        } else {
            updateData.pastorId = null;
            updateData.liderDoceId = null;
            updateData.liderCelulaId = null;
        }

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: updateData,
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

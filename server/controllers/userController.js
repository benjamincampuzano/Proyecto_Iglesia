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

// Obtener perfil propio
const getProfile = async (req, res) => {
    try {
        const userId = parseInt(req.user.id);
        const user = await prisma.user.findUnique({
            where: { id: userId },
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
                pastorId: true,
                liderDoceId: true,
                liderCelulaId: true
            }
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

// Actualizar perfil propio (nombre, email, datos de contacto)
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { fullName, email, sex, phone, address, city } = req.body;

        // Verificar si el correo ya está siendo usado por otro usuario
        if (email) {
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser && existingUser.id !== userId) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }

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

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(fullName && { fullName }),
                ...(email && { email }),
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
                sex: updatedUser.sex,
                phone: updatedUser.phone,
                address: updatedUser.address,
                city: updatedUser.city,
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

        // Validar nueva contraseña
        const validation = validatePassword(newPassword, { email: user.email, fullName: user.fullName });
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.message });
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
                pastorId: true,
                liderDoceId: true,
                liderCelulaId: true,
                createdAt: true,
                updatedAt: true,
                leader: {
                    select: {
                        id: true,
                        fullName: true,
                        role: true
                    }
                },
                pastor: {
                    select: {
                        id: true,
                        fullName: true,
                        role: true
                    }
                },
                liderDoce: {
                    select: {
                        id: true,
                        fullName: true,
                        role: true
                    }
                },
                liderCelula: {
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
        const { fullName, email, role, sex, phone, address, city, pastorId, liderDoceId, liderCelulaId } = req.body;

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

        // Obtener el usuario que se está actualizando (incluyendo nombres de líderes para auditoría)
        const userToUpdate = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            include: {
                pastor: { select: { fullName: true } },
                liderDoce: { select: { fullName: true } },
                liderCelula: { select: { fullName: true } }
            }
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

        const updateData = {
            ...(fullName && { fullName }),
            ...(email && { email }),
            ...(role && { role }),
            ...(sex && { sex }),
            ...(phone && { phone }),
            ...(address && { address }),
            ...(city && { city }),
            ...(latitude !== undefined && { latitude }),
            ...(longitude !== undefined && { longitude }),
        };

        // Asignación jerárquica de líderes en actualización
        if (pastorId !== undefined) updateData.pastorId = pastorId ? parseInt(pastorId) : null;
        if (liderDoceId !== undefined) updateData.liderDoceId = liderDoceId ? parseInt(liderDoceId) : null;
        if (liderCelulaId !== undefined) updateData.liderCelulaId = liderCelulaId ? parseInt(liderCelulaId) : null;

        // Recalcular leaderId basado en la jerarquía (Célula > Doce > Pastor)
        if (updateData.pastorId !== undefined || updateData.liderDoceId !== undefined || updateData.liderCelulaId !== undefined) {
            const currentPastor = updateData.pastorId !== undefined ? updateData.pastorId : userToUpdate.pastorId;
            const currentDoce = updateData.liderDoceId !== undefined ? updateData.liderDoceId : userToUpdate.liderDoceId;
            const currentCelula = updateData.liderCelulaId !== undefined ? updateData.liderCelulaId : userToUpdate.liderCelulaId;

            updateData.leaderId = currentCelula || currentDoce || currentPastor || null;

            // Si el rol es PASTOR, siempre es su propio líder
            if ((role || userToUpdate.role) === 'PASTOR') {
                updateData.leaderId = parseInt(id);
                updateData.pastorId = parseInt(id);
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                pastor: { select: { fullName: true } },
                liderDoce: { select: { fullName: true } },
                liderCelula: { select: { fullName: true } }
            }
        });

        // Identify what changed
        const changes = {};
        const fieldsToTrack = [
            'fullName', 'email', 'role', 'sex', 'phone',
            'address', 'city', 'pastorId', 'liderDoceId', 'liderCelulaId'
        ];

        fieldsToTrack.forEach(field => {
            let oldValue = userToUpdate[field];
            let newValue = updatedUser[field];

            if (oldValue !== newValue) {
                let displayField = field;

                // Mapeo de IDs a nombres para auditoría legible
                if (field === 'pastorId') {
                    displayField = 'Pastor';
                    oldValue = userToUpdate.pastor?.fullName || 'Ninguno';
                    newValue = updatedUser.pastor?.fullName || 'Ninguno';
                } else if (field === 'liderDoceId') {
                    displayField = 'Líder Doce';
                    oldValue = userToUpdate.liderDoce?.fullName || 'Ninguno';
                    newValue = updatedUser.liderDoce?.fullName || 'Ninguno';
                } else if (field === 'liderCelulaId') {
                    displayField = 'Líder Célula';
                    oldValue = userToUpdate.liderCelula?.fullName || 'Ninguno';
                    newValue = updatedUser.liderCelula?.fullName || 'Ninguno';
                }

                changes[displayField] = {
                    old: oldValue,
                    new: newValue
                };
            }
        });

        // Log Activity
        if (Object.keys(changes).length > 0) {
            await logActivity(
                req.user.id,
                'UPDATE',
                'USER',
                updatedUser.id,
                {
                    targetUser: updatedUser.fullName,
                    changes
                }
            );
        }

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

        const validation = validatePassword(password, { email, fullName });
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.message });
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
            role: role || 'DISCIPULO',
            sex,
            phone,
            address,
            city,
            latitude: coords.lat,
            longitude: coords.lng
        };

        // Asignación jerárquica de líderes con herencia
        if (req.body.liderCelulaId) {
            const lcelulaId = parseInt(req.body.liderCelulaId);
            userData.liderCelulaId = lcelulaId;
            userData.leaderId = lcelulaId;

            // Heredar Líder 12 y Pastor del Líder de Célula
            const lCelula = await prisma.user.findUnique({
                where: { id: lcelulaId },
                select: { liderDoceId: true, pastorId: true }
            });
            if (lCelula) {
                if (lCelula.liderDoceId) userData.liderDoceId = lCelula.liderDoceId;
                if (lCelula.pastorId) userData.pastorId = lCelula.pastorId;
            }
        } else if (req.body.liderDoceId || liderDoceId) {
            const ldoceId = parseInt(req.body.liderDoceId || liderDoceId);
            userData.liderDoceId = ldoceId;
            userData.leaderId = ldoceId;

            // Heredar Pastor del Líder 12
            const lDoce = await prisma.user.findUnique({
                where: { id: ldoceId },
                select: { pastorId: true }
            });
            if (lDoce && lDoce.pastorId) {
                userData.pastorId = lDoce.pastorId;
            }
        } else if (req.body.pastorId) {
            userData.pastorId = parseInt(req.body.pastorId);
            userData.leaderId = userData.pastorId;
        }

        let user = await prisma.user.create({
            data: userData,
        });

        // Caso especial: El Pastor es líder de sí mismo
        if (user.role === 'PASTOR') {
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    leaderId: user.id,
                    pastorId: user.id
                },
            });
        }

        // Log Activity
        await logActivity(
            req.user.id,
            'CREATE',
            'USER',
            user.id,
            { targetUser: user.fullName, email: user.email, role: user.role }
        );

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

            // DISCIPULO solo puede ser asignado a LIDER_CELULA o LIDER_DOCE
            // LIDER_CELULA solo puede ser asignado a LIDER_DOCE
            if (user.role === 'LIDER_CELULA' && leader.role !== 'LIDER_DOCE') {
                return res.status(400).json({
                    message: 'LIDER_CELULA can only be assigned to LIDER_DOCE'
                });
            }
        }

        // Actualizar el leaderId del usuario y sincronizar la jerarquía
        let updateData = {
            leaderId: leaderId ? parseInt(leaderId) : null
        };

        if (leaderId) {
            const leader = await prisma.user.findUnique({
                where: { id: parseInt(leaderId) },
                select: { id: true, role: true, pastorId: true, liderDoceId: true }
            });

            if (leader.role === 'PASTOR') {
                updateData.pastorId = leader.id;
            } else if (leader.role === 'LIDER_DOCE') {
                updateData.liderDoceId = leader.id;
                updateData.pastorId = leader.pastorId;
            } else if (leader.role === 'LIDER_CELULA') {
                updateData.liderCelulaId = leader.id;
                updateData.liderDoceId = leader.liderDoceId;
                updateData.pastorId = leader.pastorId;
            }
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

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Logs an action to the AuditLog table.
 * @param {number|null} userId - The ID of the user performing the action.
 * @param {string} action - The action performed (e.g., 'LOGIN', 'CREATE', 'UPDATE', 'DELETE').
 * @param {string} entityType - The type of entity affected (e.g., 'CELL', 'CONVENTION', 'ENCUENTRO', 'USER', 'SESSION').
 * @param {number|null} entityId - The ID of the primary entity affected.
 * @param {object|null} details - Additional JSON details for the audit.
 */
const logActivity = async (userId, action, entityType, entityId = null, details = null) => {
    try {
        await prisma.auditLog.create({
            data: {
                userId: userId ? parseInt(userId) : null,
                action,
                entityType,
                entityId: entityId ? parseInt(entityId) : null,
                details: details ? JSON.stringify(details) : null
            }
        });
    } catch (error) {
        console.error('Error recording audit log:', error);
    }
};

module.exports = {
    logActivity
};

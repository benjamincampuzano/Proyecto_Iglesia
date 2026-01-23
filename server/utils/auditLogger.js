const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Logs an action to the AuditLog table using the new hierarchical schema.
 * @param {number|null} userId - The ID of the user performing the action.
 * @param {string} action - The action performed (AuditAction enum).
 * @param {string} entityType - The type of entity affected (EntityType enum).
 * @param {number|null} entityId - The ID of the primary entity affected.
 * @param {object|null} details - Additional JSON details for the audit.
 * @param {string|null} ipAddress - IP address of the requester.
 * @param {string|null} userAgent - User agent string of the requester.
 */
const logActivity = async (userId, action, entityType, entityId = null, details = null, ipAddress = null, userAgent = null) => {
    try {
        await prisma.auditLog.create({
            data: {
                userId: userId ? parseInt(userId) : null,
                action,
                entityType,
                entityId: entityId ? parseInt(entityId) : null,
                details: details || null,
                ipAddress,
                userAgent
            }
        });
    } catch (error) {
        console.error('Error recording audit log:', error);
    }
};

module.exports = {
    logActivity
};

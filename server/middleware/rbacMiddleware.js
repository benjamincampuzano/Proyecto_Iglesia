/**
 * Middleware to require a specific permission.
 * Assumes req.user is already populated with permissions by auth middleware.
 * @param {string} permission 
 */
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user || !req.user.permissions) {
            return res.status(403).json({ error: "Access denied: No permissions found." });
        }

        if (!req.user.permissions.includes(permission)) {
            return res.status(403).json({ error: "Permiso denegado" });
        }

        next();
    };
};

module.exports = { requirePermission };

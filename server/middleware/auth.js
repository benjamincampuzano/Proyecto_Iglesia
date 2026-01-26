const jwt = require('jsonwebtoken');

// Middleware para verificar token JWT
const authenticate = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Normalizar: asegurar que tenemos el campo 'id' y 'roles' (array)
        req.user = {
            id: decoded.id || decoded.userId,
            roles: decoded.roles || (decoded.role ? [decoded.role] : [])
        };
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Middleware para verificar si el usuario es administrador
const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    const adminRoles = ['ADMIN', 'LIDER_DOCE', 'ADMIN'];
    const hasAdminRole = req.user.roles.some(role => adminRoles.includes(role));

    if (!hasAdminRole) {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    next();
};

// Middleware para verificar roles específicos
const authorize = (allowedRoles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const hasAuthorizedRole = allowedRoles.length === 0 || req.user.roles.some(role => allowedRoles.includes(role));

        if (!hasAuthorizedRole) {
            return res.status(403).json({ message: 'Access denied. You do not have the required permissions.' });
        }

        next();
    };
};

module.exports = { authenticate, isAdmin, authorize };

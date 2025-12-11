const jwt = require('jsonwebtoken');

// Middleware para verificar token JWT
const authenticate = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Normalizar: asegurar que tenemos el campo 'id' (el token podría tener 'userId')
        req.user = {
            id: decoded.id || decoded.userId,
            role: decoded.role
        };
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Middleware para verificar si el usuario es administrador (SUPER_ADMIN o LIDER_DOCE)
const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'LIDER_DOCE') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    next();
};

module.exports = { authenticate, isAdmin };

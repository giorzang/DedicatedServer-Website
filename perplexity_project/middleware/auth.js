const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Verify JWT token
const verifyToken = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '') || req.session.token;

        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from database
        const [users] = await db.execute(
            'SELECT id, steamid, username, avatar, is_admin, is_banned FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid token. User not found.' });
        }

        const user = users[0];

        if (user.is_banned) {
            return res.status(403).json({ error: 'User is banned.' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ error: 'Invalid token.' });
    }
};

// Verify admin role
const verifyAdmin = (req, res, next) => {
    if (!req.user || !req.user.is_admin) {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    next();
};

// Optional authentication (user may or may not be logged in)
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '') || req.session.token;

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const [users] = await db.execute(
                'SELECT id, steamid, username, avatar, is_admin, is_banned FROM users WHERE id = ?',
                [decoded.userId]
            );

            if (users.length > 0 && !users[0].is_banned) {
                req.user = users[0];
            }
        }
        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
};

module.exports = {
    verifyToken,
    verifyAdmin,
    optionalAuth
};

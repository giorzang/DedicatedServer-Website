const express = require('express');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const { URL } = require('url');
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Steam OpenID endpoints
const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';
const STEAM_API_BASE = 'http://api.steampowered.com';

// Initiate Steam authentication
router.get('/steam', (req, res) => {
    const returnURL = process.env.STEAM_RETURN_URL;

    const params = new URLSearchParams({
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.return_to': returnURL,
        'openid.realm': process.env.BASE_URL,
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
    });

    const authURL = `${STEAM_OPENID_URL}?${params}`;
    res.redirect(authURL);
});

// Steam authentication return handler
router.get('/steam/return', async (req, res) => {
    try {
        const { query } = req;

        // Validate OpenID response
        if (query['openid.mode'] !== 'id_res') {
            return res.redirect(`${process.env.FRONTEND_URL}?error=authentication_failed`);
        }

        // Verify the response with Steam
        const isValid = await verifyOpenIDResponse(query);
        if (!isValid) {
            return res.redirect(`${process.env.FRONTEND_URL}?error=invalid_response`);
        }

        // Extract Steam ID
        const steamId = extractSteamId(query['openid.identity']);
        if (!steamId) {
            return res.redirect(`${process.env.FRONTEND_URL}?error=invalid_steam_id`);
        }

        // Get user profile from Steam API
        const steamProfile = await getSteamProfile(steamId);
        if (!steamProfile) {
            return res.redirect(`${process.env.FRONTEND_URL}?error=profile_fetch_failed`);
        }

        // Create or update user in database
        const user = await createOrUpdateUser(steamProfile);

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, steamId: user.steamid },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Save token in session
        req.session.token = token;
        req.session.user = user;

        // Redirect to frontend with success
        res.redirect(`${process.env.FRONTEND_URL}?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);

    } catch (error) {
        console.error('Steam auth error:', error);
        res.redirect(`${process.env.FRONTEND_URL}?error=server_error`);
    }
});

// Get current user info
router.get('/me', verifyToken, (req, res) => {
    res.json({
        user: req.user,
        authenticated: true
    });
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Could not log out' });
        }
        res.json({ message: 'Logged out successfully' });
    });
});

// Verify OpenID response with Steam
async function verifyOpenIDResponse(query) {
    try {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(query)) {
            params.append(key, value);
        }
        params.set('openid.mode', 'check_authentication');

        const response = await fetch(STEAM_OPENID_URL, {
            method: 'POST',
            body: params,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const text = await response.text();
        return text.includes('is_valid:true');
    } catch (error) {
        console.error('OpenID verification error:', error);
        return false;
    }
}

// Extract Steam ID from OpenID identity URL
function extractSteamId(identity) {
    const match = identity.match(/\/id\/(\d+)$/);
    return match ? match[1] : null;
}

// Get Steam profile from API
async function getSteamProfile(steamId) {
    try {
        const url = `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v0002/`;
        const params = new URLSearchParams({
            key: process.env.STEAM_API_KEY,
            steamids: steamId
        });

        const response = await fetch(`${url}?${params}`);
        const data = await response.json();

        if (data.response && data.response.players && data.response.players.length > 0) {
            return data.response.players[0];
        }
        return null;
    } catch (error) {
        console.error('Steam API error:', error);
        return null;
    }
}

// Create or update user in database
async function createOrUpdateUser(steamProfile) {
    try {
        const [existingUsers] = await db.execute(
            'SELECT * FROM users WHERE steamid = ?',
            [steamProfile.steamid]
        );

        if (existingUsers.length > 0) {
            // Update existing user
            await db.execute(
                'UPDATE users SET username = ?, avatar = ?, profile_url = ?, last_login = NOW() WHERE steamid = ?',
                [steamProfile.personaname, steamProfile.avatarfull, steamProfile.profileurl, steamProfile.steamid]
            );

            const [updatedUser] = await db.execute(
                'SELECT id, steamid, username, avatar, is_admin, is_banned FROM users WHERE steamid = ?',
                [steamProfile.steamid]
            );

            return updatedUser[0];
        } else {
            // Create new user
            const [result] = await db.execute(
                'INSERT INTO users (steamid, username, avatar, profile_url) VALUES (?, ?, ?, ?)',
                [steamProfile.steamid, steamProfile.personaname, steamProfile.avatarfull, steamProfile.profileurl]
            );

            const [newUser] = await db.execute(
                'SELECT id, steamid, username, avatar, is_admin, is_banned FROM users WHERE id = ?',
                [result.insertId]
            );

            return newUser[0];
        }
    } catch (error) {
        console.error('Database user error:', error);
        throw error;
    }
}

module.exports = router;

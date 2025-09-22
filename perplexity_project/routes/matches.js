const express = require('express');
const db = require('../config/database');
const { verifyToken, verifyAdmin, optionalAuth } = require('../middleware/auth');
const { RconClient } = require('../utils/rcon');
const { generateMatchConfig, saveMatchConfig } = require('../utils/matchConfig');

const router = express.Router();

// Get all matches
router.get('/', optionalAuth, async (req, res) => {
    try {
        const [matches] = await db.execute(`
            SELECT m.*, u.username as created_by_name, u.avatar as created_by_avatar,
                   (SELECT COUNT(*) FROM match_players mp WHERE mp.match_id = m.id) as player_count,
                   (SELECT COUNT(*) FROM match_players mp WHERE mp.match_id = m.id AND mp.is_ready = 1) as ready_count
            FROM matches m
            LEFT JOIN users u ON m.created_by = u.id
            ORDER BY m.created_at DESC
            LIMIT 20
        `);

        // Get players for each match
        for (let match of matches) {
            const [players] = await db.execute(`
                SELECT mp.*, u.username, u.avatar, u.steamid
                FROM match_players mp
                JOIN users u ON mp.user_id = u.id
                WHERE mp.match_id = ?
                ORDER BY mp.team, mp.joined_at
            `, [match.id]);

            match.team1_players = players.filter(p => p.team === 'team1');
            match.team2_players = players.filter(p => p.team === 'team2');

            // Parse JSON fields
            match.maps_pool = JSON.parse(match.maps_pool || '[]');
            match.selected_maps = JSON.parse(match.selected_maps || '[]');
        }

        res.json(matches);
    } catch (error) {
        console.error('Get matches error:', error);
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
});

// Get specific match
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const [matches] = await db.execute(`
            SELECT m.*, u.username as created_by_name, u.avatar as created_by_avatar
            FROM matches m
            LEFT JOIN users u ON m.created_by = u.id
            WHERE m.id = ?
        `, [req.params.id]);

        if (matches.length === 0) {
            return res.status(404).json({ error: 'Match not found' });
        }

        const match = matches[0];

        // Get players
        const [players] = await db.execute(`
            SELECT mp.*, u.username, u.avatar, u.steamid
            FROM match_players mp
            JOIN users u ON mp.user_id = u.id
            WHERE mp.match_id = ?
            ORDER BY mp.team, mp.joined_at
        `, [match.id]);

        match.team1_players = players.filter(p => p.team === 'team1');
        match.team2_players = players.filter(p => p.team === 'team2');

        // Get veto history
        const [vetoHistory] = await db.execute(`
            SELECT * FROM map_veto
            WHERE match_id = ?
            ORDER BY order_index
        `, [match.id]);

        match.veto_history = vetoHistory;

        // Parse JSON fields
        match.maps_pool = JSON.parse(match.maps_pool || '[]');
        match.selected_maps = JSON.parse(match.selected_maps || '[]');

        res.json(match);
    } catch (error) {
        console.error('Get match error:', error);
        res.status(500).json({ error: 'Failed to fetch match' });
    }
});

// Create new match
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const {
            match_title,
            team1_name = 'Team Alpha',
            team2_name = 'Team Beta',
            maps_pool = ['de_dust2', 'de_mirage', 'de_inferno', 'de_cache', 'de_overpass', 'de_train', 'de_nuke'],
            server_ip,
            server_port,
            rcon_password
        } = req.body;

        // Validate required fields
        if (!match_title || !server_ip || !server_port || !rcon_password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const [result] = await db.execute(`
            INSERT INTO matches (match_title, team1_name, team2_name, maps_pool, server_ip, server_port, rcon_password, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [match_title, team1_name, team2_name, JSON.stringify(maps_pool), server_ip, server_port, rcon_password, req.user.id]);

        const matchId = result.insertId;

        // Get the created match
        const [newMatch] = await db.execute(`
            SELECT m.*, u.username as created_by_name, u.avatar as created_by_avatar
            FROM matches m
            LEFT JOIN users u ON m.created_by = u.id
            WHERE m.id = ?
        `, [matchId]);

        const match = newMatch[0];
        match.maps_pool = JSON.parse(match.maps_pool);
        match.team1_players = [];
        match.team2_players = [];

        // Emit to all connected clients
        req.app.get('io').emit('match_created', match);

        res.status(201).json(match);
    } catch (error) {
        console.error('Create match error:', error);
        res.status(500).json({ error: 'Failed to create match' });
    }
});

// Join team
router.post('/:id/join', verifyToken, async (req, res) => {
    try {
        const { team } = req.body; // 'team1' or 'team2'
        const matchId = req.params.id;

        if (!['team1', 'team2'].includes(team)) {
            return res.status(400).json({ error: 'Invalid team' });
        }

        // Check if match exists and is in waiting state
        const [matches] = await db.execute(
            'SELECT * FROM matches WHERE id = ? AND status = "waiting"',
            [matchId]
        );

        if (matches.length === 0) {
            return res.status(404).json({ error: 'Match not found or not accepting players' });
        }

        // Check if user is already in this match
        const [existingPlayers] = await db.execute(
            'SELECT * FROM match_players WHERE match_id = ? AND user_id = ?',
            [matchId, req.user.id]
        );

        if (existingPlayers.length > 0) {
            return res.status(400).json({ error: 'Already joined this match' });
        }

        // Check team capacity
        const [teamPlayers] = await db.execute(
            'SELECT COUNT(*) as count FROM match_players WHERE match_id = ? AND team = ?',
            [matchId, team]
        );

        if (teamPlayers[0].count >= 5) {
            return res.status(400).json({ error: 'Team is full' });
        }

        // Add player to team
        const isCaptain = teamPlayers[0].count === 0; // First player is captain

        await db.execute(`
            INSERT INTO match_players (match_id, user_id, team, is_captain, is_ready)
            VALUES (?, ?, ?, ?, ?)
        `, [matchId, req.user.id, team, isCaptain, false]);

        // Emit update to all clients
        const io = req.app.get('io');
        io.emit('player_joined', {
            matchId,
            user: req.user,
            team,
            isCaptain
        });

        res.json({ success: true, team, isCaptain });
    } catch (error) {
        console.error('Join team error:', error);
        res.status(500).json({ error: 'Failed to join team' });
    }
});

// Toggle ready status
router.post('/:id/ready', verifyToken, async (req, res) => {
    try {
        const matchId = req.params.id;

        // Get current player status
        const [players] = await db.execute(`
            SELECT * FROM match_players WHERE match_id = ? AND user_id = ?
        `, [matchId, req.user.id]);

        if (players.length === 0) {
            return res.status(404).json({ error: 'Not in this match' });
        }

        const player = players[0];
        const newReadyStatus = !player.is_ready;

        await db.execute(`
            UPDATE match_players SET is_ready = ? WHERE match_id = ? AND user_id = ?
        `, [newReadyStatus, matchId, req.user.id]);

        // Emit update
        const io = req.app.get('io');
        io.emit('player_ready_changed', {
            matchId,
            userId: req.user.id,
            isReady: newReadyStatus
        });

        res.json({ isReady: newReadyStatus });
    } catch (error) {
        console.error('Ready toggle error:', error);
        res.status(500).json({ error: 'Failed to toggle ready status' });
    }
});

// Start match (admin only)
router.post('/:id/start', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const matchId = req.params.id;

        // Verify match is ready to start
        const [matches] = await db.execute(`
            SELECT * FROM matches WHERE id = ? AND status = "waiting"
        `, [matchId]);

        if (matches.length === 0) {
            return res.status(404).json({ error: 'Match not found or cannot be started' });
        }

        // Check if we have 10 ready players
        const [readyCount] = await db.execute(`
            SELECT COUNT(*) as count FROM match_players 
            WHERE match_id = ? AND is_ready = 1
        `, [matchId]);

        const [totalCount] = await db.execute(`
            SELECT COUNT(*) as count FROM match_players WHERE match_id = ?
        `, [matchId]);

        if (totalCount[0].count < 10 || readyCount[0].count < 10) {
            return res.status(400).json({ error: 'Need 10 ready players to start match' });
        }

        // Update match status to veto
        await db.execute(`
            UPDATE matches SET status = "veto" WHERE id = ?
        `, [matchId]);

        // Emit update
        const io = req.app.get('io');
        io.emit('match_veto_started', { matchId });

        res.json({ success: true, status: 'veto' });
    } catch (error) {
        console.error('Start match error:', error);
        res.status(500).json({ error: 'Failed to start match' });
    }
});

module.exports = router;

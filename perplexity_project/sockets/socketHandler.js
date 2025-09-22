const jwt = require('jsonwebtoken');
const db = require('../config/database');

function socketHandler(io) {
    // Middleware to authenticate socket connections
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

            if (token) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const [users] = await db.execute(
                    'SELECT id, steamid, username, avatar, is_admin FROM users WHERE id = ?',
                    [decoded.userId]
                );

                if (users.length > 0) {
                    socket.user = users[0];
                }
            }
            next();
        } catch (error) {
            // Continue without authentication for public access
            next();
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.user ? socket.user.username : 'Anonymous'} (${socket.id})`);

        // Join match room
        socket.on('join_match', (matchId) => {
            socket.join(`match_${matchId}`);
            console.log(`User joined match room: match_${matchId}`);

            // Broadcast user joined to match room
            if (socket.user) {
                socket.to(`match_${matchId}`).emit('user_joined_room', {
                    user: socket.user,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Leave match room
        socket.on('leave_match', (matchId) => {
            socket.leave(`match_${matchId}`);
            console.log(`User left match room: match_${matchId}`);

            if (socket.user) {
                socket.to(`match_${matchId}`).emit('user_left_room', {
                    user: socket.user,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Handle chat messages
        socket.on('send_message', async (data) => {
            if (!socket.user) {
                socket.emit('error', { message: 'Authentication required for chat' });
                return;
            }

            try {
                const { matchId, message } = data;

                // Validate message
                if (!message || message.trim().length === 0 || message.length > 500) {
                    socket.emit('error', { message: 'Invalid message' });
                    return;
                }

                // Save message to database
                await db.execute(`
                    INSERT INTO chat_messages (match_id, user_id, username, message, message_type)
                    VALUES (?, ?, ?, ?, 'user')
                `, [matchId, socket.user.id, socket.user.username, message.trim()]);

                // Broadcast message to match room
                const messageData = {
                    id: Date.now(), // Simple ID for frontend
                    matchId,
                    user: socket.user,
                    message: message.trim(),
                    messageType: 'user',
                    timestamp: new Date().toISOString()
                };

                io.to(`match_${matchId}`).emit('new_message', messageData);
            } catch (error) {
                console.error('Chat message error:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // Handle map veto actions
        socket.on('veto_action', async (data) => {
            if (!socket.user) {
                socket.emit('error', { message: 'Authentication required' });
                return;
            }

            try {
                const { matchId, mapName, action } = data; // action: 'ban' or 'pick'

                // Verify user is team captain
                const [players] = await db.execute(`
                    SELECT mp.*, m.status FROM match_players mp
                    JOIN matches m ON mp.match_id = m.id
                    WHERE mp.match_id = ? AND mp.user_id = ? AND mp.is_captain = 1
                `, [matchId, socket.user.id]);

                if (players.length === 0) {
                    socket.emit('error', { message: 'Only team captains can perform veto actions' });
                    return;
                }

                const player = players[0];

                if (player.status !== 'veto') {
                    socket.emit('error', { message: 'Match is not in veto phase' });
                    return;
                }

                // Check if it's player's turn
                const [vetoCount] = await db.execute(`
                    SELECT COUNT(*) as count FROM map_veto WHERE match_id = ?
                `, [matchId]);

                const isTeam1Turn = vetoCount[0].count % 2 === 0;
                const playerTeam = player.team;

                if ((isTeam1Turn && playerTeam !== 'team1') || (!isTeam1Turn && playerTeam !== 'team2')) {
                    socket.emit('error', { message: 'Not your turn' });
                    return;
                }

                // Save veto action
                await db.execute(`
                    INSERT INTO map_veto (match_id, map_name, action, team, order_index)
                    VALUES (?, ?, ?, ?, ?)
                `, [matchId, mapName, action, playerTeam, vetoCount[0].count]);

                // Check if veto is complete
                const [match] = await db.execute('SELECT maps_pool FROM matches WHERE id = ?', [matchId]);
                const mapsPool = JSON.parse(match[0].maps_pool);

                const [bannedMaps] = await db.execute(`
                    SELECT map_name FROM map_veto WHERE match_id = ? AND action = 'ban'
                `, [matchId]);

                const bannedMapNames = bannedMaps.map(m => m.map_name);
                const remainingMaps = mapsPool.filter(map => !bannedMapNames.includes(map));

                // Broadcast veto action
                const vetoData = {
                    matchId,
                    mapName,
                    action,
                    team: playerTeam,
                    orderIndex: vetoCount[0].count,
                    remainingMaps,
                    nextTeam: isTeam1Turn ? 'team2' : 'team1'
                };

                io.to(`match_${matchId}`).emit('veto_action_performed', vetoData);

                // If only one map remains, finish veto
                if (remainingMaps.length === 1) {
                    await db.execute(`
                        UPDATE matches SET selected_maps = ?, status = 'ready' WHERE id = ?
                    `, [JSON.stringify(remainingMaps), matchId]);

                    io.to(`match_${matchId}`).emit('veto_complete', {
                        matchId,
                        selectedMap: remainingMaps[0]
                    });
                }

            } catch (error) {
                console.error('Veto action error:', error);
                socket.emit('error', { message: 'Failed to perform veto action' });
            }
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.user ? socket.user.username : 'Anonymous'} (${socket.id})`);
        });
    });

    // System message broadcaster
    const broadcastSystemMessage = async (matchId, message) => {
        try {
            await db.execute(`
                INSERT INTO chat_messages (match_id, username, message, message_type)
                VALUES (?, 'System', ?, 'system')
            `, [matchId, message]);

            io.to(`match_${matchId}`).emit('new_message', {
                id: Date.now(),
                matchId,
                username: 'System',
                message,
                messageType: 'system',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('System message error:', error);
        }
    };

    // Export for use in other modules
    io.broadcastSystemMessage = broadcastSystemMessage;
}

module.exports = socketHandler;

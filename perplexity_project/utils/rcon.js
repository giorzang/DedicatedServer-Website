const Rcon = require('rcon');
const fs = require('fs').promises;
const path = require('path');

class RconClient {
    constructor(host, port, password) {
        this.host = host;
        this.port = port;
        this.password = password;
        this.connection = null;
        this.connected = false;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.connection = new Rcon(this.host, this.port, this.password);

            this.connection.on('auth', () => {
                console.log(`✅ RCON connected to ${this.host}:${this.port}`);
                this.connected = true;
                resolve();
            });

            this.connection.on('response', (str) => {
                console.log('RCON Response:', str);
            });

            this.connection.on('error', (err) => {
                console.error('RCON Error:', err);
                this.connected = false;
                reject(err);
            });

            this.connection.on('end', () => {
                console.log('RCON connection ended');
                this.connected = false;
            });

            this.connection.connect();
        });
    }

    async execute(command) {
        if (!this.connected) {
            throw new Error('RCON not connected');
        }

        return new Promise((resolve, reject) => {
            this.connection.send(command, (response) => {
                resolve(response);
            });

            // Set timeout for commands
            setTimeout(() => {
                reject(new Error('RCON command timeout'));
            }, 10000);
        });
    }

    async loadMatchConfig(configUrl) {
        return this.execute(`matchzy_loadmatch_url "${configUrl}"`);
    }

    async restartGame() {
        return this.execute('mp_restartgame 1');
    }

    async pauseMatch() {
        return this.execute('mp_pause_match');
    }

    async unpauseMatch() {
        return this.execute('mp_unpause_match');
    }

    async changeMap(mapName) {
        return this.execute(`changelevel ${mapName}`);
    }

    async getServerStatus() {
        return this.execute('status');
    }

    async kickAll() {
        return this.execute('kickall');
    }

    disconnect() {
        if (this.connection) {
            this.connection.disconnect();
            this.connected = false;
        }
    }
}

// MatchZy Configuration Generator
class MatchConfigGenerator {
    static async generateConfig(matchData) {
        const config = {
            matchid: `match_${matchData.id}`,
            match_title: matchData.match_title,
            maplist: matchData.selected_maps || [],
            skip_veto: true, // We handle veto on web
            veto_first: "team1",
            side_type: "standard",

            team1: {
                name: matchData.team1_name,
                players: {}
            },

            team2: {
                name: matchData.team2_name,
                players: {}
            },

            cvars: {
                "mp_maxrounds": 24,
                "mp_overtime_enable": 1,
                "mp_overtime_maxrounds": 6,
                "mp_overtime_startmoney": 10000,
                "mp_freezetime": 15,
                "mp_buy_time": 20,
                "mp_round_restart_delay": 5,
                "sv_alltalk": 0,
                "sv_deadtalk": 1,
                "mp_teammates_are_enemies": 0
            }
        };

        // Add team1 players
        if (matchData.team1_players) {
            matchData.team1_players.forEach(player => {
                config.team1.players[player.steamid] = player.username;
            });
        }

        // Add team2 players
        if (matchData.team2_players) {
            matchData.team2_players.forEach(player => {
                config.team2.players[player.steamid] = player.username;
            });
        }

        return config;
    }

    static async saveConfig(config, matchId) {
        const configDir = path.join(__dirname, '..', 'configs');
        const filename = `match_${matchId}_${Date.now()}.json`;
        const filepath = path.join(configDir, filename);

        // Ensure configs directory exists
        try {
            await fs.mkdir(configDir, { recursive: true });
        } catch (err) {
            // Directory already exists
        }

        // Write config file
        await fs.writeFile(filepath, JSON.stringify(config, null, 2));

        // Return public URL
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        return `${baseUrl}/configs/${filename}`;
    }
}

module.exports = {
    RconClient,
    MatchConfigGenerator
};

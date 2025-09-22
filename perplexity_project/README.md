# CS2 PUG System - League of Legends Style

Hệ thống PUG (Pick Up Game) cho Counter-Strike 2 với giao diện kiểu League of Legends, tích hợp MatchZy plugin.

![CS2 PUG System](https://img.shields.io/badge/CS2-PUG%20System-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## Tính năng chính

### 🎮 **Giao diện League of Legends Style**
- Dark theme với gold accents
- Hexagonal design patterns
- Team layout Blue vs Red
- Smooth animations và transitions

### 🔐 **Steam Authentication**
- Steam OpenID 2.0 integration
- Automatic profile sync
- Admin role management
- Session management

### ⚔️ **Match Management**
- 5v5 team formation
- Real-time player joining
- Ready check system
- Team captain designation

### 🗺️ **Map Ban/Pick System**
- Interactive map veto interface
- Alternating team turns
- Visual ban/pick history
- Automatic final map selection

### 🔧 **MatchZy Integration**
- Automatic config generation
- RCON server communication
- Real-time server control
- Auto-connect functionality

### 💬 **Real-time Features**
- WebSocket integration
- Live chat system
- Instant match updates
- Player status sync

## Tech Stack

### Backend
- **Node.js** + Express.js
- **Socket.io** for real-time communication
- **MySQL** database
- **JWT** authentication
- **RCON** integration

### Frontend
- **Vanilla JavaScript** (ES6+)
- **CSS Grid/Flexbox** layout
- **Socket.io Client**
- **Font Awesome** icons

### Infrastructure
- **Docker** support
- **Nginx** reverse proxy
- **Steam Web API**
- **MatchZy CS2 Plugin**

## Yêu cầu hệ thống

### Server Requirements
- Node.js 18+
- MySQL 8.0+
- CS2 Dedicated Server
- MatchZy Plugin installed

### Steam API
- Steam Web API Key
- Public domain for Steam OpenID

## Cài đặt

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/cs2-pug-system.git
cd cs2-pug-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup
```bash
# Create MySQL database
mysql -u root -p < database.sql

# Or import via phpMyAdmin/MySQL Workbench
```

### 4. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 5. Environment Variables
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cs2_pug_system
DB_USER=your_db_user
DB_PASS=your_db_password

# Steam API
STEAM_API_KEY=your_steam_api_key
STEAM_RETURN_URL=http://yourdomain.com/auth/steam/return

# Server
PORT=3000
NODE_ENV=production
JWT_SECRET=your_jwt_secret_key
SESSION_SECRET=your_session_secret

# CS2 Server
DEFAULT_SERVER_IP=your_cs2_server_ip
DEFAULT_SERVER_PORT=27015
DEFAULT_RCON_PASSWORD=your_rcon_password

# URLs
BASE_URL=http://yourdomain.com
FRONTEND_URL=http://yourdomain.com
```

### 6. Run Application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Steam API Setup

### 1. Get Steam Web API Key
1. Visit [Steam Web API Key](https://steamcommunity.com/dev/apikey)
2. Register your domain name
3. Copy the generated API key

### 2. Configure Steam OpenID
- Set `STEAM_RETURN_URL` to `http://yourdomain.com/auth/steam/return`
- Ensure your domain is publicly accessible
- SSL certificate recommended for production

## CS2 Server Setup

### 1. Install MatchZy Plugin
```bash
# Download MatchZy from GitHub
# Extract to csgo/addons/counterstrikesharp/plugins/

# Required plugins:
- MetaMod Source
- CounterStrikeSharp
- MatchZy
```

### 2. MatchZy Configuration
```json
// csgo/cfg/MatchZy/config.json
{
  "DatabaseType": "MySQL",
  "MySqlHost": "your_mysql_host",
  "MySqlDatabase": "cs2_pug_system", 
  "MySqlUsername": "your_db_user",
  "MySqlPassword": "your_db_password",
  "MySqlPort": 3306
}
```

### 3. Server CVars
```cfg
// csgo/cfg/server.cfg
rcon_password "your_rcon_password"
sv_password ""
sv_cheats 0
mp_autoteambalance 0
mp_limitteams 0
mp_solid_teammates 1
```

## Deployment

### Docker Deployment
```bash
# Build image
docker build -t cs2-pug-system .

# Run with docker-compose
docker-compose up -d
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## API Documentation

### Authentication Endpoints
```
GET  /api/auth/steam          # Initiate Steam login
GET  /api/auth/steam/return   # Steam callback
GET  /api/auth/me            # Get current user
POST /api/auth/logout        # Logout
```

### Match Endpoints
```
GET  /api/matches            # Get all matches
GET  /api/matches/:id        # Get specific match
POST /api/matches            # Create match (admin)
POST /api/matches/:id/join   # Join team
POST /api/matches/:id/ready  # Toggle ready status
POST /api/matches/:id/start  # Start match (admin)
```

### WebSocket Events
```javascript
// Client to Server
socket.emit('join_match', matchId)
socket.emit('send_message', {matchId, message})
socket.emit('veto_action', {matchId, mapName, action})

// Server to Client  
socket.on('match_created', matchData)
socket.on('player_joined', playerData)
socket.on('new_message', messageData)
socket.on('veto_action_performed', vetoData)
```

## Folder Structure

```
cs2-pug-system/
├── config/
│   └── database.js
├── middleware/
│   └── auth.js
├── routes/
│   ├── auth.js
│   ├── matches.js
│   ├── users.js
│   └── chat.js
├── sockets/
│   └── socketHandler.js
├── utils/
│   └── rcon.js
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── configs/           # Generated match configs
├── database.sql
├── package.json
├── server.js
└── .env.example
```

## Tính năng nâng cao

### Admin Features
- Create/manage matches
- Start veto phase
- Server RCON control
- User management

### Player Features  
- Steam profile integration
- Team selection
- Ready status toggle
- Real-time chat
- Match history

### Match Flow
1. **Waiting** - Players join teams (5v5)
2. **Veto** - Team captains ban/pick maps
3. **Ready** - Final confirmation & server setup
4. **Live** - Match config sent to MatchZy
5. **Finished** - Statistics & results

## Troubleshooting

### Common Issues

**Steam Authentication Failed**
- Check Steam API key validity
- Verify return URL configuration
- Ensure domain is publicly accessible

**Database Connection Error**
- Verify MySQL credentials
- Check database exists and accessible
- Confirm MySQL service running

**RCON Connection Failed**
- Verify server IP and port
- Check RCON password
- Ensure server is running CS2

**WebSocket Issues**
- Check firewall settings
- Verify Socket.io compatibility
- Check browser console for errors

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev

# Check specific components
DEBUG=socket.io* npm run dev
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Support

- Create issue on GitHub
- Discord: [Your Discord Server]
- Email: support@yourproject.com

## Changelog

### v1.0.0
- Initial release
- Steam authentication
- Match management
- Map veto system
- MatchZy integration
- Real-time features

---

**Made with ❤️ for the CS2 Community**

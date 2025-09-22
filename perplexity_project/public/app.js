// CS2 PUG System - Frontend JavaScript
class CS2PUGSystem {
    constructor() {
        this.currentUser = null;
        this.currentMatch = null;
        this.socket = null;
        this.matches = [];
        this.currentView = 'auth';

        this.init();
    }

    async init() {
        this.showLoading();

        // Check for existing authentication
        await this.checkAuthStatus();

        // Initialize Socket.IO if authenticated
        if (this.currentUser) {
            this.initializeSocket();
            this.showView('lobby');
            await this.loadMatches();
        } else {
            this.showView('auth');
        }

        this.hideLoading();
        this.bindEvents();
    }

    async checkAuthStatus() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            const userParam = urlParams.get('user');

            if (token && userParam) {
                // From Steam authentication
                this.currentUser = JSON.parse(decodeURIComponent(userParam));
                localStorage.setItem('authToken', token);

                // Clean URL
                window.history.replaceState({}, document.title, '/');
            } else {
                // Check for existing token
                const savedToken = localStorage.getItem('authToken');
                if (savedToken) {
                    const response = await fetch('/api/auth/me', {
                        headers: { 'Authorization': `Bearer ${savedToken}` }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        this.currentUser = data.user;
                    } else {
                        localStorage.removeItem('authToken');
                    }
                }
            }
        } catch (error) {
            console.error('Auth check error:', error);
        }
    }

    initializeSocket() {
        const token = localStorage.getItem('authToken');
        this.socket = io({
            auth: { token }
        });

        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        // Match events
        this.socket.on('match_created', (match) => {
            this.matches.unshift(match);
            this.renderMatches();
        });

        this.socket.on('player_joined', (data) => {
            if (this.currentMatch && this.currentMatch.id == data.matchId) {
                this.refreshCurrentMatch();
            }
        });

        this.socket.on('player_ready_changed', (data) => {
            if (this.currentMatch && this.currentMatch.id == data.matchId) {
                this.refreshCurrentMatch();
            }
        });

        this.socket.on('match_veto_started', (data) => {
            if (this.currentMatch && this.currentMatch.id == data.matchId) {
                this.showView('veto');
            }
        });

        // Chat events
        this.socket.on('new_message', (message) => {
            this.addChatMessage(message);
        });

        // Veto events
        this.socket.on('veto_action_performed', (data) => {
            this.updateVetoUI(data);
        });

        this.socket.on('veto_complete', (data) => {
            this.currentMatch.selected_maps = [data.selectedMap];
            this.showView('ready');
        });

        this.socket.on('error', (error) => {
            this.showNotification(error.message, 'error');
        });
    }

    bindEvents() {
        // Steam login
        document.getElementById('steam-login-btn').addEventListener('click', () => {
            window.location.href = '/api/auth/steam';
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', async () => {
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
                localStorage.removeItem('authToken');
                this.currentUser = null;
                this.socket?.disconnect();
                this.showView('auth');
            } catch (error) {
                console.error('Logout error:', error);
            }
        });

        // Create match (admin only)
        const createMatchBtn = document.getElementById('create-match-btn');
        if (createMatchBtn) {
            createMatchBtn.addEventListener('click', () => {
                this.showCreateMatchModal();
            });
        }

        // Join team buttons
        document.getElementById('join-team1-btn').addEventListener('click', () => {
            this.joinTeam('team1');
        });

        document.getElementById('join-team2-btn').addEventListener('click', () => {
            this.joinTeam('team2');
        });

        // Ready button
        document.getElementById('ready-btn').addEventListener('click', () => {
            this.toggleReady();
        });

        // Start match button (admin only)
        const startMatchBtn = document.getElementById('start-match-btn');
        if (startMatchBtn) {
            startMatchBtn.addEventListener('click', () => {
                this.startMatch();
            });
        }

        // Chat
        document.getElementById('send-message-btn').addEventListener('click', () => {
            this.sendMessage();
        });

        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Create match modal
        this.bindModalEvents();
    }

    bindModalEvents() {
        const modal = document.getElementById('create-match-modal');
        const closeBtn = document.getElementById('modal-close-btn');
        const cancelBtn = document.getElementById('cancel-create-btn');
        const form = document.getElementById('create-match-form');

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createMatch();
            modal.style.display = 'none';
        });

        // Close modal on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    async loadMatches() {
        try {
            const response = await fetch('/api/matches');
            if (response.ok) {
                this.matches = await response.json();
                this.renderMatches();
                this.updateUserProfile();
            }
        } catch (error) {
            console.error('Load matches error:', error);
        }
    }

    renderMatches() {
        const matchesList = document.getElementById('matches-list');

        if (this.matches.length === 0) {
            matchesList.innerHTML = '<p class="empty-matches">Chưa có trận đấu nào</p>';
            return;
        }

        matchesList.innerHTML = this.matches.map(match => `
            <div class="match-item" data-match-id="${match.id}">
                <div class="match-item-header">
                    <div class="match-title">${match.match_title}</div>
                    <div class="match-status ${match.status}">${this.getStatusText(match.status)}</div>
                </div>
                <div class="match-players-count">
                    <i class="fas fa-users"></i> ${match.player_count}/10
                    (${match.ready_count} ready)
                </div>
                <div class="match-server">
                    <i class="fas fa-server"></i> ${match.server_ip}:${match.server_port}
                </div>
            </div>
        `).join('');

        // Add click events to match items
        document.querySelectorAll('.match-item').forEach(item => {
            item.addEventListener('click', () => {
                const matchId = item.dataset.matchId;
                this.selectMatch(matchId);
            });
        });
    }

    async selectMatch(matchId) {
        try {
            const response = await fetch(`/api/matches/${matchId}`);
            if (response.ok) {
                this.currentMatch = await response.json();
                this.renderCurrentMatch();

                // Join match room for real-time updates
                this.socket.emit('join_match', matchId);

                // Update active match in list
                document.querySelectorAll('.match-item').forEach(item => {
                    item.classList.toggle('active', item.dataset.matchId === matchId);
                });
            }
        } catch (error) {
            console.error('Select match error:', error);
        }
    }

    renderCurrentMatch() {
        if (!this.currentMatch) return;

        // Update match info in header
        document.getElementById('match-title').textContent = this.currentMatch.match_title;
        document.getElementById('server-address').textContent = 
            `Server: ${this.currentMatch.server_ip}:${this.currentMatch.server_port}`;
        document.getElementById('match-status').textContent = 
            `Status: ${this.getStatusText(this.currentMatch.status)}`;

        // Update team names
        document.getElementById('team1-name').textContent = this.currentMatch.team1_name;
        document.getElementById('team2-name').textContent = this.currentMatch.team2_name;

        // Render teams
        this.renderTeam('team1', this.currentMatch.team1_players);
        this.renderTeam('team2', this.currentMatch.team2_players);

        // Update ready count
        const totalReady = (this.currentMatch.team1_players || []).filter(p => p.is_ready).length +
                           (this.currentMatch.team2_players || []).filter(p => p.is_ready).length;
        const totalPlayers = (this.currentMatch.team1_players || []).length +
                            (this.currentMatch.team2_players || []).length;

        document.getElementById('ready-count').textContent = `${totalReady}/${totalPlayers}`;

        // Update join buttons
        this.updateJoinButtons();
        this.updateReadyButton();
        this.updateStartButton();
    }

    renderTeam(teamId, players) {
        const teamContainer = document.getElementById(`${teamId}-players`);
        teamContainer.innerHTML = '';

        // Create 5 slots
        for (let i = 0; i < 5; i++) {
            const player = players[i];
            const slotDiv = document.createElement('div');
            slotDiv.className = 'player-slot';

            if (player) {
                slotDiv.classList.add('filled');
                if (player.is_captain) {
                    slotDiv.classList.add('captain');
                }

                slotDiv.innerHTML = `
                    <img src="${player.avatar}" alt="${player.username}" class="player-avatar">
                    <div class="player-info">
                        <div class="player-name">${player.username}</div>
                        <div class="player-role">
                            ${player.is_captain ? '<i class="fas fa-crown captain-crown"></i> Captain' : 'Player'}
                        </div>
                    </div>
                    <div class="player-status">
                        <div class="ready-indicator ${player.is_ready ? 'ready' : ''}"></div>
                    </div>
                `;
            } else {
                slotDiv.innerHTML = '<div class="empty-slot">Trống</div>';
            }

            teamContainer.appendChild(slotDiv);
        }
    }

    updateJoinButtons() {
        const team1Btn = document.getElementById('join-team1-btn');
        const team2Btn = document.getElementById('join-team2-btn');

        if (!this.currentMatch) {
            team1Btn.style.display = 'none';
            team2Btn.style.display = 'none';
            return;
        }

        const team1Count = (this.currentMatch.team1_players || []).length;
        const team2Count = (this.currentMatch.team2_players || []).length;
        const isInMatch = this.isPlayerInMatch();

        team1Btn.style.display = team1Count < 5 && !isInMatch && this.currentMatch.status === 'waiting' ? 'flex' : 'none';
        team2Btn.style.display = team2Count < 5 && !isInMatch && this.currentMatch.status === 'waiting' ? 'flex' : 'none';
    }

    updateReadyButton() {
        const readyBtn = document.getElementById('ready-btn');

        if (!this.currentMatch || !this.isPlayerInMatch()) {
            readyBtn.disabled = true;
            readyBtn.innerHTML = '<i class="fas fa-check"></i><span>Sẵn sàng</span>';
            return;
        }

        const playerData = this.getPlayerData();
        if (playerData) {
            readyBtn.disabled = false;
            readyBtn.classList.toggle('ready', playerData.is_ready);
            readyBtn.innerHTML = playerData.is_ready 
                ? '<i class="fas fa-times"></i><span>Hủy sẵn sàng</span>'
                : '<i class="fas fa-check"></i><span>Sẵn sàng</span>';
        }
    }

    updateStartButton() {
        const startBtn = document.getElementById('start-match-btn');

        if (!this.currentUser?.is_admin) {
            startBtn.style.display = 'none';
            return;
        }

        if (!this.currentMatch || this.currentMatch.status !== 'waiting') {
            startBtn.style.display = 'none';
            return;
        }

        const totalPlayers = (this.currentMatch.team1_players || []).length + 
                            (this.currentMatch.team2_players || []).length;
        const totalReady = (this.currentMatch.team1_players || []).filter(p => p.is_ready).length +
                          (this.currentMatch.team2_players || []).filter(p => p.is_ready).length;

        if (totalPlayers === 10 && totalReady === 10) {
            startBtn.style.display = 'flex';
        } else {
            startBtn.style.display = 'none';
        }
    }

    async joinTeam(team) {
        if (!this.currentMatch) return;

        try {
            const response = await fetch(`/api/matches/${this.currentMatch.id}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ team })
            });

            if (response.ok) {
                const data = await response.json();
                this.showNotification(`Đã tham gia ${team === 'team1' ? 'Team Alpha' : 'Team Beta'}!`, 'success');
                await this.refreshCurrentMatch();
            } else {
                const error = await response.json();
                this.showNotification(error.error, 'error');
            }
        } catch (error) {
            console.error('Join team error:', error);
            this.showNotification('Lỗi khi tham gia team', 'error');
        }
    }

    async toggleReady() {
        if (!this.currentMatch) return;

        try {
            const response = await fetch(`/api/matches/${this.currentMatch.id}/ready`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.showNotification(data.isReady ? 'Đã sẵn sàng!' : 'Đã hủy sẵn sàng', 'info');
                await this.refreshCurrentMatch();
            } else {
                const error = await response.json();
                this.showNotification(error.error, 'error');
            }
        } catch (error) {
            console.error('Toggle ready error:', error);
            this.showNotification('Lỗi khi thay đổi trạng thái', 'error');
        }
    }

    async startMatch() {
        if (!this.currentMatch || !this.currentUser?.is_admin) return;

        try {
            const response = await fetch(`/api/matches/${this.currentMatch.id}/start`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok) {
                this.showNotification('Đã bắt đầu giai đoạn veto!', 'success');
            } else {
                const error = await response.json();
                this.showNotification(error.error, 'error');
            }
        } catch (error) {
            console.error('Start match error:', error);
            this.showNotification('Lỗi khi bắt đầu trận đấu', 'error');
        }
    }

    sendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();

        if (!message || !this.currentMatch) return;

        this.socket.emit('send_message', {
            matchId: this.currentMatch.id,
            message
        });

        input.value = '';
    }

    addChatMessage(message) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${message.messageType === 'system' ? 'message-system' : ''}`;

        const timestamp = new Date(message.timestamp).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-username">${message.username || message.user?.username}</span>
                <span class="message-timestamp">${timestamp}</span>
            </div>
            <div class="message-text">${message.message}</div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Utility methods
    isPlayerInMatch() {
        if (!this.currentMatch || !this.currentUser) return false;

        const allPlayers = [...(this.currentMatch.team1_players || []), ...(this.currentMatch.team2_players || [])];
        return allPlayers.some(p => p.steamid === this.currentUser.steamid);
    }

    getPlayerData() {
        if (!this.currentMatch || !this.currentUser) return null;

        const allPlayers = [...(this.currentMatch.team1_players || []), ...(this.currentMatch.team2_players || [])];
        return allPlayers.find(p => p.steamid === this.currentUser.steamid);
    }

    async refreshCurrentMatch() {
        if (this.currentMatch) {
            await this.selectMatch(this.currentMatch.id);
        }
    }

    updateUserProfile() {
        if (this.currentUser) {
            document.getElementById('user-avatar').src = this.currentUser.avatar;
            document.getElementById('user-name').textContent = this.currentUser.username;
            document.getElementById('user-role').textContent = this.currentUser.is_admin ? 'Admin' : 'Player';

            // Show create match button for admins
            const createBtn = document.getElementById('create-match-btn');
            if (createBtn && this.currentUser.is_admin) {
                createBtn.style.display = 'flex';
            }
        }
    }

    getStatusText(status) {
        const statusMap = {
            'waiting': 'Chờ',
            'veto': 'Veto',
            'ready': 'Sẵn sàng',
            'live': 'Đang đấu',
            'finished': 'Kết thúc'
        };
        return statusMap[status] || status;
    }

    showView(viewName) {
        document.querySelectorAll('.view-container').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(`${viewName}-view`).classList.add('active');
        this.currentView = viewName;
    }

    showLoading() {
        document.getElementById('loading-spinner').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading-spinner').style.display = 'none';
    }

    showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 2rem',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '600',
            zIndex: '10000',
            minWidth: '300px',
            background: type === 'error' ? '#EF4444' : type === 'success' ? '#10B981' : '#3B82F6'
        });

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);

        // Click to remove
        notification.addEventListener('click', () => {
            notification.remove();
        });
    }

    showCreateMatchModal() {
        document.getElementById('create-match-modal').style.display = 'flex';
    }

    async createMatch() {
        const formData = new FormData(document.getElementById('create-match-form'));
        const matchData = {
            match_title: formData.get('match-title-input') || formData.get('match-title'),
            team1_name: formData.get('team1-name-input') || formData.get('team1-name') || 'Team Alpha',
            team2_name: formData.get('team2-name-input') || formData.get('team2-name') || 'Team Beta',
            server_ip: formData.get('server-ip-input') || formData.get('server-ip'),
            server_port: parseInt(formData.get('server-port-input') || formData.get('server-port')),
            rcon_password: formData.get('rcon-password-input') || formData.get('rcon-password')
        };

        try {
            const response = await fetch('/api/matches', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(matchData)
            });

            if (response.ok) {
                const newMatch = await response.json();
                this.showNotification('Tạo trận đấu thành công!', 'success');
                await this.loadMatches();
            } else {
                const error = await response.json();
                this.showNotification(error.error, 'error');
            }
        } catch (error) {
            console.error('Create match error:', error);
            this.showNotification('Lỗi khi tạo trận đấu', 'error');
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CS2PUGSystem();
});

-- CS2 PUG System Database Schema

CREATE DATABASE IF NOT EXISTS cs2_pug_system;
USE cs2_pug_system;

-- Users table (Steam authentication)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    steamid VARCHAR(20) UNIQUE NOT NULL,
    username VARCHAR(50) NOT NULL,
    avatar TEXT,
    profile_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_steamid (steamid),
    INDEX idx_username (username)
);

-- Matches table
CREATE TABLE matches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    match_title VARCHAR(100) NOT NULL,
    status ENUM('waiting', 'veto', 'ready', 'live', 'finished') DEFAULT 'waiting',
    created_by INT NOT NULL,
    team1_name VARCHAR(50) DEFAULT 'Team Alpha',
    team2_name VARCHAR(50) DEFAULT 'Team Beta',
    maps_pool JSON,
    selected_maps JSON,
    server_ip VARCHAR(15),
    server_port INT,
    rcon_password VARCHAR(255),
    match_config_url TEXT,
    winner ENUM('team1', 'team2', 'draw') NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    finished_at TIMESTAMP NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_created_by (created_by),
    INDEX idx_created_at (created_at)
);

-- Match players table
CREATE TABLE match_players (
    id INT PRIMARY KEY AUTO_INCREMENT,
    match_id INT NOT NULL,
    user_id INT NOT NULL,
    team ENUM('team1', 'team2') NOT NULL,
    is_captain BOOLEAN DEFAULT FALSE,
    is_ready BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_match (match_id, user_id),
    INDEX idx_match_id (match_id),
    INDEX idx_user_id (user_id),
    INDEX idx_team (team)
);

-- Map veto table
CREATE TABLE map_veto (
    id INT PRIMARY KEY AUTO_INCREMENT,
    match_id INT NOT NULL,
    map_name VARCHAR(20) NOT NULL,
    action ENUM('ban', 'pick', 'remaining') NOT NULL,
    team ENUM('team1', 'team2') NOT NULL,
    order_index INT NOT NULL,
    selected_side ENUM('ct', 't') NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    INDEX idx_match_id (match_id),
    INDEX idx_order_index (order_index)
);

-- Chat messages table
CREATE TABLE chat_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    match_id INT NOT NULL,
    user_id INT NULL,
    username VARCHAR(50),
    message TEXT NOT NULL,
    message_type ENUM('user', 'system', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_match_id (match_id),
    INDEX idx_created_at (created_at)
);

-- Servers table (multiple servers support)
CREATE TABLE servers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    ip VARCHAR(15) NOT NULL,
    port INT NOT NULL,
    rcon_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    max_players INT DEFAULT 10,
    current_match_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (current_match_id) REFERENCES matches(id) ON DELETE SET NULL,
    INDEX idx_is_active (is_active),
    INDEX idx_current_match (current_match_id)
);

-- Statistics table (for future use)
CREATE TABLE match_statistics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    match_id INT NOT NULL,
    user_id INT NOT NULL,
    kills INT DEFAULT 0,
    deaths INT DEFAULT 0,
    assists INT DEFAULT 0,
    mvps INT DEFAULT 0,
    headshots INT DEFAULT 0,
    damage INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_match_id (match_id),
    INDEX idx_user_id (user_id)
);

-- Insert default admin user (you'll need to update steamid)
INSERT INTO users (steamid, username, avatar, is_admin) VALUES 
('76561198000000000', 'Admin', 'https://avatars.steamstatic.com/b5bd56c1aa4644a474a2e4972be27ef9e82e517e_full.jpg', TRUE);

-- Insert default server
INSERT INTO servers (name, ip, port, rcon_password) VALUES 
('CS2 PUG Server #1', '192.168.1.100', 27015, 'your_rcon_password');

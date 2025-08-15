-- Users
CREATE TABLE users (
  steamid64 BIGINT UNSIGNED PRIMARY KEY, -- steam64
  profile_name VARCHAR(20) NOT NULL,
  real_name VARCHAR(100),
  email VARCHAR(255),
  avatar TEXT,
  is_admin TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (profile_name REGEXP '^[A-Za-z0-9._]{3,20}$')
);

-- Teams
CREATE TABLE teams (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  teamname VARCHAR(100) NOT NULL,
  captain_id BIGINT UNSIGNED,
  FOREIGN KEY (captain_id) REFERENCES users(steamid64) ON DELETE SET NULL
);

-- Players (mối quan hệ user -> team)
CREATE TABLE players (
  user_id BIGINT UNSIGNED NOT NULL,
  team_id BIGINT UNSIGNED NOT NULL,
  is_ready TINYINT(1) NOT NULL DEFAULT 0,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (user_id, team_id),
  FOREIGN KEY (user_id) REFERENCES users(steamid64) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Matches
CREATE TABLE matches (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  created_by BIGINT UNSIGNED,
  match_name VARCHAR(150) NOT NULL,
  bo_mode ENUM('bo1','bo3','bo5') NOT NULL DEFAULT 'bo1',
  match_status ENUM('waiting','in_progress','finished') NOT NULL DEFAULT 'waiting',
  winner_team_id BIGINT UNSIGNED DEFAULT NULL,
  passwd VARCHAR(255) DEFAULT NULL, -- NULL = public; if set, store hashed or plain per bạn
  descri TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(steamid64) ON DELETE SET NULL,
  FOREIGN KEY (winner_team_id) REFERENCES teams(id) ON DELETE SET NULL
);

-- Maps (ban/pick history)
CREATE TABLE maps (
  match_id BIGINT UNSIGNED NOT NULL,
  map_name VARCHAR(100) NOT NULL,
  action_type ENUM('ban','pick','decider') NOT NULL, -- decider = map decided by random knife
  team_action ENUM('team1','team2') DEFAULT NULL,
  side_team ENUM('ct','t') DEFAULT NULL,
  action_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (match_id, map_name),
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);


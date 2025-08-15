-- Table: Users
INSERT INTO users (profile_name, steamid64, avatar, is_admin)
VALUES ('giORZang', 76561199878243134, 'https://avatars.fastly.steamstatic.com/d3a9bc171b2098145a65ccb09cdac5b8f169c2c3_full.jpg', 1);
INSERT INTO users (profile_name, steamid64, avatar)
VALUES 
('User2', 76561199311300905, 'https://avatars.fastly.steamstatic.com/1e5809bb95984eaf130646d7bd208bc9e9023b47_full.jpg'),
('User3', 76561199111194006, 'https://cdn.akamai.steamstatic.com/steamcommunity/public/images/items/2022180/e081bb44f8c79e9b5ae44d1be71aae559d7fcf88.gif'),
('User4', 76561199498765155, 'https://avatars.fastly.steamstatic.com/99dd11addee336535ee7e4f52702c4bf77977850_full.jpg'),
('User5', 76561198413082506, 'https://avatars.fastly.steamstatic.com/15d40cd87f4fdc9f34d3ba5525efa24ffc61afea_full.jpg'),
('User6', 76561199116875924, 'https://avatars.fastly.steamstatic.com/6adf9c780571e1eb6e8c540084160c2c49f088bf_full.jpg'),
('User7', 76561199844655885, 'https://avatars.fastly.steamstatic.com/2ace564a8a9a407f7f98eaca3905d9a17eb834e8_full.jpg'),
('User8', 76561198807995176, 'https://avatars.fastly.steamstatic.com/8daab040cfde9336ebfc07dce146cd1b2df29782_full.jpg'),
('User9', 76561199038292260, 'https://avatars.fastly.steamstatic.com/e1cfab2796d7d000d261d59df194b81617556b47_full.jpg'),
('User10', 76561198892995679, 'https://avatars.fastly.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'),
('User11', 76561199286596151, 'https://avatars.fastly.steamstatic.com/3fc0a3e1b6cbeaf4b38c44edba4a7f5cafb5611a_full.jpg');

-- Table: Teams
INSERT INTO teams (teamname, captain_id)
VALUES 
('team_giORZang', 76561199878243134),
('team_YangXiao', 76561199311300905),
('team_YangXiao', 76561199311300905),
('team_giORZang', 76561199878243134);


-- Table: Players
INSERT INTO players (user_id, team_id, is_ready)
VALUES
(76561199878243134, 1, 1),
(76561199111194006, 1, 1),
(76561198413082506, 1, 1),
(76561199844655885, 1, 1),
(76561199038292260, 1, 1),
(76561199311300905, 2, 1),
(76561199498765155, 2, 1),
(76561199116875924, 2, 1),
(76561198807995176, 2, 1),
(76561198892995679, 2, 1),
(76561199878243134, 4, 1),
(76561199111194006, 4, 0),
(76561198413082506, 4, 1),
(76561199844655885, 4, 0),
(76561199311300905, 3, 0),
(76561199498765155, 3, 1),
(76561199116875924, 3, 0);


-- Table: Matches
INSERT INTO matches (created_by, match_name, bo_mode, match_status, winner_team_id, created_at)
VALUES (76561199878243134, 'AoLang1', 'bo3', 'finished', 1, '2025-08-08 19:30:00');
INSERT INTO matches (created_by, match_name, bo_mode, match_status, winner_team_id)
VALUES (76561199311300905, 'AoLang2', 'bo1', 'waiting', NULL);


-- Table: Maps
INSERT INTO maps (match_id, map_name, action_type, team_action, side_team, action_time)
VALUES 
('1', 'de_overpass', 'ban', 'team1', NULL, '2025-08-08 19:30:01'),
('1', 'de_train', 'ban', 'team2', NULL, '2025-08-08 19:30:02'),
('1', 'de_dust2', 'pick', 'team1', 'ct', '2025-08-08 19:30:03'),
('1', 'de_mirage', 'pick', 'team2', 't', '2025-08-08 19:30:04'),
('1', 'de_inferno', 'ban', 'team1', NULL, '2025-08-08 19:30:05'),
('1', 'de_ancient', 'ban', 'team2', NULL, '2025-08-08 19:30:06'),
('1', 'de_nuke', 'pick', NULL, NULL, '2025-08-08 19:30:07');

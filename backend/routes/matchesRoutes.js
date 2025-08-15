const express = require("express");
const pool = require("../configs/db");
const { ensureAuthenticated } = require("../middleware/auth");
const { use } = require("passport");

const router = express.Router();

/*
GET /api/matches
Trang matches hiện thị danh sách match và một vài thông tin trong từng match
*/
router.get("/", async (req, res) => {
    const [rows] = await pool.query(`
        SELECT 
            m.id, m.match_name, m.bo_mode, m.match_status,
            t1.id AS team1_id, t1.teamname AS team1_name,
            t2.id AS team2_id, t2.teamname AS team2_name,
            (SELECT COUNT(*) FROM players p WHERE p.team_id = t1.id) AS team1_count,
            (SELECT COUNT(*) FROM players p WHERE p.team_id = t2.id) AS team2_count
        FROM matches m
        LEFT JOIN teams t1 ON t1.id = 2 * m.id - 1
        LEFT JOIN teams t2 ON t2.id = 2 * m.id
        ORDER BY m.id DESC
    `);
    res.json(rows);
})

/*
POST /api/matches
Body: { matches_name, bo_mode }
Chi admin duoc tao match
matches.id = i => team1.id = 2*i-1, team2.id = 2*i
*/
router.post("/", ensureAuthenticated, async (req, res) => {
    if (!req.user?.is_admin) return res.status(403).json({ error: "Chỉ admin được tạo match" });
    
    const { match_name, bo_mode = "bo1" } = req.body || {};
    if (!match_name) return res.status(400).json({ error: "Thiếu match_name" });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Tao match moi
        const [matchRes] = await conn.query(
            `INSERT INTO matches(match_name, bo_mode, match_status) VALUES (?, ?, 'waiting)`,
            [match_name, bo_mode]
        );
        const matchId = matchRes.insertId;

        // Tao team1, team2 voi id 2*i-1, 2*i
        const team1Id = 2 * matchId - 1;
        const team2Id = 2* matchId;

        await conn.query(
            `INSERT INTO teams (id, teamname, captain_id) VALUES (?, ?, NULL)`,
            [team1Id, "team_1"]
        );
        await conn.query(
            `INSERT INTO teams (id, teamname, captain_id) VALUES (?, ?, NULL)`,
            [team2Id, "team_2"]
        );

        await conn.commit();

        res.status(201).json({
            id: matchId,
            match_name,
            bo_mode,
            match_status: "waiting",
            team1_id: team1Id,
            team2_id: team2Id
        });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ error: "Tạo match thất bại", detail: err.sqlMessage || err.message });
    } finally {
        conn.release();
    }
});

/*
POST /api/matches/:id/join
Body: { team: "team1 | team2" }
match_status phai la waiting
team_count != 5
*/
router.post("/:id/join", ensureAuthenticated, async (req, res) => {
    const matchId = Number(req.params.id);
    const { team } = req.body || {};
    if (!["team1", "team2"].includes(team)) return res.status(400).json({ error: "Sai team" });

    const [[match]] = await pool.query(`SELECT * FROM matches WHERE id = ?`, [matchId]);
    if (!match) return res.status(404).json({ error: "Match không tồn tại" });
    if (match.match_status !== "waiting") return res.status(400).json({ error: "Match không còn waiting" });

    const team1Id = 2 * matchId - 1;
    const team2Id = 2 * matchId;
    const targetTeamId = team === "team1" ? team1Id : team2Id;

    const [[count]] = await pool.query(
        `SELECT COUNT(*) AS c FROM players WHERE team_id = ?`,
        [targetTeamId]
    );
    if (count.c >= 5) {
        res.status(400).json({ error: "Team đã đủ 5 người" });
    }

    const userId = req.user.steamid64;

    await pool.query(
        `DELETE FROM players WHERE user_id = ? AND team_id IN (?, ?)`,
        [userId, team1Id, team2Id]
    );

    await pool.query(
        `INSERT INTO players (user_id, team_id, is_ready) VALUES (?, ?, 0)`,
        [userId, targetTeamId]
    );

    res.json({ message: "Đã tham gia đội", team_id: targetTeamId });
});

/*
POST /api/matches/:id/ready
Body: { ready: true|false }
chi player trong match moi duoc dung
*/
router.post("/:id/ready", ensureAuthenticated, async (req, res) => {
    const matchId = Number(req.params.id);
    const { ready } = req.body || {};
    const isReady = ready ? 1 : 0;
    const team1Id = 2 * matchId - 1;
    const team2Id = 2 * matchId;
    const userId = req.user.steamid64;

    const [[inMatch]] = await pool.query(
        `SELECT * FROM players WHERE user_id = ? AND team_id IN (?, ?)`,
        [userId, team1Id, team2Id]
    );
    if (!inMatch) res.status(400).json({ error: "Bạn chưa tham gia match này" });

    await pool.query(
        `UPDATE players SET is_ready = ? WHERE user_id = ? AND team_id IN (?, ?)`,
        [isReady, userId, team1Id, team2Id]
    );

    res.json({ message: "Cập nhật trạng thái thành công", is_ready: !isReady });
});

/*
POST /api/matches/:id/start
Chi admin duoc start match
Tat ca players trong match deu phai ready
*/
router.post("/:id/start", ensureAuthenticated, async (req, res) => {
    try {
        if (!req.user?.is_admin) return res.status(403).json({ error: "Chỉ admin được bắt đầu trận đấu" });

        const matchId = Number(req.params.id);
        const team1Id = 2 * matchId - 1;
        const team2Id = 2 * matchId;
        const [[match]] = await pool.query(`SELECT * FROM matches WHERE id = ?`, [matchId]);

        if (!match) return res.status(404).json({ error: "Match không tồn tại" });
        if (match.match_status !== "waiting") return res.status(400).json({ error: "Match không ở trạng thái waiting" });

        const [[cap1]] = await pool.query(`SELECT captain_id FROM teams WHERE id = ?`, [team1Id]);
        const [[cap2]] = await pool.query(`SELECT captain_id FROM teams WHERE id = ?`, [team2Id]);

        if (!cap1?.captain_id) return res.status(400).json({ error: "Team 1 chưa có captain" });
        if (!cap2?.captain_id) return res.status(400).json({ error: "Team 2 chưa có captain" });

        const [[status]] = await pool.query(
            `SELECT
                COUNT(*) AS total_players,
                SUM(is_ready) AS total_ready
            FROM players WHERE team_id IN (?, ?),`
            [team1Id, team2Id]
        );
        
        if (status.total_players !== status.total_ready) return res.status(400).json({ error: "Có người chơi chưa sẵn sàng" });

        await pool.query(`UPDATE matches SET match_status = 'in_progress' WHERE id = ?`, [matchId]);

        res.json({ message: "Match bắt đầu", match_id: matchId });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Không thể  bắt đầu match", detail: err.message });
    }
});

module.exports = router;

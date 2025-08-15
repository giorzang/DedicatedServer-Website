const express = require("express");
const { ensureAuthenticated } = require("../middleware/auth");
const matchesRoutes = require("./matchesRoutes");

const router = express.Router();

router.get("/me", ensureAuthenticated, (req, res) => {
    res.json(req.user);
});

router.use("/matches", matchesRoutes);

module.exports = router;
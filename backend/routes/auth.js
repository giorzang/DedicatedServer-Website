const express = require("express");
const router = express.Router();
const passport = require("../configs/passport");

router.get("/steam", passport.authenticate("steam"));

router.get(
    "/steam/return",
    passport.authenticate("steam", { failureRedirect: "/" }),
    (req, res) => {
        res.redirect(`http://${process.env.DOMAIN}:5173/profile`);
    }
);

router.get("/logout", (req, res) => {
    req.logout(() => {
        res.json({ message: "Đã đăng xuất" });
    });
});

module.exports = router;

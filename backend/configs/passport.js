const passport = require("passport");
const SteamStrategy = require("passport-steam").Strategy;
const pool = require("./db");
require("dotenv").config();

passport.use(new SteamStrategy(
    {
        returnURL: `http://${process.env.DOMAIN}:${process.env.PORT}/auth/steam/return`,
        realm: `http://${process.env.DOMAIN}:${process.env.PORT}/`,
        apiKey: process.env.STEAM_API_KEY
    },
    async(identifier, profile, done) => {
        const steamid64 = profile.id;
        const profile_name = profile.displayName;
        const avatar = profile.photos[2].value;

        try {
            const [rows] = await pool.query(
                "SELECT * FROM users WHERE steamid64 = ?",
                [steamid64]
            );
            if (rows.length === 0) {
                await pool.query(
                    "INSERT INTO users (steamid64, profile_name, avatar) VALUES (?, ?, ?)",
                    [steamid64, profile_name, avatar]
                );
                console.log(`Welcome user ${steamid64}`);
            } else {
                console.log(`User ${steamid64} already exists`);
            }
            return done(null, {steamid64, profile_name, avatar});
        } catch (err) {
            return done(err);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user.steamid64);
});

passport.deserializeUser(async (steamid64, done) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM users WHERE steamid64 = ?",
            [steamid64]
        );
        done(null, rows[0]);
    } catch (err) {
        done(err);
    }
});

module.exports = passport;
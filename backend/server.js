const express = require("express");
const session = require("express-session");
const cors = require("cors");
require("dotenv").config();

const passport = require("./configs/passport");
const authRoutes = require("./routes/auth");
const apiRoutes = require("./routes/api");

const app = express();

app.use(cors({
  origin: `http://${process.env.DOMAIN}:5173`,
  credentials: true
}));

app.use(session({
  secret: "supersecret", // đổi secret khi deploy
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // secure:true nếu dùng HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());

app.use("/auth", authRoutes);
app.use("/api", apiRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Backend chạy tại http://${process.env.DOMAIN}:${process.env.PORT}`);
});

const express = require("express");
const pool = require("../configs/db");
const { ensureAuthenticated } = require("../middleware/auth");

const router = express.Router();

/*
GET /api/matches
Trang matches hiện thị danh sách match và một vài thông tin trong từng match
*/
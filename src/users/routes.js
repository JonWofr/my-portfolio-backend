const express = require("express");
const router = express.Router();

const users = require("./controller");

router.post("/", users.insertOne);
router.post("/login", users.login);
router.get("/auth", users.checkToken, users.auth);

module.exports = router;

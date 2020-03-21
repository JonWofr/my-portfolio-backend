const express = require("express");
const router = express.Router();

const images = require("./controller");

router.post("/", images.uploadImage);

module.exports = router;

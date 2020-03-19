const express = require('express');
const router = express.Router();


const slides = require('./controller');
const users = require('../users/controller')

router.get("/", slides.getAll);
router.post("/", users.checkToken, slides.insertOne);
router.delete("/:_id", users.checkToken, slides.deleteOne);
router.put("/:_id", users.checkToken, slides.updateOne);

module.exports = router
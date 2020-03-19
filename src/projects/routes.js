const express = require('express');
const router = express.Router();
const projects = require('./controller');
const users = require('../users/controller');


router.get("/", projects.getAll);
router.post("/", users.checkToken, projects.insertOne);
router.delete("/:_id", users.checkToken, projects.deleteOne);
router.put("/:_id", users.checkToken, projects.updateOne);

module.exports = router
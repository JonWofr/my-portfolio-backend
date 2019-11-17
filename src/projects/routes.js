const express = require('express');
const router = express.Router();
const controller = require('./controller');

router.get("/", controller.getAll);
router.post("/", controller.insertOne);
router.delete("/:_id", controller.deleteOne);
router.put("/:_id", controller.updateOne);

module.exports = router;
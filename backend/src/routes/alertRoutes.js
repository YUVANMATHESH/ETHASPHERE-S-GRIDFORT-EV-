const express = require("express");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const controller = require("../controllers/alertController");

const router = express.Router();
router.use(auth);
router.get("/", controller.listAlerts);
router.post("/", admin, controller.createAlert);
router.put("/:id/resolve", admin, controller.resolveAlert);
module.exports = router;

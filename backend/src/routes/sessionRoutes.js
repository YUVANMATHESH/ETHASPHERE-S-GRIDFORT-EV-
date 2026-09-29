const express = require("express");
const auth = require("../middleware/authMiddleware");
const controller = require("../controllers/sessionController");

const router = express.Router();
router.use(auth);
router.get("/", controller.listSessions);
router.get("/:id", controller.getSession);
router.get("/:id/data", controller.getSessionData);
router.post("/start", controller.startSession);
router.post("/:id/data", controller.addData);
router.post("/:id/simulate", controller.simulateData);
router.post("/:id/complete", controller.completeSession);
module.exports = router;

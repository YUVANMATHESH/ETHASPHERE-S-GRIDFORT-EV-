const express = require("express");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const controller = require("../controllers/stationController");

const router = express.Router();
router.get("/", auth, controller.listStations);
router.get("/:id", auth, controller.getStation);
router.post("/", auth, admin, controller.createStation);
router.put("/:id", auth, admin, controller.updateStation);
router.delete("/:id", auth, admin, controller.deleteStation);
module.exports = router;

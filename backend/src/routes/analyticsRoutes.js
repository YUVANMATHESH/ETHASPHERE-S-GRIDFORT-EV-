const express = require("express");
const auth = require("../middleware/authMiddleware");
const controller = require("../controllers/analyticsController");

const router = express.Router();
router.use(auth);
router.get("/dashboard", controller.dashboard);
router.get("/energy", controller.energy);
router.get("/revenue", controller.revenue);
router.get("/stations", controller.stations);
module.exports = router;

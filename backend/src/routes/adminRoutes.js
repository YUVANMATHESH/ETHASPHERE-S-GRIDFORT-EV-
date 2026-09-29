const express = require("express");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const controller = require("../controllers/adminController");

const router = express.Router();
router.use(auth, admin);
router.get("/dashboard", controller.dashboard);
router.get("/users", controller.users);
router.get("/stations", controller.stations);
router.get("/sessions", controller.sessions);
module.exports = router;

const express = require("express");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const controller = require("../controllers/chargerController");

const router = express.Router();
router.get("/", auth, controller.listChargers);
router.get("/:id", auth, controller.getCharger);
router.post("/", auth, admin, controller.createCharger);
router.put("/:id", auth, admin, controller.updateCharger);
router.delete("/:id", auth, admin, controller.deleteCharger);
module.exports = router;

const express = require("express");
const auth = require("../middleware/authMiddleware");
const controller = require("../controllers/vehicleController");

const router = express.Router();
router.use(auth);
router.get("/", controller.listVehicles);
router.post("/", controller.createVehicle);
router.put("/:id", controller.updateVehicle);
router.delete("/:id", controller.deleteVehicle);
module.exports = router;

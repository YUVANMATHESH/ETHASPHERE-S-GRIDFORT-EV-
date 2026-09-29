const express = require("express");
const auth = require("../middleware/authMiddleware");
const controller = require("../controllers/aiController");

const router = express.Router();
router.use(auth);
router.post("/predict", controller.predict);
router.get("/predictions", controller.predictions);
router.post("/analyze", controller.analyze);
module.exports = router;

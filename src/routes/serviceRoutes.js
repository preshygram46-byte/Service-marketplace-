const express = require("express");
const requireAuth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { getServices, createService, updateService } = require("../controllers/serviceController");

const router = express.Router();

router.use(requireAuth, requireRole("provider"));
router.get("/", getServices);
router.post("/", createService);
router.put("/:id", updateService);

module.exports = router;
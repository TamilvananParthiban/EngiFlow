"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const authenticate_1 = require("../middleware/authenticate");
require("express-async-errors");
const router = (0, express_1.Router)();
router.use(authenticate_1.authenticate);
router.get('/summary', dashboard_controller_1.summary);
router.get('/charts', dashboard_controller_1.charts);
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map
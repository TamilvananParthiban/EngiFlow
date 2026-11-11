"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summary = summary;
exports.charts = charts;
const dashboard_service_1 = require("../services/dashboard.service");
const response_1 = require("../utils/response");
async function summary(req, res) {
    const data = await (0, dashboard_service_1.getDashboardSummary)();
    (0, response_1.sendSuccess)(res, data, 'Dashboard summary');
}
async function charts(req, res) {
    const data = await (0, dashboard_service_1.getDashboardCharts)();
    (0, response_1.sendSuccess)(res, data, 'Dashboard charts');
}
//# sourceMappingURL=dashboard.controller.js.map
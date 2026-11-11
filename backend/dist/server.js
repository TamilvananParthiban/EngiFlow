"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const database_1 = require("./config/database");
const env_1 = require("./config/env");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function bootstrap() {
    // Ensure upload directories exist
    const uploadDirs = [
        env_1.env.UPLOAD_DIR,
        `${env_1.env.UPLOAD_DIR}/invoices`,
        `${env_1.env.UPLOAD_DIR}/assets`,
        `${env_1.env.UPLOAD_DIR}/amc`,
        `${env_1.env.UPLOAD_DIR}/maintenance`,
        `${env_1.env.UPLOAD_DIR}/purchases`,
        `${env_1.env.UPLOAD_DIR}/general`,
    ];
    uploadDirs.forEach((dir) => {
        const fullPath = path_1.default.join(process.cwd(), dir);
        if (!fs_1.default.existsSync(fullPath)) {
            fs_1.default.mkdirSync(fullPath, { recursive: true });
        }
    });
    // Connect to database
    await (0, database_1.connectDatabase)();
    const app = (0, app_1.createApp)();
    const server = app.listen(env_1.env.PORT, () => {
        console.log('\n');
        console.log('╔════════════════════════════════════════════════════╗');
        console.log('║     IT Operations Manager — Backend API Server    ║');
        console.log('╚════════════════════════════════════════════════════╝');
        console.log(`  Environment  : ${env_1.env.NODE_ENV}`);
        console.log(`  Server URL   : http://localhost:${env_1.env.PORT}`);
        console.log(`  API Base     : http://localhost:${env_1.env.PORT}/api/v1`);
        console.log(`  Health Check : http://localhost:${env_1.env.PORT}/health`);
        console.log('');
    });
    // Graceful shutdown
    process.on('SIGTERM', async () => {
        console.log('\n[SIGTERM] Shutting down gracefully...');
        server.close(async () => {
            await (0, database_1.disconnectDatabase)();
            console.log('[SIGTERM] Server closed.');
            process.exit(0);
        });
    });
    process.on('SIGINT', async () => {
        console.log('\n[SIGINT] Shutting down gracefully...');
        server.close(async () => {
            await (0, database_1.disconnectDatabase)();
            console.log('[SIGINT] Server closed.');
            process.exit(0);
        });
    });
}
bootstrap().catch((error) => {
    console.error('[FATAL] Failed to start server:', error);
    process.exit(1);
});
//# sourceMappingURL=server.js.map
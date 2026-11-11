"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pingICMP = pingICMP;
exports.pingTCP = pingTCP;
exports.pingDevice = pingDevice;
const child_process_1 = require("child_process");
const net_1 = __importDefault(require("net"));
function pingICMP(ipAddress, timeoutMs = 1500) {
    return new Promise((resolve) => {
        if (!ipAddress || !ipAddress.trim()) {
            return resolve({ alive: false, time: null });
        }
        const cleanIp = ipAddress.trim();
        const isWin = process.platform === 'win32';
        const cmd = isWin ? `ping -n 1 -w ${timeoutMs} ${cleanIp}` : `ping -c 1 -W 1 ${cleanIp}`;
        const start = Date.now();
        (0, child_process_1.exec)(cmd, (error, stdout) => {
            const duration = Date.now() - start;
            if (error || !stdout) {
                resolve({ alive: false, time: null });
            }
            else {
                const lower = stdout.toLowerCase();
                if (lower.includes('unreachable') || lower.includes('100% loss') || lower.includes('timed out')) {
                    resolve({ alive: false, time: null });
                    return;
                }
                const timeMatch = stdout.match(/time[=<](\d+)ms/i) || stdout.match(/time[=<](\d+\.?\d*)ms/i);
                const time = timeMatch ? Math.round(parseFloat(timeMatch[1])) : duration;
                resolve({ alive: true, time: time < 1 ? 1 : time });
            }
        });
    });
}
function pingTCP(ipAddress, ports = [80, 554, 8000, 8080, 37777], timeoutMs = 1500) {
    return new Promise((resolve) => {
        if (!ipAddress || !ipAddress.trim()) {
            return resolve({ alive: false, time: null });
        }
        const cleanIp = ipAddress.trim();
        let attempted = 0;
        let resolved = false;
        for (const port of ports) {
            const start = Date.now();
            const socket = new net_1.default.Socket();
            socket.setTimeout(timeoutMs);
            socket.on('connect', () => {
                if (!resolved) {
                    resolved = true;
                    const time = Date.now() - start;
                    socket.destroy();
                    resolve({ alive: true, time: time < 1 ? 1 : time });
                }
            });
            const handleFail = () => {
                socket.destroy();
                attempted++;
                if (attempted >= ports.length && !resolved) {
                    resolved = true;
                    resolve({ alive: false, time: null });
                }
            };
            socket.on('timeout', handleFail);
            socket.on('error', handleFail);
            try {
                socket.connect(port, cleanIp);
            }
            catch {
                handleFail();
            }
        }
    });
}
async function pingDevice(ipAddress) {
    const testedAt = new Date();
    if (!ipAddress || !ipAddress.trim()) {
        return { alive: false, latencyMs: null, status: 'OFFLINE', testedAt };
    }
    const cleanIp = ipAddress.trim();
    // Try ICMP first
    const icmp = await pingICMP(cleanIp);
    if (icmp.alive) {
        return { alive: true, latencyMs: icmp.time, status: 'ONLINE', testedAt };
    }
    // Fallback to TCP ports (80, 554 RTSP, 8000 Hikvision/Dahua, 37777)
    const tcp = await pingTCP(cleanIp, [80, 554, 8000, 8080, 37777]);
    if (tcp.alive) {
        return { alive: true, latencyMs: tcp.time, status: 'ONLINE', testedAt };
    }
    return { alive: false, latencyMs: null, status: 'OFFLINE', testedAt };
}
//# sourceMappingURL=pingUtils.js.map
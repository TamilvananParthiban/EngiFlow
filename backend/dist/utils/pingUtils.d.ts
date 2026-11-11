export interface PingResult {
    alive: boolean;
    latencyMs: number | null;
    status: 'ONLINE' | 'OFFLINE';
    testedAt: Date;
}
export declare function pingICMP(ipAddress: string, timeoutMs?: number): Promise<{
    alive: boolean;
    time: number | null;
}>;
export declare function pingTCP(ipAddress: string, ports?: number[], timeoutMs?: number): Promise<{
    alive: boolean;
    time: number | null;
}>;
export declare function pingDevice(ipAddress: string | null | undefined): Promise<PingResult>;
//# sourceMappingURL=pingUtils.d.ts.map
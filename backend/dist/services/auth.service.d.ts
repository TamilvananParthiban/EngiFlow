export interface LoginPayload {
    email: string;
    password: string;
}
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export declare function loginUser(payload: LoginPayload, ipAddress?: string, userAgent?: string): Promise<{
    user: Record<string, unknown>;
    tokens: TokenPair;
}>;
export declare function refreshTokens(refreshToken: string, ipAddress?: string, userAgent?: string): Promise<TokenPair>;
export declare function logoutUser(refreshToken: string): Promise<void>;
export declare function hashPassword(password: string): Promise<string>;
//# sourceMappingURL=auth.service.d.ts.map
export declare function getDashboardSummary(): Promise<{
    totalAssets: number;
    activeAssets: number;
    openTickets: number;
    pendingTasks: number;
    todayTasks: number;
    overdueTasks: number;
    networkUptime: number;
    internetDowntimeHours: number;
    amcExpiringSoon: number;
    warrantyExpiringSoon: number;
    pendingBills: number;
    monthlyExpense: number | import(".prisma/client/runtime/library").Decimal;
    todayActivities: number;
    completedActivitiesToday: number;
    dueTodayFollowups: number;
    overdueFollowups: number;
    backupFailures: number;
    activeRentals: number;
    cctvOffline: number;
}>;
export declare function getDashboardCharts(): Promise<{
    incidentTrend: {
        month: string;
        count: number;
    }[];
    expenseTrend: {
        month: string;
        amount: number;
    }[];
    assetDistribution: {
        type: import(".prisma/client").$Enums.AssetType;
        count: number;
    }[];
    ticketCategories: {
        category: import(".prisma/client").$Enums.TicketCategory;
        count: number;
    }[];
    pmStatus: {
        status: import(".prisma/client").$Enums.PMStatus;
        count: number;
    }[];
    downtimeTrend: {
        month: string;
        downtimeHours: number;
        uptime: number;
    }[];
    vendorExpense: {
        vendor: string;
        amount: number;
    }[];
}>;
//# sourceMappingURL=dashboard.service.d.ts.map
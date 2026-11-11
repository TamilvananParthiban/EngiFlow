import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Monitor, AlertCircle, Wifi, FileCheck, CreditCard, DollarSign,
  CheckSquare, Clock, TrendingUp, Video, HardDrive, Laptop, 
  ArrowUpRight, ArrowDownRight, Plus, RefreshCw,
} from 'lucide-react';
import api from '../../services/api';
import { formatINR, formatNumber, currentMonthName, daysUntil } from '../../utils/format';
import { useNavigate } from 'react-router-dom';

interface DashboardSummary {
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
  monthlyExpense: number;
  todayActivities: number;
  backupFailures: number;
  activeRentals: number;
  cctvOffline: number;
}

interface KPICardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
  trend?: { value: number; label: string };
  alert?: boolean;
  onClick?: () => void;
  sublabel?: string;
}

function KPICard({ label, value, icon: Icon, accent, trend, alert, onClick, sublabel }: KPICardProps) {
  return (
    <div
      className="kpi-card min-w-0"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ width: 42, height: 42, background: accent }}
        >
          <Icon size={20} style={{ color: alert ? '#ef4444' : '#3742FA' }} />
        </div>
        {trend && (
          <div
            className="flex items-center gap-1 text-xs font-semibold flex-shrink-0"
            style={{ color: trend.value >= 0 ? '#10b981' : '#ef4444' }}
          >
            {trend.value >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(trend.value)}%
          </div>
        )}
        {alert && (
          <div className="badge badge-red flex-shrink-0">{value as number > 0 ? 'Alert' : 'OK'}</div>
        )}
      </div>
      <div className="min-w-0">
        <div className="kpi-value truncate" title={String(value)}>{value}</div>
        <div className="kpi-label truncate" title={label}>{label}</div>
        {sublabel && (
          <div className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }} title={sublabel}>{sublabel}</div>
        )}
      </div>
    </div>
  );
}

const ASSET_COLORS = ['#3742FA', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: 8,
    fontSize: 12,
    color: 'var(--text-primary)',
  },
};

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: summary, isLoading: summaryLoading, refetch } = useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary');
      return res.data.data;
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: charts } = useQuery({
    queryKey: ['dashboard', 'charts'],
    queryFn: async () => {
      const res = await api.get('/dashboard/charts');
      return res.data.data;
    },
    refetchInterval: 10 * 60 * 1000,
  });

  if (summaryLoading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <div className="skeleton h-7 w-48 mb-2" />
            <div className="skeleton h-4 w-64" />
          </div>
        </div>
        <div className="kpi-grid mb-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const kpiCards: KPICardProps[] = [
    {
      label: 'Total Assets',
      value: formatNumber(summary?.totalAssets),
      icon: Monitor,
      accent: 'var(--kpi-blue)',
      sublabel: `${summary?.activeAssets} active`,
      onClick: () => navigate('/assets'),
    },
    {
      label: 'Open Tickets',
      value: formatNumber(summary?.openTickets),
      icon: AlertCircle,
      accent: summary?.openTickets && summary.openTickets > 5 ? 'var(--kpi-red)' : 'var(--kpi-blue)',
      alert: (summary?.openTickets ?? 0) > 5,
      onClick: () => navigate('/tickets'),
    },
    {
      label: 'Pending Tasks',
      value: formatNumber(summary?.pendingTasks),
      icon: CheckSquare,
      accent: 'var(--kpi-purple)',
      sublabel: `${summary?.overdueTasks} overdue`,
      onClick: () => navigate('/tasks'),
    },
    {
      label: "Today's Tasks",
      value: formatNumber(summary?.todayTasks),
      icon: Clock,
      accent: 'var(--kpi-teal)',
      sublabel: `${summary?.todayActivities} activities`,
      onClick: () => navigate('/my-day'),
    },
    {
      label: 'Network Uptime',
      value: `${summary?.networkUptime ?? 100}%`,
      icon: Wifi,
      accent: (summary?.networkUptime ?? 100) >= 99 ? 'var(--kpi-green)' : 'var(--kpi-amber)',
      sublabel: currentMonthName(),
    },
    {
      label: 'Downtime Hours',
      value: `${summary?.internetDowntimeHours ?? 0}h`,
      icon: TrendingUp,
      accent: (summary?.internetDowntimeHours ?? 0) > 2 ? 'var(--kpi-red)' : 'var(--kpi-green)',
      sublabel: 'This month',
    },
    {
      label: 'AMC Expiring',
      value: formatNumber(summary?.amcExpiringSoon),
      icon: FileCheck,
      accent: (summary?.amcExpiringSoon ?? 0) > 0 ? 'var(--kpi-amber)' : 'var(--kpi-green)',
      alert: (summary?.amcExpiringSoon ?? 0) > 0,
      onClick: () => navigate('/amc'),
    },
    {
      label: 'Warranty Expiry',
      value: formatNumber(summary?.warrantyExpiringSoon),
      icon: FileCheck,
      accent: (summary?.warrantyExpiringSoon ?? 0) > 0 ? 'var(--kpi-amber)' : 'var(--kpi-green)',
      onClick: () => navigate('/warranty'),
    },
    {
      label: 'Pending Bills',
      value: formatNumber(summary?.pendingBills),
      icon: CreditCard,
      accent: (summary?.pendingBills ?? 0) > 0 ? 'var(--kpi-red)' : 'var(--kpi-green)',
      alert: (summary?.pendingBills ?? 0) > 0,
      onClick: () => navigate('/invoices'),
    },
    {
      label: 'Monthly Expense',
      value: formatINR(summary?.monthlyExpense),
      icon: DollarSign,
      accent: 'var(--kpi-orange)',
      sublabel: currentMonthName(),
    },
    {
      label: 'Active Rentals',
      value: formatNumber(summary?.activeRentals),
      icon: Laptop,
      accent: 'var(--kpi-blue)',
      onClick: () => navigate('/rentals'),
    },
    {
      label: 'CCTV Offline',
      value: formatNumber(summary?.cctvOffline),
      icon: Video,
      accent: (summary?.cctvOffline ?? 0) > 0 ? 'var(--kpi-red)' : 'var(--kpi-green)',
      alert: (summary?.cctvOffline ?? 0) > 0,
      onClick: () => navigate('/cctv'),
    },
  ];

  const quickActions = [
    { label: 'Add Activity', icon: Plus, to: '/activities', color: '#3742FA' },
    { label: 'Create Ticket', icon: AlertCircle, to: '/tickets', color: '#ef4444' },
    { label: 'Add Task', icon: CheckSquare, to: '/tasks', color: '#10b981' },
    { label: 'Add Asset', icon: Monitor, to: '/assets', color: '#8b5cf6' },
    { label: 'Add Invoice', icon: CreditCard, to: '/invoices', color: '#f59e0b' },
    { label: 'Add Follow-up', icon: Clock, to: '/followups', color: '#06b6d4' },
    { label: 'Record Downtime', icon: Wifi, to: '/network', color: '#f97316' },
    { label: 'Backup Monitor', icon: HardDrive, to: '/backups', color: '#64748b' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">IT Operations Dashboard</h1>
          <p className="page-subtitle">
            Executive overview — {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => refetch()}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid mb-6">
        {kpiCards.map((card) => (
          <KPICard key={card.label} {...card} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card p-5 mb-6 min-w-0">
        <h2 className="chart-title mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 min-w-0">
          {quickActions.map((action) => (
            <button
              key={action.label}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all hover:opacity-90 hover:-translate-y-0.5 min-w-0 truncate"
              style={{
                background: `${action.color}15`,
                color: action.color,
                border: `1px solid ${action.color}30`,
              }}
              onClick={() => navigate(action.to)}
            >
              <action.icon size={15} className="flex-shrink-0" />
              <span className="truncate">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="chart-grid mb-6">
        {/* Incident Trend */}
        <div className="chart-container">
          <h2 className="chart-title">IT Incidents — 6 Month Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={charts?.incidentTrend || []}>
              <defs>
                <linearGradient id="incidentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3742FA" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3742FA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip {...CHART_TOOLTIP_STYLE} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#3742FA"
                strokeWidth={2}
                fill="url(#incidentGrad)"
                name="Incidents"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Asset Distribution */}
        <div className="chart-container">
          <h2 className="chart-title">Asset Distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={charts?.assetDistribution || []}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={40}
                paddingAngle={3}
              >
                {(charts?.assetDistribution || []).map((_: unknown, index: number) => (
                  <Cell key={index} fill={ASSET_COLORS[index % ASSET_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v, n) => [v, n]} />
              <Legend
                formatter={(value) => <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{value?.replace('_', ' ')}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="chart-grid mb-6">
        {/* Monthly Expense */}
        <div className="chart-container">
          <h2 className="chart-title">Monthly IT Expense (₹)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts?.expenseTrend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip {...CHART_TOOLTIP_STYLE} formatter={((v: any) => [formatINR(Number(v)), 'Expense']) as any} />
              <Bar dataKey="amount" fill="#3742FA" radius={[4, 4, 0, 0]} name="Expense" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Network Uptime */}
        <div className="chart-container">
          <h2 className="chart-title">Network Uptime % — 6 Months</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={charts?.downtimeTrend || []}>
              <defs>
                <linearGradient id="uptimeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis domain={[90, 100]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v) => `${v}%`} />
              <Tooltip {...CHART_TOOLTIP_STYLE} formatter={((v: any) => [`${v}%`, 'Uptime']) as any} />
              <Area
                type="monotone"
                dataKey="uptime"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#uptimeGrad)"
                name="Uptime %"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="bottom-grid">
        {/* Ticket Categories */}
        <div className="chart-container">
          <h2 className="chart-title">Tickets by Category</h2>
          <div className="flex flex-col gap-2 mt-2">
            {(charts?.ticketCategories || []).slice(0, 7).map((tc: { category: string; count: number }) => (
              <div key={tc.category} className="stat-row">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {tc.category.replace(/_/g, ' ')}
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className="rounded-full"
                    style={{
                      height: 6,
                      width: Math.min(80, (tc.count / Math.max(...(charts?.ticketCategories || []).map((x: { count: number }) => x.count))) * 80),
                      background: '#3742FA',
                    }}
                  />
                  <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{tc.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PM Status */}
        <div className="chart-container">
          <h2 className="chart-title">PM Status — This Month</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={charts?.pmStatus || []}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={70}
                paddingAngle={3}
              >
                {(charts?.pmStatus || []).map((ps: { status: string; count: number }, index: number) => (
                  <Cell
                    key={index}
                    fill={
                      ps.status === 'COMPLETED' ? '#10b981'
                        : ps.status === 'SCHEDULED' ? '#3742FA'
                        : ps.status === 'OVERDUE' ? '#ef4444'
                        : '#f59e0b'
                    }
                  />
                ))}
              </Pie>
              <Tooltip {...CHART_TOOLTIP_STYLE} />
              <Legend formatter={(v) => <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Vendor Expense */}
        <div className="chart-container">
          <h2 className="chart-title">Top Vendor Expenses</h2>
          <div className="flex flex-col gap-2 mt-2">
            {(charts?.vendorExpense || []).map((ve: { vendor: string; amount: number }, i: number) => (
              <div key={i} className="stat-row">
                <span className="text-xs truncate" style={{ color: 'var(--text-secondary)', maxWidth: 120 }}>
                  {ve.vendor}
                </span>
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {formatINR(ve.amount)}
                </span>
              </div>
            ))}
            {!charts?.vendorExpense?.length && (
              <div className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No expense data this month</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

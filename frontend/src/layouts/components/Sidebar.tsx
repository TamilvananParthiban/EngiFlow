import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, ClipboardList, CheckSquare,
  Ticket, Monitor, Laptop, Building2, FileText, CreditCard,
  Wifi, Video, FileCheck, Wrench, Key, Shield,
  Package, Bell, DollarSign, BarChart3, KanbanSquare, Calendar,
  BellRing, Users, FileSearch, Settings, ChevronLeft, ChevronRight,
  Network, HardDrive, X, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { getInitials } from '../../utils/format';

interface NavItem {
  label: string;
  icon: React.ElementType;
  to?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/my-day', label: 'My Day', icon: CalendarDays },
  { to: '/activities', label: 'Activities', icon: ClipboardList },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/tickets', label: 'Tickets', icon: Ticket },
];

const ASSET_ITEMS: NavItem[] = [
  { to: '/assets', label: 'Assets', icon: Monitor },
  { to: '/rentals', label: 'Laptop Rentals', icon: Laptop },
];

const VENDOR_ITEMS: NavItem[] = [
  { to: '/vendors', label: 'Vendors', icon: Building2 },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/payments', label: 'Payments', icon: CreditCard },
];

const INFRA_ITEMS: NavItem[] = [
  { to: '/isp', label: 'Internet / ISP', icon: Wifi },
  { to: '/network', label: 'Network & Uptime', icon: Network },
  { to: '/cctv', label: 'CCTV', icon: Video },
  { to: '/backups', label: 'Backup Monitor', icon: HardDrive },
];

const CONTRACT_ITEMS: NavItem[] = [
  { to: '/amc', label: 'AMC Contracts', icon: FileCheck },
  { to: '/maintenance', label: 'Preventive PM', icon: Wrench },
  { to: '/licenses', label: 'Software Licenses', icon: Key },
  { to: '/warranty', label: 'Warranty', icon: Shield },
];

const OPS_ITEMS: NavItem[] = [
  { to: '/purchases', label: 'Procurement', icon: Package },
  { to: '/followups', label: 'Follow-ups', icon: Bell },
  { to: '/expenses', label: 'Expenses', icon: DollarSign },
];

const REPORT_ITEMS: NavItem[] = [
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/kpi', label: 'KPI Dashboard', icon: KanbanSquare },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
];

const SYSTEM_ITEMS: NavItem[] = [
  { to: '/notifications', label: 'Notifications', icon: BellRing },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/audit', label: 'Audit Log', icon: FileSearch },
  { to: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarSectionProps {
  title: string;
  items: NavItem[];
  collapsed: boolean;
  onItemClick: () => void;
}

function SidebarSection({ title, items, collapsed, onItemClick }: SidebarSectionProps) {
  return (
    <div className="mb-2">
      {!collapsed && <div className="sidebar-section">{title}</div>}
      {collapsed && <div className="my-2 mx-3 h-px bg-slate-700/40" />}
      {items.map((item) => (
        <SidebarItem key={item.to} item={item} collapsed={collapsed} onClick={onItemClick} />
      ))}
    </div>
  );
}

function SidebarItem({ item, collapsed, onClick }: { item: NavItem; collapsed: boolean; onClick: () => void }) {
  return (
    <NavLink
      to={item.to!}
      end={item.to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        `sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`
      }
      title={collapsed ? item.label : undefined}
    >
      <item.icon size={18} style={{ flexShrink: 0 }} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, setMobileSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavItemClick = () => {
    if (mobileSidebarOpen) {
      setMobileSidebar(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setMobileSidebar(false)}
        />
      )}

      <aside
        className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileSidebarOpen ? 'mobile-open' : ''}`}
      >
        {/* Header with Logo & Toggle Button */}
        <div
          className="flex items-center justify-between px-3.5 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className="flex items-center justify-center rounded-xl flex-shrink-0 shadow-md"
              style={{
                width: 36, height: 36,
                background: 'linear-gradient(135deg, #3742FA, #5b63fb)',
                boxShadow: '0 4px 14px rgba(55,66,250,0.4)',
              }}
            >
              <LayoutDashboard size={20} color="white" />
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <div className="text-white font-bold text-sm leading-tight truncate">IT Operations</div>
                <div className="text-[11px] leading-tight font-medium" style={{ color: '#64748b' }}>Manager v1.0</div>
              </div>
            )}
          </div>

          {/* Desktop Toggle Button */}
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setMobileSidebar(false)}
            className="lg:hidden flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Navigation Menu */}
        <nav className="flex-1 py-3 px-1 overflow-y-auto overflow-x-hidden sidebar-scroll">
          {!sidebarCollapsed && <div className="sidebar-section">Main</div>}
          {NAV_ITEMS.map((item) => (
            <SidebarItem key={item.to} item={item} collapsed={sidebarCollapsed} onClick={handleNavItemClick} />
          ))}

          <SidebarSection title="Assets" items={ASSET_ITEMS} collapsed={sidebarCollapsed} onItemClick={handleNavItemClick} />
          <SidebarSection title="Vendors" items={VENDOR_ITEMS} collapsed={sidebarCollapsed} onItemClick={handleNavItemClick} />
          <SidebarSection title="Infrastructure" items={INFRA_ITEMS} collapsed={sidebarCollapsed} onItemClick={handleNavItemClick} />
          <SidebarSection title="Contracts" items={CONTRACT_ITEMS} collapsed={sidebarCollapsed} onItemClick={handleNavItemClick} />
          <SidebarSection title="Operations" items={OPS_ITEMS} collapsed={sidebarCollapsed} onItemClick={handleNavItemClick} />
          <SidebarSection title="Reports" items={REPORT_ITEMS} collapsed={sidebarCollapsed} onItemClick={handleNavItemClick} />
          <SidebarSection title="System" items={SYSTEM_ITEMS} collapsed={sidebarCollapsed} onItemClick={handleNavItemClick} />
        </nav>

        {/* Fixed User Profile Footer */}
        <div
          className="p-3 border-t flex-shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(15, 23, 42, 0.95)' }}
        >
          <div
            className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-slate-800/90 transition-colors ${sidebarCollapsed ? 'justify-center p-1.5' : ''}`}
            onClick={handleLogout}
            title="Click to logout"
          >
            <div
              className="flex items-center justify-center rounded-full text-white font-bold text-xs flex-shrink-0 shadow-sm"
              style={{
                width: 34, height: 34,
                background: 'linear-gradient(135deg, #3742FA, #8b5cf6)',
              }}
            >
              {user ? getInitials(user.name) : 'U'}
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden flex-1">
                <div className="text-sm font-semibold text-slate-200 truncate">{user?.name}</div>
                <div className="text-[11px] truncate font-medium" style={{ color: '#64748b' }}>{user?.role?.replace(/_/g, ' ')}</div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

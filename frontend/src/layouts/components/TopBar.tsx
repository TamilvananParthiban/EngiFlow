import React, { useState, useEffect, useRef } from 'react';
import {
  Menu, Search, Bell, Sun, Moon, ChevronDown, LogOut, User,
  Command, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { getInitials, timeAgo } from '../../utils/format';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useQuery } from '@tanstack/react-query';

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const res = await api.get('/notifications?limit=10');
      return res.data.data;
    },
    refetchInterval: 60000,
  });

  const unread = data?.unread ?? 0;
  const notifications = data?.notifications ?? [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        className="btn-icon relative"
        onClick={() => setOpen(!open)}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center text-white text-[9px] font-bold rounded-full"
            style={{ width: 16, height: 16, background: '#ef4444', fontSize: 9 }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 rounded-xl shadow-xl overflow-hidden z-50"
          style={{
            width: 360,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            top: '100%',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Notifications
            </span>
            {unread > 0 && (
              <span className="badge badge-blue">{unread} new</span>
            )}
          </div>
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                All caught up! 🎉
              </div>
            ) : (
              notifications.slice(0, 8).map((n: {
                id: string; isRead: boolean; priority: string; title: string;
                message: string; createdAt: string;
              }) => (
                <div
                  key={n.id}
                  className="px-4 py-3 hover:opacity-80 cursor-pointer transition-opacity border-b"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    background: !n.isRead ? 'var(--color-primary-subtle)' : undefined,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{
                        background: n.priority === 'CRITICAL' ? '#ef4444'
                          : n.priority === 'HIGH' ? '#f59e0b'
                          : '#3742FA',
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {n.title}
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                        {n.message}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="px-4 py-3 border-t text-center" style={{ borderColor: 'var(--border-color)' }}>
            <a href="/notifications" className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
              View all notifications
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TopBar() {
  const { sidebarCollapsed, toggleSidebar, darkMode, toggleDarkMode, setMobileSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Record<string, unknown[]> | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Ctrl+K to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery('');
        setSearchResults(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Outside click to close menus
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchQuery('');
        setSearchResults(null);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults(null); return; }
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res.data.data);
    } catch {
      setSearchResults(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <div className="topbar">
        {/* Left side: Toggle sidebar (Desktop: collapse, Mobile: open drawer) */}
        <div className="flex items-center gap-2">
          <button
            className="btn-icon hidden lg:flex"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <button
            className="btn-icon lg:hidden flex"
            onClick={() => setMobileSidebar(true)}
            title="Open navigation menu"
          >
            <Menu size={18} />
          </button>
        </div>

        {/* Global Search */}
        <div className="flex-1 flex justify-center" ref={searchRef}>
          <div className="search-bar" style={{ maxWidth: 480, width: '100%' }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search assets, vendors, tickets... (Ctrl+K)"
              value={searchQuery}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ paddingRight: 40 }}
            />
            <div
              className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--border-color)',
                color: 'var(--text-muted)',
              }}
            >
              <Command size={10} />K
            </div>

            {/* Search Results Dropdown */}
            {searchOpen && searchQuery.length >= 2 && searchResults && (
              <div
                className="absolute top-full mt-2 left-0 right-0 rounded-xl shadow-xl overflow-hidden z-50"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  maxHeight: 400,
                  overflowY: 'auto',
                }}
              >
                {Object.entries(searchResults).map(([module, items]) =>
                  (items as unknown[]).length > 0 ? (
                    <div key={module}>
                      <div
                        className="px-3 py-2 text-xs font-bold uppercase tracking-wider"
                        style={{ color: 'var(--text-muted)', background: 'var(--bg-body)' }}
                      >
                        {module}
                      </div>
                      {(items as Record<string, string>[]).map((item) => (
                        <div
                          key={item.id}
                          className="px-4 py-2.5 hover:opacity-80 cursor-pointer border-b"
                          style={{ borderColor: 'var(--border-subtle)' }}
                          onClick={() => {
                            navigate(`/${module}/${item.id}`);
                            setSearchOpen(false);
                            setSearchQuery('');
                            setSearchResults(null);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono-code">{item.assetCode || item.vendorCode || item.ticketNumber || item.taskCode || item.invoiceCode || item.amcCode}</span>
                            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                              {item.brand && item.model ? `${item.brand} ${item.model}` : item.name || item.subject || item.title || item.softwareName || item.serviceType}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null,
                )}
                {Object.values(searchResults).every((items) => (items as unknown[]).length === 0) && (
                  <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No results found for "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Dark mode toggle */}
          <button className="btn-icon" onClick={toggleDarkMode} title="Toggle dark mode">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* User menu */}
          <div className="relative" ref={userRef}>
            <button
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors hover:opacity-80"
              style={{ background: 'var(--bg-body)', border: '1px solid var(--border-color)' }}
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <div
                className="flex items-center justify-center rounded-full text-white text-xs font-bold"
                style={{
                  width: 28, height: 28,
                  background: 'linear-gradient(135deg, #3742FA, #8b5cf6)',
                  flexShrink: 0,
                }}
              >
                {user ? getInitials(user.name) : 'U'}
              </div>
              <span className="text-sm font-medium hidden sm:block" style={{ color: 'var(--text-primary)', maxWidth: 120 }}>
                {user?.name?.split(' ')[0]}
              </span>
              <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
            </button>

            {userMenuOpen && (
              <div
                className="absolute right-0 mt-2 rounded-xl shadow-xl overflow-hidden z-50"
                style={{
                  width: 220,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
                  <p className="text-xs mt-1">
                    <span className="badge badge-blue">{user?.role?.replace(/_/g, ' ')}</span>
                  </p>
                </div>
                <div className="p-1">
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors hover:opacity-80"
                    style={{ color: 'var(--text-secondary)' }}
                    onClick={() => navigate('/profile')}
                  >
                    <User size={15} /> My Profile
                  </button>
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors"
                    style={{ color: '#ef4444' }}
                    onClick={handleLogout}
                  >
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
